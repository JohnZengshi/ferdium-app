import { basename, join } from 'node:path';
import { webContents } from '@electron/remote';
import { ipcRenderer } from 'electron';
import { action, autorun, computed, makeObservable, observable } from 'mobx';
import type ElectronWebView from 'react-electron-web-view';

import { v4 as uuidV4 } from 'uuid';
import * as conversationsApi from '../agent-flow-cs/api/generated/conversations/conversations';
import * as ownersApi from '../agent-flow-cs/api/generated/owners/owners';
import * as suggestionApi from '../agent-flow-cs/api/generated/suggestion/suggestion';
import * as translateApi from '../agent-flow-cs/api/generated/translate/translate';
import * as whatsappApi from '../agent-flow-cs/api/generated/whatsapp/whatsapp';
import {
  subscribeConversationLive,
  subscribeConversationStatus,
} from '../agent-flow-cs/api/sse';
import { needsToken } from '../api/apiBase';
import { DEFAULT_SERVICE_ORDER, DEFAULT_SERVICE_SETTINGS } from '../config';
import { isMac } from '../environment';
import { todosStore } from '../features/todos';
import { getFaviconUrl } from '../helpers/favicon-helpers';
import { isValidExternalURL, normalizedUrl } from '../helpers/url-helpers';
import { ifUndefined } from '../jsUtils';
import type { IRecipe } from './Recipe';
import UserAgent from './UserAgent';

const debug = require('../preload-safe-debug')('Ferdium:Service');

// Global registry for active partitions
// This is needed to prevent events of the same partition from being registered multiple times (when using custom sandboxes)
const activePartitions = new Set<string>();

interface WebviewEventBinding {
  owner: Service;
  recipeEvents: Set<string>;
}

const webviewEventBindings = new WeakMap<
  ElectronWebView,
  WebviewEventBinding
>();

// 全局去重：防止旧 Service 实例残留监听器时，同一 wa-ai 请求被处理多次
// 模块级锁：确保同一 requestId 只触发一次 HTTP 请求，无论有多少个 listener
const waAiRequestInFlight = new Set<string>();
const waAiRequestRecentlyHandled = new Set<string>();
const WA_AI_ALLOWED_OPERATIONS: Record<string, ReadonlySet<string>> = {
  conversations: new Set([
    'getConversationByCustomerApiV1ConversationsByCustomerCustomerIdGet',
    'resumeConversationByCustomerApiV1ConversationsByCustomerCustomerIdResumePatch',
    'pauseConversationByCustomerApiV1ConversationsByCustomerCustomerIdPausePatch',
  ]),
  translate: new Set(['translateApiV1TranslatePost']),
  whatsapp: new Set(['getWhatsappBindingApiV1WhatsappBindGet']),
  suggestion: new Set(['generateSuggestionApiV1SuggestionPost']),
  owners: new Set([
    'getConversationDaySummaryApiV1OwnersConversationsSummaryGet',
  ]),
};
const WA_AI_RATE_LIMIT = 20;
const WA_AI_RATE_WINDOW_MS = 1000;
const waAiRequestTimestamps = new Map<string, number[]>();

interface DarkReaderInterface {
  brightness: number;
  contrast: number;
  sepia: number;
}

// TODO: Shouldn't most of these values default to what's defined in DEFAULT_SERVICE_SETTINGS?
export default class Service {
  id: string = '';

  recipe: IRecipe;

  _webview: ElectronWebView | null = null;

  timer: NodeJS.Timeout | null = null;

  events = {};

  // 防止 webview / preload 层重复绑定监听器时，同一 requestId 被重复转发
  handledWaAiRequestIds = new Set<string>();

  // 业务级去重锁：防止短时间内对同一接口发送相同参数的重复请求
  lastApiCallFingerprint = '';

  lastApiCallTime = 0;

  // 防止 initializeWebViewEvents 被多次调用导致重复绑定事件监听器
  webviewEventsInitialized = false;

  private _sseConversationSubscription: { close: () => void } | null = null;

  private _sseCustomerId: string | null = null;

  private _sseConversationLiveSubscription: { close: () => void } | null = null;

  private _sseLiveCustomerId: string | null = null;

  @observable isAttached: boolean = false;

  @observable isActive: boolean = false; // Is current webview active

  @observable name: string = '';

  @observable unreadDirectMessageCount: number = 0;

  @observable unreadIndirectMessageCount: number = 0;

  @observable dialogTitle: string = '';

  @observable order: number = DEFAULT_SERVICE_ORDER;

  @observable isEnabled: boolean = DEFAULT_SERVICE_SETTINGS.isEnabled;

  @observable isMuted: boolean = DEFAULT_SERVICE_SETTINGS.isMuted;

  @observable team: string = '';

  @observable customUrl: string = '';

  @observable isNotificationEnabled: boolean =
    DEFAULT_SERVICE_SETTINGS.isNotificationEnabled;

  @observable isBadgeEnabled: boolean = DEFAULT_SERVICE_SETTINGS.isBadgeEnabled;

  @observable isMediaBadgeEnabled: boolean =
    DEFAULT_SERVICE_SETTINGS.isMediaBadgeEnabled;

  @observable trapLinkClicks: boolean = DEFAULT_SERVICE_SETTINGS.trapLinkClicks;

  @observable isIndirectMessageBadgeEnabled: boolean = true;

  @observable iconUrl: string = '';

  @observable customIconUrl: string = '';

  @observable hasCustomUploadedIcon: boolean = false;

  @observable hasCrashed: boolean = false;

  @observable isDarkModeEnabled: boolean =
    DEFAULT_SERVICE_SETTINGS.isDarkModeEnabled;

  @observable isProgressbarEnabled: boolean =
    DEFAULT_SERVICE_SETTINGS.isProgressbarEnabled;

  @observable darkReaderSettings: DarkReaderInterface = {
    brightness: 100,
    contrast: 90,
    sepia: 10,
  };

  @observable spellcheckerLanguage: string | null = null;

  @observable isFirstLoad: boolean = true;

  @observable isLoading: boolean = true;

  @observable isLoadingPage: boolean = true;

  @observable isError: boolean = false;

  @observable errorMessage: string = '';

  @observable isUsingCustomUrl: boolean = false;

  @observable isServiceAccessRestricted: boolean = false;

  // TODO: is this used?
  @observable restrictionType = null;

  @observable isHibernationEnabled: boolean =
    DEFAULT_SERVICE_SETTINGS.isHibernationEnabled;

  @observable isWakeUpEnabled: boolean =
    DEFAULT_SERVICE_SETTINGS.isWakeUpEnabled;

  @observable isHibernationRequested: boolean = false;

  @observable onlyShowFavoritesInUnreadCount: boolean = false;

  @observable lastUsed: number = Date.now(); // timestamp

  @observable lastHibernated: number | null = null; // timestamp

  @observable lastPoll: number = Date.now();

  @observable lastPollAnswer: number = Date.now();

  @observable lostRecipeConnection: boolean = false;

  @observable lostRecipeReloadAttempt: number = 0;

  @observable userAgentModel: UserAgent;

  @observable proxy: string | null = null;

  @observable isMediaPlaying: boolean = false;

  @observable useFavicon: boolean = DEFAULT_SERVICE_SETTINGS.useFavicon;

  @action _setAutoRun() {
    if (!this.isEnabled) {
      this.webview = null;
      this.isAttached = false;
      this.unreadDirectMessageCount = 0;
      this.unreadIndirectMessageCount = 0;
    }

    if (this.recipe.hasCustomUrl && this.customUrl) {
      this.isUsingCustomUrl = true;
    }
  }

  constructor(data, recipe: IRecipe) {
    if (!data) {
      throw new Error('Service config not valid');
    }

    if (!recipe) {
      throw new Error('Service recipe not valid');
    }

    makeObservable(this);

    this.recipe = recipe;

    this.userAgentModel = new UserAgent(recipe.overrideUserAgent);

    this.id = ifUndefined<string>(data.id, this.id);
    this.name = ifUndefined<string>(data.name, this.name);
    this.team = ifUndefined<string>(data.team, this.team);
    this.customUrl = ifUndefined<string>(data.customUrl, this.customUrl);
    this.iconUrl = ifUndefined<string>(data.iconUrl, this.iconUrl);
    this.useFavicon = ifUndefined<boolean>(data.useFavicon, this.useFavicon);
    this.order = ifUndefined<number>(data.order, this.order);
    this.isEnabled = ifUndefined<boolean>(data.isEnabled, this.isEnabled);
    this.isNotificationEnabled = ifUndefined<boolean>(
      data.isNotificationEnabled,
      this.isNotificationEnabled,
    );
    this.isBadgeEnabled = ifUndefined<boolean>(
      data.isBadgeEnabled,
      this.isBadgeEnabled,
    );

    this.isMediaBadgeEnabled = ifUndefined<boolean>(
      data.isMediaBadgeEnabled,
      this.isMediaBadgeEnabled,
    );
    this.trapLinkClicks = ifUndefined<boolean>(
      data.trapLinkClicks,
      this.trapLinkClicks,
    );
    this.isIndirectMessageBadgeEnabled = ifUndefined<boolean>(
      data.isIndirectMessageBadgeEnabled,
      this.isIndirectMessageBadgeEnabled,
    );
    this.isMuted = ifUndefined<boolean>(data.isMuted, this.isMuted);
    this.isDarkModeEnabled = ifUndefined<boolean>(
      data.isDarkModeEnabled,
      this.isDarkModeEnabled,
    );
    this.darkReaderSettings = ifUndefined<DarkReaderInterface>(
      data.darkReaderSettings,
      this.darkReaderSettings,
    );
    this.isProgressbarEnabled = ifUndefined<boolean>(
      data.isProgressbarEnabled,
      this.isProgressbarEnabled,
    );
    this.hasCustomUploadedIcon = ifUndefined<boolean>(
      data.iconId?.length > 0,
      this.hasCustomUploadedIcon,
    );
    this.onlyShowFavoritesInUnreadCount = ifUndefined<boolean>(
      data.onlyShowFavoritesInUnreadCount,
      this.onlyShowFavoritesInUnreadCount,
    );
    this.proxy = ifUndefined<string | null>(data.proxy, this.proxy);
    this.spellcheckerLanguage = ifUndefined<string | null>(
      data.spellcheckerLanguage,
      this.spellcheckerLanguage,
    );
    this.userAgentPref = ifUndefined<string | null>(
      data.userAgentPref,
      this.userAgentPref,
    );
    this.isHibernationEnabled = ifUndefined<boolean>(
      data.isHibernationEnabled,
      this.isHibernationEnabled,
    );
    this.isWakeUpEnabled = ifUndefined<boolean>(
      data.isWakeUpEnabled,
      this.isWakeUpEnabled,
    );

    // Check if "Hibernate on Startup" is enabled and hibernate all services except active one
    const { hibernateOnStartup } = window['ferdium'].stores.settings.app;
    // The service store is probably not loaded yet so we need to use localStorage data to get active service
    const isActive =
      window.localStorage.service &&
      JSON.parse(window.localStorage.service).activeService === this.id;
    if (hibernateOnStartup && !isActive) {
      this.isHibernationRequested = true;
    }

    autorun((): void => {
      this._setAutoRun();
    });
  }

  @action _didStartLoading(): void {
    this.hasCrashed = false;
    this.isLoading = true;
    this.isLoadingPage = true;
    this.isError = false;
  }

  @action _didStopLoading(): void {
    this.isLoading = false;
    this.isLoadingPage = false;
  }

  @action _didLoad(): void {
    this.isLoading = false;
    this.isLoadingPage = false;

    if (!this.isError) {
      this.isFirstLoad = false;
    }
  }

  @action _didFailLoad(event: { errorDescription: string }): void {
    this.isError = false;
    this.errorMessage = event.errorDescription;
    this.isLoading = false;
    this.isLoadingPage = false;
  }

  @action _hasCrashed(): void {
    this.hasCrashed = true;
  }

  @action _didMediaPlaying(): void {
    this.isMediaPlaying = true;
  }

  @action _didMediaPaused(): void {
    this.isMediaPlaying = false;
  }

  @computed get shareWithWebview(): object {
    return {
      id: this.id,
      spellcheckerLanguage: this.spellcheckerLanguage,
      isDarkModeEnabled: this.isDarkModeEnabled,
      isProgressbarEnabled: this.isProgressbarEnabled,
      darkReaderSettings: this.darkReaderSettings,
      team: this.team,
      url: this.url,
      hasCustomIcon: this.hasCustomIcon,
      onlyShowFavoritesInUnreadCount: this.onlyShowFavoritesInUnreadCount,
      trapLinkClicks: this.trapLinkClicks,
    };
  }

  @computed get isTodosService(): boolean {
    return this.recipe.id === todosStore.todoRecipeId;
  }

  @computed get canHibernate(): boolean {
    return this.isHibernationEnabled && !this.isMediaPlaying;
  }

  @computed get isHibernating(): boolean {
    return this.canHibernate && this.isHibernationRequested;
  }

  get webview(): ElectronWebView | null {
    if (this.isTodosService) {
      return todosStore.webview;
    }

    return this._webview;
  }

  set webview(webview) {
    this._webview = webview;
  }

  @computed get url(): string {
    if (this.recipe.hasCustomUrl && this.customUrl) {
      let url: string = '';
      try {
        url = normalizedUrl(this.customUrl);
      } catch {
        console.error(
          `Service (${this.recipe.name}): '${this.customUrl}' is not a valid Url.`,
        );
      }

      const { buildUrl } = this.recipe;
      if (typeof buildUrl === 'function') {
        url = buildUrl(url);
      }

      return url;
    }

    if (this.recipe.hasTeamId && this.team) {
      return this.recipe.serviceURL.replace('{teamId}', this.team);
    }

    return this.recipe.serviceURL;
  }

  @computed get icon(): string {
    if (this.useFavicon) {
      return getFaviconUrl(this.url);
    }

    if (this.iconUrl) {
      if (needsToken()) {
        let url: URL;
        try {
          url = new URL(this.iconUrl);
        } catch (error) {
          debug('Invalid url', this.iconUrl, error);
          return this.iconUrl;
        }
        const requestStore = (window as any).ferdium.stores.requests;
        // Make sure we only pass the token to the local server.
        if (url.origin === requestStore.localServerOrigin) {
          url.searchParams.set('token', requestStore.localServerToken);
          return url.toString();
        }
      }
      return this.iconUrl;
    }

    if (this.recipe.defaultIcon) {
      return this.recipe.defaultIcon;
    }

    return join(this.recipe.path, 'icon.svg');
  }

  @computed get hasCustomIcon(): boolean {
    return Boolean(this.iconUrl);
  }

  @computed get userAgent(): string {
    return this.userAgentModel.userAgent;
  }

  @computed get userAgentPref(): string | null {
    return this.userAgentModel.userAgentPref;
  }

  set userAgentPref(pref) {
    this.userAgentModel.userAgentPref = pref;
  }

  @computed get defaultUserAgent(): string {
    return this.userAgentModel.defaultUserAgent;
  }

  @computed get partition(): string {
    return this.recipe.partition || `persist:service-${this.id}`;
  }

  // SSE 会话状态订阅管理
  private _subscribeConversationStatusSSE(customerId: string): void {
    if (!customerId) return;
    if (
      this._sseCustomerId === customerId &&
      this._sseConversationSubscription
    ) {
      debug('SSE already subscribed to customer %s, skipping', customerId);
      return;
    }

    this._unsubscribeConversationStatusSSE();
    this._sseCustomerId = customerId;
    this._sseConversationSubscription = subscribeConversationStatus(
      customerId,
      {
        onEvent: evt => {
          if (evt.data?.type === 'status_change') {
            this.webview?.send('wa-ai-status-change', evt.data);
          }
        },
        onError: error => {
          debug('SSE error for customer %s: %o', customerId, error);
        },
        onClose: () => {
          debug('SSE closed for customer %s', customerId);
          if (this._sseCustomerId === customerId) {
            this._sseConversationSubscription = null;
            this._sseCustomerId = null;
          }
        },
      },
      { waSessionId: this.id },
    );

    debug('SSE subscribed to customer %s', customerId);
  }

  private _unsubscribeConversationStatusSSE(): void {
    if (this._sseConversationSubscription) {
      this._sseConversationSubscription.close();
      this._sseConversationSubscription = null;
      debug('SSE unsubscribed from customer %s', this._sseCustomerId);
      this._sseCustomerId = null;
    }
  }

  private _subscribeConversationLiveSSE(customerId: string): void {
    if (!customerId) return;
    if (
      this._sseLiveCustomerId === customerId &&
      this._sseConversationLiveSubscription
    ) {
      debug('SSE live already subscribed to customer %s, skipping', customerId);
      return;
    }

    this._unsubscribeConversationLiveSSE();
    this.webview?.send('wa-ai-live-reset');
    this._sseLiveCustomerId = customerId;
    this._sseConversationLiveSubscription = subscribeConversationLive(
      customerId,
      {
        onEvent: evt => {
          debug('conversation live SSE event for %s: %o', customerId, {
            event: evt.event,
            data: evt.data,
          });
          this.webview?.send('wa-ai-live-event', evt.data);
        },
        onError: error => {
          debug('SSE live error for customer %s: %o', customerId, error);
        },
        onClose: () => {
          debug('SSE live closed for customer %s', customerId);
          if (this._sseLiveCustomerId === customerId) {
            this._sseConversationLiveSubscription = null;
            this._sseLiveCustomerId = null;
          }
        },
      },
      { waSessionId: this.id },
    );

    debug('SSE live subscribed to customer %s', customerId);
  }

  private _unsubscribeConversationLiveSSE(): void {
    if (this._sseConversationLiveSubscription) {
      this._sseConversationLiveSubscription.close();
      this._sseConversationLiveSubscription = null;
      debug('SSE live unsubscribed from customer %s', this._sseLiveCustomerId);
      this._sseLiveCustomerId = null;
    }
  }

  initializeWebViewEvents({ handleIPCMessage, openWindow, stores }): void {
    const { webview } = this;
    if (!webview) return;

    const existingBinding = webviewEventBindings.get(webview);
    const binding: WebviewEventBinding = existingBinding ?? {
      owner: this,
      recipeEvents: new Set(),
    };
    binding.owner = this;
    if (!existingBinding) webviewEventBindings.set(webview, binding);
    this.webviewEventsInitialized = true;

    this.userAgentModel.setWebviewReference(webview);

    // If the recipe has implemented 'modifyRequestHeaders',
    // Send those headers to ipcMain so that it can be set in session
    if (typeof this.recipe.modifyRequestHeaders === 'function') {
      const modifiedRequestHeaders = this.recipe.modifyRequestHeaders();
      debug(this.name, 'modifiedRequestHeaders', modifiedRequestHeaders);
      ipcRenderer.send('modifyRequestHeaders', {
        modifiedRequestHeaders,
        serviceId: this.id,
      });
    } else {
      debug(this.name, 'modifyRequestHeaders is not defined in the recipe');
    }

    // if the recipe has implemented 'knownCertificateHosts'
    if (typeof this.recipe.knownCertificateHosts === 'function') {
      const knownHosts = this.recipe.knownCertificateHosts();
      debug(this.name, 'knownCertificateHosts', knownHosts);
      ipcRenderer.send('knownCertificateHosts', {
        knownHosts,
        serviceId: this.id,
      });
    } else {
      debug(this.name, 'knownCertificateHosts is not defined in the recipe');
    }

    if (existingBinding) return;

    const webviewWebContents = webContents.fromId(webview.getWebContentsId());

    webview.addEventListener('ipc-message', async e => {
      const service = binding.owner;
      switch (e.channel) {
        case 'inject-js-unsafe': {
          const scripts = e.args
            .map((script, index) => {
              if (typeof script === 'string') {
                return {
                  name: `unsafe-script-${index}`,
                  source: script,
                  seq: undefined,
                };
              }
              if (script && typeof script === 'object') {
                const obj = script as Record<string, unknown>;
                if (typeof obj.source === 'string') {
                  return {
                    name:
                      typeof obj.name === 'string'
                        ? obj.name
                        : `unsafe-script-${index}`,
                    source: obj.source,
                    seq: typeof obj.seq === 'number' ? obj.seq : undefined,
                  };
                }
              }
              debug('inject-js-unsafe: malformed script argument skipped', {
                serviceId: service.id,
                index,
              });
              return null;
            })
            .filter(
              (s): s is { name: string; source: string; seq?: number } =>
                s !== null,
            );

          for (const [index, script] of scripts.entries()) {
            try {
              // Scripts share page state and must execute in declared order.
              // eslint-disable-next-line no-await-in-loop
              await service.webview.executeJavaScript(
                `"use strict"; (() => { ${script.source} })();`,
              );
              service.webview.send('inject-js-unsafe-ack', {
                name: script.name,
                index,
                seq: script.seq,
                success: true,
              });
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              console.error('Unsafe script injection failed', {
                serviceId: service.id,
                script: script.name,
                index,
                seq: script.seq,
                error: message,
              });
              service.webview.send('inject-js-unsafe-ack', {
                name: script.name,
                index,
                seq: script.seq,
                success: false,
                error: message,
              });
            }
          }

          break;
        }
        case 'wa-ai-api-request': {
          const payload: unknown = e.args[0];
          if (
            typeof payload !== 'object' ||
            payload === null ||
            typeof (payload as Record<string, unknown>).requestId !==
              'string' ||
            (payload as Record<string, unknown>).requestId === '' ||
            typeof (payload as Record<string, unknown>).api !== 'string' ||
            typeof (payload as Record<string, unknown>).method !== 'string' ||
            !Array.isArray((payload as Record<string, unknown>).args)
          ) {
            debug('Malformed wa-ai-api-request ignored');
            return;
          }

          const { requestId, api, method, args } = payload as {
            requestId: string;
            api:
              | 'conversations'
              | 'suggestion'
              | 'translate'
              | 'whatsapp'
              | 'owners';
            method: string;
            args: unknown[];
          };

          if (!WA_AI_ALLOWED_OPERATIONS[api]?.has(method)) {
            debug('Disallowed wa-ai-api-request ignored', {
              api,
              method,
              requestId,
            });
            service.webview.send('wa-ai-api-response-host', {
              requestId,
              success: false,
              error: 'Operation not allowed',
            });
            return;
          }

          const now = Date.now();
          const recentRequests = (waAiRequestTimestamps.get(api) ?? []).filter(
            timestamp => now - timestamp < WA_AI_RATE_WINDOW_MS,
          );
          waAiRequestTimestamps.set(api, recentRequests);
          if (recentRequests.length >= WA_AI_RATE_LIMIT) {
            debug('Rate-limited wa-ai-api-request rejected', {
              api,
              method,
              requestId,
            });
            service.webview.send('wa-ai-api-response-host', {
              requestId,
              success: false,
              error: 'Rate limit exceeded',
            });
            return;
          }
          recentRequests.push(now);

          // 模块级全局锁：确保同一 requestId 只触发一次 HTTP 请求
          if (
            waAiRequestInFlight.has(requestId) ||
            waAiRequestRecentlyHandled.has(requestId)
          ) {
            debug(
              'Duplicate wa-ai-api-request ignored (global lock):',
              requestId,
            );
            return;
          }
          waAiRequestInFlight.add(requestId);

          try {
            const apiModule =
              api === 'conversations'
                ? conversationsApi
                : api === 'whatsapp'
                  ? whatsappApi
                  : api === 'suggestion'
                    ? suggestionApi
                    : api === 'owners'
                      ? ownersApi
                      : translateApi;
            const apiMethod = (apiModule as Record<string, unknown>)[method];

            if (typeof apiMethod !== 'function') {
              throw new TypeError(
                `Method ${method} not found in module ${api}`,
              );
            }

            const enhancedArgs = [...args];

            // 为 pause/resume/get-by-customer conversation 接口注入 wa_session_id（Ferdium 服务会话 ID）
            if (
              (method.includes('pauseConversationByCustomer') ||
                method.includes('resumeConversationByCustomer') ||
                method.includes('getConversationByCustomer')) && // args 格式: [customerId, params]
              enhancedArgs.length >= 2 &&
              typeof enhancedArgs[1] === 'object'
            ) {
              (enhancedArgs[1] as Record<string, unknown>).wa_session_id =
                service.id;
            }

            if (api === 'whatsapp' && method.includes('getWhatsappBinding')) {
              if (
                enhancedArgs.length === 0 ||
                typeof enhancedArgs[0] !== 'object' ||
                enhancedArgs[0] === null
              ) {
                enhancedArgs[0] = {};
              }
              (enhancedArgs[0] as Record<string, unknown>).session_id =
                service.id;
            }

            if (
              api === 'owners' &&
              method.includes('getConversationDaySummary')
            ) {
              if (
                enhancedArgs.length === 0 ||
                typeof enhancedArgs[0] !== 'object' ||
                enhancedArgs[0] === null
              ) {
                enhancedArgs[0] = {};
              }
              (enhancedArgs[0] as Record<string, unknown>).wa_session_id =
                service.id;
            }

            const result = await (
              apiMethod as (...fnArgs: unknown[]) => Promise<unknown>
            )(...enhancedArgs);

            // 自动订阅/更新 SSE
            if (
              method.includes('getConversationByCustomer') &&
              enhancedArgs.length > 0
            ) {
              const customerId = enhancedArgs[0] as string;
              service._subscribeConversationStatusSSE(customerId);
              service._subscribeConversationLiveSSE(customerId);
            }

            service.webview.send('wa-ai-api-response-host', {
              requestId,
              success: true,
              result,
            });
          } catch (error: unknown) {
            const errorObj =
              error instanceof Error ? error : new Error(String(error));
            const errorDetail = {
              status: (errorObj as any).status as number | undefined,
              statusText: (errorObj as any).statusText as string | undefined,
              detail: (errorObj as any).detail as string | undefined,
              code: (errorObj as any).code as string | undefined,
              url: (errorObj as any).url as string | undefined,
            };

            service.webview.send('wa-ai-api-response-host', {
              requestId,
              success: false,
              error: errorObj.message,
              errorDetail,
            });
          } finally {
            // 请求完成后清理锁，防止内存泄漏
            waAiRequestInFlight.delete(requestId);
            waAiRequestRecentlyHandled.add(requestId);

            // 保留最近处理过的请求，防止重复处理，但限制大小
            if (waAiRequestRecentlyHandled.size > 100) {
              const firstId = waAiRequestRecentlyHandled.values().next().value;
              if (firstId) waAiRequestRecentlyHandled.delete(firstId);
            }
          }

          break;
        }
        case 'wa-ai-toast-request': {
          const payload = (e.args[0] ?? {}) as {
            theme?: 'error' | 'warning' | 'success' | 'info';
            message?: string;
          };

          window.dispatchEvent(
            new CustomEvent('wa-ai-toast', {
              detail: {
                theme: payload.theme ?? 'error',
                message: payload.message ?? '接口错误',
                serviceId: service.id,
              },
            }),
          );

          break;
        }
        default: {
          handleIPCMessage({
            serviceId: service.id,
            channel: e.channel,
            args: e.args,
          });
        }
      }
    });

    webview.addEventListener('new-window', (event, url, frameName, options) => {
      const service = binding.owner;
      debug('new-window', event, url, frameName, options);
      if (!isValidExternalURL(event.url)) {
        return;
      }
      if (
        event.disposition === 'foreground-tab' ||
        event.disposition === 'background-tab'
      ) {
        openWindow({
          event,
          url,
          frameName,
          options,
        });
      } else {
        ipcRenderer.send('open-browser-window', {
          url: event.url,
          serviceId: service.id,
        });
      }
    });

    webview.addEventListener('did-start-loading', event => {
      const service = binding.owner;
      debug('Did start load', service.name, event);

      // Navigation reaches the old preload early enough to release its observer.
      service.webview.send('dark-mode-disconnect-cleanup');
      service._didStartLoading();
    });

    webview.addEventListener('did-stop-loading', event => {
      const service = binding.owner;
      debug('Did stop load', service.name, event);

      service._didStopLoading();
    });

    const didLoad = () => {
      binding.owner._didLoad();
    };

    webview.addEventListener('did-frame-finish-load', didLoad);
    webview.addEventListener('did-navigate', didLoad);

    webview.addEventListener('did-fail-load', event => {
      const service = binding.owner;
      debug('Service failed to load', service.name, event);
      if (
        event.isMainFrame &&
        event.errorCode !== -21 &&
        event.errorCode !== -3
      ) {
        service._didFailLoad(event);
      }
    });

    webview.addEventListener('crashed', () => {
      const service = binding.owner;
      debug('Service crashed', service.name);
      service._hasCrashed();
    });

    webview.addEventListener('found-in-page', ({ result }) => {
      debug('Found in page', result);
      binding.owner.webview.send('found-in-page', result);
    });

    webview.addEventListener('media-started-playing', event => {
      const service = binding.owner;
      debug('Started Playing media', service.name, event);
      service._didMediaPlaying();
    });

    webview.addEventListener('media-paused', event => {
      const service = binding.owner;
      debug('Stopped Playing media', service.name, event);
      service._didMediaPaused();
    });

    if (webviewWebContents) {
      // This is needed to prevent events of the same partition from being registered multiple times (when using custom sandboxes)
      const webviewPartition = webviewWebContents.session.getStoragePath();
      if (webviewPartition) {
        // Check if the partition is already active
        if (activePartitions.has(webviewPartition)) {
          return;
        }

        // Add the partition to the active partitions
        activePartitions.add(webviewPartition);
      }
      // -----

      // TODO: Modify this logic once https://github.com/electron/electron/issues/40674 is fixed
      // This is a workaround for the issue where the zoom in shortcut is not working
      if (!isMac) {
        webviewWebContents.on('before-input-event', (event, input) => {
          if (input.control && input.key === '+' && input.type === 'keyDown') {
            event.preventDefault();
            const currentZoom = binding.owner.webview?.getZoomLevel();
            binding.owner.webview?.setZoomLevel(currentZoom + 0.5);
          }
        });
      }

      webviewWebContents.session.on('will-download', (event, item) => {
        event.preventDefault();

        const downloadId = uuidV4();

        window['ferdium'].actions.app.addDownload({
          id: downloadId,
          serviceId: binding.owner.id,
          filename: item.getFilename(),
          url: item.getURL(),
          savePath: item.getSavePath(),
        });

        item.addListener('updated', (event, state) => {
          if (state === 'interrupted') {
            debug('Download is interrupted but can be resumed');
          } else if (state === 'progressing') {
            if (item.isPaused()) {
              debug('Download is paused');
            } else {
              debug(`Received bytes: ${item.getReceivedBytes()}`);
            }
          }
          window['ferdium'].actions.app.updateDownload({
            id: downloadId,
            serviceId: binding.owner.id,
            filename: basename(item.getSavePath()),
            url: item.getURL(),
            savePath: item.getSavePath(),
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            state,
          });
          debug('download updated', event, state);
        });
        item.addListener('done', (event, state) => {
          debug('download done', event, state);
          if (state === 'completed') {
            debug('Download successfully');
          } else {
            if (state === 'cancelled' && item.getSavePath() === '') {
              window['ferdium'].actions.app.removeDownload(downloadId);
              debug('Download is cancelled');
            }
            debug(`Download failed: ${state}`);
          }

          window['ferdium'].actions.app.endedDownload({
            id: downloadId,
            serviceId: binding.owner.id,
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            state,
          });
        });

        ipcRenderer.on('toggle-pause-download', (_, data) => {
          debug('toggle-pause-download', item.isPaused(), item.getState());
          if (data.downloadId === downloadId || data.downloadId === undefined) {
            if (item.isPaused()) {
              item.resume();
            } else {
              item.pause();
            }
          }
          debug('toggle-pause-download', item.isPaused(), item.getState());
          window['ferdium'].actions.app.updateDownload({
            id: downloadId,
            paused: item.isPaused(),
          });
        });

        ipcRenderer.on('stop-download', (_, data) => {
          if (data === undefined || downloadId === data.downloadId) {
            item.cancel();
          }
        });
      });
      webviewWebContents.on('login', (event, _, authInfo, callback) => {
        // const authCallback = callback;
        debug('browser login event', authInfo);
        event.preventDefault();

        if (authInfo.isProxy && authInfo.scheme === 'basic') {
          debug('Sending service echo ping');
          webviewWebContents.send('get-service-id');

          debug('Received service id', binding.owner.id);

          const ps = stores.settings.proxy[binding.owner.id];

          if (ps) {
            debug('Sending proxy auth callback for service', binding.owner.id);
            callback(ps.user, ps.password);
          } else {
            debug('No proxy auth config found for', binding.owner.id);
          }
        }
      });
    }
  }

  initializeWebViewListener(): void {
    const { webview } = this;
    const binding = webview && webviewEventBindings.get(webview);
    if (webview && binding && this.recipe.events) {
      for (const eventName of Object.keys(this.recipe.events)) {
        if (!binding.recipeEvents.has(eventName)) {
          const eventHandler = this.recipe[this.recipe.events[eventName]];
          if (typeof eventHandler === 'function') {
            webview.addEventListener(eventName, event => {
              const eventHandlerName =
                binding.owner.recipe.events?.[eventName];
              if (!eventHandlerName) return;
              const currentHandler = binding.owner.recipe[eventHandlerName];
              if (typeof currentHandler === 'function') {
                currentHandler.call(webview, event);
              }
            });
            binding.recipeEvents.add(eventName);
          }
        }
      }
    }
  }

  resetMessageCount(): void {
    this.unreadDirectMessageCount = 0;
    this.unreadIndirectMessageCount = 0;
  }

  toggleToTalk(): void {
    this.webview?.send('toggle-to-talk');
  }
}
