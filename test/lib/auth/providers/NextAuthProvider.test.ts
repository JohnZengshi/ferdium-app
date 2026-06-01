import type NextAuthProviderType from '../../../../src/lib/auth/providers/NextAuthProvider';

jest.mock('../../../../src/preload-safe-debug', () => {
  return jest.fn(() => jest.fn());
});

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
    },
  };
});

jest.mock('../../../../src/whatsapp-automation/api/auth', () => ({
  initializeAuth: jest.fn(),
  getApiKey: jest.fn(() => ''),
  setApiKey: jest.fn(),
  clearApiKey: jest.fn(),
}));

const NextAuthProvider =
  require('../../../../src/lib/auth/providers/NextAuthProvider').default;
const localStorage =
  require('mobx-localstorage').default ?? require('mobx-localstorage');
const {
  initializeAuth,
  getApiKey,
} = require('../../../../src/whatsapp-automation/api/auth');

describe('NextAuthProvider', () => {
  let provider: NextAuthProviderType;

  beforeEach(() => {
    provider = new NextAuthProvider('http://localhost:3000');
    jest.clearAllMocks();
    (initializeAuth as jest.Mock).mockReset();
    (getApiKey as jest.Mock).mockReturnValue('');
  });

  describe('metadata', () => {
    it('has correct name', () => {
      expect(provider.name).toBe('nextauth');
    });

    it('has correct type', () => {
      expect(provider.type).toBe('nextauth');
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

    it('does not show forgot password link', () => {
      expect(provider.config.showForgotPassword).toBe(false);
    });

    it('has correct submit label', () => {
      expect(provider.config.submitLabel).toBe('Login with NextAuth');
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

    it('returns error if authentication fails', async () => {
      (initializeAuth as jest.Mock).mockResolvedValue(null);

      const result = await provider.authenticate({
        email: 'test@test.com',
        password: 'wrong',
      });
      expect(result.success).toBe(false);
      expect(result.status).toBe('invalid_credentials');
    });

    it('returns apiKey on success', async () => {
      (initializeAuth as jest.Mock).mockResolvedValue('api-key-123');

      const result = await provider.authenticate({
        email: 'test@test.com',
        password: 'correct',
      });
      expect(result.success).toBe(true);
      expect(result.apiKey).toBe('api-key-123');
    });

    it('does not double-store apiKey in mobx-localstorage', async () => {
      (initializeAuth as jest.Mock).mockResolvedValue('api-key-123');

      await provider.authenticate({
        email: 'test@test.com',
        password: 'correct',
      });
      // initializeAuth() already stores the raw key via setApiKey().
      // The provider must NOT also write via mobx-localstorage, which
      // JSON.stringifies values and corrupts the header.
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('handles network errors gracefully', async () => {
      (initializeAuth as jest.Mock).mockRejectedValue(
        new Error('Network timeout'),
      );

      const result = await provider.authenticate({
        email: 'test@test.com',
        password: 'correct',
      });
      expect(result.success).toBe(false);
      expect(result.status).toBe('network_error');
      expect(result.error).toBe('Network timeout');
    });
  });

  describe('logout', () => {
    it('removes apiKey from localStorage', async () => {
      await provider.logout();
      const {
        clearApiKey,
      } = require('../../../../src/whatsapp-automation/api/auth');
      expect(clearApiKey).toHaveBeenCalled();
    });
  });

  describe('getAuthHeader', () => {
    it('returns null if not authenticated', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      (getApiKey as jest.Mock).mockReturnValue('');
      expect(provider.getAuthHeader()).toBeNull();
    });

    it('returns apiKey if authenticated via localStorage', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('api-key-123');
      expect(provider.getAuthHeader()).toBe('api-key-123');
    });

    it('returns apiKey if authenticated via getApiKey', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      (getApiKey as jest.Mock).mockReturnValue('fallback-key');
      expect(provider.getAuthHeader()).toBe('fallback-key');
    });
  });

  describe('isAuthenticated', () => {
    it('returns false if no apiKey', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      (getApiKey as jest.Mock).mockReturnValue('');
      expect(provider.isAuthenticated()).toBe(false);
    });

    it('returns true if apiKey exists in localStorage', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('api-key-123');
      expect(provider.isAuthenticated()).toBe(true);
    });

    it('returns true if apiKey exists via getApiKey', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      (getApiKey as jest.Mock).mockReturnValue('fallback-key');
      expect(provider.isAuthenticated()).toBe(true);
    });
  });
});
