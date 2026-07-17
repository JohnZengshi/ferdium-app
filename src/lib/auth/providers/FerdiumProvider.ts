import { ipcRenderer } from 'electron';
import localStorage from 'mobx-localstorage';
import type {
  AuthConfig,
  AuthProvider,
  AuthResult,
  AuthResultStatus,
} from '../../../@types/auth';
import { AuthFieldType, AuthProviderType } from '../../../@types/auth';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../../../agent-flow-cs/api/auth';
import apiBase from '../../../api/apiBase';
import { sendAuthRequest } from '../../../api/utils/auth';
import { hash } from '../../../helpers/password-helpers';
import {
  API_KEY_STORAGE_KEY,
  WA_USER_EMAIL_STORAGE_KEY,
} from '../../../whatsapp-automation/constants';
import { switchLocalStorageProfile } from '../../../whatsapp-automation/profileStorage';

const debug = require('../../../preload-safe-debug')(
  'Ferdium:auth:FerdiumProvider',
);

// 使用 AGENT_FLOW_CS_BASE 作为认证后端（云端模式）
const AGENT_FLOW_CS_BASE =
  process.env.AGENT_FLOW_CS_BASE ?? 'http://10.0.0.228:8000';

// 新增：独立的认证模式控制（不依赖 FERDIUM_SERVER）
// 如果设置了 USE_AGENT_FLOW_AUTH=true，强制使用 Agent Flow CS 认证
const USE_AGENT_FLOW_AUTH = (): boolean =>
  process.env.USE_AGENT_FLOW_AUTH === 'true';

/**
 * Ferdium JWT Authentication Provider (双模式支持)
 *
 * 1. Agent Flow CS 模式 (USE_AGENT_FLOW_AUTH=true):
 *    - 使用 Agent Flow CS 的 POST /api/v1/auth/login
 *    - 参数: username + password
 *    - 响应: access_token + akg_api_key
 *
 * 2. 本地模式 (USE_AGENT_FLOW_AUTH=false 或未设置):
 *    - 使用原有 Ferdium 内部服务器认证
 *    - 参数: email + password (哈希)
 *    - 响应: token
 */
export default class FerdiumProvider implements AuthProvider {
  name = 'ferdium';

  type = AuthProviderType.FERDIUM;

  /**
   * 判断是否使用 Agent Flow CS 认证
   */
  private get isCloudMode(): boolean {
    return USE_AGENT_FLOW_AUTH();
  }

  /**
   * 动态配置：根据模式调整字段
   */
  get config(): AuthConfig {
    // 统一使用 email 字段（实际作为用户名），在 authenticate 时做映射
    return {
      fields: [
        {
          id: 'email',
          type: AuthFieldType.TEXT, // ✅ 改为 TEXT 类型，去掉邮箱校验
          label: '用户名',
          placeholder: '请输入用户名',
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
      showSignup: false, // ✅ 隐藏注册链接
      showForgotPassword: false, // ✅ 隐藏忘记密码链接
      submitLabel: 'Sign In',
      extraLinks: [],
      headerText: 'Sign In',
    };
  }

  async authenticate(credentials: Record<string, string>): Promise<AuthResult> {
    debug('isCloudMode:', this.isCloudMode);
    debug('credentials:', credentials);

    if (this.isCloudMode) {
      return this.authenticateCloud(credentials);
    }
    return this.authenticateLocal(credentials);
  }

  /**
   * Agent Flow CS 模式认证：Agent Flow CS API
   * 将 email 字段映射为 username
   */
  private async authenticateCloud(
    credentials: Record<string, string>,
  ): Promise<AuthResult> {
    const { email, password } = credentials;
    const username = email;

    if (!username || !password) {
      return {
        success: false,
        status: 'invalid_credentials' as AuthResultStatus,
        error: 'Username and password are required',
      };
    }

    debug('Agent Flow CS mode: Authenticating with username:', username);

    try {
      const response = await fetch(`${AGENT_FLOW_CS_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.access_token) {
          debug('Authentication successful, user_id:', data.user_id);

          // 正常登录流程（不在登录时处理重启，统一在退出时重启）
          switchLocalStorageProfile(username);
          localStorage.setItem(WA_USER_EMAIL_STORAGE_KEY, username);

          // 同步更新 UserStore 中的用户邮箱，确保 UI 显示正确
          const userStore = (window as any).ferdium?.stores?.user;
          if (userStore?.setProfileEmail) {
            userStore.setProfileEmail(username);
          }

          // 刷新文件系统 settings 缓存（darkMode 等仅存于文件系统，不从服务器同步）
          (
            window as any
          ).ferdium?.stores?.settings?.reloadFileSystemSettings?.();

          if (data.akg_api_key) {
            localStorage.setItem(API_KEY_STORAGE_KEY, data.akg_api_key);
            window.localStorage.setItem(API_KEY_STORAGE_KEY, data.akg_api_key);

            debug('AKG API Key stored from login response');
          } else {
            debug('No akg_api_key in login response');
          }

          setAccessToken(data.access_token);

          if (process.env.FERDIUM_SERVER === 'local') {
            ipcRenderer.send('startLocalServer', { profileEmail: username });

            setTimeout(async () => {
              try {
                const response = await sendAuthRequest(`${apiBase()}/me`, {
                  method: 'PUT',
                  body: JSON.stringify({
                    firstname: username,
                    lastname: '',
                    email: username,
                  }),
                });
                if (!response.ok) {
                  debug(
                    'Failed to update internal user info: %O',
                    response.status,
                  );
                }
              } catch (error) {
                debug('Failed to update internal user info: %O', error);
              }
            }, 1500);
          }

          return {
            success: true,
            status: 'success' as AuthResultStatus,
            token: data.access_token,
            apiKey: data.akg_api_key,
          };
        }
      }

      if (response.status === 401) {
        debug('Invalid credentials (401)');
        return {
          success: false,
          status: 'invalid_credentials' as AuthResultStatus,
          error: '用户名或密码错误',
        };
      }

      debug('Authentication failed with status:', response.status);
      return {
        success: false,
        status: 'invalid_credentials' as AuthResultStatus,
        error: 'Authentication failed',
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      debug('Authentication failed:', err.message);

      return {
        success: false,
        status: 'network_error' as AuthResultStatus,
        error: err.message,
      };
    }
  }

  /**
   * 本地模式认证：Ferdium 内部服务器
   */
  private async authenticateLocal(
    credentials: Record<string, string>,
  ): Promise<AuthResult> {
    const { email, password } = credentials;

    if (!email || !password) {
      return {
        success: false,
        status: 'invalid_credentials' as AuthResultStatus,
        error: 'Email and password are required',
      };
    }

    debug('Local mode: Authenticating with Ferdium internal server...');
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

          // 本地模式也检查是否返回了 akg_api_key
          if (data.akg_api_key) {
            localStorage.setItem(API_KEY_STORAGE_KEY, data.akg_api_key);
            debug('AKG API Key stored from login response');
          }

          return {
            success: true,
            status: 'success' as AuthResultStatus,
            token: data.token,
            apiKey: data.akg_api_key,
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
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    clearAccessToken();
    debug('Logged out, authToken and AKG API Key removed');
  }

  getAuthHeader(): string | null {
    if (USE_AGENT_FLOW_AUTH()) {
      // Agent Flow 模式：使用 agentFlowToken
      const token = getAccessToken();
      if (!token) return null;
      return `Bearer ${token}`;
    }

    // 其他模式：使用 authToken (Local Server JWT)
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    return `Bearer ${token}`;
  }

  isAuthenticated(): boolean {
    if (USE_AGENT_FLOW_AUTH()) {
      // Agent Flow 模式：检查 agentFlowToken 和 API_KEY
      return !!(getAccessToken() && localStorage.getItem(API_KEY_STORAGE_KEY));
    }

    // 其他模式：检查 authToken
    return !!localStorage.getItem('authToken');
  }
}
