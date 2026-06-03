/**
 * Custom fetch instance for orval-generated API client.
 * Handles Bearer token authentication for the Agent Flow CS API.
 *
 * Returns ORval-compatible format: { data, status, headers }.
 */
import { getAccessToken } from './auth';

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

  // Replace the hardcoded base URL with the actual backend URL from .env
  const AGENT_FLOW_CS_BASE =
    process.env.AGENT_FLOW_CS_BASE ?? 'http://10.0.0.179:8000';
  const actualUrl = url.replace(/^https?:\/\/[^/]+/, AGENT_FLOW_CS_BASE);

  const accessToken = getAccessToken();
  const config: RequestInit & { signal?: AbortSignal } = {
    ...options,
    signal: options?.signal ?? controller.signal,
    headers: {
      ...options?.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      'Content-Type': 'application/json',
    },
  };

  return fetch(actualUrl, config).then(async response => {
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      // ORval expects { data, status, headers } for success
      // The API returns data directly (no { status, message, data } wrapper)
      const payload: OrvalResponse<T> = {
        data: body as T,
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
