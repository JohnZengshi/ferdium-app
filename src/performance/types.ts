/**
 * Performance metric types, validation, and tag whitelist.
 *
 * Shared by main process and renderer. Contains no Electron imports so it
 * can be unit-tested in isolation and safely required from either process.
 */

export type MetricUnit = 'ms' | 'count' | 'mb' | 'percent';

export type MetricProcess = 'main' | 'renderer' | 'webview' | 'server';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: MetricUnit;
  process: MetricProcess;
  timestamp: number;
  tags?: Record<string, string | number | boolean>;
}

// ── Limits ────────────────────────────────────────────────────────────

export const MAX_NAME_LENGTH = 80;
export const MAX_TAG_COUNT = 10;
export const MAX_TAG_VALUE_LENGTH = 80;
export const MAX_QUEUE_SIZE = 500;

// ── Tag whitelist ─────────────────────────────────────────────────────
// Only these tag keys are allowed. Any other key is silently dropped to
// prevent accidental PII leakage (user_id, email, service_id, URLs, etc.).

export const ALLOWED_TAGS = new Set<string>([
  'status',
  'store',
  'method',
  'backend',
  'recipe_id',
  'partition_type',
  'cold_start',
  'platform',
  'arch',
  'app_version',
  'hardware_acceleration',
  'service_count_bucket',
  'page_variant',
  'trigger',
  'visibility',
  'api_group',
  'script_group',
]);

export const VALID_UNITS = new Set<MetricUnit>([
  'ms',
  'count',
  'mb',
  'percent',
]);

export const VALID_PROCESSES = new Set<MetricProcess>([
  'main',
  'renderer',
  'webview',
  'server',
]);

// ── Metric name constants ─────────────────────────────────────────────

export const METRICS = {
  // Startup (batch 2)
  STARTUP_MAIN_READY: 'startup.main_ready_ms',
  STARTUP_BOOTSTRAP_SYNC_IO: 'startup.bootstrap_sync_io_ms',
  STARTUP_WINDOW_CREATE: 'startup.window_create_ms',
  STARTUP_RENDERER_DOM_READY: 'startup.renderer_dom_ready_ms',
  STARTUP_RENDERER_LOADED: 'startup.renderer_loaded_ms',
  STARTUP_SHELL_USABLE: 'startup.shell_usable_ms',
  STARTUP_ACTIVE_SERVICE_USABLE: 'startup.active_service_usable_ms',
  STARTUP_AUTH_SCREEN_USABLE: 'startup.auth_screen_usable_ms',
  STARTUP_EMPTY_STATE_USABLE: 'startup.empty_state_usable_ms',

  // Renderer (batch 2)
  RENDERER_FIRST_PAINT: 'renderer.first_paint_ms',
  RENDERER_FIRST_CONTENTFUL_PAINT: 'renderer.first_contentful_paint_ms',
  RENDERER_WINDOW_LOAD: 'renderer.window_load_ms',
  RENDERER_API_FACTORY: 'renderer.api_factory_ms',
  RENDERER_STORE_FACTORY: 'renderer.store_factory_ms',
  RENDERER_MENU_FACTORY: 'renderer.menu_factory_ms',
  RENDERER_TOUCHBAR_FACTORY: 'renderer.touchbar_factory_ms',
  RENDERER_REACT_FIRST_COMMIT: 'renderer.react_first_commit_ms',
  RENDERER_CRASH_COUNT: 'renderer.crash_count',
  RENDERER_LONG_TASK_COUNT: 'renderer.long_task_count',
  RENDERER_LONG_TASK_TOTAL: 'renderer.long_task_total_ms',
  RENDERER_LONG_TASK_MAX: 'renderer.long_task_max_ms',

  // Process (batch 2)
  PROCESS_CRASH_COUNT: 'process.crash_count',

  // Store (batch 2)
  STORE_CONSTRUCT: 'store.construct_ms',
  STORE_INITIALIZE: 'store.initialize_ms',
  STORE_INITIALIZE_ERROR: 'store.initialize_error',

  // API (batch 3)
  API_REQUEST: 'api.request_ms',
  API_REQUEST_ERROR: 'api.request_error',
  API_CACHE_HIT: 'api.cache_hit',
  API_REQUEST_SKIPPED_INFLIGHT: 'api.request_skipped_inflight',
  API_REQUEST_RETRY: 'api.request_retry_count',
  AGENT_FLOW_REQUEST: 'agent_flow.request_ms',
  AGENT_FLOW_REQUEST_ERROR: 'agent_flow.request_error',
  AGENT_FLOW_REQUEST_TIMEOUT: 'agent_flow.request_timeout',
  AGENT_FLOW_PENDING_HIGH_WATERMARK: 'agent_flow.pending_high_watermark',
  AGENT_FLOW_SSE_CONNECT: 'agent_flow.sse_connect_ms',
  AGENT_FLOW_SSE_OPEN: 'agent_flow.sse_open_count',
  AGENT_FLOW_SSE_ERROR: 'agent_flow.sse_error',
  AGENT_FLOW_SSE_CLOSE: 'agent_flow.sse_close_count',
  AGENT_FLOW_SSE_UPTIME: 'agent_flow.sse_uptime_ms',
  AGENT_FLOW_SSE_ACTIVE_HIGH_WATERMARK: 'agent_flow.sse_active_high_watermark',
  WHATSAPP_AUTOMATION_REQUEST: 'whatsapp_automation.request_ms',
  WHATSAPP_AUTOMATION_REQUEST_ERROR: 'whatsapp_automation.request_error',
  WHATSAPP_AUTOMATION_REQUEST_TIMEOUT: 'whatsapp_automation.request_timeout',
  WHATSAPP_AUTOMATION_PENDING_HIGH_WATERMARK:
    'whatsapp_automation.pending_high_watermark',

  // Local server (batch 3)
  LOCAL_SERVER_PORT_SCAN: 'local_server.port_scan_ms',
  LOCAL_SERVER_PORT_SCAN_ATTEMPTS: 'local_server.port_scan_attempts',
  LOCAL_SERVER_START: 'local_server.start_ms',
  LOCAL_SERVER_START_ERROR: 'local_server.start_error',
  LOCAL_SERVER_PROFILE_DIR: 'local_server.profile_dir_ms',
  LOCAL_SERVER_DB_PREPARE: 'local_server.db_prepare_ms',
  LOCAL_SERVER_ADONIS_BOOT: 'local_server.adonis_boot_ms',
  LOCAL_SERVER_TOKEN_WAIT: 'local_server.token_wait_ms',

  // WebView (batch 4)
  WEBVIEW_ATTACH: 'webview.attach_ms',
  WEBVIEW_DOM_READY: 'webview.dom_ready_ms',
  WEBVIEW_LOAD: 'webview.load_ms',
  WEBVIEW_UNMOUNT: 'webview.unmount_count',
  WEBVIEW_CRASH_COUNT: 'webview.crash_count',
  WEBVIEW_RELOAD_COUNT: 'webview.reload_count',
  WEBVIEW_SCRIPT_INJECTION_BATCH: 'webview.script_injection_batch_ms',
  WEBVIEW_SCRIPT_INJECTION_COUNT: 'webview.script_injection_count',
  WEBVIEW_SCRIPT_INJECTION_ERROR: 'webview.script_injection_error',
  WEBVIEW_SCRIPT_ACK_TIMEOUT: 'webview.script_ack_timeout',

  // Recipe bridge (batch 4A)
  RECIPE_BOOTSTRAP: 'recipe.bootstrap_ms',
  RECIPE_OVERLAY_READY: 'recipe.overlay_ready_ms',
  RECIPE_OVERLAY_REINJECT: 'recipe.overlay_reinject_count',
  RECIPE_OVERLAY_INJECTION_ERROR: 'recipe.overlay_injection_error',
  RECIPE_OVERLAY_TIMEOUT: 'recipe.overlay_timeout',
  RECIPE_DESTROY: 'recipe.destroy_ms',
  RECIPE_POLL_COUNT: 'recipe.poll_count',
  RECIPE_POLL_TOTAL: 'recipe.poll_total_ms',
  RECIPE_POLL_MAX: 'recipe.poll_max_ms',
  RECIPE_MUTATION_CALLBACK: 'recipe.mutation_callback_count',
  RECIPE_MUTATION_RECORD: 'recipe.mutation_record_count',
  RECIPE_MUTATION_NODES: 'recipe.mutation_added_nodes',
  RECIPE_RECONCILE_COUNT: 'recipe.reconcile_count',
  RECIPE_RECONCILE_TOTAL: 'recipe.reconcile_total_ms',
  RECIPE_RECONCILE_MAX: 'recipe.reconcile_max_ms',
  RECIPE_RECONCILE_P95: 'recipe.reconcile_p95_ms',
  RECIPE_DOM_SCANNED: 'recipe.dom_nodes_scanned',
  RECIPE_INTERVAL_TICK: 'recipe.interval_tick_count',
  RECIPE_API_REQUEST: 'recipe.api_request_ms',
  RECIPE_API_ERROR: 'recipe.api_request_error',
  RECIPE_API_TIMEOUT: 'recipe.api_request_timeout',
  RECIPE_API_PENDING: 'recipe.api_pending_count',
  RECIPE_TRANSLATION: 'recipe.translation_ms',
  RECIPE_TRANSLATION_ERROR: 'recipe.translation_error',
  RECIPE_TRANSLATION_CACHE_HIT: 'recipe.translation_cache_hit',

  // WhatsApp Recipe (batch 4B)
  WHATSAPP_BADGE_POLL: 'whatsapp.badge_poll_ms',
  WHATSAPP_BADGE_ROWS: 'whatsapp.badge_rows_scanned',
  WHATSAPP_BADGE_ERROR: 'whatsapp.badge_poll_error',
  WHATSAPP_DB_OPEN: 'whatsapp.db_open_ms',
  WHATSAPP_DB_REOPEN: 'whatsapp.db_reopen_count',
  WHATSAPP_OVERLAY_READY: 'whatsapp.overlay_ready_ms',
  WHATSAPP_OVERLAY_REINJECT: 'whatsapp.overlay_reinject_count',
  WHATSAPP_OVERLAY_TIMEOUT: 'whatsapp.overlay_timeout',
  WHATSAPP_MESSAGE_NODES: 'whatsapp.message_nodes_scanned',
  WHATSAPP_BUBBLE_ENHANCED: 'whatsapp.bubble_enhanced_count',
  WHATSAPP_RECONCILE_COALESCED: 'whatsapp.reconcile_coalesced_count',
  WHATSAPP_NATIVE_TICK: 'whatsapp.native_binding_tick_ms',
  WHATSAPP_NATIVE_REBIND: 'whatsapp.native_binding_rebind_count',
  WHATSAPP_API_REQUEST: 'whatsapp.api_request_ms',
  WHATSAPP_API_ERROR: 'whatsapp.api_request_error',
  WHATSAPP_API_TIMEOUT: 'whatsapp.api_request_timeout',
  WHATSAPP_API_DUPLICATE: 'whatsapp.api_duplicate_request_dropped',
  WHATSAPP_API_PENDING: 'whatsapp.api_pending_count',
  WHATSAPP_TRANSLATION: 'whatsapp.translation_ms',
  WHATSAPP_TRANSLATION_ERROR: 'whatsapp.translation_error',
  WHATSAPP_TRANSLATION_CACHE_HIT: 'whatsapp.translation_cache_hit',

  // Telegram Recipe (batch 4C)
  TELEGRAM_BADGE_SCAN: 'telegram.badge_scan_ms',
  TELEGRAM_CHAT_ROWS: 'telegram.chat_rows_scanned',
  TELEGRAM_BADGE_COUNT: 'telegram.badge_scan_count',
  TELEGRAM_BADGE_ERROR: 'telegram.badge_scan_error',
  TELEGRAM_MUTATION_CALLBACK: 'telegram.chat_mutation_callback_count',
  TELEGRAM_MUTATION_RECORD: 'telegram.chat_mutation_record_count',
  TELEGRAM_DEBOUNCE: 'telegram.chat_debounce_coalesced_count',
  TELEGRAM_RECONCILE: 'telegram.reconcile_ms',
  TELEGRAM_MESSAGE_ROWS: 'telegram.message_rows_scanned',
  TELEGRAM_ENHANCED: 'telegram.enhanced_node_count',
  TELEGRAM_DEBUG_REFRESH: 'telegram.debug_refresh_ms',
  TELEGRAM_TRANSLATION: 'telegram.translation_ms',
  TELEGRAM_TRANSLATION_ERROR: 'telegram.translation_error',
  TELEGRAM_TRANSLATION_CACHE_HIT: 'telegram.translation_cache_hit',
  TELEGRAM_AI_SUGGESTION: 'telegram.ai_suggestion_ms',
  TELEGRAM_AI_ERROR: 'telegram.ai_suggestion_error',

  // Resource (batch 5)
  RESOURCE_MAIN_RSS: 'resource.main_rss_mb',
  RESOURCE_RENDERER_RSS: 'resource.renderer_rss_mb',
  RESOURCE_WEBVIEW_RSS: 'resource.webview_rss_mb',
  RESOURCE_MAIN_CPU: 'resource.main_cpu_percent',
  RESOURCE_RENDERER_CPU: 'resource.renderer_cpu_percent',
  RESOURCE_WEBVIEW_CPU: 'resource.webview_cpu_percent',
  RESOURCE_WEBVIEW_COUNT: 'resource.webview_count',
  RESOURCE_EVENT_LOOP_LAG: 'resource.event_loop_lag_ms',
} as const;

// ── Validation ────────────────────────────────────────────────────────

/**
 * Validate and sanitize a single metric. Returns null if the metric is
 * fundamentally invalid (bad name, non-finite value, negative value,
 * unknown unit). Unknown/PII tags are silently dropped. Oversized tag
 * values are truncated. Excess tags (beyond MAX_TAG_COUNT) are dropped.
 */
export function validateMetric(
  raw: PerformanceMetric,
): PerformanceMetric | null {
  // Name
  if (
    typeof raw.name !== 'string' ||
    raw.name.length === 0 ||
    raw.name.length > MAX_NAME_LENGTH
  ) {
    return null;
  }

  // Value: must be finite and non-negative
  if (
    typeof raw.value !== 'number' ||
    !Number.isFinite(raw.value) ||
    raw.value < 0
  ) {
    return null;
  }

  // Unit
  if (!VALID_UNITS.has(raw.unit)) {
    return null;
  }

  // Process
  if (!VALID_PROCESSES.has(raw.process)) {
    return null;
  }

  // Timestamp
  if (typeof raw.timestamp !== 'number' || !Number.isFinite(raw.timestamp)) {
    return null;
  }

  // Sanitize tags: whitelist, truncate, cap count
  let tags: PerformanceMetric['tags'] | undefined;

  if (raw.tags && typeof raw.tags === 'object') {
    const cleaned: Record<string, string | number | boolean> = {};
    let count = 0;

    for (const [key, val] of Object.entries(raw.tags)) {
      if (count >= MAX_TAG_COUNT) break;
      if (ALLOWED_TAGS.has(key)) {
        if (typeof val === 'string') {
          cleaned[key] =
            val.length > MAX_TAG_VALUE_LENGTH
              ? val.slice(0, MAX_TAG_VALUE_LENGTH)
              : val;
        } else if (typeof val === 'number' || typeof val === 'boolean') {
          cleaned[key] = val;
        }
        // other types silently dropped
        count += 1;
      }
    }

    if (Object.keys(cleaned).length > 0) {
      tags = cleaned;
    }
  }

  return {
    name: raw.name,
    value: raw.value,
    unit: raw.unit,
    process: raw.process,
    timestamp: raw.timestamp,
    tags,
  };
}

/**
 * Create a metric with the current timestamp. Convenience wrapper.
 * Returns null if validation fails.
 */
export function createMetric(
  name: string,
  value: number,
  unit: MetricUnit,
  process: MetricProcess,
  tags?: Record<string, string | number | boolean>,
): PerformanceMetric | null {
  return validateMetric({
    name,
    value,
    unit,
    process,
    timestamp: Date.now(),
    tags,
  });
}
