import { MetricCollector } from '../../src/performance/collector';
import {
  ALLOWED_TAGS,
  MAX_NAME_LENGTH,
  MAX_QUEUE_SIZE,
  MAX_TAG_COUNT,
  MAX_TAG_VALUE_LENGTH,
  type PerformanceMetric,
  createMetric,
  validateMetric,
} from '../../src/performance/types';

// ── Helpers ───────────────────────────────────────────────────────────

function validMetric(
  overrides: Partial<PerformanceMetric> = {},
): PerformanceMetric {
  return {
    name: 'test.metric',
    value: 42,
    unit: 'ms',
    process: 'main',
    timestamp: Date.now(),
    ...overrides,
  };
}

// ── validateMetric ────────────────────────────────────────────────────

describe('validateMetric', () => {
  it('accepts a valid metric', () => {
    const m = validMetric();
    const result = validateMetric(m);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('test.metric');
    expect(result!.value).toBe(42);
  });

  it('rejects non-finite values (NaN)', () => {
    expect(validateMetric(validMetric({ value: Number.NaN }))).toBeNull();
  });

  it('rejects non-finite values (Infinity)', () => {
    expect(
      validateMetric(validMetric({ value: Number.POSITIVE_INFINITY })),
    ).toBeNull();
  });

  it('rejects negative values', () => {
    expect(validateMetric(validMetric({ value: -1 }))).toBeNull();
  });

  it('rejects unknown units', () => {
    expect(validateMetric(validMetric({ unit: 'seconds' as any }))).toBeNull();
  });

  it('rejects unknown process', () => {
    expect(
      validateMetric(validMetric({ process: 'worker' as any })),
    ).toBeNull();
  });

  it('rejects empty name', () => {
    expect(validateMetric(validMetric({ name: '' }))).toBeNull();
  });

  it('rejects name exceeding max length', () => {
    expect(
      validateMetric(validMetric({ name: 'x'.repeat(MAX_NAME_LENGTH + 1) })),
    ).toBeNull();
  });

  it('rejects non-finite timestamp', () => {
    expect(validateMetric(validMetric({ timestamp: Number.NaN }))).toBeNull();
  });

  it('drops unknown tags (PII protection)', () => {
    const result = validateMetric(
      validMetric({
        tags: {
          user_id: 'secret',
          email: 'a@b.com',
          service_id: 'srv-1',
          status: 'ok',
        },
      }),
    );
    expect(result!.tags).toEqual({ status: 'ok' });
  });

  it('truncates long string tag values', () => {
    const longVal = 'x'.repeat(MAX_TAG_VALUE_LENGTH + 50);
    const result = validateMetric(validMetric({ tags: { status: longVal } }));
    expect(result!.tags!.status).toHaveLength(MAX_TAG_VALUE_LENGTH);
  });

  it('caps tag count at MAX_TAG_COUNT', () => {
    // Build a metric with more allowed tags than the cap
    const allowedArray = [...ALLOWED_TAGS];
    const tags: Record<string, string> = {};
    for (const t of allowedArray) {
      tags[t] = 'v';
    }
    const result = validateMetric(validMetric({ tags }));
    expect(Object.keys(result!.tags!)).toHaveLength(
      Math.min(allowedArray.length, MAX_TAG_COUNT),
    );
  });

  it('preserves numeric and boolean tag values', () => {
    const result = validateMetric(
      validMetric({
        tags: { cold_start: true, service_count_bucket: 5 },
      }),
    );
    expect(result!.tags).toEqual({
      cold_start: true,
      service_count_bucket: 5,
    });
  });

  it('returns undefined tags when input tags is empty', () => {
    const result = validateMetric(validMetric({ tags: {} }));
    expect(result!.tags).toBeUndefined();
  });
});

// ── createMetric ──────────────────────────────────────────────────────

describe('createMetric', () => {
  it('creates a valid metric with current timestamp', () => {
    const before = Date.now();
    const m = createMetric('api.request_ms', 150, 'ms', 'renderer', {
      method: 'getServices',
    });
    const after = Date.now();

    expect(m).not.toBeNull();
    expect(m!.timestamp).toBeGreaterThanOrEqual(before);
    expect(m!.timestamp).toBeLessThanOrEqual(after);
    expect(m!.tags!.method).toBe('getServices');
  });

  it('returns null for invalid input', () => {
    expect(createMetric('', 10, 'ms', 'main')).toBeNull();
    expect(createMetric('x', -1, 'ms', 'main')).toBeNull();
  });
});

// ── MetricCollector ───────────────────────────────────────────────────

describe('MetricCollector', () => {
  it('does not record when disabled', () => {
    const handler = jest.fn();
    const c = new MetricCollector(handler);
    c.recordMetric(validMetric());
    expect(c.size).toBe(0);
  });

  it('records metrics when enabled', () => {
    const handler = jest.fn();
    const c = new MetricCollector(handler);
    c.enable();
    c.recordMetric(validMetric());
    expect(c.size).toBe(1);
  });

  it('drops invalid metrics silently', () => {
    const handler = jest.fn();
    const c = new MetricCollector(handler);
    c.enable();
    c.recordMetric(validMetric({ value: Number.NaN }));
    c.recordMetric(validMetric({ name: '' }));
    expect(c.size).toBe(0);
  });

  it('evicts oldest metric when queue is full', () => {
    const handler = jest.fn();
    const c = new MetricCollector(handler);
    c.enable();

    // Fill to capacity
    for (let i = 0; i < MAX_QUEUE_SIZE; i += 1) {
      c.recordMetric(validMetric({ value: i }));
    }
    expect(c.size).toBe(MAX_QUEUE_SIZE);

    // Add one more - oldest (value=0) should be evicted
    c.recordMetric(validMetric({ value: 999 }));
    expect(c.size).toBe(MAX_QUEUE_SIZE);

    // Flush and check the first metric is value=1, not value=0
    c.flush();
    expect(handler).toHaveBeenCalledTimes(1);
    const batch = handler.mock.calls[0][0] as PerformanceMetric[];
    expect(batch[0].value).toBe(1);
    expect(batch.at(-1)?.value).toBe(999);
  });

  it('flushes all queued metrics and clears queue', () => {
    const handler = jest.fn();
    const c = new MetricCollector(handler);
    c.enable();

    c.recordMetric(validMetric({ value: 1 }));
    c.recordMetric(validMetric({ value: 2 }));
    c.recordMetric(validMetric({ value: 3 }));

    c.flush();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toHaveLength(3);
    expect(c.size).toBe(0);
  });

  it('flush is no-op when queue is empty', () => {
    const handler = jest.fn();
    const c = new MetricCollector(handler);
    c.enable();
    c.flush();
    expect(handler).not.toHaveBeenCalled();
  });

  it('flush handler errors are swallowed (do not crash)', () => {
    const handler = jest.fn(() => {
      throw new Error('upload failed');
    });
    const c = new MetricCollector(handler);
    c.enable();
    c.recordMetric(validMetric());

    // Should not throw
    expect(() => c.flush()).not.toThrow();
    expect(c.size).toBe(0); // batch was consumed despite handler error
  });

  it('disable stops timer and flushes remaining metrics', () => {
    const handler = jest.fn();
    const c = new MetricCollector(handler);
    c.enable();
    c.recordMetric(validMetric());

    c.disable();
    expect(handler).toHaveBeenCalledTimes(1); // final flush on disable
    expect(c.size).toBe(0);
    expect(c.isEnabled()).toBe(false);
  });

  it('disabled state produces no output on recordMetric', () => {
    const handler = jest.fn();
    const c = new MetricCollector(handler);
    // Never enabled
    c.recordMetric(validMetric());
    c.flush();
    expect(handler).not.toHaveBeenCalled();
  });

  it('enable is idempotent', () => {
    const handler = jest.fn();
    const c = new MetricCollector(handler);
    c.enable();
    c.enable();
    c.recordMetric(validMetric());
    expect(c.size).toBe(1);
  });
});

// ── performanceRequestHook ────────────────────────────────────────────

describe('performanceRequestHook', () => {
  // Hook is a no-op when renderer performance is disabled (enabled=false
  // by default), so these tests verify the branching logic doesn't throw.
  // Full integration with enabled state + IPC mock is covered in batch 3.

  it('does not throw when durationMs is absent', () => {
    const {
      performanceRequestHook,
    } = require('../../src/performance/renderer');
    expect(() =>
      performanceRequestHook({ method: 'getServices' }),
    ).not.toThrow();
  });

  it('does not throw when durationMs is zero', () => {
    const {
      performanceRequestHook,
    } = require('../../src/performance/renderer');
    expect(() =>
      performanceRequestHook({ method: 'getServices', durationMs: 0 }),
    ).not.toThrow();
  });

  it('does not throw with successful request timing', () => {
    const {
      performanceRequestHook,
    } = require('../../src/performance/renderer');
    expect(() =>
      performanceRequestHook({
        method: 'getServices',
        durationMs: 150,
        isError: false,
      }),
    ).not.toThrow();
  });

  it('does not throw with error request timing', () => {
    const {
      performanceRequestHook,
    } = require('../../src/performance/renderer');
    expect(() =>
      performanceRequestHook({
        method: 'login',
        durationMs: 300,
        isError: true,
      }),
    ).not.toThrow();
  });
});
