import { Menu, dialog, app as electronApp } from '@electron/remote';
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

import { WA_SESSION_STATUS } from '../../features/whatsappAutomation/constants';
import type Service from '../../models/Service';
import type { RealStores } from '../../stores';

const messages = defineMessages({
  personaSales: {
    id: 'accountSlider.personaSales',
    defaultMessage: '销售人设',
  },
  personaSupport: {
    id: 'accountSlider.personaSupport',
    defaultMessage: '客服人设',
  },
  personaOperation: {
    id: 'accountSlider.personaOperation',
    defaultMessage: '运营人设',
  },
  tabAll: {
    id: 'accountSlider.tabAll',
    defaultMessage: '全部',
  },
  tabOnline: {
    id: 'accountSlider.tabOnline',
    defaultMessage: '在线',
  },
  tabOffline: {
    id: 'accountSlider.tabOffline',
    defaultMessage: '离线',
  },
  tabError: {
    id: 'accountSlider.tabError',
    defaultMessage: '异常',
  },
  statusError: {
    id: 'accountSlider.statusError',
    defaultMessage: '异常',
  },
  statusOffline: {
    id: 'accountSlider.statusOffline',
    defaultMessage: '离线',
  },
  bindAccount: {
    id: 'accountSlider.bindAccount',
    defaultMessage: '绑定账号',
  },
  personaFallback: {
    id: 'accountSlider.personaFallback',
    defaultMessage: '人设',
  },
  bindPersona: {
    id: 'accountSlider.bindPersona',
    defaultMessage: '绑定',
  },
  bindPersonaDialogTitle: {
    id: 'accountSlider.bindPersonaDialogTitle',
    defaultMessage: '绑定社交账号人设资料',
  },
  selectPersona: {
    id: 'accountSlider.selectPersona',
    defaultMessage: '选择人设',
  },
  selectPersonaPlaceholder: {
    id: 'accountSlider.selectPersonaPlaceholder',
    defaultMessage: '请选择人设',
  },
  personaHint: {
    id: 'accountSlider.personaHint',
    defaultMessage:
      '提示：如没有人设资料，请在左侧菜单人设管理中添加资料后进行绑定',
  },
  confirmText: {
    id: 'accountSlider.confirmText',
    defaultMessage: '确认',
  },
  selectPersonaFirst: {
    id: 'accountSlider.selectPersonaFirst',
    defaultMessage: '请先选择人设',
  },
  bindPersonaSuccess: {
    id: 'accountSlider.bindPersonaSuccess',
    defaultMessage: '人设绑定成功',
  },
  bindPersonaFailed: {
    id: 'accountSlider.bindPersonaFailed',
    defaultMessage: '人设绑定失败',
  },
  bindAccountDialogTitle: {
    id: 'accountSlider.bindAccountDialogTitle',
    defaultMessage: '绑定账号',
  },
  basicSettings: {
    id: 'accountSlider.basicSettings',
    defaultMessage: '基础设置',
  },
  accountRemark: {
    id: 'accountSlider.accountRemark',
    defaultMessage: '账号备注',
  },
  accountRemarkPlaceholder: {
    id: 'accountSlider.accountRemarkPlaceholder',
    defaultMessage: '请输入内容',
  },
  proxyHostPlaceholder: {
    id: 'accountSlider.proxyHostPlaceholder',
    defaultMessage: '例如： http://127.0.0.1',
  },
  proxyPortPlaceholder: {
    id: 'accountSlider.proxyPortPlaceholder',
    defaultMessage: '例如 8080',
  },
  proxyUserPlaceholder: {
    id: 'accountSlider.proxyUserPlaceholder',
    defaultMessage: '如有填写此处',
  },
  proxyPasswordPlaceholder: {
    id: 'accountSlider.proxyPasswordPlaceholder',
    defaultMessage: '如有填写此处',
  },
  autoFillPlaceholder: {
    id: 'accountSlider.autoFillPlaceholder',
    defaultMessage: '粘贴ip信息到这里会自动解析下面格式',
  },
  cookieAutoFillPlaceholder: {
    id: 'accountSlider.cookieAutoFillPlaceholder',
    defaultMessage:
      '支持数组包含JSON格式的Cookie，例如\n[(“name”:“name”,“value”:“value”,“domain”:“domain”)]',
  },
  proxyCheckDesc: {
    id: 'accountSlider.proxyCheckDesc',
    defaultMessage: '设置代理后请先检测',
  },
  cookieHint: {
    id: 'accountSlider.cookieHint',
    defaultMessage: '用于登录会话时使用',
  },
  proxySettings: {
    id: 'accountSlider.proxySettings',
    defaultMessage: '代理设置',
  },
  proxyAutoFill: {
    id: 'accountSlider.proxyAutoFill',
    defaultMessage: '代理自动填充',
  },
  proxyHost: {
    id: 'accountSlider.proxyHost',
    defaultMessage: '地址',
  },
  proxyPort: {
    id: 'accountSlider.proxyPort',
    defaultMessage: '端口',
  },
  proxyUser: {
    id: 'accountSlider.proxyUser',
    defaultMessage: '用户名',
  },
  proxyPassword: {
    id: 'accountSlider.proxyPassword',
    defaultMessage: '密码',
  },
  proxyCheck: {
    id: 'accountSlider.proxyCheck',
    defaultMessage: '点击检测',
  },
  cookieSettings: {
    id: 'accountSlider.cookieSettings',
    defaultMessage: 'Cookie设置',
  },
  cookieAutoFill: {
    id: 'accountSlider.cookieAutoFill',
    defaultMessage: 'Cookie自动填充',
  },
  cookiePlaceholder: {
    id: 'accountSlider.cookiePlaceholder',
    defaultMessage: '请输入Cookie内容',
  },
  proxyRestartInfo: {
    id: 'accountSlider.proxyRestartInfo',
    defaultMessage: '修改代理设置后，需重新启动软件生效',
  },
  proxyRiskWarning: {
    id: 'accountSlider.proxyRiskWarning',
    defaultMessage: '建议打开代理，关闭代理会有风险哦～',
  },
  autoFillLabel: {
    id: 'accountSlider.autoFillLabel',
    defaultMessage: '自动填充',
  },
  clickCheckDesc: {
    id: 'accountSlider.clickCheckDesc',
    defaultMessage: '代理自动填充功能，开启后，绑定账号将自动获取代理内容',
  },
  cancel: {
    id: 'accountSlider.cancel',
    defaultMessage: '取消',
  },
  confirm: {
    id: 'accountSlider.confirm',
    defaultMessage: '确认',
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
  proxyHost: string;
  proxyPort: string;
  proxyUser: string;
  proxyPassword: string;
  cookieAutoFill: boolean;
  cookie: string;
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
}

@inject('stores', 'actions')
@observer
class AccountSlider extends Component<IProps, IAccountSliderState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      activeTab: 'all',
      isBindDrawerVisible: false,
      bindForm: {
        remark: '',
        proxyAutoFill: false,
        proxyAutoFillContent: '',
        proxyHost: '',
        proxyPort: '',
        proxyUser: '',
        proxyPassword: '',
        cookieAutoFill: true,
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
          proxyHost: proxy.host || '',
          proxyPort: proxy.port || '',
          proxyUser: proxy.user || '',
          proxyPassword: proxy.password || '',
          cookieAutoFill: true,
          cookie: '',
        },
      });
    } else {
      this.setState({
        isBindDrawerVisible: true,
        editingService: null,
        bindForm: {
          remark: '',
          proxyAutoFill: false,
          proxyAutoFillContent: '',
          proxyHost: '',
          proxyPort: '',
          proxyUser: '',
          proxyPassword: '',
          cookieAutoFill: true,
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
      <div className="flex flex-col h-full bg-container px-[8px] py-[16px] gap-[16px] overflow-hidden">
        <div className="flex flex-row items-start gap-[9px] h-fit flex-shrink-0">
          {tabs.map(tab => {
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
              <span className="text-[18px] font-semibold text-[#1f2329]">
                {intl.formatMessage(messages.bindAccountDialogTitle)}
              </span>
              <CloseIcon
                className="w-[16px] h-[16px] text-[#666] cursor-pointer"
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
            <div className="flex items-center justify-end h-full px-[24px] gap-[12px] border-t border-[#e7e7e7]">
              <Button
                theme="default"
                variant="base"
                className="!w-[80px] !h-[40px] !bg-[#F2F3F5] !text-[#333] border-none"
                onClick={this.closeBindDrawer}
              >
                {intl.formatMessage(messages.cancel)}
              </Button>
              <Button
                theme="primary"
                className="!w-[88px] !h-[40px] !bg-[#0052D9]"
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
                <div className="text-[16px] font-semibold text-[#1f2329] mb-[24px]">
                  {intl.formatMessage(messages.basicSettings)}
                </div>
                <div className="flex items-start gap-x-[12px] mb-[20px]">
                  <div className="w-[82px] pt-[8px] text-[14px] text-[#333]">
                    {intl.formatMessage(messages.accountRemark)}
                  </div>
                  <div className="relative w-[406px]">
                    <Input
                      className="!h-[40px] !border-[#dcdcdc]"
                      placeholder={intl.formatMessage(
                        messages.accountRemarkPlaceholder,
                      )}
                      value={this.state.bindForm.remark}
                      onChange={val => this.handleBindFormChange('remark', val)}
                    />
                    <span className="absolute right-[12px] top-[10px] text-[12px] text-[#0052d9]">
                      {this.state.bindForm.remark.length}/10
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-[40px]">
                <div className="flex items-center gap-x-[12px] mb-[24px]">
                  <span className="text-[16px] font-semibold text-[#1f2329]">
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
                      <ErrorCircleFilledIcon className="w-[16px] h-[16px] text-[#ed7b2f]" />
                      <span className="text-[12px] text-[#999]">
                        {intl.formatMessage(messages.proxyRiskWarning)}
                      </span>
                    </div>
                  )}
                </div>

                {this.state.bindForm.proxyAutoFill && (
                  <>
                    <div className="flex items-start gap-x-[12px] mb-[20px]">
                      <div className="w-[82px] pt-[8px] text-[14px] text-[#333]">
                        {intl.formatMessage(messages.autoFillLabel)}
                      </div>
                      <div className="w-[406px]">
                        <Textarea
                          className="!h-[132px] !border-[#dcdcdc] !p-[12px]"
                          placeholder={intl.formatMessage(
                            messages.autoFillPlaceholder,
                          )}
                          value={this.state.bindForm.proxyAutoFillContent}
                          onChange={val =>
                            this.handleBindFormChange(
                              'proxyAutoFillContent',
                              val,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-x-[12px] mb-[16px]">
                      <div className="w-[82px] pt-[8px] text-[14px] text-[#333]">
                        {intl.formatMessage(messages.proxyHost)}
                      </div>
                      <Input
                        className="!w-[406px] !h-[40px] !border-[#dcdcdc]"
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
                      <div className="w-[82px] pt-[8px] text-[14px] text-[#333]">
                        {intl.formatMessage(messages.proxyPort)}
                      </div>
                      <Input
                        className="!w-[406px] !h-[40px] !border-[#dcdcdc]"
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
                      <div className="w-[82px] pt-[8px] text-[14px] text-[#333]">
                        {intl.formatMessage(messages.proxyUser)}
                      </div>
                      <Input
                        className="!w-[406px] !h-[40px] !border-[#dcdcdc]"
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
                      <div className="w-[82px] pt-[8px] text-[14px] text-[#333]">
                        {intl.formatMessage(messages.proxyPassword)}
                      </div>
                      <Input
                        type="password"
                        className="!w-[406px] !h-[40px] !border-[#dcdcdc]"
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
                        className="!w-[118px] !h-[40px] !bg-[#0052D9] !text-white !font-medium"
                        onClick={() => {}}
                      >
                        {intl.formatMessage(messages.proxyCheck)}
                      </Button>
                      <div className="mt-[8px] text-[12px] text-[#999]">
                        {intl.formatMessage(messages.clickCheckDesc)}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div>
                <div className="flex items-center justify-start gap-[12px] w-full mb-[24px]">
                  <span className="text-[16px] font-semibold text-[#1f2329]">
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
                      className="!w-[406px] min-h-[148px] !border-[#dcdcdc] !p-[12px] self-end"
                      placeholder={intl.formatMessage(
                        messages.cookiePlaceholder,
                      )}
                      value={this.state.bindForm.cookie}
                      onChange={val => this.handleBindFormChange('cookie', val)}
                    />
                    <div className="mt-[8px] text-[12px] text-[#999] self-end w-[406px]">
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
