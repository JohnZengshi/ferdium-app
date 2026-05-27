import { randomBytes } from 'node:crypto';
import {
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from 'node:http';
import { type BrowserWindow, ipcMain } from 'electron';

const debug = require('../../preload-safe-debug')(
  'Ferdium:WhatsAppWebhookServer',
);

let server: ReturnType<typeof createServer> | null = null;
let activePort = 0;
let activeSecret = '';

const PORT_RANGE_START = 45_678;
const PORT_RANGE_END = 45_778;

const portInUse = (checkPort: number): Promise<boolean> =>
  new Promise(resolve => {
    const s = createServer();
    s.listen(checkPort, '127.0.0.1');
    s.on('error', () => {
      resolve(true);
    });
    s.on('listening', () => {
      s.close();
      resolve(false);
    });
  });

const startServer = (
  mainWindow: BrowserWindow,
): Promise<{ port: number; secret: string }> => {
  if (server) {
    return Promise.resolve({ port: activePort, secret: activeSecret });
  }

  // Find an available port in range
  const findPort = async (): Promise<number> => {
    for (let p = PORT_RANGE_START; p <= PORT_RANGE_END; p += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await portInUse(p))) return p;
    }
    throw new Error(
      `No available port in range ${PORT_RANGE_START}-${PORT_RANGE_END}`,
    );
  };

  return findPort().then(foundPort => {
    activeSecret = randomBytes(32).toString('hex');

    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST') {
        res.writeHead(405);
        res.end('Method Not Allowed');
        return;
      }

      let body = '';
      req.on('data', (chunk: string) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          debug('Webhook received:', JSON.stringify(parsed).slice(0, 200));

          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('whatsapp-webhook-event', parsed);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        } catch (error) {
          debug('Failed to parse webhook body:', error);
          res.writeHead(400);
          res.end('Invalid JSON');
        }
      });
    });

    return new Promise<{ port: number; secret: string }>(resolve => {
      server!.listen(foundPort, '127.0.0.1', () => {
        activePort = foundPort;
        debug('WhatsApp webhook server listening on port', activePort);
        resolve({ port: activePort, secret: activeSecret });
      });
    });
  });
};

export default (params: { mainWindow: BrowserWindow }) => {
  ipcMain.handle('webhook-server:get-info', async () => {
    const info = await startServer(params.mainWindow);
    return info;
  });
};
