jest.mock('../../src/performance/renderer', () => ({
  isRendererInitialized: jest.fn(() => true),
  recordMetric: jest.fn(),
}));

const {
  beginSseMetrics,
  classifyRequestError,
  trackRequest,
}: typeof import('../../src/performance/request') = require('../../src/performance/request');
const {
  isRendererInitialized,
  recordMetric,
}: typeof import('../../src/performance/renderer') = require('../../src/performance/renderer');
const { METRICS } = require('../../src/performance/types');

const mockedIsRendererInitialized = jest.mocked(isRendererInitialized);
const mockedRecordMetric = jest.mocked(recordMetric);

describe('performance request metrics', () => {
  beforeEach(() => {
    mockedIsRendererInitialized.mockReturnValue(true);
    mockedRecordMetric.mockClear();
  });

  it('records success, pending high watermark, and safe fixed tags', async () => {
    await trackRequest(
      'whatsapp_automation',
      'https://api.test/api/session/secret?token=should-not-appear',
      'post',
      () => Promise.resolve({ ok: true }),
    );

    expect(mockedRecordMetric).toHaveBeenCalledWith(
      METRICS.WHATSAPP_AUTOMATION_PENDING_HIGH_WATERMARK,
      1,
      'count',
      'renderer',
      { method: 'POST', api_group: 'session' },
    );
    expect(mockedRecordMetric).toHaveBeenCalledWith(
      METRICS.WHATSAPP_AUTOMATION_REQUEST,
      expect.any(Number),
      'ms',
      'renderer',
      { method: 'POST', api_group: 'session', status: 'ok' },
    );
    expect(JSON.stringify(mockedRecordMetric.mock.calls)).not.toContain(
      'should-not-appear',
    );
  });

  it.each([
    [new Error('network'), 'error'],
    [Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }), 'timeout'],
    [new DOMException('aborted', 'AbortError'), 'cancelled'],
  ])('classifies %s without changing rejection', async (error, status) => {
    expect(classifyRequestError(error)).toBe(status);
    await expect(
      trackRequest('agent_flow', '/api/v1/agent-workflow', 'GET', async () => {
        throw error;
      }),
    ).rejects.toBe(error);

    expect(mockedRecordMetric).toHaveBeenCalledWith(
      METRICS.AGENT_FLOW_REQUEST,
      expect.any(Number),
      'ms',
      'renderer',
      { method: 'GET', api_group: 'agent', status },
    );
  });

  it('does not emit when performance is disabled', async () => {
    mockedIsRendererInitialized.mockReturnValue(false);
    await trackRequest(
      'agent_flow',
      '/api/auth/login?email=private',
      'POST',
      () => Promise.resolve(null),
    );
    expect(mockedRecordMetric).not.toHaveBeenCalled();
  });

  it('records cancelled status when caller aborts', async () => {
    const callerController = new AbortController();
    const promise = trackRequest(
      'agent_flow',
      '/api/v1/auth/login',
      'POST',
      signal =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
      callerController.signal,
    );
    // Allow the operation to register its abort listener
    await new Promise<void>(resolve => {
      setTimeout(resolve, 10);
    });
    callerController.abort();
    await expect(promise).rejects.toBeTruthy();
    expect(mockedRecordMetric).toHaveBeenCalledWith(
      METRICS.AGENT_FLOW_REQUEST,
      expect.any(Number),
      'ms',
      'renderer',
      { method: 'POST', api_group: 'auth', status: 'cancelled' },
    );
  });
});

it('records timeout status when operation rejects with TimeoutError', async () => {
  const timeoutError = new DOMException('request timeout', 'TimeoutError');
  await expect(
    trackRequest('agent_flow', '/api/v1/handoff/read', 'GET', () =>
      Promise.reject(timeoutError),
    ),
  ).rejects.toBe(timeoutError);

  expect(mockedRecordMetric).toHaveBeenCalledWith(
    METRICS.AGENT_FLOW_REQUEST,
    expect.any(Number),
    'ms',
    'renderer',
    { method: 'GET', api_group: 'agent', status: 'timeout' },
  );
  expect(mockedRecordMetric).toHaveBeenCalledWith(
    METRICS.AGENT_FLOW_REQUEST_TIMEOUT,
    1,
    'count',
    'renderer',
    { method: 'GET', api_group: 'agent', status: 'timeout' },
  );
});

describe('SSE performance lifecycle', () => {
  beforeEach(() => {
    mockedIsRendererInitialized.mockReturnValue(true);
    mockedRecordMetric.mockClear();
  });

  it('records open/error/close once per subscription', () => {
    const metrics = beginSseMetrics('conversation');
    metrics.open();
    metrics.open();
    metrics.error();
    metrics.close('error');
    metrics.close('server_closed');

    expect(
      mockedRecordMetric.mock.calls.filter(
        ([name]) => name === METRICS.AGENT_FLOW_SSE_OPEN,
      ),
    ).toHaveLength(1);
    expect(
      mockedRecordMetric.mock.calls.filter(
        ([name]) => name === METRICS.AGENT_FLOW_SSE_ERROR,
      ),
    ).toHaveLength(1);
    expect(
      mockedRecordMetric.mock.calls.filter(
        ([name]) => name === METRICS.AGENT_FLOW_SSE_CLOSE,
      ),
    ).toHaveLength(1);
  });

  it('does not emit when performance is disabled', () => {
    mockedIsRendererInitialized.mockReturnValue(false);
    const metrics = beginSseMetrics('conversation');
    metrics.open();
    metrics.close('cancelled');
    expect(mockedRecordMetric).not.toHaveBeenCalled();
  });
});

// eslint-disable-next-line jest/no-export
export type {};
