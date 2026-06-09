/* eslint-disable no-useless-escape */
import {
  action,
  computed,
  makeObservable,
  observable,
  reaction,
  runInAction,
} from 'mobx';
import { type Socket, io } from 'socket.io-client';
import type { Stores } from '../../@types/stores.types';
import type { Actions } from '../../actions/lib/actions';
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
  deleteSessionsIdSettings,
  getSessions,
  getSessionsIdQr,
  postSessions,
  postSessionsIdAction,
} from '../../whatsapp-automation/api/generated/sessions/sessions';

import { createWhatsappBindingApiV1WhatsappBindPost } from '../../agent-flow-cs/api/generated/whatsapp/whatsapp';
import authManager from '../../lib/auth/AuthManager';
import { clearApiKey, getApiKey } from '../../whatsapp-automation/api/auth';
import type { Session } from '../../whatsapp-automation/api/generated/wAAKGAPIDocumentation.schemas';

const debug = require('../../preload-safe-debug')(
  'Ferdium:feature:whatsapp-automation:store',
);

export default class WhatsAppAutomationStore extends FeatureStore {
  @observable stores: Stores | null = null;

  actions: Actions | null = null;

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

  @observable sessionStatuses = new Map<string, string | undefined>();

  @observable qrCodes = new Map<string, string | undefined>();

  _sessionInfo = new Map<
    string,
    { sessionName?: string; sessionId?: string }
  >();

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

  @action start(stores: Stores, actions: Actions) {
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
        this._cleanUpSessionState(trackedId);
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
          const normalizedStatus: string =
            matchingSession.status?.toUpperCase() ?? '';
          this._sessionInfo.set(serviceId, {
            sessionName: matchingSession.name,
            sessionId: matchingSession.sessionId,
          });

          runInAction(() => {
            this.sessionStatuses.set(serviceId, normalizedStatus);
          });

          if (normalizedStatus === WA_SESSION_STATUS.CONNECTED) {
            this._removeQrModal({ serviceId });
            // Update status indicator (Socket.IO won't emit for already-connected)
            this._injectOrUpdateStatusIndicator(
              serviceId,
              WA_SESSION_STATUS.CONNECTED,
            );

            this._injectStatusWhenReady(serviceId, WA_SESSION_STATUS.CONNECTED);
            this._notifySessionConnected(serviceId);
          } else {
            debug(
              `Session ${serviceId} status: ${normalizedStatus}, starting & fetching QR...`,
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
              runInAction(() => {
                this.isLoadingQr.set(serviceId, false);
              });
            }
            this._updateQrModalStatus(serviceId, WA_SESSION_STATUS.CONNECTING);
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
    sessionName,
    sessionId,
    sessionStatus,
  }: {
    serviceId: string;
    base64: string;
    sessionName?: string;
    sessionId?: string;
    sessionStatus?: string;
  }) => {
    const service = this._getService(serviceId);
    if (!service?.webview) {
      debug('Cannot inject QR modal - no webview for service', serviceId);
      return;
    }

    if (this.sessionStatuses.get(serviceId) === WA_SESSION_STATUS.CONNECTED) {
      debug('Skip QR modal injection for already-connected session', serviceId);
      return;
    }

    const script = this._buildQrModalScript(
      serviceId,
      base64,
      sessionName,
      sessionId,
      sessionStatus,
    );

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
        this._scheduleRetryInjection(serviceId, base64, sessionName, sessionId);
      });
  };

  _scheduleRetryInjection = (
    serviceId: string,
    base64: string,
    sessionName?: string,
    sessionId?: string,
    sessionStatus?: string,
  ) => {
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
      this._injectQrModal({
        serviceId,
        base64,
        sessionName,
        sessionId,
        sessionStatus,
      });
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

  deleteSessionForService = async (serviceId: string): Promise<void> => {
    debug('Deleting WA-AKG session for service', serviceId);
    this._cleanUpSessionState(serviceId);

    const authenticated = await this._ensureAuthenticated();
    if (!authenticated) {
      debug('Skipping WA-AKG session delete because authentication failed');
      return;
    }

    try {
      await deleteSessionsIdSettings(serviceId);
      debug('WA-AKG session deleted for service', serviceId);
    } catch (error) {
      debug('Failed to delete WA-AKG session for service', serviceId, error);
    }
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

        // Set agent-flow-cs Bearer token from AKG API key, then notify agent-flow-cs
        // to bind this session (create WhatsAppBinding + register webhook)
        const akgApiKey = getApiKey();
        if (akgApiKey) {
          try {
            // POST /api/v1/whatsapp/bind
            // customInstance.ts will automatically attach X-AKG-Api-Key header
            await createWhatsappBindingApiV1WhatsappBindPost({
              session_id: serviceId,
            });
            debug(
              'Agent Flow CS webhook binding triggered for session',
              serviceId,
            );
          } catch (bindError) {
            // Non-blocking: session is still usable, just webhook won't be registered
            debug(
              'Agent Flow CS webhook binding failed (non-blocking):',
              bindError,
            );
          }
        } else {
          debug(
            'No AKG API key available, skipping agent-flow-cs webhook binding',
          );
        }

        // Ensure Socket.IO is connected and join room BEFORE starting
        // (so we don't miss early connection.update events)
        this._startSocketIoForSession(serviceId);
        await this._waitForSocketConnected(serviceId);

        // Start the session to get QR
        await postSessionsIdAction(serviceId, 'start');

        this._sessionInfo.set(serviceId, {
          sessionName: createResponse.data?.name,
          sessionId: createResponse.data?.sessionId,
        });

        this._updateQrModalStatus(serviceId, WA_SESSION_STATUS.CONNECTING);
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
  _fetchAndUpdateQr = async (
    serviceId: string,
    sessionName?: string,
    sessionId?: string,
    sessionStatus?: string,
    attempt = 1,
  ) => {
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
            this._injectQrModal({
              serviceId,
              base64,
              sessionName,
              sessionId,
              sessionStatus,
            });
          }
        })
        .catch(() => {
          this._injectQrModal({
            serviceId,
            base64,
            sessionName,
            sessionId,
            sessionStatus,
          });
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
        await this._fetchAndUpdateQr(
          serviceId,
          sessionName,
          sessionId,
          sessionStatus,
          attempt + 1,
        );
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
      this.sessionStatuses.set(serviceId, status);
    });

    // Update floating status indicator in webview
    this._injectOrUpdateStatusIndicator(serviceId, status);
    this._updateQrModalStatus(serviceId, status);

    switch (status) {
      case WA_SESSION_STATUS.SCAN_QR: {
        // Baileys QR expires every ~20s, so always fetch a fresh base64 image
        runInAction(() => {
          this.isLoadingQr.set(serviceId, false);
          this.errorMessages.set(serviceId, undefined);
        });
        // Fetch new QR and update the existing modal (if any)
        const info = this._sessionInfo.get(serviceId);
        this._fetchAndUpdateQr(
          serviceId,
          info?.sessionName,
          info?.sessionId,
          status,
        );
        break;
      }

      case WA_SESSION_STATUS.CONNECTED: {
        debug(`Session ${serviceId} connected via Socket.IO!`);
        // Ensure QR modal is removed if present
        this._removeQrModal({ serviceId });
        // Notify the webview
        this._notifySessionConnected(serviceId);
        // Update status
        this._injectOrUpdateStatusIndicator(
          serviceId,
          WA_SESSION_STATUS.CONNECTED,
        );
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

  @action _cleanUpSessionState = (serviceId: string) => {
    this._initializedServices.delete(serviceId);
    this._retryCounts.delete(serviceId);
    this._sessionInfo.delete(serviceId);
    this._socketConnectWaiters.delete(serviceId);
    this._stopSocketIoForSession(serviceId);
    this.sessionStatuses.delete(serviceId);
    this.qrCodes.delete(serviceId);
    this.isLoadingQr.delete(serviceId);
    this.errorMessages.delete(serviceId);
  };

  _updateQrModalStatus = (serviceId: string, status: string) => {
    const service = this._getService(serviceId);
    if (!service?.webview) return;

    const { color, label } = this._statusStyle(status);
    const escColor = color.replaceAll("'", "\\'");
    const escLabel = label.replaceAll("'", "\\'");

    const script = `
(function() {
  try {
    var bar = document.querySelector('#wa-akg-qr-modal .waa-status-bar');
    if (!bar) return;
    bar.textContent = '${escLabel}';
    bar.style.color = '${escColor}';
    bar.style.display = 'block';
  } catch(e) {
    console.error('[WA-AKG] Error updating modal status:', e);
  }
})();
`;
    service.webview.executeJavaScript(script).catch(() => {
      // Ignore - webview might already be navigating
    });
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

  private _injectStatusWhenReady = (
    serviceId: string,
    status: string,
    attempt = 1,
  ) => {
    if (attempt > 5) return;
    this._injectOrUpdateStatusIndicator(serviceId, status);
    setTimeout(
      () => this._injectStatusWhenReady(serviceId, status, attempt + 1),
      1000,
    );
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

  _buildQrModalScript = (
    serviceId: string,
    base64: string,
    sessionName?: string,
    sessionId?: string,
    sessionStatus?: string,
  ): string => {
    // Uses template literal escaping specific to inject context
    const escapedServiceId = serviceId
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'");
    const escapedBase64 = base64
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'");
    const escapedSessionName = (sessionName || '')
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'");
    const escapedSessionId = (sessionId || '')
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'");
    const escapedSessionStatus = (sessionStatus || '')
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'");

    const statusStyle = sessionStatus ? this._statusStyle(sessionStatus) : null;
    const statusColor = statusStyle?.color ?? '#9E9E9E';
    const statusLabel = statusStyle?.label ?? '';
    const escapedStatusColor = statusColor.replaceAll("'", "\\'");
    const escapedStatusLabel = statusLabel.replaceAll("'", "\\'");

    return `
(function() {
  try {
    if (document.getElementById('wa-akg-qr-modal')) return;

    var SERVICE_ID = '${escapedServiceId}';
    var BASE64_QR = '${escapedBase64}';
    var SESSION_NAME = '${escapedSessionName}';
    var SESSION_ID = '${escapedSessionId}';
    var SESSION_STATUS = '${escapedSessionStatus}';
    var STATUS_COLOR = '${escapedStatusColor}';
    var STATUS_LABEL = '${escapedStatusLabel}';
    
    var SESSION_DISPLAY = SESSION_NAME || SESSION_ID || SERVICE_ID;
    var SESSION_META = [];
    if (SESSION_NAME) SESSION_META.push('Name: ' + SESSION_NAME);
    if (SESSION_ID) SESSION_META.push('Session ID: ' + SESSION_ID);
    if (!SESSION_NAME && !SESSION_ID) SESSION_META.push('Service ID: ' + SERVICE_ID);
    
    var SESSION_META_HTML = SESSION_META.map(function(line) {
      return '<div class=\"waa-session-line\">' + line + '</div>';
    }).join('');
    
    var SESSION_INFO_HTML = '<div class=\"waa-session-info\"><div class=\"waa-session-label\">Session</div><div class=\"waa-session-value\">' + SESSION_DISPLAY + '</div>' + SESSION_META_HTML + '</div>';
    var STATUS_HTML = SESSION_STATUS ? '<div class=\"waa-status-bar\" style=\"color:' + STATUS_COLOR + '\">' + STATUS_LABEL + '</div>' : '';

    // Inject styles
    var s = document.createElement('style');
    s.textContent = [
      '@keyframes waa-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
      '.waa-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:2147483647}',
      '.waa-card{background:#1f2c33;border-radius:12px;padding:32px;text-align:center;max-width:400px;width:90%;color:#fff}',
      '.waa-logo{margin-bottom:12px}',
      '.waa-title{font-size:20px;font-weight:600;margin:0 0 8px;color:#e9edef}',
      '.waa-session-info{margin:12px 0 16px;padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;border:1px solid rgba(255,255,255,0.1);text-align:left}',
      '.waa-session-label{font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#00E676;margin-bottom:4px;font-weight:700}',
      '.waa-session-value{font-size:15px;color:#fff;font-weight:600;margin-bottom:8px;word-break:break-all}',
      '.waa-session-line{font-size:12px;color:#8696a0;font-family:monospace;word-break:break-all}',
      '.waa-status-bar{margin:16px 0;font-size:14px;font-weight:600;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px}',
      '.waa-body{margin:20px 0;min-height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center}',
      '.waa-subtitle{font-size:14px;color:#8696a0;margin:8px 0 0}',
      '.waa-qrimg{width:256px;height:256px;border-radius:4px;image-rendering:pixelated}',
      '.waa-footer{font-size:12px;color:#667781;margin-top:16px}'
    ].join('');
    document.head.appendChild(s);

    // Create modal
    var modal = document.createElement('div');
    modal.id = 'wa-akg-qr-modal';
    modal.innerHTML = '<div class=\"waa-overlay\"><div class=\"waa-card\">' +
      '<div class=\"waa-logo\"><svg viewBox=\"0 0 39 39\" width=\"26\" height=\"26\"><path fill=\"#00E676\" d=\"M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-15.9 16.1 0 3 .9 5.9 2.4 8.4l.4.6-1.6 5.9 6-1.5z\"/><path fill=\"#fff\" d=\"M32.4 6.4C29 2.9 24.3 1 19.5 1 9.3 1 1.1 9.3 1.2 19.4c0 3.2.9 6.3 2.4 9.1L1 38l9.7-2.5c2.7 1.5 5.7 2.2 8.7 2.2 10.1 0 18.3-8.3 18.3-18.4 0-4.9-1.9-9.5-5.3-12.9zM19.5 34.6c-2.7 0-5.4-.7-7.7-2.1l-.6-.3-5.8 1.5L6.9 28l-.4-.6c-1.5-2.4-2.3-5.2-2.3-8 0-8.4 6.8-15.2 15.2-15.2 4.1 0 7.9 1.6 10.8 4.5 2.9 2.9 4.5 6.8 4.5 10.9-.1 8.4-6.9 15.2-15.2 15.2zm8.4-11.4c-.5-.3-2.7-1.3-3.1-1.5-.4-.2-.7-.2-1 .2-.3.5-1.2 1.5-1.5 1.8-.3.3-.5.3-1 .1-.5-.3-2-1-3.8-2.3-1.4-1-2.3-2.2-2.6-2.6-.3-.3-.1-.5.2-.7.2-.2.5-.5.7-.8.2-.3.3-.5.5-.8.2-.3.1-.6 0-.8-.1-.3-1-2.4-1.4-3.3-.4-.9-.7-.8-1-.8-.3 0-.6 0-.9 0-.3 0-.8.1-1.2.6-.4.5-1.6 1.6-1.6 3.8 0 2.2 1.6 4.4 1.9 4.7.2.3 3.2 4.9 7.8 6.8 1.1.5 1.9.7 2.6.9 1.1.3 2.1.2 2.9.2.9 0 2.6-.7 3-1.3.4-.7.4-1.2.3-1.3-.2-.3-.4-.5-.8-.7z\"/></svg></div>' +
      '<h2 class=\"waa-title\">Link Your WhatsApp</h2>' +
      SESSION_INFO_HTML +
      STATUS_HTML +
      '<div class=\"waa-body\" id=\"waa-body\">' +
      '  <div class=\"waa-spinner\"></div>' +
      '  <p class=\"waa-subtitle\">Loading QR code...</p>' +
      '</div>' +
      '<p class=\"waa-footer\">Open WhatsApp on your phone to scan the QR code</p>' +
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
        body.innerHTML = '<div style=\"text-align:center;padding:20px;\"><div style=\"font-size:48px;margin-bottom:12px;\">&#10004;&#65039;</div><p style=\"color:#00a884;font-weight:600;font-size:16px;\">Connected!</p></div>';
        setTimeout(function() {
          modal.style.opacity = '0';
          setTimeout(function() { modal.remove(); }, 500);
        }, 1000);
      }
    });

    // Show QR code
    var bodyEl = document.getElementById('waa-body');
    if (bodyEl && BASE64_QR) {
      bodyEl.innerHTML = '<img src=\"' + BASE64_QR + '\" alt=\"QR Code\" class=\"waa-qrimg\"/><p class=\"waa-subtitle\">Scan this QR code with your WhatsApp mobile app</p>';
    }

    debug('QR auth modal injected for service', SERVICE_ID);
  } catch(e) {
    console.error('[WA-AKG] QR modal injection error:', e);
  }
})();
`;
  };
}
