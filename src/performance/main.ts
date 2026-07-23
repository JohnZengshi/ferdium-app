/**
 * Main process performance collector.
 *
 * - Registers IPC handlers to receive metrics from renderer/webviews.
 * - Buffers metrics in a MetricCollector.
 * - On flush, outputs to debug logger and optionally to JSONL file.
 * - On app quit, performs a final flush.
 *
 * Activation:
 *   --performance-metrics  → enable local diagnostics (debug + optional JSONL)
 *   settings.app.sentry     → enable production telemetry (future, batch 6)
 *
 * When neither is active, recordMetric is a no-op and no IPC handlers
 * or timers are created.
 */

import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ipcMain } from 'electron';

import { MetricCollector } from './collector';
import { type PerformanceMetric, createMetric } from './types';

const debug = require('../preload-safe-debug')('Ferdium:Performance');

const JSONL_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const JSONL_DIR = 'performance';
function jsonlFileName(sid: string): string {
  return `metrics-${sid}.jsonl`;
}

// ── Singleton state ───────────────────────────────────────────────────

let collector: MetricCollector | null = null;
let sessionId = '';
let jsonlPath = '';
let ipcRegistered = false;

// ── JSONL output ──────────────────────────────────────────────────────

/**
 * Append metrics to JSONL file. If the file exceeds the size limit,
 * truncate it by starting fresh. Write failures are swallowed.
 */
async function writeJsonl(metrics: PerformanceMetric[]): Promise<void> {
  if (!jsonlPath) return;
  try {
    await mkdir(dirname(jsonlPath), { recursive: true });
    // Check size; if too large, reset by writing fresh (truncate)
    try {
      const stats = await stat(jsonlPath);
      if (stats.size > JSONL_MAX_BYTES) {
        // Overwrite: start a fresh file for the current batch
        const { writeFile } = await import('node:fs/promises');
        await writeFile(
          jsonlPath,
          `${metrics.map(m => JSON.stringify(m)).join('\n')}\n`,
        );
        return;
      }
    } catch {
      // File doesn't exist yet — that's fine, appendFile will create it
    }

    const lines = `${metrics.map(m => JSON.stringify(m)).join('\n')}\n`;
    await appendFile(jsonlPath, lines, 'utf8');
  } catch (error) {
    // Swallow: JSONL is best-effort diagnostics, must not crash app
    debug('JSONL write failed:', error);
  }
}

// ── Flush handler ─────────────────────────────────────────────────────

function handleFlush(metrics: PerformanceMetric[]): void {
  // Debug output (always when collector is enabled)
  for (const m of metrics) {
    debug(
      `${m.process}:${m.name} = ${m.value}${m.unit}${
        m.tags ? ` ${JSON.stringify(m.tags)}` : ''
      }`,
    );
  }

  // Optional JSONL
  if (jsonlPath) {
    writeJsonl(metrics).catch(() => {});
  }

  // Future: production upload (batch 6)
}

// ── IPC ───────────────────────────────────────────────────────────────

function registerIpc(): void {
  if (ipcRegistered) return;
  ipcRegistered = true;

  ipcMain.on('performance:metric', (_event, raw: PerformanceMetric) => {
    if (collector) {
      collector.recordMetric(raw);
    }
  });

  ipcMain.handle('performance:flush', () => {
    collector?.flush();
  });
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Check if the --performance-metrics flag is present in argv.
 */
export function isPerformanceMetricsEnabled(): boolean {
  return (
    process.env.PERFORMANCE_METRICS === '1' ||
    process.argv.includes('--performance-metrics')
  );
}

/**
 * Initialize the main process collector.
 *
 * @param userDataDir  Electron userData path for JSONL output
 * @param enableJsonl  Write JSONL file (only when local diagnostics on)
 */
export function initMainCollector(
  userDataDir: string,
  enableJsonl = false,
): void {
  if (collector) return; // already initialized

  const localDiagnostics = isPerformanceMetricsEnabled();
  if (!localDiagnostics) return; // production telemetry wired in batch 6

  sessionId = randomUUID();
  debug('Performance metrics enabled', { sessionId });

  if (enableJsonl) {
    jsonlPath = join(userDataDir, JSONL_DIR, jsonlFileName(sessionId));
    debug('JSONL output enabled', jsonlPath);
  }

  collector = new MetricCollector(handleFlush, 60_000);
  collector.enable();
  registerIpc();
}

/**
 * Record a metric from the main process directly (not via IPC).
 */
export function recordMetric(
  name: string,
  value: number,
  unit: PerformanceMetric['unit'],
  process: PerformanceMetric['process'],
  tags?: Record<string, string | number | boolean>,
): void {
  if (!collector?.isEnabled()) return;
  const metric = createMetric(name, value, unit, process, tags);
  if (metric) {
    collector.recordMetric(metric);
  }
}

/**
 * Flush remaining metrics and tear down. Call on app quit.
 */
export function flushAndShutdown(): void {
  if (!collector) return;
  collector.disable(); // stops timer + final flush
}

export function getSessionId(): string {
  return sessionId;
}

export function isInitialized(): boolean {
  return collector !== null;
}
