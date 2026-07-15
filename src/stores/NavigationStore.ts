import { action, makeObservable, observable } from 'mobx';

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
