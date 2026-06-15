import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import {
  BookOpenFilledIcon,
  BookOpenIcon,
  ChatBubble1FilledIcon,
  ChatBubble1Icon,
  HomeFilledIcon,
  HomeIcon,
} from 'tdesign-icons-react';
import { Badge } from 'tdesign-react';

import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import type { Stores } from '../../@types/stores.types';
import { navigationStore } from '../../stores/NavigationStore';
import type { FerdiumModule } from '../../stores/NavigationStore';

const MODULES: {
  id: FerdiumModule;
  activeIcon: ReactElement;
  inactiveIcon: ReactElement;
}[] = [
  {
    id: 'home',
    activeIcon: <HomeFilledIcon size="24px" />,
    inactiveIcon: <HomeIcon size="24px" />,
  },
  {
    id: 'service-type',
    activeIcon: <ChatBubble1FilledIcon size="24px" />,
    inactiveIcon: <ChatBubble1Icon size="24px" />,
  },
  {
    id: 'knowledge-base',
    activeIcon: <BookOpenFilledIcon size="24px" />,
    inactiveIcon: <BookOpenIcon size="24px" />,
  },
];

const messages = defineMessages({
  home: {
    id: 'mainModuleTabs.home',
    defaultMessage: 'Home',
  },
  serviceType: {
    id: 'mainModuleTabs.serviceType',
    defaultMessage: 'WA Tools',
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

@inject('stores')
@observer
class MainModuleTabs extends Component<IProps & WrappedComponentProps> {
  render(): ReactElement {
    const { stores, intl } = this.props;
    const badge = stores?.services.mainModuleBadge;

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
                  count={mod.id === 'service-type' ? badge : null}
                  size="small"
                  offset={[0, 0]}
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

        <img
          src="./assets/images/sidebar-ai-bot.png"
          alt={intl.formatMessage(messages.aiAssistant)}
          className="w-[40px]"
        />
      </nav>
    );
  }
}

export default injectIntl(MainModuleTabs);
