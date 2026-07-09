import ServicesStore from '../../src/stores/ServicesStore';

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

function createStores(overrides?: Partial<any>) {
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
    workspaces: {},
    ...overrides,
  };
}

function createService(overrides?: Partial<MockService>): MockService {
  return {
    id: 'service-1',
    recipe: { id: 'whatsapp', name: 'WhatsApp' },
    isEnabled: true,
    isBadgeEnabled: true,
    isNotificationEnabled: true,
    isIndirectMessageBadgeEnabled: true,
    unreadDirectMessageCount: 0,
    unreadIndirectMessageCount: 0,
    ...overrides,
  };
}

describe('ServicesStore badge calculations', () => {
  function createStore() {
    return new ServicesStore(
      createStores() as any,
      {} as any,
      createActions() as any,
    );
  }

  it('returns null for empty services list', () => {
    const store = createStore();
    expect(store.getBadgeCount([] as any)).toBeNull();
  });

  it('returns null when all services have badge disabled', () => {
    const store = createStore();
    const services = [
      createService({ unreadDirectMessageCount: 5, isBadgeEnabled: false }),
      createService({
        id: 'service-2',
        unreadDirectMessageCount: 3,
        isBadgeEnabled: false,
      }),
    ];

    expect(store.getBadgeCount(services as any)).toBeNull();
  });

  it('sums direct and indirect counts when badges are enabled', () => {
    const store = new ServicesStore(
      createStores({
        settings: {
          all: {
            app: {
              showDisabledServices: false,
              showMessageBadgeWhenMuted: true,
            },
          },
        },
      }) as any,
      {} as any,
      createActions() as any,
    );
    const services = [
      createService({
        unreadDirectMessageCount: 2,
        unreadIndirectMessageCount: 1,
      }),
      createService({
        id: 'service-2',
        unreadDirectMessageCount: 4,
        unreadIndirectMessageCount: 3,
      }),
    ];

    expect(store.getBadgeCount(services as any)).toBe(10);
  });

  it('ignores direct unread when notifications are disabled and muted badges are off', () => {
    const store = new ServicesStore(
      createStores({
        settings: {
          all: {
            app: {
              showDisabledServices: false,
              showMessageBadgeWhenMuted: false,
            },
          },
        },
      }) as any,
      {} as any,
      createActions() as any,
    );
    const services = [
      createService({
        unreadDirectMessageCount: 5,
        isNotificationEnabled: false,
      }),
    ];

    expect(store.getBadgeCount(services as any)).toBeNull();
  });

  it('includes direct unread when showMessageBadgeWhenMuted is enabled', () => {
    const store = new ServicesStore(
      createStores({
        settings: {
          all: {
            app: {
              showDisabledServices: false,
              showMessageBadgeWhenMuted: true,
            },
          },
        },
      }) as any,
      {} as any,
      createActions() as any,
    );
    const services = [
      createService({
        unreadDirectMessageCount: 5,
        isNotificationEnabled: false,
      }),
    ];

    expect(store.getBadgeCount(services as any)).toBe(5);
  });

  it('includes indirect unread only when muted badges and indirect badges are both enabled', () => {
    const store = new ServicesStore(
      createStores({
        settings: {
          all: {
            app: {
              showDisabledServices: false,
              showMessageBadgeWhenMuted: true,
            },
          },
        },
      }) as any,
      {} as any,
      createActions() as any,
    );
    const services = [
      createService({
        unreadIndirectMessageCount: 4,
        isIndirectMessageBadgeEnabled: true,
      }),
    ];

    expect(store.getBadgeCount(services as any)).toBe(4);
  });

  it('returns null when UI setting disables badges globally', () => {
    const store = new ServicesStore(
      createStores({
        ui: {
          showMessageBadgesEvenWhenMuted: false,
        },
      }) as any,
      {} as any,
      createActions() as any,
    );
    const services = [createService({ unreadDirectMessageCount: 9 })];

    expect(store.getBadgeCount(services as any)).toBeNull();
  });
});
