import type { IRecipe } from '../../src/models/Recipe';

jest.mock('@electron/remote', () => ({
  webContents: { fromId: jest.fn(() => null) },
}));
jest.mock('electron', () => ({
  app: {
    getLocale: jest.fn(() => 'en'),
    getPath: jest.fn(() => ''),
    getVersion: jest.fn(() => 'test'),
    name: 'Aitalk',
    setPath: jest.fn(),
  },
  ipcRenderer: { send: jest.fn() },
}));
jest.mock(
  '../../src/agent-flow-cs/api/generated/conversations/conversations',
  () => ({
    getConversationByCustomerApiV1ConversationsByCustomerCustomerIdGet: jest.fn(
      async () => ({ data: {} }),
    ),
  }),
);
jest.mock('../../src/agent-flow-cs/api/generated/translate/translate', () => ({
  translateApiV1TranslatePost: jest.fn(async () => ({ data: {} })),
}));
jest.mock('../../src/agent-flow-cs/api/generated/whatsapp/whatsapp', () => ({
  getWhatsappBindingApiV1WhatsappBindGet: jest.fn(async () => ({ data: {} })),
}));
jest.mock('../../src/agent-flow-cs/api/sse', () => ({
  subscribeConversationLive: jest.fn(() => ({ close: jest.fn() })),
  subscribeConversationStatus: jest.fn(() => ({ close: jest.fn() })),
}));
jest.mock('../../src/features/todos/index', () => ({
  todosStore: { todoRecipeId: 'todos', webview: null },
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
const conversationsApi = require('../../src/agent-flow-cs/api/generated/conversations/conversations');
const translateApi = require('../../src/agent-flow-cs/api/generated/translate/translate');

type IpcHandler = (event: {
  args: unknown[];
  channel: string;
}) => Promise<void> | void;

const createService = () => {
  window.ferdium = {
    stores: { settings: { app: { hibernateOnStartup: false } } },
  } as typeof window.ferdium;
  const handlers: Record<string, IpcHandler> = {};
  const send = jest.fn();
  const service = new Service({ id: 'service-1', name: 'WhatsApp' }, {
    id: 'whatsapp',
    name: 'WhatsApp',
    path: '/recipes/whatsapp',
    serviceURL: 'https://web.whatsapp.com',
  } as IRecipe);
  service.webview = {
    addEventListener: jest.fn((event: string, handler: IpcHandler) => {
      handlers[event] = handler;
    }),
    executeJavaScript: jest.fn(),
    getWebContentsId: jest.fn(() => 1),
    send,
  } as never;
  service.initializeWebViewEvents({
    handleIPCMessage: jest.fn(),
    openWindow: jest.fn(),
    stores: {},
  });
  return { handler: handlers['ipc-message'], send };
};

const request = (overrides: Record<string, unknown> = {}) => ({
  api: 'conversations',
  args: ['customer-1', { platform: 'whatsapp' }],
  method: 'getConversationByCustomerApiV1ConversationsByCustomerCustomerIdGet',
  requestId: `request-${Math.random()}`,
  ...overrides,
});

describe('Service wa-ai-api-request IPC', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rate limits bursts above 20 requests per API per second', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000_000_000_000);
    const { handler, send } = createService();

    for (let index = 0; index < 21; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      await handler({
        args: [
          request({
            api: 'translate',
            args: [{ target_language: 'zh', text: String(index) }],
            method: 'translateApiV1TranslatePost',
            requestId: `burst-${index}`,
          }),
        ],
        channel: 'wa-ai-api-request',
      });
    }

    expect(translateApi.translateApiV1TranslatePost).toHaveBeenCalledTimes(20);
    expect(send).toHaveBeenCalledTimes(21);
    expect(send).toHaveBeenLastCalledWith(
      'wa-ai-api-response-host',
      expect.objectContaining({
        requestId: 'burst-20',
        success: false,
        error: 'Rate limit exceeded',
      }),
    );
    now.mockRestore();
  });

  it.each([request({ api: 'unknown' }), request({ method: 'constructor' })])(
    'rejects operations outside the allowlist',
    async payload => {
      const { handler, send } = createService();
      await handler({ args: [payload], channel: 'wa-ai-api-request' });

      expect(
        conversationsApi.getConversationByCustomerApiV1ConversationsByCustomerCustomerIdGet,
      ).not.toHaveBeenCalled();
      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith(
        'wa-ai-api-response-host',
        expect.objectContaining({
          requestId: payload.requestId,
          success: false,
          error: 'Operation not allowed',
        }),
      );
    },
  );

  it.each([
    request({ requestId: '' }),
    request({ requestId: undefined }),
    request({ args: 'not-an-array' }),
    null,
  ])('rejects malformed payloads', async payload => {
    const { handler, send } = createService();
    await handler({ args: [payload], channel: 'wa-ai-api-request' });

    expect(
      conversationsApi.getConversationByCustomerApiV1ConversationsByCustomerCustomerIdGet,
    ).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('calls a valid allowlisted operation', async () => {
    const { handler, send } = createService();
    await handler({ args: [request()], channel: 'wa-ai-api-request' });

    expect(
      conversationsApi.getConversationByCustomerApiV1ConversationsByCustomerCustomerIdGet,
    ).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      'wa-ai-api-response-host',
      expect.objectContaining({ success: true }),
    );
  });
});
