import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import { type WrappedComponentProps, defineMessages, injectIntl } from 'react-intl';
import type { Actions } from '../../actions/lib/actions';
import type { RealStores } from '../../stores';

import { navigationStore } from '../../stores/NavigationStore';
import type { ServiceSubTab } from '../../stores/NavigationStore';

const messages = defineMessages({
  tabMessages: { id: 'serviceSubTabs.messages', defaultMessage: '消息' },
  tabAccount: { id: 'serviceSubTabs.account', defaultMessage: '账号管理' },
  tabProfile: { id: 'serviceSubTabs.profile', defaultMessage: '用户画像' },
  whatsappHeader: { id: 'serviceSubTabs.whatsappHeader', defaultMessage: 'Whatsapp' },
  expand: { id: 'serviceSubTabs.expand', defaultMessage: 'expand' },
  collapse: { id: 'serviceSubTabs.collapse', defaultMessage: 'collapse' },
});

const SUB_TABS: {
  id: ServiceSubTab;
  labelKey: string;
  icon: string;
  iconActive: string;
}[] = [
  {
    id: 'messages',
    labelKey: 'tabMessages',
    icon: './assets/images/service-subtab-messages.svg',
    iconActive: './assets/images/service-subtab-messages.svg',
  },
  {
    id: 'account',
    labelKey: 'tabAccount',
    icon: './assets/images/service-subtab-account.svg',
    iconActive: './assets/images/service-subtab-account.svg',
  },
  {
    id: 'profile',
    labelKey: 'tabProfile',
    icon: './assets/images/service-subtab-profile.svg',
    iconActive: './assets/images/service-subtab-profile.svg',
  },
];

interface ServiceSubTabsState {
  isCollapsed: boolean;
}

interface ServiceSubTabsProps {
  stores?: RealStores;
  actions?: Actions;
}

@inject('stores', 'actions')
@observer
class ServiceSubTabs extends Component<
  ServiceSubTabsProps & WrappedComponentProps,
  ServiceSubTabsState
> {
  constructor(props: ServiceSubTabsProps & WrappedComponentProps) {
    super(props);
    this.state = {
      isCollapsed: props.stores?.settings.all.app.isMenuCollapsed ?? false,
    };
  }

  toggleCollapse = () => {
    this.props.actions?.app.toggleCollapseMenu();
    this.setState(prevState => ({ isCollapsed: !prevState.isCollapsed }));
  };

  render(): ReactElement {
    const { isCollapsed } = this.state;
    const { intl } = this.props;
    return (
      <nav
        className={`flex flex-col h-full bg-container border-r border-solid border-line overflow-hidden transition-all ${isCollapsed ? 'min-w-[64px]' : 'min-w-[232px]'}`}
      >
        {/* Header */}
        <div
          className={`flex h-fit items-center pt-[15px] pb-[21px] ${isCollapsed ? 'justify-center' : 'justify-between px-[8px]'}`}
        >
          {!isCollapsed && (
            <span className="text-[18px] font-semibold leading-[26px] text-primary">
              {intl.formatMessage(messages.whatsappHeader)}
            </span>
          )}
          <button
            type="button"
            aria-label={intl.formatMessage(isCollapsed ? messages.expand : messages.collapse)}
            className="flex items-center justify-center w-[24px] h-[24px] p-0 border-0 bg-transparent cursor-pointer"
            onClick={this.toggleCollapse}
          >
            <img
              src="./assets/images/service-subtabs-collapse.svg"
              alt=""
              className={`w-[24px] h-[24px] transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
              style={{
                transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>
        </div>

        {/* Tab items */}
        <div
          className={`flex flex-col gap-[4px] ${isCollapsed ? 'items-center' : 'px-[8px]'}`}
        >
          {SUB_TABS.map(tab => {
            const isActive = navigationStore.activeServiceTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`relative flex items-center rounded-[3px] border-0 cursor-pointer transition-colors ${
                  isCollapsed
                    ? 'justify-center w-[48px] h-[48px]'
                    : 'gap-[8px] px-[16px] py-[7px] text-left'
                } ${
                  isActive
                    ? 'bg-brand-light text-brand'
                    : 'bg-container text-secondary hover:bg-secondary-container'
                }`}
                onClick={() => {
                  navigationStore.setServiceTab(tab.id);
                }}
              >
                <span
                  className={`flex items-center justify-center w-[20px] h-[20px] ${isActive ? 'text-brand' : 'text-secondary'}`}
                  style={{
                    maskImage: `url(${isActive ? tab.iconActive : tab.icon})`,
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    WebkitMaskImage: `url(${isActive ? tab.iconActive : tab.icon})`,
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    backgroundColor: 'currentColor',
                  }}
                />
                {!isCollapsed && (
                  <span className="flex-1 text-[14px] leading-[22px] whitespace-nowrap">
                    {intl.formatMessage(messages[tab.labelKey as keyof typeof messages])}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }
}

export default injectIntl(ServiceSubTabs);
