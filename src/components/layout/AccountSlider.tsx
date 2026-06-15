import { Menu, dialog, app as electronApp } from '@electron/remote';
import { ipcRenderer } from 'electron';
import { inject, observer } from 'mobx-react';
import { Component, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import type { IntlShape, WrappedComponentProps } from 'react-intl';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import {
  AddIcon,
  CloseIcon,
  ErrorCircleFilledIcon,
  UserIcon,
} from 'tdesign-icons-react';
import {
  Avatar,
  Badge,
  Button,
  DialogPlugin,
  Drawer,
  Empty,
  Form,
  Input,
  MessagePlugin,
  Select,
  Switch,
  Textarea,
} from 'tdesign-react';
import type { Actions } from '../../actions/lib/actions';
import { listDigitalHumansApiV1DigitalHumansGet } from '../../agent-flow-cs/api/generated/digital-humans/digital-humans';
import {
  createWhatsappBindingApiV1WhatsappBindPost,
  getWhatsappBindingApiV1WhatsappBindGet,
  switchWhatsappBindingDigitalHumanApiV1WhatsappBindPatch,
} from '../../agent-flow-cs/api/generated/whatsapp/whatsapp';

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
      '提示：如没有人设资料，请在左侧菜单人设管理中添加资料后进行绑定',
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
  bindAccountDialogTitle: {
    id: 'accountSlider.bindAccountDialogTitle',
    defaultMessage: 'Bind Account',
  },
  basicSettings: {
    id: 'accountSlider.basicSettings',
    defaultMessage: 'Basic Settings',
  },
  accountRemark: {
    id: 'accountSlider.accountRemark',
    defaultMessage: 'Account Notes',
  },
  accountRemarkPlaceholder: {
    id: 'accountSlider.accountRemarkPlaceholder',
    defaultMessage: 'Enter notes here',
  },
  proxyHostPlaceholder: {
    id: 'accountSlider.proxyHostPlaceholder',
    defaultMessage: 'e.g. http://127.0.0.1',
  },
  proxyPortPlaceholder: {
    id: 'accountSlider.proxyPortPlaceholder',
    defaultMessage: 'e.g. 8080',
  },
  proxyUserPlaceholder: {
    id: 'accountSlider.proxyUserPlaceholder',
    defaultMessage: 'Fill in if applicable',
  },
  proxyPasswordPlaceholder: {
    id: 'accountSlider.proxyPasswordPlaceholder',
    defaultMessage: 'Fill in if applicable',
  },
  proxyType: {
    id: 'accountSlider.proxyType',
    defaultMessage: 'Proxy Type',
  },
  autoFillPlaceholder: {
    id: 'accountSlider.autoFillPlaceholder',
    defaultMessage: 'Paste IP info here — it will auto-fill the fields below',
  },
  cookieAutoFillPlaceholder: {
    id: 'accountSlider.cookieAutoFillPlaceholder',
    defaultMessage:
      '支持数组包含JSON格式的Cookie，例如\n[(“name”:“name”,“value”:“value”,“domain”:“domain”)]',
  },
  proxyCheckDesc: {
    id: 'accountSlider.proxyCheckDesc',
    defaultMessage: 'Test your proxy after configuring it',
  },
  cookieHint: {
    id: 'accountSlider.cookieHint',
    defaultMessage: 'Used for login session persistence',
  },
  proxySettings: {
    id: 'accountSlider.proxySettings',
    defaultMessage: 'Proxy Settings',
  },
  proxyAutoFill: {
    id: 'accountSlider.proxyAutoFill',
    defaultMessage: 'Auto-Fill Proxy',
  },
  proxyHost: {
    id: 'accountSlider.proxyHost',
    defaultMessage: 'Host',
  },
  proxyPort: {
    id: 'accountSlider.proxyPort',
    defaultMessage: 'Port',
  },
  proxyUser: {
    id: 'accountSlider.proxyUser',
    defaultMessage: 'Username',
  },
  proxyPassword: {
    id: 'accountSlider.proxyPassword',
    defaultMessage: 'Password',
  },
  proxyCheck: {
    id: 'accountSlider.proxyCheck',
    defaultMessage: 'Test Connection',
  },
  cookieSettings: {
    id: 'accountSlider.cookieSettings',
    defaultMessage: 'Cookie Settings',
  },
  cookieAutoFill: {
    id: 'accountSlider.cookieAutoFill',
    defaultMessage: 'Auto-Fill Cookie',
  },
  cookiePlaceholder: {
    id: 'accountSlider.cookiePlaceholder',
    defaultMessage: 'Enter cookie content',
  },
  proxyRestartInfo: {
    id: 'accountSlider.proxyRestartInfo',
    defaultMessage: 'Proxy changes take effect after restart',
  },
  proxyRiskWarning: {
    id: 'accountSlider.proxyRiskWarning',
    defaultMessage: '建议打开代理，关闭代理会有风险哦～',
  },
  autoFillLabel: {
    id: 'accountSlider.autoFillLabel',
    defaultMessage: 'Auto-Fill',
  },
  clickCheckDesc: {
    id: 'accountSlider.clickCheckDesc',
    defaultMessage:
      'When enabled, proxy auto-fill will fetch proxy details automatically during account binding',
  },
  cancel: {
    id: 'accountSlider.cancel',
    defaultMessage: 'Cancel',
  },
  confirm: {
    id: 'accountSlider.confirm',
    defaultMessage: 'Confirm',
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

interface BindAccountFormValues {
  remark: string;
  proxyAutoFill: boolean;
  proxyAutoFillContent: string;
  proxyType: 'http' | 'socks5';
  proxyHost: string;
  proxyPort: string;
  proxyUser: string;
  proxyPassword: string;
  cookieAutoFill: boolean;
  cookie: string;
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
              } catch {
                // name lookup best-effort
              }
            } catch {
              // binding check best-effort
            } finally {
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
            <div className="relative w-[56px] h-[56px]">
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
                  {service.recipe?.name ||
                    intl.formatMessage(messages.personaFallback)}
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
                      body: (
                        <Form colon labelWidth={80} className="py-[16px]">
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

interface IAccountSliderState {
  activeTab: TabId;
  isBindDrawerVisible: boolean;
  bindForm: BindAccountFormValues;
  editingService: Service | null;
  isProxyTesting: boolean;
}

@inject('stores', 'actions')
@observer
class AccountSlider extends Component<IProps, IAccountSliderState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      activeTab: 'all',
      isBindDrawerVisible: false,
      isProxyTesting: false,
      bindForm: {
        remark: '',
        proxyAutoFill: true,
        proxyAutoFillContent: '',
        proxyType: 'http',
        proxyHost: '',
        proxyPort: '',
        proxyUser: '',
        proxyPassword: '',
        cookieAutoFill: false,
        cookie: '',
      },
      editingService: null,
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

  openBindDrawer = (editingService: Service | null = null) => {
    if (editingService) {
      const proxy = (editingService as any).proxy || {};
      this.setState({
        isBindDrawerVisible: true,
        editingService,
        bindForm: {
          remark: editingService.name || '',
          proxyAutoFill: proxy.isEnabled || false,
          proxyAutoFillContent: '',
          proxyType: proxy.protocol || 'http',
          proxyHost: proxy.host || '',
          proxyPort: proxy.port || '',
          proxyUser: proxy.user || '',
          proxyPassword: proxy.password || '',
          cookieAutoFill: false,
          cookie: '',
        },
      });
    } else {
      this.setState({
        isBindDrawerVisible: true,
        editingService: null,
        bindForm: {
          remark: '',
          proxyAutoFill: true,
          proxyAutoFillContent: '',
          proxyType: 'http',
          proxyHost: '',
          proxyPort: '',
          proxyUser: '',
          proxyPassword: '',
          cookieAutoFill: false,
          cookie: '',
        },
      });
    }
  };

  closeBindDrawer = () => {
    this.setState({ isBindDrawerVisible: false, editingService: null });
  };

  handleBindFormChange = (
    field: keyof BindAccountFormValues,
    value: string | boolean,
  ) => {
    this.setState(prevState => ({
      bindForm: { ...prevState.bindForm, [field]: value },
    }));
  };

  handleBindConfirm = () => {
    const { actions } = this.props;
    const { bindForm, editingService } = this.state;

    const proxy = bindForm.proxyAutoFill
      ? {
          isEnabled: true,
          protocol: bindForm.proxyType,
          host: bindForm.proxyHost,
          port: bindForm.proxyPort,
          user: bindForm.proxyUser,
          password: bindForm.proxyPassword,
        }
      : { isEnabled: false };

    if (editingService) {
      actions?.service?.updateService?.({
        serviceId: editingService.id,
        serviceData: {
          name: bindForm.remark || 'WhatsApp',
          proxy,
        },
        redirect: false,
      });
      MessagePlugin.success({ content: '更新成功', duration: 3000 });
    } else {
      actions?.service?.createService?.({
        recipeId: 'whatsapp',
        serviceData: {
          name: bindForm.remark || 'WhatsApp',
          proxy,
          isHibernationEnabled: true,
        },
        redirect: false,
      });
      MessagePlugin.success({ content: '绑定成功', duration: 3000 });
    }

    this.closeBindDrawer();
  };

  handleProxyCheck = async () => {
    const { bindForm } = this.state;
    if (!bindForm.proxyHost || !bindForm.proxyPort) {
      MessagePlugin.warning('请先填写代理地址和端口');
      return;
    }

    this.setState({ isProxyTesting: true });
    try {
      const result = await ipcRenderer.invoke('proxy-test', {
        host: bindForm.proxyHost,
        port: Number.parseInt(bindForm.proxyPort, 10),
        protocol: bindForm.proxyType,
        timeout: 5000,
      });

      if (result.reachable) {
        const label = result.protocol === 'socks5' ? 'SOCKS5' : 'HTTP';
        MessagePlugin.success(
          `${label}代理连接成功 (延迟: ${result.latency}ms)`,
        );
      } else {
        const label = bindForm.proxyType === 'socks5' ? 'SOCKS5' : 'HTTP';
        MessagePlugin.error(
          `${label}代理连接失败: ${result.error || '请检查地址和端口是否正确'}`,
        );
      }
    } catch {
      MessagePlugin.error('检测失败，请检查代理配置');
    } finally {
      this.setState({ isProxyTesting: false });
    }
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
      <div className="flex flex-col h-full bg-container px-[8px] py-[16px] gap-[16px] overflow-hidden">
        <div className="flex flex-row items-start gap-[9px] h-fit flex-shrink-0">
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
              >
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

        <Drawer
          header={
            <div className="flex items-center justify-between w-full h-full">
              <span className="text-[18px] font-semibold text-primary">
                {intl.formatMessage(messages.bindAccountDialogTitle)}
              </span>
              <CloseIcon
                className="w-[16px] h-[16px] text-secondary cursor-pointer"
                onClick={this.closeBindDrawer}
              />
            </div>
          }
          visible={this.state.isBindDrawerVisible}
          size="548px"
          onClose={this.closeBindDrawer}
          destroyOnClose
          closeOnOverlayClick={false}
          placement="right"
          closeBtn={false}
          className="[&_.t-drawer__body]:!p-0"
          footer={
            <div className="flex items-center justify-end h-full px-[24px] gap-[12px] border-t border-line">
              <Button
                theme="default"
                variant="base"
                className="!w-[80px] !h-[40px] !bg-secondary-container !text-primary border-none"
                onClick={this.closeBindDrawer}
              >
                {intl.formatMessage(messages.cancel)}
              </Button>
              <Button
                theme="primary"
                className="!w-[88px] !h-[40px] !bg-brand"
                onClick={this.handleBindConfirm}
              >
                {intl.formatMessage(messages.confirm)}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-[24px] pt-[28px] pb-[32px]">
              <div className="mb-[40px]">
                <div className="text-[16px] font-semibold text-primary mb-[24px]">
                  {intl.formatMessage(messages.basicSettings)}
                </div>
                <div className="flex items-start gap-x-[12px] mb-[20px]">
                  <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                    {intl.formatMessage(messages.accountRemark)}
                  </div>
                  <div className="relative w-[406px]">
                    <Input
                      className="!h-[40px] !border-line"
                      placeholder={intl.formatMessage(
                        messages.accountRemarkPlaceholder,
                      )}
                      value={this.state.bindForm.remark}
                      onChange={val => this.handleBindFormChange('remark', val)}
                    />
                    <span className="absolute right-[12px] top-[10px] text-[12px] text-brand">
                      {this.state.bindForm.remark.length}/10
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-[40px]">
                <div className="flex items-center gap-x-[12px] mb-[24px]">
                  <span className="text-[16px] font-semibold text-primary">
                    {intl.formatMessage(messages.proxySettings)}
                  </span>
                  <Switch
                    value={this.state.bindForm.proxyAutoFill}
                    onChange={val =>
                      this.handleBindFormChange('proxyAutoFill', val)
                    }
                  />
                  {!this.state.bindForm.proxyAutoFill && (
                    <div className="flex items-center gap-x-[4px]">
                      <ErrorCircleFilledIcon className="w-[16px] h-[16px] text-warning" />
                      <span className="text-[12px] text-placeholder">
                        {intl.formatMessage(messages.proxyRiskWarning)}
                      </span>
                    </div>
                  )}
                </div>

                {this.state.bindForm.proxyAutoFill && (
                  <>
                    <div className="flex items-start gap-x-[12px] mb-[20px]">
                      <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                        {intl.formatMessage(messages.autoFillLabel)}
                      </div>
                      <Textarea
                        className="!h-[132px] !border-line !p-[12px] w-full"
                        placeholder={intl.formatMessage(
                          messages.autoFillPlaceholder,
                        )}
                        value={this.state.bindForm.proxyAutoFillContent}
                        onChange={val =>
                          this.handleBindFormChange('proxyAutoFillContent', val)
                        }
                      />
                    </div>

                    <div className="flex items-start gap-x-[12px] mb-[16px]">
                      <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                        {intl.formatMessage(messages.proxyType)}
                      </div>
                      <Select
                        className="!w-[406px]"
                        value={this.state.bindForm.proxyType}
                        onChange={val =>
                          this.handleBindFormChange(
                            'proxyType',
                            typeof val === 'string' ? val : 'http',
                          )
                        }
                        options={[
                          { label: 'HTTP', value: 'http' },
                          { label: 'SOCKS5', value: 'socks5' },
                        ]}
                      />
                    </div>

                    <div className="flex items-start gap-x-[12px] mb-[16px]">
                      <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                        {intl.formatMessage(messages.proxyHost)}
                      </div>
                      <Input
                        className="!w-[406px] !h-[40px] !border-line"
                        placeholder={intl.formatMessage(
                          messages.proxyHostPlaceholder,
                        )}
                        value={this.state.bindForm.proxyHost}
                        onChange={val =>
                          this.handleBindFormChange('proxyHost', val)
                        }
                      />
                    </div>

                    <div className="flex items-start gap-x-[12px] mb-[16px]">
                      <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                        {intl.formatMessage(messages.proxyPort)}
                      </div>
                      <Input
                        className="!w-[406px] !h-[40px] !border-line"
                        placeholder={intl.formatMessage(
                          messages.proxyPortPlaceholder,
                        )}
                        value={this.state.bindForm.proxyPort}
                        onChange={val =>
                          this.handleBindFormChange('proxyPort', val)
                        }
                      />
                    </div>

                    <div className="flex items-start gap-x-[12px] mb-[16px]">
                      <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                        {intl.formatMessage(messages.proxyUser)}
                      </div>
                      <Input
                        className="!w-[406px] !h-[40px] !border-line"
                        placeholder={intl.formatMessage(
                          messages.proxyUserPlaceholder,
                        )}
                        value={this.state.bindForm.proxyUser}
                        onChange={val =>
                          this.handleBindFormChange('proxyUser', val)
                        }
                      />
                    </div>

                    <div className="flex items-start gap-x-[12px] mb-[16px]">
                      <div className="w-[82px] pt-[8px] text-[14px] text-primary">
                        {intl.formatMessage(messages.proxyPassword)}
                      </div>
                      <Input
                        type="password"
                        className="!w-[406px] !h-[40px] !border-line"
                        placeholder={intl.formatMessage(
                          messages.proxyPasswordPlaceholder,
                        )}
                        value={this.state.bindForm.proxyPassword}
                        onChange={val =>
                          this.handleBindFormChange('proxyPassword', val)
                        }
                      />
                    </div>

                    <div className="ml-[94px]">
                      <Button
                        className="min-w-[118px] !h-[40px] !bg-brand !text-white !font-medium"
                        onClick={this.handleProxyCheck}
                        loading={this.state.isProxyTesting}
                      >
                        {intl.formatMessage(messages.proxyCheck)}
                      </Button>
                      <div className="mt-[8px] text-[12px] text-placeholder">
                        {intl.formatMessage(messages.proxyCheckDesc)}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div>
                <div className="flex items-center justify-start gap-[12px] w-full mb-[24px]">
                  <span className="text-[16px] font-semibold text-primary">
                    {intl.formatMessage(messages.cookieSettings)}
                  </span>
                  <Switch
                    value={this.state.bindForm.cookieAutoFill}
                    onChange={val =>
                      this.handleBindFormChange('cookieAutoFill', val)
                    }
                  />
                </div>

                {this.state.bindForm.cookieAutoFill && (
                  <div className="flex flex-col">
                    <Textarea
                      className="w-full min-h-[148px] !border-line !p-[12px] self-end"
                      placeholder={intl.formatMessage(
                        messages.cookiePlaceholder,
                      )}
                      value={this.state.bindForm.cookie}
                      onChange={val => this.handleBindFormChange('cookie', val)}
                    />
                    <div className="mt-[8px] text-[12px] text-placeholder self-end">
                      {intl.formatMessage(messages.cookieHint)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Drawer>
      </div>
    );
  }
}

export default injectIntl(AccountSlider);
