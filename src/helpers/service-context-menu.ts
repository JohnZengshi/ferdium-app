import { Menu, dialog, app as electronApp } from '@electron/remote';
import { clipboard } from 'electron';

import type { Actions } from '../actions/lib/actions';
import type Service from '../models/Service';

export function openServiceContextMenu(
  service: Service,
  actions: Actions | undefined,
  onEdit: () => void,
  idLabel: string,
  extras?: any[],
): void {
  const template: any[] = [
    { label: service.name || service.recipe.name, enabled: false },
    { label: idLabel, click: () => clipboard.writeText(service.id) },
    ...(extras ?? []),
    { type: 'separator' as const },
    {
      label: 'Reload',
      click: () => actions?.service?.reload?.({ serviceId: service.id }),
    },
    {
      label: 'Edit',
      click: onEdit,
    },
    { type: 'separator' as const },
    {
      label: service.isNotificationEnabled
        ? 'Disable Notifications'
        : 'Enable Notifications',
      click: () =>
        actions?.service?.toggleNotifications?.({ serviceId: service.id }),
    },
    {
      label: service.isMuted ? 'Unmute Service' : 'Mute Service',
      click: () => actions?.service?.toggleAudio?.({ serviceId: service.id }),
    },
    {
      label: service.isDarkModeEnabled
        ? 'Disable Dark Mode'
        : 'Enable Dark Mode',
      click: () =>
        actions?.service?.toggleDarkMode?.({ serviceId: service.id }),
    },
    { type: 'separator' as const },
    {
      label: service.isEnabled ? 'Disable Service' : 'Enable Service',
      click: () =>
        actions?.service?.updateService?.({
          serviceId: service.id,
          serviceData: { isEnabled: !service.isEnabled },
        }),
    },
    {
      label: service.isHibernating ? 'Wake Up' : 'Hibernate',
      click: () =>
        service.isHibernating
          ? actions?.service?.awake?.({ serviceId: service.id })
          : actions?.service?.hibernate?.({ serviceId: service.id }),
    },
    {
      label: 'Clear Cache',
      click: () => actions?.service?.clearCache?.({ serviceId: service.id }),
    },
    { type: 'separator' as const },
    {
      label: 'Delete Service',
      click: () => {
        const selection = dialog.showMessageBoxSync(
          (electronApp as any).mainWindow,
          {
            type: 'question',
            buttons: ['Yes', 'No'],
            title: 'Confirm',
            message: `Are you sure you want to delete ${service.name || service.recipe.name}?`,
          },
        );

        if (selection === 0) {
          actions?.service?.deleteService?.({ serviceId: service.id });
        }
      },
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  menu.popup();
}
