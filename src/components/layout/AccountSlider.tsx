import { Menu, dialog, app as electronApp } from '@electron/remote';
import { inject, observer } from 'mobx-react';
import { Component } from 'react';
import type { ReactElement } from 'react';
import { injectIntl } from 'react-intl';
import type { WrappedComponentProps } from 'react-intl';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { AddIcon, UserIcon } from 'tdesign-icons-react';
import { Avatar, Badge, Button, Empty } from 'tdesign-react';
import type { Actions } from '../../actions/lib/actions';
import { WA_SESSION_STATUS } from '../../features/whatsappAutomation/constants';
import type Service from '../../models/Service';
import type { RealStores } from '../../stores';

const TABS = [
  { id: 'all', label: '全部', color: '#0052D9', badge: '99+' },
  { id: 'online', label: '在线', color: '#2BA471', badge: '2' },
  { id: 'offline', label: '离线', color: '#E37318', badge: '2' },
  { id: 'error', label: '异常', color: '#D54941', badge: '2' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface StatusTag {
  label: string;
  bg: string;
  text: string;
}

type WhatsAppSessionStatus =
  | (typeof WA_SESSION_STATUS)[keyof typeof WA_SESSION_STATUS]
  | undefined;

const getMappedStatus = (
  sessionStatus: WhatsAppSessionStatus,
): 'online' | 'offline' | 'error' | 'unknown' => {
  switch (sessionStatus) {
    case WA_SESSION_STATUS.CONNECTED: {
      return 'online';
    }
    case WA_SESSION_STATUS.DISCONNECTED: {
      return 'offline';
    }
    case WA_SESSION_STATUS.LOGGED_OUT:
    case WA_SESSION_STATUS.STOPPED:
    case WA_SESSION_STATUS.SERVER_ERROR: {
      return 'error';
    }
    default: {
      return 'unknown';
    }
  }
};

const getStatusTag = (
  sessionStatus: WhatsAppSessionStatus,
): StatusTag | null => {
  switch (getMappedStatus(sessionStatus)) {
    case 'error': {
      return { label: '异常', bg: 'bg-[#FFF0ED]', text: 'text-[#D54941]' };
    }
    case 'offline': {
      return { label: '离线', bg: 'bg-[#FFF6ED]', text: 'text-[#E37318]' };
    }
    default: {
      return null;
    }
  }
};

const isServiceMatchingTab = (
  sessionStatus: WhatsAppSessionStatus,
  tabId: TabId,
): boolean => {
  switch (tabId) {
    case 'all': {
      return true;
    }
    case 'online': {
      return getMappedStatus(sessionStatus) === 'online';
    }
    case 'offline': {
      return getMappedStatus(sessionStatus) === 'offline';
    }
    case 'error': {
      return getMappedStatus(sessionStatus) === 'error';
    }
    default: {
      return false;
    }
  }
};

interface AccountSliderItemProps {
  service: Service;
  actions?: Actions;
  onContextMenu: (service: Service) => void;
  waStatus: WhatsAppSessionStatus;
}

const AccountSliderItem = SortableElement<AccountSliderItemProps>(
  observer(
    ({
      service,
      actions,
      onContextMenu,
      waStatus,
    }: AccountSliderItemProps): ReactElement => {
      const unread =
        service.unreadDirectMessageCount + service.unreadIndirectMessageCount;
      const statusTag = getStatusTag(waStatus);
      const presenceColor = (() => {
        switch (getMappedStatus(waStatus)) {
          case 'online': {
            return 'bg-[#2BA471]';
          }
          case 'offline': {
            return 'bg-[#E37318]';
          }
          case 'error': {
            return 'bg-[#D54941]';
          }
          default: {
            return service.isEnabled ? 'bg-[#2BA471]' : 'bg-[#E37318]';
          }
        }
      })();

      return (
        <div
          role="button"
          tabIndex={0}
          className="flex items-center h-[72px] shrink-0 w-full px-[12px] gap-[15px] rounded-[8px] hover:!bg-[#F3F3F3] cursor-pointer"
          onClick={() =>
            actions?.service?.setActive?.({ serviceId: service.id })
          }
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              actions?.service?.setActive?.({ serviceId: service.id });
            }
          }}
          onContextMenu={() => onContextMenu(service)}
          style={{
            backgroundColor: service.isActive ? '#F2F3FF' : 'transparent',
          }}
        >
          <div className="relative w-[56px] h-[56px]">
            <Avatar
              image={service.icon || ''}
              icon={<UserIcon />}
              className="!w-full !h-full"
            />
            {unread > 0 && (
              <div className="absolute -top-[2px] -right-[2px] min-w-[16px] h-[16px] bg-[#D54941] rounded-full flex items-center justify-center px-[3px] border border-white">
                <span className="text-[9px] text-white leading-[15px] font-normal">
                  {unread > 99 ? '99+' : unread}
                </span>
              </div>
            )}
            <div
              className={`absolute bottom-0 right-0 w-[8px] h-[8px] rounded-full border border-white ${presenceColor}`}
            />
          </div>
          <div className="flex flex-col items-start justify-center gap-[9px] h-fit flex-auto min-w-0">
            <div className="flex items-center justify-between w-full">
              <span className="text-[16px] font-normal leading-[26px] text-black/90 truncate">
                {service.name}
              </span>
              {statusTag && (
                <div
                  className={`w-fit h-[20px] px-[4px] ${statusTag.bg} rounded-[3px] flex items-center justify-center shrink-0`}
                >
                  <span
                    className={`text-[12px] ${statusTag.text} leading-[20px]`}
                  >
                    {statusTag.label}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-[4px]">
              <span className="text-[14px] text-black/60 leading-[22px]">
                {service.recipe?.name || '人设'}
              </span>
            </div>
          </div>
        </div>
      );
    },
  ),
);

interface AccountSliderListProps {
  services: Service[];
  actions?: Actions;
  onContextMenu: (service: Service) => void;
  onSortEnd: (result: { oldIndex: number; newIndex: number }) => void;
  distance: number;
  axis: string;
  lockAxis: string;
  helperClass: string;
  waStatuses: Map<string, WhatsAppSessionStatus>;
}

const AccountSliderList = SortableContainer<AccountSliderListProps>(
  observer(
    ({
      services,
      actions,
      onContextMenu,
      waStatuses,
    }: AccountSliderListProps): ReactElement => (
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-[12px]">
        {services.map((service, index) => (
          <AccountSliderItem
            key={service.id}
            index={index}
            service={service}
            actions={actions}
            onContextMenu={onContextMenu}
            waStatus={waStatuses.get(service.id)}
          />
        ))}
      </div>
    ),
  ),
);

interface IProps extends WrappedComponentProps {
  stores?: RealStores;
  actions?: Actions;
}

interface IAccountSliderState {
  activeTab: TabId;
}

@inject('stores', 'actions')
@observer
class AccountSlider extends Component<IProps, IAccountSliderState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      activeTab: 'all',
    };
  }

  onSortEnd = ({
    oldIndex,
    newIndex,
  }: {
    oldIndex: number;
    newIndex: number;
  }) => {
    const { actions, stores } = this.props;
    const { activeTab } = this.state;
    const allServices = stores?.services?.all ?? [];
    const waStatuses =
      (stores?.whatsappAutomation?.sessionStatuses as Map<
        string,
        WhatsAppSessionStatus
      >) ?? new Map<string, WhatsAppSessionStatus>();
    const filteredServices = allServices.filter(service =>
      isServiceMatchingTab(waStatuses.get(service.id), activeTab),
    );

    const service = filteredServices[oldIndex];
    if (service) {
      const realOldIndex = allServices.indexOf(service);
      const targetService = filteredServices[newIndex];
      const realNewIndex = targetService
        ? allServices.indexOf(targetService)
        : allServices.length - 1;

      actions?.service?.reorder?.({
        oldIndex: realOldIndex,
        newIndex: realNewIndex,
      });
    }
  };

  handleContextMenu = (service: Service) => {
    const { actions } = this.props;

    const menuTemplate = [
      {
        label: service.name || service.recipe.name,
        enabled: false,
      },
      { type: 'separator' as const },
      {
        label: 'Reload',
        click: () => actions?.service?.reload?.({ serviceId: service.id }),
      },
      {
        label: 'Edit',
        click: () =>
          actions?.ui?.openSettings?.({ path: `services/edit/${service.id}` }),
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

    const menu = Menu.buildFromTemplate(menuTemplate);
    menu.popup();
  };

  setActiveTab = (id: TabId) => {
    this.setState({ activeTab: id });
  };

  render(): ReactElement {
    const { stores, actions } = this.props;
    const { activeTab } = this.state;
    const allServices = stores?.services?.all ?? [];
    const waStatuses =
      (stores?.whatsappAutomation?.sessionStatuses as Map<
        string,
        WhatsAppSessionStatus
      >) ?? new Map<string, WhatsAppSessionStatus>();
    const filteredServices = allServices.filter(service =>
      isServiceMatchingTab(waStatuses.get(service.id), activeTab),
    );

    return (
      <div className="flex flex-col h-full bg-white px-[8px] py-[16px] gap-[16px] overflow-hidden">
        <div className="flex flex-row items-start gap-[9px] h-fit flex-shrink-0">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const count = allServices.filter(service =>
              isServiceMatchingTab(waStatuses.get(service.id), tab.id),
            ).length;
            return (
              <Badge key={tab.id} count={count} size="small" offset={[10, 0]}>
                <Button
                  className="h-[32px] px-[12px]"
                  theme="default"
                  variant={isActive ? 'base' : 'text'}
                  onClick={() => this.setActiveTab(tab.id)}
                >
                  <div className="flex items-center gap-[8px]">
                    {tab.id === 'all' && (
                      <img
                        src="./assets/images/sidebar-services.svg"
                        className="w-[16px] h-[16px]"
                        alt=""
                      />
                    )}
                    <span
                      className="text-[14px] font-normal leading-[22px]"
                      style={{ color: tab.color }}
                    >
                      {tab.label}
                    </span>
                  </div>
                </Button>
              </Badge>
            );
          })}
        </div>
        <Button
          height="40px"
          className="rounded-[6px] flex-shrink-0"
          icon={<AddIcon />}
          onClick={() => actions?.ui?.openSettings?.({ path: 'recipes' })}
        >
          绑定账号
        </Button>

        {filteredServices.length > 0 ? (
          <AccountSliderList
            services={filteredServices}
            actions={actions}
            onContextMenu={this.handleContextMenu}
            onSortEnd={this.onSortEnd}
            distance={20}
            axis="y"
            lockAxis="y"
            helperClass="is-reordering"
            waStatuses={waStatuses}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Empty
              className="h-fit w-full flex flex-col items-center [&_svg]:w-full [&_svg]:h-full"
              size="large"
              imageStyle={{ width: '80px', height: '80px' }}
            />
          </div>
        )}
      </div>
    );
  }
}

export default injectIntl(AccountSlider);
