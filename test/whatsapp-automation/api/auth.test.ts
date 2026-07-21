/**
 * Tests for WhatsApp Automation API auth layer.
 * Focus: API key storage/retrieval and the defensive JSON.parse
 * that prevents mobx-localstorage JSON-stringified corruption.
 */

// Set env vars before importing module
import {
  clearApiKey,
  getApiKey,
  setApiKey,
} from '../../../src/whatsapp-automation/api/auth';

process.env.API_KEY_STORAGE_KEY = 'whatsappAutomationApiKey';
process.env.API_KEY_KEY = 'whatsapp-api-key';

// Mock window.ferdium.settings
const mockSettingsApp: Record<string, string> = {};
if (typeof window === 'undefined') {
  (global as any).window = {
    ferdium: {
      stores: {
        settings: {
          all: {
            app: mockSettingsApp,
          },
        },
      },
    },
  };
}

// Mock localStorage
if (
  typeof localStorage === 'undefined' ||
  typeof localStorage.clear !== 'function'
) {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(k => delete store[k]);
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  Object.keys(mockSettingsApp).forEach(k => delete mockSettingsApp[k]);
});

describe('getApiKey', () => {
  it('returns empty string when no key is stored', () => {
    expect(getApiKey()).toBe('');
  });

  it('returns raw string if stored as plain value in localStorage', () => {
    localStorage.setItem('whatsappAutomationApiKey', 'sk-real-key');
    expect(getApiKey()).toBe('sk-real-key');
  });

  it('returns parsed value if stored as JSON-stringified string in localStorage', () => {
    // mobx-localstorage stores values via JSON.stringify, which adds quotes
    localStorage.setItem('whatsappAutomationApiKey', '"sk-quoted-key"');
    expect(getApiKey()).toBe('sk-quoted-key');
  });

  it('returns parsed value for complex API keys with special chars', () => {
    const key = 'sk-abc123!@#$%^&*()_+-=[]{}|;:,.<>?';
    localStorage.setItem('whatsappAutomationApiKey', JSON.stringify(key));
    expect(getApiKey()).toBe(key);
  });

  it('returns empty string for JSON-stringified empty string', () => {
    localStorage.setItem('whatsappAutomationApiKey', '""');
    expect(getApiKey()).toBe('');
  });

  it('returns localStorage value, ignoring settings store', () => {
    // settings store fallback was removed; localStorage is the single source.
    mockSettingsApp['whatsapp-api-key'] = 'sk-settings-key';
    localStorage.setItem('whatsappAutomationApiKey', '"sk-local-key"');
    expect(getApiKey()).toBe('sk-local-key');
  });

  it('returns raw localStorage value, ignoring settings store', () => {
    mockSettingsApp['whatsapp-api-key'] = 'sk-settings-clean';
    localStorage.setItem('whatsappAutomationApiKey', 'sk-local-clean');
    expect(getApiKey()).toBe('sk-local-clean');
  });

  it('returns empty string if both storage locations are empty', () => {
    expect(getApiKey()).toBe('');
  });

  it('returns raw value if it is a non-string primitive that fails JSON.parse gracefully', () => {
    // This covers the edge case where a number or token was stored without quotes
    localStorage.setItem('whatsappAutomationApiKey', 'sk-12345');
    expect(getApiKey()).toBe('sk-12345');
  });
});

describe('setApiKey', () => {
  it('stores raw value in localStorage without JSON quoting', () => {
    setApiKey('sk-raw-key');
    expect(localStorage.getItem('whatsappAutomationApiKey')).toBe('sk-raw-key');
  });

  it('stores API key that can be retrieved by getApiKey', () => {
    setApiKey('sk-roundtrip-key');
    expect(getApiKey()).toBe('sk-roundtrip-key');
  });

  it('overwrites existing value', () => {
    localStorage.setItem('whatsappAutomationApiKey', 'sk-old-key');
    setApiKey('sk-new-key');
    expect(getApiKey()).toBe('sk-new-key');
  });

  it('does not sync to settings store', () => {
    setApiKey('sk-settings-sync');
    expect(mockSettingsApp['whatsapp-api-key']).toBeUndefined();
    expect(localStorage.getItem('whatsappAutomationApiKey')).toBe(
      'sk-settings-sync',
    );
  });
});

describe('clearApiKey', () => {
  it('clears key from localStorage', () => {
    localStorage.setItem('whatsappAutomationApiKey', 'sk-clear-me');
    clearApiKey();
    expect(localStorage.getItem('whatsappAutomationApiKey')).toBeNull();
  });

  it('leaves settings store untouched', () => {
    mockSettingsApp['whatsapp-api-key'] = 'sk-preserved';
    localStorage.setItem('whatsappAutomationApiKey', 'sk-clear-me');
    clearApiKey();
    expect(mockSettingsApp['whatsapp-api-key']).toBe('sk-preserved');
    expect(localStorage.getItem('whatsappAutomationApiKey')).toBeNull();
  });

  it('clears API key and email from localStorage', () => {
    localStorage.setItem('whatsappAutomationApiKey', 'sk-both');
    localStorage.setItem('whatsappAutomationUserEmail', 'u@x.com');
    clearApiKey();
    expect(localStorage.getItem('whatsappAutomationApiKey')).toBeNull();
    expect(localStorage.getItem('whatsappAutomationUserEmail')).toBeNull();
  });

  it('handles missing window.ferdium gracefully', () => {
    // Temporarily remove window.ferdium
    const origFerdium = (window as any).ferdium;
    delete (window as any).ferdium;
    localStorage.setItem('whatsappAutomationApiKey', 'sk-orphan');
    clearApiKey();
    expect(localStorage.getItem('whatsappAutomationApiKey')).toBeNull();
    (window as any).ferdium = origFerdium;
  });
});
