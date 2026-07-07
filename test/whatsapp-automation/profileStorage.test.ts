import {
  saveLocalStorageProfile,
  switchLocalStorageProfile,
} from '../../src/whatsapp-automation/profileStorage';

const store: Record<string, string> = {};
const mockLocalStorage = new Proxy({} as any, {
  get(_t, prop) {
    if (prop === 'getItem') return (k: string) => store[k] ?? null;
    if (prop === 'setItem')
      return (k: string, v: string) => {
        store[k] = v;
      };
    if (prop === 'removeItem')
      return (k: string) => {
        delete store[k];
      };
    if (prop === 'clear')
      return () => {
        Object.keys(store).forEach(k => delete store[k]);
      };
    if (prop === 'length') return Object.keys(store).length;
    if (prop === 'key') return (i: number) => Object.keys(store)[i] ?? null;
    return store[prop as string] ?? null;
  },
  set(_t, prop, value) {
    store[prop as string] = value;
    return true;
  },
  has(_t, prop) {
    return prop in store;
  },
  deleteProperty(_t, prop) {
    delete store[prop as string];
    return true;
  },
  ownKeys() {
    return Object.keys(store);
  },
  getOwnPropertyDescriptor(_t, prop) {
    return prop in store
      ? {
          enumerable: true,
          configurable: true,
          value: store[prop as string],
          writable: true,
        }
      : undefined;
  },
});

if (typeof window === 'undefined') {
  (global as any).window = { localStorage: mockLocalStorage };
} else {
  (window as any).localStorage = mockLocalStorage;
}

const EMAIL_A = 'user_a@example.com';
const EMAIL_B = 'user_b@example.com';

describe('profileStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('saveLocalStorageProfile', () => {
    it('does nothing when email is null/undefined', () => {
      saveLocalStorageProfile(null);
      saveLocalStorageProfile();
      expect(window.localStorage.length).toBe(0);
    });

    it('saves a snapshot excluding infrastructure keys', () => {
      window.localStorage.setItem(
        'service',
        JSON.stringify({ activeService: 's1' }),
      );
      window.localStorage.setItem(
        'whatsappAutomationUserEmail',
        'user_a@example.com',
      );
      window.localStorage.setItem('authToken', 'secret-token');
      window.localStorage.setItem('stats', JSON.stringify({ count: 5 }));

      saveLocalStorageProfile(EMAIL_A);

      let snapshotKey: string | null = null;
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k?.startsWith('profileLocalStorage:')) {
          snapshotKey = k;
        }
      }
      expect(snapshotKey).toMatch(/^profileLocalStorage:[\da-f]{64}$/);
    });

    it('snapshots exclude excluded keys', () => {
      window.localStorage.setItem('authToken', 'should-be-excluded');
      window.localStorage.setItem('agentFlowToken', 'should-be-excluded');
      window.localStorage.setItem(
        'whatsappAutomationApiKey',
        'should-be-excluded',
      );
      window.localStorage.setItem(
        'whatsappAutomationUserEmail',
        'should-be-excluded',
      );
      window.localStorage.setItem('ferdium-saved-email', 'should-be-excluded');
      window.localStorage.setItem(
        'ferdium-saved-password',
        'should-be-excluded',
      );
      window.localStorage.setItem('normal-key', 'should-be-included');

      saveLocalStorageProfile(EMAIL_A);

      let raw: string | null = null;
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k?.startsWith('profileLocalStorage:')) {
          raw = window.localStorage.getItem(k);
          break;
        }
      }
      expect(raw).not.toBeNull();
      const snapshot = JSON.parse(raw!);
      expect(snapshot['normal-key']).toBe('should-be-included');
      expect(snapshot['authToken']).toBeUndefined();
      expect(snapshot['agentFlowToken']).toBeUndefined();
      expect(snapshot['whatsappAutomationApiKey']).toBeUndefined();
      expect(snapshot['whatsappAutomationUserEmail']).toBeUndefined();
      expect(snapshot['ferdium-saved-email']).toBeUndefined();
      expect(snapshot['ferdium-saved-password']).toBeUndefined();
    });
  });

  describe('switchLocalStorageProfile', () => {
    it('is a no-op when email matches current profile', () => {
      window.localStorage.setItem('whatsappAutomationUserEmail', EMAIL_A);
      window.localStorage.setItem('normal-key', 'value-a');

      switchLocalStorageProfile(EMAIL_A);

      expect(window.localStorage.getItem('normal-key')).toBe('value-a');
    });

    it('saves current profile and restores target profile', () => {
      window.localStorage.setItem('whatsappAutomationUserEmail', EMAIL_A);
      window.localStorage.setItem('theme', 'dark');
      window.localStorage.setItem('lang', 'zh');

      switchLocalStorageProfile(EMAIL_B);

      expect(window.localStorage.getItem('theme')).toBeNull();
      expect(window.localStorage.getItem('lang')).toBeNull();
      expect(window.localStorage.getItem('whatsappAutomationUserEmail')).toBe(
        EMAIL_B,
      );
    });

    it('restores previously saved profile data', () => {
      window.localStorage.setItem('whatsappAutomationUserEmail', EMAIL_A);
      window.localStorage.setItem('theme', 'dark');
      window.localStorage.setItem('toolbar', 'compact');

      switchLocalStorageProfile(EMAIL_B);

      window.localStorage.setItem('theme', 'light');
      window.localStorage.setItem('toolbar', 'full');

      switchLocalStorageProfile(EMAIL_A);

      expect(window.localStorage.getItem('theme')).toBe('dark');
      expect(window.localStorage.getItem('toolbar')).toBe('compact');
      expect(window.localStorage.getItem('whatsappAutomationUserEmail')).toBe(
        EMAIL_A,
      );
    });

    it('reads legacy key when new key is absent', () => {
      const legacyKey = `waAkgProfileLocalStorage:${require('node:crypto')
        .createHash('sha256')
        .update('user_a@example.com')
        .digest('hex')}`;

      window.localStorage.setItem(
        legacyKey,
        JSON.stringify({ theme: 'legacy-dark' }),
      );
      window.localStorage.setItem('whatsappAutomationUserEmail', EMAIL_B);

      switchLocalStorageProfile(EMAIL_A);

      expect(window.localStorage.getItem('theme')).toBe('legacy-dark');
      expect(window.localStorage.getItem('whatsappAutomationUserEmail')).toBe(
        EMAIL_A,
      );
    });

    it('handles corrupted snapshot gracefully', () => {
      const key = `profileLocalStorage:${require('node:crypto')
        .createHash('sha256')
        .update('user_a@example.com')
        .digest('hex')}`;
      window.localStorage.setItem(key, '{bad-json');

      switchLocalStorageProfile(EMAIL_A);

      expect(window.localStorage.getItem('whatsappAutomationUserEmail')).toBe(
        EMAIL_A,
      );
      expect(window.localStorage.getItem(key)).toBeNull();
    });
  });
});
