jest.mock('../../../src/whatsapp-automation/api/auth', () => ({
  getApiKey: jest.fn(),
}));
jest.mock('../../../src/performance/renderer', () => ({
  isRendererInitialized: jest.fn(() => true),
  recordMetric: jest.fn(),
}));

const {
  useCustomInstance,
}: typeof import('../../../src/whatsapp-automation/api/customInstance') = require('../../../src/whatsapp-automation/api/customInstance');
const {
  getApiKey,
}: typeof import('../../../src/whatsapp-automation/api/auth') = require('../../../src/whatsapp-automation/api/auth');
const {
  recordMetric,
}: typeof import('../../../src/performance/renderer') = require('../../../src/performance/renderer');
const { METRICS } = require('../../../src/performance/types');

const mockedFetch = jest.fn<
  ReturnType<typeof fetch>,
  Parameters<typeof fetch>
>();
const mockedGetApiKey = jest.mocked(getApiKey);
const mockedRecordMetric = jest.mocked(recordMetric);

const response = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });

describe('WhatsApp Automation custom instance', () => {
  beforeAll(() => {
    global.fetch = mockedFetch;
  });

  beforeEach(() => {
    mockedFetch.mockReset();
    mockedGetApiKey.mockReset();
    mockedGetApiKey.mockReturnValue('test-api-key');
    mockedRecordMetric.mockClear();
  });

  it('records request_ms and preserves Orval success shape', async () => {
    mockedFetch.mockResolvedValue(response({ data: [{ id: 's1' }] }, 200));

    const result = await useCustomInstance<{ data: { id: string }[] }>(
      '/api/session',
    );

    expect(result).toMatchObject({ data: [{ id: 's1' }], status: 200 });
    expect(mockedRecordMetric).toHaveBeenCalledWith(
      METRICS.WHATSAPP_AUTOMATION_REQUEST,
      expect.any(Number),
      'ms',
      'renderer',
      { method: 'GET', api_group: 'session', status: 'ok' },
    );
  });

  it('records request_error on HTTP failure and rethrows', async () => {
    mockedFetch.mockResolvedValue(response({ message: 'bad request' }, 400));

    await expect(useCustomInstance('/api/session')).rejects.toMatchObject({
      message: 'bad request',
      status: 400,
    });
    expect(mockedRecordMetric).toHaveBeenCalledWith(
      METRICS.WHATSAPP_AUTOMATION_REQUEST_ERROR,
      1,
      'count',
      'renderer',
      { method: 'GET', api_group: 'session', status: 'error' },
    );
  });

  it('composes caller signal: caller abort cancels the fetch', async () => {
    const callerController = new AbortController();
    const abortError = new DOMException('aborted', 'AbortError');
    mockedFetch.mockImplementation(
      (_url: any, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(abortError));
        }),
    );

    const promise = useCustomInstance('/api/session', {
      signal: callerController.signal,
    });
    // Allow the operation to register its abort listener
    await new Promise<void>(resolve => {
      setTimeout(resolve, 10);
    });
    callerController.abort();
    await expect(promise).rejects.toBe(abortError);
    expect(mockedRecordMetric).toHaveBeenCalledWith(
      METRICS.WHATSAPP_AUTOMATION_REQUEST,
      expect.any(Number),
      'ms',
      'renderer',
      { method: 'GET', api_group: 'session', status: 'cancelled' },
    );
  });

  it('does not emit metrics when performance is disabled', async () => {
    const {
      isRendererInitialized,
    }: typeof import('../../../src/performance/renderer') = require('../../../src/performance/renderer');
    jest.mocked(isRendererInitialized).mockReturnValue(false);
    mockedFetch.mockResolvedValue(response({ data: [] }, 200));

    await useCustomInstance('/api/session');
    expect(mockedRecordMetric).not.toHaveBeenCalled();
    jest.mocked(isRendererInitialized).mockReturnValue(true);
  });
});

// eslint-disable-next-line jest/no-export
export type {};
