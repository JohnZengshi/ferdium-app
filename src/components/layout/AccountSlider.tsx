import { Menu, dialog, app as electronApp } from '@electron/remote';
import { clipboard } from 'electron';
import { inject, observer } from 'mobx-react';
import React, { Component, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import type { IntlShape, WrappedComponentProps } from 'react-intl';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { AddIcon, UserIcon } from 'tdesign-icons-react';
import {
  Avatar,
  Badge,
  Button,
  DialogPlugin,
  Empty,
  Form,
  MessagePlugin,
  Select,
} from 'tdesign-react';
import EditServiceDrawer from '../ui/EditServiceDrawer';
import type { ServiceProxy } from '../ui/EditServiceDrawer';
import type { Actions } from '../../actions/lib/actions';
import { listDigitalHumansApiV1DigitalHumansGet } from '../../agent-flow-cs/api/generated/digital-humans/digital-humans';
import {
  createWhatsappBindingApiV1WhatsappBindPost,
  getWhatsappBindingApiV1WhatsappBindGet,
  switchWhatsappBindingDigitalHumanApiV1WhatsappBindPatch,
} from '../../agent-flow-cs/api/generated/whatsapp/whatsapp';
import { updateOnboardingStep } from '../../helpers/onboarding-helpers';

import {
  type WhatsAppSessionStatus,
  getMappedStatus,
} from '../../features/whatsappAutomation/helpers';
import type Service from '../../models/Service';
import type { RealStores } from '../../stores';

const messages = defineMessages({
  personaSales: {
    id: 'accountSlider.personaSales',
    defaultMessage: 'Sales Persona',
  },
  personaSupport: {
    id: 'accountSlider.personaSupport',
    defaultMessage: 'Support Persona',
  },
  personaOperation: {
    id: 'accountSlider.personaOperation',
    defaultMessage: 'Operations Persona',
  },
  tabAll: {
    id: 'accountSlider.tabAll',
    defaultMessage: 'All',
  },
  tabOnline: {
    id: 'accountSlider.tabOnline',
    defaultMessage: 'Online',
  },
  tabOffline: {
    id: 'accountSlider.tabOffline',
    defaultMessage: 'Offline',
  },
  tabError: {
    id: 'accountSlider.tabError',
    defaultMessage: 'Error',
  },
  statusError: {
    id: 'accountSlider.statusError',
    defaultMessage: 'Error',
  },
  statusOffline: {
    id: 'accountSlider.statusOffline',
    defaultMessage: 'Offline',
  },
  bindAccount: {
    id: 'accountSlider.bindAccount',
    defaultMessage: 'Bind Account',
  },
  personaFallback: {
    id: 'accountSlider.personaFallback',
    defaultMessage: '人设',
  },
  bindPersona: {
    id: 'accountSlider.bindPersona',
    defaultMessage: 'Bind',
  },
  bindPersonaDialogTitle: {
    id: 'accountSlider.bindPersonaDialogTitle',
    defaultMessage: 'Bind Social Account Persona Profile',
  },
  selectPersona: {
    id: 'accountSlider.selectPersona',
    defaultMessage: 'Select Persona',
  },
  selectPersonaPlaceholder: {
    id: 'accountSlider.selectPersonaPlaceholder',
    defaultMessage: 'Please select a persona',
  },
  personaHint: {
    id: 'accountSlider.personaHint',
    defaultMessage:
      '提示：如没有人设资料，请在左侧菜单资料库中社交人设中添加资料后进行绑定',
  },
  confirmText: {
    id: 'accountSlider.confirmText',
    defaultMessage: 'Confirm',
  },
  selectPersonaFirst: {
    id: 'accountSlider.selectPersonaFirst',
    defaultMessage: 'Please select a persona first',
  },
  bindPersonaSuccess: {
    id: 'accountSlider.bindPersonaSuccess',
    defaultMessage: 'Persona bound successfully',
  },
  bindPersonaFailed: {
    id: 'accountSlider.bindPersonaFailed',
    defaultMessage: 'Failed to bind persona',
  },
  cancel: {
    id: 'accountSlider.cancel',
    defaultMessage: 'Cancel',
  },
});

const TAB_IDS = ['all', 'online', 'offline', 'error'] as const;
type TabId = (typeof TAB_IDS)[number];

const getTabs = (intl: IntlShape): { id: TabId; label: string }[] => [
  { id: 'all', label: intl.formatMessage(messages.tabAll) },
  { id: 'online', label: intl.formatMessage(messages.tabOnline) },
  { id: 'offline', label: intl.formatMessage(messages.tabOffline) },
  { id: 'error', label: intl.formatMessage(messages.tabError) },
];

const tabTextColor = (tabId: TabId): string => {
  switch (tabId) {
    case 'all': {
      return 'text-brand';
    }
    case 'online': {
      return 'text-success';
    }
    case 'offline': {
      return 'text-warning';
    }
    case 'error': {
      return 'text-error';
    }
    default: {
      return '';
    }
  }
};

interface StatusTag {
  label: string;
  bg: string;
  text: string;
}

const getStatusTag = (
  sessionStatus: WhatsAppSessionStatus,
  intl: IntlShape,
): StatusTag | null => {
  switch (getMappedStatus(sessionStatus)) {
    case 'error': {
      return {
        label: intl.formatMessage(messages.statusError),
        bg: 'bg-error-light',
        text: 'text-error',
      };
    }
    case 'offline': {
      return {
        label: intl.formatMessage(messages.statusOffline),
        bg: 'bg-warning-light',
        text: 'text-warning',
      };
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
  injectIntl(
    observer(
      ({
        service,
        actions,
        onContextMenu,
        waStatus,
        intl,
      }: AccountSliderItemProps & WrappedComponentProps): ReactElement => {
        const unread =
          service.unreadDirectMessageCount + service.unreadIndirectMessageCount;
        const statusTag = getStatusTag(waStatus, intl);
        const personaLabel = intl.formatMessage(messages.personaFallback);
        const presenceColor = (() => {
          switch (getMappedStatus(waStatus)) {
            case 'online': {
              return 'bg-success';
            }
            case 'offline': {
              return 'bg-warning';
            }
            case 'error': {
              return 'bg-error';
            }
            default: {
              return service.isEnabled ? 'bg-success' : 'bg-warning';
            }
          }
        })();

        const [boundPersonaName, setBoundPersonaName] = useState<string>('');
        const [isLoadingBinding, setIsLoadingBinding] = useState<boolean>(true);

        useEffect(() => {
          let cancelled = false;
          const loadBinding = async () => {
            try {
              const bindRes = await getWhatsappBindingApiV1WhatsappBindGet({
                session_id: service.id,
              });
              if (
                cancelled ||
                bindRes.status !== 200 ||
                !bindRes.data?.digital_human_id
              )
                return;
              const boundId = bindRes.data.digital_human_id;
              try {
                const listRes = await listDigitalHumansApiV1DigitalHumansGet();
                if (cancelled) return;
                const found = listRes.data.find(dh => dh.id === boundId);
                setBoundPersonaName(found?.name ?? '');
              } catch { /* best-effort */ }
            } catch { /* best-effort */ } finally {
              if (!cancelled) setIsLoadingBinding(false);
            }
          };
          loadBinding();
          return () => {
            cancelled = true;
          };
        }, [service.id]);

        return (
          <div
            role="button"
            tabIndex={0}
            className={`flex items-center h-[72px] shrink-0 w-full px-[12px] gap-[15px] rounded-[8px] cursor-pointer ${service.isActive ? 'bg-brand-light' : 'bg-transparent'} hover:!bg-secondary-container`}
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
          >
            <div className="relative w-[56px] h-[56px] [.compact-mode_&]:hidden">
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
              <div
                className={`absolute bottom-0 right-0 w-[8px] h-[8px] rounded-full border border-container ${presenceColor}`}
              />
            </div>
            <div className="flex flex-col items-start justify-center gap-[9px] h-fit flex-auto min-w-0">
              <div className="flex items-center justify-between w-full">
                <span className="text-[16px] font-normal leading-[26px] text-primary truncate">
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
                <span className="text-[14px] text-secondary leading-[22px]">
                  {personaLabel}
                </span>
                <Button
                  variant="outline"
                  className="!h-[20px] !min-w-[37px] text-[12px] !px-[4px]"
                  ghost
                  theme={boundPersonaName ? 'primary' : 'success'}
                  loading={isLoadingBinding}
                  onClick={async event => {
                    event.stopPropagation();
                    let options: { label: string; value: string }[] = [];
                    try {
                      const res =
                        await listDigitalHumansApiV1DigitalHumansGet();
                      options = res.data.map(item => ({
                        label: item.name,
                        value: item.id,
                      }));
                    } catch {
                      MessagePlugin.error('获取人设列表失败');
                      return;
                    }

                    let selectedPersonaId = '';

                    const confirmDia = DialogPlugin.confirm({
                      placement: 'center',
                      header: intl.formatMessage(
                        messages.bindPersonaDialogTitle,
                      ),
                      cancelBtn: intl.formatMessage(messages.cancel),
                      body: (
                        <Form
                          colon
                          labelWidth={130}
                          labelAlign="left"
                          className="py-[16px]"
                        >
                          <Form.FormItem
                            label={intl.formatMessage(messages.selectPersona)}
                            name="persona"
                          >
                            <Select
                              placeholder={intl.formatMessage(
                                messages.selectPersonaPlaceholder,
                              )}
                              options={options}
                              onChange={value => {
                                selectedPersonaId =
                                  typeof value === 'string'
                                    ? value
                                    : String(value ?? '');
                              }}
                            />
                          </Form.FormItem>

                          <span className="text-[12px] text-placeholder leading-[20px]">
                            {intl.formatMessage(messages.personaHint)}
                          </span>
                        </Form>
                      ),
                      confirmBtn: intl.formatMessage(messages.confirmText),
                      onConfirm: async () => {
                        if (!selectedPersonaId) {
                          MessagePlugin.warning(
                            intl.formatMessage(messages.selectPersonaFirst),
                          );
                          return;
                        }

                        try {
                          await (boundPersonaName
                            ? switchWhatsappBindingDigitalHumanApiV1WhatsappBindPatch(
                                {
                                  digital_human_id: selectedPersonaId,
                                  session_id: service.id,
                                },
                              )
                            : createWhatsappBindingApiV1WhatsappBindPost({
                                session_id: service.id,
                                digital_human_id: selectedPersonaId,
                              }));
                          setBoundPersonaName(
                            options.find(o => o.value === selectedPersonaId)
                              ?.label ?? '',
                          );
                          MessagePlugin.success(
                            intl.formatMessage(messages.bindPersonaSuccess),
                          );
                          confirmDia.hide();

                          updateOnboardingStep(4, true);
                          window.dispatchEvent(
                            new Event('onboarding-step-updated'),
                          );
                        } catch (error) {
                          const message =
                            error instanceof Error
                              ? error.message
                              : intl.formatMessage(messages.bindPersonaFailed);
                          MessagePlugin.error(message);
                        }
                      },
                      onClose: () => {
                        confirmDia.hide();
                      },
                    });
                  }}
                >
                  {boundPersonaName || intl.formatMessage(messages.bindPersona)}
                </Button>
              </div>
            </div>
          </div>
        );
      },
    ),
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

type ServiceDrawerData = Service & {
  proxy?: ServiceProxy | null;
  cookie?: string;
};

interface IAccountSliderState {
  activeTab: TabId;
  isBindDrawerVisible: boolean;
  editingService: ServiceDrawerData | null;
  width: number;
  isDragging: boolean;
}

@inject('stores', 'actions')
@observer
class AccountSlider extends Component<IProps, IAccountSliderState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      activeTab: 'all',
      isBindDrawerVisible: false,
      width: 300,
      isDragging: false,
      editingService: null,
    };
  }

  private sliderRef = React.createRef<HTMLDivElement>();

  private resizeStartX = 0;

  private resizeStartWidth = 0;

  handleResizeMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.state.width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    this.setState({ isDragging: true });
  };

  handleResizeMouseMove = (event: MouseEvent) => {
    const deltaX = event.clientX - this.resizeStartX;
    const newWidth = this.resizeStartWidth + deltaX;
    this.setState({ width: Math.max(200, newWidth) });
  };

  handleResizeMouseUp = () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    this.setState({ isDragging: false });
  };

  componentWillUnmount(): void {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
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
    const { actions, stores } = this.props;
    const waMe = stores?.whatsappAutomation?.sessionInfo.get(service.id)?.me;

    const menuTemplate: any[] = [
      {
        label: service.name || service.recipe.name,
        enabled: false,
      },
      ...(waMe?.jid
        ? [
            {
              label: `Copy JID (${waMe.jid})`,
              click: () => clipboard.writeText(waMe.jid!),
            },
          ]
        : []),
      { type: 'separator' as const },
      {
        label: 'Reload',
        click: () => actions?.service?.reload?.({ serviceId: service.id }),
      },
      {
        label: 'Edit',
        click: () => this.openBindDrawer(service),
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

  openBindDrawer = (editingService: ServiceDrawerData | null = null) => {
    this.setState({
      isBindDrawerVisible: true,
      editingService,
    });
  };

  closeBindDrawer = () => {
    this.setState({ isBindDrawerVisible: false, editingService: null });
  };

  handleBindConfirm = (data: { name: string; proxy: ServiceProxy }) => {
    const { actions } = this.props;
    const { editingService } = this.state;

    if (editingService) {
      actions?.service?.updateService?.({
        serviceId: editingService.id,
        serviceData: {
          name: data.name || 'WhatsApp',
          proxy: data.proxy,
        },
        redirect: false,
      });
      MessagePlugin.success({ content: '更新成功', duration: 3000 });
    } else {
      actions?.service?.createService?.({
        recipeId: 'whatsapp',
        serviceData: {
          name: data.name || 'WhatsApp',
          proxy: data.proxy,
          isHibernationEnabled: true,
        },
        redirect: false,
      });
      MessagePlugin.success({ content: '绑定成功', duration: 3000 });
    }

    this.closeBindDrawer();
  };

  render(): ReactElement {
    const { stores, actions, intl } = this.props;
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
    const tabs = getTabs(intl);

    return (
      <div
        ref={this.sliderRef}
        className={`flex flex-col h-full bg-container px-[8px] py-[16px] gap-[16px] overflow-hidden relative flex-shrink-0 ${this.state.width < 250 ? 'compact-mode' : ''}`}
        style={{ width: `${this.state.width}px` }}
      >
        <button
          type="button"
          aria-label="拖拽调整侧边栏宽度"
          className="absolute right-0 top-0 bottom-0 w-[4px] cursor-col-resize hover:bg-brand z-10 transition-colors border-0 p-0 bg-transparent"
          onMouseDown={this.handleResizeMouseDown}
        />
        {this.state.isDragging && (
          <div
            role="presentation"
            className="fixed inset-0 z-[9999] cursor-col-resize"
            onMouseMove={e => this.handleResizeMouseMove(e.nativeEvent)}
            onMouseUp={this.handleResizeMouseUp}
            onMouseLeave={this.handleResizeMouseUp}
          />
        )}
        <div className="flex flex-row items-start gap-[9px] h-fit flex-shrink-0 w-full">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const unreadCount = allServices
              .filter(service =>
                isServiceMatchingTab(waStatuses.get(service.id), tab.id),
              )
              .reduce(
                (sum, service) =>
                  sum +
                  service.unreadDirectMessageCount +
                  service.unreadIndirectMessageCount,
                0,
              );
            return (
              <Badge
                key={tab.id}
                count={unreadCount || null}
                size="small"
                offset={[10, 0]}
                className="flex-1 min-w-0"
              >
                <Button
                  className="h-[32px] w-full min-w-0"
                  theme="default"
                  variant={isActive ? 'base' : 'text'}
                  onClick={() => this.setActiveTab(tab.id)}
                >
                  <div className="flex items-center gap-[8px] justify-center">
                    {tab.id === 'all' && (
                      <img
                        src="./assets/images/sidebar-services.svg"
                        className="w-[16px] h-[16px] [.compact-mode_&]:hidden"
                        alt=""
                      />
                    )}
                    <span
                      className={`text-[14px] font-normal leading-[22px] ${tabTextColor(tab.id)}`}
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
          onClick={() => this.openBindDrawer()}
        >
          {intl.formatMessage(messages.bindAccount)}
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

        <EditServiceDrawer
          visible={this.state.isBindDrawerVisible}
          initialData={
            this.state.editingService
              ? {
                  name: this.state.editingService.name,
                  proxy: this.state.editingService?.proxy,
                  cookie: this.state.editingService?.cookie || '',
                }
              : null
          }
          onClose={this.closeBindDrawer}
          onConfirm={this.handleBindConfirm}
        />
      </div>
    );
  }
}

export default injectIntl(AccountSlider);
