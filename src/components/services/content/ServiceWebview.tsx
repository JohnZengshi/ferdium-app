import { join } from 'node:path';
import { action, makeObservable, observable, reaction } from 'mobx';
import { observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import ElectronWebView from 'react-electron-web-view';
import type ServiceModel from '../../../models/Service';
import { recordMetric } from '../../../performance/renderer';
import type { RealStores } from '../../../stores';

const debug = require('../../../preload-safe-debug')('Ferdium:Services');

interface IProps {
  service: ServiceModel;
  setWebviewReference: (options: {
    serviceId: string;
    webview: ElectronWebView | null;
  }) => void;
  detachService: (options: { service: ServiceModel }) => void;
  isSpellcheckerEnabled: boolean;
  onDidStopLoading?: () => void;
  stores?: RealStores;
}

@observer
class ServiceWebview extends Component<IProps> {
  @observable webview: ElectronWebView | null = null;

  private _didStopLoadingWebview: ElectronWebView | null = null;

  private readonly _createdAt = performance.now();

  private _navigationStartedAt = performance.now();

  private _domReadyRecorded = false;

  private _loadRecorded = false;

  private _missedStart = false;

  private _metricListeners: {
    view: ElectronWebView;
    type: string;
    listener: EventListener;
  }[] = [];

  constructor(props: IProps) {
    super(props);

    this.refocusWebview = this.refocusWebview.bind(this);
    this._setWebview = this._setWebview.bind(this);

    makeObservable(this);

    reaction(
      () => this.webview,
      webview => {
        if (webview?.view) {
          const onConsoleMessage = (e: Electron.ConsoleMessageEvent) => {
            // Electron ConsoleMessageEvent.level: 0=verbose,1=info,2=warning,3=error.
            // Forward only errors; info/verbose/warn from service pages flood the host console.
            if (e.level === 3) {
              debug('Service console error:', e.message);
            }
          };
          webview.view.addEventListener('console-message', onConsoleMessage);
          webview.view.addEventListener('did-navigate', () => {
            if (this.props.service._webview) {
              document.title = `AITALK - ${this.props.service.name} ${
                this.props.service.dialogTitle
                  ? ` - ${this.props.service.dialogTitle}`
                  : ''
              } ${`- ${this.props.service._webview.getTitle()}`}`;
            }
          });
        }
      },
    );
  }

  private _metricTags(): Record<string, string> {
    return {
      recipe_id: this.props.service.recipe.id,
      partition_type: this.props.service.partition.includes('sandbox')
        ? 'sandbox'
        : 'general',
    };
  }

  private _removeMetricListeners(): void {
    for (const { view, type, listener } of this._metricListeners) {
      view.removeEventListener(type, listener);
    }
    this._metricListeners = [];
  }

  private _addMetricListener(
    view: ElectronWebView,
    type: string,
    listener: EventListener,
  ): void {
    view.addEventListener(type, listener);
    this._metricListeners.push({ view, type, listener });
  }

  private _attachMetricListeners(view: ElectronWebView): void {
    if (process.env.PERFORMANCE_METRICS !== '1') return;
    this._removeMetricListeners();
    this._navigationStartedAt = performance.now();
    this._domReadyRecorded = false;
    this._loadRecorded = false;

    // Electron #31918: did-start-loading may fire before listeners are
    // registered. If the WebView is already loading, we missed the start
    // event and _navigationStartedAt is only an approximation (attach time).
    try {
      this._missedStart =
        typeof view.isLoading === 'function' && view.isLoading();
    } catch {
      this._missedStart = false;
    }

    const tags = this._metricTags();
    recordMetric(
      'webview.attach_ms',
      Math.max(0, performance.now() - this._createdAt),
      'ms',
      'webview',
      { ...tags, status: 'ok' },
    );

    this._addMetricListener(view, 'did-start-loading', () => {
      this._navigationStartedAt = performance.now();
      this._domReadyRecorded = false;
      this._loadRecorded = false;
      this._missedStart = false;
    });
    this._addMetricListener(view, 'dom-ready', () => {
      if (this._domReadyRecorded) return;
      this._domReadyRecorded = true;
      recordMetric(
        'webview.dom_ready_ms',
        Math.max(0, performance.now() - this._navigationStartedAt),
        'ms',
        'webview',
        { ...tags, status: this._missedStart ? 'missed_start' : 'ok' },
      );
    });
    this._addMetricListener(view, 'did-stop-loading', () => {
      if (this._loadRecorded) return;
      this._loadRecorded = true;
      recordMetric(
        'webview.load_ms',
        Math.max(0, performance.now() - this._navigationStartedAt),
        'ms',
        'webview',
        { ...tags, status: this._missedStart ? 'missed_start' : 'ok' },
      );
    });

    try {
      if (
        typeof view.isLoading === 'function' &&
        !view.isLoading() &&
        view.getURL() !== 'about:blank'
      ) {
        const elapsed = Math.max(
          0,
          performance.now() - this._navigationStartedAt,
        );
        if (!this._domReadyRecorded) {
          this._domReadyRecorded = true;
          recordMetric('webview.dom_ready_ms', elapsed, 'ms', 'webview', {
            ...tags,
            status: 'already_loaded',
          });
        }
        if (!this._loadRecorded) {
          this._loadRecorded = true;
          recordMetric('webview.load_ms', elapsed, 'ms', 'webview', {
            ...tags,
            status: 'already_loaded',
          });
        }
      }
    } catch (error) {
      debug(
        'Could not check WebView loading state for performance metrics',
        error,
      );
    }
  }

  componentDidUpdate(prevProps: IProps): void {
    // 服务重建后新的 Service 实例丢失 webview 引用
    if (prevProps.service !== this.props.service && this.webview?.view) {
      this.props.setWebviewReference({
        serviceId: this.props.service.id,
        webview: this.webview.view,
      });
    }
  }

  componentWillUnmount(): void {
    const { service, detachService } = this.props;
    recordMetric('webview.unmount_count', 1, 'count', 'webview', {
      ...this._metricTags(),
      status: 'destroyed',
    });
    this._removeMetricListeners();
    detachService({ service });
    if (this._didStopLoadingWebview?.view) {
      this._didStopLoadingWebview.view.removeEventListener(
        'did-stop-loading',
        this.refocusWebview,
      );
      this._didStopLoadingWebview = null;
    }
  }

  refocusWebview(): void {
    const { webview } = this;
    this.props.onDidStopLoading?.();
    debug('Refocus Webview is called', this.props.service);
    if (!webview) {
      return;
    }

    if (this.props.service.isActive) {
      webview.view.blur();
      webview.view.focus();
      window.setTimeout(() => {
        document.title = `AITALK - ${this.props.service.name} ${
          this.props.service.dialogTitle
            ? ` - ${this.props.service.dialogTitle}`
            : ''
        } ${`- ${this.props.service._webview.getTitle()}`}`;
      }, 100);
    } else {
      debug('Refocus not required - Not active service');
    }
  }

  @action _setWebview(webview): void {
    this.webview = webview;
  }

  render(): ReactElement {
    const { service, setWebviewReference, isSpellcheckerEnabled, stores } =
      this.props;

    const { sandboxServices } = stores!.settings.app;

    const { sandboxServices: sandboxes } = stores!.app;

    const checkForSandbox = () => {
      const sandbox = sandboxes.find(s => s.services.includes(service.id));

      if (sandbox) {
        return `persist:sandbox-${sandbox.id}`;
      }

      return service.partition;
    };

    const preloadScript = join(
      __dirname,
      '..',
      '..',
      '..',
      'webview',
      'recipe.js',
    );

    return (
      <ElectronWebView
        style={{ flex: 1, minHeight: 0 }}
        ref={webview => {
          this._setWebview(webview);
          if (webview?.view && webview !== this._didStopLoadingWebview) {
            this._attachMetricListeners(webview.view);
            webview.view.addEventListener(
              'did-stop-loading',
              this.refocusWebview,
            );
            this._didStopLoadingWebview = webview;
          }
        }}
        autosize
        src={service.url}
        preload={preloadScript}
        partition={
          sandboxServices ? checkForSandbox() : 'persist:general-session'
        }
        onDidAttach={() => {
          // Force the event handler to run in a new task.
          // This resolves a race condition when the `did-attach` is called,
          // but the webview is not attached to the DOM yet:
          // https://github.com/electron/electron/issues/31918
          // This prevents us from immediately attaching listeners such as `did-stop-load`:
          // https://github.com/ferdium/ferdium-app/issues/157
          setTimeout(() => {
            setWebviewReference({
              serviceId: service.id,
              webview: this.webview.view,
            });
          }, 0);
        }}
        // onUpdateTargetUrl={this.updateTargetUrl} // TODO: [TS DEBT] need to check where its from
        useragent={service.userAgent}
        disablewebsecurity={
          service.recipe.disablewebsecurity ? true : undefined
        }
        allowpopups
        nodeintegration
        webpreferences={`spellcheck=${
          isSpellcheckerEnabled ? 1 : 0
        }, contextIsolation=1`}
      />
    );
  }
}

export default ServiceWebview;
