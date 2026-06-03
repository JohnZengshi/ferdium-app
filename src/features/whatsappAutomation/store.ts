import {
  action,
  computed,
  makeObservable,
  observable,
  reaction,
  runInAction,
} from 'mobx';
import { type Socket, io } from 'socket.io-client';
import { createActionBindings } from '../utils/ActionBinding';
import FeatureStore from '../utils/FeatureStore';
import { whatsappAutomationActions } from './actions';
import {
  WA_AKG_BASE_URL,
  WA_AKG_SOCKET_PATH,
  WA_SESSION_STATUS,
  WHATSAPP_RECIPE_ID,
} from './constants';

import {
  getSessions,
  getSessionsIdQr,
  postSessions,
  postSessionsIdAction,
} from '../../whatsapp-automation/api/generated/sessions/sessions';

import authManager from '../../lib/auth/AuthManager';
import { clearApiKey, getApiKey } from '../../whatsapp-automation/api/auth';
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

  /** Track which Service instances have been initialized (survives reconstruction) */
  _initializedServiceInstances = new WeakSet<any>();

  /** One Socket.IO connection per WhatsApp session for real-time status updates */
  _sockets = new Map<string, Socket>();

  _retryCounts = new Map<string, number>();

  _waReactionDisposer: (() => void) | undefined;

  _socketConnectWaiters = new Map<string, (() => void)[]>();

  _maxRetries = 10;

  _retryIntervalMs = 5000;

  _qrFetchRetryDelayMs = 800;

  _qrFetchMaxAttempts = 6;

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
    this.stores = stores;
    this.actions = actions;
    debug('WhatsAppAutomationStore::start');

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

    this._waReactionDisposer = reaction(
      () =>
        this.whatsAppServices
          .map(s => `${s.id}:${s.isAttached}:${!!s.webview}`)
          .join('|'),
      () => {
        this._detectWhatsAppServices();
      },
      { fireImmediately: true },
    );

    this.isFeatureActive = true;
  }

  @action stop() {
    if (this._waReactionDisposer) {
      this._waReactionDisposer();
      this._waReactionDisposer = undefined;
    }

    super.stop();
    debug('WhatsAppAutomationStore::stop');

    // Disconnect all Socket.IO connections
    for (const [, socket] of this._sockets) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    this._sockets.clear();
    this._retryCounts.clear();
    this._socketConnectWaiters.clear();
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
    if (services.length === 0) {
      debug('No WhatsApp services found via recipe filter');
      return;
    }

    debug('WhatsApp services found:', services.length);
    for (const service of services) {
      if (
        !this._initializedServiceInstances.has(service) &&
        service.isAttached &&
        service.webview
      ) {
        debug('Initializing session for service:', service.id);
        this._initializedServices.add(service.id);
        this._initializedServiceInstances.add(service);
        this._checkSessionStatus({ serviceId: service.id });
      }
    }

    // Clean up removed services
    const currentIds = new Set(services.map((s: any) => s.id));
    for (const trackedId of this._initializedServices) {
      if (!currentIds.has(trackedId)) {
        debug(`Cleaning up removed service: ${trackedId}`);
        this._initializedServices.delete(trackedId);
        this._stopSocketIoForSession(trackedId);
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
    // Check NextAuthProvider via AuthManager first (preferred)
    const nextAuthProvider = authManager.getProvider('nextauth');
    if (nextAuthProvider?.isAuthenticated()) {
      debug('Authenticated via NextAuthProvider, skipping authentication');
      this._authInitialized = true;
      return true;
    }

    // Fallback to direct API key check (backward compatibility)
    if (getApiKey()) {
      debug('API key found via getApiKey(), skipping authentication');
      this._authInitialized = true;
      return true;
    }

    debug(
      'No authentication found — user must log in via NextAuthProvider first',
    );
    for (const sid of this._initializedServices) {
      this._injectOrUpdateStatusIndicator(sid, WA_SESSION_STATUS.SERVER_ERROR);
    }
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

    // Show initial status indicator
    this._injectOrUpdateStatusIndicator(
      serviceId,
      WA_SESSION_STATUS.CONNECTING,
    );

    // Connect Socket.IO first, then check session
    this._startSocketIoForSession(serviceId);

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

          if (matchingSession.status === SessionStatus.Connected) {
            debug(`Session ${serviceId} is already connected`);
            // Update status indicator (Socket.IO won't emit for already-connected)
            this._injectOrUpdateStatusIndicator(
              serviceId,
              WA_SESSION_STATUS.CONNECTED,
            );
            // Notify webview — session was already active
            this._notifySessionConnected(serviceId);
          } else {
            debug(
              `Session ${serviceId} status: ${matchingSession.status}, starting & fetching QR...`,
            );
            // Session exists but needs QR — start it and show QR
            runInAction(() => {
              this.isLoadingQr.set(serviceId, true);
            });
            try {
              await this._waitForSocketConnected(serviceId);
              await postSessionsIdAction(serviceId, 'start');
            } catch (startError) {
              debug(
                'Session start action failed (may already be starting):',
                startError,
              );
            }
            await this._fetchAndUpdateQr(serviceId);
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
      const message = error instanceof Error ? error.message : String(error);
      const status =
        error && typeof error === 'object' && 'status' in error
          ? (error as { status: number }).status
          : undefined;

      // If 401, clear stale API key so user gets redirected to login
      if (status === 401) {
        debug('API returned 401 — clearing stale API key');
        clearApiKey();
        // Reset auth state so next check triggers re-auth flow
        this._authInitialized = false;
      }

      runInAction(() => {
        this.errorMessages.set(
          serviceId,
          status === 401
            ? 'Authentication expired. Please log in again.'
            : message,
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

        // Ensure Socket.IO is connected and join room BEFORE starting
        // (so we don't miss early connection.update events)
        this._startSocketIoForSession(serviceId);
        await this._waitForSocketConnected(serviceId);

        // Start the session to get QR
        await postSessionsIdAction(serviceId, 'start');

        // Fetch QR and inject/update modal (Socket.IO will refresh it on SCAN_QR)
        await this._fetchAndUpdateQr(serviceId);
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

  /** Fetch fresh QR from REST, then inject or update the modal image. */
  _fetchAndUpdateQr = async (serviceId: string, attempt = 1) => {
    try {
      const qrResponse = await getSessionsIdQr(serviceId);
      if (qrResponse.status !== 200) return;
      const { base64 } = qrResponse.data;
      if (!base64) return;

      const service = this._getService(serviceId);
      if (!service?.webview) {
        return;
      }

      // Check if modal exists, update or inject
      service.webview
        .executeJavaScript(
          `(function() {
            var el = document.getElementById('wa-akg-qr-modal');
            if (el) {
              var img = el.querySelector('.waa-qrimg');
              if (img) { img.src = '${base64.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'; }
              return 'updated';
            }
            return 'absent';
          })()`,
        )
        .then((result: string) => {
          if (result === 'absent') {
            this._injectQrModal({ serviceId, base64 });
          }
        })
        .catch(() => {
          this._injectQrModal({ serviceId, base64 });
        });
    } catch (error) {
      const status =
        error && typeof error === 'object' && 'status' in error
          ? (error as { status?: number }).status
          : undefined;
      if (status === 404 && attempt < this._qrFetchMaxAttempts) {
        debug(
          `QR not ready yet for ${serviceId} (attempt ${attempt}/${this._qrFetchMaxAttempts}), retrying...`,
        );
        await new Promise(resolve => {
          setTimeout(resolve, this._qrFetchRetryDelayMs);
        });
        await this._fetchAndUpdateQr(serviceId, attempt + 1);
        return;
      }
      debug('Error updating QR:', error);
    }
  };

  // ========== SOCKET.IO ========= //

  /** Start a Socket.IO connection for a specific session and join its room. */
  _startSocketIoForSession = (serviceId: string) => {
    // Don't create duplicate connections
    if (this._sockets.has(serviceId)) {
      debug(`Socket already exists for ${serviceId}, skipping`);
      return;
    }

    debug(
      `Starting Socket.IO connection to ${WA_AKG_BASE_URL}${WA_AKG_SOCKET_PATH} for ${serviceId}`,
    );

    const socket: Socket = io(WA_AKG_BASE_URL, {
      path: WA_AKG_SOCKET_PATH,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10_000,
    });

    socket.on('connect', () => {
      debug(`Socket.IO connected for ${serviceId}, joining room`);
      socket.emit('join-session', serviceId);
      this._resolveSocketConnectWaiters(serviceId);
    });

    socket.on(
      'connection.update',
      (update: { status: string; qr?: string; pairingCode?: string }) => {
        debug(`Socket.IO connection.update for ${serviceId}:`, update.status);
        this._handleSocketConnectionUpdate(serviceId, update);
      },
    );

    socket.on('disconnect', reason => {
      debug(`Socket.IO disconnected for ${serviceId}:`, reason);
      debug('Socket.IO disconnected for session', serviceId, reason);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        this._handleSocketConnectionUpdate(serviceId, {
          status: WA_SESSION_STATUS.SERVER_ERROR,
        });
      }
    });

    socket.on('connect_error', err => {
      console.error(
        `[WA-AKG] Socket.IO connect error for ${serviceId}:`,
        err.message,
      );
      debug('Socket.IO connection error for session', serviceId, err.message);
      this._handleSocketConnectionUpdate(serviceId, {
        status: WA_SESSION_STATUS.SERVER_ERROR,
      });
    });

    this._sockets.set(serviceId, socket);
  };

  _waitForSocketConnected = (
    serviceId: string,
    timeoutMs = 10_000,
  ): Promise<void> => {
    const socket = this._sockets.get(serviceId);
    if (!socket) return Promise.resolve();
    if (socket.connected) return Promise.resolve();

    return new Promise(resolve => {
      const timer = setTimeout(() => {
        resolve();
      }, timeoutMs);

      const resolveOnce = () => {
        clearTimeout(timer);
        resolve();
      };

      const waiters = this._socketConnectWaiters.get(serviceId) || [];
      waiters.push(resolveOnce);
      this._socketConnectWaiters.set(serviceId, waiters);
    });
  };

  _resolveSocketConnectWaiters = (serviceId: string) => {
    const waiters = this._socketConnectWaiters.get(serviceId);
    if (!waiters || waiters.length === 0) return;
    this._socketConnectWaiters.delete(serviceId);
    for (const resolve of waiters) resolve();
  };

  /** Handle real-time connection.update events from Socket.IO. */
  _handleSocketConnectionUpdate = (
    serviceId: string,
    update: { status: string },
  ) => {
    const { status } = update;
    debug(`Socket.IO connection.update for ${serviceId}:`, status);

    runInAction(() => {
      this.sessionStatuses.set(serviceId, status as SessionStatus);
    });

    // Update floating status indicator in webview
    this._injectOrUpdateStatusIndicator(serviceId, status);

    switch (status) {
      case WA_SESSION_STATUS.SCAN_QR: {
        // Baileys QR expires every ~20s, so always fetch a fresh base64 image
        runInAction(() => {
          this.isLoadingQr.set(serviceId, false);
          this.errorMessages.set(serviceId, undefined);
        });
        // Fetch new QR and update the existing modal (if any)
        this._fetchAndUpdateQr(serviceId);
        break;
      }

      case WA_SESSION_STATUS.CONNECTED: {
        debug(`Session ${serviceId} connected via Socket.IO!`);
        // Remove QR modal if present
        this._removeQrModal({ serviceId });
        // Notify the webview
        this._notifySessionConnected(serviceId);
        // Update status
        runInAction(() => {
          this.isLoadingQr.set(serviceId, false);
          this.errorMessages.set(serviceId, undefined);
        });
        break;
      }

      case WA_SESSION_STATUS.DISCONNECTED: {
        // Connection lost — update UI state
        runInAction(() => {
          this.isLoadingQr.set(serviceId, true);
        });
        // If there was a QR modal, it will auto-reconnect and show new QR
        debug('Session disconnected, waiting for reconnect...', serviceId);
        break;
      }

      case WA_SESSION_STATUS.STOPPED: {
        debug('Session stopped', serviceId);
        runInAction(() => {
          this.errorMessages.set(serviceId, 'WhatsApp session was stopped.');
          this.isLoadingQr.set(serviceId, false);
        });
        break;
      }

      case WA_SESSION_STATUS.LOGGED_OUT: {
        debug('Session logged out', serviceId);
        runInAction(() => {
          this.errorMessages.set(
            serviceId,
            'WhatsApp session was logged out. Please re-add the service.',
          );
          this.isLoadingQr.set(serviceId, false);
        });
        break;
      }

      default: {
        debug('Unhandled connection status:', status, 'for', serviceId);
      }
    }
  };

  /** Disconnect and clean up a Socket.IO connection for a session. */
  _stopSocketIoForSession = (serviceId: string) => {
    const socket = this._sockets.get(serviceId);
    if (socket) {
      debug('Disconnecting Socket.IO for session', serviceId);
      socket.removeAllListeners();
      socket.disconnect();
      this._sockets.delete(serviceId);
    }
  };

  /** Status indicator colors per state */
  _statusStyle = (status: string): { color: string; label: string } => {
    const map: Record<string, { color: string; label: string }> = {
      [WA_SESSION_STATUS.SCAN_QR]: {
        color: '#FF9800',
        label: '[WA-AKG] Scan QR',
      },
      [WA_SESSION_STATUS.CONNECTED]: {
        color: '#00E676',
        label: '[WA-AKG] Connected',
      },
      [WA_SESSION_STATUS.DISCONNECTED]: {
        color: '#FF5252',
        label: '[WA-AKG] Disconnected',
      },
      [WA_SESSION_STATUS.CONNECTING]: {
        color: '#448AFF',
        label: '[WA-AKG] Connecting...',
      },
      [WA_SESSION_STATUS.STOPPED]: {
        color: '#9E9E9E',
        label: '[WA-AKG] Stopped',
      },
      [WA_SESSION_STATUS.LOGGED_OUT]: {
        color: '#EF5350',
        label: '[WA-AKG] Logged Out',
      },
      [WA_SESSION_STATUS.SERVER_ERROR]: {
        color: '#FF1744',
        label: '[WA-AKG] Server Error',
      },
    };
    return map[status] || { color: '#9E9E9E', label: status };
  };

  /** Inject or update a floating status indicator (bottom-right) in the webview. */
  _injectOrUpdateStatusIndicator = (serviceId: string, status: string) => {
    const service = this._getService(serviceId);
    if (!service?.webview) return;

    const { color, label } = this._statusStyle(status);
    // Escape for JS string literal
    const escColor = color.replaceAll("'", "\\'");
    const escLabel = label.replaceAll("'", "\\'");

    const SID = 'wa-akg-si';
    const script = `
(function() {
  var old = document.getElementById('${SID}');
  if (old) {
    var dot = old.querySelector('.waa-si-dot');
    if (dot) dot.style.background = '${escColor}';
    var txt = old.querySelector('.waa-si-label');
    if (txt) txt.textContent = '${escLabel}';
    return;
  }
  var s = document.createElement('style');
  s.textContent = [
    '@keyframes waa-si-pulse{0%{box-shadow:0 0 0 0 ${escColor}88}70%{box-shadow:0 0 0 14px ${escColor}00}100%{box-shadow:0 0 0 0 ${escColor}00}}',
    '@keyframes waa-si-radar{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
    '#${SID}{position:fixed;bottom:20px;right:20px;z-index:2147483646;display:flex;align-items:center;gap:10px;background:rgba(11,20,26,0.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:30px;padding:10px 18px 10px 14px;box-shadow:0 4px 20px rgba(0,0,0,0.4);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;pointer-events:none;user-select:none}',
    '.waa-si-radar{position:relative;width:20px;height:20px;flex-shrink:0}',
    '.waa-si-dot{position:absolute;inset:4px;border-radius:50%;background:${escColor};z-index:2;animation:waa-si-pulse 2s infinite}',
    '.waa-si-sweep{position:absolute;inset:-3px;border-radius:50%;border:2px solid transparent;border-top-color:${escColor}44;animation:waa-si-radar 2s linear infinite}',
    '.waa-si-label{font-size:13px;font-weight:600;color:#e9edef;white-space:nowrap}'
  ].join('');
  document.head.appendChild(s);
  var el = document.createElement('div');
  el.id = '${SID}';
  el.innerHTML = '<div class="waa-si-radar"><div class="waa-si-dot"></div><div class="waa-si-sweep"></div></div><span class="waa-si-label">${escLabel}</span>';
  document.body.appendChild(el);
})();
`;
    service.webview.executeJavaScript(script).catch(() => {});
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
    if (document.getElementById('wa-akg-panel')) return;

    var SERVICE_ID = '${escapedServiceId}';
    var BASE64_QR = '${escapedBase64}';
    var currentTab = 'messages'; // Default tab
    var isExpanded = false; // Panel state

    // Inject styles for collapsible sidebar panel (Ferdium-styled)
    var s = document.createElement('style');
    s.textContent = [
      '@keyframes waa-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
      // Detect dark mode from body class
      'body:not(.theme__dark) .waa-panel{--waa-bg:#f7f7f9;--waa-bg-hover:#ececee;--waa-bg-active:#e3e3e5;--waa-border:#d9d9d9;--waa-text:#3e3e3e;--waa-text-muted:#868686;--waa-accent:#7367f0}',
      'body.theme__dark .waa-panel{--waa-bg:#1e1e1e;--waa-bg-hover:#2a2a2a;--waa-bg-active:#333;--waa-border:#3e3e3e;--waa-text:#ccc;--waa-text-muted:#7c7c7c;--waa-accent:#7367f0}',
      // Left panel: collapsible 68px -> 220px
      '.waa-panel{position:fixed;top:0;left:0;width:68px;height:100%;background:var(--waa-bg);z-index:2147483647;border-right:1px solid var(--waa-border);display:flex;flex-direction:column;transition:width 0.3s ease;overflow:hidden;box-shadow:2px 0 4px rgba(0,0,0,0.05)}',
      '.waa-panel.expanded{width:220px}',
      // Toggle button
      '.waa-toggle{display:flex;align-items:center;justify-content:center;height:50px;background:var(--waa-bg-active);border-bottom:1px solid var(--waa-border);cursor:pointer;color:var(--waa-text-muted);font-size:18px;transition:all 0.2s;user-select:none}',
      '.waa-toggle:hover{background:var(--waa-bg-hover);color:var(--waa-text)}',
      '.waa-toggle-icon{transition:transform 0.3s}',
      '.waa-panel.expanded .waa-toggle-icon{transform:rotate(180deg)}',
      // Tab navigation - vertical
      '.waa-tabs{display:flex;flex-direction:column;flex:1;padding:8px 0}',
      '.waa-tab{display:flex;align-items:center;padding:14px 0;color:var(--waa-text-muted);font-size:13px;cursor:pointer;border-left:3px solid transparent;transition:all 0.2s;white-space:nowrap}',
      '.waa-tab:hover{background:var(--waa-bg-hover);color:var(--waa-text)}',
      '.waa-tab.active{color:var(--waa-accent);border-left-color:var(--waa-accent);background:var(--waa-bg-active)}',
      '.waa-tab-icon{width:68px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}',
      '.waa-tab-label{opacity:0;transition:opacity 0.2s;margin-left:-10px;font-weight:500;color:var(--waa-text)}',
      '.waa-panel.expanded .waa-tab-label{opacity:1}',
      // Content cards (for QR overlay and profile page)
      '.waa-card{background:var(--waa-bg);border:1px solid var(--waa-border);border-radius:8px;padding:32px;text-align:center;width:90%;max-width:400px;color:var(--waa-text);margin:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}',
      '.waa-logo{margin-bottom:16px}',
      '.waa-title{font-size:20px;font-weight:600;margin:0 0 8px;color:var(--waa-text)}',
      '.waa-body{margin:20px 0;min-height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center}',
      '.waa-subtitle{font-size:14px;color:var(--waa-text-muted);margin:12px 0 0;line-height:1.5}',
      '.waa-qrimg{width:264px;height:264px;border-radius:8px;image-rendering:pixelated;border:1px solid var(--waa-border)}',
      '.waa-footer{font-size:12px;color:var(--waa-text-muted);margin-top:16px;line-height:1.5}',
      // Right pane: QR overlay (hidden by default)
      '.waa-qr-overlay{position:fixed;left:68px;top:0;width:calc(100% - 68px);height:100%;background:var(--waa-bg);z-index:2147483646;display:none;align-items:center;justify-content:center;transition:left 0.3s ease}',
      '.waa-panel.expanded ~ .waa-qr-overlay{left:220px;width:calc(100% - 220px)}',
      '.waa-qr-overlay.show{display:flex}',
      // WhatsApp Web native: adjust for sidebar (only target web.whatsapp.com)
      'body[data-wa-inject="true"] #app{position:fixed!important;left:68px!important;top:0!important;width:calc(100% - 68px)!important;height:100%!important;max-width:none!important;transition:all 0.3s ease!important}',
      'body[data-wa-inject="true"] .waa-panel.expanded ~ #app{left:220px!important;width:calc(100% - 220px)!important}',
      'body[data-wa-inject="true"] #app.hide{display:none!important}'
    ].join('');
    document.head.appendChild(s);

    // Mark body with data attribute for targeted styling
    document.body.setAttribute('data-wa-inject', 'true');

    // Create left panel with collapsible tabs
    var panel = document.createElement('div');
    panel.id = 'wa-akg-panel';
    panel.className = 'waa-panel';
    panel.innerHTML = 
      '<div class="waa-toggle" id="waa-toggle">' +
        '<span class="waa-toggle-icon">◀</span>' +
      '</div>' +
      '<div class="waa-tabs">' +
        '<div class="waa-tab active" data-tab="messages">' +
          '<span class="waa-tab-icon">💬</span>' +
          '<span class="waa-tab-label">消息</span>' +
        '</div>' +
        '<div class="waa-tab" data-tab="account">' +
          '<span class="waa-tab-icon">🔑</span>' +
          '<span class="waa-tab-label">账号管理</span>' +
        '</div>' +
        '<div class="waa-tab" data-tab="profile">' +
          '<span class="waa-tab-icon">👤</span>' +
          '<span class="waa-tab-label">用户画像</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(panel);

    // Create QR overlay for account management tab
    var qrOverlay = document.createElement('div');
    qrOverlay.className = 'waa-qr-overlay';
    qrOverlay.id = 'waa-qr-overlay';
    qrOverlay.innerHTML = '<div class="waa-card">' +
      '<div class="waa-logo"><svg viewBox="0 0 39 39" width="26" height="26"><path fill="#00E676" d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-15.9 16.1 0 3 .9 5.9 2.4 8.4l.4.6-1.6 5.9 6-1.5z"/><path fill="#fff" d="M32.4 6.4C29 2.9 24.3 1 19.5 1 9.3 1 1.1 9.3 1.2 19.4c0 3.2.9 6.3 2.4 9.1L1 38l9.7-2.5c2.7 1.5 5.7 2.2 8.7 2.2 10.1 0 18.3-8.3 18.3-18.4 0-4.9-1.9-9.5-5.3-12.9zM19.5 34.6c-2.7 0-5.4-.7-7.7-2.1l-.6-.3-5.8 1.5L6.9 28l-.4-.6c-1.5-2.4-2.3-5.2-2.3-8 0-8.4 6.8-15.2 15.2-15.2 4.1 0 7.9 1.6 10.8 4.5 2.9 2.9 4.5 6.8 4.5 10.9-.1 8.4-6.9 15.2-15.2 15.2zm8.4-11.4c-.5-.3-2.7-1.3-3.1-1.5-.4-.2-.7-.2-1 .2-.3.5-1.2 1.5-1.5 1.8-.3.3-.5.3-1 .1-.5-.3-2-1-3.8-2.3-1.4-1-2.3-2.2-2.6-2.6-.3-.3-.1-.5.2-.7.2-.2.5-.5.7-.8.2-.3.3-.5.5-.8.2-.3.1-.6 0-.8-.1-.3-1-2.4-1.4-3.3-.4-.9-.7-.8-1-.8-.3 0-.6 0-.9 0-.3 0-.8.1-1.2.6-.4.5-1.6 1.6-1.6 3.8 0 2.2 1.6 4.4 1.9 4.7.2.3 3.2 4.9 7.8 6.8 1.1.5 1.9.7 2.6.9 1.1.3 2.1.2 2.9.2.9 0 2.6-.7 3-1.3.4-.7.4-1.2.3-1.3-.2-.3-.4-.5-.8-.7z"/></svg></div>' +
      '<h2 class="waa-title">Link Your WhatsApp</h2>' +
      '<div class="waa-body" id="waa-qr-body">' +
      '  <div class="waa-spinner"></div>' +
      '  <p class="waa-subtitle">Loading QR code...</p>' +
      '</div>' +
      '<p class="waa-footer">Open WhatsApp on your phone to scan the QR code</p>' +
      '</div>';
    document.body.appendChild(qrOverlay);

    // Show QR code
    var qrBody = document.getElementById('waa-qr-body');
    if (qrBody && BASE64_QR) {
      qrBody.innerHTML = '<img src="' + BASE64_QR + '" alt="QR Code" class="waa-qrimg"/><p class="waa-subtitle">Scan this QR code with your WhatsApp mobile app</p>';
    }

    // Tab switching logic
    function switchTab(tab) {
      currentTab = tab;
      var appElement = document.getElementById('app');
      var qrOverlay = document.getElementById('waa-qr-overlay');
      var tabs = document.querySelectorAll('.waa-tab');
      
      // Update tab active state
      tabs.forEach(function(t) {
        if (t.getAttribute('data-tab') === tab) {
          t.classList.add('active');
        } else {
          t.classList.remove('active');
        }
      });

      // Switch content
      if (tab === 'messages') {
        if (appElement) appElement.classList.remove('hide');
        if (qrOverlay) qrOverlay.classList.remove('show');
      } else if (tab === 'account') {
        if (appElement) appElement.classList.add('hide');
        if (qrOverlay) qrOverlay.classList.add('show');
      } else if (tab === 'profile') {
        // Show placeholder in QR overlay
        if (appElement) appElement.classList.add('hide');
        if (qrOverlay) {
          qrOverlay.classList.add('show');
          qrOverlay.innerHTML = '<div class="waa-card"><div class="waa-body"><p class="waa-title">用户画像</p><p class="waa-subtitle">功能开发中，敬请期待...</p></div></div>';
        }
      }
    }

    // Toggle panel expand/collapse
    function togglePanel() {
      isExpanded = !isExpanded;
      var panel = document.getElementById('wa-akg-panel');
      if (panel) {
        if (isExpanded) {
          panel.classList.add('expanded');
        } else {
          panel.classList.remove('expanded');
        }
      }
    }

    // Bind toggle button
    var toggleBtn = document.getElementById('waa-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', togglePanel);
    }

    // Bind tab click events
    var tabs = document.querySelectorAll('.waa-tab');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        var targetTab = this.getAttribute('data-tab');
        // Restore QR overlay content if switching back to account
        if (targetTab === 'account') {
          var qrOverlay = document.getElementById('waa-qr-overlay');
          if (qrOverlay && !qrOverlay.querySelector('.waa-logo')) {
            qrOverlay.innerHTML = '<div class="waa-card">' +
              '<div class="waa-logo"><svg viewBox="0 0 39 39" width="26" height="26"><path fill="#00E676" d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-15.9 16.1 0 3 .9 5.9 2.4 8.4l.4.6-1.6 5.9 6-1.5z"/><path fill="#fff" d="M32.4 6.4C29 2.9 24.3 1 19.5 1 9.3 1 1.1 9.3 1.2 19.4c0 3.2.9 6.3 2.4 9.1L1 38l9.7-2.5c2.7 1.5 5.7 2.2 8.7 2.2 10.1 0 18.3-8.3 18.3-18.4 0-4.9-1.9-9.5-5.3-12.9zM19.5 34.6c-2.7 0-5.4-.7-7.7-2.1l-.6-.3-5.8 1.5L6.9 28l-.4-.6c-1.5-2.4-2.3-5.2-2.3-8 0-8.4 6.8-15.2 15.2-15.2 4.1 0 7.9 1.6 10.8 4.5 2.9 2.9 4.5 6.8 4.5 10.9-.1 8.4-6.9 15.2-15.2 15.2zm8.4-11.4c-.5-.3-2.7-1.3-3.1-1.5-.4-.2-.7-.2-1 .2-.3.5-1.2 1.5-1.5 1.8-.3.3-.5.3-1 .1-.5-.3-2-1-3.8-2.3-1.4-1-2.3-2.2-2.6-2.6-.3-.3-.1-.5.2-.7.2-.2.5-.5.7-.8.2-.3.3-.5.5-.8.2-.3.1-.6 0-.8-.1-.3-1-2.4-1.4-3.3-.4-.9-.7-.8-1-.8-.3 0-.6 0-.9 0-.3 0-.8.1-1.2.6-.4.5-1.6 1.6-1.6 3.8 0 2.2 1.6 4.4 1.9 4.7.2.3 3.2 4.9 7.8 6.8 1.1.5 1.9.7 2.6.9 1.1.3 2.1.2 2.9.2.9 0 2.6-.7 3-1.3.4-.7.4-1.2.3-1.3-.2-.3-.4-.5-.8-.7z"/></svg></div>' +
              '<h2 class="waa-title">Link Your WhatsApp</h2>' +
              '<div class="waa-body" id="waa-qr-body">' +
              (BASE64_QR ? '<img src="' + BASE64_QR + '" alt="QR Code" class="waa-qrimg"/><p class="waa-subtitle">Scan this QR code with your WhatsApp mobile app</p>' : '<p class="waa-subtitle">Loading QR code...</p>') +
              '</div>' +
              '<p class="waa-footer">Open WhatsApp on your phone to scan the QR code</p>' +
              '</div>';
          }
        }
        switchTab(targetTab);
      });
    });

    // Initialize with messages tab
    switchTab('messages');

    // Listen for connection notification from host
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'wa-akg:session-connected') {
        var qrBody = document.getElementById('waa-qr-body');
        if (!qrBody) return;
        qrBody.innerHTML = '<div style="text-align:center;padding:20px;"><div style="font-size:48px;margin-bottom:12px;">&#10004;&#65039;</div><p style="color:#00a884;font-weight:600;font-size:16px;">Connected!</p></div>';
        setTimeout(function() {
          switchTab('messages');
        }, 1500);
      }
    });

    debug('WA-AKG panel injected for service', SERVICE_ID);
  } catch(e) {
    console.error('[WA-AKG] Panel injection error:', e);
  }
})();
`;
  };
}
