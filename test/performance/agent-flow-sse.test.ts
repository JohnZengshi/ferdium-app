jest.mock('tdesign-react', () => ({ MessagePlugin: { error: jest.fn() } }));
jest.mock('../../src/whatsapp-automation/api/auth', () => ({
  getApiKey: jest.fn(),
}));
jest.mock('../../src/agent-flow-cs/api/auth', () => ({
  getAccessToken: jest.fn(),
}));
jest.mock('../../src/performance/renderer', () => ({
  isRendererInitialized: jest.fn(() => true),
  recordMetric: jest.fn(),
}));

const {
  subscribeSSE,
}: typeof import('../../src/agent-flow-cs/api/sse') = require('../../src/agent-flow-cs/api/sse');
const {
  recordMetric,
}: typeof import('../../src/performance/renderer') = require('../../src/performance/renderer');
const { METRICS } = require('../../src/performance/types');

const mockedRecordMetric = jest.mocked(recordMetric);

const makeStream = (chunks: string[], close = true) => {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]));
        i += 1;
      } else if (close) {
        controller.close();
      }
    },
  });
};

describe('Agent Flow SSE metrics lifecycle', () => {
  beforeEach(() => {
    mockedRecordMetric.mockClear();
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        makeStream(['event: status\ndata: {"status":"active"}\n\n']),
        {
          headers: { 'Content-Type': 'text/event-stream' },
        },
      ),
    ) as jest.Mock;
  });

  const calls = (name: string) =>
    mockedRecordMetric.mock.calls.filter(([n]) => n === name).length;

  it('records open and close once on graceful server close', async () => {
    const onEvent = jest.fn();
    await new Promise<void>(resolve => {
      subscribeSSE('/api/v1/test', {
        onEvent,
        onClose: () => resolve(),
      });
    });

    expect(calls(METRICS.AGENT_FLOW_SSE_OPEN)).toBe(1);
    expect(calls(METRICS.AGENT_FLOW_SSE_CLOSE)).toBe(1);
    expect(calls(METRICS.AGENT_FLOW_SSE_UPTIME)).toBe(1);
    expect(calls(METRICS.AGENT_FLOW_SSE_ERROR)).toBe(0);
  });

  it('records error and close once on stream error without duplicate close', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom')) as jest.Mock;
    const onError = jest.fn();
    const onClose = jest.fn();
    await new Promise<void>(resolve => {
      subscribeSSE('/api/v1/test', {
        onEvent: () => {},
        onError: () => {
          onError();
          resolve();
        },
        onClose,
      });
    });

    expect(calls(METRICS.AGENT_FLOW_SSE_ERROR)).toBe(1);
    expect(calls(METRICS.AGENT_FLOW_SSE_CLOSE)).toBe(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('records cancelled close on client-side abort', async () => {
    // Use a stream that never closes so only the client abort can end it.
    const stalled = new ReadableStream<Uint8Array>({
      pull() {
        // intentionally never enqueues or closes
      },
    });
    global.fetch = jest.fn().mockResolvedValue(
      new Response(stalled, {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    ) as jest.Mock;

    const sub = subscribeSSE('/api/v1/test', { onEvent: () => {} });
    await new Promise<void>(resolve => {
      setTimeout(resolve, 20);
    });
    sub.close();
    await new Promise<void>(resolve => {
      setTimeout(resolve, 20);
    });

    expect(calls(METRICS.AGENT_FLOW_SSE_CLOSE)).toBe(1);
    const closeCall = mockedRecordMetric.mock.calls.find(
      ([n]) => n === METRICS.AGENT_FLOW_SSE_CLOSE,
    );
    expect(closeCall?.[4]).toMatchObject({ status: 'cancelled' });
  });
  it('resolves api_group from SSE path (conversation vs other)', async () => {
    // conversation path
    global.fetch = jest.fn().mockResolvedValue(
      new Response(makeStream(['data: {"status":"active"}\n\n']), {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    ) as jest.Mock;
    mockedRecordMetric.mockClear();

    await new Promise<void>(resolve => {
      subscribeSSE('/api/v1/conversations/123/status/stream', {
        onEvent: () => {},
        onClose: () => resolve(),
      });
    });

    const openCall = mockedRecordMetric.mock.calls.find(
      ([n]) => n === METRICS.AGENT_FLOW_SSE_OPEN,
    );
    expect(openCall?.[4]).toMatchObject({ api_group: 'conversation' });
  });

  it('resolves unknown SSE path to other', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(makeStream(['data: {}\n\n']), {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    ) as jest.Mock;
    mockedRecordMetric.mockClear();

    await new Promise<void>(resolve => {
      subscribeSSE('/api/v1/unknown-endpoint', {
        onEvent: () => {},
        onClose: () => resolve(),
      });
    });

    const openCall = mockedRecordMetric.mock.calls.find(
      ([n]) => n === METRICS.AGENT_FLOW_SSE_OPEN,
    );
    expect(openCall?.[4]).toMatchObject({ api_group: 'other' });
  });
});
// eslint-disable-next-line jest/no-export
export type {};
