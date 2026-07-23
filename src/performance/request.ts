import { isRendererInitialized, recordMetric } from './renderer';
import { METRICS } from './types';

type ApiNamespace = 'agent_flow' | 'whatsapp_automation';
type ApiGroup = string;
type RequestStatus = 'ok' | 'error' | 'cancelled' | 'timeout';

const pending = new Map<ApiNamespace, { active: number; high: number }>();

/**
 * Fixed path-prefix → api_group mapping. Keys are URL path substrings that are
 * checked against the request pathname (case-insensitive). Values are the only
 * allowed `api_group` labels — raw URLs are never written to metrics, Debug, or
 * JSONL. This covers the orval-generated endpoint directories, not arbitrary
 * caller-supplied paths.
 */
const AGENT_FLOW_GROUPS: Record<string, string> = {
  '/api/v1/auth': 'auth',
  '/api/v1/agent-workflow': 'agent',
  '/api/v1/agent-workflows': 'agent',
  '/api/v1/conversations': 'conversation',
  '/api/v1/chat': 'conversation',
  '/api/v1/messages': 'conversation',
  '/api/v1/rules': 'rule',
  '/api/v1/knowledge': 'knowledge',
  '/api/v1/digital-humans': 'digital_human',
  '/api/v1/digital_humans': 'digital_human',
  '/api/v1/handoff': 'agent',
  '/api/v1/telegram/instances': 'other',
  '/api/v1/telegram-bots': 'other',
  '/api/v1/memory': 'knowledge',
  '/api/v1/customer-profiles': 'other',
  '/api/v1/accounts': 'agent',
  '/api/v1/suggestion': 'other',
  '/api/v1/translate': 'other',
};

const WHATSAPP_GROUPS: Record<string, string> = {
  '/api/session': 'session',
  '/api/sessions': 'session',
  '/api/session-access': 'session',
  '/api/qr': 'qr',
  '/api/status': 'status',
  '/api/auth': 'auth',
  '/api/web-authentication': 'auth',
  '/api/users': 'other',
  '/api/contacts': 'other',
  '/api/chats': 'other',
  '/api/chat': 'other',
  '/api/messaging': 'other',
  '/api/groups': 'other',
  '/api/labels': 'other',
  '/api/media': 'other',
  '/api/notifications': 'other',
  '/api/scheduler': 'other',
  '/api/auto-reply': 'control',
  '/api/auto-replies': 'control',
  '/api/webhooks': 'control',
};

const resolveApiGroup = (namespace: ApiNamespace, url: string): ApiGroup => {
  let pathname: string;
  try {
    pathname = new URL(url, 'http://localhost').pathname.toLowerCase();
  } catch {
    return 'other';
  }
  const map = namespace === 'agent_flow' ? AGENT_FLOW_GROUPS : WHATSAPP_GROUPS;
  for (const key of Object.keys(map)) {
    if (pathname.startsWith(key)) return map[key];
  }
  return 'other';
};

const AGENT_FLOW_SSE_GROUPS: Record<string, string> = {
  '/api/v1/conversations': 'conversation',
  '/api/v1/chat': 'conversation',
  '/api/v1/messages': 'conversation',
};

export const resolveSseApiGroup = (path: string): string => {
  let pathname: string;
  try {
    pathname = new URL(path, 'http://localhost').pathname.toLowerCase();
  } catch {
    return 'other';
  }
  for (const key of Object.keys(AGENT_FLOW_SSE_GROUPS)) {
    if (pathname.startsWith(key)) return AGENT_FLOW_SSE_GROUPS[key];
  }
  return 'other';
};

const isTimeoutError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const { name, code } = error as { name?: unknown; code?: unknown };
  return name === 'TimeoutError' || code === 'ETIMEDOUT';
};

export const classifyRequestError = (error: unknown): RequestStatus => {
  if (isTimeoutError(error)) return 'timeout';
  if (
    error &&
    typeof error === 'object' &&
    (error as { name?: unknown }).name === 'AbortError'
  ) {
    return 'cancelled';
  }
  return 'error';
};

export const beginRequestMetrics = (
  namespace: ApiNamespace,
  url: string,
  method: string,
) => {
  if (!isRendererInitialized()) return () => {};

  const state = pending.get(namespace) ?? { active: 0, high: 0 };
  state.active += 1;
  pending.set(namespace, state);

  const tags = {
    method: method.toUpperCase(),
    api_group: resolveApiGroup(namespace, url),
  };
  if (state.active > state.high) {
    state.high = state.active;
    recordMetric(
      namespace === 'agent_flow'
        ? METRICS.AGENT_FLOW_PENDING_HIGH_WATERMARK
        : METRICS.WHATSAPP_AUTOMATION_PENDING_HIGH_WATERMARK,
      state.high,
      'count',
      'renderer',
      tags,
    );
  }

  let ended = false;
  const startedAt = Date.now();
  return (status: RequestStatus): void => {
    if (ended) return;
    ended = true;
    state.active = Math.max(0, state.active - 1);
    recordMetric(
      namespace === 'agent_flow'
        ? METRICS.AGENT_FLOW_REQUEST
        : METRICS.WHATSAPP_AUTOMATION_REQUEST,
      Math.max(0, Date.now() - startedAt),
      'ms',
      'renderer',
      { ...tags, status },
    );
    if (status !== 'ok') {
      recordMetric(
        namespace === 'agent_flow'
          ? METRICS.AGENT_FLOW_REQUEST_ERROR
          : METRICS.WHATSAPP_AUTOMATION_REQUEST_ERROR,
        1,
        'count',
        'renderer',
        { ...tags, status },
      );
    }
    if (status === 'timeout') {
      recordMetric(
        namespace === 'agent_flow'
          ? METRICS.AGENT_FLOW_REQUEST_TIMEOUT
          : METRICS.WHATSAPP_AUTOMATION_REQUEST_TIMEOUT,
        1,
        'count',
        'renderer',
        { ...tags, status },
      );
    }
  };
};

/**
 * Run an Orval/customInstance fetch operation with performance metrics.
 *
 * This is a pure instrumentation wrapper - it does NOT add timeouts, retries,
 * or alter the operation's Promise behavior. The caller signal (if any) is
 * forwarded directly to the operation so abort behavior is unchanged.
 *
 * When the operation rejects with a TimeoutError / ETIMEDOUT (produced by the
 * caller's own timeout mechanism, not this wrapper), the metric is classified
 * as `timeout`. When it rejects with an AbortError from a caller-initiated
 * abort, the metric is classified as `cancelled`.
 */
export const trackRequest = <T>(
  namespace: ApiNamespace,
  url: string,
  method: string,
  operation: (signal: AbortSignal) => Promise<T>,
  callerSignal?: AbortSignal | null,
): Promise<T> => {
  if (!isRendererInitialized()) {
    return operation(callerSignal ?? new AbortController().signal);
  }

  const finish = beginRequestMetrics(namespace, url, method);
  const signal = callerSignal ?? new AbortController().signal;

  return Promise.resolve()
    .then(() => operation(signal))
    .then(
      result => {
        finish('ok');
        return result;
      },
      error => {
        finish(classifyRequestError(error));
        throw error;
      },
    );
};

let activeSse = 0;
let activeSseHigh = 0;

export const beginSseMetrics = (apiGroup: string) => {
  if (!isRendererInitialized()) {
    return {
      open: () => {},
      error: () => {},
      close: () => {},
    };
  }

  const startedAt = Date.now();
  let opened = false;
  let ended = false;
  let openedAt = 0;
  const tags = { status: 'pending', api_group: apiGroup };
  activeSse += 1;
  if (activeSse > activeSseHigh) {
    activeSseHigh = activeSse;
    recordMetric(
      METRICS.AGENT_FLOW_SSE_ACTIVE_HIGH_WATERMARK,
      activeSseHigh,
      'count',
      'renderer',
      { api_group: apiGroup },
    );
  }

  return {
    open: () => {
      if (ended || opened) return;
      opened = true;
      openedAt = Date.now();
      recordMetric(
        METRICS.AGENT_FLOW_SSE_CONNECT,
        Math.max(0, openedAt - startedAt),
        'ms',
        'renderer',
        { ...tags, status: 'ok' },
      );
      recordMetric(METRICS.AGENT_FLOW_SSE_OPEN, 1, 'count', 'renderer', {
        api_group: apiGroup,
        status: 'ok',
      });
    },
    error: () => {
      if (ended) return;
      recordMetric(METRICS.AGENT_FLOW_SSE_ERROR, 1, 'count', 'renderer', {
        api_group: apiGroup,
        status: 'error',
      });
    },
    close: (status: string) => {
      if (ended) return;
      ended = true;
      activeSse = Math.max(0, activeSse - 1);
      const now = Date.now();
      if (opened) {
        recordMetric(
          METRICS.AGENT_FLOW_SSE_UPTIME,
          Math.max(0, now - openedAt),
          'ms',
          'renderer',
          { api_group: apiGroup, status },
        );
      } else {
        recordMetric(
          METRICS.AGENT_FLOW_SSE_CONNECT,
          Math.max(0, now - startedAt),
          'ms',
          'renderer',
          { ...tags, status },
        );
      }
      recordMetric(METRICS.AGENT_FLOW_SSE_CLOSE, 1, 'count', 'renderer', {
        api_group: apiGroup,
        status,
      });
    },
  };
};
