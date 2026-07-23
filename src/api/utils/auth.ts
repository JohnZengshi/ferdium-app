import { ipcRenderer } from 'electron';
import { when } from 'mobx';
import localStorage from 'mobx-localstorage';
import { ferdiumLocale, ferdiumVersion } from '../../environment-remote';
import { recordMetric } from '../../performance/renderer';
import { METRICS } from '../../performance/types';
import { localServerToken, needsToken } from '../apiBase';

export const prepareAuthRequest = (
  // eslint-disable-next-line unicorn/no-object-as-default-parameter
  options = { method: 'GET' },
  auth = true,
) => {
  const request = Object.assign(options, {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'X-Franz-Source': 'desktop',
      'X-Franz-Version': ferdiumVersion,
      'X-Franz-platform': process.platform,
      'X-Franz-Timezone-Offset': new Date().getTimezoneOffset(),
      'X-Franz-System-Locale': ferdiumLocale,
      // @ts-expect-error Property 'headers' does not exist on type '{ method: string; }'.
      ...options.headers,
    },
  });

  if (auth) {
    request.headers.Authorization = `Bearer ${localStorage.getItem(
      'authToken',
    )}`;
  }

  return request;
};

export const prepareLocalToken = async (requestData: {
  method: string;
  headers?: any;
  body?: any;
}) => {
  if (!needsToken()) return;

  const startedAt = Date.now();
  const recordWait = (status: 'existing' | 'ipc' | 'mobx' | 'timeout') =>
    recordMetric(
      METRICS.LOCAL_SERVER_TOKEN_WAIT,
      Date.now() - startedAt,
      'ms',
      'renderer',
      { status },
    );

  const existingToken = localServerToken();
  if (existingToken) {
    // eslint-disable-next-line no-param-reassign
    requestData.headers['X-Aitalk-Local-Token'] = existingToken;
    recordWait('existing');
    return;
  }

  // Fallback 1: actively request token from main process via ipc handle
  // This works on page refresh where the 'localServerPort' event was lost
  try {
    const result = await ipcRenderer.invoke('getLocalServerToken');
    if (result?.token) {
      // eslint-disable-next-line no-param-reassign
      requestData.headers['X-Aitalk-Local-Token'] = result.token;
      recordWait('ipc');
      return;
    }
  } catch {
    // Token retrieval failed; will try fallback
  }

  // Fallback 2: wait for observable (handles slow first-time server startup)
  try {
    await when(() => !!localServerToken(), { timeout: 15_000 });
  } catch {
    recordWait('timeout');
    // Timed out waiting for local server token; proceed without it.
    // The server will reject the request if the token is truly required,
    // but this prevents an unhandled WHEN_TIMEOUT from breaking the
    // entire request chain (e.g. health checks on the auth screen).
    return;
  }

  const delayedToken = localServerToken();
  if (delayedToken) {
    // eslint-disable-next-line no-param-reassign
    requestData.headers['X-Aitalk-Local-Token'] = delayedToken;
    recordWait('mobx');
  }
};

export const sendAuthRequest = async (
  url: RequestInfo,
  options?: { method: string; headers?: any; body?: any },
  auth?: boolean,
) => {
  const request = prepareAuthRequest(options, auth);
  await prepareLocalToken(request);
  // @ts-expect-error Argument of type '{ method: string; } & { mode: string; headers: any; }' is not assignable to parameter of type 'RequestInit | undefined'.
  return window.fetch(url, request);
};
