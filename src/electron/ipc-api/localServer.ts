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
let profileEmail = '';

const normalizeProfileEmail = (email?: string | null): string =>
  email?.trim().toLowerCase() ?? '';

const setProfileEmail = (email?: string | null): boolean => {
  const nextEmail = normalizeProfileEmail(email);
  const changed = nextEmail !== profileEmail;
  profileEmail = nextEmail;
  if (profileEmail) {
    process.env.PROFILE_EMAIL = profileEmail;
  } else {
    delete process.env.PROFILE_EMAIL;
  }
  // compat: legacy env var
  if (profileEmail) {
    process.env.WA_AKG_PROFILE_EMAIL = profileEmail;
  } else {
    delete process.env.WA_AKG_PROFILE_EMAIL;
  }
  return changed;
};

ipcMain.handle('getLocalServerToken', () => {
  if (!token) return null;
  return { port, token };
});

ipcMain.handle('setProfile', (_event, data?: { email?: string }) => {
  const nextEmail = normalizeProfileEmail(data?.email);
  if (localServerStarted && nextEmail !== profileEmail) {
    return {
      changed: true,
      isLocalServerStarted: true,
      requiresRestart: true,
    };
  }
  const changed = setProfileEmail(data?.email);
  return {
    changed,
    isLocalServerStarted: localServerStarted,
    requiresRestart: changed && localServerStarted,
  };
});

ipcMain.handle('relaunchForProfile', () => {
  app.relaunch();
  app.quit();
});

export default (params: { mainWindow: BrowserWindow }) => {
  ipcMain.on('startLocalServer', (_event, data?: { profileEmail?: string }) => {
    (async () => {
      if (!normalizeProfileEmail(data?.profileEmail)) {
        return;
      }

      if (!localServerStarted) {
        // Set flag immediately to prevent race condition
        localServerStarted = true;

        setProfileEmail(data?.profileEmail);

        // Find next unused port for server
        port = LOCAL_PORT;
        // eslint-disable-next-line no-await-in-loop
        while ((await portInUse(port)) && port < LOCAL_PORT + 10) {
          port += 1;
        }
        token = randomBytes(256 / 8).toString('base64url');

        try {
          await server(userDataPath(), port, token);
        } catch (error) {
          // Reset flag on failure so retry is possible
          localServerStarted = false;
          throw error;
        }
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
