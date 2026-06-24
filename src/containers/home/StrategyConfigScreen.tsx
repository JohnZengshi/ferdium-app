import PropTypes from 'prop-types';
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { defineMessages, useIntl } from 'react-intl';
import {
  ChevronLeftIcon,
  FolderOpenIcon,
  LockOnIcon,
  UserIcon,
  UserSafetyIcon,
} from 'tdesign-icons-react';
import type { StrategyConfigTab } from '../../stores/NavigationStore';
import HandoverRulesTab from './tabs/HandoverRulesTab';
import NotificationsTab from './tabs/NotificationsTab';
import ResumeTab from './tabs/ResumeTab';
import SecuritySettingsTab from './tabs/SecuritySettingsTab';

const messages = defineMessages({
  title: {
    id: 'strategyConfig.title',
    defaultMessage: 'Strategy Settings',
  },
  resume: {
    id: 'strategyConfig.resume',
    defaultMessage: 'Employee Resume',
  },
  security: {
    id: 'strategyConfig.security',
    defaultMessage: 'Safety Boundary Settings',
  },
  handover: {
    id: 'strategyConfig.handover',
    defaultMessage: 'Human Handover Rules',
  },
  notifications: {
    id: 'strategyConfig.notifications',
    defaultMessage: 'Notification History',
  },
});

interface StrategyConfigScreenProps {
  onBack: () => void;
  handoffUnreadCount?: number;
  initialTab?: StrategyConfigTab;
}

interface SidebarItem {
  key: StrategyConfigTab;
  label: string;
  icon: ReactElement;
  badge?: string;
}

const formatHandoffBadge = (total: number): string | undefined => {
  if (total <= 0) return undefined;
  if (total > 99) return '99+';
  return String(total);
};

const StrategyConfigScreen: React.FC<StrategyConfigScreenProps> = ({
  onBack,
  handoffUnreadCount = 0,
  initialTab = 'resume',
}) => {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState<StrategyConfigTab>(initialTab);
  const contentRef = useRef<HTMLDivElement>(null);

  const handoffBadge = useMemo(
    () => formatHandoffBadge(handoffUnreadCount),
    [handoffUnreadCount],
  );

  const handleResize = useCallback(() => {
    if (contentRef.current) {
      if (activeTab === 'resume') {
        contentRef.current.style.setProperty(
          'zoom',
          String(window.innerWidth / 1600),
        );
      } else {
        contentRef.current.style.removeProperty('zoom');
      }
    }
  }, [activeTab]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSidebarClick = useCallback((key: StrategyConfigTab) => {
    setActiveTab(key);
  }, []);

  const sidebarItems: SidebarItem[] = [
    {
      key: 'resume',
      label: intl.formatMessage(messages.resume),
      icon: <UserIcon />,
    },
    {
      key: 'security',
      label: intl.formatMessage(messages.security),
      icon: <LockOnIcon />,
    },
    {
      key: 'handover',
      label: intl.formatMessage(messages.handover),
      icon: <UserSafetyIcon />,
    },
    {
      key: 'notifications',
      label: intl.formatMessage(messages.notifications),
      icon: <FolderOpenIcon />,
      badge: handoffBadge,
    },
  ];

  const renderTopNav = (): ReactElement => (
    <div className="flex h-[62px] w-full flex-shrink-0 items-center border-b border-solid border-line bg-container px-[24px]">
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-0 border-none bg-transparent p-0"
      >
        <ChevronLeftIcon className="h-[18px] w-[18px] text-primary" />
      </button>
      <button
        type="button"
        className="ml-[12px] cursor-pointer select-none border-none bg-transparent p-0 text-[20px] font-semibold leading-[28px] text-primary"
        onClick={onBack}
      >
        {intl.formatMessage(messages.title)}
      </button>
    </div>
  );

  const renderSidebar = (): ReactElement => (
    <div className="flex w-[232px] flex-shrink-0 flex-col bg-container pb-[8px] pt-[8px]">
      {sidebarItems.map(item => {
        const isActive = item.key === activeTab;
        return (
          <div
            key={item.key}
            role="button"
            tabIndex={0}
            onClick={() => handleSidebarClick(item.key)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                handleSidebarClick(item.key);
              }
            }}
            className={`ml-[8px] mr-[8px] mb-[8px] flex h-[36px] cursor-pointer items-center rounded-[4px] pl-[12px] pr-[16px] transition-colors duration-200 ${
              isActive ? 'bg-brand-light' : 'hover:bg-secondary-container'
            }`}
          >
            <div
              className={`flex h-[18px] w-[18px] items-center justify-center ${
                isActive ? 'text-brand' : 'text-secondary'
              }`}
            >
              {item.icon}
            </div>
            <span
              className={`ml-[10px] text-[15px] ${
                isActive
                  ? 'font-medium text-brand'
                  : 'font-normal text-secondary'
              }`}
            >
              {item.label}
            </span>
            {item.badge && (
              <span className="ml-auto flex h-[13px] min-w-[22px] items-center justify-center rounded-[7px] bg-error px-[6px] text-[9px] font-medium leading-none text-text-anti">
                {item.badge}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-page">
      {renderTopNav()}
      <div className="flex flex-auto overflow-hidden">
        {renderSidebar()}
        <div
          ref={contentRef}
          className={`flex-auto overflow-y-auto p-[24px] ${activeTab === 'resume' ? 'bg-brand-light' : 'bg-page'}`}
        >
          {activeTab === 'resume' ? (
            <ResumeTab />
          ) : activeTab === 'security' ? (
            <SecuritySettingsTab />
          ) : activeTab === 'handover' ? (
            <HandoverRulesTab />
          ) : activeTab === 'notifications' ? (
            <NotificationsTab />
          ) : null}
        </div>
      </div>
    </div>
  );
};

StrategyConfigScreen.propTypes = {
  onBack: PropTypes.func.isRequired,
  handoffUnreadCount: PropTypes.number,
  initialTab: PropTypes.oneOf<StrategyConfigTab>([
    'resume',
    'security',
    'handover',
    'notifications',
  ]),
};

export default StrategyConfigScreen;
