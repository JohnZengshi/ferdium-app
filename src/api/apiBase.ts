import {
  DEV_API_FRANZ_WEBSITE,
  LIVE_FERDIUM_API,
  LIVE_FRANZ_API,
  LOCAL_HOSTNAME,
  LOCAL_SERVER,
  SERVER_NOT_LOADED,
} from '../config';
/**
 * Get API base URL from store
 */
import { API_VERSION } from '../environment-remote';
import { fixUrl } from '../helpers/url-helpers';

/**
 * Resolve the effective server value.
 * Priority: FERDIUM_SERVER env var > settings JSON.
 * Returns undefined if stores are not loaded yet.
 */
export const resolveServer = (): string | undefined => {
  if (process.env.FERDIUM_SERVER) {
    const env = process.env.FERDIUM_SERVER;
    return env === 'local' ? LOCAL_SERVER : env;
  }
  return (window as any).ferdium?.stores?.settings?.all?.app?.server;
};

// Note: This cannot be used from the internal-server since we are not running within the context of a browser window
export default function apiBase(withVersion = true) {
  const server = resolveServer();
  if (!server) {
    // Stores have not yet been loaded - return SERVER_NOT_LOADED to force a retry when stores are loaded
    return SERVER_NOT_LOADED;
  }

  if (server === LOCAL_SERVER) {
    if (!(window as any).ferdium?.stores?.requests?.localServerPort) {
      return SERVER_NOT_LOADED;
    }
    const url = `http://${LOCAL_HOSTNAME}:${
      (window as any).ferdium.stores.requests.localServerPort
    }`;
    return fixUrl(withVersion ? `${url}/${API_VERSION}` : url);
  }

  return fixUrl(withVersion ? `${server}/${API_VERSION}` : server);
}

export const needsToken = (): boolean => {
  return resolveServer() === LOCAL_SERVER;
};

export const localServerToken = (): string | undefined => {
  return needsToken()
    ? (window as any).ferdium?.stores?.requests?.localServerToken
    : undefined;
};

export const importExportURL = () => {
  const base = apiBase(false);
  return needsToken() ? `${base}/token/${localServerToken()}` : base;
};

export const serverBase = () => {
  const serverType = resolveServer();
  const noServerFerdi = 'You are using Ferdi without a server';
  const noServerAitalk = 'You are using Aitalk without a server';

  let terms;
  switch (serverType) {
    case LIVE_FRANZ_API: {
      terms = DEV_API_FRANZ_WEBSITE;
      break;
    }
    case noServerFerdi: {
      terms = LIVE_FERDIUM_API;
      break;
    }
    case noServerAitalk: {
      terms = LIVE_FERDIUM_API;
      break;
    }
    default: {
      terms = serverType;
    }
  }

  return fixUrl(terms);
};

export const serverName = (): string => {
  const serverType = resolveServer();
  const noServerFerdi = 'You are using Ferdi without a server';
  const noServerAitalk = 'You are using Aitalk without a server';

  let nameServer;
  switch (serverType) {
    case LIVE_FRANZ_API: {
      nameServer = 'Franz';
      break;
    }
    case LIVE_FERDIUM_API: {
      nameServer = 'Ferdium';
      break;
    }
    case noServerFerdi: {
      nameServer = 'No';
      break;
    }
    case noServerAitalk: {
      nameServer = 'No';
      break;
    }
    default: {
      nameServer = 'Custom';
    }
  }

  return nameServer;
};
