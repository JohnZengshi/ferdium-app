jest.mock('darkreader', () => ({ disable: jest.fn(), enable: jest.fn() }));
jest.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: jest.fn() },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    sendToHost: jest.fn(),
  },
}));
jest.mock('fs-extra', () => ({
  pathExistsSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.mock('lodash', () => ({
  debounce: jest.fn(callback => callback),
  noop: jest.fn(),
}));
jest.mock('mobx', () => ({
  autorun: jest.fn(),
  computed: jest.fn(),
  makeObservable: jest.fn(),
  observable: jest.fn(),
}));

jest.mock('../../src/preload-safe-debug', () => () => jest.fn());
jest.mock('../../src/config', () => ({ DEFAULT_APP_SETTINGS: {} }));
jest.mock('../../src/jsUtils', () => ({
  cleanseJSObject: jest.fn(value => value),
  ifUndefined: jest.fn((value, fallback) => value ?? fallback),
  safeParseInt: jest.fn(Number),
}));
jest.mock('../../src/webview/badge', () =>
  jest.fn().mockImplementation(() => ({ setBadge: jest.fn() })),
);
jest.mock('../../src/webview/contextMenu', () => jest.fn());
jest.mock('../../src/webview/darkmode', () => ({
  darkModeStyleExists: jest.fn(),
  injectDarkModeStyle: jest.fn(),
  isDarkModeStyleInjected: jest.fn(),
  removeDarkModeStyle: jest.fn(),
}));
jest.mock('../../src/webview/darkmode/custom', () => '');
jest.mock('../../src/webview/darkmode/ignore', () => []);
jest.mock('../../src/webview/dialogTitle', () =>
  jest.fn().mockImplementation(() => ({ setDialogTitle: jest.fn() })),
);
jest.mock('../../src/webview/find', () => jest.fn());
jest.mock('../../src/webview/lib/RecipeWebview', () => jest.fn());
jest.mock('../../src/webview/lib/Userscript', () => jest.fn());
jest.mock('../../src/webview/notifications', () => ({
  NotificationsHandler: jest
    .fn()
    .mockImplementation(() => ({ displayNotification: jest.fn() })),
  notificationsClassDefinition: '',
}));
jest.mock('../../src/webview/screenshare', () => ({
  getDisplayMediaSelector: jest.fn(),
  screenShareJs: '',
}));
jest.mock('../../src/webview/sessionHandler', () => jest.fn());
jest.mock('../../src/webview/spellchecker', () => ({
  getSpellcheckerLocaleByFuzzyIdentifier: jest.fn(),
  switchDict: jest.fn(),
}));

describe('recipe preload injection ACK bridge', () => {
  it('forwards inject-js-unsafe-ack payload to the main world', () => {
    jest.resetModules();
    jest.useFakeTimers();

    const postMessage = jest.fn();
    const windowMock = {
      addEventListener: jest.fn(),
      chrome: { runtime: { sendMessage: jest.fn() } },
      history: { back: jest.fn(), forward: jest.fn() },
      location: { origin: 'https://service.example' },
      open: jest.fn(),
      postMessage,
    };
    Object.defineProperties(globalThis, {
      chrome: { configurable: true, value: windowMock.chrome },
      document: {
        configurable: true,
        value: { addEventListener: jest.fn() },
      },
      location: { configurable: true, value: windowMock.location },
      window: { configurable: true, value: windowMock },
    });

    require('../../src/webview/recipe');

    const { ipcRenderer } = require('electron');
    const handler = (ipcRenderer.on as jest.Mock).mock.calls.find(
      ([channel]) => channel === 'inject-js-unsafe-ack',
    )?.[1];
    const payload = { name: 'overlay.js', seq: 4, success: true };

    expect(handler).toEqual(expect.any(Function));
    handler({}, payload);
    expect(postMessage).toHaveBeenCalledWith(
      { type: 'ferdium-injection-ack', payload },
      windowMock.location.origin,
    );

    jest.clearAllTimers();
    jest.useRealTimers();
  });
});
