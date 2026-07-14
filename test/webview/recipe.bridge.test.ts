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

describe('DarkReader root readiness', () => {
  it('replays only the latest operation once the document root exists', () => {
    jest.resetModules();
    jest.useFakeTimers();

    let observerCallback: MutationCallback | undefined;
    const observe = jest.fn();
    const disconnect = jest.fn();
    class MutationObserverMock {
      constructor(callback: MutationCallback) {
        observerCallback = callback;
      }

      observe = observe;

      disconnect = disconnect;

      takeRecords = jest.fn(() => []);
    }

    const documentMock = {
      addEventListener: jest.fn(),
      documentElement: null as HTMLElement | null,
    };
    const windowMock = {
      addEventListener: jest.fn(),
      chrome: { runtime: { sendMessage: jest.fn() } },
      history: { back: jest.fn(), forward: jest.fn() },
      location: { host: 'service.example', origin: 'https://service.example' },
      open: jest.fn(),
      postMessage: jest.fn(),
    };
    Object.defineProperties(globalThis, {
      chrome: { configurable: true, value: windowMock.chrome },
      document: { configurable: true, value: documentMock },
      location: { configurable: true, value: windowMock.location },
      MutationObserver: {
        configurable: true,
        value: MutationObserverMock,
      },
      window: { configurable: true, value: windowMock },
    });

    const {
      disableDarkMode,
      enableDarkMode,
    } = require('../../src/webview/recipe');
    const { disable, enable } = require('darkreader');
    const theme = { brightness: 90 };

    enableDarkMode(theme);
    disableDarkMode();
    enableDarkMode(theme);

    expect(enable).not.toHaveBeenCalled();
    expect(disable).not.toHaveBeenCalled();
    expect(observe).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledWith(documentMock, { childList: true });

    const { ipcRenderer } = require('electron');
    const cleanupHandler = (ipcRenderer.on as jest.Mock).mock.calls.find(
      ([channel]) => channel === 'dark-mode-disconnect-cleanup',
    )?.[1];
    expect(cleanupHandler).toEqual(expect.any(Function));
    cleanupHandler();
    expect(disconnect).toHaveBeenCalledTimes(1);

    enableDarkMode(theme);
    expect(observe).toHaveBeenCalledTimes(2);

    documentMock.documentElement = {} as HTMLElement;
    observerCallback?.([], {} as MutationObserver);
    observerCallback?.([], {} as MutationObserver);

    expect(enable).toHaveBeenCalledTimes(1);
    expect(enable).toHaveBeenCalledWith(theme);
    expect(disable).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledTimes(2);

    jest.clearAllTimers();
    jest.useRealTimers();
  });
});

describe('recipe preload injection ACK bridge', () => {
  it.each([
    ['web.whatsapp.com', 1],
    ['chat.web.whatsapp.com', 1],
    ['www.instagram.com', 1],
    ['service.example', 0],
  ])('gates WhatsApp bridge messages on hostname %s', (hostname, callCount) => {
    jest.resetModules();
    jest.useFakeTimers();

    let messageHandler: ((event: MessageEvent) => void) | undefined;
    const windowMock = {
      addEventListener: jest.fn((type: string, handler: EventListener) => {
        if (type === 'message') {
          messageHandler = handler as (event: MessageEvent) => void;
        }
      }),
      chrome: { runtime: { sendMessage: jest.fn() } },
      history: { back: jest.fn(), forward: jest.fn() },
      location: {
        host: hostname,
        hostname,
        origin: `https://${hostname}`,
      },
      open: jest.fn(),
      postMessage: jest.fn(),
    };
    Object.defineProperties(globalThis, {
      chrome: { configurable: true, value: windowMock.chrome },
      document: {
        configurable: true,
        value: { addEventListener: jest.fn(), documentElement: {} },
      },
      location: { configurable: true, value: windowMock.location },
      window: { configurable: true, value: windowMock },
    });

    require('../../src/webview/recipe');
    const { ipcRenderer } = require('electron');
    const payload = {
      api: 'translate',
      args: [{ text: 'hello', target_language: 'zh' }],
      method: 'translateApiV1TranslatePost',
      requestId: 'request-1',
    };

    messageHandler?.({
      data: { type: 'wa-ai-api-request', payload },
      origin: windowMock.location.origin,
      source: windowMock,
    } as unknown as MessageEvent);

    const forwardedRequests = (
      ipcRenderer.sendToHost as jest.Mock
    ).mock.calls.filter(([channel]) => channel === 'wa-ai-api-request');
    expect(forwardedRequests).toHaveLength(callCount);
    expect(forwardedRequests).toEqual(
      callCount ? [['wa-ai-api-request', payload]] : [],
    );

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('forwards inject-js-unsafe-ack payload to the main world', () => {
    jest.resetModules();
    jest.useFakeTimers();

    const postMessage = jest.fn();
    const windowMock = {
      addEventListener: jest.fn(),
      chrome: { runtime: { sendMessage: jest.fn() } },
      history: { back: jest.fn(), forward: jest.fn() },
      location: {
        host: 'service.example',
        hostname: 'service.example',
        origin: 'https://service.example',
      },
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
