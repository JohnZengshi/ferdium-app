import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { defineMessages, useIntl } from 'react-intl';
import {
  ChevronLeftIcon,
  UserIcon,
  LockOnIcon,
  UserSafetyIcon,
  FolderOpenIcon,
} from 'tdesign-icons-react';
import ResumeTab from './tabs/ResumeTab';
import SecuritySettingsTab from './tabs/SecuritySettingsTab';
import HandoverRulesTab from './tabs/HandoverRulesTab';
import NotificationsTab from './tabs/NotificationsTab';

const messages = defineMessages({
  title: {
    id: 'strategyConfig.title',
    defaultMessage: '设置策略',
  },
  resume: {
    id: 'strategyConfig.resume',
    defaultMessage: '员工简历',
  },
  security: {
    id: 'strategyConfig.security',
    defaultMessage: '安全边界设置',
  },
  handover: {
    id: 'strategyConfig.handover',
    defaultMessage: '人工接管规则',
  },
  notifications: {
    id: 'strategyConfig.notifications',
    defaultMessage: '通知记录',
  },
});

interface StrategyConfigScreenProps {
  onBack: () => void;
}

interface SidebarItem {
  key: string;
  label: string;
  icon: ReactElement;
  badge?: string;
}

const StrategyConfigScreen: React.FC<StrategyConfigScreenProps> = ({
  onBack,
}) => {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState('resume');
  const contentRef = useRef<HTMLDivElement>(null);

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

  const handleSidebarClick = useCallback((key: string) => {
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
      badge: '99+',
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
      <span
        className="ml-[12px] cursor-pointer select-none text-[20px] font-semibold leading-[28px] text-primary"
        onClick={onBack}
      >
        {intl.formatMessage(messages.title)}
      </span>
    </div>
  );

  const renderSidebar = (): ReactElement => (
    <div className="flex w-[232px] flex-shrink-0 flex-col bg-container pb-[8px] pt-[8px]">
      {sidebarItems.map(item => {
        const isActive = item.key === activeTab;
        return (
          <div
            key={item.key}
            onClick={() => handleSidebarClick(item.key)}
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

export default StrategyConfigScreen;
