import type { IRecipe } from '../../src/models/Recipe';

jest.mock('@electron/remote', () => ({
  webContents: {
    fromId: jest.fn(() => null),
  },
}));

jest.mock('electron', () => ({
  app: {
    getLocale: jest.fn(() => 'en'),
    getPath: jest.fn(() => ''),
    getVersion: jest.fn(() => 'test'),
    name: 'Aitalk',
    setPath: jest.fn(),
  },
  ipcRenderer: {
    send: jest.fn(),
  },
}));

jest.mock(
  '../../src/agent-flow-cs/api/generated/conversations/conversations',
  () => ({}),
);
jest.mock(
  '../../src/agent-flow-cs/api/generated/translate/translate',
  () => ({}),
);
jest.mock(
  '../../src/agent-flow-cs/api/generated/whatsapp/whatsapp',
  () => ({}),
);
jest.mock('../../src/agent-flow-cs/api/sse', () => ({
  subscribeConversationLive: jest.fn(),
  subscribeConversationStatus: jest.fn(),
}));
jest.mock('../../src/features/todos/index', () => ({
  todosStore: {
    todoRecipeId: 'todos',
    webview: null,
  },
}));
jest.mock('../../src/models/UserAgent', () =>
  jest.fn().mockImplementation(() => ({
    defaultUserAgent: '',
    setWebviewReference: jest.fn(),
    userAgent: '',
    userAgentPref: null,
  })),
);

Object.defineProperty(globalThis, 'Element', { value: function Element() {} });
Object.defineProperty(globalThis, 'window', { value: globalThis });
Object.defineProperty(globalThis, 'localStorage', { value: {} });

const Service = require('../../src/models/Service').default;

describe('Service inject-js-unsafe IPC', () => {
  it('executes unsafe scripts sequentially with the existing wrapper', async () => {
    window.ferdium = {
      stores: {
        settings: {
          app: {
            hibernateOnStartup: false,
          },
        },
      },
    } as typeof window.ferdium;

    const handlers: Record<string, (event: unknown) => Promise<void> | void> =
      {};
    const calls: string[] = [];
    const executeJavaScript = jest.fn(async (script: string) => {
      calls.push(script);
    });
    const service = new Service({ id: 'service-1', name: 'WhatsApp' }, {
      id: 'whatsapp',
      name: 'WhatsApp',
      path: '/recipes/whatsapp',
      serviceURL: 'https://web.whatsapp.com',
    } as IRecipe);

    service.webview = {
      addEventListener: jest.fn(
        (event: string, handler: (typeof handlers)[string]) => {
          handlers[event] = handler;
        },
      ),
      executeJavaScript,
      getWebContentsId: jest.fn(() => 1),
    } as never;

    service.initializeWebViewEvents({
      handleIPCMessage: jest.fn(),
      openWindow: jest.fn(),
      stores: {},
    });

    await handlers['ipc-message']({
      args: ['first();', 'second();', 'third();'],
      channel: 'inject-js-unsafe',
    });

    expect(calls).toEqual([
      '"use strict"; (() => { first(); })();',
      '"use strict"; (() => { second(); })();',
      '"use strict"; (() => { third(); })();',
    ]);
  });
});
