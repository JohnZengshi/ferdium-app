import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
  getSessionsId,
  getSessionsIdQr,
  postSessions,
  postSessionsIdAction,
} from '../../whatsapp-automation/api/generated/sessions/sessions';

import { createWhatsappBindingApiV1WhatsappBindPost } from '../../agent-flow-cs/api/generated/whatsapp/whatsapp';
import authManager from '../../lib/auth/AuthManager';
import { clearApiKey, getApiKey } from '../../whatsapp-automation/api/auth';
import type { Session } from '../../whatsapp-automation/api/generated/wAAKGAPIDocumentation.schemas';

import { asarPath } from '../../helpers/asar-helpers';

const debug = require('../../preload-safe-debug')(
  'Ferdium:feature:whatsapp-automation:store',
);

const getAssetBase64 = (assetPath: string): string => {
  try {
    const fullPath = asarPath(join(__dirname, assetPath));
    debug('Reading asset from path:', fullPath);
    const buffer = readFileSync(fullPath);
    const ext = fullPath.split('.').pop()?.toLowerCase() || 'png';
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      mp4: 'video/mp4',
      webm: 'video/webm',
    };
    const mime = mimeMap[ext] || 'application/octet-stream';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (error) {
    debug(
      '[WA-AKG] Error reading asset for base64 conversion:',
      assetPath,
      error,
    );
    return '';
  }
};

const normalizeWaMe = (
  me: Record<string, unknown> | null | undefined,
): { jid?: string; pushName?: string } | undefined =>
  me
    ? {
        jid:
          typeof me.id === 'string'
            ? me.id
            : typeof me.jid === 'string'
              ? me.jid
              : undefined,
        pushName:
          typeof me.name === 'string'
            ? me.name
            : typeof me.pushName === 'string'
              ? me.pushName
              : undefined,
      }
    : undefined;

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

  @observable sessionInfo = new Map<
    string,
    {
      sessionName?: string;
      sessionId?: string;
      me?: {
        jid?: string;
        pushName?: string;
      };
    }
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

  /**
   * Fetch all sessions from the API and update sessionStatuses Map.
   * Used by HomeScreen to refresh the social account overview.
   */
  @action async fetchAllSessionStatuses(): Promise<void> {
    debug('fetchAllSessionStatuses called');

    const authenticated = await this._ensureAuthenticated();
    if (!authenticated) {
      debug('Cannot fetch sessions: authentication failed');
      return;
    }

    try {
      const response = await getSessions();

      if (response.status === 200) {
        const sessions: Session[] = response.data;
        debug(`Fetched ${sessions.length} sessions from API`);

        runInAction(() => {
          for (const session of sessions) {
            if (session.sessionId) {
              const normalizedStatus =
                session.status?.toUpperCase() ?? 'DISCONNECTED';
              this.sessionStatuses.set(session.sessionId, normalizedStatus);
              debug(
                `Updated status for ${session.sessionId}: ${normalizedStatus}`,
              );
            }
          }
        });
      } else {
        debug('Failed to fetch sessions, response status:', response.status);
      }
    } catch (error) {
      debug('Error fetching all session statuses:', error);
    }
  }

  @action async _refreshSessionDetails(serviceId: string): Promise<void> {
    debug('_refreshSessionDetails called for', serviceId);

    const authenticated = await this._ensureAuthenticated();
    if (!authenticated) {
      debug('Cannot refresh session details: authentication failed');
      return;
    }

    try {
      const response = await getSessionsId(serviceId);

      if (response.status !== 200) {
        debug(
          'Failed to get session details, status:',
          response.status,
          'for',
          serviceId,
        );
        return;
      }

      const detail = response.data;
      const me = detail.me as Record<string, unknown> | null | undefined;
      const normalized = normalizeWaMe(me);

      runInAction(() => {
        const existing = this.sessionInfo.get(serviceId) ?? {};
        this.sessionInfo.set(serviceId, {
          ...existing,
          sessionName: detail.name,
          sessionId: detail.sessionId,
          me: normalized,
        });

        if (detail.status) {
          this.sessionStatuses.set(serviceId, detail.status.toUpperCase());
        }
      });

      debug(`Refreshed session details for ${serviceId}:`, normalized);
    } catch (error) {
      debug('Error refreshing session details:', error);
    }
  }

  /**
   * Check if account binding is complete for a service.
   * Returns true only if both AKG and Ferdium are logged in with the same account.
   * @param serviceId - Service ID to check
   */
  @action async checkAccountBinding(serviceId: string): Promise<boolean> {
    debug('checkAccountBinding called for', serviceId);

    const authenticated = await this._ensureAuthenticated();
    if (!authenticated) {
      debug('Cannot check account binding: authentication failed');
      return false;
    }

    try {
      // Check AKG session status and account info
      const response = await getSessionsId(serviceId);

      if (response.status !== 200) {
        debug('Failed to get session details, status:', response.status);
        return false;
      }

      const sessionData = response.data;

      // Check if AKG is connected and has account info
      const isAkgLoggedIn =
        sessionData.status?.toUpperCase() === 'CONNECTED' &&
        sessionData.hasInstance === true &&
        sessionData.me !== null &&
        sessionData.me !== undefined;

      if (!isAkgLoggedIn) {
        debug('AKG not logged in for service', serviceId);
        return false;
      }

      // Check if Ferdium Service is ready
      const service = this._getService(serviceId);
      if (!service) {
        debug('Service not found:', serviceId);
        return false;
      }

      const isFerdiumReady =
        service.isEnabled &&
        service.isAttached &&
        service.webview !== null &&
        !service.isLoading;

      if (!isFerdiumReady) {
        debug('Ferdium service not ready for', serviceId);
        return false;
      }

      // Check if WhatsApp is actually logged in within Ferdium webview
      // by detecting the presence of logged-in UI elements
      try {
        const isWhatsAppLoggedIn = await service.webview.executeJavaScript(`
          (function() {
            try {
              // Check if QR modal is still present (means NOT logged in)
              const hasQrModal = !!document.getElementById('wa-akg-qr-modal');
              if (hasQrModal) {
                return false;
              }

              // Check for WhatsApp Web logged-in indicators
              // Multiple checks to ensure robustness
              const hasUserPanel = !!document.querySelector('div[data-testid="default-user"]');
              const hasChatList = !!document.querySelector('div#pane-side');
              const hasMainApp = !!document.querySelector('div#app > div > div > div');
              const hasSearchInput = !!document.querySelector('div[contenteditable="true"][data-testid="chat-list-search"]');

              // At least 2 indicators must be present to confirm login
              const indicators = [hasUserPanel, hasChatList, hasMainApp, hasSearchInput];
              const positiveCount = indicators.filter(Boolean).length;

              return positiveCount >= 2;
            } catch(e) {
              return false;
            }
          })();
        `);

        if (!isWhatsAppLoggedIn) {
          debug('WhatsApp not logged in within Ferdium webview for', serviceId);
          return false;
        }
      } catch (jsError) {
        debug('Failed to check WhatsApp login status in webview:', jsError);
        return false;
      }

      debug('Account binding complete for', serviceId);
      return true;
    } catch (error) {
      debug('Error checking account binding:', error);
      return false;
    }
  }

  /**
   * Check if any WhatsApp service has completed account binding.
   * Returns true if at least one service is fully bound.
   */
  @action async hasAnyAccountBinding(): Promise<boolean> {
    const services = this.whatsAppServices;
    if (services.length === 0) {
      return false;
    }

    // Check all services in parallel to avoid await-in-loop
    const results = await Promise.all(
      services.map(service => this.checkAccountBinding(service.id)),
    );

    return results.some(Boolean);
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
          this.sessionInfo.set(serviceId, {
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
            this._refreshSessionDetails(serviceId).catch(error => {
              debug('Error refreshing session details after connect:', error);
            });
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
    backgroundBase64,
  }: {
    serviceId: string;
    base64: string;
    backgroundBase64?: string;
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
      backgroundBase64 || '',
    );

    // Inject via executeJavaScript (only working path from renderer to webview)
    service.webview
      .executeJavaScript(script)
      .then(() => {
        debug('QR modal script injected into service', serviceId);
        this._retryCounts.delete(serviceId);
      })
      .catch((error: Error) => {
        debug('QR modal injection failed:', error);
        // Retry if the webview hasn't loaded yet or hit a transient error
        this._scheduleRetryInjection(serviceId, base64, backgroundBase64);
      });
  };

  @action _injectSuccessModal = (serviceId: string) => {
    const service = this._getService(serviceId);
    if (!service?.webview) {
      debug('Cannot inject success modal - no webview for service', serviceId);
      return;
    }

    const successVideoPath = '../../assets/images/whatsapp/success-animation.mp4';
    const successVideoBase64 = getAssetBase64(successVideoPath);

    const script = this._buildSuccessModalScript(successVideoBase64);

    service.webview.executeJavaScript(script).catch((error: Error) => {
      debug('Success modal injection failed:', error);
    });
  };

  _scheduleRetryInjection = (
    serviceId: string,
    base64: string,
    backgroundBase64?: string,
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
        backgroundBase64,
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
          // Remove injected event listeners and restore pushState
          if (window.__waAkgQrListeners) {
            document.removeEventListener('keydown', window.__waAkgQrListeners.keydown, true);
            window.removeEventListener('popstate', window.__waAkgQrListeners.popstate);
            window.removeEventListener('message', window.__waAkgQrListeners.message);
            delete window.__waAkgQrListeners;
          }
          if (window.__waAkgOriginalPushState) {
            history.pushState = window.__waAkgOriginalPushState;
            delete window.__waAkgOriginalPushState;
          }
        } catch(e) {
          debug('[WA-AKG] Error removing QR modal:', e);
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

      const proxyData = this.stores?.settings?.proxy?.[serviceId];
      let proxyUrl: string | undefined;
      if (proxyData?.isEnabled && proxyData?.host && proxyData?.port) {
        const protocol = proxyData?.protocol || 'http';
        const { host, port, user, password } = proxyData;
        proxyUrl =
          user && password
            ? `${protocol}://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}`
            : `${protocol}://${host}:${port}`;
      }

      const createResponse = await postSessions({
        name: `Ferdium-${serviceId}`,
        sessionId: serviceId,
        ...(proxyUrl ? { proxyUrl } : {}),
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

        this.sessionInfo.set(serviceId, {
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

  _fetchAndShowQrCode = async (serviceId: string, attempt = 1) => {
    if (attempt > 6) {
      debug('Max attempts reached for QR code fetch, stopping');
      return;
    }
    try {
      debug('Fetching QR code from WA-AKG for service', serviceId);

      const qrResponse = await getSessionsIdQr(serviceId);

      if (qrResponse.status === 200) {
        const qrData = qrResponse.data;
        const base64 = qrData.base64 || '';
        const backgroundBase64 = getAssetBase64(
          '../../assets/images/whatsapp/qr-modal-background.png',
        );

        if (base64) {
          debug('QR code fetched successfully, injecting into webview');
          this._injectQrModal({ serviceId, base64, backgroundBase64 });
        } else {
          debug(`QR API returned no base64 data, retrying ${attempt}/6`);
          runInAction(() => {
            this.errorMessages.set(serviceId, 'No QR data available yet');
          });
          await new Promise<void>(resolve => {
            setTimeout(resolve, 2000);
          });
          this._fetchAndShowQrCode(serviceId, attempt + 1);
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
      const backgroundBase64 = getAssetBase64(
        '../../assets/images/whatsapp/qr-modal-background.png',
      );

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
              backgroundBase64,
            });
          }
        })
        .catch(() => {
          this._injectQrModal({
            serviceId,
            base64,
            backgroundBase64,
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
        await this._fetchAndUpdateQr(serviceId, attempt + 1);
        return;
      }
      debug('Error updating QR:', error);
    }
  };

  // ========== SOCKET.IO ========= //

  /** Start a Socket.IO connection for a specific session and join its room. */
  _startSocketIoForSession = (serviceId: string) => {
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
      if (reason === 'io server disconnect' || reason === 'transport close') {
        this._handleSocketConnectionUpdate(serviceId, {
          status: WA_SESSION_STATUS.SERVER_ERROR,
        });
      }
    });

    socket.on('connect_error', err => {
      debug(`[WA-AKG] Socket.IO connect error for ${serviceId}:`, err.message);
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
        this._fetchAndUpdateQr(serviceId);
        break;
      }

      case WA_SESSION_STATUS.CONNECTED: {
        debug(`Session ${serviceId} connected via Socket.IO!`);
        this._removeQrModal({ serviceId });
        this._injectSuccessModal(serviceId);
        this._notifySessionConnected(serviceId);
        this._injectOrUpdateStatusIndicator(
          serviceId,
          WA_SESSION_STATUS.CONNECTED,
        );
        runInAction(() => {
          this.isLoadingQr.set(serviceId, false);
          this.errorMessages.set(serviceId, undefined);
        });
        this._refreshSessionDetails(serviceId).catch(error => {
          debug('Error refreshing session details after connect:', error);
        });
        break;
      }

      case WA_SESSION_STATUS.DISCONNECTED: {
        runInAction(() => {
          this.isLoadingQr.set(serviceId, true);
        });
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
    this.sessionInfo.delete(serviceId);
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
    debug('[WA-AKG] Error updating modal status:', e);
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

  /** Inject or update a floating status indicator (top-right) in the webview. */
  _injectOrUpdateStatusIndicator = (serviceId: string, status: string) => {
    const service = this._getService(serviceId);
    if (!service?.webview) return;

    const { color, label } = this._statusStyle(status);
    const escColor = color.replaceAll("'", "\\'");
    const escLabel = label.replaceAll("'", "\\'");

    const SID = 'wa-akg-si';
    const escStatus = status.replaceAll("'", "\\'");
    const script = `
(function() {
  var old = document.getElementById('${SID}');
  if (old) {
    old.dataset.waAkgStatus = '${escStatus}';
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
    '#${SID}{position:fixed;top:20px;right:20px;z-index:2147483646;display:flex;align-items:center;gap:10px;background:rgba(11,20,26,0.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:30px;padding:10px 18px 10px 14px;box-shadow:0 4px 20px rgba(0,0,0,0.4);font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif;pointer-events:auto;cursor:grab;user-select:none}',
    '.waa-si-radar{position:relative;width:20px;height:20px;flex-shrink:0}',
    '.waa-si-dot{position:absolute;inset:4px;border-radius:50%;background:${escColor};z-index:2;animation:waa-si-pulse 2s infinite}',
    '.waa-si-sweep{position:absolute;inset:-3px;border-radius:50%;border:2px solid transparent;border-top-color:${escColor}44;animation:waa-si-radar 2s linear infinite}',
    '.waa-si-label{font-size:13px;font-weight:600;color:#e9edef;white-space:nowrap}'
  ].join('');
  document.head.appendChild(s);
  var el = document.createElement('div');
  el.id = '${SID}';
  el.dataset.waAkgStatus = '${escStatus}';
  el.innerHTML = '<div class=\"waa-si-radar\"><div class=\"waa-si-dot\"></div><div class=\"waa-si-sweep\"></div></div><span class=\"waa-si-label\">${escLabel}</span>';
  document.body.appendChild(el);
  (function(ind) {
    var dragging = false, sx = 0, sy = 0, sl = 0, st = 0;
    ind.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      var r = ind.getBoundingClientRect();
      sl = r.left; st = r.top;
      ind.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      ind.style.left = (sl + e.clientX - sx) + 'px';
      ind.style.top = (st + e.clientY - sy) + 'px';
      ind.style.right = 'auto';
    });
    document.addEventListener('mouseup', function() {
      if (!dragging) return;
      dragging = false;
      ind.style.cursor = 'grab';
    });
  })(el);
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
    const service = this._getService(serviceId);
    if (!service?.webview) return;
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
          debug('[WA-AKG] Error sending session connected:', e);
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
    backgroundBase64: string,
  ): string => {
    const escapedServiceId = serviceId
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'");
    const escapedBase64 = base64
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'");
    const escapedBg = backgroundBase64
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'");

    return `
(function() {
  try {
    if (document.getElementById('wa-akg-qr-modal')) return;

    var SERVICE_ID = '${escapedServiceId}';
    var BASE64_QR = '${escapedBase64}';
    var BG_IMAGE = '${escapedBg}';

    /* ── Inject styles ── */
    var s = document.createElement('style');
    s.textContent = [
      '.waa-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
      '.waa-wrapper{display:flex;flex-direction:column;align-items:center}',
      '.waa-card{position:relative;width:465px;height:577px;border-radius:12px;overflow:hidden;background:#fff}',
      '.waa-card-bg{position:absolute;top:0;left:0;width:100%;height:100%;background-size:100% 100%;background-position:center;background-repeat:no-repeat}',
      '.waa-title{position:absolute;left:48px;top:58px;color:#FFFFFF;font-size:28px;font-weight:700;line-height:36px;margin:0;z-index:2}',
      '.waa-qr-box{position:absolute;left:50%;top:225px;transform:translateX(-50%);width:216px;height:216px;border-radius:8px;border:1px solid #E1E1E1;background:#FFFFFF;display:flex;align-items:center;justify-content:center;z-index:2}',
      '.waa-qrimg{width:256px;height:256px;image-rendering:pixelated}',
      '.waa-desc{position:absolute;left:50%;top:479px;transform:translateX(-50%);color:#111111;font-size:26px;font-weight:600;line-height:34px;text-align:center;white-space:nowrap;margin:0;z-index:2}'
    ].join('');
    document.head.appendChild(s);

    /* ── Build modal DOM ── */
    var modal = document.createElement('div');
    modal.id = 'wa-akg-qr-modal';

    var cardBgStyle = BG_IMAGE ? 'background-image:url(\\'' + BG_IMAGE + '\\');' : '';

    modal.innerHTML =
      '<div class=\"waa-overlay\">' +
        '<div class=\"waa-wrapper\">' +
          '<div class=\"waa-card\">' +
            '<div class=\"waa-card-bg\" style=\"' + cardBgStyle + '\"></div>' +
            '<h2 class=\"waa-title\">扫码验证</h2>' +
            '<div class=\"waa-qr-box\" id=\"waa-body\">' +
              (BASE64_QR ? '<img src=\"' + BASE64_QR + '\" alt=\"QR Code\" class=\"waa-qrimg\"/>' : '') +
            '</div>' +
            '<p class=\"waa-desc\">扫码关联你的AI数字员工</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    /* ── Block navigation while QR is showing ── */
    var _keydownHandler = function(e) {
      e.stopPropagation();
      e.preventDefault();
    };
    document.addEventListener('keydown', _keydownHandler, true);

    window.__waAkgOriginalPushState = history.pushState.bind(history);
    history.pushState = function() {};

    var _popstateHandler = function() {
      history.pushState(null, '', location.href);
    };
    window.addEventListener('popstate', _popstateHandler);

    /* ── Listen for connection notification from host ── */
    var _messageHandler = function(event) {
      if (event.data && event.data.type === 'wa-akg:session-connected') {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.5s';
        setTimeout(function() {
          modal.remove();
          document.removeEventListener('keydown', _keydownHandler, true);
          window.removeEventListener('popstate', _popstateHandler);
          window.removeEventListener('message', _messageHandler);
          if (window.__waAkgOriginalPushState) {
            history.pushState = window.__waAkgOriginalPushState;
          }
          delete window.__waAkgQrListeners;
          delete window.__waAkgOriginalPushState;
        }, 500);
      }
    };
    window.addEventListener('message', _messageHandler);

    /* ── Store references for external cleanup (_removeQrModal) ── */
    window.__waAkgQrListeners = {
      keydown: _keydownHandler,
      popstate: _popstateHandler,
      message: _messageHandler,
    };

    debug('[WA-AKG] QR auth modal injected for service', SERVICE_ID);
  } catch(e) {
    debug('[WA-AKG] QR modal injection error:', e);
  }
})();
    `;
  };

  /**
   * Build the HTML and CSS for the WA-AKG connection success modal.
   * This is injected directly into the webview.
   */
  _buildSuccessModalScript = (successVideoBase64: string): string => {
    const escapedSuccessVideo = successVideoBase64
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'");

    return `
(function() {
  try {
    if (document.getElementById('wa-akg-success-modal')) return;

    var SUCCESS_VIDEO = '${escapedSuccessVideo}';

    /* ── Inject styles ── */
    var s = document.createElement('style');
    s.textContent = [
      '.waas-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
      '.waas-wrapper{display:flex;flex-direction:column;align-items:center}',
      '.waas-card{position:relative;width:465px;height:540px;border-radius:12px;background:#FFFFFF;box-shadow:0 8px 24px rgba(0,0,0,0.12)}',
      '.waas-gif-container{position:absolute;top:35px;left:0;width:465px;height:260px;display:flex;justify-content:center;align-items:center;overflow:hidden}',
      '.waas-gif{width:100%;height:100%;object-fit:contain}',
      '.waas-main-text{position:absolute;top:365px;left:0;width:100%;text-align:center;color:#111111;font-size:28px;font-weight:700;line-height:36px;margin:0;padding:0 48px;box-sizing:border-box}',
      '.waas-close-btn{margin-top:20px;width:40px;height:40px;border-radius:50%;border:4px solid #fff;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;outline:none}',
      '.waas-close-btn:hover{opacity:0.8}',
      '.waas-close-btn svg{width:20px;height:20px;stroke:#fff;stroke-width:4;stroke-linecap:round}'
    ].join('');
    document.head.appendChild(s);

    /* ── Build modal DOM ── */
    var modal = document.createElement('div');
    modal.id = 'wa-akg-success-modal';

    modal.innerHTML =
      '<div class=\"waas-overlay\">' +
        '<div class=\"waas-wrapper\">' +
          '<div class=\"waas-card\">' +
            '<div class=\"waas-gif-container\">' +
              '<video src=\"' + SUCCESS_VIDEO + '\" autoplay muted playsinline class=\"waas-gif\" id=\"waas-success-video\"></video>' +
            '</div>' +
            '<p class=\"waas-main-text\">恭喜你可以使用数字员工啦~</p>' +
          '</div>' +
          '<button class=\"waas-close-btn\" id=\"waas-close-btn\" aria-label=\"Close\">' +
            '<svg viewBox=\"0 0 24 24\" fill=\"none\">' +
              '<line x1=\"4\" y1=\"4\" x2=\"20\" y2=\"20\"/>' +
              '<line x1=\"20\" y1=\"4\" x2=\"4\" y2=\"20\"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    /* ── Play video once, prevent replay ── */
    var video = document.getElementById('waas-success-video');
    if (video) {
      video.addEventListener('ended', function() {
        video.pause();
        video.removeAttribute('loop');
      });
    }

    /* ── Close button handler ── */
    var closeBtn = document.getElementById('waas-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s';
        setTimeout(function() { modal.remove(); }, 300);
      });
    }

    debug('[WA-AKG] Success modal injected');
  } catch(e) {
    debug('[WA-AKG] Success modal injection error:', e);
  }
})();
    `;
  };

  /** Remove the WA-AKG connection success modal from the DOM. */
  _removeSuccessModal = (): void => {
    const modal = document.querySelector('#wa-akg-success-modal');
    if (modal) {
      modal.remove();
      debug('[WA-AKG] Success modal removed');
    }
  };
}
