/**
 * WhatsApp AI Gateway authentication.
 * The Gateway uses X-API-Key header for authentication.
 * Backend uses NextAuth.js — we log in via credentials callback to get a session,
 * then retrieve/generate an API key for all subsequent requests.
 *
 * NOTE: Uses Node.js `http` module instead of `fetch` for CSRF-sensitive calls
 * because Electron's renderer fetch enforces SameSite cookie restrictions
 * (cross-origin POSTs don't include SameSite=Lax cookies), while Node.js
 * http module handles cookies manually with no such restriction.
 */

import * as http from 'node:http';

const WA_AKG_BASE = process.env.WA_AKG_BASE ?? 'http://localhost:3000';
const API_KEY_KEY = process.env.API_KEY_KEY ?? 'whatsapp-api-key';
const API_KEY_STORAGE_KEY =
  process.env.API_KEY_STORAGE_KEY ?? 'whatsappAutomationApiKey';

interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * Default credentials for local development.
 */
const DEFAULT_CREDENTIALS: AuthCredentials = {
  email: process.env.WA_DEFAULT_EMAIL ?? '',
  password: process.env.WA_DEFAULT_PASSWORD ?? '',
};

/** Cookie jar: accumulates Set-Cookie headers across requests */
let cookieJar: string[] = [];

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
 * Make an HTTP request using Node.js http module.
 * Supports manual cookie management.
 */
function nodeRequest(options: {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{
  status: number;
  statusText: string;
  data: string;
}> {
  const { hostname, port } = new URL(WA_AKG_BASE);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname,
        port: Number(port) || 3000,
        path: options.path,
        method: options.method || 'GET',
        headers: {
          ...(options.body
            ? { 'Content-Length': Buffer.byteLength(options.body).toString() }
            : {}),
          ...options.headers,
        },
      },
      res => {
        // Collect cookies from response
        const { rawHeaders } = res;
        for (let i = 0; i < rawHeaders.length - 1; i += 2) {
          if (rawHeaders[i]?.toLowerCase() === 'set-cookie') {
            collectCookies(rawHeaders[i + 1]);
          }
        }

        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString('utf8');
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            data: body,
          });
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(15_000, () => {
      req.destroy(new Error('Request timeout'));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
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
    // stores not loaded yet
  }

  // 2. Try localStorage
  try {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // localStorage not available
  }

  return '';
};

/**
 * Store the API key persistently.
 */
export const setApiKey = (key: string): void => {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  } catch {
    // ignore
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
  credentials: AuthCredentials = DEFAULT_CREDENTIALS,
): Promise<string | null> => {
  const { email, password } = credentials;
  resetCookieJar();

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
    // eslint-disable-next-line no-console
    console.log('[WhatsApp Automation] Authenticated as', session.user.email);
  } catch (error) {
    console.error('[WhatsApp Automation] Session check error', error);
    return null;
  }

  // --- Step 4: Get existing API key ---
  try {
    const keyRes = await nodeRequest({
      path: '/api/user/api-key',
      headers: { Cookie: getCookieHeader() },
    });
    if (keyRes.status === 200) {
      const keyData = JSON.parse(keyRes.data);
      if (keyData?.data?.apiKey) {
        setApiKey(keyData.data.apiKey);
        return keyData.data.apiKey;
      }
    }
  } catch {
    // fall through to generate
  }

  // --- Step 5: Generate a new API key if none exists ---
  try {
    const genRes = await nodeRequest({
      path: '/api/user/api-key',
      method: 'POST',
      headers: { Cookie: getCookieHeader() },
    });
    if (genRes.status === 200) {
      const genData = JSON.parse(genRes.data);
      if (genData?.data?.apiKey) {
        setApiKey(genData.data.apiKey);
        return genData.data.apiKey;
      }
    }
  } catch (error) {
    console.error('[WhatsApp Automation] Failed to generate API key', error);
  }

  return null;
};
