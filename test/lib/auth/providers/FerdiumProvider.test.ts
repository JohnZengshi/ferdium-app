jest.mock('../../../../src/preload-safe-debug', () => {
  return jest.fn(() => jest.fn());
});

jest.mock('../../../../src/environment-remote', () => ({
  isDevMode: false,
  isMac: false,
  isWindows: false,
  isLinux: false,
  USE_LOCAL_API: false,
  USE_LIVE_API: true,
  API_VERSION: 'v1',
}));

jest.mock('mobx-localstorage', () => {
  const storage: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => storage[key] ?? null),
      setItem: jest.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete storage[key];
      }),
      clear: jest.fn(() => {
        for (const key of Object.keys(storage)) {
          delete storage[key];
        }
      }),
    },
    getItem: jest.fn((key: string) => storage[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      for (const key of Object.keys(storage)) {
        delete storage[key];
      }
    }),
  };
});

jest.mock('../../../../src/api/apiBase', () => ({
  __esModule: true,
  default: jest.fn(() => 'http://localhost:3000/v1'),
}));

jest.mock('../../../../src/api/utils/auth', () => ({
  sendAuthRequest: jest.fn(),
}));

jest.mock('../../../../src/helpers/password-helpers', () => ({
  hash: jest.fn((password: string) => Promise.resolve(`hashed-${password}`)),
}));

const FerdiumProviderModule = require('../../../../src/lib/auth/providers/FerdiumProvider');
const FerdiumProvider = FerdiumProviderModule.default ?? FerdiumProviderModule;
const { sendAuthRequest } = require('../../../../src/api/utils/auth');
const localStorageModule = require('mobx-localstorage');
const localStorageMock = localStorageModule.default ?? localStorageModule;

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    localStorage: {
      removeItem: jest.fn(),
    },
  };
}

describe('FerdiumProvider', () => {
  let provider: InstanceType<typeof FerdiumProvider>;

  beforeEach(() => {
    provider = new FerdiumProvider();
    jest.clearAllMocks();
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

    it('shows signup link', () => {
      expect(provider.config.showSignup).toBe(true);
    });

    it('shows forgot password link', () => {
      expect(provider.config.showForgotPassword).toBe(true);
    });

    it('has correct submit label', () => {
      expect(provider.config.submitLabel).toBe('Login');
    });
  });

  describe('authenticate', () => {
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

    it('returns error on invalid credentials', async () => {
      (sendAuthRequest as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await provider.authenticate({
        email: 'test@test.com',
        password: 'wrong',
      });
      expect(result.success).toBe(false);
      expect(result.status).toBe('invalid_credentials');
    });

    it('returns token on success', async () => {
      (sendAuthRequest as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      });

      const result = await provider.authenticate({
        email: 'test@test.com',
        password: 'correct',
      });
      expect(result.success).toBe(true);
      expect(result.token).toBe('test-token');
    });

    it('stores token in localStorage', async () => {
      (sendAuthRequest as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      });

      await provider.authenticate({
        email: 'test@test.com',
        password: 'correct',
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'authToken',
        'test-token',
      );
    });

    it('returns network error on exception', async () => {
      (sendAuthRequest as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      const result = await provider.authenticate({
        email: 'test@test.com',
        password: 'correct',
      });
      expect(result.success).toBe(false);
      expect(result.status).toBe('network_error');
    });
  });

  describe('logout', () => {
    it('removes token from localStorage', async () => {
      await provider.logout();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('getAuthHeader', () => {
    it('returns null if not authenticated', () => {
      (localStorageMock.getItem as jest.Mock).mockReturnValue(null);
      expect(provider.getAuthHeader()).toBeNull();
    });

    it('returns Bearer token if authenticated', () => {
      (localStorageMock.getItem as jest.Mock).mockReturnValue('test-token');
      expect(provider.getAuthHeader()).toBe('Bearer test-token');
    });
  });

  describe('isAuthenticated', () => {
    it('returns false if no token', () => {
      (localStorageMock.getItem as jest.Mock).mockReturnValue(null);
      expect(provider.isAuthenticated()).toBe(false);
    });

    it('returns true if token exists', () => {
      (localStorageMock.getItem as jest.Mock).mockReturnValue('test-token');
      expect(provider.isAuthenticated()).toBe(true);
    });
  });
});
