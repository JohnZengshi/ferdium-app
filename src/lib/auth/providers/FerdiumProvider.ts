import localStorage from 'mobx-localstorage';
import type {
  AuthConfig,
  AuthProvider,
  AuthResult,
  AuthResultStatus,
} from '../../../@types/auth';
import { AuthFieldType, AuthProviderType } from '../../../@types/auth';
import apiBase from '../../../api/apiBase';
import { sendAuthRequest } from '../../../api/utils/auth';
import { hash } from '../../../helpers/password-helpers';

const debug = require('../../../preload-safe-debug')(
  'Ferdium:auth:FerdiumProvider',
);

/**
 * Ferdium JWT Authentication Provider
 * Authenticates via the Ferdium API server using email + password.
 * Stores JWT token in localStorage under 'authToken'.
 */
export default class FerdiumProvider implements AuthProvider {
  name = 'ferdium';

  type = AuthProviderType.FERDIUM;

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
    showSignup: true,
    showForgotPassword: true,
    submitLabel: '登录',
    extraLinks: [],
    headerText: 'AI Chat 拓客销售系统',
  };

  async authenticate(credentials: Record<string, string>): Promise<AuthResult> {
    const { email, password } = credentials;

    if (!email || !password) {
      return {
        success: false,
        status: 'invalid_credentials' as AuthResultStatus,
        error: 'Email and password are required',
      };
    }

    debug('Authenticating with Ferdium server...');
    try {
      const hashedPassword = await hash(password);
      const authHeader = `Basic ${btoa(`${email}:${hashedPassword}`)}`;

      const response = await sendAuthRequest(`${apiBase()}/auth/login`, {
        method: 'POST',
        headers: { Authorization: authHeader },
        body: {},
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          localStorage.setItem('authToken', data.token);
          debug('Authentication successful');
          return {
            success: true,
            status: 'success' as AuthResultStatus,
            token: data.token,
          };
        }
      }

      debug('No token received from server');
      return {
        success: false,
        status: 'invalid_credentials' as AuthResultStatus,
        error: 'Invalid credentials',
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      debug('Authentication failed:', err.message);

      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        return {
          success: false,
          status: 'invalid_credentials' as AuthResultStatus,
          error: 'Invalid email or password',
        };
      }

      return {
        success: false,
        status: 'network_error' as AuthResultStatus,
        error: err.message,
      };
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('authToken');
    window.localStorage.removeItem('authToken');
    debug('Logged out, authToken removed');
  }

  getAuthHeader(): string | null {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    return `Bearer ${token}`;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }
}
