/**
 * IPC handler for making HTTP requests from the renderer process.
 * This allows the renderer to make HTTP requests using the main process's
 * network stack, which doesn't have the same CORS/SameSite restrictions
 * as the renderer's fetch API.
 *
 * NOTE: Uses curl as a workaround for Node.js v23.11.1 network stack issues
 * on macOS 15.7.4 where http/https modules fail with EHOSTUNREACH for
 * certain local network addresses.
 */

import { ipcMain } from 'electron';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface HttpRequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  data: string;
  headers: Record<string, string | string[]>;
}

export default () => {
  ipcMain.handle(
    'http-request',
    async (
      _event,
      options: HttpRequestOptions,
    ): Promise<HttpResponse> => {
      const {
        url,
        method = 'GET',
        headers = {},
        body,
        timeout = 15000,
      } = options;

      // Build curl command
      const curlArgs: string[] = [
        'curl',
        '-s', // Silent mode
        '-i', // Include headers in output
        '-X',
        method,
        `--connect-timeout ${Math.ceil(timeout / 1000)}`,
      ];

      // Add headers
      Object.entries(headers).forEach(([key, value]) => {
        curlArgs.push('-H', `"${key}: ${value}"`);
      });

      // Add body if present
      if (body) {
        curlArgs.push('-d', `'${body.replace(/'/g, "'\\''")}'`);
      }

      curlArgs.push(`"${url}"`);

      const curlCommand = curlArgs.join(' ');

      try {
        const { stdout, stderr } = await execAsync(curlCommand, {
          timeout,
          maxBuffer: 10 * 1024 * 1024, // 10MB
        });

        if (stderr) {
          console.error('[http-request] curl stderr:', stderr);
        }

        // Parse response
        const lines = stdout.split('\n');
        const statusLine = lines[0] || '';
        const statusMatch = statusLine.match(/HTTP\/[\d.]+ (\d+) (.+)/);
        const status = statusMatch ? Number.parseInt(statusMatch[1], 10) : 0;
        const statusText = statusMatch ? statusMatch[2].trim() : '';

        // Parse headers
        const responseHeaders: Record<string, string | string[]> = {};
        let bodyStartIndex = 0;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line === '\r' || line === '') {
            bodyStartIndex = i + 1;
            break;
          }
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim().toLowerCase();
            const value = line.slice(colonIndex + 1).trim();
            if (key === 'set-cookie') {
              // Collect multiple set-cookie headers
              if (responseHeaders[key]) {
                if (Array.isArray(responseHeaders[key])) {
                  (responseHeaders[key] as string[]).push(value);
                } else {
                  responseHeaders[key] = [
                    responseHeaders[key] as string,
                    value,
                  ];
                }
              } else {
                responseHeaders[key] = value;
              }
            } else {
              responseHeaders[key] = value;
            }
          }
        }

        const data = lines.slice(bodyStartIndex).join('\n');

        return {
          status,
          statusText,
          data,
          headers: responseHeaders,
        };
      } catch (error: any) {
        throw new Error(
          `HTTP request failed: ${error.message || String(error)}`,
        );
      }
    },
  );
};
