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

function createStoreWithServices(services: MockService[]) {
  const store = new ServicesStore(
    createStores() as any,
    {} as any,
    createActions() as any,
  );
  (store as any).allServicesRequest = {
    execute: () => ({ result: services }),
  };
  return store;
}

describe('ServicesStore – edge cases', () => {
  it('both filters return empty when no services', () => {
    const store = createStoreWithServices([]);

    expect(store.whatsAppServices).toEqual([]);
    expect(store.telegramServices).toEqual([]);
  });

  it('excludes services with undefined recipe.id from both filters', () => {
    const store = createStoreWithServices([
      {
        ...createService('svc-1', WHATSAPP_RECIPE_ID),
        recipe: { id: WHATSAPP_RECIPE_ID },
      },
      {
        id: 'svc-2',
        recipe: { id: 'other' } as any,
        isEnabled: true,
        isBadgeEnabled: true,
        isNotificationEnabled: true,
        isIndirectMessageBadgeEnabled: true,
        unreadDirectMessageCount: 0,
        unreadIndirectMessageCount: 0,
      },
      {
        id: 'svc-3',
        recipe: { id: 'other-2' } as any,
        isEnabled: true,
        isBadgeEnabled: true,
        isNotificationEnabled: true,
        isIndirectMessageBadgeEnabled: true,
        unreadDirectMessageCount: 0,
        unreadIndirectMessageCount: 0,
      },
    ] as any);

    expect(store.whatsAppServices).toHaveLength(1);
    expect(store.whatsAppServices[0].id).toBe('svc-1');
    expect(store.telegramServices).toEqual([]);
  });

  it('getBadgeCount returns null when all services have zero unread', () => {
    const store = createStoreWithServices([]);
    const services = [
      createService('s1', WHATSAPP_RECIPE_ID),
      createService('s2', WHATSAPP_RECIPE_ID),
    ];

    expect(store.getBadgeCount(services as any)).toBeNull();
  });

  it('mainModuleBadge returns null when no whatsapp services exist', () => {
    const store = createStoreWithServices([
      createService('tg-1', TELEGRAM_RECIPE_ID),
    ]);

    expect(store.mainModuleBadge).toBeNull();
  });

  it('telegramBadge returns null when no telegram services exist', () => {
    const store = createStoreWithServices([
      createService('wa-1', WHATSAPP_RECIPE_ID),
    ]);

    expect(store.telegramBadge).toBeNull();
  });
});
