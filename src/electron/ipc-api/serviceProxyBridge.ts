import { app, ipcMain } from 'electron';
import { Server, redactUrl } from 'proxy-chain';

const debug = require('../../preload-safe-debug')(
  'Ferdium:ipc-api:serviceProxyBridge',
);

type BridgeConfig = {
  serviceId: string;
  host: string;
  port: string | number;
  protocol?: string;
  user?: string;
  password?: string;
};

type Bridge = {
  key: string;
  proxyRules: string;
  server: Server;
};

const bridges = new Map<string, Bridge>();

const buildUpstreamUrl = ({
  host,
  port,
  user,
  password,
}: BridgeConfig): string => {
  const credentials =
    user && password
      ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`
      : '';

  return `socks5://${credentials}${host}:${port}`;
};

const closeBridge = async (serviceId: string): Promise<void> => {
  const bridge = bridges.get(serviceId);
  if (!bridge) return;

  bridges.delete(serviceId);
  await bridge.server.close(true);
  debug(`Closed proxy bridge for service ${serviceId}`);
};

const closeAllBridges = async (): Promise<void> => {
  await Promise.all(
    [...bridges.keys()].map(serviceId => closeBridge(serviceId)),
  );
};

const startBridge = async (config: BridgeConfig): Promise<string> => {
  const upstreamProxyUrl = buildUpstreamUrl(config);
  const existing = bridges.get(config.serviceId);

  if (existing?.key === upstreamProxyUrl) {
    return existing.proxyRules;
  }

  await closeBridge(config.serviceId);

  const server = new Server({
    host: '127.0.0.1',
    port: 0,
    prepareRequestFunction: () => ({ upstreamProxyUrl }),
  });

  server.on('requestFailed', ({ error }) => {
    debug(
      `Proxy bridge request failed for service ${config.serviceId}: ${error.message}`,
    );
  });

  await server.listen();

  const proxyRules = `http://127.0.0.1:${server.port}`;
  bridges.set(config.serviceId, {
    key: upstreamProxyUrl,
    proxyRules,
    server,
  });

  debug(
    `Started proxy bridge for service ${config.serviceId}: ${proxyRules} -> ${redactUrl(
      upstreamProxyUrl,
    )}`,
  );

  return proxyRules;
};

export default () => {
  ipcMain.handle(
    'service-proxy-bridge-start',
    async (_event, config: BridgeConfig): Promise<{ proxyRules: string }> => ({
      proxyRules: await startBridge(config),
    }),
  );

  ipcMain.handle(
    'service-proxy-bridge-stop',
    async (_event, serviceId: string): Promise<{ stopped: boolean }> => {
      await closeBridge(serviceId);
      return { stopped: true };
    },
  );

  app.on('before-quit', () => {
    closeAllBridges().catch(error => {
      console.error(error);
    });
  });
};
