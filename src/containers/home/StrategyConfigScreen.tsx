import { Component, createRef, type ReactElement } from 'react';
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

interface StrategyConfigScreenProps {
  onBack: () => void;
}

interface StrategyConfigScreenState {
  activeTab: string;
}

interface SidebarItem {
  key: string;
  label: string;
  icon: ReactElement;
  badge?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'resume', label: '员工简历', icon: <UserIcon /> },
  { key: 'security', label: '安全边界设置', icon: <LockOnIcon /> },
  { key: 'handover', label: '人工接管规则', icon: <UserSafetyIcon /> },
  {
    key: 'notifications',
    label: '通知记录',
    icon: <FolderOpenIcon />,
    badge: '99+',
  },
];

class StrategyConfigScreen extends Component<
  StrategyConfigScreenProps,
  StrategyConfigScreenState
> {
  state: StrategyConfigScreenState = {
    activeTab: 'resume',
  };

  handleSidebarClick = (key: string): void => {
    this.setState({ activeTab: key }, () => this.handleResize());
  };

  private contentRef = createRef<HTMLDivElement>();

  componentDidMount(): void {
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount(): void {
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize = (): void => {
    if (this.contentRef.current) {
      if (this.state.activeTab === 'resume') {
        this.contentRef.current.style.setProperty(
          'zoom',
          String(window.innerWidth / 1600),
        );
      } else {
        this.contentRef.current.style.removeProperty('zoom');
      }
    }
  };

  renderTopNav(): ReactElement {
    return (
      <div className="flex h-[62px] w-full flex-shrink-0 items-center border-b border-solid border-[#EEF1F5] bg-white px-[24px]">
        <button
          type="button"
          onClick={this.props.onBack}
          className="flex cursor-pointer items-center gap-0 border-none bg-transparent p-0"
        >
          <ChevronLeftIcon className="h-[18px] w-[18px] text-[#222222]" />
        </button>
        <span
          className="ml-[12px] cursor-pointer select-none text-[20px] font-semibold leading-[28px] text-[#222222]"
          onClick={this.props.onBack}
        >
          设置策略
        </span>
      </div>
    );
  }

  renderSidebar(): ReactElement {
    const { activeTab } = this.state;
    return (
      <div className="flex w-[232px] flex-shrink-0 flex-col bg-white pb-[8px] pt-[8px]">
        {SIDEBAR_ITEMS.map(item => {
          const isActive = item.key === activeTab;
          return (
            <div
              key={item.key}
              onClick={() => this.handleSidebarClick(item.key)}
              className={`ml-[8px] mr-[8px] mb-[8px] flex h-[36px] cursor-pointer items-center rounded-[4px] pl-[12px] pr-[16px] transition-colors duration-200 ${
                isActive ? 'bg-[#F1F3FF]' : 'hover:bg-[#F7F7F7]'
              }`}
            >
              <div
                className={`flex h-[18px] w-[18px] items-center justify-center ${
                  isActive ? 'text-[#2468F2]' : 'text-[#666666]'
                }`}
              >
                {item.icon}
              </div>
              <span
                className={`ml-[10px] text-[15px] ${
                  isActive
                    ? 'font-medium text-[#2468F2]'
                    : 'font-normal text-[#666666]'
                }`}
              >
                {item.label}
              </span>
              {item.badge && (
                <span className="ml-auto flex h-[13px] min-w-[22px] items-center justify-center rounded-[7px] bg-[#E24D4D] px-[6px] text-[9px] font-medium leading-none text-white">
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  render(): ReactElement {
    return (
      <div className="flex h-full flex-col bg-[#F5F8FC]">
        {this.renderTopNav()}
        <div className="flex flex-auto overflow-hidden">
          {this.renderSidebar()}
          <div
            ref={this.contentRef}
            className={`flex-auto overflow-y-auto p-[24px] ${this.state.activeTab === 'resume' ? 'bg-[#EAF4FF]' : 'bg-[#F2F4F8]'}`}
          >
            {this.state.activeTab === 'resume' ? (
              <ResumeTab />
            ) : this.state.activeTab === 'security' ? (
              <SecuritySettingsTab />
            ) : this.state.activeTab === 'handover' ? (
              <HandoverRulesTab />
            ) : this.state.activeTab === 'notifications' ? (
              <NotificationsTab />
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}

export default StrategyConfigScreen;
