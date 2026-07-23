import { action, makeObservable, observable } from 'mobx';

const MODULE_COLLAPSED_STORAGE_KEY = 'ferdium.moduleCollapsed';

export type FerdiumModule =
  | 'home'
  | 'whatsapp'
  | 'telegram'
  | 'tiktok'
  | 'instagramDM'
  | 'knowledge-base'
  | 'settings';
export type ServiceSubTab = 'messages' | 'account' | 'profile';
export type HomeViewMode = 'dashboard' | 'strategy';
export type StrategyConfigTab =
  | 'resume'
  | 'security'
  | 'handover'
  | 'notifications';

class NavigationStore {
  @observable activeModule: FerdiumModule = 'home';

  @observable activeServiceTab: ServiceSubTab = 'messages';

  @observable activeHomeView: HomeViewMode = 'dashboard';

  @observable activeStrategyTab: StrategyConfigTab = 'resume';

  @observable moduleActiveService: Record<FerdiumModule, string | null> = {
    home: null,
    whatsapp: null,
    telegram: null,
    tiktok: null,
    instagramDM: null,
    'knowledge-base': null,
    settings: null,
  };

  @observable moduleActiveServiceTab: Record<FerdiumModule, ServiceSubTab> = {
    home: 'messages',
    whatsapp: 'messages',
    telegram: 'messages',
    tiktok: 'messages',
    instagramDM: 'messages',
    'knowledge-base': 'messages',
    settings: 'messages',
  };

  @observable moduleServiceTab: Record<FerdiumModule, ServiceSubTab> = {
    home: 'messages',
    whatsapp: 'messages',
    telegram: 'messages',
    tiktok: 'messages',
    instagramDM: 'messages',
    'knowledge-base': 'messages',
    settings: 'messages',
  };

  @observable moduleSidebarOpen: Record<FerdiumModule, boolean> = {
    home: false,
    whatsapp: false,
    telegram: false,
    tiktok: false,
    instagramDM: false,
    'knowledge-base': false,
    settings: false,
  };

  @observable moduleCollapsed: Record<FerdiumModule, boolean> = {
    home: false,
    whatsapp: false,
    telegram: false,
    tiktok: false,
    instagramDM: false,
    'knowledge-base': false,
    settings: false,
  };

  constructor() {
    makeObservable(this);
    this.restoreModuleCollapsed();
  }

  restoreModuleCollapsed() {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(MODULE_COLLAPSED_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<
        Record<FerdiumModule, boolean>
      >;
      for (const module of Object.keys(
        this.moduleCollapsed,
      ) as FerdiumModule[]) {
        const collapsed = parsed[module];
        if (typeof collapsed === 'boolean') {
          this.moduleCollapsed[module] = collapsed;
        }
      }
    } catch {
      window.localStorage.removeItem(MODULE_COLLAPSED_STORAGE_KEY);
    }
  }

  persistModuleCollapsed() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        MODULE_COLLAPSED_STORAGE_KEY,
        JSON.stringify(this.moduleCollapsed),
      );
    } catch {
      // Keep the in-memory state when storage is unavailable.
    }
  }

  @action
  setModule(module: FerdiumModule) {
    this.activeModule = module;
    this.activeServiceTab = this.moduleServiceTab[module] ?? 'messages';
  }

  @action
  setModuleActiveService(module: FerdiumModule, serviceId: string | null) {
    this.moduleActiveService[module] = serviceId;
  }

  @action
  setServiceTab(tab: ServiceSubTab) {
    this.moduleServiceTab[this.activeModule] = tab;
    this.activeServiceTab = tab;
  }

  @action
  toggleModuleCollapsed(module: FerdiumModule) {
    this.moduleCollapsed[module] = !this.moduleCollapsed[module];
    this.persistModuleCollapsed();
  }

  @action
  setHomeView(view: HomeViewMode) {
    this.activeHomeView = view;
  }

  @action
  setStrategyTab(tab: StrategyConfigTab) {
    this.activeStrategyTab = tab;
  }
}

export const navigationStore = new NavigationStore();
