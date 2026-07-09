import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function profileHash(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

export function resolveProfilePath(
  baseDir: string,
  email: string,
  ...subdirs: string[]
): string {
  const hash = profileHash(email);
  const newPath = join(baseDir, 'profiles', hash, ...subdirs);
  const legacyPath = join(baseDir, 'profiles', 'wa-akg', hash, ...subdirs);
  if (existsSync(newPath)) return newPath;
  if (existsSync(legacyPath)) return legacyPath;
  return newPath;
}
