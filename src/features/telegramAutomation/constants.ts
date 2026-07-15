export const TELEGRAM_AUTOMATION_RECIPE_ID = 'telegram';

// Relative to Agent Flow CS base; subscribeSSE prepends AGENT_FLOW_CS_BASE + auth headers.
export const TELEGRAM_QR_STREAM_PATH = (instanceId: string): string =>
  `/api/v1/telegram/instances/${encodeURIComponent(instanceId)}/login/qr`;

// Unique IPC channel for Telegram login actions (distinct from WhatsApp's channel).
export const TELEGRAM_LOGIN_ACTION_CHANNEL = 'tg-akg-login-action';

export const TELEGRAM_LOGIN_STEP = {
  TOGGLE_PHONE: 'toggle-phone',
  TOGGLE_QR: 'toggle-qr',
  QR: 'qr',
  PHONE: 'phone',
  CODE: 'code',
  PASSWORD: 'password',
} as const;

export type TelegramLoginStep =
  (typeof TELEGRAM_LOGIN_STEP)[keyof typeof TELEGRAM_LOGIN_STEP];

export const TELEGRAM_BIND_STATUS = {
  IDLE: 'idle',
  CREATING_INSTANCE: 'creating-instance',
  WAITING_FOR_QR: 'waiting-for-qr',
  WAITING_FOR_PHONE: 'waiting-for-phone',
  WAITING_FOR_CODE: 'waiting-for-code',
  WAITING_FOR_PASSWORD: 'waiting-for-password',
  AUTHORIZED: 'authorized',
  CREATING_SERVICE: 'creating-service',
  ERROR: 'error',
} as const;

export type TelegramBindStatus =
  (typeof TELEGRAM_BIND_STATUS)[keyof typeof TELEGRAM_BIND_STATUS];
