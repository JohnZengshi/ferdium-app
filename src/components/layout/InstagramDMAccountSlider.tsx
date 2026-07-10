import { inject, observer } from 'mobx-react';
import { Component } from 'react';
import type { ReactElement } from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import type { WrappedComponentProps } from 'react-intl';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { AddIcon } from 'tdesign-icons-react';
import { Badge, Button, Empty, MessagePlugin } from 'tdesign-react';
import type { Actions } from '../../actions/lib/actions';
import { INSTAGRAM_DM_RECIPE_ID } from '../../config';
import { openServiceContextMenu } from '../../helpers/service-context-menu';
import type Service from '../../models/Service';
import type { RealStores } from '../../stores';
import EditServiceDrawer from '../ui/EditServiceDrawer';
import type { ServiceProxy } from '../ui/EditServiceDrawer';
import { ResizableSidebar } from './ResizableSidebar';
import { ServiceSliderItemShell } from './ServiceSliderItemShell';

const messages = defineMessages({
  tabAll: {
    id: 'instagramAccountSlider.tabAll',
    defaultMessage: 'All',
  },
  bindAccount: {
    id: 'instagramAccountSlider.bindAccount',
    defaultMessage: 'Add Account',
  },
  updateSuccess: {
    id: 'instagramAccountMgmt.updateSuccess',
    defaultMessage: 'Update successful',
  },
  addSuccess: {
    id: 'instagramAccountMgmt.addSuccess',
    defaultMessage: 'Added successfully',
  },
});

interface IProps extends WrappedComponentProps {
  stores?: RealStores;
  actions?: Actions;
}

interface IState {
  activeTab: string;
  drawerVisible: boolean;
  editingServiceId: string | null;
}

interface InstagramSliderItemProps {
  service: Service;
  actions?: Actions;
  onContextMenu: (service: Service) => void;
}

const InstagramSliderItem = SortableElement<InstagramSliderItemProps>(
  observer(({ service, actions, onContextMenu }: InstagramSliderItemProps) => (
    <ServiceSliderItemShell
      service={service}
      actions={actions}
      onContextMenu={onContextMenu}
      moduleId="instagramDM"
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

interface InstagramSliderListProps {
  services: Service[];
  actions?: Actions;
  onContextMenu: (service: Service) => void;
  onSortEnd: (result: { oldIndex: number; newIndex: number }) => void;
  distance: number;
  axis: string;
  lockAxis: string;
  helperClass: string;
}

const InstagramSliderList = SortableContainer<InstagramSliderListProps>(
  observer(({ services, actions, onContextMenu }: InstagramSliderListProps) => (
    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-[12px]">
      {services.map((service, index) => (
        <InstagramSliderItem
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

@inject('stores', 'actions')
@observer
class InstagramDMAccountSlider extends Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      activeTab: 'all',
      drawerVisible: false,
      editingServiceId: null,
    };
  }

  setActiveTab = (tabId: string) => {
    this.setState({ activeTab: tabId });
  };

  openBindDrawer = () => {
    this.setState({ drawerVisible: true, editingServiceId: null });
  };

  handleEditClose = () => {
    this.setState({ drawerVisible: false, editingServiceId: null });
  };

  handleEditConfirm = async (data: {
    name: string;
    proxy: ServiceProxy | null;
  }) => {
    const { actions } = this.props;
    const { editingServiceId } = this.state;

    if (!actions) return;

    if (editingServiceId) {
      // Update existing service
      await actions.service.updateService({
        serviceId: editingServiceId,
        serviceData: {
          name: data.name,
          proxy: data.proxy,
        },
        redirect: false,
      });
      MessagePlugin.success(
        this.props.intl.formatMessage(messages.updateSuccess),
      );
    } else {
      // Create new service
      await actions.service.createService({
        recipeId: INSTAGRAM_DM_RECIPE_ID,
        serviceData: {
          name: data.name,
          proxy: data.proxy,
        },
      });
      MessagePlugin.success(
        this.props.intl.formatMessage(messages.addSuccess),
      );
    }

    this.handleEditClose();
  };

  handleContextMenu = (service: Service) => {
    const { actions } = this.props;
    openServiceContextMenu(
      service,
      actions,
      () => {
        this.setState({
          drawerVisible: true,
          editingServiceId: service.id,
        });
      },
      `Service ID (${service.id})`,
    );
  };

  onSortEnd = ({
    oldIndex,
    newIndex,
  }: {
    oldIndex: number;
    newIndex: number;
  }) => {
    const { actions, stores } = this.props;
    if (!actions || !stores) return;

    const services = stores.services.instagramServices;
    if (oldIndex === newIndex || !services[oldIndex] || !services[newIndex]) {
      return;
    }

    actions.service.reorder({
      oldIndex,
      newIndex,
    });
  };

  render(): ReactElement {
    const { stores, actions, intl } = this.props;
    const { activeTab, drawerVisible, editingServiceId } = this.state;

    const services = stores?.services.instagramServices || [];
    const editingService = services.find(s => s.id === editingServiceId);

    const tabs = [
      {
        id: 'all',
        label: intl.formatMessage(messages.tabAll),
        count: services.length,
      },
    ];

    const filteredServices = services;

    return (
      <ResizableSidebar
        defaultWidth={320}
        onWidthChange={() => {}}
        minWidth={240}
      >
        <div className="flex flex-col h-full p-[16px] gap-[12px]">
          <div className="flex gap-[8px] items-center flex-wrap">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <Badge key={tab.id} count={tab.count} offset={[8, 0]}>
                  <Button
                    size="small"
                    theme="default"
                    variant={isActive ? 'base' : 'text'}
                    onClick={() => this.setActiveTab(tab.id)}
                  >
                    <span className="text-[14px]">{tab.label}</span>
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
            <InstagramSliderList
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
            <div className="flex items-center justify-center flex-1">
              <Empty description="No accounts" />
            </div>
          )}
        </div>

        <EditServiceDrawer
          key={editingServiceId ?? 'closed'}
          visible={drawerVisible}
          initialData={
            editingService
              ? {
                  name: editingService.name,
                  proxy: editingService.proxy as ServiceProxy | null,
                  cookie: '',
                }
              : null
          }
          onClose={this.handleEditClose}
          onConfirm={this.handleEditConfirm}
        />
      </ResizableSidebar>
    );
  }
}

export default injectIntl(InstagramDMAccountSlider);

