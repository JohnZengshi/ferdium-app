/**
 * SSE (Server-Sent Events) client for Agent Flow CS streaming endpoints.
 *
 * The orval-generated functions treat responses as one-shot JSON, which breaks
 * SSE endpoints that stream `text/event-stream` data over a long-lived connection.
 * This helper uses native fetch + ReadableStream to properly consume SSE streams
 * with Bearer token authentication.
 */
import { getApiKey } from '../../whatsapp-automation/api/auth';
import { getAccessToken } from './auth';
import { AGENT_FLOW_CS_BASE } from './customInstance';

export type SSEEvent<T = unknown> = {
  /** Event type (the `event:` field). Default is `message` when omitted. */
  event: string;
  /** Parsed JSON payload from the `data:` field. */
  data: T;
  /** Raw `id:` field if present. */
  id?: string;
  /** Raw `retry:` field (ms) if present. */
  retry?: number;
};

export type SSEHandlers<T = unknown> = {
  onEvent: (evt: SSEEvent<T>) => void;
  onError?: (error: unknown) => void;
  onClose?: () => void;
};

export type SSESubscription = {
  /** Abort the stream and release the reader. */
  close: () => void;
};

/**
 * Subscribe to a Server-Sent Events stream.
 *
 * @param path    API path starting with `/api/v1/...`
 * @param handlers  Event handlers (onEvent required, onError/onClose optional)
 * @returns A subscription handle — call `.close()` to disconnect.
 *
 * @example
 * const sub = subscribeSSE<ConversationStatus>(
 *   `/api/v1/conversations/by-customer/${customerId}/status/stream?platform=whatsapp&wa_session_id=...`,
 *   {
 *     onEvent: evt => console.log('status:', evt.data),
 *     onError: err => console.error('SSE error:', err),
 *   },
 * );
 * // later
 * sub.close();
 */
export const subscribeSSE = <T = unknown>(
  path: string,
  handlers: SSEHandlers<T>,
): SSESubscription => {
  const { onEvent, onError, onClose } = handlers;
  const controller = new AbortController();
  let closed = false;

  const base = AGENT_FLOW_CS_BASE.replace(/\/+$/, '');
  const url = path.startsWith('http') ? path : `${base}${path}`;

  const bearerToken = getAccessToken();
  const akgApiKey = getApiKey();
  const isAkgKey = bearerToken?.startsWith('wag_');

  (async () => {
    let closedInLoop = closed;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(!isAkgKey && bearerToken
            ? { Authorization: `Bearer ${bearerToken}` }
            : {}),
          ...(akgApiKey ? { 'X-AKG-Api-Key': akgApiKey } : {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || body.detail || response.statusText);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (!closedInLoop) {
        closedInLoop = closed;
        // eslint-disable-next-line no-await-in-loop
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line (\n\n)
        const frames = buffer.split('\n\n');
        // Last chunk may be incomplete — keep it in the buffer
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const evt = parseSSEFrame<T>(frame);
          if (evt) onEvent(evt);
        }
      }
    } catch (error) {
      if (controller.signal.aborted || closed) {
        // Graceful close — not an error
      } else {
        // Error still closes stream. Notify both hooks so consumers can clean
        // stale subscription state and decide whether to reconnect.
        closed = true;
        try {
          if (onError) {
            onError(error);
          } else {
            console.error('[Agent Flow CS] SSE stream error:', error);
          }
        } finally {
          onClose?.();
        }
      }
    } finally {
      if (!closed) {
        closed = true;
        onClose?.();
      }
    }
  })();

  return {
    close: () => {
      if (!closed) {
        closed = true;
        controller.abort();
      }
    },
  };
};

/**
 * Parse a single SSE frame (the text between two `\n\n` separators).
 *
 * A frame may contain multiple lines:
 *   event: status\n
 *   data: {"foo":"bar"}\n
 *   id: 42\n
 *   retry: 3000\n
 */
const parseSSEFrame = <T>(frame: string): SSEEvent<T> | null => {
  const lines = frame.split('\n');
  let event = 'message';
  let dataStr = '';
  let id: string | undefined;
  let retry: number | undefined;

  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      // comment/heartbeat — skip
    } else {
      const colonIdx = line.indexOf(':');
      const field = colonIdx === -1 ? line : line.slice(0, colonIdx);
      const value =
        colonIdx === -1 ? '' : line.slice(colonIdx + 1).replace(/^ /, '');

      switch (field) {
        case 'event': {
          event = value;
          break;
        }
        case 'data': {
          dataStr = dataStr ? `${dataStr}\n${value}` : value;
          break;
        }
        case 'id': {
          id = value;
          break;
        }
        case 'retry': {
          retry = Number(value);
          break;
        }
        default: {
          break;
        }
      }
    }
  }

  if (!dataStr) return null;

  let data: T;
  try {
    data = JSON.parse(dataStr) as T;
  } catch {
    // Non-JSON payload — return raw string
    data = dataStr as unknown as T;
  }

  return { event, data, id, retry };
};

/**
 * Conversation status values pushed by the SSE stream.
 * Source: `GET /api/v1/owners/conversations/{id}/status/stream`.
 */
export type ConversationStatusValue =
  | 'active'
  | 'paused'
  | 'archived'
  | 'closed'
  | string; // forward-compatible: backend may add new states

/**
 * SSE event payload emitted by the conversation status stream.
 *
 * Server flow (per OpenAPI description):
 *   1. Initial event with `is_initial: true` carrying current DB state
 *   2. Subsequent events pushed from Redis Pub/Sub channel `conv:status:{id}`
 */
export type ConversationStatusEvent = {
  type: 'status_change';
  conversation_id: string;
  status: ConversationStatusValue;
  is_initial?: boolean;
};

/**
 * Subscribe to conversation status changes by customer ID.
 *
 * This endpoint uses Server-Sent Events (SSE) to push real-time status updates.
 * The stream will:
 *   1. Send the current DB status as an initial event (is_initial: true)
 *   2. Subscribe to Redis Pub/Sub channel `conv:status:{conversation_id}`
 *   3. Push subsequent status_change events as they occur
 *
 * @param customerId Customer identifier (e.g., WhatsApp JID)
 * @param handlers Event handlers (onEvent required, onError/onClose optional)
 * @param options Optional parameters
 * @param options.platform Platform identifier (default: 'whatsapp')
 * @param options.waSessionId WhatsApp session ID for multi-session routing
 *
 * @example
 * const sub = subscribeConversationStatus('1234567890@s.whatsapp.net', {
 *   onEvent: evt => {
 *     console.log('status:', evt.data.status, 'initial:', evt.data.is_initial);
 *   },
 * }, { platform: 'whatsapp', waSessionId: 'session-123' });
 *
 * // later
 * sub.close();
 */
export const subscribeConversationStatus = (
  customerId: string,
  handlers: SSEHandlers<ConversationStatusEvent>,
  options?: { platform?: string; waSessionId?: string },
): SSESubscription => {
  const platform = options?.platform ?? 'whatsapp';
  const params = new URLSearchParams({ platform });
  if (options?.waSessionId) {
    params.set('wa_session_id', options.waSessionId);
  }
  return subscribeSSE<ConversationStatusEvent>(
    `/api/v1/conversations/by-customer/${encodeURIComponent(customerId)}/status/stream?${params.toString()}`,
    handlers,
  );
};

export const subscribeConversationLive = (
  customerId: string,
  handlers: SSEHandlers<unknown>,
  options?: {
    platform?: string;
    waSessionId?: string;
    ownerUserId?: string | null;
  },
): SSESubscription => {
  const platform = options?.platform ?? 'whatsapp';
  const params = new URLSearchParams({ platform, customer_id: customerId });
  if (options?.waSessionId) {
    params.set('wa_session_id', options.waSessionId);
  }
  if (options?.ownerUserId) {
    params.set('owner_user_id', options.ownerUserId);
  }
  return subscribeSSE<unknown>(
    `/api/v1/owners/conversations/by-session/stream?${params.toString()}`,
    handlers,
  );
};
