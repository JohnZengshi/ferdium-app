import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import { createReactions } from '../../stores/lib/Reaction';
import { createActionBindings } from '../utils/ActionBinding';
import FeatureStore from '../utils/FeatureStore';
import { whatsappAutomationActions } from './actions';
import { WHATSAPP_RECIPE_ID } from './constants';

import {
  getSessions,
  getSessionsIdQr,
  postSessions,
  postSessionsIdAction,
} from '../../whatsapp-automation/api/generated/sessions/sessions';

import { getApiKey, initializeAuth } from '../../whatsapp-automation/api/auth';
import type { Session } from '../../whatsapp-automation/api/generated/wAAKGAPIDocumentation.schemas';

import { SessionStatus } from '../../whatsapp-automation/api/generated/wAAKGAPIDocumentation.schemas';

const debug = require('../../preload-safe-debug')(
  'Ferdium:feature:whatsapp-automation:store',
);

export default class WhatsAppAutomationStore extends FeatureStore {
  @observable stores: any = null;

  actions: any;

  @observable isFeatureActive = false;

  _authInitialized = false;

  _initializedServices = new Set<string>();

  _sessionPollTimers = new Map<string, ReturnType<typeof setInterval>>();

  _retryCounts = new Map<string, number>();

  _maxRetries = 10;

  _retryIntervalMs = 5000;

  @observable sessionStatuses = new Map<string, SessionStatus | undefined>();

  @observable qrCodes = new Map<string, string | undefined>();

  @observable isLoadingQr = new Map<string, boolean>();

  @observable errorMessages = new Map<string, string | undefined>();

  constructor() {
    super();

    makeObservable(this);
  }

  // ========== COMPUTEDS ========= //

  @computed get whatsAppServices(): any[] {
    if (!this.stores) return [];
    return this.stores.services.allDisplayed.filter(
      (s: any) => s.recipe?.id === WHATSAPP_RECIPE_ID,
    );
  }

  @computed get anyWhatsAppServiceActive(): boolean {
    return this.whatsAppServices.some((s: any) => s.isActive);
  }

  // ========== PUBLIC API ========= //

  @action start(stores: any, actions: any) {
    debug('WhatsAppAutomationStore::start');
    this.stores = stores;
    this.actions = actions;

    this._registerActions(
      createActionBindings([
        [whatsappAutomationActions.setServiceWebview, this._setServiceWebview],
        [
          whatsappAutomationActions.checkSessionStatus,
          this._checkSessionStatus,
        ],
        [whatsappAutomationActions.handleHostMessage, this._handleHostMessage],
        [
          whatsappAutomationActions.handleClientMessage,
          this._handleClientMessage,
        ],
        [whatsappAutomationActions.injectQrModal, this._injectQrModal],
        [whatsappAutomationActions.removeQrModal, this._removeQrModal],
      ]),
    );

    this._registerReactions(createReactions([this._detectWhatsAppServices]));

    this.isFeatureActive = true;
  }

  @action stop() {
    super.stop();
    debug('WhatsAppAutomationStore::stop');

    for (const [, timer] of this._sessionPollTimers) {
      clearInterval(timer);
    }
    this._sessionPollTimers.clear();
    this._retryCounts.clear();
    this._initializedServices.clear();
    this.sessionStatuses.clear();
    this.qrCodes.clear();
    this.isLoadingQr.clear();
    this.errorMessages.clear();
    this.isFeatureActive = false;
  }

  // ========== REACTIONS ========= //

  _detectWhatsAppServices = (): void => {
    const services = this.whatsAppServices;
    if (services.length === 0) return;

    for (const service of services) {
      if (
        !this._initializedServices.has(service.id) &&
        service.isAttached &&
        service.webview
      ) {
        debug(`Detected attached WhatsApp service: ${service.id}`);
        this._initializedServices.add(service.id);
        this._checkSessionStatus({ serviceId: service.id });
      }
    }

    // Clean up removed services
    const currentIds = new Set(services.map((s: any) => s.id));
    for (const trackedId of this._initializedServices) {
      if (!currentIds.has(trackedId)) {
        debug(`Cleaning up removed service: ${trackedId}`);
        this._initializedServices.delete(trackedId);
        const timer = this._sessionPollTimers.get(trackedId);
        if (timer) {
          clearInterval(timer);
          this._sessionPollTimers.delete(trackedId);
        }
        runInAction(() => {
          this.sessionStatuses.delete(trackedId);
          this.qrCodes.delete(trackedId);
          this.isLoadingQr.delete(trackedId);
          this.errorMessages.delete(trackedId);
        });
      }
    }
  };

  // ========== ACTION HANDLERS ========= //

  @action _setServiceWebview = ({ serviceId }: { serviceId: string }) => {
    debug('_setServiceWebview', serviceId);
  };

  _ensureAuthenticated = async (): Promise<boolean> => {
    if (this._authInitialized && getApiKey()) return true;

    debug('No API key found, authenticating with WA-AKG...');
    const apiKey = await initializeAuth();

    if (apiKey) {
      debug('Authentication successful, API key obtained');
      this._authInitialized = true;
      return true;
    }

    debug('Authentication failed');
    return false;
  };

  @action _checkSessionStatus = async ({
    serviceId,
  }: {
    serviceId: string;
  }) => {
    debug('Checking session status for service', serviceId);

    // Ensure we're authenticated before making API calls
    const authenticated = await this._ensureAuthenticated();
    if (!authenticated) {
      debug('Cannot check session: authentication failed');
      runInAction(() => {
        this.errorMessages.set(
          serviceId,
          'WA-AKG authentication failed. Is the backend running?',
        );
      });
      return;
    }

    try {
      const response = await getSessions();

      if (response.status === 200) {
        const sessions: Session[] = response.data;
        const matchingSession = sessions.find(
          (s: Session) => s.sessionId === serviceId,
        );

        if (matchingSession) {
          runInAction(() => {
            this.sessionStatuses.set(serviceId, matchingSession.status);
          });

          if (
            this._normalizeStatus(matchingSession.status) ===
            SessionStatus.Connected
          ) {
            debug(`Session ${serviceId} is already connected`);
          } else {
            debug(
              `Session ${serviceId} status: ${matchingSession.status}, fetching QR...`,
            );
            // Existing session needs QR (SCAN_QR/Disconnected/Connecting)
            runInAction(() => {
              this.isLoadingQr.set(serviceId, true);
            });
            await this._fetchAndShowQrCode(serviceId);
            this._startSessionPolling(serviceId);
          }
        } else {
          debug(`No session found for service ${serviceId}, creating one`);
          await this._createSessionAndShowQr(serviceId);
        }
      } else {
        debug('Failed to get sessions, response status:', response.status);
        runInAction(() => {
          this.errorMessages.set(
            serviceId,
            `API returned status ${response.status}`,
          );
        });
      }
    } catch (error) {
      debug('Error checking session status:', error);
      runInAction(() => {
        this.errorMessages.set(
          serviceId,
          error instanceof Error ? error.message : String(error),
        );
      });
    }
  };

  @action _handleHostMessage = ({
    action: _action,
    data: _data,
  }: {
    action: string;
    data: object;
  }) => {
    debug('_handleHostMessage', _action, _data);
  };

  @action _handleClientMessage = ({
    channel: _channel,
    message: _message,
  }: {
    channel: string;
    message: { action: string; data: object };
  }) => {
    debug('_handleClientMessage', _channel, _message);
  };

  @action _injectQrModal = ({
    serviceId,
    base64,
  }: {
    serviceId: string;
    base64: string;
  }) => {
    const service = this._getService(serviceId);
    if (!service?.webview) {
      debug('Cannot inject QR modal - no webview for service', serviceId);
      return;
    }

    const script = this._buildQrModalScript(serviceId, base64);

    // Inject via executeJavaScript (only working path from renderer to webview)
    service.webview
      .executeJavaScript(script)
      .then(() => {
        debug('QR modal script injected into service', serviceId);
        // Clear retry count on success
        this._retryCounts.delete(serviceId);
      })
      .catch((error: Error) => {
        debug('QR modal injection failed:', error);
        // Retry if the webview hasn't loaded yet or hit a transient error
        this._scheduleRetryInjection(serviceId, base64);
      });
  };

  _scheduleRetryInjection = (serviceId: string, base64: string) => {
    const retryCount = this._retryCounts.get(serviceId) || 0;
    if (retryCount >= this._maxRetries) {
      debug(`Max retries (${this._maxRetries}) reached for service`, serviceId);
      runInAction(() => {
        this.errorMessages.set(
          serviceId,
          'Could not inject QR code into WhatsApp page. Please check your network connection and try reloading the service.',
        );
        this.isLoadingQr.set(serviceId, false);
      });
      return;
    }

    this._retryCounts.set(serviceId, retryCount + 1);
    debug(
      `Scheduling retry ${retryCount + 1}/${this._maxRetries} for service`,
      serviceId,
    );

    setTimeout(() => {
      this._injectQrModal({ serviceId, base64 });
    }, this._retryIntervalMs);
  };

  @action _removeQrModal = ({ serviceId }: { serviceId: string }) => {
    const service = this._getService(serviceId);
    if (!service?.webview) return;

    service.webview
      .executeJavaScript(
        `
      (function() {
        try {
          var el = document.getElementById('wa-akg-qr-modal');
          if (el) {
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); }, 300);
          }
          if (window.__waAkgOriginalPushState) {
            history.pushState = window.__waAkgOriginalPushState;
          }
        } catch(e) {
          console.error('[WA-AKG] Error removing QR modal:', e);
        }
      })();
    `,
      )
      .catch(() => {
        // Ignore - webview might be navigating
      });
  };

  // ========== PRIVATE METHODS ========= //

  _getService(serviceId: string): any {
    if (!this.stores) return null;
    try {
      return this.stores.services.one(serviceId);
    } catch {
      return null;
    }
  }

  /** Normalize API status string to match SessionStatus enum (e.g. 'CONNECTED' → 'Connected') */
  _normalizeStatus(apiStatus?: string | null): string | undefined {
    if (!apiStatus) return undefined;
    return apiStatus.charAt(0).toUpperCase() + apiStatus.slice(1).toLowerCase();
  }

  _createSessionAndShowQr = async (serviceId: string) => {
    try {
      runInAction(() => {
        this.isLoadingQr.set(serviceId, true);
        this.errorMessages.set(serviceId, undefined);
      });

      const createResponse = await postSessions({
        name: `Ferdium-${serviceId}`,
        sessionId: serviceId,
      });

      if (createResponse.status === 200) {
        debug('Session created:', createResponse.data.id);

        // Start the session to get QR
        await postSessionsIdAction(serviceId, 'start');

        // Fetch QR code
        await this._fetchAndShowQrCode(serviceId);

        // Start polling for session connection
        this._startSessionPolling(serviceId);
      } else {
        runInAction(() => {
          this.errorMessages.set(serviceId, 'Failed to create session');
          this.isLoadingQr.set(serviceId, false);
        });
      }
    } catch (error) {
      debug('Error creating session:', error);
      runInAction(() => {
        this.errorMessages.set(
          serviceId,
          error instanceof Error ? error.message : String(error),
        );
        this.isLoadingQr.set(serviceId, false);
      });
    }
  };

  _fetchAndShowQrCode = async (serviceId: string) => {
    try {
      debug('Fetching QR code from WA-AKG for service', serviceId);

      const qrResponse = await getSessionsIdQr(serviceId);

      if (qrResponse.status === 200) {
        const qrData = qrResponse.data;
        const base64 = qrData.base64 || '';

        if (base64) {
          debug('QR code fetched successfully, injecting into webview');
          this._injectQrModal({ serviceId, base64 });
        } else {
          debug('QR API returned no base64 data, retrying in 2s');
          runInAction(() => {
            this.errorMessages.set(serviceId, 'No QR data available yet');
          });
          await new Promise(resolve => {
            setTimeout(resolve, 2000);
          });
          this._fetchAndShowQrCode(serviceId);
        }
      } else {
        debug('QR API returned status:', qrResponse.status);
        runInAction(() => {
          this.errorMessages.set(
            serviceId,
            `QR API returned status ${qrResponse.status}`,
          );
        });
      }
    } catch (error) {
      debug('Error fetching QR code:', error);
      runInAction(() => {
        this.errorMessages.set(
          serviceId,
          error instanceof Error ? error.message : String(error),
        );
      });
    }
  };

  _startSessionPolling = (serviceId: string) => {
    const existingTimer = this._sessionPollTimers.get(serviceId);
    if (existingTimer) clearInterval(existingTimer);

    debug(`Starting session polling for service ${serviceId}`);
    let pollCount = 0;

    const timer = setInterval(async () => {
      pollCount += 1;

      try {
        const response = await getSessions();

        if (response.status === 200) {
          const sessions: Session[] = response.data;
          const session = sessions.find(
            (s: Session) => s.sessionId === serviceId,
          );

          if (session) {
            runInAction(() => {
              this.sessionStatuses.set(serviceId, session.status);
            });

            if (
              this._normalizeStatus(session.status) === SessionStatus.Connected
            ) {
              debug(
                `Session ${serviceId} is now connected after ${pollCount} polls!`,
              );
              clearInterval(timer);
              this._sessionPollTimers.delete(serviceId);

              // Notify the webview that session is connected
              this._notifySessionConnected(serviceId);

              // Remove QR modal
              this._removeQrModal({ serviceId });
            } else if (
              this._normalizeStatus(session.status) ===
                SessionStatus.Disconnected &&
              pollCount % 6 === 0
            ) {
              // Refresh QR every ~30 seconds (6 * 5s)
              debug('Refreshing QR code for service', serviceId);
              await this._fetchAndShowQrCode(serviceId);
            }
          } else {
            debug(
              `Session ${serviceId} not found in list (poll #${pollCount})`,
            );
          }
        }
      } catch (error) {
        debug('Session polling error:', error);
      }
    }, 5000);

    this._sessionPollTimers.set(serviceId, timer);
  };

  _notifySessionConnected = (serviceId: string) => {
    const service = this._getService(serviceId);
    if (!service?.webview) return;

    const notifyScript = `
      (function() {
        try {
          window.postMessage({ type: 'wa-akg:session-connected', serviceId: '${service.id}' }, '*');
        } catch(e) {
          console.error('[WA-AKG] Error sending session connected:', e);
        }
      })();
    `;

    service.webview.executeJavaScript(notifyScript).catch(() => {
      // Ignore - webview might already be navigating
    });
  };

  // ========== QR MODAL SCRIPT BUILDER ========= //

  _buildQrModalScript = (serviceId: string, base64: string): string => {
    // Uses template literal escaping specific to inject context
    const escapedServiceId = serviceId
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'");
    const escapedBase64 = base64
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'");

    return `
(function() {
  try {
    if (document.getElementById('wa-akg-qr-modal')) return;

    var SERVICE_ID = '${escapedServiceId}';
    var BASE64_QR = '${escapedBase64}';

    // Inject styles
    var s = document.createElement('style');
    s.textContent = [
      '@keyframes waa-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
      '.waa-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:2147483647}',
      '.waa-card{background:#1f2c33;border-radius:12px;padding:32px;text-align:center;max-width:400px;width:90%;color:#fff}',
      '.waa-logo{margin-bottom:12px}',
      '.waa-title{font-size:20px;font-weight:600;margin:0 0 8px;color:#e9edef}',
      '.waa-body{margin:20px 0;min-height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center}',
      '.waa-subtitle{font-size:14px;color:#8696a0;margin:8px 0 0}',
      '.waa-qrimg{width:264px;height:264px;border-radius:4px;image-rendering:pixelated}',
      '.waa-footer{font-size:12px;color:#667781;margin-top:16px}'
    ].join('');
    document.head.appendChild(s);

    // Create modal
    var modal = document.createElement('div');
    modal.id = 'wa-akg-qr-modal';
    modal.innerHTML = '<div class="waa-overlay"><div class="waa-card">' +
      '<div class="waa-logo"><svg viewBox="0 0 39 39" width="26" height="26"><path fill="#00E676" d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-15.9 16.1 0 3 .9 5.9 2.4 8.4l.4.6-1.6 5.9 6-1.5z"/><path fill="#fff" d="M32.4 6.4C29 2.9 24.3 1 19.5 1 9.3 1 1.1 9.3 1.2 19.4c0 3.2.9 6.3 2.4 9.1L1 38l9.7-2.5c2.7 1.5 5.7 2.2 8.7 2.2 10.1 0 18.3-8.3 18.3-18.4 0-4.9-1.9-9.5-5.3-12.9zM19.5 34.6c-2.7 0-5.4-.7-7.7-2.1l-.6-.3-5.8 1.5L6.9 28l-.4-.6c-1.5-2.4-2.3-5.2-2.3-8 0-8.4 6.8-15.2 15.2-15.2 4.1 0 7.9 1.6 10.8 4.5 2.9 2.9 4.5 6.8 4.5 10.9-.1 8.4-6.9 15.2-15.2 15.2zm8.4-11.4c-.5-.3-2.7-1.3-3.1-1.5-.4-.2-.7-.2-1 .2-.3.5-1.2 1.5-1.5 1.8-.3.3-.5.3-1 .1-.5-.3-2-1-3.8-2.3-1.4-1-2.3-2.2-2.6-2.6-.3-.3-.1-.5.2-.7.2-.2.5-.5.7-.8.2-.3.3-.5.5-.8.2-.3.1-.6 0-.8-.1-.3-1-2.4-1.4-3.3-.4-.9-.7-.8-1-.8-.3 0-.6 0-.9 0-.3 0-.8.1-1.2.6-.4.5-1.6 1.6-1.6 3.8 0 2.2 1.6 4.4 1.9 4.7.2.3 3.2 4.9 7.8 6.8 1.1.5 1.9.7 2.6.9 1.1.3 2.1.2 2.9.2.9 0 2.6-.7 3-1.3.4-.7.4-1.2.3-1.3-.2-.3-.4-.5-.8-.7z"/></svg></div>' +
      '<h2 class="waa-title">Link Your WhatsApp</h2>' +
      '<div class="waa-body" id="waa-body">' +
      '  <div class="waa-spinner"></div>' +
      '  <p class="waa-subtitle">Loading QR code...</p>' +
      '</div>' +
      '<p class="waa-footer">Open WhatsApp on your phone to scan the QR code</p>' +
      '</div></div>';
    document.body.appendChild(modal);

    // Block navigation/close while QR is showing
    document.addEventListener('keydown', function(e) {
      e.stopPropagation();
      e.preventDefault();
    }, true);
    window.__waAkgOriginalPushState = history.pushState.bind(history);
    history.pushState = function() {};
    window.addEventListener('popstate', function() {
      history.pushState(null, '', location.href);
    });

    // Listen for connection notification from host
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'wa-akg:session-connected') {
        var body = document.getElementById('waa-body');
        if (!body) return;
        body.innerHTML = '<div style="text-align:center;padding:20px;"><div style="font-size:48px;margin-bottom:12px;">&#10004;&#65039;</div><p style="color:#00a884;font-weight:600;font-size:16px;">Connected!</p></div>';
        setTimeout(function() {
          modal.style.opacity = '0';
          setTimeout(function() { modal.remove(); }, 500);
        }, 1000);
      }
    });

    // Show QR code
    var bodyEl = document.getElementById('waa-body');
    if (bodyEl && BASE64_QR) {
      bodyEl.innerHTML = '<img src="' + BASE64_QR + '" alt="QR Code" class="waa-qrimg"/><p class="waa-subtitle">Scan this QR code with your WhatsApp mobile app</p>';
    }

    console.log('[WA-AKG] QR auth modal injected for service', SERVICE_ID);
  } catch(e) {
    console.error('[WA-AKG] QR modal injection error:', e);
  }
})();
`;
  };
}
