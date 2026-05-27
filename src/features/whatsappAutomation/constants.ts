export const WHATSAPP_RECIPE_ID = 'whatsapp';

export const WA_AKG_BASE_URL = 'http://localhost:3000';

export const IPC = {
  SET_WEBVIEW: 'whatsapp-automation:set-webview',
  HANDLE_HOST_MESSAGE: 'whatsapp-automation:handle-host-message',
  HANDLE_CLIENT_MESSAGE: 'whatsapp-automation:handle-client-message',
  QR_MODAL_INJECTED: 'whatsapp-automation:qr-modal-injected',
  QR_CODE_SCANNED: 'whatsapp-automation:qr-code-scanned',
  SESSION_STATUS_CHANGED: 'whatsapp-automation:session-status-changed',
  INJECT_QR_MODAL: 'whatsapp-automation:inject-qr-modal',
  REMOVE_QR_MODAL: 'whatsapp-automation:remove-qr-modal',
} as const;

export const WINDOW_MESSAGE_CHANNELS = {
  REQUEST_SESSION_STATUS: 'wa-akg:request-session-status',
  SESSION_STATUS: 'wa-akg:session-status',
  QR_CODE_DATA: 'wa-akg:qr-code-data',
  QR_CODE_SCANNED: 'wa-akg:qr-code-scanned',
  INJECT_QR_MODAL: 'wa-akg:inject-qr-modal',
  REMOVE_QR_MODAL: 'wa-akg:remove-qr-modal',
} as const;
