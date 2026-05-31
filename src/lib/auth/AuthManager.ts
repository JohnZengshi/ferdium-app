import localStorage from 'mobx-localstorage';
import type {
  AuthEvent,
  AuthEventType,
  AuthEventListener,
  AuthProvider,
  AuthResult,
  IAuthManager,
} from '../../@types/auth';
import { AuthResultStatus } from '../../@types/auth';

const debug = require('../../preload-safe-debug')('Ferdium:AuthManager');

const STORAGE_KEY = 'auth:activeProvider';

/**
 * Singleton Auth Manager
 * Manages authentication providers using the Strategy Pattern.
 * Stores active provider name in localStorage for persistence.
 */
export class AuthManager implements IAuthManager {
  private static instance: AuthManager | null = null;

  private providers = new Map<string, AuthProvider>();

  private eventListeners = new Map<AuthEventType, Set<AuthEventListener>>();

  private activeProviderName: string | null = null;

  private constructor() {
    this.restoreActiveProvider();
    debug('AuthManager initialized');
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  registerProvider(provider: AuthProvider): void {
    this.providers.set(provider.name, provider);
    debug(`Registered provider: ${provider.name}`);
    // Auto-restore active provider if it matches
    if (this.activeProviderName && !this.getActiveProvider()) {
      const storedName = localStorage.getItem(STORAGE_KEY);
      if (storedName && this.providers.has(storedName)) {
        this.activeProviderName = storedName;
        debug(`Restored active provider: ${storedName}`);
      }
    }
  }

  unregisterProvider(name: string): void {
    this.providers.delete(name);
    if (this.activeProviderName === name) {
      this.activeProviderName = null;
      localStorage.removeItem(STORAGE_KEY);
    }
    debug(`Unregistered provider: ${name}`);
  }

  setActiveProvider(name: string): void {
    const provider = this.providers.get(name);
    if (!provider) {
      debug(`Provider "${name}" not found, ignoring`);
      return;
    }
    const previousName = this.activeProviderName;
    this.activeProviderName = name;
    localStorage.setItem(STORAGE_KEY, name);
    debug(`Active provider changed: ${previousName} → ${name}`);
    this.emit({
      type: 'provider_changed' as AuthEventType,
      provider: name,
      data: { previous: previousName },
    });
  }

  getActiveProvider(): AuthProvider | null {
    if (!this.activeProviderName) return null;
    return this.providers.get(this.activeProviderName) ?? null;
  }

  getProviders(): AuthProvider[] {
    return Array.from(this.providers.values());
  }

  getProvider(name: string): AuthProvider | undefined {
    return this.providers.get(name);
  }

  async authenticate(credentials: Record<string, string>): Promise<AuthResult> {
    const provider = this.getActiveProvider();
    if (!provider) {
      return {
        success: false,
        status: 'unknown_error' as AuthResultStatus,
        error: 'No active auth provider. Call setActiveProvider() first.',
      };
    }
    this.emit({
      type: 'login_start' as AuthEventType,
      provider: provider.name,
      data: { email: credentials.email },
    });
    try {
      const result = await provider.authenticate(credentials);
      if (result.success) {
        this.emit({
          type: 'login_success' as AuthEventType,
          provider: provider.name,
        });
      } else {
        this.emit({
          type: 'login_failure' as AuthEventType,
          provider: provider.name,
          data: { error: result.error },
        });
      }
      return result;
    } catch (error) {
      this.emit({
        type: 'login_failure' as AuthEventType,
        provider: provider.name,
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      throw error;
    }
  }

  async logout(): Promise<void> {
    const provider = this.getActiveProvider();
    if (!provider) return;
    await provider.logout();
    this.emit({
      type: 'logout' as AuthEventType,
      provider: provider.name,
    });
  }

  getAuthHeader(): string | null {
    const provider = this.getActiveProvider();
    return provider?.getAuthHeader() ?? null;
  }

  isAuthenticated(): boolean {
    const provider = this.getActiveProvider();
    return provider?.isAuthenticated() ?? false;
  }

  on(event: AuthEventType, listener: AuthEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  off(event: AuthEventType, listener: AuthEventListener): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  getActiveProviderName(): string | null {
    return this.activeProviderName;
  }

  private restoreActiveProvider(): void {
    const storedName = localStorage.getItem(STORAGE_KEY);
    if (storedName) {
      this.activeProviderName = storedName;
      debug(`Restoring active provider from storage: ${storedName}`);
    }
  }

  private emit(event: AuthEvent): void {
    const listeners = this.eventListeners.get(event.type as AuthEventType);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          debug(`Event listener error for ${event.type}:`, error);
        }
      }
    }
  }
}

// Export singleton instance as default
const authManager = AuthManager.getInstance();
export default authManager;
