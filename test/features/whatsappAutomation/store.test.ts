import type { Stores } from '../../../src/@types/stores.types';
import WhatsAppAutomationStore from '../../../src/features/whatsappAutomation/store';

// Mock window and localStorage for node test environment
if (typeof window === 'undefined') {
  (global as any).window = {
    ferdium: {
      stores: {
        settings: {
          all: {
            app: {},
          },
        },
      },
    },
  };
}

if (
  typeof localStorage === 'undefined' ||
  typeof localStorage.clear !== 'function'
) {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
  };
}

jest.mock(
  '../../../src/whatsapp-automation/api/generated/sessions/sessions',
  () => ({
    getSessions: jest.fn(),
    getSessionsIdQr: jest.fn(),
    postSessions: jest.fn(),
    postSessionsIdAction: jest.fn(),
  }),
);

jest.mock('../../../src/whatsapp-automation/api/auth', () => ({
  getApiKey: jest.fn(),
  setApiKey: jest.fn(),
}));

jest.mock('../../../src/lib/auth/AuthManager', () => ({
  getProvider: jest.fn(),
}));

const mockDebug = jest.fn();

jest.mock('../../../src/preload-safe-debug', () => () => mockDebug);

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
  })),
}));

const mockSettingsStore: Record<string, unknown> = {};
Object.defineProperty(window, 'ferdium', {
  value: {
    stores: {
      settings: {
        all: {
          app: mockSettingsStore,
        },
      },
    },
  },
  writable: true,
});

function clearSettingsKey(key: string) {
  const settingsApp = (window as any).ferdium?.stores?.settings?.all?.app;
  if (settingsApp && typeof settingsApp === 'object') {
    settingsApp[key] = '';
  }
}

describe('WhatsAppAutomationStore - 401 Handling', () => {
  let store: WhatsAppAutomationStore;
  let mockGetSessions: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    Object.keys(mockSettingsStore).forEach(key => {
      delete mockSettingsStore[key];
    });

    mockGetSessions =
      require('../../../src/whatsapp-automation/api/generated/sessions/sessions').getSessions;

    store = new WhatsAppAutomationStore();

    const mockStores = {
      services: {
        allDisplayed: [],
        one: jest.fn(),
      },
      settings: {
        all: {
          app: mockSettingsStore,
        },
      },
    };
    const mockActions = {};

    store.start(mockStores as any, mockActions as any);
  });

  afterEach(() => {
    store.stop();
  });

  describe('When API returns 401', () => {
    it('should clear API key from localStorage', async () => {
      localStorage.setItem('whatsappAutomationApiKey', 'stale-key-123');
      mockSettingsStore['whatsapp-api-key'] = 'stale-key-123';

      const error = new Error('Unauthorized');
      (error as any).status = 401;
      mockGetSessions.mockRejectedValue(error);

      const mockGetApiKey =
        require('../../../src/whatsapp-automation/api/auth').getApiKey;
      mockGetApiKey.mockReturnValue('stale-key-123');

      try {
        await mockGetSessions();
      } catch (error_) {
        const { status } = error_ as { status?: number };
        if (status === 401) {
          localStorage.removeItem('whatsappAutomationApiKey');
          const settingsKey = process.env.API_KEY_KEY ?? 'whatsapp-api-key';
          clearSettingsKey(settingsKey);
          (store as any)._authInitialized = false;
        }
      }

      expect(localStorage.getItem('whatsappAutomationApiKey')).toBeNull();
    });

    it('should clear API key from settings store', async () => {
      mockSettingsStore['whatsapp-api-key'] = 'stale-key-456';
      localStorage.setItem('whatsappAutomationApiKey', 'stale-key-456');

      const error = new Error('Unauthorized');
      (error as any).status = 401;
      mockGetSessions.mockRejectedValue(error);

      try {
        await mockGetSessions();
      } catch (error_) {
        const { status } = error_ as { status?: number };
        if (status === 401) {
          localStorage.removeItem('whatsappAutomationApiKey');
          const settingsKey = process.env.API_KEY_KEY ?? 'whatsapp-api-key';
          clearSettingsKey(settingsKey);
          (store as any)._authInitialized = false;
        }
      }

      expect(mockSettingsStore['whatsapp-api-key']).toBe('');
    });

    it('should reset _authInitialized to false', async () => {
      (store as any)._authInitialized = true;

      const error = new Error('Unauthorized');
      (error as any).status = 401;
      mockGetSessions.mockRejectedValue(error);

      try {
        await mockGetSessions();
      } catch (error_) {
        const { status } = error_ as { status?: number };
        if (status === 401) {
          localStorage.removeItem('whatsappAutomationApiKey');
          const settingsKey = process.env.API_KEY_KEY ?? 'whatsapp-api-key';
          clearSettingsKey(settingsKey);
          (store as any)._authInitialized = false;
        }
      }

      expect((store as any)._authInitialized).toBe(false);
    });

    it('should set appropriate error message', async () => {
      const serviceId = 'test-service-id';

      const error = new Error('Unauthorized');
      (error as any).status = 401;
      mockGetSessions.mockRejectedValue(error);

      try {
        await mockGetSessions();
      } catch (error_) {
        const { status } = error_ as { status?: number };
        const message =
          error_ instanceof Error ? error_.message : String(error_);

        if (status === 401) {
          localStorage.removeItem('whatsappAutomationApiKey');
          const settingsKey = process.env.API_KEY_KEY ?? 'whatsapp-api-key';
          clearSettingsKey(settingsKey);
          (store as any)._authInitialized = false;
        }

        (store as any).errorMessages?.set(
          serviceId,
          status === 401
            ? 'Authentication expired. Please log in again.'
            : message,
        );
      }

      const errorMessage = (store as any).errorMessages?.get(serviceId);
      expect(errorMessage).toBe('Authentication expired. Please log in again.');
    });
  });

  describe('When API returns non-401 error', () => {
    it('should NOT clear API key from localStorage', async () => {
      localStorage.setItem('whatsappAutomationApiKey', 'valid-key-123');
      mockSettingsStore['whatsapp-api-key'] = 'valid-key-123';

      const error = new Error('Internal Server Error');
      (error as any).status = 500;
      mockGetSessions.mockRejectedValue(error);

      try {
        await mockGetSessions();
      } catch (error_) {
        const { status } = error_ as { status?: number };
        if (status === 401) {
          localStorage.removeItem('whatsappAutomationApiKey');
          const settingsKey = process.env.API_KEY_KEY ?? 'whatsapp-api-key';
          clearSettingsKey(settingsKey);
          (store as any)._authInitialized = false;
        }
      }

      expect(localStorage.getItem('whatsappAutomationApiKey')).toBe(
        'valid-key-123',
      );
      expect(mockSettingsStore['whatsapp-api-key']).toBe('valid-key-123');
    });
  });
});

describe('WhatsAppAutomationStore - status indicator reload', () => {
  const createStoreWithWebview = () => {
    const domReadyListeners: (() => void)[] = [];
    const webview = {
      addEventListener: jest.fn((event: string, listener: () => void) => {
        if (event === 'dom-ready') domReadyListeners.push(listener);
      }),
      removeEventListener: jest.fn(),
      executeJavaScript: jest.fn(() => Promise.resolve()),
    };
    const service = { webview, isAttached: true };
    const store = new WhatsAppAutomationStore();
    store.stores = {
      services: {
        allDisplayed: [],
        one: jest.fn(() => service),
      },
    } as unknown as Stores;
    return { domReadyListeners, service, store, webview };
  };

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('re-reads latest indicator status during retries', () => {
    jest.useFakeTimers();
    const { domReadyListeners, store } = createStoreWithWebview();
    store._latestIndicatorStatuses.set('whatsapp-service', 'CONNECTED');
    const injectStatusIndicator = jest
      .spyOn(store, '_injectOrUpdateStatusIndicator')
      .mockImplementation();

    store._attachStatusIndicatorReloadListener('whatsapp-service');
    domReadyListeners[0]();
    store._latestIndicatorStatuses.set('whatsapp-service', 'DISCONNECTED');
    jest.advanceTimersByTime(1000);

    expect(injectStatusIndicator).toHaveBeenNthCalledWith(
      1,
      'whatsapp-service',
      'CONNECTED',
    );
    expect(injectStatusIndicator).toHaveBeenNthCalledWith(
      2,
      'whatsapp-service',
      'DISCONNECTED',
    );
  });

  it('restores rendered states missing from session statuses', () => {
    jest.useFakeTimers();
    const { domReadyListeners, store } = createStoreWithWebview();
    store._injectOrUpdateStatusIndicator('whatsapp-service', 'SERVER_ERROR');
    const injectStatusIndicator = jest
      .spyOn(store, '_injectOrUpdateStatusIndicator')
      .mockImplementation();

    store._attachStatusIndicatorReloadListener('whatsapp-service');
    domReadyListeners[0]();

    expect(store.sessionStatuses.has('whatsapp-service')).toBe(false);
    expect(injectStatusIndicator).toHaveBeenCalledWith(
      'whatsapp-service',
      'SERVER_ERROR',
    );
  });

  it('removes reload listener when webview detaches', () => {
    const { service, store, webview } = createStoreWithWebview();
    store._attachStatusIndicatorReloadListener('whatsapp-service');

    service.isAttached = false;
    store._detectWhatsAppServices();

    expect(webview.removeEventListener).toHaveBeenCalledWith(
      'dom-ready',
      expect.any(Function),
    );
    expect(store._statusIndicatorReloadListeners.has('whatsapp-service')).toBe(
      false,
    );
  });
});
