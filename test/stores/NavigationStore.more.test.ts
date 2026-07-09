import { navigationStore } from '../../src/stores/NavigationStore';

describe('NavigationStore - additional module isolation cases', () => {
  const snapshot = () => ({
    activeModule: navigationStore.activeModule,
    activeServiceTab: navigationStore.activeServiceTab,
    activeHomeView: navigationStore.activeHomeView,
    activeStrategyTab: navigationStore.activeStrategyTab,
    moduleActiveService: { ...navigationStore.moduleActiveService },
    moduleServiceTab: { ...navigationStore.moduleServiceTab },
    moduleCollapsed: { ...navigationStore.moduleCollapsed },
  });

  const restore = (snap: ReturnType<typeof snapshot>) => {
    navigationStore.setModule(snap.activeModule);
    navigationStore.setHomeView(snap.activeHomeView);
    navigationStore.setStrategyTab(snap.activeStrategyTab);

    for (const [module, value] of Object.entries(snap.moduleActiveService)) {
      navigationStore.setModuleActiveService(
        module as any,
        value as string | null,
      );
    }

    for (const [module, value] of Object.entries(snap.moduleServiceTab)) {
      navigationStore.moduleServiceTab[
        module as keyof typeof navigationStore.moduleServiceTab
      ] = value as any;
    }

    for (const [module, value] of Object.entries(snap.moduleCollapsed)) {
      navigationStore.moduleCollapsed[
        module as keyof typeof navigationStore.moduleCollapsed
      ] = value as boolean;
    }

    navigationStore.activeServiceTab = snap.activeServiceTab;
  };

  let snap: ReturnType<typeof snapshot>;

  beforeEach(() => {
    snap = snapshot();
  });

  afterEach(() => {
    restore(snap);
  });

  it('restores stored tab when switching back and forth across modules multiple times', () => {
    navigationStore.setModule('telegram');
    navigationStore.setServiceTab('profile');
    navigationStore.setModule('whatsapp');
    navigationStore.setServiceTab('account');
    navigationStore.setModule('knowledge-base');

    navigationStore.setModule('telegram');
    expect(navigationStore.activeServiceTab).toBe('profile');

    navigationStore.setModule('whatsapp');
    expect(navigationStore.activeServiceTab).toBe('account');
  });

  it('keeps moduleCollapsed isolated between whatsapp and telegram', () => {
    navigationStore.toggleModuleCollapsed('whatsapp');

    expect(navigationStore.moduleCollapsed.whatsapp).toBe(true);
    expect(navigationStore.moduleCollapsed.telegram).toBe(false);

    navigationStore.toggleModuleCollapsed('telegram');

    expect(navigationStore.moduleCollapsed.whatsapp).toBe(true);
    expect(navigationStore.moduleCollapsed.telegram).toBe(true);
  });

  it('keeps moduleActiveService isolated between whatsapp and telegram', () => {
    navigationStore.setModuleActiveService('whatsapp', 'wa-1');
    navigationStore.setModuleActiveService('telegram', 'tg-1');
    navigationStore.setModuleActiveService('knowledge-base', 'kb-1');

    expect(navigationStore.moduleActiveService.whatsapp).toBe('wa-1');
    expect(navigationStore.moduleActiveService.telegram).toBe('tg-1');
    expect(navigationStore.moduleActiveService['knowledge-base']).toBe('kb-1');
  });
});
