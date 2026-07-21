import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  action,
  makeObservable,
  observable,
  reaction,
  runInAction,
} from 'mobx';
import QRCode from 'qrcode';
import { defineMessages } from 'react-intl';
import type { Stores } from '../../@types/stores.types';
import type { Actions } from '../../actions/lib/actions';
import {
  createInstanceApiV1TelegramInstancesPost,
  createTelegramBindingApiV1TelegramBindPost,
  deleteTelegramInstanceApiV1TelegramInstancesInstanceIdDelete,
  listTelegramInstancesApiV1TelegramInstancesGet,
  loginCodeApiV1TelegramInstancesInstanceIdLoginCodePost,
  loginPasswordApiV1TelegramInstancesInstanceIdLoginPasswordPost,
  loginPhoneApiV1TelegramInstancesInstanceIdLoginPhonePost,
  startInstanceApiV1TelegramInstancesInstanceIdStartPost,
} from '../../agent-flow-cs/api/generated/telegram/telegram';
import type { SSESubscription } from '../../agent-flow-cs/api/sse';
import { subscribeSSE } from '../../agent-flow-cs/api/sse';
import { TELEGRAM_RECIPE_ID } from '../../config';
import { asarPath } from '../../helpers/asar-helpers';
import type Service from '../../models/Service';
import { navigationStore } from '../../stores/NavigationStore';
import { createActionBindings } from '../utils/ActionBinding';
import FeatureStore from '../utils/FeatureStore';
import { telegramAutomationActions } from './actions';
import {
  TELEGRAM_BIND_STATUS,
  TELEGRAM_LOGIN_ACTION_CHANNEL,
  TELEGRAM_LOGIN_STEP,
  TELEGRAM_QR_STREAM_PATH,
} from './constants';
import type { TelegramBindStatus, TelegramLoginStep } from './constants';
import {
  type TelegramProxyLike,
  extractQrUrl,
  isAuthorizedEvent,
  isPasswordRequired,
  isQrEvent,
  parseInstanceId,
  serviceProxyToTelegramProxyUrl,
} from './helpers';

const debug = require('../../preload-safe-debug')(
  'Ferdium:feature:telegram-automation:store',
);

const messages = defineMessages({
  qrModalTitle: {
    id: 'telegramAutomation.qrModalTitle',
    defaultMessage: 'Scan QR Code',
  },
  qrModalDesc: {
    id: 'telegramAutomation.qrModalDesc',
    defaultMessage: 'Scan to link your AI digital employee',
  },
  phoneLabel: {
    id: 'telegramAutomation.phoneLabel',
    defaultMessage: 'Phone Number',
  },
  codeLabel: {
    id: 'telegramAutomation.codeLabel',
    defaultMessage: 'Verification Code',
  },
  passwordLabel: {
    id: 'telegramAutomation.passwordLabel',
    defaultMessage: 'Two-Step Verification Password',
  },
  usePhoneLogin: {
    id: 'telegramAutomation.usePhoneLogin',
    defaultMessage: 'Use phone number instead',
  },
  backToQr: {
    id: 'telegramAutomation.backToQr',
    defaultMessage: 'Back to QR',
  },
  submitLabel: {
    id: 'telegramAutomation.submitLabel',
    defaultMessage: 'Continue',
  },
});

const payloadStatus = (data: unknown): string => {
  if (!data || typeof data !== 'object') return '';
  const obj = data as Record<string, unknown>;
  const status = typeof obj.status === 'string' ? obj.status : '';
  const type = typeof obj.type === 'string' ? obj.type : '';
  return `${status} ${type}`.trim().toLowerCase();
};

// Treat `{status:'password_required'}` (or equivalent status/type) as a 2FA transition.
const isPasswordPayload = (data: unknown): boolean =>
  payloadStatus(data).includes('password');

// Treat `{ok:true}` or an authorized status/type as explicit authorization.
const isAuthorizedPayload = (data: unknown): boolean => {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (obj.ok === true) return true;
  }
  return payloadStatus(data).includes('authorized');
};

const escapeModalString = (s: string): string =>
  s.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('</', '<\\/');

const formatMessage = (
  descriptor: (typeof messages)[keyof typeof messages],
): string => window.ferdium.intl.formatMessage(descriptor);

const getAssetBase64 = (assetPath: string): string => {
  try {
    const fullPath = asarPath(join(__dirname, assetPath));
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
  } catch {
    debug('[TG-FLUX] asset base64 conversion failed');
    return '';
  }
};

export interface TelegramBindingInput {
  name: string;
  proxy?: TelegramProxyLike | null;
}

export default class TelegramAutomationStore extends FeatureStore {
  @observable stores: Stores | null = null;

  actions: Actions | null = null;

  @observable isFeatureActive = false;

  @observable bindStatus: TelegramBindStatus = TELEGRAM_BIND_STATUS.IDLE;

  @observable qrUrl: string | null = null;

  @observable bindError: string | null = null;

  @observable instanceId: string | null = null;

  _sseSubscriptions = new Map<string, SSESubscription>();

  _statusStreamSubscription: SSESubscription | null = null;

  _statusStreamReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  _statusStreamRetryMs = 5000;

  _statusStreamReady = false;

  _moduleActivated = false;

  _isStopped = false;

  _moduleActivationDisposer: (() => void) | null = null;

  _bindAttempt = 0;

  _pendingServiceData: TelegramBindingInput | null = null;

  _retryCounts = new Map<string, number>();

  _serviceBindAttempts = new Map<string, number>();

  _serviceBindStatus = new Map<string, TelegramBindStatus>();

  _serviceQrDataUrl = new Map<string, string>();

  _maxRetries = 10;

  _retryIntervalMs = 1000;

  _loginNavListeners = new Map<
    string,
    { handler: () => void; webview: NonNullable<Service['webview']> }
  >();

  _tgReactionDisposer: (() => void) | null = null;

  _authorizedServiceIds = new Set<string>();

  @observable instanceStatuses = new Map<string, string>();

  _reloadListener: ((params: { serviceId: string }) => void) | null = null;

  _deleteListener: ((params: { serviceId: string }) => void) | null = null;

  _bindingSafetyTimers = new Map<string, ReturnType<typeof setTimeout>>();

  _bindingResumesInFlight = new Set<string>();

  _loginListeners = new Map<
    string,
    {
      handler: (e: { channel: string; args: unknown[] }) => void;
      webview: NonNullable<Service['webview']>;
    }
  >();

  _authorized = false;

  _cancelledServiceIds = new Set<string>();

  constructor() {
    super();
    makeObservable(this);
  }

  @action start(stores: Stores, actions: Actions) {
    this.stores = stores;
    this.actions = actions;
    debug('TelegramAutomationStore::start');

    this._registerActions(
      createActionBindings([
        [telegramAutomationActions.beginBinding, this.beginBinding],
        [telegramAutomationActions.closeBinding, this.closeBinding],
      ]),
    );

    // Lazy activate: call Telegram API only when user clicks Telegram tab.
    // This avoids unnecessary network requests at app startup.
    this._moduleActivationDisposer = reaction(
      () => navigationStore.activeModule,
      activeModule => {
        if (activeModule === 'telegram' && !this._moduleActivated) {
          this._moduleActivated = true;
          this._startStatusStream();
          this._hydrateInstanceStatuses();
          this._detectTelegramServices();
        }
      },
      { fireImmediately: true },
    );

    this._tgReactionDisposer = reaction(
      () =>
        `${(this.stores?.services?.telegramServices ?? []).map(s => `${s.id}:${s.isAttached}:${!!s.webview}`).join('|')}:${this.stores?.services?.active?.id}`,
      () => {
        this._detectTelegramServices();
      },
      { fireImmediately: true },
    );

    this._reloadListener = this._onServiceReload.bind(this);
    this.actions?.service?.reload?.listen?.(this._reloadListener);

    this._deleteListener = this._onDeleteService.bind(this);
    this.actions?.service?.deleteService?.listen?.(this._deleteListener);

    this.isFeatureActive = true;
  }

  @action stop() {
    if (this._reloadListener && this.actions?.service?.reload?.off) {
      this.actions.service.reload.off(this._reloadListener);
      this._reloadListener = null;
    }
    if (this._deleteListener && this.actions?.service?.deleteService?.off) {
      this.actions.service.deleteService.off(this._deleteListener);
      this._deleteListener = null;
    }
    if (this._moduleActivationDisposer) {
      this._moduleActivationDisposer();
      this._moduleActivationDisposer = null;
    }
    this._isStopped = true;
    if (this._tgReactionDisposer) {
      this._tgReactionDisposer();
      this._tgReactionDisposer = null;
    }
    if (this._statusStreamReconnectTimer) {
      clearTimeout(this._statusStreamReconnectTimer);
      this._statusStreamReconnectTimer = null;
    }
    if (this._statusStreamSubscription) {
      this._statusStreamSubscription.close();
      this._statusStreamSubscription = null;
    }
    for (const serviceId of this._serviceBindStatus.keys()) {
      this._removeQrModal({ serviceId });
      this._removeStatusIndicator(serviceId);
    }
    for (const [, subscription] of this._sseSubscriptions) {
      subscription.close();
    }
    this._sseSubscriptions.clear();
    this._loginListeners.clear();
    this._loginNavListeners.clear();
    for (const [, timer] of this._bindingSafetyTimers) {
      clearTimeout(timer);
    }
    this._bindingSafetyTimers.clear();
    this._bindingResumesInFlight.clear();
    this._retryCounts.clear();
    this._serviceBindAttempts.clear();
    this._cancelledServiceIds.clear();
    this._authorizedServiceIds.clear();
    this._serviceBindStatus.clear();
    this._serviceQrDataUrl.clear();
    this._authorized = false;
    this._pendingServiceData = null;
    this.bindStatus = TELEGRAM_BIND_STATUS.IDLE;
    this.qrUrl = null;
    this.bindError = null;
    this.instanceId = null;
    this.isFeatureActive = false;
    super.stop();
    debug('TelegramAutomationStore::stop');
  }

  @action beginBinding = async (payload: TelegramBindingInput) => {
    const t0 = Date.now();
    debug('beginBinding', payload.name);

    this._closeSse();
    this._authorized = false;
    this._bindAttempt += 1;
    const attempt = this._bindAttempt;
    this._pendingServiceData = payload;

    runInAction(() => {
      this.bindStatus = TELEGRAM_BIND_STATUS.CREATING_INSTANCE;
      this.qrUrl = null;
      this.bindError = null;
      this.instanceId = null;
    });

    let instanceId: string | null = null;
    try {
      const response = await createInstanceApiV1TelegramInstancesPost({
        label: payload.name || 'Telegram',
        engine: 'gramjs',
        // Sync proxy to Flux at creation (gramjs only supports socks5).
        // null -> undefined omits the field; no proxy is set upstream.
        proxy_url: serviceProxyToTelegramProxyUrl(payload.proxy) ?? undefined,
      });
      debug('[TG-PERF] createInstance took', Date.now() - t0, 'ms');
      instanceId = parseInstanceId(response);
    } catch {
      if (attempt !== this._bindAttempt) return;
      runInAction(() => {
        this.bindStatus = TELEGRAM_BIND_STATUS.ERROR;
        this.bindError = 'Failed to create Telegram instance';
      });
      return;
    }

    if (!instanceId) {
      if (attempt !== this._bindAttempt) return;
      runInAction(() => {
        this.bindStatus = TELEGRAM_BIND_STATUS.ERROR;
        this.bindError = 'Failed to create Telegram instance';
      });
      return;
    }

    if (attempt !== this._bindAttempt) return;

    if (!this.stores) {
      runInAction(() => {
        this.bindStatus = TELEGRAM_BIND_STATUS.ERROR;
        this.bindError = 'Failed to create Telegram service';
      });
      return;
    }

    const validId: string = instanceId;
    try {
      await this.stores.services._createService({
        recipeId: TELEGRAM_RECIPE_ID,
        serviceData: {
          id: validId,
          name: payload.name || 'Telegram',
          proxy: payload.proxy,
          isHibernationEnabled: true,
        },
        redirect: false,
      });
      debug('[TG-PERF] _createService took', Date.now() - t0, 'ms');
    } catch {
      if (attempt !== this._bindAttempt) return;
      runInAction(() => {
        this.bindStatus = TELEGRAM_BIND_STATUS.ERROR;
        this.bindError = 'Failed to create Telegram service';
      });
      return;
    }

    if (attempt !== this._bindAttempt) return;

    runInAction(() => {
      this.instanceId = validId;
      this.bindStatus = TELEGRAM_BIND_STATUS.WAITING_FOR_QR;
      this._serviceBindStatus.set(validId, TELEGRAM_BIND_STATUS.WAITING_FOR_QR);
    });
    this._scheduleBindingSafetyNet(validId);

    // TODO: Flux instance + Ferdium service deletion cleanup deferred - the
    // generated Agent Flow CS delete API is missing, so neither side is
    // torn down when the binding is cancelled or the service is removed.

    this._serviceBindAttempts.set(validId, attempt);
  };

  @action closeBinding = (serviceId?: string) => {
    debug('closeBinding');
    const serviceIds = serviceId
      ? [serviceId]
      : [...this._serviceBindStatus.keys()];
    for (const sid of serviceIds) {
      this._cancelledServiceIds.add(sid);
      this._removeQrModal({ serviceId: sid });
      this._cancelBindingSafetyNet(sid);
      this._closeSse(sid);
      this._bindingResumesInFlight.delete(sid);
      this._serviceBindAttempts.delete(sid);
      this._serviceBindStatus.delete(sid);
      this._serviceQrDataUrl.delete(sid);
      this._removeStatusIndicator(sid);
    }
    this._retryCounts.clear();
    this._authorized = false;
    this._pendingServiceData = null;
    runInAction(() => {
      this.bindStatus = TELEGRAM_BIND_STATUS.IDLE;
      this.qrUrl = null;
      this.bindError = null;
      this.instanceId = null;
    });
  };

  _closeSse = (serviceId?: string): void => {
    if (serviceId) {
      this._sseSubscriptions.get(serviceId)?.close();
      this._sseSubscriptions.delete(serviceId);
    } else {
      for (const [, sub] of this._sseSubscriptions) {
        sub.close();
      }
      this._sseSubscriptions.clear();
    }
  };

  _onServiceReload = ({ serviceId }: { serviceId: string }): void => {
    if (this._authorizedServiceIds.has(serviceId)) {
      const reinject = () =>
        this._injectOrUpdateStatusIndicator(serviceId, 'connected');
      const service = this._getService(serviceId);
      service?.webview?.addEventListener('did-finish-load', reinject, {
        once: true,
      });
      setTimeout(reinject, 3000);
      return;
    }
    if (!this._sseSubscriptions.has(serviceId)) return;

    const service = this._getService(serviceId);
    const reinject = () => this._reInjectModal(serviceId);
    service?.webview?.addEventListener('did-finish-load', reinject, {
      once: true,
    });
    setTimeout(reinject, 3000);
  };

  _onDeleteService = ({ serviceId }: { serviceId: string }): void => {
    if (this._isStopped) return;
    // Check if this is a Telegram service by checking if recipeId matches
    const service = this.stores?.services?.all?.find(s => s.id === serviceId);
    if (!service || service.recipe?.id !== TELEGRAM_RECIPE_ID) return;
    // Best-effort: delete remote Telegram instance
    deleteTelegramInstanceApiV1TelegramInstancesInstanceIdDelete(
      serviceId,
    ).catch(() => {
      debug('[TG-FLUX] remote instance deletion failed (best-effort)');
    });
  };

  _detectTelegramServices = (): void => {
    if (!this.stores) return;
    if (!this._statusStreamReady) {
      debug(
        '[TG-FLUX] status stream not ready yet, deferring service detection',
      );
      return;
    }
    const services = this.stores.services.telegramServices;
    for (const service of services) {
      if (this._authorizedServiceIds.has(service.id)) {
        this._injectOrUpdateStatusIndicator(service.id, 'connected');
      } else {
        const perStatus = this._serviceBindStatus.get(service.id);
        const isPhoneLoginActive =
          perStatus === TELEGRAM_BIND_STATUS.WAITING_FOR_PHONE ||
          perStatus === TELEGRAM_BIND_STATUS.WAITING_FOR_CODE ||
          perStatus === TELEGRAM_BIND_STATUS.WAITING_FOR_PASSWORD;
        const isActiveBinding =
          isPhoneLoginActive ||
          perStatus === TELEGRAM_BIND_STATUS.WAITING_FOR_QR ||
          this._sseSubscriptions.has(service.id);
        if (isActiveBinding) {
          const statusMap: Record<string, string> = {
            [TELEGRAM_BIND_STATUS.WAITING_FOR_QR]: 'awaiting_qr',
            [TELEGRAM_BIND_STATUS.WAITING_FOR_PHONE]: 'awaiting_phone',
            [TELEGRAM_BIND_STATUS.WAITING_FOR_CODE]: 'awaiting_code',
            [TELEGRAM_BIND_STATUS.WAITING_FOR_PASSWORD]: 'password_required',
            [TELEGRAM_BIND_STATUS.ERROR]: 'error',
          };
          const displayStatus = statusMap[perStatus || ''] || 'awaiting_qr';
          this._injectOrUpdateStatusIndicator(service.id, displayStatus);

          if (
            perStatus === TELEGRAM_BIND_STATUS.WAITING_FOR_QR &&
            service.webview &&
            !this._sseSubscriptions.has(service.id)
          ) {
            this._cancelBindingSafetyNet(service.id);
            this._resumeBindingForService(service.id);
          }
        } else if (this.stores?.services.active?.id === service.id) {
          debug('Resuming binding for Telegram service:', service.id);
          this._resumeBindingForService(service.id);
        }
      }
    }
  };

  _resumeBindingForService = (serviceId: string): void => {
    if (
      this._authorizedServiceIds.has(serviceId) ||
      this._bindingResumesInFlight.has(serviceId)
    ) {
      return;
    }
    this._cancelledServiceIds.delete(serviceId);
    this._bindingResumesInFlight.add(serviceId);
    try {
      const t0 = Date.now();
      debug('[TG-PERF] _resumeBindingForService start', serviceId);
      this._closeSse(serviceId);
      this._authorized = false;
      const attempt = (this._serviceBindAttempts.get(serviceId) ?? 0) + 1;
      this._serviceBindAttempts.set(serviceId, attempt);

      runInAction(() => {
        this.instanceId = serviceId;
        this.bindStatus = TELEGRAM_BIND_STATUS.WAITING_FOR_QR;
        this._serviceBindStatus.set(
          serviceId,
          TELEGRAM_BIND_STATUS.WAITING_FOR_QR,
        );
        this.qrUrl = null;
        this.bindError = null;
      });

      const backgroundBase64 = getAssetBase64(
        '../../assets/images/whatsapp/qr-modal-background.png',
      );
      this._attachLoginListener(serviceId);
      const script = this._buildQrModalScript(serviceId, '', backgroundBase64);
      const service = this._getService(serviceId);
      debug(
        '[TG-PERF] _resumeBindingForService webview ready?',
        !!service?.webview,
        Date.now() - t0,
        'ms',
      );
      if (service?.webview) {
        service.webview
          .executeJavaScript(script)
          .then(() => {
            debug('[TG-PERF] loading modal injected at', Date.now() - t0, 'ms');
            this._attachReInjectOnNavigate(serviceId);
          })
          .catch(() => {
            debug(
              '[TG-PERF] loading modal injection failed at',
              Date.now() - t0,
              'ms, will retry via _scheduleRetryInjection',
            );
            this._scheduleRetryInjection(serviceId, '', backgroundBase64);
          });
      } else {
        debug(
          '[TG-PERF] no webview yet, scheduling retry for loading modal',
          serviceId,
        );
        this._scheduleRetryInjection(serviceId, '', backgroundBase64);
      }

      this._injectOrUpdateStatusIndicator(serviceId, 'awaiting_qr');
      this._openQrStream(serviceId, attempt);
    } finally {
      this._bindingResumesInFlight.delete(serviceId);
    }
  };

  _openQrStream = (instanceId: string, attempt: number): void => {
    if (this._authorizedServiceIds.has(instanceId)) return;
    this._closeSse(instanceId);
    const subscription = subscribeSSE<unknown>(
      TELEGRAM_QR_STREAM_PATH(instanceId),
      {
        onEvent: evt => {
          if (attempt !== this._serviceBindAttempts.get(instanceId)) return;
          const { event, data: evtData } = evt;

          if (isQrEvent(event, evtData)) {
            const url = extractQrUrl(evtData);
            if (url) {
              const perfStart = Date.now();
              debug('[TG-PERF] QR SSE event received');
              runInAction(() => {
                this.qrUrl = url;
              });
              this._handleQrUrl(instanceId, url, attempt, perfStart).catch(
                () => {
                  debug('[TG-FLUX] Failed to process QR for injection');
                },
              );
            }
            return;
          }

          if (isPasswordRequired(event, evtData)) {
            this._closeSse(instanceId);
            runInAction(() => {
              this.bindStatus = TELEGRAM_BIND_STATUS.WAITING_FOR_PASSWORD;
              this._serviceBindStatus.set(
                instanceId,
                TELEGRAM_BIND_STATUS.WAITING_FOR_PASSWORD,
              );
              this.bindError = null;
            });
            this._setModalView(instanceId, TELEGRAM_LOGIN_STEP.PASSWORD);
            this._injectOrUpdateStatusIndicator(
              instanceId,
              'password_required',
            );
            return;
          }

          if (isAuthorizedEvent(event, evtData)) {
            this._closeSse(instanceId);
            this._injectOrUpdateStatusIndicator(instanceId, 'connected');
            this._handleAuthorized(instanceId, attempt).catch(() => {});
          }
        },
        onError: () => {
          if (attempt !== this._serviceBindAttempts.get(instanceId)) return;
          this._closeSse(instanceId);
          this._removeQrModal({ serviceId: instanceId });
          this._injectOrUpdateStatusIndicator(instanceId, 'disconnected');
          runInAction(() => {
            this.bindStatus = TELEGRAM_BIND_STATUS.ERROR;
            this._serviceBindStatus.set(instanceId, TELEGRAM_BIND_STATUS.ERROR);
            this.bindError = 'Connection to Telegram server lost';
          });
        },
        onClose: () => {
          if (attempt !== this._serviceBindAttempts.get(instanceId)) return;
          if (
            this._serviceBindStatus.get(instanceId) ===
            TELEGRAM_BIND_STATUS.WAITING_FOR_QR
          ) {
            this._closeSse(instanceId);
            this._removeQrModal({ serviceId: instanceId });
            this._injectOrUpdateStatusIndicator(instanceId, 'disconnected');
            runInAction(() => {
              this.bindStatus = TELEGRAM_BIND_STATUS.ERROR;
              this._serviceBindStatus.set(
                instanceId,
                TELEGRAM_BIND_STATUS.ERROR,
              );
              this.bindError = 'Connection to Telegram server lost';
            });
          }
        },
      },
    );
    this._sseSubscriptions.set(instanceId, subscription);
  };

  @action _handleAuthorized = async (instanceId: string, attempt?: number) => {
    if (!this.stores) return;
    if (this._cancelledServiceIds.has(instanceId)) return;
    if (this._authorizedServiceIds.has(instanceId)) return;
    this._authorizedServiceIds.add(instanceId);
    this._closeSse(instanceId);
    this._removeQrModal({ serviceId: instanceId });
    this._injectOrUpdateStatusIndicator(instanceId, 'connected');

    runInAction(() => {
      this.bindStatus = TELEGRAM_BIND_STATUS.AUTHORIZED;
      this._serviceBindStatus.set(instanceId, TELEGRAM_BIND_STATUS.AUTHORIZED);
    });

    try {
      await startInstanceApiV1TelegramInstancesInstanceIdStartPost(instanceId);
    } catch {
      if (this._cancelledServiceIds.has(instanceId)) return;
      if (
        attempt !== undefined &&
        attempt !== this._serviceBindAttempts.get(instanceId)
      )
        return;
      runInAction(() => {
        this.bindStatus = TELEGRAM_BIND_STATUS.ERROR;
        this._serviceBindStatus.set(instanceId, TELEGRAM_BIND_STATUS.ERROR);
        this.bindError = 'Authorization succeeded but failed to start instance';
      });
      return;
    }

    if (this._cancelledServiceIds.has(instanceId)) return;
    if (
      attempt !== undefined &&
      attempt !== this._serviceBindAttempts.get(instanceId)
    )
      return;

    // Best-effort: attach initial digital-human binding. Swallowed on failure
    // since the channel binding already exists and login already succeeded.
    try {
      await createTelegramBindingApiV1TelegramBindPost({
        instance_id: instanceId,
      });
    } catch (error) {
      debug(
        '[TG-FLUX] initial digital-human binding failed (non-fatal):',
        error instanceof Error ? error.message : error,
      );
    }

    this._cancelledServiceIds.delete(instanceId);
    this.closeBinding(instanceId);
    // closeBinding removes the status indicator DOM node as part of
    // binding-state cleanup; re-inject it since the service is authorized.
    this._injectOrUpdateStatusIndicator(instanceId, 'connected');
  };

  _getService(serviceId: string): Service | null {
    if (!this.stores) return null;
    try {
      return this.stores.services.one(serviceId);
    } catch {
      return null;
    }
  }

  @action _handleQrUrl = async (
    serviceId: string,
    url: string,
    attempt: number,
    perfStart?: number,
  ) => {
    if (
      this._serviceBindAttempts.get(serviceId) !== attempt ||
      this._serviceBindStatus.get(serviceId) !==
        TELEGRAM_BIND_STATUS.WAITING_FOR_QR
    ) {
      return;
    }
    try {
      const t0 = perfStart ?? Date.now();
      const dataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
      debug('[TG-PERF] QRCode.toDataURL took', Date.now() - t0, 'ms');
      if (
        this._serviceBindAttempts.get(serviceId) !== attempt ||
        this._serviceBindStatus.get(serviceId) !==
          TELEGRAM_BIND_STATUS.WAITING_FOR_QR
      ) {
        return;
      }
      this._serviceQrDataUrl.set(serviceId, dataUrl);
      const backgroundBase64 = getAssetBase64(
        '../../assets/images/whatsapp/qr-modal-background.png',
      );
      debug('[TG-PERF] getAssetBase64 done');
      this._injectQrModal({ serviceId, base64: dataUrl, backgroundBase64 });
      this._updateQrOnModal(serviceId, dataUrl);
    } catch {
      debug('[TG-FLUX] QR data URL generation failed');
    }
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
    const t0 = Date.now();
    if (
      this._serviceBindStatus.get(serviceId) !==
      TELEGRAM_BIND_STATUS.WAITING_FOR_QR
    ) {
      debug('[TG-FLUX] Skip QR modal injection - binding no longer active');
      return;
    }

    const service = this._getService(serviceId);
    if (!service?.webview) {
      debug(
        '[TG-PERF] No webview at',
        Date.now() - t0,
        'ms - scheduling retry',
        serviceId,
      );
      this._scheduleRetryInjection(serviceId, base64, backgroundBase64);
      return;
    }

    this._attachLoginListener(serviceId);

    const script = this._buildQrModalScript(
      serviceId,
      base64,
      backgroundBase64 || '',
    );

    service.webview
      .executeJavaScript(script)
      .then(() => {
        debug('[TG-PERF] executeJavaScript done at', Date.now() - t0, 'ms');
        this._retryCounts.delete(serviceId);
        this._attachReInjectOnNavigate(serviceId);
      })
      .catch(() => {
        debug('[TG-PERF] executeJavaScript failed at', Date.now() - t0, 'ms');
        this._scheduleRetryInjection(serviceId, base64, backgroundBase64);
      });
  };

  _scheduleBindingSafetyNet = (serviceId: string): void => {
    this._cancelBindingSafetyNet(serviceId);
    this._bindingSafetyTimers.set(
      serviceId,
      setTimeout(() => {
        if (!this._statusStreamReady) return;
        this._bindingSafetyTimers.delete(serviceId);
        if (
          this._serviceBindStatus.get(serviceId) ===
            TELEGRAM_BIND_STATUS.WAITING_FOR_QR &&
          !this._sseSubscriptions.has(serviceId)
        ) {
          debug('[TG-FLUX] binding safety net detection', serviceId);
          this._detectTelegramServices();
        }
      }, 0),
    );
  };

  _cancelBindingSafetyNet = (serviceId: string): void => {
    const timer = this._bindingSafetyTimers.get(serviceId);
    if (timer) {
      clearTimeout(timer);
      this._bindingSafetyTimers.delete(serviceId);
    }
  };

  _markStatusStreamReady = (): void => {
    if (this._statusStreamReady) return;
    this._statusStreamReady = true;
    for (const serviceId of this._bindingSafetyTimers.keys()) {
      this._cancelBindingSafetyNet(serviceId);
    }
    this._detectTelegramServices();
  };

  _scheduleRetryInjection = (
    serviceId: string,
    base64: string,
    backgroundBase64?: string,
  ) => {
    if (
      this._serviceBindStatus.get(serviceId) !==
      TELEGRAM_BIND_STATUS.WAITING_FOR_QR
    ) {
      return;
    }

    const retryCount = this._retryCounts.get(serviceId) || 0;
    if (retryCount >= this._maxRetries) {
      debug(
        `[TG-FLUX] Max retries (${this._maxRetries}) reached for service`,
        serviceId,
      );
      return;
    }

    this._retryCounts.set(serviceId, retryCount + 1);
    debug(
      `[TG-FLUX] Scheduling retry ${retryCount + 1}/${this._maxRetries} for service`,
      serviceId,
    );

    setTimeout(() => {
      this._injectQrModal({ serviceId, base64, backgroundBase64 });
    }, this._retryIntervalMs);
  };

  @action _removeQrModal = ({ serviceId }: { serviceId: string }) => {
    this._detachLoginListener(serviceId);
    this._detachReInjectOnNavigate(serviceId);
    const service = this._getService(serviceId);
    if (!service?.webview) return;
    this._retryCounts.delete(serviceId);

    service.webview
      .executeJavaScript(
        `
      (function() {
        try {
          var el = document.getElementById('telegram-qr-modal');
          if (el) {
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); }, 300);
          }
          if (window.__telegramQrListeners) {
            document.removeEventListener('keydown', window.__telegramQrListeners.keydown, true);
            document.removeEventListener('keydown', window.__telegramQrListeners.enter, true);
            window.removeEventListener('popstate', window.__telegramQrListeners.popstate);
            delete window.__telegramQrListeners;
          }
          if (window.__telegramOriginalPushState) {
            if (history.pushState === window.__telegramInjectedPushState) {
              history.pushState = window.__telegramOriginalPushState;
            }
            delete window.__telegramOriginalPushState;
            delete window.__telegramInjectedPushState;
          }
          delete window.__telegramSetView;
          delete window.__telegramSetQr;
          delete window.__telegramShowError;
          delete window.__telegramClearError;
          delete window.__telegramSetLoading;

          // Legacy: clean up old AKG names from existing webviews
          var oldEl = document.getElementById('tg-akg-qr-modal');
          if (oldEl) oldEl.remove();
          if (window.__tgAkgQrListeners) {
            document.removeEventListener('keydown', window.__tgAkgQrListeners.keydown, true);
            document.removeEventListener('keydown', window.__tgAkgQrListeners.enter, true);
            window.removeEventListener('popstate', window.__tgAkgQrListeners.popstate);
            delete window.__tgAkgQrListeners;
          }
          if (window.__tgAkgOriginalPushState) {
            history.pushState = window.__tgAkgOriginalPushState;
            delete window.__tgAkgOriginalPushState;
          }
          delete window.__tgAkgSetView;
          delete window.__tgAkgSetQr;
          delete window.__tgAkgShowError;
          delete window.__tgAkgClearError;
          delete window.__tgAkgSetLoading;
        } catch(e) {
          console.error('[TG-FLUX] modal removal failed');
        }
      })();
    `,
      )
      .catch(() => {
        debug('[TG-FLUX] QR modal removal skipped');
      });
  };

  _statusStyle = (status: string): { color: string; label: string } => {
    const map: Record<string, { color: string; label: string }> = {
      awaiting_qr: { color: '#FF9800', label: 'Scan QR' },
      awaiting_phone: { color: '#448AFF', label: 'Phone Login' },
      awaiting_code: { color: '#448AFF', label: 'Verify Code' },
      password_required: { color: '#FF9800', label: '2FA Required' },
      connected: { color: '#00E676', label: 'Connected' },
      disconnected: { color: '#FF5252', label: 'Disconnected' },
      error: { color: '#FF1744', label: 'Error' },
    };
    return map[status] || { color: '#9E9E9E', label: status };
  };

  _injectOrUpdateStatusIndicator = (
    serviceId: string,
    status: string,
    _retry = 0,
  ) => {
    if (this._isStopped) return;
    const service = this._getService(serviceId);
    if (!service?.webview) {
      if (_retry < 10) {
        setTimeout(
          () =>
            this._injectOrUpdateStatusIndicator(serviceId, status, _retry + 1),
          1000,
        );
      }
      return;
    }

    const { color, label } = this._statusStyle(status);
    const escColor = color.replaceAll("'", "\\'");
    const escLabel = label.replaceAll("'", "\\'");
    const escStatus = status.replaceAll("'", "\\'");
    const SID = 'telegram-status-indicator';

    const script = `
(function() {
  var old = document.getElementById('${SID}');
  if (old) {
    old.dataset.telegramStatus = '${escStatus}';
    var dot = old.querySelector('.tga-si-dot');
    if (dot) dot.style.background = '${escColor}';
    var txt = old.querySelector('.tga-si-label');
    if (txt) txt.textContent = '${escLabel}';
    return;
  }
  var s = document.createElement('style');
  s.textContent = [
    '@keyframes tga-si-pulse{0%{box-shadow:0 0 0 0 ${escColor}88}70%{box-shadow:0 0 0 14px ${escColor}00}100%{box-shadow:0 0 0 0 ${escColor}00}}',
    '@keyframes tga-si-radar{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
    '#${SID}{position:fixed;top:20px;right:20px;z-index:2147483646;display:flex;align-items:center;gap:10px;background:rgba(11,20,26,0.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:30px;padding:10px 18px 10px 14px;box-shadow:0 4px 20px rgba(0,0,0,0.4);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;pointer-events:auto;cursor:grab;user-select:none}',
    '.tga-si-radar{position:relative;width:20px;height:20px;flex-shrink:0}',
    '.tga-si-dot{position:absolute;inset:4px;border-radius:50%;background:${escColor};z-index:2;animation:tga-si-pulse 2s infinite}',
    '.tga-si-sweep{position:absolute;inset:-3px;border-radius:50%;border:2px solid transparent;border-top-color:${escColor}44;animation:tga-si-radar 2s linear infinite}',
    '.tga-si-label{font-size:13px;font-weight:600;color:#e9edef;white-space:nowrap}'
  ].join('');
  document.head.appendChild(s);
  var el = document.createElement('div');
  el.id = '${SID}';
  el.dataset.telegramStatus = '${escStatus}';
  el.innerHTML = '<div class="tga-si-radar"><div class="tga-si-dot"></div><div class="tga-si-sweep"></div></div><span class="tga-si-label">${escLabel}</span>';
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
    service.webview.executeJavaScript(script).catch(() => {
      debug('[TG-FLUX] status indicator injection skipped');
    });
  };

  _removeStatusIndicator = (serviceId: string) => {
    const service = this._getService(serviceId);
    if (!service?.webview) return;
    service.webview
      .executeJavaScript(
        "(function(){var e=document.getElementById('telegram-status-indicator');if(e)e.remove();})();",
      )
      .catch(() => {
        debug('[TG-FLUX] status indicator removal skipped');
      });
    // Legacy: also remove old AKG status indicator
    service.webview
      .executeJavaScript(
        "(function(){var e=document.getElementById('tg-akg-si');if(e)e.remove();})();",
      )
      .catch(() => {});
  };

  _fluxStatusToDisplay = (fluxStatus: string): string => {
    const map: Record<string, string> = {
      authorized: 'connected',
      disconnected: 'disconnected',
      error: 'error',
      connecting: 'awaiting_qr',
      new: 'awaiting_qr',
    };
    return map[fluxStatus] || fluxStatus;
  };

  _hydrateInstanceStatuses = async () => {
    try {
      const res = await listTelegramInstancesApiV1TelegramInstancesGet();
      const items = Array.isArray(res?.data) ? res.data : [];
      for (const item of items) {
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          const id = typeof obj.id === 'string' ? obj.id : undefined;
          const status =
            typeof obj.status === 'string' ? obj.status : undefined;
          if (id && status) {
            runInAction(() => this.instanceStatuses.set(id, status));
            if (status === 'authorized') this._authorizedServiceIds.add(id);
          }
        }
      }
    } catch {
      debug('[TG-FLUX] instance status hydration failed');
    }
    this._markStatusStreamReady();
  };

  _startStatusStream = () => {
    if (this._isStopped) return;
    // Re-entry guard: tear down any live subscription and clear a pending
    // reconnect timer before opening a fresh one. Without this, overlapping
    // calls would leak subscriptions and each leaked sub's error/close
    // callbacks would schedule still more reconnects.
    if (this._statusStreamSubscription) {
      this._statusStreamSubscription.close();
      this._statusStreamSubscription = null;
    }
    if (this._statusStreamReconnectTimer) {
      clearTimeout(this._statusStreamReconnectTimer);
      this._statusStreamReconnectTimer = null;
    }
    this._statusStreamSubscription = subscribeSSE<unknown>(
      '/api/v1/telegram/instances/status/stream',
      {
        onEvent: evt => {
          if (!evt?.data || typeof evt.data !== 'object') return;
          const d = evt.data as Record<string, unknown>;
          const instanceId =
            typeof d.instanceId === 'string' ? d.instanceId : undefined;
          const status = typeof d.status === 'string' ? d.status : undefined;
          if (!instanceId || !status) return;
          runInAction(() => this.instanceStatuses.set(instanceId, status));
          if (
            status === 'authorized' &&
            !this._cancelledServiceIds.has(instanceId)
          ) {
            this._closeSse(instanceId);
            this._removeQrModal({ serviceId: instanceId });
            runInAction(() => {
              this._serviceBindStatus.set(
                instanceId,
                TELEGRAM_BIND_STATUS.AUTHORIZED,
              );
            });
            // Finalize authorization when status stream is the only login path.
            this._handleAuthorized(instanceId).catch(error => {
              debug(
                '[TG-FLUX] authorization finalization failed via status stream',
                error instanceof Error ? error.message : error,
              );
            });
          }
          this._injectOrUpdateStatusIndicator(
            instanceId,
            this._fluxStatusToDisplay(status),
          );
          // Healthy event - reset reconnect backoff.
          this._statusStreamRetryMs = 5000;
          this._markStatusStreamReady();
        },
        onError: () => {
          debug('[TG-FLUX] status stream error, will reopen');
          this._scheduleStatusStreamReconnect();
        },
        onClose: () => {
          debug('[TG-FLUX] status stream closed, will reopen');
          this._scheduleStatusStreamReconnect();
        },
      },
    );
    debug('[TG-FLUX] status stream subscribed');
  };

  _scheduleStatusStreamReconnect = () => {
    if (this._isStopped) return;
    // Already a reconnect pending - never schedule a second one. This guard
    // is what prevents the exponential reconnect storm: even if both an
    // error and a close somehow fire, only the first schedules a retry.
    if (this._statusStreamReconnectTimer) return;
    this._statusStreamSubscription = null;
    const delay = this._statusStreamRetryMs;
    this._statusStreamRetryMs = Math.min(this._statusStreamRetryMs * 2, 60_000);
    debug(`[TG-FLUX] status stream reopen in ${delay}ms`);
    this._statusStreamReconnectTimer = setTimeout(() => {
      this._statusStreamReconnectTimer = null;
      this._startStatusStream();
    }, delay);
  };

  _handleLoginIpcMessage = (
    serviceId: string,
    event: { channel: string; args: unknown[] },
  ) => {
    if (event.channel !== TELEGRAM_LOGIN_ACTION_CHANNEL) return;
    const attempt = this._serviceBindAttempts.get(serviceId) ?? 0;
    const payload = event.args?.[0] as
      | { step?: string; value?: string }
      | undefined;
    if (!payload || typeof payload.step !== 'string') return;
    this._cancelledServiceIds.delete(serviceId);
    const { step } = payload;
    const trimmed =
      typeof payload.value === 'string' ? payload.value.trim() : '';

    if (step === TELEGRAM_LOGIN_STEP.TOGGLE_PHONE) {
      this._closeSse(serviceId);
      runInAction(() => {
        this.bindStatus = TELEGRAM_BIND_STATUS.WAITING_FOR_PHONE;
        this._serviceBindStatus.set(
          serviceId,
          TELEGRAM_BIND_STATUS.WAITING_FOR_PHONE,
        );
        this.bindError = null;
      });
      this._setModalLoading(serviceId, false);
      this._setModalView(serviceId, TELEGRAM_LOGIN_STEP.PHONE);
      this._injectOrUpdateStatusIndicator(serviceId, 'awaiting_phone');
      return;
    }
    if (step === TELEGRAM_LOGIN_STEP.TOGGLE_QR) {
      runInAction(() => {
        this.bindStatus = TELEGRAM_BIND_STATUS.WAITING_FOR_QR;
        this._serviceBindStatus.set(
          serviceId,
          TELEGRAM_BIND_STATUS.WAITING_FOR_QR,
        );
        this.bindError = null;
      });
      const qrDataUrl = this._serviceQrDataUrl.get(serviceId);
      if (qrDataUrl) {
        const backgroundBase64 = getAssetBase64(
          '../../assets/images/whatsapp/qr-modal-background.png',
        );
        this._injectQrModal({
          serviceId,
          base64: qrDataUrl,
          backgroundBase64,
        });
      }
      // Re-open SSE stream for fresh QR events
      this._openQrStream(serviceId, attempt);
      this._setModalView(serviceId, TELEGRAM_LOGIN_STEP.QR);
      this._setModalLoading(serviceId, false);
      this._injectOrUpdateStatusIndicator(serviceId, 'awaiting_qr');
      return;
    }
    if (step === TELEGRAM_LOGIN_STEP.PHONE) {
      const phoneVal = trimmed.replaceAll(' ', '');
      if (!phoneVal) {
        this._showModalError(serviceId, 'Phone number is required');
        return;
      }
      this._submitPhone(serviceId, phoneVal, attempt);
      return;
    }
    if (step === TELEGRAM_LOGIN_STEP.CODE) {
      if (!trimmed) {
        this._showModalError(serviceId, 'Verification code is required');
        return;
      }
      this._submitCode(serviceId, trimmed, attempt);
      return;
    }
    if (step === TELEGRAM_LOGIN_STEP.PASSWORD) {
      if (!trimmed) {
        this._showModalError(serviceId, 'Password is required');
        return;
      }
      this._submitPassword(serviceId, trimmed, attempt);
    }
  };

  _attachLoginListener = (serviceId: string) => {
    const service = this._getService(serviceId);
    if (!service?.webview) return;
    const existing = this._loginListeners.get(serviceId);
    if (existing?.webview === service.webview) return;
    if (existing) {
      existing.webview.removeEventListener?.('ipc-message', existing.handler);
      this._loginListeners.delete(serviceId);
    }
    const handler = (event: { channel: string; args: unknown[] }) => {
      if (event.channel !== TELEGRAM_LOGIN_ACTION_CHANNEL) return;
      this._handleLoginIpcMessage(serviceId, event);
    };
    service.webview.addEventListener('ipc-message', handler);
    this._loginListeners.set(serviceId, { handler, webview: service.webview });
  };

  _detachLoginListener = (serviceId: string) => {
    const entry = this._loginListeners.get(serviceId);
    if (!entry) return;
    entry.webview.removeEventListener?.('ipc-message', entry.handler);
    this._loginListeners.delete(serviceId);
  };

  _reInjectModal = (serviceId: string, retryCount = 0): void => {
    if (this._isStopped) return;
    if (this._authorizedServiceIds.has(serviceId)) return;
    const bStatus = this._serviceBindStatus.get(serviceId);
    if (
      !bStatus ||
      bStatus === TELEGRAM_BIND_STATUS.IDLE ||
      bStatus === TELEGRAM_BIND_STATUS.AUTHORIZED
    )
      return;

    const service = this._getService(serviceId);
    if (!service?.webview) {
      if (retryCount < 3) {
        debug(
          '[TG-FLUX] webview not ready, retrying re-injection',
          retryCount + 1,
        );
        setTimeout(() => this._reInjectModal(serviceId, retryCount + 1), 2000);
      }
      return;
    }

    this._attachLoginListener(serviceId);

    const backgroundBase64 = getAssetBase64(
      '../../assets/images/whatsapp/qr-modal-background.png',
    );
    const script = this._buildQrModalScript(
      serviceId,
      this._serviceQrDataUrl.get(serviceId) || '',
      backgroundBase64,
    );

    service.webview
      .executeJavaScript(script)
      .then(() => {
        debug('[TG-FLUX] modal re-injected after navigation', serviceId);
        this._attachReInjectOnNavigate(serviceId);
        const status = this._serviceBindStatus.get(serviceId) || '';
        switch (status) {
          case TELEGRAM_BIND_STATUS.WAITING_FOR_QR: {
            this._setModalView(serviceId, TELEGRAM_LOGIN_STEP.QR);
            break;
          }
          case TELEGRAM_BIND_STATUS.WAITING_FOR_PHONE: {
            this._setModalView(serviceId, TELEGRAM_LOGIN_STEP.PHONE);
            break;
          }
          case TELEGRAM_BIND_STATUS.WAITING_FOR_CODE: {
            this._setModalView(serviceId, TELEGRAM_LOGIN_STEP.CODE);
            break;
          }
          case TELEGRAM_BIND_STATUS.WAITING_FOR_PASSWORD: {
            this._setModalView(serviceId, TELEGRAM_LOGIN_STEP.PASSWORD);
            break;
          }
          default: {
            break;
          }
        }
        const displayStatus = (() => {
          switch (status) {
            case TELEGRAM_BIND_STATUS.WAITING_FOR_QR: {
              return 'awaiting_qr';
            }
            case TELEGRAM_BIND_STATUS.WAITING_FOR_PHONE: {
              return 'awaiting_phone';
            }
            case TELEGRAM_BIND_STATUS.WAITING_FOR_CODE: {
              return 'awaiting_code';
            }
            case TELEGRAM_BIND_STATUS.WAITING_FOR_PASSWORD: {
              return 'password_required';
            }
            case TELEGRAM_BIND_STATUS.ERROR: {
              return 'error';
            }
            default: {
              return '';
            }
          }
        })();
        if (displayStatus) {
          this._injectOrUpdateStatusIndicator(serviceId, displayStatus);
        }
      })
      .catch(() => {
        debug('[TG-FLUX] modal re-injection failed, attempt', retryCount + 1);
        if (retryCount < 3) {
          setTimeout(
            () => this._reInjectModal(serviceId, retryCount + 1),
            2000,
          );
        }
      });
  };

  _attachReInjectOnNavigate = (serviceId: string) => {
    const service = this._getService(serviceId);
    if (!service?.webview) return;
    const existing = this._loginNavListeners.get(serviceId);
    if (existing?.webview === service.webview) return;
    if (existing) {
      existing.webview.removeEventListener?.(
        'did-finish-load',
        existing.handler,
      );
      this._loginNavListeners.delete(serviceId);
    }

    const handler = () => {
      if (this._authorizedServiceIds.has(serviceId)) return;
      const bStatus = this._serviceBindStatus.get(serviceId);
      if (
        !bStatus ||
        bStatus === TELEGRAM_BIND_STATUS.IDLE ||
        bStatus === TELEGRAM_BIND_STATUS.AUTHORIZED
      )
        return;
      setTimeout(() => this._reInjectModal(serviceId), 1000);
    };

    service.webview.addEventListener('did-finish-load', handler);
    this._loginNavListeners.set(serviceId, {
      handler,
      webview: service.webview,
    });
  };

  _detachReInjectOnNavigate = (serviceId: string) => {
    const entry = this._loginNavListeners.get(serviceId);
    if (!entry) return;
    entry.webview.removeEventListener?.('did-finish-load', entry.handler);
    this._loginNavListeners.delete(serviceId);
  };

  _submitPhone = async (serviceId: string, phone: string, attempt: number) => {
    runInAction(() => {
      this.bindStatus = TELEGRAM_BIND_STATUS.WAITING_FOR_PHONE;
      this._serviceBindStatus.set(
        serviceId,
        TELEGRAM_BIND_STATUS.WAITING_FOR_PHONE,
      );
    });
    this._setModalLoading(serviceId, true);
    this._clearModalError(serviceId);
    let data: unknown = null;
    try {
      const res =
        await loginPhoneApiV1TelegramInstancesInstanceIdLoginPhonePost(
          serviceId,
          { phone },
        );
      data = res.data;
    } catch {
      if (attempt !== this._serviceBindAttempts.get(serviceId)) return;
      this._setModalLoading(serviceId, false);
      this._showModalError(serviceId, 'Failed to send phone login request');
      return;
    }
    if (attempt !== this._serviceBindAttempts.get(serviceId)) return;
    this._setModalLoading(serviceId, false);
    if (isPasswordPayload(data)) {
      runInAction(() => {
        this.bindStatus = TELEGRAM_BIND_STATUS.WAITING_FOR_PASSWORD;
        this._serviceBindStatus.set(
          serviceId,
          TELEGRAM_BIND_STATUS.WAITING_FOR_PASSWORD,
        );
      });
      this._setModalView(serviceId, TELEGRAM_LOGIN_STEP.PASSWORD);
      this._injectOrUpdateStatusIndicator(serviceId, 'password_required');
      return;
    }
    runInAction(() => {
      this.bindStatus = TELEGRAM_BIND_STATUS.WAITING_FOR_CODE;
      this._serviceBindStatus.set(
        serviceId,
        TELEGRAM_BIND_STATUS.WAITING_FOR_CODE,
      );
    });
    this._setModalView(serviceId, TELEGRAM_LOGIN_STEP.CODE);
    this._injectOrUpdateStatusIndicator(serviceId, 'awaiting_code');
  };

  _submitCode = async (serviceId: string, code: string, attempt: number) => {
    runInAction(() => {
      this.bindStatus = TELEGRAM_BIND_STATUS.WAITING_FOR_CODE;
      this._serviceBindStatus.set(
        serviceId,
        TELEGRAM_BIND_STATUS.WAITING_FOR_CODE,
      );
    });
    this._setModalLoading(serviceId, true);
    this._clearModalError(serviceId);
    let data: unknown = null;
    try {
      const res = await loginCodeApiV1TelegramInstancesInstanceIdLoginCodePost(
        serviceId,
        { code },
      );
      data = res.data;
    } catch {
      if (attempt !== this._serviceBindAttempts.get(serviceId)) return;
      this._setModalLoading(serviceId, false);
      this._showModalError(serviceId, 'Failed to verify code');
      return;
    }
    if (attempt !== this._serviceBindAttempts.get(serviceId)) return;
    this._setModalLoading(serviceId, false);
    if (isPasswordPayload(data)) {
      runInAction(() => {
        this.bindStatus = TELEGRAM_BIND_STATUS.WAITING_FOR_PASSWORD;
        this._serviceBindStatus.set(
          serviceId,
          TELEGRAM_BIND_STATUS.WAITING_FOR_PASSWORD,
        );
      });
      this._setModalView(serviceId, TELEGRAM_LOGIN_STEP.PASSWORD);
      this._injectOrUpdateStatusIndicator(serviceId, 'password_required');
      return;
    }
    if (isAuthorizedPayload(data)) {
      this._injectOrUpdateStatusIndicator(serviceId, 'connected');
      this._handleAuthorized(serviceId, attempt).catch(() => {
        debug('[TG-FLUX] authorization finalization failed');
      });
      return;
    }
    this._showModalError(serviceId, 'Invalid verification code');
  };

  _submitPassword = async (
    serviceId: string,
    password: string,
    attempt: number,
  ) => {
    runInAction(() => {
      this.bindStatus = TELEGRAM_BIND_STATUS.WAITING_FOR_PASSWORD;
      this._serviceBindStatus.set(
        serviceId,
        TELEGRAM_BIND_STATUS.WAITING_FOR_PASSWORD,
      );
    });
    this._setModalLoading(serviceId, true);
    this._clearModalError(serviceId);
    let data: unknown = null;
    try {
      const res =
        await loginPasswordApiV1TelegramInstancesInstanceIdLoginPasswordPost(
          serviceId,
          { password },
        );
      data = res.data;
    } catch {
      if (attempt !== this._serviceBindAttempts.get(serviceId)) return;
      this._setModalLoading(serviceId, false);
      this._showModalError(serviceId, 'Failed to verify password');
      return;
    }
    if (attempt !== this._serviceBindAttempts.get(serviceId)) return;
    this._setModalLoading(serviceId, false);
    if (isAuthorizedPayload(data)) {
      this._injectOrUpdateStatusIndicator(serviceId, 'connected');
      this._handleAuthorized(serviceId, attempt).catch(() => {
        debug('[TG-FLUX] authorization finalization failed');
      });
      return;
    }
    if (isPasswordPayload(data)) {
      this._showModalError(serviceId, 'Incorrect password, please try again');
      return;
    }
    this._showModalError(serviceId, 'Failed to verify password');
  };

  _runModalScript = (serviceId: string, script: string) => {
    const service = this._getService(serviceId);
    if (!service?.webview) return;
    service.webview.executeJavaScript(script).catch(() => {
      debug('[TG-FLUX] modal script execution skipped');
    });
  };

  _setModalView = (serviceId: string, view: TelegramLoginStep) => {
    const safeView = view.replaceAll("'", '');
    this._runModalScript(
      serviceId,
      `if(window.__telegramSetView){window.__telegramSetView('${safeView}');}`,
    );
  };

  _updateQrOnModal = (serviceId: string, dataUrl: string) => {
    const service = this._getService(serviceId);
    if (!service?.webview) return;
    const escaped = dataUrl.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
    service.webview
      .executeJavaScript(
        `(function(){if(window.__telegramSetQr){window.__telegramSetQr('${escaped}');return true;}return false;})()`,
      )
      .catch(() => {
        debug('[TG-FLUX] QR image update skipped');
      });
  };

  _showModalError = (serviceId: string, message: string) => {
    const escaped = escapeModalString(message);
    this._runModalScript(
      serviceId,
      `if(window.__telegramShowError){window.__telegramShowError('${escaped}');}`,
    );
  };

  _clearModalError = (serviceId: string) => {
    this._runModalScript(
      serviceId,
      'if(window.__telegramClearError){window.__telegramClearError();}',
    );
  };

  _setModalLoading = (serviceId: string, loading: boolean) => {
    this._runModalScript(
      serviceId,
      `if(window.__telegramSetLoading){window.__telegramSetLoading(${loading ? 'true' : 'false'});}`,
    );
  };

  _buildQrModalScript = (
    serviceId: string,
    base64: string,
    backgroundBase64: string,
  ): string => {
    const escapedBase64 = base64
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'");
    const escapedBg = backgroundBase64
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'");
    const escapedTitle = escapeModalString(
      formatMessage(messages.qrModalTitle),
    );
    const escapedDesc = escapeModalString(formatMessage(messages.qrModalDesc));
    const escapedPhoneLabel = escapeModalString(
      formatMessage(messages.phoneLabel),
    );
    const escapedCodeLabel = escapeModalString(
      formatMessage(messages.codeLabel),
    );
    const escapedPasswordLabel = escapeModalString(
      formatMessage(messages.passwordLabel),
    );
    const escapedUsePhone = escapeModalString(
      formatMessage(messages.usePhoneLogin),
    );
    const escapedBackToQr = escapeModalString(formatMessage(messages.backToQr));
    const escapedSubmit = escapeModalString(
      formatMessage(messages.submitLabel),
    );

    return `
(function() {
  try {
	    var existingModal = document.getElementById('telegram-qr-modal');
	    if (existingModal) existingModal.remove();

    var BASE64_QR = '${escapedBase64}';
    var BG_IMAGE = '${escapedBg}';
    var CHANNEL_TYPE = 'telegram-login-action';

    function postAction(payload) {
      window.postMessage({ type: CHANNEL_TYPE, payload: payload }, window.location.origin);
    }

    var s = document.createElement('style');
    s.textContent = [
      '.tga-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
      '.tga-wrapper{display:flex;flex-direction:column;align-items:center}',
      '.tga-card{position:relative;width:465px;height:577px;border-radius:12px;overflow:hidden;background:#fff}',
      '.tga-card-bg{position:absolute;top:0;left:0;width:100%;height:100%;background-size:100% 100%;background-position:center;background-repeat:no-repeat}',
      '.tga-title{position:absolute;left:48px;top:58px;color:#FFFFFF;font-size:28px;font-weight:700;line-height:36px;margin:0;z-index:2}',
      '.tga-content{position:absolute;left:0;right:0;display:flex;flex-direction:column;height:100%;justify-content:end;align-items:center;gap:14px;z-index:2;padding:0 24px;box-sizing:border-box}',
      '.tga-qr-wrapper{position:relative;width:256px;height:256px}',
      '.tga-qr-box{width:256px;height:256px;border-radius:8px;border:1px solid #E1E1E1;background:#FFFFFF;display:flex;align-items:center;justify-content:center;overflow:hidden}',
      '.tga-qrimg{width:256px;height:256px;image-rendering:pixelated;display:none}',
      '.tga-qr-spinner{width:36px;height:36px;border:3px solid #E1E1E1;border-top-color:#4A90D9;border-radius:50%;animation:tga-spin 0.8s linear infinite}',
      '@keyframes tga-spin{to{transform:rotate(360deg)}}',
      '.tga-desc{color:#111111;font-size:22px;font-weight:600;line-height:30px;text-align:center;margin:0}',
      '.tga-view{display:none;flex-direction:column;align-items:center;gap:14px;width:100%}',
      '.tga-view.is-active{display:flex;padding-bottom:120px}',
      '.tga-view[data-view="qr"].is-active{padding-bottom:30px}',
      '.tga-input{width:100%;max-width:320px;padding:12px 14px;border-radius:8px;border:1px solid #E1E1E1;background:#FFFFFF;color:#111111;font-size:16px;outline:none;box-sizing:border-box}',
      '.tga-input:focus{border-color:#4A90D9}',
      '.tga-btn{width:100%;max-width:320px;padding:12px 14px;border-radius:8px;border:none;background:#4A90D9;color:#FFFFFF;font-size:16px;font-weight:600;cursor:pointer;box-sizing:border-box}',
      '.tga-btn:disabled{opacity:0.6;cursor:not-allowed}',
      '.tga-link{background:none;border:none;color:#4A90D9;font-size:14px;cursor:pointer;text-decoration:underline;padding:0;font-family:inherit}',
      '.tga-label{color:#111111;font-size:16px;font-weight:600;margin:0;text-align:center}',
      '.tga-error{color:#D93025;font-size:13px;text-align:center;margin:0;word-break:break-word;display:none}',
      '.tga-loading{display:none;margin:0;color:#666;font-size:13px}'
    ].join('');
    document.head.appendChild(s);

    var modal = document.createElement('div');
    modal.id = 'telegram-qr-modal';
    var cardBgStyle = BG_IMAGE ? 'background-image:url(\\'' + BG_IMAGE + '\\');' : '';

	    var TITLES = {
	      qr: '${escapedTitle}',
	      phone: '${escapedPhoneLabel}',
	      code: '${escapedCodeLabel}',
	      password: '${escapedPasswordLabel}'
	    };

	    modal.innerHTML =
	      '<div class="tga-overlay">' +
	        '<div class="tga-wrapper">' +
	          '<div class="tga-card">' +
	            '<div class="tga-card-bg" style="' + cardBgStyle + '"></div>' +
	            '<h2 class="tga-title">' + TITLES.qr + '</h2>' +
            '<div class="tga-content">' +
              '<div class="tga-view is-active" data-view="qr">' +
                '<div class="tga-qr-wrapper">' +
                  '<div class="tga-qr-box">' +
                    '<img id="tga-qr-img" src="' + BASE64_QR + '" alt="QR Code" class="tga-qrimg"/>' +
                    '<div class="tga-qr-spinner" id="tga-qr-spinner"></div>' +
                  '</div>' +
                '</div>' +
                '<p class="tga-desc">${escapedDesc}</p>' +
                '<button type="button" class="tga-link" id="tga-toggle-phone">${escapedUsePhone}</button>' +
              '</div>' +
              '<div class="tga-view" data-view="phone">' +
                '<p class="tga-label">${escapedPhoneLabel}</p>' +
                '<input type="tel" class="tga-input" id="tga-phone-input" autocomplete="off" autocapitalize="off" spellcheck="false"/>' +
                '<p class="tga-error" id="tga-phone-error"></p>' +
                '<button type="button" class="tga-btn" id="tga-phone-submit">${escapedSubmit}</button>' +
                '<button type="button" class="tga-link" id="tga-back-to-qr">${escapedBackToQr}</button>' +
              '</div>' +
              '<div class="tga-view" data-view="code">' +
                '<p class="tga-label">${escapedCodeLabel}</p>' +
                '<input type="text" class="tga-input" id="tga-code-input" autocomplete="one-time-code" inputmode="numeric" autocapitalize="off" spellcheck="false"/>' +
                '<p class="tga-error" id="tga-code-error"></p>' +
                '<button type="button" class="tga-btn" id="tga-code-submit">${escapedSubmit}</button>' +
                '<button type="button" class="tga-link" id="tga-code-back-to-qr">${escapedBackToQr}</button>' +
              '</div>' +
              '<div class="tga-view" data-view="password">' +
                '<p class="tga-label">${escapedPasswordLabel}</p>' +
                '<input type="password" class="tga-input" id="tga-password-input" autocomplete="off" spellcheck="false"/>' +
                '<p class="tga-error" id="tga-pw-error"></p>' +
                '<button type="button" class="tga-btn" id="tga-password-submit">${escapedSubmit}</button>' +
                '<button type="button" class="tga-link" id="tga-pw-back-to-qr">${escapedBackToQr}</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

	    function setView(view) {
	      var views = modal.querySelectorAll('.tga-view');
	      for (var i = 0; i < views.length; i++) {
	        if (views[i].getAttribute('data-view') === view) {
	          views[i].classList.add('is-active');
	        } else {
	          views[i].classList.remove('is-active');
	        }
	      }
	      var title = modal.querySelector('.tga-title');
	      if (title) title.textContent = TITLES[view] || TITLES.qr;
	      clearError();
      var inputMap = { phone: 'tga-phone-input', code: 'tga-code-input', password: 'tga-password-input' };
      var id = inputMap[view];
      if (id) { var el = document.getElementById(id); if (el) { try { el.focus(); } catch(e) {} } }
    }
    function showError(msg) {
      var active = modal.querySelector('.tga-view.is-active');
      var el = active ? active.querySelector('.tga-error') : null;
      if (el) {
        el.textContent = msg || '';
        el.style.display = msg ? 'block' : 'none';
      }
    }
    function clearError() {
      var errors = modal.querySelectorAll('.tga-error');
      for (var i = 0; i < errors.length; i++) {
        errors[i].textContent = '';
        errors[i].style.display = 'none';
      }
    }
    function setLoading(loading) {
      var btns = modal.querySelectorAll('.tga-btn');
      for (var i = 0; i < btns.length; i++) { btns[i].disabled = !!loading; }
      var ld = document.getElementById('tga-loading');
      if (ld) ld.style.display = loading ? 'block' : 'none';
    }
    function requiredMsg(step) {
      if (step === 'phone') return 'Phone number is required';
      if (step === 'code') return 'Verification code is required';
      return 'Password is required';
    }
    function submitStep(step, inputId) {
      var el = document.getElementById(inputId);
      if (!el) return;
      var val = (el.value || '').trim();
      if (!val) { showError(requiredMsg(step)); try { el.focus(); } catch(e) {} return; }
      setLoading(true);
      postAction({ step: step, value: val });
    }

    window.__telegramSetView = setView;
    window.__telegramShowError = showError;
    window.__telegramClearError = clearError;
    window.__telegramSetLoading = setLoading;

    window.__telegramSetQr = function(base64) {
      var img = document.getElementById('tga-qr-img');
      var sp = document.getElementById('tga-qr-spinner');
      if (img) img.src = base64 || '';
      if (base64) {
        if (img) img.style.display = 'block';
        if (sp) sp.style.display = 'none';
      } else {
        if (img) img.style.display = 'none';
        if (sp) sp.style.display = '';
      }
    };

    var toggleBtn = document.getElementById('tga-toggle-phone');
    if (toggleBtn) toggleBtn.addEventListener('click', function() { setLoading(true); postAction({ step: 'toggle-phone', value: '' }); });
    var phoneBtn = document.getElementById('tga-phone-submit');
    if (phoneBtn) phoneBtn.addEventListener('click', function() { submitStep('phone', 'tga-phone-input'); });
    var codeBtn = document.getElementById('tga-code-submit');
    if (codeBtn) codeBtn.addEventListener('click', function() { submitStep('code', 'tga-code-input'); });
    var pwBtn = document.getElementById('tga-password-submit');
    if (pwBtn) pwBtn.addEventListener('click', function() { submitStep('password', 'tga-password-input'); });

    function backToQr() { setLoading(true); postAction({ step: 'toggle-qr', value: '' }); }
    var backBtns = modal.querySelectorAll('[id$="back-to-qr"]');
    for (var bi = 0; bi < backBtns.length; bi++) { backBtns[bi].addEventListener('click', backToQr); }

    function enterHandler(e) {
      if (e.key !== 'Enter') return;
      var active = modal.querySelector('.tga-view.is-active');
      if (!active) return;
      var view = active.getAttribute('data-view');
      var map = { phone: 'tga-phone-input', code: 'tga-code-input', password: 'tga-password-input' };
      if (map[view]) { e.preventDefault(); submitStep(view, map[view]); }
    }
    document.addEventListener('keydown', enterHandler, true);

    // Block navigation/escape while modal is showing, but never block typing in form fields.
    var _keydownHandler = function(e) {
      var t = e.target;
      var isField = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (isField) return;
      e.stopPropagation();
      e.preventDefault();
    };
    document.addEventListener('keydown', _keydownHandler, true);

    if (!window.__telegramOriginalPushState) {
      window.__telegramOriginalPushState = history.pushState.bind(history);
    }
    window.__telegramInjectedPushState = function() {};
    history.pushState = window.__telegramInjectedPushState;
    var _popstateHandler = function() { history.pushState(null, '', location.href); };
    window.addEventListener('popstate', _popstateHandler);

    window.__telegramSetQr(BASE64_QR);

    window.__telegramQrListeners = {
      keydown: _keydownHandler,
      enter: enterHandler,
      popstate: _popstateHandler
    };
  } catch(e) {
    console.error('[TG-FLUX] modal injection failed');
  }
})();
    `;
  };
}
