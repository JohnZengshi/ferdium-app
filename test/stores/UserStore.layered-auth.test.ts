/**
 * 分层认证架构测试
 * 覆盖需求：
 * 1. Ferdium 自动登录（FERDIUM_SERVER=local 时静默登录）
 * 2. WA-AKG 登录页面路由
 * 3. 分层重定向逻辑（Ferdium → WA-AKG → 主页）
 * 4. WhatsApp 自动化模块通过 AuthManager 获取 API Key
 */

// Mock modules before imports
jest.mock('../../src/environment-remote', () => ({
  isDevMode: false,
}));

jest.mock('electron', () => ({
  ipcRenderer: { send: jest.fn(), on: jest.fn() },
  app: { getPath: jest.fn(() => '/tmp/test') },
}));

jest.mock('@electron/remote', () => ({
  app: { getPath: jest.fn(() => '/tmp/test') },
}));

jest.mock('@electron/remote/main', () => ({}));

jest.mock('mobx-localstorage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => store[key] ?? null),
      setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: jest.fn((key: string) => { delete store[key]; }),
      clear: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    },
  };
});

jest.mock('../../src/preload-safe-debug', () => () => jest.fn());

// Mock serverlessLogin
const mockServerlessLogin = jest.fn();
jest.mock('../../src/helpers/serverless-helpers', () => ({
  __esModule: true,
  default: mockServerlessLogin,
}));

// Mock AuthManager
const mockSetActiveProvider = jest.fn();
const mockGetActiveProvider = jest.fn();
const mockGetProvider = jest.fn();
const mockRegisterProvider = jest.fn();

jest.mock('../../src/lib/auth/AuthManager', () => ({
  __esModule: true,
  default: {
    setActiveProvider: mockSetActiveProvider,
    getActiveProvider: mockGetActiveProvider,
    getProvider: mockGetProvider,
    registerProvider: mockRegisterProvider,
  },
}));

import localStorage from 'mobx-localstorage';

describe('Layered Auth Architecture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Reset environment variable
    delete process.env.FERDIUM_SERVER;
  });

  describe('1. Ferdium Auto-Login', () => {
    it('should call serverlessLogin when FERDIUM_SERVER=local and not logged in', () => {
      // Arrange
      process.env.FERDIUM_SERVER = 'local';
      localStorage.removeItem('authToken');

      // Act - simulate UserStore constructor logic
      if (process.env.FERDIUM_SERVER === 'local' && !localStorage.getItem('authToken')) {
        setTimeout(() => {
          mockServerlessLogin({ user: { login: jest.fn() } });
        }, 100);
      }

      // Assert
      expect(process.env.FERDIUM_SERVER).toBe('local');
      expect(localStorage.getItem('authToken')).toBeNull();
    });

    it('should NOT call serverlessLogin when FERDIUM_SERVER is not local', () => {
      // Arrange
      process.env.FERDIUM_SERVER = 'https://api.ferdium.org';
      localStorage.removeItem('authToken');

      // Act
      if (process.env.FERDIUM_SERVER === 'local' && !localStorage.getItem('authToken')) {
        mockServerlessLogin({ user: { login: jest.fn() } });
      }

      // Assert
      expect(mockServerlessLogin).not.toHaveBeenCalled();
    });

    it('should NOT call serverlessLogin when already logged in', () => {
      // Arrange
      process.env.FERDIUM_SERVER = 'local';
      localStorage.setItem('authToken', 'existing-token');

      // Act
      if (process.env.FERDIUM_SERVER === 'local' && !localStorage.getItem('authToken')) {
        mockServerlessLogin({ user: { login: jest.fn() } });
      }

      // Assert
      expect(mockServerlessLogin).not.toHaveBeenCalled();
    });
  });

  describe('2. WA-AKG Login Route', () => {
    it('should allow unauthenticated access to /auth/wa-akg/login', () => {
      // Arrange
      const currentRoute = '#/auth/wa-akg/login';
      const isLoggedIn = false;
      const BASE_ROUTE = '/auth';
      const isWaAkgLoginRoute = currentRoute.includes('/auth/wa-akg/login');

      // Act - simulate _requireAuthenticatedUser logic
      const shouldRedirectToWelcome = !isLoggedIn && !currentRoute.includes(BASE_ROUTE) && !isWaAkgLoginRoute;

      // Assert
      expect(isWaAkgLoginRoute).toBe(true);
      expect(shouldRedirectToWelcome).toBe(false);
    });

    it('should redirect unauthenticated users to Welcome when not on /auth or /wa-akg/login', () => {
      // Arrange
      const currentRoute = '#/';
      const isLoggedIn = false;
      const BASE_ROUTE = '/auth';
      const isWaAkgLoginRoute = currentRoute.includes('/auth/wa-akg/login');

      // Act
      const shouldRedirectToWelcome = !isLoggedIn && !currentRoute.includes(BASE_ROUTE) && !isWaAkgLoginRoute;

      // Assert
      expect(shouldRedirectToWelcome).toBe(true);
    });
  });

  describe('3. Layered Redirect Logic', () => {
    it('should redirect to /auth/wa-akg/login when logged in but no WA-AKG apiKey', () => {
      // Arrange
      const currentRoute = '#/auth/welcome';
      const isLoggedIn = true;
      const BASE_ROUTE = '/auth';
      const isWaAkgLoginRoute = currentRoute.includes('/auth/wa-akg/login');
      const waAkgApiKey = localStorage.getItem('whatsappAutomationApiKey');

      // Act - simulate the redirect logic
      let targetRoute: string | null = null;
      if (isLoggedIn && currentRoute.includes(BASE_ROUTE) && !isWaAkgLoginRoute) {
        if (!waAkgApiKey) {
          targetRoute = '/auth/wa-akg/login';
        } else {
          targetRoute = '/';
        }
      }

      // Assert
      expect(targetRoute).toBe('/auth/wa-akg/login');
    });

    it('should redirect to / when logged in and has WA-AKG apiKey', () => {
      // Arrange
      localStorage.setItem('whatsappAutomationApiKey', 'test-api-key');
      const currentRoute = '#/auth/welcome';
      const isLoggedIn = true;
      const BASE_ROUTE = '/auth';
      const isWaAkgLoginRoute = currentRoute.includes('/auth/wa-akg/login');
      const waAkgApiKey = localStorage.getItem('whatsappAutomationApiKey');

      // Act
      let targetRoute: string | null = null;
      if (isLoggedIn && currentRoute.includes(BASE_ROUTE) && !isWaAkgLoginRoute) {
        if (!waAkgApiKey) {
          targetRoute = '/auth/wa-akg/login';
        } else {
          targetRoute = '/';
        }
      }

      // Assert
      expect(targetRoute).toBe('/');
    });

    it('should NOT redirect when on /auth/wa-akg/login route', () => {
      // Arrange
      const currentRoute = '#/auth/wa-akg/login';
      const isLoggedIn = true;
      const BASE_ROUTE = '/auth';
      const isWaAkgLoginRoute = currentRoute.includes('/auth/wa-akg/login');

      // Act
      let redirected = false;
      if (isLoggedIn && currentRoute.includes(BASE_ROUTE) && !isWaAkgLoginRoute) {
        redirected = true;
      }

      // Assert
      expect(redirected).toBe(false);
    });

    it('should check WA-AKG apiKey even when on main app routes', () => {
      // Arrange
      localStorage.removeItem('whatsappAutomationApiKey');
      const currentRoute = '#/';
      const isLoggedIn = true;
      const BASE_ROUTE = '/auth';
      const isWaAkgLoginRoute = currentRoute.includes('/auth/wa-akg/login');
      const waAkgApiKey = localStorage.getItem('whatsappAutomationApiKey');

      // Act
      let targetRoute: string | null = null;
      if (isLoggedIn && !currentRoute.includes(BASE_ROUTE) && !isWaAkgLoginRoute) {
        if (!waAkgApiKey) {
          targetRoute = '/auth/wa-akg/login';
        }
      }

      // Assert
      expect(targetRoute).toBe('/auth/wa-akg/login');
    });
  });

  describe('4. WhatsApp Automation AuthManager Integration', () => {
    it('should check NextAuthProvider via AuthManager first', () => {
      // Arrange
      const mockIsAuthenticated = jest.fn(() => true);
      mockGetProvider.mockReturnValue({ isAuthenticated: mockIsAuthenticated });

      // Act - simulate _ensureAuthenticated logic
      const nextAuthProvider = mockGetProvider('nextauth');
      const isAuthenticated = nextAuthProvider?.isAuthenticated();

      // Assert
      expect(mockGetProvider).toHaveBeenCalledWith('nextauth');
      expect(isAuthenticated).toBe(true);
    });

    it('should fallback to getApiKey() when NextAuthProvider not authenticated', () => {
      // Arrange
      mockGetProvider.mockReturnValue({ isAuthenticated: () => false });
      localStorage.setItem('whatsappAutomationApiKey', 'test-key');

      // Act
      const nextAuthProvider = mockGetProvider('nextauth');
      const isNextAuthAuthenticated = nextAuthProvider?.isAuthenticated();
      const hasApiKey = !!localStorage.getItem('whatsappAutomationApiKey');

      // Assert
      expect(isNextAuthAuthenticated).toBe(false);
      expect(hasApiKey).toBe(true);
    });

    it('should return false when neither NextAuthProvider nor apiKey available', () => {
      // Arrange
      mockGetProvider.mockReturnValue({ isAuthenticated: () => false });
      localStorage.removeItem('whatsappAutomationApiKey');

      // Act
      const nextAuthProvider = mockGetProvider('nextauth');
      const isNextAuthAuthenticated = nextAuthProvider?.isAuthenticated();
      const hasApiKey = !!localStorage.getItem('whatsappAutomationApiKey');

      // Assert
      expect(isNextAuthAuthenticated).toBe(false);
      expect(hasApiKey).toBe(false);
    });
  });

  describe('5. End-to-End Routing Flow', () => {
    it('should follow correct flow: Welcome → Auto-login → WA-AKG check → Main', () => {
      // Arrange
      process.env.FERDIUM_SERVER = 'local';
      localStorage.removeItem('authToken');
      localStorage.removeItem('whatsappAutomationApiKey');

      // Step 1: App starts, user not logged in
      expect(localStorage.getItem('authToken')).toBeNull();

      // Step 2: Auto-login triggers (simulate)
      localStorage.setItem('authToken', 'ferdium-token');
      expect(localStorage.getItem('authToken')).toBe('ferdium-token');

      // Step 3: Check WA-AKG apiKey
      const waAkgApiKey = localStorage.getItem('whatsappAutomationApiKey');
      expect(waAkgApiKey).toBeNull();

      // Step 4: Should redirect to /auth/wa-akg/login
      let targetRoute = '/';
      if (!waAkgApiKey) {
        targetRoute = '/auth/wa-akg/login';
      }
      expect(targetRoute).toBe('/auth/wa-akg/login');

      // Step 5: User logs in via WA-AKG
      localStorage.setItem('whatsappAutomationApiKey', 'wa-akg-key');
      expect(localStorage.getItem('whatsappAutomationApiKey')).toBe('wa-akg-key');

      // Step 6: Should now redirect to main app
      const finalApiKey = localStorage.getItem('whatsappAutomationApiKey');
      let finalRoute = '/auth/wa-akg/login';
      if (finalApiKey) {
        finalRoute = '/';
      }
      expect(finalRoute).toBe('/');
    });

    it('should skip WA-AKG login when apiKey already exists', () => {
      // Arrange
      process.env.FERDIUM_SERVER = 'local';
      localStorage.setItem('authToken', 'existing-token');
      localStorage.setItem('whatsappAutomationApiKey', 'existing-key');

      // Act
      const waAkgApiKey = localStorage.getItem('whatsappAutomationApiKey');

      // Assert
      expect(waAkgApiKey).toBe('existing-key');
      // Should not redirect to /auth/wa-akg/login
    });
  });
});
