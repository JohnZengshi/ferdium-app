import localStorage from 'mobx-localstorage';
import type { AuthConfig, AuthProvider, AuthResult, AuthResultStatus } from '../../../@types/auth';
import { AuthFieldType, AuthProviderType } from '../../../@types/auth';
import { initializeAuth, getApiKey } from '../../../whatsapp-automation/api/auth';

const debug = require('../../../preload-safe-debug')('Ferdium:auth:NextAuthProvider');

const API_KEY_STORAGE_KEY = 'whatsappAutomationApiKey';

export default class NextAuthProvider implements AuthProvider {
  name = 'nextauth';
  type = AuthProviderType.NEXTAUTH;
  private baseUrl: string;

  config: AuthConfig = {
    fields: [
      {
        id: 'email',
        type: AuthFieldType.EMAIL,
        label: 'Email',
        placeholder: 'Email address',
        required: true,
      },
      {
        id: 'password',
        type: AuthFieldType.PASSWORD,
        label: 'Password',
        placeholder: 'Password',
        required: true,
      },
    ],
    showSignup: false,
    showForgotPassword: false,
    submitLabel: 'Login with NextAuth',
    extraLinks: [],
  };

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.WA_AKG_BASE ?? 'http://localhost:3000';
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

    debug('Starting NextAuth authentication via whatsapp-automation/api/auth...');

    try {
      const apiKey = await initializeAuth({ email, password });

      if (apiKey) {
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
        debug('Authentication successful, API key stored');
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
        error: '登录失败，请检查邮箱和密码是否正确',
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const message = err.message || 'Network error: unable to connect to authentication server';
      debug('Authentication failed:', message);
      return {
        success: false,
        status: 'network_error' as AuthResultStatus,
        error: message,
      };
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    debug('Logged out, API key cleared');
  }

  getAuthHeader(): string | null {
    const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY) || getApiKey();
    if (!apiKey) return null;
    return `Bearer ${apiKey}`;
  }

  isAuthenticated(): boolean {
    return !!(localStorage.getItem(API_KEY_STORAGE_KEY) || getApiKey());
  }
}
