import { isEqual } from 'lodash';
import { action } from 'mobx';
import Request from './Request';

const isPerformanceMetricsEnabled = (): boolean =>
  process.env.PERFORMANCE_METRICS === '1' ||
  process.argv.includes('--performance-metrics');

export default class CachedRequest extends Request {
  _apiCalls: any[] = [];

  _isInvalidated = true;

  execute(...callArgs): this {
    // Do not continue if this request is already loading
    if (this.isWaitingForResponse) {
      if (isPerformanceMetricsEnabled()) {
        this.skippedInflight = true;
        this._triggerMetricHooks();
        this.skippedInflight = false;
      }
      return this;
    }

    // Very simple caching strategy -> only continue if the call / args changed
    // or the request was invalidated manually from outside
    const existingApiCall = this._findApiCall(callArgs);

    // Invalidate if new or different api call will be done
    if (existingApiCall && existingApiCall !== this.currentApiCall) {
      this._isInvalidated = true;
      this.currentApiCall = existingApiCall;
    } else if (!existingApiCall) {
      this._isInvalidated = true;
      this.currentApiCall = this._addApiCall(callArgs);
    }

    // Do not continue if this request is not invalidated (see above)
    if (!this._isInvalidated) {
      if (isPerformanceMetricsEnabled()) {
        this.cacheHit = true;
        this.durationMs = null;
        this._triggerMetricHooks();
        this.cacheHit = false;
      }
      return this;
    }

    // This timeout is necessary to avoid warnings from mobx
    // regarding triggering actions as side-effect of getters
    setTimeout(
      action(() => {
        this.isExecuting = true;
        // Apply the previous result from this call immediately (cached)
        if (existingApiCall) {
          this.result = existingApiCall.result;
        }
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
    this.promise = new Promise(resolve => {
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
              this.result = result;
              if (this.currentApiCall) this.currentApiCall.result = result;
              this.isExecuting = false;
              this.isError = false;
              this.wasExecuted = true;
              this._isInvalidated = false;
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
                this._isInvalidated = false;
                this.isWaitingForResponse = false;
                this._triggerAllHooks();
                // reject(error);
              }),
              1,
            );
          }),
        );
    });

    this.isWaitingForResponse = true;
    return this;
  }

  static defaultOptions = { immediately: false };

  reload(): this {
    this._isInvalidated = true;
    const args = this.currentApiCall ? this.currentApiCall.args : [];
    this.error = null;
    return this.execute(...args);
  }

  invalidate(options = CachedRequest.defaultOptions): this {
    this._isInvalidated = true;
    if (options.immediately && this.currentApiCall) {
      return this.execute(...this.currentApiCall.args);
    }
    return this;
  }

  patch(modify): Promise<this> {
    return new Promise(resolve => {
      setTimeout(
        action(() => {
          const override = modify(this.result);
          if (override !== undefined) this.result = override;
          if (this.currentApiCall) this.currentApiCall.result = this.result;
          resolve(this);
        }),
        0,
      );
    });
  }

  _addApiCall(args: any) {
    const newCall = { args, result: null };
    this._apiCalls.push(newCall);
    return newCall;
  }

  _findApiCall(args: any) {
    return this._apiCalls.find(c => isEqual(c.args, args));
  }
}
