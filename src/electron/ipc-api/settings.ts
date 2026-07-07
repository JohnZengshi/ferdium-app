import { type BrowserWindow, type Settings, ipcMain } from 'electron';

const setSettingsProfile = (
  settings: Settings,
  email?: string | null,
): void => {
  for (const store of Object.values(settings)) {
    store.setProfileEmail?.(email);
  }
};

export default (params: { mainWindow: BrowserWindow; settings: Settings }) => {
  ipcMain.on('getAppSettings', (_event, args) => {
    const type = typeof args === 'string' ? args : args.type;
    if (typeof args !== 'string' && 'profileEmail' in args) {
      setSettingsProfile(params.settings, args.profileEmail);
    }
    params.mainWindow.webContents.send('appSettings', {
      type,
      data: params.settings[type].allSerialized,
    });
  });

  ipcMain.on('updateAppSettings', (_event, args) => {
    if ('profileEmail' in args) {
      setSettingsProfile(params.settings, args.profileEmail);
    }
    params.settings[args.type].set(args.data);
  });
};
