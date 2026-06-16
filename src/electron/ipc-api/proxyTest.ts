import { execFile } from 'node:child_process';
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

async function testProxyViaRequest(
  host: string,
  port: number,
  protocol: 'http' | 'socks5',
  user: string | undefined,
  password: string | undefined,
  timeout: number,
): Promise<{ success: boolean; error?: string }> {
  const proxyArg =
    protocol === 'socks5'
      ? user && password
        ? `socks5h://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}`
        : `socks5h://${host}:${port}`
      : user && password
        ? `http://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}`
        : `http://${host}:${port}`;

  try {
    await execFileAsync(
      'curl',
      [
        '-s',
        '-o',
        '/dev/null',
        '-w',
        '%{http_code}',
        '--max-time',
        String(Math.ceil(timeout / 1000)),
        '-x',
        proxyArg,
        'https://web.whatsapp.com/',
      ],
      { timeout, maxBuffer: 1024 * 1024 },
    );
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
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
          latency: connResult.latency,
          protocol,
          error: `代理服务器可达但请求失败: ${requestResult.error || '未知错误'}`,
        };
      }

      return {
        reachable: true,
        latency: connResult.latency,
        protocol,
      };
    },
  );
};
