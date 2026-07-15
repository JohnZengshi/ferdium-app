import { MessagePlugin } from 'tdesign-react';
import { getApiKey } from '../../whatsapp-automation/api/auth';
/**
 * Custom fetch instance for orval-generated API client.
 * Handles Bearer token authentication for the Agent Flow CS API.
 *
 * Returns ORval-compatible format: { data, status, headers }.
 */
import { getAccessToken } from './auth';

export const AGENT_FLOW_CS_BASE =
  process.env.AGENT_FLOW_CS_BASE ?? 'http://10.0.0.228:8000';

/** Pass as options to generated API functions to suppress the automatic error toast. */
export const SUPPRESS_ERROR_TOAST: RequestInit = {
  headers: { 'X-Suppress-Error-Toast': 'true' },
};

type OrvalResponse<T> = {
  data: T;
  status: number;
  headers: Headers;
};

type ErrorBody = {
  code?: string;
  detail?: unknown;
  error?: string;
  message?: string;
};

const ERROR_CODE_MESSAGES: Readonly<Record<string, string>> = {
  BAD_REQUEST: 'Invalid request.',
  AUTHENTICATION_REQUIRED: 'Authentication required. Please sign in again.',
  INVALID_CREDENTIALS: 'Invalid credentials.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  DIGITAL_HUMAN_NOT_ASSIGNED: 'Digital human is not assigned to this account.',
  KNOWLEDGE_COLLECTION_FORBIDDEN:
    'You do not have permission to access this knowledge collection.',
  RESOURCE_NOT_FOUND: 'Requested resource was not found.',
  FEATURE_DISABLED: 'This feature is disabled.',
  RESOURCE_CONFLICT: 'Request conflicts with existing data.',
  DIGITAL_HUMAN_INACTIVE: 'Digital human is inactive.',
  DIGITAL_HUMAN_NAME_CONFLICT:
    'A digital human with this name already exists under this account.',
  PAYLOAD_TOO_LARGE: 'Request payload is too large.',
  INVALID_REQUEST: 'Request validation failed.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  INTERNAL_ERROR: 'Server error. Please try again later.',
  UPSTREAM_FAILURE: 'Upstream service failed. Please try again later.',
  SERVICE_UNAVAILABLE:
    'Service is temporarily unavailable. Please try again later.',
  KNOWLEDGE_BASE_DISABLED: 'Knowledge base is disabled.',
};

const HTTP_STATUS_MESSAGES: Readonly<Record<number, string>> = {
  400: 'Invalid request.',
  401: 'Authentication required. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'Requested resource was not found.',
  409: 'Request conflicts with existing data.',
  422: 'Request validation failed.',
  429: 'Too many requests. Please try again later.',
  500: 'Server error. Please try again later.',
  502: 'Service is temporarily unavailable. Please try again later.',
  503: 'Service is temporarily unavailable. Please try again later.',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

const parseErrorBody = (body: unknown): ErrorBody => {
  if (!isRecord(body)) return {};

  return {
    code: nonEmptyString(body.code),
    detail: body.detail,
    error: nonEmptyString(body.error),
    message: nonEmptyString(body.message),
  };
};

const getErrorMessage = (
  body: ErrorBody,
  status: number,
  statusText: string,
): string =>
  (body.code && ERROR_CODE_MESSAGES[body.code]) ||
  HTTP_STATUS_MESSAGES[status] ||
  body.message ||
  body.error ||
  nonEmptyString(body.detail) ||
  nonEmptyString(statusText) ||
  `Request failed (HTTP ${status}).`;

export class AgentFlowApiError extends Error {
  readonly status: number;

  readonly statusText: string;

  readonly url: string;

  readonly code?: string;

  readonly detail?: unknown;

  readonly body: unknown;

  constructor(
    message: string,
    response: Pick<Response, 'status' | 'statusText' | 'url'>,
    body: unknown,
    parsedBody: ErrorBody,
  ) {
    super(message);
    this.name = 'AgentFlowApiError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.url = response.url;
    this.code = parsedBody.code;
    this.detail = parsedBody.detail;
    this.body = body;
  }
}

export const useCustomInstance = <T>(
  url: string,
  options?: RequestInit,
): Promise<T> => {
  const controller = new AbortController();

  // Replace the hardcoded base URL with the actual backend URL from .env
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

    const parsedBody = parseErrorBody(body);
    const errorMessage = getErrorMessage(
      parsedBody,
      response.status,
      response.statusText,
    );

    // Callers that manage their own error display (e.g. TelegramAccountSlider
    // bind query) can suppress the toast by passing X-Suppress-Error-Toast: true.
    const rawHeaders = options?.headers;
    const suppressToast =
      rawHeaders &&
      typeof rawHeaders === 'object' &&
      !Array.isArray(rawHeaders) &&
      !(rawHeaders instanceof Headers) &&
      (rawHeaders as Record<string, string>)['X-Suppress-Error-Toast'] ===
        'true';

    if (!suppressToast) {
      MessagePlugin.error(errorMessage);
    }
    throw new AgentFlowApiError(errorMessage, response, body, parsedBody);
  });
};

export default useCustomInstance;
