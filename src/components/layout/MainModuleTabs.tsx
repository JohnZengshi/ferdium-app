import { inject, observer } from 'mobx-react';
import { type CSSProperties, Component, type ReactElement } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';

import { Badge } from 'tdesign-react';

import type { Stores } from '../../@types/stores.types';
import { navigationStore } from '../../stores/NavigationStore';
import type { FerdiumModule } from '../../stores/NavigationStore';

const iconMask = (src: string): CSSProperties => ({
  mask: `url(${src}) center / contain no-repeat`,
  WebkitMask: `url(${src}) center / contain no-repeat`,
});

const ChatWsIcon = (): ReactElement => (
  <span
    className="block h-[24px] w-[24px] bg-current"
    style={iconMask('./assets/icons/chat-ws.svg')}
  />
);

const CollectionIcon = (): ReactElement => (
  <span
    className="block h-[24px] w-[24px] bg-current"
    style={iconMask('./assets/icons/collection.svg')}
  />
);

const HomeTabIcon = (): ReactElement => (
  <span
    className="block h-[24px] w-[24px] bg-current"
    style={iconMask('./assets/icons/home.svg')}
  />
);

const MODULES: {
  id: FerdiumModule;
  activeIcon: ReactElement;
  inactiveIcon: ReactElement;
}[] = [
  {
    id: 'home',
    activeIcon: <HomeTabIcon />,
    inactiveIcon: <HomeTabIcon />,
  },
  {
    id: 'service-type',
    activeIcon: <ChatWsIcon />,
    inactiveIcon: <ChatWsIcon />,
  },
  {
    id: 'knowledge-base',
    activeIcon: <CollectionIcon />,
    inactiveIcon: <CollectionIcon />,
  },
];

const messages = defineMessages({
  home: {
    id: 'mainModuleTabs.home',
    defaultMessage: 'Home',
  },
  serviceType: {
    id: 'mainModuleTabs.serviceType',
    defaultMessage: 'Whats',
  },
  knowledgeBase: {
    id: 'mainModuleTabs.knowledgeBase',
    defaultMessage: 'Knowledge',
  },
  aiAssistant: {
    id: 'mainModuleTabs.aiAssistant',
    defaultMessage: 'AI Assistant',
  },
});

interface IProps {
  stores?: Stores;
}

const formatHandoffBadge = (total: number): string | null => {
  if (total <= 0) return null;
  if (total > 99) return '99+';
  return String(total);
};

@inject('stores')
@observer
class MainModuleTabs extends Component<IProps & WrappedComponentProps> {
  render(): ReactElement {
    const { stores, intl } = this.props;
    const badge = stores?.services.mainModuleBadge;
    const handoffBadge = formatHandoffBadge(stores?.handoff.unreadCount ?? 0);

    return (
      <nav className="flex flex-col items-center w-[88px] py-[24px] h-full min-h-0 bg-container border-r border-solid border-line">
        <img src="./assets/images/sidebar-logo.svg" alt="logo" />

        <div className="flex flex-col items-center h-fit my-auto gap-[4px] w-[64px] p-[8px] rounded-xl shadow-[0px_5px_5px_-3px_rgba(0,0,0,0.10),0px_8px_10px_1px_rgba(0,0,0,0.06),0px_3px_14px_2px_rgba(0,0,0,0.05)]">
          {MODULES.map(mod => {
            const isActive = navigationStore.activeModule === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                className="relative flex flex-col items-center justify-center gap-0.5 border-0 bg-transparent cursor-pointer"
                onClick={() => {
                  navigationStore.setModule(mod.id);
                }}
              >
                <Badge
                  count={
                    mod.id === 'service-type'
                      ? badge
                      : mod.id === 'home'
                        ? handoffBadge
                        : null
                  }
                  size="small"
                  offset={[5, 5]}
                >
                  {isActive ? (
                    <span className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-brand-light text-brand">
                      {mod.activeIcon}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center w-[48px] h-[48px] text-secondary">
                      {mod.inactiveIcon}
                    </span>
                  )}
                </Badge>
                <span
                  className={`text-[12px] leading-5 whitespace-nowrap ${isActive ? 'text-brand' : 'text-secondary'}`}
                >
                  {intl.formatMessage(
                    (
                      {
                        home: messages.home,
                        'service-type': messages.serviceType,
                        'knowledge-base': messages.knowledgeBase,
                      } as const
                    )[mod.id],
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {false && (
          <img
            src="./assets/images/sidebar-ai-bot.png"
            alt={intl.formatMessage(messages.aiAssistant)}
            className="w-[40px]"
          />
        )}
        <div className="w-[40px]" />
      </nav>
    );
  }
}

export default injectIntl(MainModuleTabs);
