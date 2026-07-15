import type { RouterStore } from '@superwf/mobx-react-router';
import type { Actions } from '../actions/lib/actions';
import type { ApiInterface } from '../api';
import { communityRecipesStore } from '../features/communityRecipes';
import { customerProfileStore } from '../features/customerProfile';
import { telegramAutomationStore } from '../features/telegramAutomation';
import { todosStore } from '../features/todos';
import { whatsappAutomationStore } from '../features/whatsappAutomation';
import { workspaceStore } from '../features/workspaces';
import AppStore from './AppStore';
import DigitalHumanStore from './DigitalHumanStore';
import FeaturesStore from './FeaturesStore';
import GlobalErrorStore from './GlobalErrorStore';
import HandoffStore from './HandoffStore';
import RecipePreviewsStore from './RecipePreviewsStore';
import RecipesStore from './RecipesStore';
import RequestStore from './RequestStore';
import ServicesStore from './ServicesStore';
import SettingsStore from './SettingsStore';
import UIStore from './UIStore';
import UserStore from './UserStore';

export interface RealStores {
  router: RouterStore;
  app: AppStore;
  user: UserStore;
  features: FeaturesStore;
  settings: SettingsStore;
  services: ServicesStore;
  recipes: RecipesStore;
  recipePreviews: RecipePreviewsStore;
  ui: UIStore;
  requests: RequestStore;
  globalError: GlobalErrorStore;
  workspaces: typeof workspaceStore;
  communityRecipes: typeof communityRecipesStore;
  todos: typeof todosStore;
  whatsappAutomation: typeof whatsappAutomationStore;
  telegramAutomation: typeof telegramAutomationStore;
  customerProfile: typeof customerProfileStore;
  digitalHuman: DigitalHumanStore;
  handoff: HandoffStore;
}

export default (
  api: ApiInterface,
  actions: Actions,
  router: RouterStore,
): RealStores => {
  const stores: RealStores | any = {};
  Object.assign(stores, {
    router,
    app: new AppStore(stores, api, actions),
    user: new UserStore(stores, api, actions),
    features: new FeaturesStore(stores, api, actions),
    settings: new SettingsStore(stores, api, actions),
    services: new ServicesStore(stores, api, actions),
    recipes: new RecipesStore(stores, api, actions),
    recipePreviews: new RecipePreviewsStore(stores, api, actions),
    ui: new UIStore(stores, api, actions),
    requests: new RequestStore(stores, api, actions),
    globalError: new GlobalErrorStore(stores, api, actions),
    workspaces: workspaceStore,
    communityRecipes: communityRecipesStore,
    todos: todosStore,
    whatsappAutomation: whatsappAutomationStore,
    telegramAutomation: telegramAutomationStore,
    customerProfile: customerProfileStore,
    digitalHuman: new DigitalHumanStore(stores, api, actions),
    handoff: new HandoffStore(stores, api, actions),
  });

  // Initialize all stores
  for (const name of Object.keys(stores)) {
    if (stores[name]?.initialize) {
      stores[name].initialize();
    }
  }

  return stores;
};
