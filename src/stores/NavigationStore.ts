import { action, makeObservable, observable } from 'mobx';

export type FerdiumModule =
  | 'home'
  | 'service-type'
  | 'knowledge-base'
  | 'settings';
export type ServiceSubTab = 'messages' | 'account' | 'profile';
export type HomeViewMode = 'dashboard' | 'strategy';
export type StrategyConfigTab = 'resume' | 'security' | 'handover' | 'notifications';

class NavigationStore {
  @observable activeModule: FerdiumModule = 'service-type';

  @observable activeServiceTab: ServiceSubTab = 'messages';

  @observable activeHomeView: HomeViewMode = 'dashboard';

  @observable activeStrategyTab: StrategyConfigTab = 'resume';

  constructor() {
    makeObservable(this);
  }

  @action
  setModule(module: FerdiumModule) {
    this.activeModule = module;
  }

  @action
  setServiceTab(tab: ServiceSubTab) {
    this.activeServiceTab = tab;
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
