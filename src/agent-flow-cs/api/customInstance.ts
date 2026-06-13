import { getApiKey } from '../../whatsapp-automation/api/auth';
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
  // Handle both absolute URLs (replace host) and relative paths (prepend base)
  const actualUrl = /^https?:\/\//.test(url)
    ? url.replace(/^https?:\/\/[^/]+/, AGENT_FLOW_CS_BASE)
    : `${AGENT_FLOW_CS_BASE.replace(/\/+$/, '')}${url}`;

  // agent-flow-cs supports two auth methods:
  //   1. Bearer JWT (own token from /api/v1/auth/login)
  //   2. X-AKG-Api-Key (WA-AKG wag_… key, looked up via AKG DB)
  // Sending a wag_ key as Bearer fails JWT decode → 401.
  // Strategy: prioritize Bearer JWT when available; never send a wag_ key as Bearer.
  // If bearerToken exists AND is NOT an AKG key, use it as Bearer.
  // Otherwise use the AKG key in header.
  const bearerToken = getAccessToken();
  const akgApiKey = getApiKey();
  const isAkgKey = bearerToken?.startsWith('wag_');

  const config: RequestInit & { signal?: AbortSignal } = {
    ...options,
    signal: options?.signal ?? controller.signal,
    headers: {
      ...(!isAkgKey && bearerToken
        ? { Authorization: `Bearer ${bearerToken}` }
        : {}),
      ...(akgApiKey ? { 'X-AKG-Api-Key': akgApiKey } : {}),
      ...options?.headers,
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
