import { createHash } from 'node:crypto';
import {
  API_KEY_STORAGE_KEY,
  WA_USER_EMAIL_STORAGE_KEY,
} from './constants';

const PROFILE_STORAGE_PREFIX = 'waAkgProfileLocalStorage:';

// 登录态相关的 key，不应保存到 profile 快照中
const EXCLUDED_KEYS = new Set([
  'authToken',
  'agentFlowToken',
  'ferdium-saved-email',
  'ferdium-saved-password',
  API_KEY_STORAGE_KEY,
  WA_USER_EMAIL_STORAGE_KEY,
]);

const normalizeProfileEmail = (email: string): string =>
  email.trim().toLowerCase();

const profileStorageKey = (email: string): string =>
  `${PROFILE_STORAGE_PREFIX}${createHash('sha256')
    .update(normalizeProfileEmail(email))
    .digest('hex')}`;

const isProfileInfrastructureKey = (key: string): boolean =>
  key === WA_USER_EMAIL_STORAGE_KEY || key.startsWith(PROFILE_STORAGE_PREFIX);

const snapshotLocalStorage = (): Record<string, string> => {
  const snapshot: Record<string, string> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    // 排除 profile 基础设施 key 和登录态相关 key
    if (key && !isProfileInfrastructureKey(key) && !EXCLUDED_KEYS.has(key)) {
      const value = window.localStorage.getItem(key);
      if (value !== null) {
        snapshot[key] = value;
      }
    }
  }
  return snapshot;
};

export const saveLocalStorageProfile = (email?: string | null): void => {
  if (!email) return;
  window.localStorage.setItem(
    profileStorageKey(email),
    JSON.stringify(snapshotLocalStorage()),
  );
};

export const switchLocalStorageProfile = (email: string): void => {
  const normalizedEmail = normalizeProfileEmail(email);
  const currentEmail = window.localStorage.getItem(WA_USER_EMAIL_STORAGE_KEY);

  if (currentEmail && normalizeProfileEmail(currentEmail) === normalizedEmail) {
    return;
  }

  saveLocalStorageProfile(currentEmail);

  const nextSnapshotRaw = window.localStorage.getItem(
    profileStorageKey(normalizedEmail),
  );

  for (const key of Object.keys(window.localStorage)) {
    if (!isProfileInfrastructureKey(key)) {
      window.localStorage.removeItem(key);
    }
  }

  if (nextSnapshotRaw) {
    try {
      const nextSnapshot = JSON.parse(nextSnapshotRaw);
      for (const [key, value] of Object.entries(nextSnapshot)) {
        if (typeof value === 'string') {
          window.localStorage.setItem(key, value);
        }
      }
    } catch {
      window.localStorage.removeItem(profileStorageKey(normalizedEmail));
    }
  }

  window.localStorage.setItem(WA_USER_EMAIL_STORAGE_KEY, normalizedEmail);
};
