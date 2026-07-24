export const parseInstanceId = (body: unknown): string | null => {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  const direct = obj.id ?? obj.instance_id;
  if (typeof direct === 'string' && direct) return direct;
  const nested = obj.data;
  if (nested && typeof nested === 'object') {
    const nestedObj = nested as Record<string, unknown>;
    const nestedId = nestedObj.id ?? nestedObj.instance_id;
    if (typeof nestedId === 'string' && nestedId) return nestedId;
  }
  return null;
};

export const getStringField = (obj: unknown, key: string): string => {
  if (!obj || typeof obj !== 'object') return '';
  const record = obj as Record<string, unknown>;
  const val = record[key];
  return typeof val === 'string' ? val : '';
};

export const extractQrUrl = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const url = obj.url ?? obj.qr ?? obj.qr_code ?? obj.qrCode;
  if (typeof url === 'string' && url) return url;
  return null;
};

export const isAuthorizedEvent = (event: string, data: unknown): boolean => {
  const normalized = event.toLowerCase();
  if (normalized === 'authorized' || normalized === 'success') return true;
  const type = getStringField(data, 'type').toLowerCase();
  const status = getStringField(data, 'status').toLowerCase();
  return type === 'authorized' || status === 'authorized';
};

export const isPasswordRequired = (event: string, data: unknown): boolean => {
  if (event.toLowerCase().includes('password')) return true;
  return getStringField(data, 'type').toLowerCase().includes('password');
};

export const isQrEvent = (event: string, data: unknown): boolean => {
  const normalized = event.toLowerCase();
  if (
    normalized === 'qr' ||
    normalized === 'qr_code' ||
    normalized === 'qrcode'
  ) {
    return true;
  }
  const type = getStringField(data, 'type').toLowerCase();
  return type === 'qr' || type === 'qr_code';
};

// --- HTTP login response classifiers (for /login/phone|code|password bodies) ---

const responseTokens = (data: unknown): string[] => {
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  const status = typeof obj.status === 'string' ? obj.status : '';
  const type = typeof obj.type === 'string' ? obj.type : '';
  return `${status} ${type}`.trim().toLowerCase().split(/\s+/).filter(Boolean);
};

// 2FA password prompt: an explicit `password_required` status/type.
export const isPasswordPayload = (data: unknown): boolean =>
  responseTokens(data).includes('password_required');

// Password was accepted/submitted but final authorization is not yet confirmed.
// Covers the new `password_submitted` status and the legacy `{ ok: true }` body,
// which only means the request was accepted - NOT that Telegram authorized.
export const isPasswordSubmittedPayload = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (obj.status === 'password_submitted' || obj.type === 'password_submitted')
    return true;
  return obj.ok === true;
};

// Authorization is acknowledged ONLY on an explicit `authorized` status/type.
// `{ ok: true }` and `unauthorized`/`not_authorized` must NOT match.
export const isAuthorizedPayload = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return obj.status === 'authorized' || obj.type === 'authorized';
};

/**
 * Proxy shape mirroring `ServiceProxy` from EditServiceDrawer (kept structural
 * to avoid a features -> components/ui type dependency).
 */
export interface TelegramProxyLike {
  isEnabled?: boolean;
  protocol?: string;
  host?: string;
  port?: string | number;
  user?: string;
  password?: string;
}

/**
 * Convert an EditServiceDrawer proxy object into a Flux instance `proxy_url`.
 *
 * Telegram (gramjs) only supports socks5, so the protocol is forced to socks5
 * regardless of the drawer's `protocol` field. Returns `null` to clear the
 * upstream proxy (disabled or invalid). Callers that must omit the field
 * (e.g. createInstance) should coalesce `null` -> `undefined`.
 */
export const serviceProxyToTelegramProxyUrl = (
  proxy: TelegramProxyLike | null | undefined,
): string | null => {
  if (!proxy?.isEnabled) return null;
  const host = typeof proxy.host === 'string' ? proxy.host.trim() : '';
  const port = proxy.port == null ? '' : String(proxy.port).trim();
  if (!host || !port) return null;
  const creds =
    proxy.user && proxy.password
      ? `${encodeURIComponent(proxy.user)}:${encodeURIComponent(proxy.password)}@`
      : '';
  return `socks5://${creds}${host}:${port}`;
};
