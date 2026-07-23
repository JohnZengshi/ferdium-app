import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, app, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import semver from 'semver';
// eslint-disable-next-line import/no-cycle
import { appEvents } from '../..';
import { isMac, isSnap } from '../../environment';

const debug = require('../../preload-safe-debug')('Ferdium:ipcApi:autoUpdate');

type DownloadedUpdateEvent = {
  downloadedFile?: string;
};

type UpdateChannel = 'beta' | 'latest';

type PendingUpdateCandidate = {
  channel: UpdateChannel;
  version: string;
};

let downloadedUpdatePath: string | null = null;

const selectBestCandidate = (candidates: PendingUpdateCandidate[]) => {
  let best: PendingUpdateCandidate | null = null;

  for (const candidate of candidates) {
    if (
      semver.gt(candidate.version, app.getVersion()) &&
      (!best || semver.gt(candidate.version, best.version))
    ) {
      best = candidate;
    }
  }

  return best;
};

function customMacInstall(zipPath: string) {
  const appBundlePath = path.dirname(
    path.dirname(path.dirname(app.getPath('exe'))),
  );
  const installDir = path.dirname(appBundlePath);

  const script = `#!/bin/bash
sleep 2
rm -rf "${appBundlePath}"
unzip -q "${zipPath}" -d "${installDir}"
xattr -dr com.apple.quarantine "${appBundlePath}"
open "${appBundlePath}"
rm -f "$0"
`;

  if (!app.isPackaged) {
    debug('dev mode: install script generated but not executed');
    debug(script);
    return;
  }

  const scriptPath = path.join(app.getPath('temp'), 'aitalk-install-update.sh');
  fs.writeFileSync(scriptPath, script);
  fs.chmodSync(scriptPath, 0o755);

  spawn('/bin/bash', [scriptPath], {
    detached: true,
    stdio: 'ignore',
  }).unref();

  app.quit();
}

export default (params: { mainWindow: BrowserWindow; settings: any }) => {
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.autoDownload = false;

  // The following line is a workaround to force the development update. Should only be used for development purposes.
  // autoUpdater.forceDevUpdateConfig = true;

  // Disable auto download for snap packages
  // since the snap store will handle the update.
  if (isSnap) {
    autoUpdater.autoDownload = false;
  }

  let isProbing = false;
  let hasUpdateCandidate = false;

  const probeChannel = async (channel: UpdateChannel) => {
    autoUpdater.channel = channel;
    autoUpdater.allowPrerelease = channel === 'beta';
    autoUpdater.autoDownload = false;
    debug(`probing ${channel} channel`);

    try {
      const result = await autoUpdater.checkForUpdates();
      const version = result?.updateInfo?.version;
      return version ? { channel, version } : null;
    } catch (error) {
      debug(`probe ${channel} channel failed`);
      debug(error);
      return null;
    }
  };

  const runFinalCheck = (channel: UpdateChannel) => {
    hasUpdateCandidate = false;
    autoUpdater.channel = channel;
    autoUpdater.allowPrerelease = channel === 'beta';
    autoUpdater.allowDowngrade = false;
    autoUpdater.autoDownload = !isSnap;
    debug(`checking selected ${channel} channel`);
    autoUpdater.checkForUpdates();
  };

  const startCheck = async (event: Electron.IpcMainEvent) => {
    const isBetaUpdateEnabled = Boolean(params.settings.app.get('beta'));

    if (!isBetaUpdateEnabled) {
      runFinalCheck('latest');
      return;
    }

    isProbing = true;
    const candidates: PendingUpdateCandidate[] = [];

    const latestCandidate = await probeChannel('latest');
    if (latestCandidate) candidates.push(latestCandidate);

    const betaCandidate = await probeChannel('beta');
    if (betaCandidate) candidates.push(betaCandidate);

    isProbing = false;

    const best = selectBestCandidate(candidates);

    if (!best) {
      event.sender.send('autoUpdate', { available: false });
      return;
    }

    runFinalCheck(best.channel);
  };

  debug('[autoUpdate] IPC handler registered');
  ipcMain.on('autoUpdate', (event, args) => {
    try {
      autoUpdater.autoInstallOnAppQuit = false;

      // Performance monitoring: skip update checks entirely
      if (
        process.env.PERFORMANCE_METRICS === '1' &&
        process.env.SKIP_AUTO_UPDATE === '1'
      ) {
        debug('skipping update check (SKIP_AUTO_UPDATE=1)');
        event.sender.send('autoUpdate', { available: false });
        return;
      }

      if (args.action === 'check') {
        const automaticUpdatesEnabled = Boolean(
          params.settings.app.get('automaticUpdates'),
        );
        if (!automaticUpdatesEnabled) {
          event.sender.send('autoUpdate', { available: false });
          return;
        }

        debug('checking for update');

        if (!app.isPackaged && !autoUpdater.forceDevUpdateConfig) {
          debug('skipping update check in dev mode');
          event.sender.send('autoUpdate', { available: false });
          return;
        }

        startCheck(event).catch(() => {
          isProbing = false;
          event.sender.send('autoUpdate', { available: false });
        });
      } else if (args.action === 'install') {
        // If the app is a snap, auto-updates are not supported.
        // The snap store will handle updates, therefore the user should be prompted to update through snap store.
        if (isSnap) {
          return;
        }

        debug('installing update');

        appEvents.emit('install-update');

        if (isMac && downloadedUpdatePath) {
          const openedWindows = BrowserWindow.getAllWindows();
          for (const window of openedWindows) window.close();
          customMacInstall(downloadedUpdatePath);
          return;
        }

        const openedWindows = BrowserWindow.getAllWindows();
        for (const window of openedWindows) window.close();

        autoUpdater.quitAndInstall();
      }
    } catch {
      event.sender.send('autoUpdate', { available: false });
    }
  });

  autoUpdater.on('update-not-available', () => {
    debug('update-not-available');

    if (isProbing) return;

    params.mainWindow.webContents.send('autoUpdate', { available: false });
  });

  autoUpdater.on('update-available', event => {
    debug('update-available');

    if (isProbing) return;

    hasUpdateCandidate = true;
    params.mainWindow.webContents.send('autoUpdate', {
      version: event.version,
      available: true,
    });
  });

  autoUpdater.on('download-progress', progressObj => {
    let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
    logMessage = `${logMessage} - Downloaded ${progressObj.percent}%`;
    logMessage = `${logMessage} (${progressObj.transferred}/${progressObj.total})`;

    debug(logMessage);
  });

  autoUpdater.on('update-downloaded', (event: DownloadedUpdateEvent) => {
    debug('update-downloaded');
    downloadedUpdatePath = event.downloadedFile ?? null;
    hasUpdateCandidate = true;
    params.mainWindow.webContents.send('autoUpdate', { downloaded: true });
  });

  autoUpdater.on('error', error => {
    debug('update-error');
    const isSignatureError = error?.message?.includes(
      'Could not get code signature',
    );
    if (isSignatureError) {
      debug('ignoring signature error (custom installer will handle install)');
      return;
    }

    if (isProbing) return;

    if (hasUpdateCandidate) {
      params.mainWindow.webContents.send('autoUpdate', {
        error: {
          message: error?.message,
        },
      });
      return;
    }

    params.mainWindow.webContents.send('autoUpdate', { available: false });
  });
};
