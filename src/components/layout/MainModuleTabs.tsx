import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';

import { Badge } from 'tdesign-react';

import type { Stores } from '../../@types/stores.types';
import { navigationStore } from '../../stores/NavigationStore';
import type { FerdiumModule } from '../../stores/NavigationStore';

const HomeTabIcon = ({
  isActive,
  isHovered,
}: {
  isActive: boolean;
  isHovered: boolean;
}): ReactElement =>
  isActive ? (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="48" rx="24" fill="var(--td-brand-color-light)" />
      <path
        d="M34 21.5316L24 13.1982L14 21.5316V34H19.5V25.5H28.5V34H34V21.5316Z"
        fill="var(--td-brand-color)"
      />
      <path d="M26.5 34H21.5V27.5H26.5V34Z" fill="var(--td-brand-color)" />
    </svg>
  ) : isHovered ? (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width="48"
        height="48"
        rx="24"
        fill="var(--td-bg-color-component)"
      />
      <path
        d="M24 13.1982L34 21.5316V34H14V21.5316L24 13.1982ZM22 32H26V27H22V32ZM28 32H32V22.4683L24 15.8017L16 22.4683V32H20V25H28V32Z"
        fill="var(--td-text-color-secondary)"
      />
    </svg>
  ) : (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 13.1982L34 21.5316V34H14V21.5316L24 13.1982ZM22 32H26V27H22V32ZM28 32H32V22.4683L24 15.8017L16 22.4683V32H20V25H28V32Z"
        fill="var(--td-text-color-secondary)"
      />
    </svg>
  );

const ChatWsIcon = ({
  isActive,
  isHovered,
}: {
  isActive: boolean;
  isHovered: boolean;
}): ReactElement =>
  isActive ? (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="48" rx="24" fill="var(--td-brand-color-light)" />
      <path
        d="M24 13C30.075 13.0002 35 17.925 35 24C34.9999 30.0749 30.0749 34.9998 24 35H13.2998L15.5186 31.0059C13.9457 29.1037 13.0001 26.6613 13 24C13 17.9249 17.9249 13 24 13ZM21.9951 20.0596H21.5771C21.4376 20.0596 21.1856 20.1156 20.9902 20.3389C20.7948 20.5622 20.2091 21.0926 20.209 22.1807C20.209 23.2691 20.9903 24.3023 21.1299 24.4697C21.2422 24.6104 22.6935 26.8698 24.8975 27.8184C25.4277 28.0416 25.8463 28.1813 26.1533 28.293C26.6836 28.4604 27.1581 28.4318 27.5488 28.376C27.9953 28.3202 28.8603 27.8457 29.0557 27.3154C29.223 26.8132 29.2232 26.3386 29.1953 26.2549C29.1394 26.1157 28.9994 26.0602 28.7764 25.9766C28.5527 25.8647 27.4659 25.3344 27.2422 25.2783C27.0468 25.1946 26.8788 25.1674 26.7393 25.3906C26.5995 25.6139 26.154 26.0872 26.042 26.2549C25.9025 26.3944 25.7906 26.4231 25.5674 26.3115C25.3441 26.1999 24.6463 25.9766 23.7812 25.1953C23.1396 24.6095 22.6656 23.8837 22.5537 23.6602C22.4142 23.437 22.5256 23.3254 22.665 23.2139C22.7766 23.1023 22.8884 22.9627 23 22.8232C23.1116 22.6837 23.1399 22.5995 23.2236 22.46C23.3072 22.3205 23.2511 22.1809 23.1953 22.0693C23.1395 21.9577 22.6935 20.8695 22.498 20.4229C22.3306 19.9763 22.1347 20.0596 21.9951 20.0596Z"
        fill="var(--td-brand-color)"
      />
    </svg>
  ) : isHovered ? (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width="48"
        height="48"
        rx="24"
        fill="var(--td-bg-color-component)"
      />
      <path
        d="M24 15C19.0294 15 15 19.0294 15 24C15 26.3966 15.9354 28.5725 17.4631 30.1862L17.967 30.7185L16.6995 33H24C28.9706 33 33 28.9706 33 24C33 19.0294 28.9706 15 24 15ZM13 24C13 17.9249 17.9249 13 24 13C30.0751 13 35 17.9249 35 24C35 30.0751 30.0751 35 24 35H13.3005L15.5194 31.006C13.9463 29.1038 13 26.6615 13 24Z"
        fill="var(--td-text-color-secondary)"
      />
      <path
        d="M28.7771 25.9767C28.5539 25.8651 27.4655 25.3349 27.2422 25.279C27.0469 25.1953 26.8795 25.1674 26.7399 25.3907C26.6004 25.6139 26.1539 26.0884 26.0422 26.2558C25.9027 26.3953 25.7911 26.4232 25.5678 26.3116C25.3445 26.2 24.6469 25.9767 23.7817 25.1953C23.1399 24.6093 22.6654 23.8837 22.5538 23.6604C22.4143 23.4372 22.5259 23.3255 22.6654 23.2139C22.7771 23.1023 22.8887 22.9627 23.0003 22.8232C23.112 22.6837 23.1399 22.5999 23.2236 22.4604C23.3073 22.3209 23.2515 22.1813 23.1957 22.0697C23.1399 21.9581 22.6933 20.8697 22.498 20.4232C22.3306 19.9766 22.1352 20.0604 21.9957 20.0604H21.5771C21.4375 20.0604 21.1864 20.1162 20.991 20.3394C20.7956 20.5627 20.2096 21.0929 20.2096 22.1813C20.2096 23.2697 20.991 24.3023 21.1305 24.4697C21.2422 24.6093 22.6933 26.8698 24.898 27.8186C25.4283 28.0419 25.8469 28.1814 26.1539 28.293C26.6841 28.4605 27.1585 28.4326 27.5492 28.3768C27.9957 28.3209 28.8609 27.8465 29.0562 27.3163C29.2237 26.8139 29.2237 26.3395 29.1958 26.2558C29.1399 26.1163 29.0004 26.0604 28.7771 25.9767Z"
        fill="var(--td-text-color-secondary)"
      />
    </svg>
  ) : (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 15C19.0294 15 15 19.0294 15 24C15 26.3966 15.9354 28.5725 17.4631 30.1862L17.967 30.7185L16.6995 33H24C28.9706 33 33 28.9706 33 24C33 19.0294 28.9706 15 24 15ZM13 24C13 17.9249 17.9249 13 24 13C30.0751 13 35 17.9249 35 24C35 30.0751 30.0751 35 24 35H13.3005L15.5194 31.006C13.9463 29.1038 13 26.6615 13 24Z"
        fill="var(--td-text-color-secondary)"
      />
      <path
        d="M28.7771 25.9767C28.5539 25.8651 27.4655 25.3349 27.2422 25.279C27.0469 25.1953 26.8795 25.1674 26.7399 25.3907C26.6004 25.6139 26.1539 26.0884 26.0422 26.2558C25.9027 26.3953 25.7911 26.4232 25.5678 26.3116C25.3445 26.2 24.6469 25.9767 23.7817 25.1953C23.1399 24.6093 22.6654 23.8837 22.5538 23.6604C22.4143 23.4372 22.5259 23.3255 22.6654 23.2139C22.7771 23.1023 22.8887 22.9627 23.0003 22.8232C23.112 22.6837 23.1399 22.5999 23.2236 22.4604C23.3073 22.3209 23.2515 22.1813 23.1957 22.0697C23.1399 21.9581 22.6933 20.8697 22.498 20.4232C22.3306 19.9766 22.1352 20.0604 21.9957 20.0604H21.5771C21.4375 20.0604 21.1864 20.1162 20.991 20.3394C20.7956 20.5627 20.2096 21.0929 20.2096 22.1813C20.2096 23.2697 20.991 24.3023 21.1305 24.4697C21.2422 24.6093 22.6933 26.8698 24.898 27.8186C25.4283 28.0419 25.8469 28.1814 26.1539 28.293C26.6841 28.4605 27.1585 28.4326 27.5492 28.3768C27.9957 28.3209 28.8609 27.8465 29.0562 27.3163C29.2237 26.8139 29.2237 26.3395 29.1958 26.2558C29.1399 26.1163 29.0004 26.0604 28.7771 25.9767Z"
        fill="var(--td-text-color-secondary)"
      />
    </svg>
  );

const CollectionIcon = ({
  isActive,
  isHovered,
}: {
  isActive: boolean;
  isHovered: boolean;
}): ReactElement =>
  isActive ? (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="48" rx="24" fill="var(--td-brand-color-light)" />
      <path
        d="M31 16V14H17V16L31 16ZM33 19.5L15 19.5V17.5L33 17.5V19.5ZM35 21V34H13V21L35 21Z"
        fill="var(--td-brand-color)"
      />
    </svg>
  ) : isHovered ? (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width="48"
        height="48"
        rx="24"
        fill="var(--td-bg-color-component)"
      />
      <path
        d="M30 16H31V14H30H18H17V16H18L30 16ZM33 19.5H32L16 19.5H15V17.5L16 17.5L32 17.5H33V19.5ZM35 21V22V33V34H34H14H13V33V22V21H14L34 21H35ZM33 23L15 23L15 32H33V23Z"
        fill="var(--td-text-color-secondary)"
      />
    </svg>
  ) : (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M30 16H31V14H30H18H17V16H18L30 16ZM33 19.5H32L16 19.5H15V17.5L16 17.5L32 17.5H33V19.5ZM35 21V22V33V34H34H14H13V33V22V21H14L34 21H35ZM33 23L15 23L15 32H33V23Z"
        fill="var(--td-text-color-secondary)"
      />
    </svg>
  );

const TelegramTabIcon = ({
  isActive,
  isHovered,
}: {
  isActive: boolean;
  isHovered: boolean;
}): ReactElement => {
  const mask = {
    maskImage: 'url(./assets/images/telegram.svg)',
    WebkitMaskImage: 'url(./assets/images/telegram.svg)',
    maskSize: 'contain' as const,
    WebkitMaskSize: 'contain' as const,
    maskRepeat: 'no-repeat' as const,
    WebkitMaskRepeat: 'no-repeat' as const,
  };

  return (
    <div
      className={`flex items-center justify-center w-[48px] h-[48px] rounded-[24px] ${
        isActive
          ? 'bg-[var(--td-brand-color-light)]'
          : isHovered
            ? 'bg-[var(--td-bg-color-component)]'
            : ''
      }`}
    >
      <span
        className="inline-block w-[24px] h-[24px]"
        style={{
          ...mask,
          backgroundColor: isActive
            ? 'var(--td-brand-color)'
            : 'var(--td-text-color-secondary)',
        }}
      />
    </div>
  );
};

const TikTokTabIcon = ({
  isActive,
  isHovered,
}: {
  isActive: boolean;
  isHovered: boolean;
}): ReactElement => {
  const mask = {
    maskImage: 'url(./assets/images/tiktok.svg)',
    WebkitMaskImage: 'url(./assets/images/tiktok.svg)',
    maskSize: 'contain' as const,
    WebkitMaskSize: 'contain' as const,
    maskRepeat: 'no-repeat' as const,
    WebkitMaskRepeat: 'no-repeat' as const,
  };

  return (
    <div
      className={`flex items-center justify-center w-[48px] h-[48px] rounded-[24px] ${
        isActive
          ? 'bg-[var(--td-brand-color-light)]'
          : isHovered
            ? 'bg-[var(--td-bg-color-component)]'
            : ''
      }`}
    >
      <span
        className="inline-block w-[24px] h-[24px]"
        style={{
          ...mask,
          backgroundColor: isActive
            ? 'var(--td-brand-color)'
            : 'var(--td-text-color-secondary)',
        }}
      />
    </div>
  );
};

const InstagramDMTabIcon = ({
  isActive,
  isHovered,
}: {
  isActive: boolean;
  isHovered: boolean;
}): ReactElement => {
  const mask = {
    maskImage: 'url(./assets/images/instagram-dm.svg)',
    WebkitMaskImage: 'url(./assets/images/instagram-dm.svg)',
    maskSize: 'contain' as const,
    WebkitMaskSize: 'contain' as const,
    maskRepeat: 'no-repeat' as const,
    WebkitMaskRepeat: 'no-repeat' as const,
  };

  return (
    <div
      className={`flex items-center justify-center w-[48px] h-[48px] rounded-[24px] ${
        isActive
          ? 'bg-[var(--td-brand-color-light)]'
          : isHovered
            ? 'bg-[var(--td-bg-color-component)]'
            : ''
      }`}
    >
      <span
        className="inline-block w-[24px] h-[24px]"
        style={{
          ...mask,
          backgroundColor: isActive
            ? 'var(--td-brand-color)'
            : 'var(--td-text-color-secondary)',
        }}
      />
    </div>
  );
};

const MODULES: {
  id: FerdiumModule;
  icon: (isActive: boolean, isHovered: boolean) => ReactElement;
}[] = [
  {
    id: 'home',
    icon: (isActive: boolean, isHovered: boolean) => (
      <HomeTabIcon isActive={isActive} isHovered={isHovered} />
    ),
  },
  {
    id: 'whatsapp',
    icon: (isActive: boolean, isHovered: boolean) => (
      <ChatWsIcon isActive={isActive} isHovered={isHovered} />
    ),
  },
  {
    id: 'telegram',
    icon: (isActive: boolean, isHovered: boolean) => (
      <TelegramTabIcon isActive={isActive} isHovered={isHovered} />
    ),
  },
  {
    id: 'tiktok',
    icon: (isActive: boolean, isHovered: boolean) => (
      <TikTokTabIcon isActive={isActive} isHovered={isHovered} />
    ),
  },
  {
    id: 'instagramDM',
    icon: (isActive: boolean, isHovered: boolean) => (
      <InstagramDMTabIcon isActive={isActive} isHovered={isHovered} />
    ),
  },
  {
    id: 'knowledge-base',
    icon: (isActive: boolean, isHovered: boolean) => (
      <CollectionIcon isActive={isActive} isHovered={isHovered} />
    ),
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
  telegram: {
    id: 'mainModuleTabs.telegram',
    defaultMessage: 'Telegram',
  },
  tiktok: {
    id: 'mainModuleTabs.tiktok',
    defaultMessage: 'TikTok',
  },
  instagramDM: {
    id: 'mainModuleTabs.instagramDM',
    defaultMessage: 'Ins DM',
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
  appVersion: string;
}

interface IState {
  hoveredModule: FerdiumModule | null;
}

const formatHandoffBadge = (total: number): string | null => {
  if (total <= 0) return null;
  if (total > 99) return '99+';
  return String(total);
};

@inject('stores')
@observer
class MainModuleTabs extends Component<IProps & WrappedComponentProps, IState> {
  constructor(props: IProps & WrappedComponentProps) {
    super(props);
    this.state = {
      hoveredModule: null,
    };
  }

  render(): ReactElement {
    const { stores, intl, appVersion } = this.props;
    const badge = stores?.services.mainModuleBadge;
    const handoffBadge = formatHandoffBadge(stores?.handoff.unreadCount ?? 0);

    return (
      <nav className="flex flex-col items-center w-[88px] py-[24px] h-full min-h-0 bg-container border-r border-solid border-line">
        <img src="./assets/images/sidebar-logo.svg" alt="logo" />

        <div className="flex flex-col items-center h-fit my-auto gap-[4px] w-[64px] p-[8px] rounded-xl shadow-[0px_5px_5px_-3px_rgba(0,0,0,0.10),0px_8px_10px_1px_rgba(0,0,0,0.06),0px_3px_14px_2px_rgba(0,0,0,0.05)]">
          {MODULES.filter(mod => mod.id !== 'tiktok').map(mod => {
            const isActive = navigationStore.activeModule === mod.id;
            const isHovered = this.state.hoveredModule === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                className="relative flex flex-col items-center justify-center gap-0.5 border-0 bg-transparent cursor-pointer"
                onClick={() => {
                  navigationStore.setModule(mod.id);
                }}
                onMouseEnter={() => {
                  this.setState({ hoveredModule: mod.id });
                }}
                onMouseLeave={() => {
                  this.setState({ hoveredModule: null });
                }}
              >
                <Badge
                  count={
                    mod.id === 'whatsapp'
                      ? badge
                      : mod.id === 'telegram'
                        ? stores?.services.telegramBadge
                        : mod.id === 'tiktok'
                          ? stores?.services.tiktokBadge
                          : mod.id === 'instagramDM'
                            ? stores?.services.instagramBadge
                            : mod.id === 'home'
                              ? handoffBadge
                              : null
                  }
                  size="small"
                  offset={[5, 5]}
                >
                  {mod.icon(isActive, isHovered)}
                </Badge>
                <span
                  className={`text-[12px] leading-5 whitespace-nowrap ${isActive ? 'text-brand' : 'text-secondary'}`}
                >
                  {intl.formatMessage(
                    (
                      {
                        home: messages.home,
                        whatsapp: messages.serviceType,
                        telegram: messages.telegram,
                        tiktok: messages.tiktok,
                        instagramDM: messages.instagramDM,
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
        <div className="text-center text-[11px] text-secondary opacity-50 pointer-events-none">
          v{appVersion}
        </div>
      </nav>
    );
  }
}

export default injectIntl(MainModuleTabs);
