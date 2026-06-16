import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';
/* eslint-disable no-console */
import { app } from 'electron';

const MIGRATION_PAIRS: [string, string][] = [
  ['Ferdium', 'AITALK'],
  ['FerdiumDev', 'AITALKDev'],
];

function getUserDataPath(appName: string): string {
  if (process.platform === 'darwin') {
    return join(app.getPath('home'), 'Library', 'Application Support', appName);
  }
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || '', appName);
  }
  return join(app.getPath('home'), '.config', appName);
}

function hasData(path: string): boolean {
  if (!existsSync(path)) {
    return false;
  }

  try {
    const files = readdirSync(path);
    return (
      files.length > 0 &&
      (files.includes('server.sqlite') || files.some(f => !f.startsWith('.')))
    );
  } catch {
    return false;
  }
}

function copyDirRecursive(
  src: string,
  dest: string,
  options?: { overwrite: boolean },
): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, options);
    } else if (options?.overwrite || !existsSync(destPath)) {
      try {
        copyFileSync(srcPath, destPath);
      } catch (error) {
        console.warn(`Failed to copy ${srcPath}:`, error);
      }
    }
  }
}

export async function migrateUserData(): Promise<boolean> {
  let anyMigrated = false;

  for (const [oldName, newName] of MIGRATION_PAIRS) {
    const oldPath = getUserDataPath(oldName);
    const newPath = getUserDataPath(newName);
    const backupPath = `${oldPath}.migrated`;

    console.log(`[Migration] Checking pair: ${oldName} -> ${newName}`);
    console.log(`[Migration]   Old path: ${oldPath}`);
    console.log(`[Migration]   New path: ${newPath}`);

    if (!existsSync(oldPath)) {
      console.log('[Migration]   Old path does not exist, skipping');
    } else if (existsSync(backupPath)) {
      console.log(
        `[Migration]   Backup already exists at ${backupPath}, migration already done, skipping`,
      );
    } else {
      try {
        console.log(
          `[Migration]   Copying data from ${oldPath} to ${newPath} (merging, overwriting existing files)...`,
        );
        copyDirRecursive(oldPath, newPath, { overwrite: true });

        console.log(`[Migration]   Creating backup at ${backupPath}...`);
        copyDirRecursive(oldPath, backupPath, { overwrite: true });

        if (hasData(newPath)) {
          console.log(
            `[Migration]   Migration completed successfully for ${oldName} -> ${newName}`,
          );
          anyMigrated = true;
        } else {
          console.warn(
            `[Migration]   Migration verification failed - new data directory is empty for ${newPath}`,
          );
        }
      } catch (error) {
        console.error(
          `[Migration]   Migration failed for pair ${oldName} -> ${newName}:`,
          error,
        );
      }
    }
  }

  return anyMigrated;
}

export function needsMigration(): boolean {
  for (const [oldName, newName] of MIGRATION_PAIRS) {
    const oldPath = getUserDataPath(oldName);
    const newPath = getUserDataPath(newName);

    if (!hasData(newPath) && hasData(oldPath)) {
      return true;
    }
  }
  return false;
}
