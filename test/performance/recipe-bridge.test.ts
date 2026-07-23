import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const source = readFileSync(
  join(__dirname, '../../recipes/shared/performance.js'),
  'utf8',
);

function createBridge(options: { enabled: boolean; hidden?: boolean }) {
  const messages: { type: string; payload: Record<string, unknown> }[] = [];
  const intervals: (() => void)[] = [];
  const windowObject = {
    ferdium: { performanceEnabled: options.enabled },
    location: {
      hostname: 'web.telegram.org',
      href: 'https://web.telegram.org/a/',
      origin: 'https://web.telegram.org',
    },
    document: { hidden: options.hidden ?? false },
    postMessage: (message: {
      type: string;
      payload: Record<string, unknown>;
    }) => messages.push(message),
    setInterval: (callback: () => void) => {
      intervals.push(callback);
      return intervals.length;
    },
    clearInterval: jest.fn(),
  };
  const context = vm.createContext({
    window: windowObject,
    Number,
    Map,
    Set,
    Object,
    Array,
    Math,
    JSON,
    Promise,
    console,
  });

  vm.runInContext(source, context);

  return {
    bridge: (
      windowObject as typeof windowObject & {
        __ferdiumRecipePerformance: {
          measure: (
            name: string,
            value: number,
            tags?: Record<string, string>,
          ) => void;
          increment: (
            name: string,
            value?: number,
            tags?: Record<string, string>,
          ) => void;
          gauge: (
            name: string,
            value: number,
            unit: string,
            tags?: Record<string, string>,
          ) => void;
          record: (
            name: string,
            value: number,
            unit: string,
            tags?: Record<string, string>,
          ) => void;
          flush: () => void;
          destroy: () => void;
        };
      }
    ).__ferdiumRecipePerformance,
    messages,
    intervals,
  };
}

describe('Recipe performance bridge', () => {
  it('is a no-op when performance metrics are disabled', () => {
    const { bridge, messages, intervals } = createBridge({ enabled: false });

    expect(bridge).toBeUndefined();

    expect(messages).toHaveLength(0);
    expect(intervals).toHaveLength(0);
  });

  it('aggregates metrics and emits fixed recipe tags', () => {
    const { bridge, messages, intervals } = createBridge({ enabled: true });

    bridge.measure('recipe.reconcile_ms', 10, {
      trigger: 'mutation',
      user_id: 'private-value',
    });
    bridge.measure('recipe.reconcile_ms', 30, { trigger: 'mutation' });
    bridge.increment('recipe.mutation_callback_count', 2);
    bridge.flush();

    expect(intervals).toHaveLength(1);
    expect(messages.map(message => message.payload.name)).toEqual([
      'recipe.reconcile_ms_count',
      'recipe.reconcile_ms_total_ms',
      'recipe.reconcile_ms_max_ms',
      'recipe.reconcile_ms_p95_ms',
      'recipe.mutation_callback_count',
    ]);

    const reconcileMax = messages.find(
      message => message.payload.name === 'recipe.reconcile_ms_max_ms',
    );
    expect(reconcileMax?.payload.value).toBe(30);
    expect(reconcileMax?.payload.tags).toEqual({
      recipe_id: 'telegram',
      page_variant: 'web_a',
      visibility: 'visible',
      trigger: 'mutation',
    });
  });

  it('emits exact business metric names through record', () => {
    const { bridge, messages } = createBridge({ enabled: true });

    bridge.record('whatsapp.badge_poll_ms', 12, 'ms');
    bridge.record('telegram.badge_scan_ms', 8, 'ms');
    bridge.flush();

    expect(messages.map(message => message.payload.name)).toEqual([
      'whatsapp.badge_poll_ms',
      'telegram.badge_scan_ms',
    ]);
  });

  it('cleans timers and queued metrics on destroy', () => {
    const { bridge, messages } = createBridge({ enabled: true });

    bridge.increment('recipe.poll_count');
    bridge.destroy();
    bridge.flush();

    expect(messages).toHaveLength(0);
  });
});
