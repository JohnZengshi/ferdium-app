import { WA_SESSION_STATUS } from './constants';

export type WhatsAppSessionStatus =
  | (typeof WA_SESSION_STATUS)[keyof typeof WA_SESSION_STATUS]
  | undefined;

export type MappedAccountStatus = 'online' | 'offline' | 'error' | 'unknown';

/**
 * Map raw WA session status to simplified UI status.
 * @param sessionStatus - Raw WhatsApp session status from WA_SESSION_STATUS
 * @returns Simplified status: 'online' | 'offline' | 'error' | 'unknown'
 */
export const getMappedStatus = (
  sessionStatus: WhatsAppSessionStatus,
): MappedAccountStatus => {
  switch (sessionStatus) {
    case WA_SESSION_STATUS.CONNECTED: {
      return 'online';
    }
    case WA_SESSION_STATUS.DISCONNECTED: {
      return 'offline';
    }
    case WA_SESSION_STATUS.LOGGED_OUT: {
      return 'error';
    }
    default: {
      return 'unknown';
    }
  }
};
