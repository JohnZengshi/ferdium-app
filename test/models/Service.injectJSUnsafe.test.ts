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
    const send = jest.fn();
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
      send,
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

    expect(send).toHaveBeenCalledWith('inject-js-unsafe-ack', {
      name: 'unsafe-script-0',
      index: 0,
      success: true,
    });
    expect(send).toHaveBeenCalledWith('inject-js-unsafe-ack', {
      name: 'unsafe-script-1',
      index: 1,
      success: true,
    });
    expect(send).toHaveBeenCalledWith('inject-js-unsafe-ack', {
      name: 'unsafe-script-2',
      index: 2,
      success: true,
    });
  });

  it('continues after a failed script and reports the error', async () => {
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
    const send = jest.fn();
    const executeJavaScript = jest
      .fn()
      .mockImplementationOnce(async (script: string) => {
        calls.push(script);
      })
      .mockImplementationOnce(async () => {
        throw new Error('boom');
      })
      .mockImplementationOnce(async (script: string) => {
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
      send,
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
      '"use strict"; (() => { third(); })();',
    ]);

    expect(send).toHaveBeenCalledWith('inject-js-unsafe-ack', {
      name: 'unsafe-script-0',
      index: 0,
      success: true,
    });
    expect(send).toHaveBeenCalledWith('inject-js-unsafe-ack', {
      name: 'unsafe-script-1',
      index: 1,
      success: false,
      error: 'boom',
    });
    expect(send).toHaveBeenCalledWith('inject-js-unsafe-ack', {
      name: 'unsafe-script-2',
      index: 2,
      success: true,
    });
  });

  it('echoes the seq field from object script arguments in the ACK', async () => {
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
    const executeJavaScript = jest.fn(async () => {});
    const send = jest.fn();
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
      send,
      getWebContentsId: jest.fn(() => 1),
    } as never;

    service.initializeWebViewEvents({
      handleIPCMessage: jest.fn(),
      openWindow: jest.fn(),
      stores: {},
    });

    await handlers['ipc-message']({
      args: [
        { name: 'a.js', source: 'a();', seq: 0 },
        { name: 'b.js', source: 'b();', seq: 1 },
      ],
      channel: 'inject-js-unsafe',
    });

    expect(executeJavaScript).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith('inject-js-unsafe-ack', {
      name: 'a.js',
      index: 0,
      seq: 0,
      success: true,
    });
    expect(send).toHaveBeenCalledWith('inject-js-unsafe-ack', {
      name: 'b.js',
      index: 1,
      seq: 1,
      success: true,
    });
  });

  it('skips malformed script arguments and processes valid ones', async () => {
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
    const executeJavaScript = jest.fn(async () => {});
    const send = jest.fn();
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
      send,
      getWebContentsId: jest.fn(() => 1),
    } as never;

    service.initializeWebViewEvents({
      handleIPCMessage: jest.fn(),
      openWindow: jest.fn(),
      stores: {},
    });

    await handlers['ipc-message']({
      args: [
        null,
        { name: 'valid.js', source: 'valid();' },
        { source: 123 },
        'plain-string();',
      ],
      channel: 'inject-js-unsafe',
    });

    expect(executeJavaScript).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith('inject-js-unsafe-ack', {
      name: 'valid.js',
      index: 0,
      seq: undefined,
      success: true,
    });
    expect(send).toHaveBeenCalledWith('inject-js-unsafe-ack', {
      name: 'unsafe-script-3',
      index: 1,
      seq: undefined,
      success: true,
    });
  });

  it('defaults object metadata and stringifies non-Error rejections', async () => {
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
    const executeJavaScript = jest
      .fn()
      .mockImplementationOnce(async () => {})
      .mockRejectedValueOnce('string failure');
    const send = jest.fn();
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
      send,
      getWebContentsId: jest.fn(() => 1),
    } as never;

    service.initializeWebViewEvents({
      handleIPCMessage: jest.fn(),
      openWindow: jest.fn(),
      stores: {},
    });

    await handlers['ipc-message']({
      args: [
        null,
        { source: 'missingName();' },
        { name: 123, source: 'invalidMetadata();', seq: 'invalid' },
      ],
      channel: 'inject-js-unsafe',
    });

    expect(send).toHaveBeenCalledWith('inject-js-unsafe-ack', {
      name: 'unsafe-script-1',
      index: 0,
      seq: undefined,
      success: true,
    });
    expect(send).toHaveBeenCalledWith('inject-js-unsafe-ack', {
      name: 'unsafe-script-2',
      index: 1,
      seq: undefined,
      success: false,
      error: 'string failure',
    });
  });

  it('does nothing for empty script arguments', async () => {
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
    const executeJavaScript = jest.fn(async () => {});
    const send = jest.fn();
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
      send,
      getWebContentsId: jest.fn(() => 1),
    } as never;

    service.initializeWebViewEvents({
      handleIPCMessage: jest.fn(),
      openWindow: jest.fn(),
      stores: {},
    });

    await handlers['ipc-message']({
      args: [],
      channel: 'inject-js-unsafe',
    });

    expect(executeJavaScript).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
