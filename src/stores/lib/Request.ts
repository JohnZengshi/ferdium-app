import { action, computed, makeObservable, observable } from 'mobx';

type Hook = (request: Request) => void;

const isPerformanceMetricsEnabled = (): boolean =>
  process.env.PERFORMANCE_METRICS === '1' ||
  process.argv.includes('--performance-metrics');

export default class Request {
  static readonly _hooks: Hook[] = [];

  static readonly _metricHooks: Hook[] = [];

  static registerHook(hook: Hook): () => void {
    Request._hooks.push(hook);
    return () => {
      const index = Request._hooks.indexOf(hook);
      if (index >= 0) Request._hooks.splice(index, 1);
    };
  }

  static registerMetricHook(hook: Hook): () => void {
    Request._metricHooks.push(hook);
    return () => {
      const index = Request._metricHooks.indexOf(hook);
      if (index >= 0) Request._metricHooks.splice(index, 1);
    };
  }

  @observable result: any = null;

  @observable error: any = null;

  @observable isExecuting = false;

  @observable isError = false;

  @observable wasExecuted = false;

  promise: any = Promise;

  protected api: any = {};

  method = '';

  backend: 'local' | 'remote' | 'auto' = 'auto';

  startedAt: number | null = null;

  durationMs: number | null = null;

  cacheHit = false;

  skippedInflight = false;

  protected isWaitingForResponse = false;

  protected currentApiCall: any = null;

  retry = () => this.reload();

  reset = () => this._reset();

  constructor(api, method, backend: 'local' | 'remote' | 'auto' = 'auto') {
    makeObservable(this);

    this.api = api;
    this.method = method;
    this.backend = backend;
  }

  @action _reset(): this {
    this.error = null;
    this.result = null;
    this.isExecuting = false;
    this.isError = false;
    this.wasExecuted = false;
    this.isWaitingForResponse = false;
    this.promise = Promise;
    this.startedAt = null;
    this.durationMs = null;
    this.cacheHit = false;
    this.skippedInflight = false;

    return this;
  }

  execute(...callArgs: any[]): this {
    // Do not continue if this request is already loading
    if (this.isWaitingForResponse) {
      if (isPerformanceMetricsEnabled()) {
        this.skippedInflight = true;
        this._triggerMetricHooks();
        this.skippedInflight = false;
      }
      return this;
    }

    if (!this.api[this.method]) {
      throw new Error(
        `Missing method <${this.method}> on api object:`,
        this.api,
      );
    }

    // This timeout is necessary to avoid warnings from mobx
    // regarding triggering actions as side-effect of getters
    setTimeout(
      action(() => {
        this.isExecuting = true;
      }),
      0,
    );

    // Issue api call & save it as promise that is handled to update the results of the operation
    if (isPerformanceMetricsEnabled()) {
      this.startedAt = Date.now();
      this.durationMs = null;
      this.cacheHit = false;
      this.skippedInflight = false;
    }
    this.promise = new Promise((resolve, reject) => {
      this.api[this.method](...callArgs)
        .then(result => {
          if (isPerformanceMetricsEnabled()) {
            this.durationMs = Math.max(
              0,
              Date.now() - (this.startedAt ?? Date.now()),
            );
          }
          setTimeout(
            action(() => {
              this.error = null;
              this.result = result;
              if (this.currentApiCall) this.currentApiCall.result = result;
              this.isExecuting = false;
              this.isError = false;
              this.wasExecuted = true;
              this.isWaitingForResponse = false;
              this._triggerAllHooks();
              resolve(result);
            }),
            1,
          );
          return result;
        })
        .catch(
          action(error => {
            if (isPerformanceMetricsEnabled()) {
              this.durationMs = Math.max(
                0,
                Date.now() - (this.startedAt ?? Date.now()),
              );
            }
            setTimeout(
              action(() => {
                this.error = error;
                this.isExecuting = false;
                this.isError = true;
                this.wasExecuted = true;
                this.isWaitingForResponse = false;
                this._triggerAllHooks();
                reject(error);
              }),
              1,
            );
          }),
        );
    });

    this.isWaitingForResponse = true;
    this.currentApiCall = { args: callArgs, result: null };
    return this;
  }

  reload(): this {
    const args = this.currentApiCall ? this.currentApiCall.args : [];
    this.error = null;
    return this.execute(...args);
  }

  @computed get isExecutingFirstTime(): boolean {
    return !this.wasExecuted && this.isExecuting;
  }

  /* eslint-disable unicorn/no-thenable */
  then(...args: any[]) {
    if (!this.promise)
      throw new Error(
        'You have to call Request::execute before you can access it as promise',
      );
    return this.promise.then(...args);
  }

  catch(...args: any[]) {
    if (!this.promise)
      throw new Error(
        'You have to call Request::execute before you can access it as promise',
      );
    return this.promise.catch(...args);
  }

  _triggerHooks(): void {
    for (const hook of Request._hooks) {
      hook(this);
    }
  }

  _triggerMetricHooks(): void {
    for (const hook of Request._metricHooks) {
      try {
        hook(this);
      } catch {
        // Performance hooks must never affect request lifecycle
      }
    }
  }

  _triggerAllHooks(): void {
    this._triggerHooks();
    this._triggerMetricHooks();
  }
}
