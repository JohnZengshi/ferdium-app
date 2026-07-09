import mobxLocalStorage from 'mobx-localstorage';
import type FerdiumProviderType from '../../../../src/lib/auth/providers/FerdiumProvider';

jest.mock('electron', () => ({
  ipcRenderer: { send: jest.fn() },
  app: {
    getVersion: jest.fn(() => '0.0.0-test'),
    getLocale: jest.fn(() => 'en-US'),
    getPath: jest.fn(() => '/tmp/ferdium-test'),
    setPath: jest.fn(),
    getAppPath: jest.fn(() => '/tmp/ferdium-test'),
    getName: jest.fn(() => 'FerdiumTest'),
    name: 'FerdiumTest',
    isPackaged: false,
  },
}));

const wlStore: Record<string, string> = {};
const wlMock = new Proxy({} as any, {
  get(_t, prop) {
    if (prop === 'getItem') return (k: string) => wlStore[k] ?? null;
    if (prop === 'setItem')
      return (k: string, v: string) => {
        wlStore[k] = v;
      };
    if (prop === 'removeItem')
      return (k: string) => {
        delete wlStore[k];
      };
    if (prop === 'clear')
      return () => {
        Object.keys(wlStore).forEach(k => delete wlStore[k]);
      };
    if (prop === 'length') return Object.keys(wlStore).length;
    if (prop === 'key') return (i: number) => Object.keys(wlStore)[i] ?? null;
    return wlStore[prop as string] ?? null;
  },
  set(_t, prop, value) {
    wlStore[prop as string] = value;
    return true;
  },
  has(_t, prop) {
    return prop in wlStore;
  },
  deleteProperty(_t, prop) {
    delete wlStore[prop as string];
    return true;
  },
  ownKeys() {
    return Object.keys(wlStore);
  },
  getOwnPropertyDescriptor(_t, prop) {
    return prop in wlStore
      ? {
          enumerable: true,
          configurable: true,
          value: wlStore[prop as string],
          writable: true,
        }
      : undefined;
  },
});

if (typeof window === 'undefined') {
  (global as any).window = { localStorage: wlMock };
} else {
  (window as any).localStorage = wlMock;
}

jest.mock('../../../../src/preload-safe-debug', () => jest.fn(() => jest.fn()));

const mockMobxStorage: Record<string, string> = {};
jest.mock('mobx-localstorage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) => mockMobxStorage[k] ?? null),
    setItem: jest.fn((k: string, v: string) => {
      mockMobxStorage[k] = v;
    }),
    removeItem: jest.fn((k: string) => {
      delete mockMobxStorage[k];
    }),
  },
}));

jest.mock('../../../../src/whatsapp-automation/profileStorage', () => ({
  __esModule: true,
  switchLocalStorageProfile: jest.fn(),
}));

const mockHash = jest.fn(async (pw: string) => `hashed:${pw}`);
jest.mock('../../../../src/helpers/password-helpers', () => ({
  __esModule: true,
  hash: mockHash,
}));

const mockSendAuthRequest = jest.fn();
jest.mock('../../../../src/api/utils/auth', () => ({
  __esModule: true,
  sendAuthRequest: mockSendAuthRequest,
}));

const { ipcRenderer } = require('electron');
const FerdiumProvider =
  require('../../../../src/lib/auth/providers/FerdiumProvider').default;
const {
  switchLocalStorageProfile,
} = require('../../../../src/whatsapp-automation/profileStorage');

const WA_USER_EMAIL_STORAGE_KEY = 'whatsappAutomationUserEmail';
const API_KEY_STORAGE_KEY = 'whatsappAutomationApiKey';

const mockReloadFsSettings = jest.fn();
const mockSetProfileEmail = jest.fn();
const mockUserStore = { setProfileEmail: mockSetProfileEmail };
const mockSettingsStore = { reloadFileSystemSettings: mockReloadFsSettings };

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockMobxStorage).forEach(k => delete mockMobxStorage[k]);
  (window as any).ferdium = undefined;
  delete process.env.FERDIUM_SERVER;
  delete process.env.USE_AGENT_FLOW_AUTH;
  if (window.localStorage) {
    window.localStorage.clear();
  }
  Object.keys(wlStore).forEach(k => delete wlStore[k]);
});

function setFerdiumStores(): void {
  (window as any).ferdium = {
    stores: { user: mockUserStore, settings: mockSettingsStore },
  };
}

let originalFetch: typeof global.fetch | undefined;

beforeAll(() => {
  originalFetch = global.fetch;
});

afterAll(() => {
  if (originalFetch) {
    global.fetch = originalFetch;
  }
});

describe('FerdiumProvider', () => {
  let provider: FerdiumProviderType;

  beforeEach(() => {
    provider = new FerdiumProvider();
  });

  describe('metadata', () => {
    it('has correct name', () => {
      expect(provider.name).toBe('ferdium');
    });

    it('has correct type', () => {
      expect(provider.type).toBe('ferdium');
    });
  });

  describe('config', () => {
    it('has email and password fields', () => {
      expect(provider.config.fields).toHaveLength(2);
      expect(provider.config.fields[0].id).toBe('email');
      expect(provider.config.fields[1].id).toBe('password');
    });

    it('does not show signup link', () => {
      expect(provider.config.showSignup).toBe(false);
    });

    it('has correct submit label', () => {
      expect(provider.config.submitLabel).toBe('Sign In');
    });
  });

  describe('authenticateCloud', () => {
    beforeEach(() => {
      process.env.USE_AGENT_FLOW_AUTH = 'true';
    });

    it('returns error if username is missing', async () => {
      const result = await provider.authenticate({ password: 'pass' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Username and password are required');
    });

    it('returns error if password is missing', async () => {
      const result = await provider.authenticate({ email: 'user' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Username and password are required');
    });

    it('returns 401 error for invalid credentials', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
      const result = await provider.authenticate({
        email: 'bad',
        password: 'creds',
      });
      expect(result.success).toBe(false);
      expect(result.status).toBe('invalid_credentials');
      expect(result.error).toBe('用户名或密码错误');
    });

    it('handles network errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'));
      const result = await provider.authenticate({ email: 'u', password: 'p' });
      expect(result.success).toBe(false);
      expect(result.status).toBe('network_error');
      expect(result.error).toBe('Network timeout');
    });

    describe('on success', () => {
      beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ access_token: 'tok-123', user_id: 'u1' }),
        });
      });

      it('stores agentFlowToken in localStorage and window.localStorage', async () => {
        await provider.authenticate({ email: 'user@a.com', password: 'p' });
        expect(mockMobxStorage.agentFlowToken).toBe('tok-123');
        expect(window.localStorage.getItem('agentFlowToken')).toBe('tok-123');
      });

      it('stores akg_api_key when returned', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            access_token: 'tok-123',
            akg_api_key: 'key-abc',
            user_id: 'u1',
          }),
        });
        await provider.authenticate({ email: 'user@a.com', password: 'p' });
        expect(mockMobxStorage[API_KEY_STORAGE_KEY]).toBe('key-abc');
        expect(window.localStorage.getItem(API_KEY_STORAGE_KEY)).toBe(
          'key-abc',
        );
      });

      it('calls switchLocalStorageProfile with username', async () => {
        setFerdiumStores();
        await provider.authenticate({ email: 'user@a.com', password: 'p' });
        expect(switchLocalStorageProfile).toHaveBeenCalledWith('user@a.com');
      });

      it('sets WA_USER_EMAIL_STORAGE_KEY in localStorage', async () => {
        await provider.authenticate({ email: 'user@a.com', password: 'p' });
        expect(mockMobxStorage[WA_USER_EMAIL_STORAGE_KEY]).toBe('user@a.com');
      });

      it('sets profileEmail on userStore', async () => {
        setFerdiumStores();
        await provider.authenticate({ email: 'user@a.com', password: 'p' });
        expect(mockSetProfileEmail).toHaveBeenCalledWith('user@a.com');
      });

      it('reloads filesystem settings after setting profile email', async () => {
        setFerdiumStores();
        await provider.authenticate({ email: 'user@a.com', password: 'p' });
        expect(mockReloadFsSettings).toHaveBeenCalledTimes(1);
      });

      it('reloads settings after userStore.setProfileEmail', async () => {
        setFerdiumStores();
        await provider.authenticate({ email: 'user@a.com', password: 'p' });
        const setEmailCall = mockSetProfileEmail.mock.invocationCallOrder[0];
        const reloadCall = mockReloadFsSettings.mock.invocationCallOrder[0];
        expect(setEmailCall).toBeLessThan(reloadCall);
      });

      it('does not fail when ferdium stores are not available', async () => {
        (window as any).ferdium = undefined;
        await expect(
          provider.authenticate({ email: 'user@a.com', password: 'p' }),
        ).resolves.toBeDefined();
      });

      it('sends startLocalServer when FERDIUM_SERVER=local', async () => {
        process.env.FERDIUM_SERVER = 'local';
        await provider.authenticate({ email: 'user@a.com', password: 'p' });
        expect(ipcRenderer.send).toHaveBeenCalledWith('startLocalServer', {
          profileEmail: 'user@a.com',
        });
      });
    });
  });

  describe('authenticateLocal', () => {
    it('returns error if email is missing', async () => {
      const result = await provider.authenticate({ password: 'pass' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });

    it('returns error if password is missing', async () => {
      const result = await provider.authenticate({ email: 'test@test.com' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });

    it('returns invalid_credentials on 401', async () => {
      mockSendAuthRequest.mockResolvedValue({ ok: false, status: 401 });
      const result = await provider.authenticate({
        email: 't@t.com',
        password: 'wrong',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('returns error on network failure', async () => {
      mockSendAuthRequest.mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await provider.authenticate({
        email: 't@t.com',
        password: 'p',
      });
      expect(result.success).toBe(false);
      expect(result.status).toBe('network_error');
    });

    it('hashes password and sends Basic auth', async () => {
      mockSendAuthRequest.mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'tok-456' }),
      });
      await provider.authenticate({ email: 't@t.com', password: 'my-pw' });
      expect(mockHash).toHaveBeenCalledWith('my-pw');
    });

    it('stores authToken on success', async () => {
      mockSendAuthRequest.mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'tok-local' }),
      });
      await provider.authenticate({ email: 't@t.com', password: 'p' });
      expect(mockMobxStorage.authToken).toBe('tok-local');
    });

    it('stores akg_api_key when returned', async () => {
      mockSendAuthRequest.mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'tok-local', akg_api_key: 'key-local' }),
      });
      await provider.authenticate({ email: 't@t.com', password: 'p' });
      expect(mockMobxStorage[API_KEY_STORAGE_KEY]).toBe('key-local');
    });
  });

  describe('logout', () => {
    it('removes authToken and API key from mobx-localstorage', async () => {
      mockMobxStorage.authToken = 'tok';
      mockMobxStorage[API_KEY_STORAGE_KEY] = 'key';
      await provider.logout();
      expect(mobxLocalStorage.getItem('authToken')).toBeNull();
      expect(mobxLocalStorage.getItem(API_KEY_STORAGE_KEY)).toBeNull();
    });

    it('removes authToken and API key from window.localStorage', async () => {
      window.localStorage.setItem('authToken', 'tok');
      window.localStorage.setItem(API_KEY_STORAGE_KEY, 'key');
      await provider.logout();
      expect(window.localStorage.getItem('authToken')).toBeNull();
      expect(window.localStorage.getItem(API_KEY_STORAGE_KEY)).toBeNull();
    });
  });

  describe('getAuthHeader', () => {
    it('returns null when no token stored (cloud mode)', () => {
      process.env.USE_AGENT_FLOW_AUTH = 'true';
      expect(provider.getAuthHeader()).toBeNull();
    });

    it('returns Bearer agentFlowToken in cloud mode', () => {
      process.env.USE_AGENT_FLOW_AUTH = 'true';
      mockMobxStorage.agentFlowToken = 'cloud-tok';
      expect(provider.getAuthHeader()).toBe('Bearer cloud-tok');
    });

    it('returns Bearer authToken in local mode', () => {
      delete process.env.USE_AGENT_FLOW_AUTH;
      mockMobxStorage.authToken = 'local-tok';
      expect(provider.getAuthHeader()).toBe('Bearer local-tok');
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when not authenticated (cloud mode)', () => {
      process.env.USE_AGENT_FLOW_AUTH = 'true';
      expect(provider.isAuthenticated()).toBe(false);
    });

    it('returns true when agentFlowToken + API key exist (cloud mode)', () => {
      process.env.USE_AGENT_FLOW_AUTH = 'true';
      mockMobxStorage.agentFlowToken = 'tok';
      mockMobxStorage[API_KEY_STORAGE_KEY] = 'key';
      expect(provider.isAuthenticated()).toBe(true);
    });

    it('returns false when authenticated without API key (cloud mode)', () => {
      process.env.USE_AGENT_FLOW_AUTH = 'true';
      mockMobxStorage.agentFlowToken = 'tok';
      expect(provider.isAuthenticated()).toBe(false);
    });

    it('returns true when authToken exists (local mode)', () => {
      delete process.env.USE_AGENT_FLOW_AUTH;
      mockMobxStorage.authToken = 'tok';
      expect(provider.isAuthenticated()).toBe(true);
    });

    it('returns false when no token (local mode)', () => {
      delete process.env.USE_AGENT_FLOW_AUTH;
      expect(provider.isAuthenticated()).toBe(false);
    });
  });
});
