import { execFile } from 'node:child_process';
import net from 'node:net';
import { promisify } from 'node:util';
import { ipcMain } from 'electron';

const execFileAsync = promisify(execFile);

interface ProxyTestOptions {
  host: string;
  port: number;
  protocol?: 'http' | 'socks5';
  timeout?: number;
}

interface ProxyTestResult {
  reachable: boolean;
  latency: number;
  protocol: 'http' | 'socks5';
  error?: string;
}

const TARGET_HOST = 'web.whatsapp.com';
const TARGET_PORT = 443;

/**
 * Test TCP reachability using a child node process.
 * Spawns "node -e" with a TCP connect script to avoid Electron's bundled
 * Node.js network stack issues (documented on macOS 15.7.4 + Node 23).
 */
async function testTcpReachability(
  host: string,
  port: number,
  timeout: number,
): Promise<{ reachable: boolean; latency: number; error?: string }> {
  const script = `
    const net = require('net');
    const s = net.createConnection({host:${JSON.stringify(host)},port:${port}},()=>{
      const elapsed = Date.now() - start;
      console.log(JSON.stringify({reachable:true,latency:elapsed}));
      s.end();
      process.exit(0);
    });
    const start = Date.now();
    s.on('error',e=>{
      console.log(JSON.stringify({reachable:false,latency:Date.now()-start,error:e.message}));
      process.exit(1);
    });
    s.setTimeout(${timeout},()=>{
      console.log(JSON.stringify({reachable:false,latency:Date.now()-start,error:'Connection timeout'}));
      s.destroy();
      process.exit(2);
    });
  `;

  try {
    const { stdout } = await execFileAsync('node', ['-e', script], {
      timeout: timeout + 5000,
      maxBuffer: 1024 * 1024,
    });
    return JSON.parse(stdout.trim());
  } catch (error: any) {
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout.trim());
      } catch {
        // fall through to default error
      }
    }
    return {
      reachable: false,
      latency: 0,
      error: error?.stderr?.trim() || error?.message || String(error),
    };
  }
}

/**
 * Test proxy tunnel reachability to web.whatsapp.com:443 using pure Node.js.
 * Cross-platform, no external curl dependency.
 *
 * For HTTP proxy: sends CONNECT tunnel request.
 * For SOCKS5 proxy: performs SOCKS5 handshake + CONNECT request.
 * Only verifies the tunnel is established (no TLS/HTTPS needed).
 */
async function testProxyViaRequest(
  host: string,
  port: number,
  protocol: 'http' | 'socks5',
  user: string | undefined,
  password: string | undefined,
  timeout: number,
): Promise<{ success: boolean; error?: string; latency: number }> {
  return new Promise(resolve => {
    const startTime = Date.now();
    const socket = new net.Socket();

    const done = (err?: string) => {
      const latency = Date.now() - startTime;
      socket.removeAllListeners();
      socket.destroy();
      if (err) {
        resolve({ success: false, error: err, latency });
      } else {
        resolve({ success: true, latency });
      }
    };

    socket.setTimeout(timeout);
    socket.on('timeout', () => done('Connection timeout'));

    socket.on('error', err => done(err.message));

    socket.connect(port, host, () => {
      if (protocol === 'http') {
        // HTTP CONNECT tunnel
        const authHeader =
          user && password
            ? `Proxy-Authorization: Basic ${Buffer.from(`${user}:${password}`).toString('base64')}\r\n`
            : '';
        socket.write(
          `CONNECT ${TARGET_HOST}:${TARGET_PORT} HTTP/1.1\r\nHost: ${TARGET_HOST}:${TARGET_PORT}\r\n${authHeader}\r\n`,
        );

        let response = '';
        const onData = (data: Buffer) => {
          response += data.toString();
          // Wait for complete HTTP response line
          if (response.includes('\r\n\r\n') || response.includes('\n\n')) {
            socket.removeListener('data', onData);
            const statusLine = response.split(/\r?\n/)[0];
            const statusCode = Number.parseInt(statusLine.split(' ')[1], 10);
            if (statusCode === 200) {
              done();
            } else {
              done(`Proxy returned HTTP ${statusCode}`);
            }
          }
        };
        socket.on('data', onData);
      } else {
        // SOCKS5 handshake + CONNECT
        try {
          const proxyUser = user || '';
          const proxyPass = password || '';

          // Build SOCKS5 auth negotiation
          const authMethods = proxyUser ? [0x00, 0x02] : [0x00];

          // Phase 1: greeting
          socket.write(Buffer.from([0x05, authMethods.length, ...authMethods]));

          socket.once('data', (greetingReply: Buffer) => {
            if (greetingReply.length < 2 || greetingReply[0] !== 0x05) {
              done('SOCKS5: Invalid greeting response');
              return;
            }

            const chosenMethod = greetingReply[1];

            const doConnect = () => {
              // Phase 3: CONNECT to target
              const hostname = TARGET_HOST;
              const hostnameBuf = Buffer.from(hostname, 'utf8');
              const portBuf = Buffer.alloc(2);
              portBuf.writeUInt16BE(TARGET_PORT, 0);

              const connectReq = Buffer.concat([
                Buffer.from([0x05, 0x01, 0x00, 0x03, hostnameBuf.length]),
                hostnameBuf,
                portBuf,
              ]);
              socket.write(connectReq);

              socket.once('data', (connectReply: Buffer) => {
                if (connectReply.length < 2 || connectReply[0] !== 0x05) {
                  done('SOCKS5: Invalid CONNECT response');
                  return;
                }
                if (connectReply[1] !== 0x00) {
                  const errors: Record<number, string> = {
                    1: 'General SOCKS server failure',
                    2: 'Connection not allowed by ruleset',
                    3: 'Network unreachable',
                    4: 'Host unreachable',
                    5: 'Connection refused by target',
                    6: 'TTL expired',
                    7: 'Command not supported',
                    8: 'Address type not supported',
                  };
                  done(
                    `SOCKS5: ${errors[connectReply[1]] || `Error code 0x${connectReply[1].toString(16)}`}`,
                  );
                  return;
                }
                done();
              });
            };

            if (chosenMethod === 0xff) {
              done('SOCKS5: No acceptable auth method');
              return;
            }

            if (chosenMethod === 0x02) {
              // Phase 2: username/password auth
              const userBuf = Buffer.from(proxyUser, 'utf8');
              const passBuf = Buffer.from(proxyPass, 'utf8');
              const authReq = Buffer.concat([
                Buffer.from([0x01, userBuf.length]),
                userBuf,
                Buffer.from([passBuf.length]),
                passBuf,
              ]);
              socket.write(authReq);

              socket.once('data', (authReply: Buffer) => {
                if (
                  authReply.length < 2 ||
                  authReply[0] !== 0x01 ||
                  authReply[1] !== 0x00
                ) {
                  done('SOCKS5: Authentication failed');
                  return;
                }
                doConnect();
              });
            } else {
              doConnect();
            }
          });
        } catch (error: any) {
          done(`SOCKS5: ${error.message}`);
        }
      }
    });
  });
}

export default () => {
  ipcMain.handle(
    'proxy-test',
    async (
      _event,
      { host, port, protocol = 'http', timeout = 5000 }: ProxyTestOptions,
    ): Promise<ProxyTestResult> => {
      const connResult = await testTcpReachability(host, port, timeout);
      if (!connResult.reachable) {
        return {
          reachable: false,
          latency: connResult.latency,
          protocol,
          error: connResult.error || 'TCP connection failed',
        };
      }

      return {
        reachable: true,
        latency: connResult.latency,
        protocol,
      };
    },
  );

  ipcMain.handle(
    'proxy-test-request',
    async (
      _event,
      {
        host,
        port,
        protocol = 'http',
        user,
        password,
        timeout = 10_000,
      }: ProxyTestOptions & { user?: string; password?: string },
    ): Promise<ProxyTestResult> => {
      const connResult = await testTcpReachability(host, port, timeout);
      if (!connResult.reachable) {
        return {
          reachable: false,
          latency: connResult.latency,
          protocol,
          error: connResult.error || 'TCP connection failed',
        };
      }

      const requestResult = await testProxyViaRequest(
        host,
        port,
        protocol,
        user,
        password,
        timeout,
      );

      if (!requestResult.success) {
        return {
          reachable: false,
          latency: requestResult.latency,
          protocol,
          error: 'WHATSAPP_REQUEST_FAILED',
        };
      }

      return {
        reachable: true,
        latency: requestResult.latency,
        protocol,
      };
    },
  );
};
