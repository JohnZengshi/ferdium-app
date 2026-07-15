import { runInAction } from 'mobx';
import {
  type FerdiumModule,
  navigationStore,
} from '../../src/stores/NavigationStore';

function snapshot(s: typeof navigationStore): Record<string, unknown> {
  return {
    activeModule: s.activeModule,
    activeServiceTab: s.activeServiceTab,
    moduleActiveService: { ...s.moduleActiveService },
    moduleServiceTab: { ...s.moduleServiceTab },
    moduleCollapsed: { ...s.moduleCollapsed },
  };
}

function resetSnapshot(
  s: typeof navigationStore,
  snap: Record<string, unknown>,
): void {
  runInAction(() => {
    /* eslint-disable no-param-reassign */
    (s as any).activeModule = snap.activeModule;
    (s as any).activeServiceTab = snap.activeServiceTab;
    /* eslint-enable no-param-reassign */
    Object.assign(s.moduleActiveService, snap.moduleActiveService);
    Object.assign(s.moduleServiceTab, snap.moduleServiceTab);
    Object.assign(s.moduleCollapsed, snap.moduleCollapsed);
  });
}

describe('NavigationStore - FerdiumModule "whatsapp" / "telegram"', () => {
  let snap: Record<string, unknown>;

  beforeEach(() => {
    snap = snapshot(navigationStore);
  });

  afterEach(() => {
    resetSnapshot(navigationStore, snap);
  });

  it('defaults activeModule to home', () => {
    expect(navigationStore.activeModule).toBe('home');
  });

  it('defaults activeServiceTab to messages', () => {
    expect(navigationStore.activeServiceTab).toBe('messages');
  });

  describe('setModule', () => {
    it('updates activeModule and restores moduleServiceTab', () => {
      navigationStore.setServiceTab('account');
      expect(navigationStore.moduleServiceTab['home']).toBe('account');

      navigationStore.setModule('telegram');
      expect(navigationStore.activeModule).toBe('telegram');
      expect(navigationStore.activeServiceTab).toBe('messages');
    });

    it('preserves each module own remembered tab', () => {
      navigationStore.setModule('telegram');
      navigationStore.setServiceTab('profile');
      navigationStore.setModule('whatsapp');
      navigationStore.setServiceTab('account');

      navigationStore.setModule('telegram');
      expect(navigationStore.activeServiceTab).toBe('profile');
    });
  });

  describe('moduleActiveService', () => {
    it('starts null for every module', () => {
      const modules: FerdiumModule[] = [
        'home',
        'whatsapp',
        'telegram',
        'knowledge-base',
        'settings',
      ];
      for (const m of modules) {
        expect(navigationStore.moduleActiveService[m]).toBeNull();
      }
    });

    it('setModuleActiveService stores per module and isolates', () => {
      navigationStore.setModuleActiveService('whatsapp', 'wa-id-1');
      navigationStore.setModuleActiveService('telegram', 'tg-id-1');

      expect(navigationStore.moduleActiveService['whatsapp']).toBe('wa-id-1');
      expect(navigationStore.moduleActiveService['telegram']).toBe('tg-id-1');
    });

    it('setModuleActiveService with null clears', () => {
      navigationStore.setModuleActiveService('telegram', 'some-id');
      navigationStore.setModuleActiveService('telegram', null);

      expect(navigationStore.moduleActiveService['telegram']).toBeNull();
    });
  });

  describe('moduleCollapsed', () => {
    it('starts false for all modules', () => {
      const modules: FerdiumModule[] = [
        'home',
        'whatsapp',
        'telegram',
        'knowledge-base',
        'settings',
      ];
      for (const m of modules) {
        expect(navigationStore.moduleCollapsed[m]).toBe(false);
      }
    });

    it('toggleModuleCollapsed flips the given module only', () => {
      navigationStore.toggleModuleCollapsed('telegram');
      expect(navigationStore.moduleCollapsed['telegram']).toBe(true);
      expect(navigationStore.moduleCollapsed['whatsapp']).toBe(false);

      navigationStore.toggleModuleCollapsed('telegram');
      expect(navigationStore.moduleCollapsed['telegram']).toBe(false);
    });
  });

  describe('setHomeView / setStrategyTab', () => {
    it('setHomeView updates activeHomeView', () => {
      navigationStore.setHomeView('strategy');
      expect(navigationStore.activeHomeView).toBe('strategy');
    });

    it('setStrategyTab updates activeStrategyTab', () => {
      navigationStore.setStrategyTab('security');
      expect(navigationStore.activeStrategyTab).toBe('security');
    });
  });
});
