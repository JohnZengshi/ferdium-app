// Mock for @electron/remote module
const mockRemote = {
  nativeTheme: {
    on: jest.fn(),
    off: jest.fn(),
    shouldUseDarkColors: false,
    themeSource: 'system',
  },
  getCurrentWindow: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    setSize: jest.fn(),
    getSize: jest.fn(() => [1024, 768]),
    setPosition: jest.fn(),
    getPosition: jest.fn(() => [0, 0]),
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    minimize: jest.fn(),
    maximize: jest.fn(),
    unmaximize: jest.fn(),
    isMaximized: jest.fn(() => false),
    isMinimized: jest.fn(() => false),
    setAlwaysOnTop: jest.fn(),
    webContents: {
      openDevTools: jest.fn(),
      closeDevTools: jest.fn(),
      isDevToolsOpened: jest.fn(() => false),
      session: {
        setProxy: jest.fn(),
        webRequest: {
          onBeforeSendHeaders: jest.fn(),
          onHeadersReceived: jest.fn(),
        },
      },
    },
  })),
  session: {
    fromPartition: jest.fn(() => ({
      setProxy: jest.fn(),
      webRequest: {
        onBeforeSendHeaders: jest.fn(),
        onHeadersReceived: jest.fn(),
      },
    })),
    defaultSession: {
      setProxy: jest.fn(),
      webRequest: {
        onBeforeSendHeaders: jest.fn(),
        onHeadersReceived: jest.fn(),
      },
    },
  },
  webContents: {
    getAllWebContents: jest.fn(() => []),
    fromId: jest.fn(),
  },
  Menu: {
    buildFromTemplate: jest.fn(() => ({
      popup: jest.fn(),
    })),
    setApplicationMenu: jest.fn(),
  },
  MenuItem: jest.fn(),
  BrowserWindow: {
    getAllWindows: jest.fn(() => []),
    fromId: jest.fn(),
    getFocusedWindow: jest.fn(),
  },
  app: {
    getVersion: jest.fn(() => '0.0.0-test'),
    getName: jest.fn(() => 'Ferdium'),
    getPath: jest.fn(name => `/mock/${name}`),
  },
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showMessageBox: jest.fn(),
  },
  shell: {
    openExternal: jest.fn(),
    showItemInFolder: jest.fn(),
  },
  clipboard: {
    readText: jest.fn(() => ''),
    writeText: jest.fn(),
  },
  ipcRenderer: {
    on: jest.fn(),
    once: jest.fn(),
    send: jest.fn(),
    invoke: jest.fn(),
  },
  ipcMain: {
    on: jest.fn(),
    once: jest.fn(),
    handle: jest.fn(),
  },
};

module.exports = mockRemote;
