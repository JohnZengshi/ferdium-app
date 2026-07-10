import { inject, observer } from 'mobx-react';
import { Component } from 'react';
import type { ReactElement } from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import type { WrappedComponentProps } from 'react-intl';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { AddIcon } from 'tdesign-icons-react';
import { Badge, Button, Empty, MessagePlugin } from 'tdesign-react';
import type { Actions } from '../../actions/lib/actions';
import { TELEGRAM_RECIPE_ID } from '../../config';
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
  bindAccount: {
    id: 'telegramAccountSlider.bindAccount',
    defaultMessage: 'Add Account',
  },
  updateSuccess: {
    id: 'telegramAccountMgmt.updateSuccess',
    defaultMessage: 'Update successful',
  },
  addSuccess: {
    id: 'telegramAccountMgmt.addSuccess',
    defaultMessage: 'Added successfully',
  },
});

interface TelegramSliderItemProps {
  service: Service;
  actions?: Actions;
  onContextMenu: (service: Service) => void;
}

const TelegramSliderItem = SortableElement<TelegramSliderItemProps>(
  observer(({ service, actions, onContextMenu }: TelegramSliderItemProps) => (
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
        <span className="text-[14px] text-secondary leading-[22px] truncate w-full">
          {service.id}
        </span>
      </div>
    </ServiceSliderItemShell>
  )),
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
    const filtered = stores?.services?.telegramServices ?? [];
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

  handleBindConfirm = (data: { name: string; proxy: ServiceProxy }) => {
    const { actions } = this.props;
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
        content: this.props.intl.formatMessage(messages.updateSuccess),
        duration: 3000,
      });
    } else {
      actions?.service?.createService?.({
        recipeId: TELEGRAM_RECIPE_ID,
        serviceData: {
          name: data.name || 'Telegram',
          proxy: data.proxy,
          isHibernationEnabled: true,
        },
        redirect: false,
      });
      MessagePlugin.success({
        content: this.props.intl.formatMessage(messages.addSuccess),
        duration: 3000,
      });
    }

    this.closeBindDrawer();
  };

  render(): ReactElement {
    const { stores, actions, intl } = this.props;
    const telegramServices = stores?.services?.telegramServices ?? [];

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
          <Badge
            count={telegramServices.length > 0 || null}
            size="small"
            offset={[10, 0]}
            className="flex-1 min-w-0 [&_.t-badge--circle]:!bg-brand"
          >
            <Button
              className="h-[32px] w-full min-w-0"
              theme="default"
              variant="base"
            >
              <div className="flex items-center gap-[8px] justify-center">
                <img
                  src="./assets/images/sidebar-services.svg"
                  className="w-[16px] h-[16px] [.compact-mode_&]:hidden"
                  alt=""
                />
                <span className="text-[14px] font-normal leading-[22px] text-brand">
                  {intl.formatMessage(messages.tabAll)}
                </span>
              </div>
            </Button>
          </Badge>
        </div>
        <Button
          height="40px"
          className="rounded-[6px] flex-shrink-0"
          icon={<AddIcon />}
          onClick={() => this.openBindDrawer()}
        >
          {intl.formatMessage(messages.bindAccount)}
        </Button>

        {telegramServices.length > 0 ? (
          <TelegramSliderList
            services={telegramServices}
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
