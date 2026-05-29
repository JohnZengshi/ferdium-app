/**
 * Custom fetch instance for orval-generated API client.
 * Handles X-API-Key authentication for the WhatsApp AI Gateway.
 *
 * Returns ORval-compatible format: { data, status, headers }.
 * The WA-AKG API wraps responses as { status, message, data } — we extract
 * the inner `data` field so code can use `response.data` directly.
 */
import { getApiKey } from './auth';

type OrvalResponse<T> = {
  data: T;
  status: number;
  headers: Headers;
};

export const useCustomInstance = <T>(
  url: string,
  options?: RequestInit,
): Promise<T> => {
  const controller = new AbortController();

  // Generated API files hardcode http://localhost:3000 — replace the host
  // with the actual backend URL from .env
  const WA_AKG_BASE = process.env.WA_AKG_BASE ?? 'http://localhost:3000';
  const actualUrl = url.replace(/^https?:\/\/[^/]+/, WA_AKG_BASE);

  const config: RequestInit & { signal?: AbortSignal } = {
    ...options,
    signal: options?.signal ?? controller.signal,
    headers: {
      ...options?.headers,
      'X-API-Key': getApiKey(),
      'Content-Type': 'application/json',
    },
  };

  return fetch(actualUrl, config).then(async response => {
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      // ORval expects { data, status, headers } for success
      // body.data = the actual payload (sessions array, session object, etc.)
      // If body.data is undefined, the body itself IS the payload (e.g. QR endpoint)
      const payload: OrvalResponse<T> = {
        data: (body.data === undefined ? body : body.data) as T,
        status: response.status,
        headers: response.headers,
      };
      return payload as T;
    }

    const errorMessage = body.message || body.error || response.statusText;

    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    (error as any).url = response.url;

    throw error;
  });
};

export default useCustomInstance;
