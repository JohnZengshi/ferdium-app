import { action, makeObservable, observable } from 'mobx';

export type FerdiumModule =
  | 'home'
  | 'service-type'
  | 'knowledge-base'
  | 'settings';
export type ServiceSubTab = 'messages' | 'account' | 'profile';

class NavigationStore {
  @observable activeModule: FerdiumModule = 'service-type';

  @observable activeServiceTab: ServiceSubTab = 'messages';

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
}

export const navigationStore = new NavigationStore();
