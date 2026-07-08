import { TELEGRAM_RECIPE_ID } from '../../src/config';
import { WHATSAPP_RECIPE_ID } from '../../src/features/whatsappAutomation/constants';
import ServicesStore from '../../src/stores/ServicesStore';

jest.mock('../../src/features/workspaces', () => ({
  workspaceStore: {
    filterServicesByActiveWorkspace: jest.fn((services: unknown[]) => services),
  },
}));

type MockService = {
  id: string;
  recipe: { id: string; name?: string };
  isEnabled: boolean;
  isBadgeEnabled: boolean;
  isNotificationEnabled: boolean;
  isIndirectMessageBadgeEnabled: boolean;
  unreadDirectMessageCount: number;
  unreadIndirectMessageCount: number;
};

function createActionEvent() {
  return { listen: jest.fn() };
}

function createActions() {
  const service = {
    setActive: createActionEvent(),
    blurActive: createActionEvent(),
    setActiveNext: createActionEvent(),
    setActivePrev: createActionEvent(),
    showAddServiceInterface: createActionEvent(),
    createService: createActionEvent(),
    createFromLegacyService: createActionEvent(),
    updateService: createActionEvent(),
    deleteService: createActionEvent(),
    openRecipeFile: createActionEvent(),
    clearCache: createActionEvent(),
    setWebviewReference: createActionEvent(),
    detachService: createActionEvent(),
    focusService: createActionEvent(),
    focusActiveService: createActionEvent(),
    toggleService: createActionEvent(),
    handleIPCMessage: createActionEvent(),
    sendIPCMessage: createActionEvent(),
    sendIPCMessageToAllServices: createActionEvent(),
    setUnreadMessageCount: createActionEvent(),
    setDialogTitle: createActionEvent(),
    openWindow: createActionEvent(),
    filter: createActionEvent(),
    resetFilter: createActionEvent(),
    resetStatus: createActionEvent(),
    reload: createActionEvent(),
    reloadActive: createActionEvent(),
    reloadAll: createActionEvent(),
    reloadUpdatedServices: createActionEvent(),
    reorder: createActionEvent(),
    toggleNotifications: createActionEvent(),
    toggleAudio: createActionEvent(),
    toggleDarkMode: createActionEvent(),
    openDevTools: createActionEvent(),
    openDevToolsForActiveService: createActionEvent(),
    hibernate: createActionEvent(),
    awake: createActionEvent(),
    resetLastPollTimer: createActionEvent(),
    shareSettingsWithServiceProcess: createActionEvent(),
  };

  return { service };
}

function createStores() {
  return {
    settings: {
      all: {
        app: {
          showDisabledServices: false,
          showMessageBadgeWhenMuted: false,
        },
      },
    },
    ui: {
      showMessageBadgesEvenWhenMuted: true,
    },
    user: {
      isLoggedIn: true,
    },
    workspaces: {
      settings: {
        keepAllWorkspacesLoaded: false,
      },
    },
  };
}

function createService(
  id: string,
  recipeId: string,
  enabled = true,
): MockService {
  return {
    id,
    recipe: { id: recipeId, name: recipeId },
    isEnabled: enabled,
    isBadgeEnabled: true,
    isNotificationEnabled: true,
    isIndirectMessageBadgeEnabled: true,
    unreadDirectMessageCount: 0,
    unreadIndirectMessageCount: 0,
  };
}

describe('ServicesStore module filters', () => {
  function createStoreWithServices(services: MockService[]) {
    const store = new ServicesStore(
      createStores() as any,
      {} as any,
      createActions() as any,
    );
    // Override allServicesRequest to return mock services
    (store as any).allServicesRequest = {
      execute: () => ({
        result: services,
      }),
    };
    return store;
  }

  it('telegramServices returns only telegram recipe services', () => {
    const store = createStoreWithServices([
      createService('wa-1', WHATSAPP_RECIPE_ID),
      createService('tg-1', TELEGRAM_RECIPE_ID),
      createService('kb-1', 'knowledge-base'),
      createService('tg-2', TELEGRAM_RECIPE_ID),
    ]);

    expect(store.telegramServices.map(service => service.id)).toEqual([
      'tg-1',
      'tg-2',
    ]);
  });

  it('whatsAppServices returns only whatsapp recipe services', () => {
    const store = createStoreWithServices([
      createService('wa-1', WHATSAPP_RECIPE_ID),
      createService('tg-1', TELEGRAM_RECIPE_ID),
      createService('wa-2', WHATSAPP_RECIPE_ID),
    ]);

    expect(store.whatsAppServices.map(service => service.id)).toEqual([
      'wa-1',
      'wa-2',
    ]);
  });

  it('filters out disabled services when showDisabledServices is false', () => {
    const store = createStoreWithServices([
      createService('wa-1', WHATSAPP_RECIPE_ID, true),
      createService('wa-2', WHATSAPP_RECIPE_ID, false),
      createService('tg-1', TELEGRAM_RECIPE_ID, false),
    ]);

    expect(store.whatsAppServices.map(service => service.id)).toEqual(['wa-1']);
    expect(store.telegramServices).toEqual([]);
  });

  it('mainModuleBadge uses whatsapp services only and telegramBadge uses telegram only', () => {
    const store = createStoreWithServices([
      {
        ...createService('wa-1', WHATSAPP_RECIPE_ID, true),
        unreadDirectMessageCount: 3,
      },
      {
        ...createService('tg-1', TELEGRAM_RECIPE_ID, true),
        unreadDirectMessageCount: 5,
      },
    ]);

    expect(store.mainModuleBadge).toBe(3);
    expect(store.telegramBadge).toBe(5);
  });
});
