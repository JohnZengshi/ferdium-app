/**
 * In-process metric collector.
 *
 * This is the core queue/buffer logic shared by both main and renderer.
 * It is deliberately decoupled from Electron so it can be unit-tested
 * in isolation. The main process wraps it with IPC + JSONL output;
 * the renderer wraps it with IPC send.
 */

import {
  MAX_QUEUE_SIZE,
  type PerformanceMetric,
  validateMetric,
} from './types';

export type FlushHandler = (metrics: PerformanceMetric[]) => void;

export class MetricCollector {
  private queue: PerformanceMetric[] = [];

  private flushTimer: ReturnType<typeof setInterval> | null = null;

  private readonly flushHandler: FlushHandler;

  private readonly flushIntervalMs: number;

  private enabled = false;

  constructor(flushHandler: FlushHandler, flushIntervalMs = 60_000) {
    this.flushHandler = flushHandler;
    this.flushIntervalMs = flushIntervalMs;
  }

  /**
   * Enable collection. Starts the periodic flush timer.
   * When disabled, recordMetric is a no-op.
   */
  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
    // Don't keep the process alive solely for this timer
    if (this.flushTimer && typeof this.flushTimer.unref === 'function') {
      this.flushTimer.unref();
    }
  }

  /**
   * Disable collection. Stops the timer and flushes remaining metrics.
   */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Record a metric. When disabled, returns immediately without queuing.
   * Invalid metrics are silently dropped. When the queue is full the
   * oldest metric is discarded (FIFO eviction).
   */
  recordMetric(raw: PerformanceMetric): void {
    if (!this.enabled) return;

    const metric = validateMetric(raw);
    if (!metric) return;

    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.queue.shift(); // drop oldest
    }
    this.queue.push(metric);
  }

  /**
   * Flush all queued metrics to the flush handler and clear the queue.
   */
  flush(): void {
    if (this.queue.length === 0) return;
    const batch = this.queue;
    this.queue = [];
    try {
      this.flushHandler(batch);
    } catch {
      // Flush handler errors must not crash the app; the batch is lost.
    }
  }

  /** Current queue length (for testing). */
  get size(): number {
    return this.queue.length;
  }
}
