import { observer } from 'mobx-react';
import type { ReactElement, ReactNode } from 'react';
import { UserIcon } from 'tdesign-icons-react';
import { Avatar } from 'tdesign-react';
import type { Actions } from '../../actions/lib/actions';
import type Service from '../../models/Service';
import type { FerdiumModule } from '../../stores/NavigationStore';
import { navigationStore } from '../../stores/NavigationStore';

interface ServiceSliderItemShellProps {
  service: Service;
  actions?: Actions;
  onContextMenu: (service: Service) => void;
  moduleId: FerdiumModule;
  presenceColor?: string;
  children?: ReactNode;
}

export const ServiceSliderItemShell = observer(
  ({
    service,
    actions,
    onContextMenu,
    moduleId,
    presenceColor,
    children,
  }: ServiceSliderItemShellProps): ReactElement => {
    const unread =
      service.unreadDirectMessageCount + service.unreadIndirectMessageCount;

    return (
      <div
        role="button"
        tabIndex={0}
        className={`flex items-center h-[72px] shrink-0 w-full px-[12px] gap-[15px] rounded-[8px] cursor-pointer ${service.isActive ? 'bg-brand-light' : 'bg-transparent'} hover:!bg-secondary-container`}
        onClick={() => {
          navigationStore.setModuleActiveService(moduleId, service.id);
          actions?.service?.setActive?.({ serviceId: service.id });
        }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigationStore.setModuleActiveService(moduleId, service.id);
            actions?.service?.setActive?.({ serviceId: service.id });
          }
        }}
        onContextMenu={() => onContextMenu(service)}
      >
        <div className="relative min-w-[56px] w-[56px] h-[56px] [.compact-mode_&]:hidden">
          <Avatar
            image={service.icon || ''}
            icon={<UserIcon />}
            className="!w-full !h-full"
          />
          {unread > 0 && (
            <div className="absolute -top-[2px] -right-[2px] min-w-[16px] h-[16px] bg-error rounded-full flex items-center justify-center px-[3px] border border-container">
              <span className="text-[9px] text-text-anti leading-[15px] font-normal">
                {unread > 99 ? '99+' : unread}
              </span>
            </div>
          )}
          {presenceColor && (
            <div
              className={`absolute bottom-0 right-0 w-[8px] h-[8px] rounded-full border border-container ${presenceColor}`}
            />
          )}
        </div>
        {children}
      </div>
    );
  },
);
