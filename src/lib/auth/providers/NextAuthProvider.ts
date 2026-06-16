import localStorage from 'mobx-localstorage';
import type {
  AuthConfig,
  AuthProvider,
  AuthResult,
  AuthResultStatus,
} from '../../../@types/auth';
import { AuthFieldType, AuthProviderType } from '../../../@types/auth';
import {
  clearApiKey,
  getApiKey,
  initializeAuth,
} from '../../../whatsapp-automation/api/auth';
import { API_KEY_STORAGE_KEY } from '../../../whatsapp-automation/constants';

const debug = require('../../../preload-safe-debug')(
  'Ferdium:auth:NextAuthProvider',
);

export default class NextAuthProvider implements AuthProvider {
  name = 'nextauth';

  type = AuthProviderType.NEXTAUTH;

  private baseUrl: string;

  config: AuthConfig = {
    fields: [
      {
        id: 'email',
        type: AuthFieldType.EMAIL,
        label: '邮箱',
        placeholder: '请输入邮箱地址',
        required: true,
      },
      {
        id: 'password',
        type: AuthFieldType.PASSWORD,
        label: '密码',
        placeholder: '请输入密码',
        required: true,
      },
    ],
    showSignup: false,
    showForgotPassword: false,
    submitLabel: '进入拓客',
    extraLinks: [],
  };

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ?? process.env.WA_AKG_BASE ?? 'http://localhost:3000';
    debug(`NextAuthProvider initialized with baseUrl: ${this.baseUrl}`);
  }

  async authenticate(credentials: Record<string, string>): Promise<AuthResult> {
    const { email, password } = credentials;

    if (!email || !password) {
      return {
        success: false,
        status: 'invalid_credentials' as AuthResultStatus,
        error: 'Email and password are required',
      };
    }

    debug(
      'Starting NextAuth authentication via whatsapp-automation/api/auth...',
    );

    try {
      const apiKey = await initializeAuth({ email, password });

      if (apiKey) {
        // No need to store here — initializeAuth() already calls setApiKey()
        // which stores the raw value in window.localStorage correctly.
        // mobx-localstorage.setItem does JSON.stringify(toJS(value)), which
        // would double-quote the value and break X-API-Key authentication.
        debug('Authentication successful, API key ready');
        return {
          success: true,
          status: 'success' as AuthResultStatus,
          apiKey,
        };
      }

      debug('Authentication failed - no API key returned');
      return {
        success: false,
        status: 'invalid_credentials' as AuthResultStatus,
        error: 'Login failed. Please check your email and password.',
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const message =
        err.message ||
        'Network error: unable to connect to authentication server';
      debug('Authentication failed:', message);
      return {
        success: false,
        status: 'network_error' as AuthResultStatus,
        error: message,
      };
    }
  }

  async logout(): Promise<void> {
    clearApiKey();
    debug('Logged out, API key cleared');
  }

  getAuthHeader(): string | null {
    // WA-AKG uses X-API-Key header, not Bearer Authorization.
    // Return the raw key so callers can set the appropriate header.
    const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY) || getApiKey();
    if (!apiKey) return null;
    return apiKey;
  }

  isAuthenticated(): boolean {
    return !!(localStorage.getItem(API_KEY_STORAGE_KEY) || getApiKey());
  }
}
