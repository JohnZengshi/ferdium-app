/**
 * Renderer process performance collector.
 *
 * - Sends metrics to the main process via IPC.
 * - Initializes Paint and Long Task observers.
 * - Aggregates Long Tasks every 60s (count, total, max).
 * - Measures event-loop lag via setTimeout drift.
 * - Exports a Request hook for API timing (registered in batch 3).
 * - When disabled, no observers/timers/IPC are created.
 *
 * Activation mirrors the main process:
 *   --performance-metrics flag or settings.app.sentry (future).
 */

import { ipcRenderer } from 'electron';

import {
  METRICS,
  type MetricProcess,
  type PerformanceMetric,
  createMetric,
} from './types';

// ── Singleton state ───────────────────────────────────────────────────

let enabled = false;
let paintObserver: PerformanceObserver | null = null;
let longTaskObserver: PerformanceObserver | null = null;
let longTaskFlushTimer: ReturnType<typeof setInterval> | null = null;
let eventLoopLagTimer: ReturnType<typeof setInterval> | null = null;

// Long task aggregation buffer
let longTaskCount = 0;
let longTaskTotalMs = 0;
let longTaskMaxMs = 0;

// Event-loop lag aggregation buffer (samples every ~5s)
let lagSamples: number[] = [];

// ── Public API ────────────────────────────────────────────────────────

/**
 * Check if performance metrics should be active in the renderer.
 * The main process passes the flag via a global set by preload, or we
 * check process.argv directly (renderer has access in non-sandboxed mode).
 */
export function isPerformanceMetricsEnabled(): boolean {
  return (
    process.env.PERFORMANCE_METRICS === '1' ||
    process.argv.includes('--performance-metrics')
  );
}

/**
 * Send a single metric to the main process via IPC.
 * No-op when disabled.
 */
export function recordMetric(
  name: string,
  value: number,
  unit: PerformanceMetric['unit'],
  process: MetricProcess,
  tags?: Record<string, string | number | boolean>,
): void {
  if (!enabled) return;
  const metric = createMetric(name, value, unit, process, tags);
  if (metric) {
    ipcRenderer.send('performance:metric', metric);
  }
}

// ── Event-loop lag measurement ────────────────────────────────────────

/**
 * Measure event-loop lag by scheduling a 0ms timeout and recording
 * how long it actually takes to fire. Samples every 5 seconds;
 * flushes p95 every 60 seconds alongside Long Task aggregation.
 */
function sampleEventLoopLag(): void {
  const start = Date.now();
  setTimeout(() => {
    const lag = Date.now() - start;
    lagSamples.push(lag);
  }, 0);
}

function flushEventLoopLag(): void {
  if (lagSamples.length === 0) return;

  // Calculate p95
  const sorted = [...lagSamples].sort((a, b) => a - b);
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95 = sorted[p95Index] ?? sorted.at(-1) ?? 0;

  recordMetric(METRICS.RESOURCE_EVENT_LOOP_LAG, p95, 'ms', 'renderer');
  lagSamples = [];
}

// ── Request hook (registered in batch 3) ──────────────────────────────

/**
 * Request hook for API timing. Registered via Request.registerHook()
 * in initRendererPerformance(). The hook reads timing fields if present
 * and records api.request_ms / api.request_error. Fields are optional
 * until batch 3 adds startedAt/durationMs to Request, so this is a
 * safe no-op until then.
 */
export function performanceRequestHook(request: {
  method?: string;
  startedAt?: number | null;
  durationMs?: number | null;
  isError?: boolean;
  isExecuting?: boolean;
}): void {
  // Only record when the request has completed (has duration)
  if (!request.durationMs || request.durationMs <= 0) return;

  const tags: Record<string, string> = { method: request.method ?? 'unknown' };

  if (request.isError) {
    tags.status = 'error';
    recordMetric(
      METRICS.API_REQUEST,
      request.durationMs,
      'ms',
      'renderer',
      tags,
    );
    recordMetric(METRICS.API_REQUEST_ERROR, 1, 'count', 'renderer', tags);
  } else {
    tags.status = 'ok';
    recordMetric(
      METRICS.API_REQUEST,
      request.durationMs,
      'ms',
      'renderer',
      tags,
    );
  }
}

// ── Initialization ────────────────────────────────────────────────────

/**
 * Initialize renderer-side performance collection.
 *
 * Creates PerformanceObservers for paint and long tasks, starts the
 * 60s Long Task aggregation timer, and the 5s event-loop lag sampler.
 * When disabled, this is a no-op.
 */
export function initRendererPerformance(): void {
  if (enabled) return;
  if (!isPerformanceMetricsEnabled()) return;

  enabled = true;

  // ── Register Request hook for API timing ────────────────────────────
  // Lazy require to avoid static import dependency on stores/lib/Request.
  // The hook no-ops until Request gains startedAt/durationMs (batch 3).
  try {
    // eslint-disable-next-line global-require
    const Request = require('../stores/lib/Request').default;
    if (Request?.registerHook) {
      Request.registerHook(performanceRequestHook);
    }
  } catch {
    // Request module not available in this context
  }

  // ── Paint observer ──────────────────────────────────────────────────
  try {
    paintObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-paint') {
          recordMetric(
            METRICS.RENDERER_FIRST_PAINT,
            Math.round(entry.startTime),
            'ms',
            'renderer',
          );
        } else if (entry.name === 'first-contentful-paint') {
          recordMetric(
            METRICS.RENDERER_FIRST_CONTENTFUL_PAINT,
            Math.round(entry.startTime),
            'ms',
            'renderer',
          );
        }
      }
    });
    paintObserver.observe({ type: 'paint', buffered: true });
  } catch {
    // PerformanceObserver not available or type unsupported
  }

  // ── Long Task observer ──────────────────────────────────────────────
  try {
    longTaskObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        longTaskCount += 1;
        longTaskTotalMs += entry.duration;
        if (entry.duration > longTaskMaxMs) {
          longTaskMaxMs = entry.duration;
        }
      }
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch {
    // longtask type not supported in this Electron/Chromium version
  }

  // ── Long Task + event-loop lag flush timer (60s aggregation) ────────
  longTaskFlushTimer = setInterval(() => {
    if (longTaskCount > 0) {
      recordMetric(
        METRICS.RENDERER_LONG_TASK_COUNT,
        longTaskCount,
        'count',
        'renderer',
      );
      recordMetric(
        METRICS.RENDERER_LONG_TASK_TOTAL,
        Math.round(longTaskTotalMs),
        'ms',
        'renderer',
      );
      recordMetric(
        METRICS.RENDERER_LONG_TASK_MAX,
        Math.round(longTaskMaxMs),
        'ms',
        'renderer',
      );
      // Reset aggregation window
      longTaskCount = 0;
      longTaskTotalMs = 0;
      longTaskMaxMs = 0;
    }

    flushEventLoopLag();
  }, 60_000);

  if (longTaskFlushTimer && typeof longTaskFlushTimer.unref === 'function') {
    longTaskFlushTimer.unref();
  }

  // ── Event-loop lag sampler (every 5s) ───────────────────────────────
  eventLoopLagTimer = setInterval(sampleEventLoopLag, 5000);
  if (eventLoopLagTimer && typeof eventLoopLagTimer.unref === 'function') {
    eventLoopLagTimer.unref();
  }
}

/**
 * Tear down all observers and timers. Called on renderer cleanup.
 */
export function teardownRendererPerformance(): void {
  if (!enabled) return;

  // Final flush of any pending long tasks
  if (longTaskCount > 0) {
    recordMetric(
      METRICS.RENDERER_LONG_TASK_COUNT,
      longTaskCount,
      'count',
      'renderer',
    );
    recordMetric(
      METRICS.RENDERER_LONG_TASK_TOTAL,
      Math.round(longTaskTotalMs),
      'ms',
      'renderer',
    );
    recordMetric(
      METRICS.RENDERER_LONG_TASK_MAX,
      Math.round(longTaskMaxMs),
      'ms',
      'renderer',
    );
    longTaskCount = 0;
    longTaskTotalMs = 0;
    longTaskMaxMs = 0;
  }

  flushEventLoopLag();

  paintObserver?.disconnect();
  longTaskObserver?.disconnect();
  if (longTaskFlushTimer) {
    clearInterval(longTaskFlushTimer);
    longTaskFlushTimer = null;
  }
  if (eventLoopLagTimer) {
    clearInterval(eventLoopLagTimer);
    eventLoopLagTimer = null;
  }

  paintObserver = null;
  longTaskObserver = null;
  enabled = false;
}

export function isRendererInitialized(): boolean {
  return enabled;
}
