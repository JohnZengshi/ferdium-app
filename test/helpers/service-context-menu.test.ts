import { Menu, dialog, app as electronApp } from '@electron/remote';
import { clipboard } from 'electron';

import { openServiceContextMenu } from '../../src/helpers/service-context-menu';

jest.mock('@electron/remote');
jest.mock('electron');

const popup = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (Menu.buildFromTemplate as jest.Mock).mockReturnValue({ popup });
  (dialog.showMessageBoxSync as jest.Mock).mockReturnValue(0);
});

describe('openServiceContextMenu', () => {
  const createService = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 'service-1',
      name: 'Telegram 1',
      recipe: { name: 'Telegram' },
      isNotificationEnabled: true,
      isMuted: false,
      isDarkModeEnabled: false,
      isEnabled: true,
      isHibernating: false,
      ...overrides,
    }) as any;

  const createActions = () => ({
    service: {
      reload: jest.fn(),
      toggleNotifications: jest.fn(),
      toggleAudio: jest.fn(),
      toggleDarkMode: jest.fn(),
      updateService: jest.fn(),
      awake: jest.fn(),
      hibernate: jest.fn(),
      clearCache: jest.fn(),
      deleteService: jest.fn(),
    },
  });

  it('builds menu and pops it up', () => {
    const service = createService();
    const actions = createActions();

    openServiceContextMenu(
      service,
      actions as any,
      jest.fn(),
      'Service ID (service-1)',
    );

    expect(Menu.buildFromTemplate).toHaveBeenCalledTimes(1);
    expect(popup).toHaveBeenCalledTimes(1);
  });

  it('includes service title and id copy item', () => {
    const service = createService({ name: 'TG A' });
    const actions = createActions();

    openServiceContextMenu(service, actions as any, jest.fn(), 'SID service-1');

    const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    expect(t[0]).toMatchObject({ label: 'TG A', enabled: false });
    expect(t[1]).toMatchObject({ label: 'SID service-1' });
    t[1].click();
    expect(clipboard.writeText).toHaveBeenCalledWith('service-1');
  });

  it('falls back to recipe name when service name is empty', () => {
    openServiceContextMenu(
      createService({ name: '' }),
      createActions() as any,
      jest.fn(),
      'SID service-1',
    );

    const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    expect(t[0]).toMatchObject({ label: 'Telegram', enabled: false });
  });

  it('inserts extras before first separator', () => {
    const extraClick = jest.fn();
    const extra = { label: 'Copy JID', click: extraClick };

    openServiceContextMenu(
      createService(),
      createActions() as any,
      jest.fn(),
      'SID service-1',
      [extra],
    );

    const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    expect(t[2]).toBe(extra);
    expect(t[3]).toMatchObject({ type: 'separator' });
    t[2].click();
    expect(extraClick).toHaveBeenCalled();
  });

  it('runs reload action', () => {
    const actions = createActions();
    openServiceContextMenu(
      createService(),
      actions as any,
      jest.fn(),
      'SID service-1',
    );

    const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    t[3].click();
    expect(actions.service.reload).toHaveBeenCalledWith({
      serviceId: 'service-1',
    });
  });

  it('runs edit callback', () => {
    const onEdit = jest.fn();
    openServiceContextMenu(
      createService(),
      createActions() as any,
      onEdit,
      'SID service-1',
    );

    const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    t[4].click();
    expect(onEdit).toHaveBeenCalled();
  });

  it('shows disable/enable notifications label based on state', () => {
    const check = (isNotificationEnabled: boolean, expected: string) => {
      jest.clearAllMocks();
      (Menu.buildFromTemplate as jest.Mock).mockReturnValue({ popup });
      openServiceContextMenu(
        createService({ isNotificationEnabled }),
        createActions() as any,
        jest.fn(),
        'SID service-1',
      );
      const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
      expect(t[6].label).toBe(expected);
    };

    check(true, 'Disable Notifications');
    check(false, 'Enable Notifications');
  });

  it('toggles notifications', () => {
    const actions = createActions();
    openServiceContextMenu(
      createService(),
      actions as any,
      jest.fn(),
      'SID service-1',
    );

    const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    t[6].click();
    expect(actions.service.toggleNotifications).toHaveBeenCalledWith({
      serviceId: 'service-1',
    });
  });

  it('shows mute/unmute label based on state', () => {
    const check = (isMuted: boolean, expected: string) => {
      jest.clearAllMocks();
      (Menu.buildFromTemplate as jest.Mock).mockReturnValue({ popup });
      openServiceContextMenu(
        createService({ isMuted }),
        createActions() as any,
        jest.fn(),
        'SID service-1',
      );
      const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
      expect(t[7].label).toBe(expected);
    };

    check(false, 'Mute Service');
    check(true, 'Unmute Service');
  });

  it('toggles audio', () => {
    const actions = createActions();
    openServiceContextMenu(
      createService(),
      actions as any,
      jest.fn(),
      'SID service-1',
    );

    const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    t[7].click();
    expect(actions.service.toggleAudio).toHaveBeenCalledWith({
      serviceId: 'service-1',
    });
  });

  it('shows dark mode label based on state', () => {
    const check = (isDarkModeEnabled: boolean, expected: string) => {
      jest.clearAllMocks();
      (Menu.buildFromTemplate as jest.Mock).mockReturnValue({ popup });
      openServiceContextMenu(
        createService({ isDarkModeEnabled }),
        createActions() as any,
        jest.fn(),
        'SID service-1',
      );
      const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
      expect(t[8].label).toBe(expected);
    };

    check(false, 'Enable Dark Mode');
    check(true, 'Disable Dark Mode');
  });

  it('toggles dark mode', () => {
    const actions = createActions();
    openServiceContextMenu(
      createService(),
      actions as any,
      jest.fn(),
      'SID service-1',
    );

    const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    t[8].click();
    expect(actions.service.toggleDarkMode).toHaveBeenCalledWith({
      serviceId: 'service-1',
    });
  });

  it('shows enable/disable service label and toggles state', () => {
    const actions = createActions();
    openServiceContextMenu(
      createService({ isEnabled: true }),
      actions as any,
      jest.fn(),
      'SID service-1',
    );

    let t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    expect(t[10].label).toBe('Disable Service');
    t[10].click();
    expect(actions.service.updateService).toHaveBeenCalledWith({
      serviceId: 'service-1',
      serviceData: { isEnabled: false },
      redirect: false,
    });

    jest.clearAllMocks();
    (Menu.buildFromTemplate as jest.Mock).mockReturnValue({ popup });
    const disabledActions = createActions();
    openServiceContextMenu(
      createService({ isEnabled: false }),
      disabledActions as any,
      jest.fn(),
      'SID service-1',
    );
    // eslint-disable-next-line prefer-destructuring
    t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    expect(t[10].label).toBe('Enable Service');
  });

  it('shows hibernate/wake label and calls matching action', () => {
    const actions = createActions();
    openServiceContextMenu(
      createService({ isHibernating: false }),
      actions as any,
      jest.fn(),
      'SID service-1',
    );
    let t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    expect(t[11].label).toBe('Hibernate');
    t[11].click();
    expect(actions.service.hibernate).toHaveBeenCalledWith({
      serviceId: 'service-1',
    });

    jest.clearAllMocks();
    (Menu.buildFromTemplate as jest.Mock).mockReturnValue({ popup });
    const awakeActions = createActions();
    openServiceContextMenu(
      createService({ isHibernating: true }),
      awakeActions as any,
      jest.fn(),
      'SID service-1',
    );
    // eslint-disable-next-line prefer-destructuring
    t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    expect(t[11].label).toBe('Wake Up');
    t[11].click();
    expect(awakeActions.service.awake).toHaveBeenCalledWith({
      serviceId: 'service-1',
    });
  });

  it('clears cache', () => {
    const actions = createActions();
    openServiceContextMenu(
      createService(),
      actions as any,
      jest.fn(),
      'SID service-1',
    );

    const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    t[12].click();
    expect(actions.service.clearCache).toHaveBeenCalledWith({
      serviceId: 'service-1',
    });
  });

  it('opens delete confirm and deletes on Yes', () => {
    const actions = createActions();
    openServiceContextMenu(
      createService(),
      actions as any,
      jest.fn(),
      'SID service-1',
    );

    const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    t[14].click();

    expect(dialog.showMessageBoxSync).toHaveBeenCalledWith(
      (electronApp as any).mainWindow,
      {
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Confirm',
        message: 'Are you sure you want to delete Telegram 1?',
      },
    );
    expect(actions.service.deleteService).toHaveBeenCalledWith({
      serviceId: 'service-1',
    });
  });

  it('does not delete when confirm returns No', () => {
    const actions = createActions();
    (dialog.showMessageBoxSync as jest.Mock).mockReturnValue(1);

    openServiceContextMenu(
      createService(),
      actions as any,
      jest.fn(),
      'SID service-1',
    );

    const t = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0];
    t[14].click();
    expect(actions.service.deleteService).not.toHaveBeenCalled();
  });
});
