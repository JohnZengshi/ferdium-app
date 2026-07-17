import { inject, observer } from 'mobx-react';
import { Component, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import type { IntlShape, WrappedComponentProps } from 'react-intl';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { AddIcon } from 'tdesign-icons-react';
import {
  Badge,
  Button,
  DialogPlugin,
  Empty,
  Form,
  MessagePlugin,
  Select,
} from 'tdesign-react';
import type { Actions } from '../../actions/lib/actions';
import { SUPPRESS_ERROR_TOAST } from '../../agent-flow-cs/api/customInstance';
import { listDigitalHumansApiV1DigitalHumansGet } from '../../agent-flow-cs/api/generated/digital-humans/digital-humans';
import {
  createTelegramBindingApiV1TelegramBindPost,
  getTelegramBindingApiV1TelegramBindGet,
  switchTelegramBindingDigitalHumanApiV1TelegramBindPatch,
} from '../../agent-flow-cs/api/generated/telegram/telegram';
import { openServiceContextMenu } from '../../helpers/service-context-menu';
import type Service from '../../models/Service';
import type { RealStores } from '../../stores';
import EditServiceDrawer from '../ui/EditServiceDrawer';
import type { ServiceProxy } from '../ui/EditServiceDrawer';
import { ResizableSidebar } from './ResizableSidebar';
import { ServiceSliderItemShell } from './ServiceSliderItemShell';

const messages = defineMessages({
  tabAll: {
    id: 'telegramAccountSlider.tabAll',
    defaultMessage: 'All',
  },
  tabOnline: {
    id: 'telegramAccountSlider.tabOnline',
    defaultMessage: 'Online',
  },
  tabOffline: {
    id: 'telegramAccountSlider.tabOffline',
    defaultMessage: 'Offline',
  },
  tabError: {
    id: 'telegramAccountSlider.tabError',
    defaultMessage: 'Error',
  },
  bindAccount: {
    id: 'telegramAccountSlider.bindAccount',
    defaultMessage: 'Add Account',
  },
  updateSuccess: {
    id: 'telegramAccountMgmt.updateSuccess',
    defaultMessage: 'Update successful',
  },
  bindPersona: {
    id: 'telegramAccountSlider.bindPersona',
    defaultMessage: 'Bind',
  },
  bindPersonaDialogTitle: {
    id: 'telegramAccountSlider.bindPersonaDialogTitle',
    defaultMessage: 'Bind Telegram Account Persona Profile',
  },
  selectPersona: {
    id: 'telegramAccountSlider.selectPersona',
    defaultMessage: 'Select Persona',
  },
  selectPersonaPlaceholder: {
    id: 'telegramAccountSlider.selectPersonaPlaceholder',
    defaultMessage: 'Please select a persona',
  },
  personaHint: {
    id: 'telegramAccountSlider.personaHint',
    defaultMessage:
      '提示：如没有人设资料，请在左侧菜单资料库中社交人设中添加资料后进行绑定',
  },
  confirmText: {
    id: 'telegramAccountSlider.confirmText',
    defaultMessage: 'Confirm',
  },
  selectPersonaFirst: {
    id: 'telegramAccountSlider.selectPersonaFirst',
    defaultMessage: 'Please select a persona first',
  },
  bindPersonaSuccess: {
    id: 'telegramAccountSlider.bindPersonaSuccess',
    defaultMessage: 'Persona bound successfully',
  },
  bindPersonaFailed: {
    id: 'telegramAccountSlider.bindPersonaFailed',
    defaultMessage: 'Failed to bind persona',
  },
  cancel: {
    id: 'telegramAccountSlider.cancel',
    defaultMessage: 'Cancel',
  },
  personaFallback: {
    id: 'telegramAccountSlider.personaFallback',
    defaultMessage: '人设',
  },
});

const TAB_IDS = ['all', 'online', 'offline', 'error'] as const;
type TabId = (typeof TAB_IDS)[number];
type AccountStatus = Exclude<TabId, 'all'>;

const getTabs = (intl: IntlShape) => [
  { id: 'all' as const, label: intl.formatMessage(messages.tabAll) },
  { id: 'online' as const, label: intl.formatMessage(messages.tabOnline) },
  { id: 'offline' as const, label: intl.formatMessage(messages.tabOffline) },
  { id: 'error' as const, label: intl.formatMessage(messages.tabError) },
];

const tabTextColor = (id: TabId) =>
  ({
    all: 'text-brand',
    online: 'text-success',
    offline: 'text-warning',
    error: 'text-error',
  })[id];
const tabBadgeBgColor = (id: TabId) =>
  ({
    all: '[&_.t-badge--circle]:!bg-brand',
    online: '[&_.t-badge--circle]:!bg-success',
    offline: '[&_.t-badge--circle]:!bg-warning',
    error: '[&_.t-badge--circle]:!bg-error',
  })[id];

const getTelegramStatus = (
  service: Service,
  channelStatus?: string,
): AccountStatus => {
  if (
    service.hasCrashed ||
    service.isError ||
    service.lostRecipeConnection ||
    channelStatus === 'error'
  )
    return 'error';
  if (!service.isEnabled || channelStatus !== 'authorized') return 'offline';
  return 'online';
};

interface TelegramSliderItemProps {
  service: Service;
  actions?: Actions;
  onContextMenu: (service: Service) => void;
}

const TelegramSliderItem = SortableElement<TelegramSliderItemProps>(
  injectIntl(
    observer(
      ({
        service,
        actions,
        onContextMenu,
        intl,
      }: TelegramSliderItemProps & WrappedComponentProps): ReactElement => {
        const [boundPersonaName, setBoundPersonaName] = useState<string>('');
        const [isLoadingBinding, setIsLoadingBinding] = useState<boolean>(true);
        const personaLabel = intl.formatMessage(messages.personaFallback);

        useEffect(() => {
          let cancelled = false;
          const loadBinding = async () => {
            try {
              const bindRes = await getTelegramBindingApiV1TelegramBindGet(
                { instance_id: service.id },
                SUPPRESS_ERROR_TOAST,
              );
              if (
                cancelled ||
                bindRes.status !== 200 ||
                !bindRes.data?.digital_human_id
              )
                return;
              const boundId = bindRes.data.digital_human_id;
              try {
                const listRes = await listDigitalHumansApiV1DigitalHumansGet();
                if (cancelled || listRes.status !== 200) return;
                const found = listRes.data.find(dh => dh.id === boundId);
                setBoundPersonaName(found?.name ?? '');
              } catch {
                /* best-effort */
              }
            } catch {
              /* best-effort */
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
          <ServiceSliderItemShell
            service={service}
            actions={actions}
            onContextMenu={onContextMenu}
            moduleId="telegram"
          >
            <div className="flex flex-col items-start justify-center gap-[4px] h-fit flex-auto min-w-0">
              <span className="text-[16px] font-normal leading-[26px] text-primary truncate w-full">
                {service.name}
              </span>
              <div className="flex items-center gap-[4px] w-full">
                <span className="text-[14px] text-secondary leading-[22px] truncate">
                  {personaLabel}
                </span>
                <Button
                  variant="outline"
                  className="!h-[20px] !min-w-[37px] text-[12px] !px-[4px] ml-auto"
                  ghost
                  theme={boundPersonaName ? 'primary' : 'success'}
                  loading={isLoadingBinding}
                  onClick={async event => {
                    event.stopPropagation();
                    let options: { label: string; value: string }[] = [];
                    try {
                      const res =
                        await listDigitalHumansApiV1DigitalHumansGet();
                      if (res.status !== 200) {
                        MessagePlugin.error('获取人设列表失败');
                        return;
                      }
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
                            ? switchTelegramBindingDigitalHumanApiV1TelegramBindPatch(
                                {
                                  digital_human_id: selectedPersonaId,
                                  instance_id: service.id,
                                },
                              )
                            : createTelegramBindingApiV1TelegramBindPost({
                                instance_id: service.id,
                                digital_human_id: selectedPersonaId,
                              }));
                          setBoundPersonaName(
                            options.find(o => o.value === selectedPersonaId)
                              ?.label ?? '',
                          );
                          MessagePlugin.success(
                            intl.formatMessage(messages.bindPersonaSuccess),
                          );
                          service.webview?.send('tg-ai-persona-bound-host');
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
          </ServiceSliderItemShell>
        );
      },
    ),
  ),
);

interface TelegramSliderListProps {
  services: Service[];
  actions?: Actions;
  onContextMenu: (service: Service) => void;
  onSortEnd: (result: { oldIndex: number; newIndex: number }) => void;
  distance: number;
  axis: string;
  lockAxis: string;
  helperClass: string;
}

const TelegramSliderList = SortableContainer<TelegramSliderListProps>(
  observer(({ services, actions, onContextMenu }: TelegramSliderListProps) => (
    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-[12px]">
      {services.map((service, index) => (
        <TelegramSliderItem
          key={service.id}
          index={index}
          service={service}
          actions={actions}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  )),
);

interface IProps extends WrappedComponentProps {
  stores?: RealStores;
  actions?: Actions;
}

type ServiceDrawerData = Service & {
  proxy?: ServiceProxy | null;
  cookie?: string;
};

interface ITelegramAccountSliderState {
  activeTab: TabId;
  isBindDrawerVisible: boolean;
  editingService: ServiceDrawerData | null;
  bindDrawerKey: number;
}

@inject('stores', 'actions')
@observer
class TelegramAccountSlider extends Component<
  IProps,
  ITelegramAccountSliderState
> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      activeTab: 'all',
      isBindDrawerVisible: false,
      editingService: null,
      bindDrawerKey: 0,
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
    const channelStatuses = stores?.telegramAutomation?.instanceStatuses;
    const filtered = (stores?.services?.telegramServices ?? []).filter(
      service =>
        activeTab === 'all' ||
        getTelegramStatus(service, channelStatuses?.get(service.id)) ===
          activeTab,
    );
    const all = stores?.services?.all ?? [];

    const service = filtered[oldIndex];
    if (!service) return;

    const realOldIdx = all.indexOf(service);
    const target = filtered[newIndex];
    const realNewIdx = target ? all.indexOf(target) : all.length - 1;

    actions?.service?.reorder?.({
      oldIndex: realOldIdx,
      newIndex: realNewIdx,
    });
  };

  handleContextMenu = (service: Service) => {
    const { actions } = this.props;
    openServiceContextMenu(
      service,
      actions,
      () => this.openBindDrawer(service),
      `Service ID (${service.id})`,
    );
  };

  openBindDrawer = (editingService: ServiceDrawerData | null = null) => {
    this.setState(prev => ({
      isBindDrawerVisible: true,
      editingService,
      bindDrawerKey: prev.bindDrawerKey + 1,
    }));
  };

  closeBindDrawer = () => {
    this.setState({ isBindDrawerVisible: false, editingService: null });
  };

  handleBindConfirm = async (data: { name: string; proxy: ServiceProxy }) => {
    const { actions, intl, stores } = this.props;
    const { editingService } = this.state;

    if (editingService) {
      actions?.service?.updateService?.({
        serviceId: editingService.id,
        serviceData: {
          name: data.name || 'Telegram',
          proxy: data.proxy,
        },
        redirect: false,
      });
      MessagePlugin.success({
        content: intl.formatMessage(messages.updateSuccess),
        duration: 3000,
      });
      this.closeBindDrawer();
      return;
    }

    stores?.telegramAutomation?.beginBinding({
      name: data.name || 'Telegram',
      proxy: data.proxy,
    });
    this.closeBindDrawer();
  };

  render(): ReactElement {
    const { stores, actions, intl } = this.props;
    const { activeTab } = this.state;
    const telegramServices = stores?.services?.telegramServices ?? [];
    const channelStatuses = stores?.telegramAutomation?.instanceStatuses;
    const filteredServices = telegramServices.filter(
      service =>
        activeTab === 'all' ||
        getTelegramStatus(service, channelStatuses?.get(service.id)) ===
          activeTab,
    );
    const tabs = getTabs(intl);

    return (
      <ResizableSidebar
        defaultWidth={
          stores?.settings.all.app.telegramAccountSliderWidth ?? 300
        }
        onWidthChange={width =>
          actions?.settings.update({
            type: 'app',
            data: { telegramAccountSliderWidth: width },
          })
        }
      >
        <div className="flex flex-row items-start gap-[9px] h-fit flex-shrink-0 w-full">
          {tabs.map(tab => {
            const count =
              tab.id === 'all'
                ? telegramServices.length
                : telegramServices.filter(
                    service =>
                      getTelegramStatus(
                        service,
                        channelStatuses?.get(service.id),
                      ) === tab.id,
                  ).length;
            return (
              <Badge
                key={tab.id}
                count={count || null}
                size="small"
                offset={[10, 0]}
                className={`flex-1 min-w-0 ${tabBadgeBgColor(tab.id)}`}
              >
                <Button
                  className="h-[32px] w-full min-w-0"
                  theme="default"
                  variant={activeTab === tab.id ? 'base' : 'text'}
                  onClick={() => this.setState({ activeTab: tab.id })}
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
          <TelegramSliderList
            services={filteredServices}
            actions={actions}
            onContextMenu={this.handleContextMenu}
            onSortEnd={this.onSortEnd}
            distance={20}
            axis="y"
            lockAxis="y"
            helperClass="is-reordering"
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
          key={this.state.bindDrawerKey}
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
          defaultName="Telegram"
        />
      </ResizableSidebar>
    );
  }
}

export default injectIntl(TelegramAccountSlider);
