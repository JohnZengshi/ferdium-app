/*
|--------------------------------------------------------------------------
| Http server
|--------------------------------------------------------------------------
|
| This file bootstraps Adonisjs to start the HTTP server. You are free to
| customize the process of booting the http server.
|
| """ Loading ace commands """
|     At times you may want to load ace commands when starting the HTTP server.
|     Same can be done by chaining `loadCommands()` method after
|
| """ Preloading files """
|     Also you can preload files by calling `preLoad('path/to/file')` method.
|     Make sure to pass a relative path from the project root.
*/

import { join } from 'node:path';
import fold from '@adonisjs/fold';
import { Ignitor, hooks } from '@adonisjs/ignitor';
import { chmod, ensureDir, readFile, stat, writeFile } from 'fs-extra';
import { LOCAL_HOSTNAME } from '../config';
import { isWindows } from '../environment';
import { resolveProfilePath } from '../helpers/profilePath';

process.env.ENV_PATH = join(__dirname, 'env.ini');

async function ensureDB(dbPath: string): Promise<void> {
  try {
    await stat(dbPath);
  } catch {
    // Database does not exist.
    // Manually copy file
    // We can't use copyFile here as it will cause the file to be readonly on Windows
    const dbTemplatePath = join(__dirname, 'database', 'template.sqlite');
    const dbTemplate = await readFile(dbTemplatePath);
    await writeFile(dbPath, dbTemplate);

    // Change permissions to ensure to file is not read-only
    if (isWindows) {
      const stats = await stat(dbPath);
      // eslint-disable-next-line no-bitwise
      await chmod(dbPath, stats.mode | 146);
    }
  }
}

export const server = async (userPath: string, port: number, token: string) => {
  const profileEmail =
    process.env.PROFILE_EMAIL?.trim().toLowerCase() ||
    process.env.WA_AKG_PROFILE_EMAIL?.trim().toLowerCase();
  let profilePath = userPath;
  if (profileEmail) {
    profilePath = resolveProfilePath(userPath, profileEmail);
  }
  await ensureDir(profilePath);
  const dbPath = join(profilePath, 'server.sqlite');
  await ensureDB(dbPath);

  // Note: These env vars are used by adonis as env vars
  process.env.DB_PATH = dbPath;
  process.env.USER_PATH = profilePath;
  process.env.HOST = LOCAL_HOSTNAME;
  process.env.PORT = port.toString();
  process.env.FERDIUM_LOCAL_TOKEN = token;

  return new Promise<void>((resolve, reject) => {
    let returned = false;
    hooks.after.httpServer(() => {
      if (!returned) {
        resolve();
        returned = true;
      }
    });
    new Ignitor(fold)
      .appRoot(__dirname)
      .fireHttpServer()
      .catch(error => {
        console.error(error);
        if (!returned) {
          returned = true;
          reject(error);
        }
      });
  });
};
