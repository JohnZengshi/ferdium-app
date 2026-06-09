/**
 * WhatsApp AI Gateway authentication.
 * The Gateway uses X-API-Key header for authentication.
 * Backend uses NextAuth.js — we log in via credentials callback to get a session,
 * then retrieve/generate an API key for all subsequent requests.
 *
 * NOTE: Uses IPC to call the main process for HTTP requests because
 * Electron's renderer fetch enforces SameSite cookie restrictions
 * (cross-origin POSTs don't include SameSite=Lax cookies), while the
 * main process's Node.js http module handles cookies manually with no such restriction.
 */

import { ipcRenderer } from 'electron';
import {
  API_KEY_STORAGE_KEY,
  WA_USER_EMAIL_STORAGE_KEY,
  WA_USER_ID_STORAGE_KEY,
} from '../constants';
import { switchLocalStorageProfile } from '../profileStorage';

const WA_AKG_BASE = process.env.WA_AKG_BASE ?? 'http://localhost:3000';
const API_KEY_KEY = process.env.API_KEY_KEY ?? 'whatsapp-api-key';

export interface AuthCredentials {
  email: string;
  password: string;
}

/** Cookie jar: accumulates Set-Cookie headers across requests */
let cookieJar: string[] = [];

/** Guard flag: prevents concurrent initializeAuth() calls from corrupting the cookie jar */
let authInProgress = false;

async function waitForLocalServer(): Promise<void> {
  await new Promise<void>(resolve => {
    ipcRenderer.once('localServerPort', () => {
      resolve();
    });
  });
}

function markFerdiumLoggedInForWaAkg(): void {
  localStorage.setItem('authToken', 'wa-akg');
  window.localStorage.setItem('authToken', 'wa-akg');
}

function setWaAkgIdentity(email: string, userId?: string): void {
  switchLocalStorageProfile(email);
  window.localStorage.setItem(WA_USER_EMAIL_STORAGE_KEY, email);
  if (userId) {
    window.localStorage.setItem(WA_USER_ID_STORAGE_KEY, userId);
  }
  const { user } = (window as any).ferdium?.stores || {};
  user?.setWaAkgEmail?.(email);
  if (userId) {
    user?.setWaAkgUserId?.(userId);
  }
  (window as any).ferdium?.stores?.settings?.reloadFileSystemSettings?.();
}

async function switchLocalFerdiumProfile(email: string): Promise<void> {
  try {
    const result = await ipcRenderer.invoke('setWaAkgProfile', { email });
    markFerdiumLoggedInForWaAkg();
    if (result?.requiresRestart) {
      await ipcRenderer.invoke('relaunchForWaAkgProfile');
      await new Promise(() => {});
      return;
    }
    ipcRenderer.send('startLocalServer', { waAkgEmail: email });
    if (!result?.isLocalServerStarted) {
      await waitForLocalServer();
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    console.warn(
      '[WhatsApp Automation] Failed to switch Ferdium profile',
      error,
    );
  }
}

function resetCookieJar() {
  cookieJar = [];
}

function getCookieHeader(): string {
  return cookieJar.join('; ');
}

/**
 * Parse Set-Cookie header values and add to cookie jar.
 * Node.js http module can return set-cookie as string[] or string.
 */
function collectCookies(setCookieHeader: string | string[] | undefined): void {
  if (!setCookieHeader) return;
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  for (const cookieStr of cookies) {
    const name = cookieStr.split('=')[0]?.trim();
    // Only collect auth-related cookies, not path=/api/auth/csrf junk
    if (
      name &&
      (name.includes('authjs') ||
        name.includes('next-auth') ||
        name.includes('session'))
    ) {
      // Keep only the name=value part (before first ;)
      const nv = cookieStr.split(';')[0]?.trim();
      if (nv) {
        // Replace existing cookie with same name
        const idx = cookieJar.findIndex(c => c.startsWith(`${name}=`));
        if (idx >= 0) cookieJar[idx] = nv;
        else cookieJar.push(nv);
      }
    }
  }
}

/**
 * Make an HTTP request using IPC to the main process.
 * Supports manual cookie management.
 */
async function nodeRequest(options: {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{
  status: number;
  statusText: string;
  data: string;
}> {
  const url = `${WA_AKG_BASE}${options.path}`;

  const response = await ipcRenderer.invoke('http-request', {
    url,
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body,
    timeout: 15_000,
  });

  // Collect cookies from response headers
  const setCookieHeader = response.headers['set-cookie'];
  if (setCookieHeader) {
    collectCookies(setCookieHeader);
  }

  return {
    status: response.status,
    statusText: response.statusText,
    data: response.data,
  };
}

/**
 * Retrieve the configured API key for WhatsApp AI Gateway.
 * Looks in: settings -> localStorage -> (falls back to auto-login)
 */
export const getApiKey = (): string => {
  // 1. Try Ferdium settings store
  try {
    const settings = (window as any).ferdium?.stores?.settings?.all?.app;
    if (settings?.[API_KEY_KEY]) {
      return settings[API_KEY_KEY];
    }
  } catch {
    console.warn(
      '[WhatsApp Automation] Settings store not available in getApiKey',
    );
  }

  // 2. Try localStorage
  try {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (stored) {
      // Defensive: mobx-localstorage stores values as JSON.stringify'd strings.
      // If this value was written by mobx-localstorage (e.g. from an older version
      // of NextAuthProvider), it will have extra quotes. Try parsing it as JSON
      // first, fall back to raw string.
      try {
        return JSON.parse(stored);
      } catch {
        return stored;
      }
    }
  } catch {
    console.warn(
      '[WhatsApp Automation] localStorage not available in getApiKey',
    );
  }

  return '';
};

/**
 * Store the API key persistently.
 * Writes to localStorage (canonical storage) and synchronises the
 * Ferdium settings store so getApiKey() returns a consistent value
 * regardless of which path it reads first.
 */
export const setApiKey = (key: string): void => {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  } catch {
    console.warn(
      '[WhatsApp Automation] Failed to write API key to localStorage',
    );
  }
  try {
    const settingsApp = (window as any).ferdium?.stores?.settings?.all?.app;
    if (settingsApp && typeof settingsApp === 'object') {
      settingsApp[API_KEY_KEY] = key;
    }
  } catch {
    console.warn(
      '[WhatsApp Automation] Failed to sync API key to settings store',
    );
  }
};

/**
 * Clear the API key from both localStorage and the Ferdium settings store.
 * Ensures that all persisted copies are removed to prevent stale key reuse.
 */
export const clearApiKey = (): void => {
  localStorage.removeItem(WA_USER_EMAIL_STORAGE_KEY);
  (window as any).ferdium?.stores?.user?.setWaAkgEmail?.(null);
  localStorage.removeItem(API_KEY_STORAGE_KEY);
  try {
    const settingsApp = (window as any).ferdium?.stores?.settings?.all?.app;
    if (settingsApp && typeof settingsApp === 'object') {
      settingsApp[API_KEY_KEY] = '';
    }
  } catch {
    console.warn(
      '[WhatsApp Automation] Failed to clear API key from settings store',
    );
  }
};

/**
 * Initialize authentication using Node.js http module to
 * bypass browser SameSite cookie restrictions.
 *
 * Flow:
 * 1. GET /api/auth/csrf → get CSRF token (cookies auto-collected)
 * 2. POST /api/auth/callback/credentials with CSRF token + cookies
 * 3. GET /api/auth/session with cookies to verify login
 * 4. GET /api/user/api-key with cookies to fetch existing key
 * 5. POST /api/user/api-key (if no existing key) to generate one
 *
 * The user account (text_001@example.com) is expected to already exist on the backend.
 */
export const initializeAuth = async (
  credentials: AuthCredentials,
): Promise<string | null> => {
  const { email, password } = credentials;

  if (authInProgress) {
    console.warn(
      '[WhatsApp Automation] Auth already in progress, skipping concurrent call',
    );
    return null;
  }
  authInProgress = true;

  try {
    resetCookieJar();
    let authenticatedEmail = '';

    // --- Step 1: Get CSRF token for NextAuth login ---
    let csrfToken = '';
    try {
      const csrfRes = await nodeRequest({ path: '/api/auth/csrf' });
      if (csrfRes.status >= 400) {
        console.error(
          `[WhatsApp Automation] CSRF endpoint returned ${csrfRes.status}`,
        );
        return null;
      }
      const csrfData = JSON.parse(csrfRes.data);
      csrfToken = csrfData.csrfToken ?? csrfData.csrf ?? '';
    } catch (error) {
      console.error('[WhatsApp Automation] Failed to get CSRF token', error);
      return null;
    }

    if (!csrfToken) {
      console.error('[WhatsApp Automation] No CSRF token received');
      return null;
    }

    // --- Step 2: Login via NextAuth credentials callback ---
    const loginBody = new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: WA_AKG_BASE,
      json: 'true',
    }).toString();

    try {
      const loginRes = await nodeRequest({
        path: '/api/auth/callback/credentials',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: getCookieHeader(),
        },
        body: loginBody,
      });

      // NextAuth returns 302 on both success AND CSRF failure.
      // Success: redirects to callbackUrl (/dashboard)
      // Failure: redirects to /auth/login?error=Configuration
      if (loginRes.status !== 302) {
        console.error(
          `[WhatsApp Automation] Login failed with status ${loginRes.status}`,
        );
        return null;
      }
    } catch (error) {
      console.error('[WhatsApp Automation] Login request failed', error);
      return null;
    }

    // --- Step 3: Check session is active ---
    try {
      const sessionRes = await nodeRequest({
        path: '/api/auth/session',
        headers: { Cookie: getCookieHeader() },
      });
      const session = JSON.parse(sessionRes.data);
      if (!session?.user?.email) {
        console.error('[WhatsApp Automation] Session check failed', session);
        return null;
      }
      setWaAkgIdentity(session.user.email, session.user.id);
      authenticatedEmail = session.user.email;

      // eslint-disable-next-line no-console
      console.log('[WhatsApp Automation] Authenticated as', session.user.email);
    } catch (error) {
      console.error('[WhatsApp Automation] Session check error', error);
      return null;
    }

    // --- Step 4: Get existing API key ---
    let apiKey = '';
    try {
      const keyRes = await nodeRequest({
        path: '/api/user/api-key',
        headers: { Cookie: getCookieHeader() },
      });
      if (keyRes.status === 200) {
        const keyData = JSON.parse(keyRes.data);
        if (keyData?.data?.apiKey) {
          apiKey = keyData.data.apiKey;
        }
      }
    } catch {
      // fall through to generate
    }

    // --- Step 5: Generate a new API key if none exists ---
    if (!apiKey) {
      try {
        const genRes = await nodeRequest({
          path: '/api/user/api-key',
          method: 'POST',
          headers: { Cookie: getCookieHeader() },
        });
        if (genRes.status === 200) {
          const genData = JSON.parse(genRes.data);
          if (genData?.data?.apiKey) {
            apiKey = genData.data.apiKey;
          }
        }
      } catch (error) {
        console.error(
          '[WhatsApp Automation] Failed to generate API key',
          error,
        );
      }
    }

    if (apiKey) {
      setApiKey(apiKey);
      await switchLocalFerdiumProfile(authenticatedEmail);
      return apiKey;
    }

    return null;
  } finally {
    authInProgress = false;
  }
};
