/**
 * Agent Flow CS authentication.
 * Uses Bearer token authentication (POST /api/v1/auth/login).
 */

import localStorage from 'mobx-localstorage';

const debug = require('../../preload-safe-debug')('Ferdium:AgentFlow:Auth');

const AGENT_FLOW_CS_BASE =
  process.env.AGENT_FLOW_CS_BASE ?? 'http://10.0.0.228:8000';

export const AGENT_FLOW_TOKEN_STORAGE_KEY =
  process.env.AGENT_FLOW_TOKEN_STORAGE_KEY ?? 'agentFlowToken';

export interface AuthCredentials {
  username: string;
  password: string;
}

/**
 * Retrieve the stored access token.
 */
export const getAccessToken = (): string => {
  try {
    const stored = localStorage.getItem(AGENT_FLOW_TOKEN_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return stored;
      }
    }
  } catch {
    debug('[Agent Flow CS] localStorage not available in getAccessToken');
  }

  return '';
};

/**
 * Store the access token persistently.
 */
export const setAccessToken = (token: string): void => {
  try {
    localStorage.setItem(AGENT_FLOW_TOKEN_STORAGE_KEY, token);
  } catch {
    debug('[Agent Flow CS] Failed to write access token to localStorage');
  }
};

/**
 * Clear the access token from storage.
 */
export const clearAccessToken = (): void => {
  try {
    localStorage.removeItem(AGENT_FLOW_TOKEN_STORAGE_KEY);
  } catch {
    debug('[Agent Flow CS] Failed to remove access token from localStorage');
  }
};

/**
 * Login and obtain a Bearer access token.
 * POST /api/v1/auth/login
 */
export const initializeAuth = async (
  credentials: AuthCredentials,
): Promise<string | null> => {
  const { username, password } = credentials;

  try {
    const response = await fetch(`${AGENT_FLOW_CS_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      console.error(
        `[Agent Flow CS] Login failed: ${response.status} ${body.message || ''}`,
      );
      return null;
    }

    const data = await response.json();
    const token = data.access_token;

    if (!token) {
      console.error('[Agent Flow CS] No access_token in login response');
      return null;
    }

    setAccessToken(token);
    debug('[Agent Flow CS] Authenticated as', username);
    return token;
  } catch (error) {
    console.error('[Agent Flow CS] Login request failed', error);
    return null;
  }
};
