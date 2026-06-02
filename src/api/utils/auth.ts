import { ipcRenderer } from 'electron';
import { when } from 'mobx';
import localStorage from 'mobx-localstorage';
import { ferdiumLocale, ferdiumVersion } from '../../environment-remote';
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

  const existingToken = localServerToken();
  if (existingToken) {
    // eslint-disable-next-line no-param-reassign
    requestData.headers['X-Ferdium-Local-Token'] = existingToken;
    return;
  }

  // Fallback 1: actively request token from main process via ipc handle
  // This works on page refresh where the 'localServerPort' event was lost
  try {
    const result = await ipcRenderer.invoke('getLocalServerToken');
    if (result?.token) {
      // eslint-disable-next-line no-param-reassign
      requestData.headers['X-Ferdium-Local-Token'] = result.token;
      return;
    }
  } catch {}

  // Fallback 2: wait for observable (handles slow first-time server startup)
  await when(() => !!localServerToken(), { timeout: 15000 });
  const delayedToken = localServerToken();
  if (delayedToken) {
    // eslint-disable-next-line no-param-reassign
    requestData.headers['X-Ferdium-Local-Token'] = delayedToken;
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
