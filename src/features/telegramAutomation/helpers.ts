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
