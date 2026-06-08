import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { type BrowserWindow, app, ipcMain } from 'electron';
import { LOCAL_HOSTNAME, LOCAL_PORT } from '../../config';
import { userDataPath } from '../../environment-remote';
import { server } from '../../internal-server/start';

const portInUse = (port: number): Promise<boolean> =>
  new Promise(resolve => {
    const server = createServer(socket => {
      socket.write('Echo server\r\n');
      socket.pipe(socket);
    });

    server.listen(port, LOCAL_HOSTNAME);
    server.on('error', () => {
      resolve(true);
    });
    server.on('listening', () => {
      server.close();
      resolve(false);
    });
  });

let localServerStarted = false;
let port = LOCAL_PORT;
let token = '';
let waAkgProfileEmail = '';

const normalizeProfileEmail = (email?: string | null): string =>
  email?.trim().toLowerCase() ?? '';

const setWaAkgProfileEmail = (email?: string | null): boolean => {
  const nextEmail = normalizeProfileEmail(email);
  const changed = nextEmail !== waAkgProfileEmail;
  waAkgProfileEmail = nextEmail;
  if (waAkgProfileEmail) {
    process.env.WA_AKG_PROFILE_EMAIL = waAkgProfileEmail;
  } else {
    delete process.env.WA_AKG_PROFILE_EMAIL;
  }
  return changed;
};

ipcMain.handle('getLocalServerToken', () => {
  if (!token) return null;
  return { port, token };
});

ipcMain.handle('setWaAkgProfile', (_event, data?: { email?: string }) => {
  const nextEmail = normalizeProfileEmail(data?.email);
  if (localServerStarted && nextEmail !== waAkgProfileEmail) {
    return {
      changed: true,
      isLocalServerStarted: true,
      requiresRestart: true,
    };
  }
  const changed = setWaAkgProfileEmail(data?.email);
  return {
    changed,
    isLocalServerStarted: localServerStarted,
    requiresRestart: changed && localServerStarted,
  };
});

ipcMain.handle('relaunchForWaAkgProfile', () => {
  app.relaunch();
  app.quit();
});

export default (params: { mainWindow: BrowserWindow }) => {
  ipcMain.on('startLocalServer', (_event, data?: { waAkgEmail?: string }) => {
    (async () => {
      if (!normalizeProfileEmail(data?.waAkgEmail)) {
        return;
      }

      if (!localServerStarted) {
        setWaAkgProfileEmail(data?.waAkgEmail);

        // Find next unused port for server
        port = LOCAL_PORT;
        // eslint-disable-next-line no-await-in-loop
        while ((await portInUse(port)) && port < LOCAL_PORT + 10) {
          port += 1;
        }
        token = randomBytes(256 / 8).toString('base64url');
        await server(userDataPath(), port, token);
        localServerStarted = true;
      }

      // Send local server parameters to the renderer even if the server is already running.
      params.mainWindow.webContents.send('localServerPort', {
        port,
        token,
      });
    })().catch(error => {
      console.error('Error while starting local server', error);
    });
  });
};
