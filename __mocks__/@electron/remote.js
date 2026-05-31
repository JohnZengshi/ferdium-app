module.exports = {
  app: {
    getPath: jest.fn(() => '/mock/path'),
    getName: jest.fn(() => 'Ferdium'),
    getVersion: jest.fn(() => '1.0.0'),
    getLocale: jest.fn(() => 'en-US'),
    setPath: jest.fn(),
    name: 'Ferdium',
  },
  BrowserWindow: jest.fn(),
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showMessageBox: jest.fn(),
  },
};
