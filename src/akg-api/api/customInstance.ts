/**
 * Custom fetch instance for orval-generated API client.
 * Handles X-API-Key authentication for the AKG API.
 *
 * Returns ORval-compatible format: { data, status, headers }.
 */
import { getApiKey } from '../../whatsapp-automation/api/auth';

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

  const WA_AKG_BASE = process.env.WA_AKG_BASE ?? 'http://localhost:3000';
  const actualUrl = url.replace(/^https?:\/\/[^/]+/, WA_AKG_BASE);

  const apiKey = getApiKey();
  const config: RequestInit & { signal?: AbortSignal } = {
    ...options,
    signal: options?.signal ?? controller.signal,
    headers: {
      ...options?.headers,
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      'Content-Type': 'application/json',
    },
  };

  return fetch(actualUrl, config).then(async response => {
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
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
