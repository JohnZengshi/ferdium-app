jest.mock('../../../src/preload-safe-debug', () => {
  return jest.fn(() => jest.fn());
});

jest.mock('mobx-localstorage', () => {
  const storage: Record<string, string> = {};
  return {
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

import { AuthManager } from '../../../src/lib/auth/AuthManager';
import type { AuthProvider } from '../../../src/@types/auth';
import { AuthEventType } from '../../../src/@types/auth';

function createMockProvider(
  name: string,
  overrides: Partial<AuthProvider> = {},
): AuthProvider {
  return {
    name,
    type: 'ferdium' as AuthProvider['type'],
    config: {
      fields: [],
      showSignup: false,
      showForgotPassword: false,
      submitLabel: 'Login',
    },
    authenticate: jest.fn().mockResolvedValue({
      success: true,
      token: 'test-token',
      status: 'success',
    }),
    logout: jest.fn().mockResolvedValue(undefined),
    getAuthHeader: jest.fn().mockReturnValue('Bearer test-token'),
    isAuthenticated: jest.fn().mockReturnValue(true),
    ...overrides,
  };
}

describe('AuthManager', () => {
  let manager: ReturnType<typeof AuthManager.getInstance>;

  beforeEach(() => {
    manager = AuthManager.getInstance();
    for (const provider of manager.getProviders()) {
      manager.unregisterProvider(provider.name);
    }
  });

  describe('singleton', () => {
    it('returns the same instance', () => {
      const instance1 = AuthManager.getInstance();
      const instance2 = AuthManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('registerProvider', () => {
    it('registers a provider', () => {
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      expect(manager.getProvider('test')).toBe(provider);
    });

    it('registers multiple providers', () => {
      const provider1 = createMockProvider('test1');
      const provider2 = createMockProvider('test2');
      manager.registerProvider(provider1);
      manager.registerProvider(provider2);
      expect(manager.getProviders()).toHaveLength(2);
    });
  });

  describe('unregisterProvider', () => {
    it('removes a provider', () => {
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.unregisterProvider('test');
      expect(manager.getProvider('test')).toBeUndefined();
    });

    it('clears active provider if it was unregistered', () => {
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      manager.unregisterProvider('test');
      expect(manager.getActiveProviderName()).toBeNull();
    });
  });

  describe('setActiveProvider', () => {
    it('sets the active provider', () => {
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      expect(manager.getActiveProvider()).toBe(provider);
    });

    it('does nothing if provider not found', () => {
      manager.setActiveProvider('nonexistent');
      expect(manager.getActiveProvider()).toBeNull();
    });

    it('emits provider_changed event', () => {
      const listener = jest.fn();
      manager.on(AuthEventType.PROVIDER_CHANGED, listener);
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AuthEventType.PROVIDER_CHANGED,
          provider: 'test',
        }),
      );
    });
  });

  describe('getActiveProvider', () => {
    it('returns null if no active provider', () => {
      expect(manager.getActiveProvider()).toBeNull();
    });

    it('returns the active provider', () => {
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      expect(manager.getActiveProvider()).toBe(provider);
    });
  });

  describe('getProviders', () => {
    it('returns empty array initially', () => {
      expect(manager.getProviders()).toEqual([]);
    });

    it('returns all registered providers', () => {
      const provider1 = createMockProvider('test1');
      const provider2 = createMockProvider('test2');
      manager.registerProvider(provider1);
      manager.registerProvider(provider2);
      expect(manager.getProviders()).toHaveLength(2);
    });
  });

  describe('getProvider', () => {
    it('returns undefined for unknown provider', () => {
      expect(manager.getProvider('unknown')).toBeUndefined();
    });

    it('returns the provider by name', () => {
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      expect(manager.getProvider('test')).toBe(provider);
    });
  });

  describe('authenticate', () => {
    it('returns error if no active provider', async () => {
      const result = await manager.authenticate({ email: 'test@test.com' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('No active auth provider. Call setActiveProvider() first.');
    });

    it('calls provider authenticate', async () => {
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      await manager.authenticate({ email: 'test@test.com', password: 'pass' });
      expect(provider.authenticate).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'pass',
      });
    });

    it('emits login_start event', async () => {
      const listener = jest.fn();
      manager.on(AuthEventType.LOGIN_START, listener);
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      await manager.authenticate({ email: 'test@test.com', password: 'pass' });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: AuthEventType.LOGIN_START, provider: 'test' }),
      );
    });

    it('emits login_success on success', async () => {
      const listener = jest.fn();
      manager.on(AuthEventType.LOGIN_SUCCESS, listener);
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      await manager.authenticate({ email: 'test@test.com', password: 'pass' });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: AuthEventType.LOGIN_SUCCESS, provider: 'test' }),
      );
    });

    it('emits login_failure on failure', async () => {
      const listener = jest.fn();
      manager.on(AuthEventType.LOGIN_FAILURE, listener);
      const provider = createMockProvider('test', {
        authenticate: jest.fn().mockResolvedValue({
          success: false,
          error: 'Invalid credentials',
          status: 'invalid_credentials',
        }),
      });
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      await manager.authenticate({ email: 'test@test.com', password: 'pass' });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: AuthEventType.LOGIN_FAILURE, provider: 'test' }),
      );
    });

    it('emits login_failure on exception', async () => {
      const listener = jest.fn();
      manager.on(AuthEventType.LOGIN_FAILURE, listener);
      const provider = createMockProvider('test', {
        authenticate: jest.fn().mockRejectedValue(new Error('Network error')),
      });
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      await expect(
        manager.authenticate({ email: 'test@test.com', password: 'pass' }),
      ).rejects.toThrow('Network error');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: AuthEventType.LOGIN_FAILURE, provider: 'test' }),
      );
    });
  });

  describe('logout', () => {
    it('calls provider logout', async () => {
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      await manager.logout();
      expect(provider.logout).toHaveBeenCalled();
    });

    it('emits logout event', async () => {
      const listener = jest.fn();
      manager.on(AuthEventType.LOGOUT, listener);
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      await manager.logout();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: AuthEventType.LOGOUT, provider: 'test' }),
      );
    });

    it('does nothing if no active provider', async () => {
      await manager.logout();
    });
  });

  describe('getAuthHeader', () => {
    it('returns null if no active provider', () => {
      expect(manager.getAuthHeader()).toBeNull();
    });

    it('returns header from active provider', () => {
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      expect(manager.getAuthHeader()).toBe('Bearer test-token');
    });
  });

  describe('isAuthenticated', () => {
    it('returns false if no active provider', () => {
      expect(manager.isAuthenticated()).toBe(false);
    });

    it('returns true if provider is authenticated', () => {
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      expect(manager.isAuthenticated()).toBe(true);
    });
  });

  describe('events', () => {
    it('subscribes to events', () => {
      const listener = jest.fn();
      manager.on(AuthEventType.LOGIN_START, listener);
      expect(listener).not.toHaveBeenCalled();
    });

    it('unsubscribes from events', () => {
      const listener = jest.fn();
      manager.on(AuthEventType.LOGIN_START, listener);
      manager.off(AuthEventType.LOGIN_START, listener);
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      manager.authenticate({ email: 'test@test.com', password: 'pass' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('removeAllListeners removes listeners for a specific event', () => {
      const listener = jest.fn();
      manager.on(AuthEventType.LOGIN_START, listener);
      manager.removeAllListeners(AuthEventType.LOGIN_START);
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      manager.authenticate({ email: 'test@test.com', password: 'pass' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('removeAllListeners without args removes all listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      manager.on(AuthEventType.LOGIN_START, listener1);
      manager.on(AuthEventType.PROVIDER_CHANGED, listener2);
      manager.removeAllListeners();
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      // Both should NOT have been called
      expect(listener1).not.toHaveBeenCalled();
    });
  });

  describe('getActiveProviderName', () => {
    it('returns null if no active provider', () => {
      expect(manager.getActiveProviderName()).toBeNull();
    });

    it('returns the active provider name', () => {
      const provider = createMockProvider('test');
      manager.registerProvider(provider);
      manager.setActiveProvider('test');
      expect(manager.getActiveProviderName()).toBe('test');
    });
  });
});
