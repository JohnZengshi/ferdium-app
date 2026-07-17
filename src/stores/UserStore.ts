import { ipcRenderer } from 'electron';
import jwt from 'jsonwebtoken';
import { action, computed, makeObservable, observable } from 'mobx';
import localStorage from 'mobx-localstorage';
import moment from 'moment';

import type { Stores } from '../@types/stores.types';
import type { Actions } from '../actions/lib/actions';
import { clearAccessToken, getAccessToken } from '../agent-flow-cs/api/auth';
import type { ApiInterface } from '../api';
import { DEFAULT_APP_SETTINGS, TODOS_PARTITION_ID } from '../config';
import serverlessLogin from '../helpers/serverless-helpers';
import authManager from '../lib/auth/AuthManager';
import FerdiumProvider from '../lib/auth/providers/FerdiumProvider';
import NextAuthProvider from '../lib/auth/providers/NextAuthProvider';
import {
  API_KEY_STORAGE_KEY,
  WA_USER_EMAIL_STORAGE_KEY,
  WA_USER_ID_STORAGE_KEY,
} from '../whatsapp-automation/constants';
import { saveLocalStorageProfile } from '../whatsapp-automation/profileStorage';
import CachedRequest from './lib/CachedRequest';
import Request from './lib/Request';
import TypedStore from './lib/TypedStore';

const debug = require('../preload-safe-debug')('Ferdium:UserStore');

// TODO: split stores into UserStore and AuthStore
export default class UserStore extends TypedStore {
  BASE_ROUTE: string = '/auth';

  WELCOME_ROUTE: string = `${this.BASE_ROUTE}/welcome`;

  LOGIN_ROUTE: string = `${this.BASE_ROUTE}/login`;

  LOGOUT_ROUTE: string = `${this.BASE_ROUTE}/logout`;

  SIGNUP_ROUTE: string = `${this.BASE_ROUTE}/signup`;

  SETUP_ROUTE: string = `${this.BASE_ROUTE}/signup/setup`;

  IMPORT_ROUTE: string = `${this.BASE_ROUTE}/signup/import`;

  INVITE_ROUTE: string = `${this.BASE_ROUTE}/signup/invite`;

  PASSWORD_ROUTE: string = `${this.BASE_ROUTE}/password`;

  CHANGE_SERVER_ROUTE: string = `${this.BASE_ROUTE}/server`;

  HOME_ROUTE: string = '/';

  LOCAL_AUTH_LOGIN_ROUTE: string = `${this.BASE_ROUTE}/local/login`;

  @observable loginRequest: Request = new Request(this.api.user, 'login');

  @observable signupRequest: Request = new Request(this.api.user, 'signup');

  @observable passwordRequest: Request = new Request(this.api.user, 'password');

  @observable inviteRequest: Request = new Request(this.api.user, 'invite');

  @observable getUserInfoRequest: CachedRequest = new CachedRequest(
    this.api.user,
    'getInfo',
  );

  @observable requestNewTokenRequest: CachedRequest = new CachedRequest(
    this.api.user,
    'requestNewToken',
  );

  @observable updateUserInfoRequest: Request = new Request(
    this.api.user,
    'updateInfo',
  );

  @observable deleteAccountRequest: CachedRequest = new CachedRequest(
    this.api.user,
    'delete',
  );

  @observable isImportLegacyServicesExecuting: boolean = false;

  @observable isImportLegacyServicesCompleted: boolean = false;

  @observable isLoggingOut: boolean = false;

  @observable id: string | null | undefined;

  @observable authToken: string | null =
    localStorage.getItem('authToken') || null;

  @observable accountType: string | undefined;

  @observable hasCompletedSignup: boolean = false;

  @observable userData: object = {};

  logoutReasonTypes = {
    SERVER: 'SERVER',
  };

  @observable logoutReason: string | null = null;

  @observable profileEmail: string | null = localStorage.getItem(
    WA_USER_EMAIL_STORAGE_KEY,
  );

  @observable profileUserId: string | null = localStorage.getItem(
    WA_USER_ID_STORAGE_KEY,
  );

  constructor(stores: Stores, api: ApiInterface, actions: Actions) {
    super(stores, api, actions);

    makeObservable(this);

    const useAgentFlowAuth = process.env.USE_AGENT_FLOW_AUTH === 'true';

    // Agent Flow 模式：总是启动 local server（提供 internal API，无论登录状态）
    // 纯 local 模式：只在未登录时启动并自动登录
    const shouldStartLocalServer = useAgentFlowAuth || !this.isLoggedIn;

    if (process.env.FERDIUM_SERVER === 'local' && shouldStartLocalServer) {
      ipcRenderer.once('localServerPort', () => {
        // Agent Flow 模式：不自动登录 internal server，等用户通过 Agent Flow CS 登录
        // 纯 local 模式：自动登录 internal server
        if (useAgentFlowAuth) {
          debug('Agent Flow 模式：Local server 已启动，等待用户登录');
        } else {
          debug('纯本地模式：登录内部服务器...');
          serverlessLogin(this.actions);
        }
      });
    }

    // Register auth providers with AuthManager
    authManager.registerProvider(new FerdiumProvider());
    authManager.registerProvider(new NextAuthProvider());

    // Register action handlers
    this.actions.user.login.listen(this._login.bind(this));
    this.actions.user.retrievePassword.listen(
      this._retrievePassword.bind(this),
    );
    this.actions.user.logout.listen(this._logout.bind(this));
    this.actions.user.signup.listen(this._signup.bind(this));
    this.actions.user.invite.listen(this._invite.bind(this));
    this.actions.user.update.listen(this._update.bind(this));
    this.actions.user.resetStatus.listen(this._resetStatus.bind(this));
    this.actions.user.importLegacyServices.listen(
      this._importLegacyServices.bind(this),
    );
    this.actions.user.delete.listen(this._delete.bind(this));

    // Reactions
    this.registerReactions([
      this._requireAuthenticatedUser.bind(this),
      this._getUserData.bind(this),
    ]);
  }

  setup(): void {
    // Data migration
    this._migrateUserLocale();
  }

  // Routes
  get loginRoute(): string {
    return this.LOGIN_ROUTE;
  }

  get signupRoute(): string {
    return this.SIGNUP_ROUTE;
  }

  get passwordRoute(): string {
    return this.PASSWORD_ROUTE;
  }

  get changeServerRoute(): string {
    return this.CHANGE_SERVER_ROUTE;
  }

  @computed get logoutRedirectRoute(): string {
    return process.env.USE_AGENT_FLOW_AUTH === 'true'
      ? this.LOGIN_ROUTE
      : this.LOCAL_AUTH_LOGIN_ROUTE;
  }

  // Data
  @computed get isLoggedIn(): boolean {
    const useAgentFlowAuth = process.env.USE_AGENT_FLOW_AUTH === 'true';

    if (useAgentFlowAuth) {
      // Agent Flow 模式：检查 agentFlowToken 和 API_KEY
      const agentFlowToken = getAccessToken();
      const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
      return Boolean(agentFlowToken && apiKey);
    }

    // 其他模式：检查 authToken (Local Server JWT)
    return Boolean(localStorage.getItem('authToken'));
  }

  @computed get isTokenExpired(): boolean {
    if (!this.authToken) return false;
    // Non-JWT tokens (e.g., WA-AKG placeholder authToken) don't expire
    // _parseToken would call _logout() on parse failure which destroys state
    if (!this.authToken.includes('.')) return false;
    const parsedToken = this._parseToken(this.authToken);

    return (
      parsedToken !== false &&
      this.authToken !== null &&
      moment(parsedToken.tokenExpiry).isBefore(moment())
    );
  }

  @computed get data() {
    if (!this.isLoggedIn) return {};

    const useAgentFlowAuth = process.env.USE_AGENT_FLOW_AUTH === 'true';

    // Agent Flow 模式：不请求新 token（由后端管理）
    if (!useAgentFlowAuth) {
      const newTokenNeeded = this._shouldRequestNewToken(this.authToken);
      if (newTokenNeeded) {
        this._requestNewToken();
      }
    }

    return this.getUserInfoRequest.execute().result || {};
  }

  @computed get team(): any {
    return this.data.team || null;
  }

  // Actions
  @action async _login({ email, password }): Promise<void> {
    const authToken = await this.loginRequest.execute(email, password).promise;
    this._setUserData(authToken);

    authManager.authenticate({ email, password }).catch((error: unknown) => {
      debug('AuthManager.authenticate failed: %O', error);
    });

    // Don't push('/') here — _requireAuthenticatedUser reaction handles
    // the correct redirect (including local auth login check).
  }

  @action _tokenLogin(authToken: string): void {
    this._setUserData(authToken);

    // Don't push('/') here — _requireAuthenticatedUser reaction handles
    // the correct redirect (including local auth login check).
  }

  @action async _signup({
    firstname,
    lastname,
    email,
    password,
    accountType,
    company,
    plan,
    currency,
  }): Promise<void> {
    // TODO: [TS DEBT] Need to find a way proper to implement promise's then and catch in request class
    // @ts-expect-error Fix me
    const authToken = await this.signupRequest.execute({
      firstname,
      lastname,
      email,
      password,
      accountType,
      company,
      locale: this.stores.app.locale,
      plan,
      currency,
    });

    this.hasCompletedSignup = true;

    this._setUserData(authToken);

    this.stores.router.push(this.SETUP_ROUTE);
  }

  @action async _retrievePassword({ email }): Promise<void> {
    const request = this.passwordRequest.execute(email);

    await request.promise;
    this.actionStatus = request.result.status || [];
  }

  @action async _invite({ invites }): Promise<void> {
    const data = invites.filter(invite => invite.email !== '');

    const response = await this.inviteRequest.execute(data).promise;

    this.actionStatus = response.status || [];

    // we do not wait for a server response before redirecting the user ONLY DURING SIGNUP
    if (this.stores.router.location.pathname.includes(this.INVITE_ROUTE)) {
      this.stores.router.push(this.HOME_ROUTE);
    }
  }

  @action async _update({ userData }): Promise<void> {
    if (!this.isLoggedIn) return;

    const response = await this.updateUserInfoRequest.execute(userData).promise;

    this.getUserInfoRequest.patch(() => response.data);
    this.actionStatus = response.status || [];
  }

  @action _resetStatus(): void {
    this.actionStatus = [];
  }

  @action async _logout(): Promise<void> {
    authManager.logout().catch((error: unknown) => {
      debug('AuthManager.logout failed: %O', error);
    });

    this.isLoggingOut = false;

    const useAgentFlowAuth = process.env.USE_AGENT_FLOW_AUTH === 'true';

    // 清除所有登录态
    // authToken 专门用于 Local Server JWT，在所有模式下都要清除
    localStorage.removeItem('authToken');
    window.localStorage.removeItem('authToken');
    this.authToken = null;

    // Agent Flow 模式：额外清除 agentFlowToken
    if (useAgentFlowAuth) {
      clearAccessToken();
    }

    localStorage.removeItem(API_KEY_STORAGE_KEY);
    window.localStorage.removeItem(API_KEY_STORAGE_KEY);

    this.profileEmail = null;
    this.profileUserId = null;

    // 清除后再保存 profile 快照（此时快照中不包含登录态）
    saveLocalStorageProfile(localStorage.getItem(WA_USER_EMAIL_STORAGE_KEY));

    // 最后清除用户身份标识
    localStorage.removeItem(WA_USER_EMAIL_STORAGE_KEY);
    window.localStorage.removeItem(WA_USER_EMAIL_STORAGE_KEY);
    localStorage.removeItem(WA_USER_ID_STORAGE_KEY);
    window.localStorage.removeItem(WA_USER_ID_STORAGE_KEY);

    this.getUserInfoRequest.invalidate().reset();

    this.stores.services.allServicesRequest.invalidate().reset();

    if (this.stores.todos.isTodosEnabled) {
      ipcRenderer.send('clear-storage-data', { sessionId: TODOS_PARTITION_ID });
    }

    // 退出后触发应用重启（确保下次登录时状态干净）
    if (process.env.FERDIUM_SERVER === 'local') {
      try {
        await ipcRenderer.invoke('relaunchForProfile');
      } catch (error) {
        debug('Failed to relaunch app: %O', error);
      }
    }
  }

  @action async _importLegacyServices({ services }): Promise<void> {
    this.isImportLegacyServicesExecuting = true;

    // Reduces recipe duplicates
    const recipes = services
      .filter(
        (obj, pos, arr) =>
          arr.map(mapObj => mapObj.recipe.id).indexOf(obj.recipe.id) === pos,
      )
      .map(s => s.recipe.id);

    // Install recipes
    for (const recipe of recipes) {
      // eslint-disable-next-line no-await-in-loop
      await this.stores.recipes._install({ recipeId: recipe });
    }

    for (const service of services) {
      this.actions.service.createFromLegacyService({
        data: service,
      });
      // eslint-disable-next-line no-await-in-loop
      await this.stores.services.createServiceRequest.promise;
    }

    this.isImportLegacyServicesExecuting = false;
    this.isImportLegacyServicesCompleted = true;
  }

  @action async _delete(): Promise<void> {
    this.deleteAccountRequest.execute();
  }

  _requireAuthenticatedUser = (): void => {
    if (!this.stores?.router) return;

    const { router } = this.stores;
    const route = router.location.pathname;
    const useAgentFlowAuth = process.env.USE_AGENT_FLOW_AUTH === 'true';
    const agentFlowToken = getAccessToken();
    const hasAgentFlowToken = Boolean(agentFlowToken);
    const hasWaAkgKey = Boolean(
      window.localStorage.getItem(API_KEY_STORAGE_KEY),
    );

    if (process.env.FERDIUM_SERVER === 'local') {
      if (useAgentFlowAuth && !hasAgentFlowToken) {
        if (route !== this.LOGIN_ROUTE) {
          router.push(this.LOGIN_ROUTE);
        }
        return;
      }

      if (!hasWaAkgKey) {
        if (!route.includes(this.LOCAL_AUTH_LOGIN_ROUTE)) {
          router.push(this.LOCAL_AUTH_LOGIN_ROUTE);
        }
      } else if (route.includes(this.LOCAL_AUTH_LOGIN_ROUTE)) {
        router.push(this.HOME_ROUTE);
      }
      return;
    }

    // ── 以下在 Agent Flow CS 模式或云端模式执行 ──
    const onLogout = route === this.LOGOUT_ROUTE;

    if (this.isTokenExpired) {
      this._logout();
      return;
    }

    if (onLogout) {
      if (hasAgentFlowToken) {
        this.actions.user.logout();
      }
      // Agent Flow 模式：跳转到 LOGIN_ROUTE
      if (route !== this.LOGIN_ROUTE) {
        router.push(this.LOGIN_ROUTE);
      }
      return;
    }

    if (!hasAgentFlowToken) {
      // Agent Flow CS 模式：直接跳转登录页，不需要 welcome 页
      if (route !== this.LOGIN_ROUTE) {
        router.push(this.LOGIN_ROUTE);
      }
      return;
    }

    if (!hasWaAkgKey) {
      if (!route.includes(this.LOCAL_AUTH_LOGIN_ROUTE)) {
        router.push(this.LOCAL_AUTH_LOGIN_ROUTE);
      }
      return;
    }

    if (route !== this.HOME_ROUTE) {
      router.push(this.HOME_ROUTE);
    }
  };

  // Reactions
  async _getUserData(): Promise<void> {
    if (this.isLoggedIn) {
      let data;
      try {
        data = await this.getUserInfoRequest.execute().promise;
      } catch {
        return;
      }

      // We need to set the beta flag for the SettingsStore
      this.actions.settings.update({
        type: 'app',
        data: {
          beta: data.beta,
          locale: data.locale || DEFAULT_APP_SETTINGS.locale,
        },
      });
    }
  }

  // Helpers
  _shouldRequestNewToken(authToken): boolean {
    try {
      const decoded = jwt.decode(authToken);
      if (!decoded) {
        throw new Error('Invalid token');
      }

      if (decoded.uid) {
        return true;
      }

      return false;
    } catch {
      return true;
    }
  }

  _requestNewToken(): void {
    try {
      const data = this.requestNewTokenRequest.execute().result;
      if (data) {
        this.authToken = data.token;
        localStorage.setItem('authToken', data.token);
      }
    } catch {
      // Token refresh failed (e.g., local server doesn't support /me/newtoken)
      // This is expected for local server mode
    }
  }

  _parseToken(authToken) {
    try {
      const decoded = jwt.decode(authToken);

      return {
        id: decoded.userId,
        tokenExpiry: moment.unix(decoded.exp).toISOString(),
        authToken,
      };
    } catch {
      this._logout();
      return false;
    }
  }

  @action _setUserData(authToken: any): void {
    const data = this._parseToken(authToken);
    if (data !== false && data.authToken) {
      localStorage.setItem('authToken', data.authToken);

      this.authToken = data.authToken;
      this.id = data.id;
    } else {
      this.authToken = null;
      this.id = null;
    }
  }

  @action setProfileEmail(email: string | null): void {
    this.profileEmail = email;
    if (email) {
      localStorage.setItem(WA_USER_EMAIL_STORAGE_KEY, email);
    } else {
      localStorage.removeItem(WA_USER_EMAIL_STORAGE_KEY);
    }
  }

  @action setProfileUserId(userId: string | null): void {
    this.profileUserId = userId;
    if (userId) {
      localStorage.setItem(WA_USER_ID_STORAGE_KEY, userId);
    } else {
      localStorage.removeItem(WA_USER_ID_STORAGE_KEY);
    }
  }

  getAuthURL(url: string): string {
    const parsedUrl = new URL(url);
    const params = new URLSearchParams(parsedUrl.search.slice(1));

    // TODO: Remove the necessity for `as string`
    params.append('authToken', this.authToken!);

    return `${parsedUrl.origin}${parsedUrl.pathname}?${params.toString()}`;
  }

  async _migrateUserLocale(): Promise<void> {
    try {
      await this.getUserInfoRequest.promise;
    } catch {
      return;
    }

    if (!this.data.locale) {
      debug('Migrate "locale" to user data');
      this.actions.user.update({
        userData: {
          locale: this.stores.app.locale,
        },
      });
    }
  }
}
