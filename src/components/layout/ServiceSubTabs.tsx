import { mdiAccountBadge, mdiAccountCog, mdiMessageText } from '@mdi/js';
import Icon from '@mdi/react';
import { observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';

import { navigationStore } from '../../stores/NavigationStore';
import type { ServiceSubTab } from '../../stores/NavigationStore';

const SUB_TABS: { id: ServiceSubTab; label: string; icon: string }[] = [
  { id: 'messages', label: '消息', icon: mdiMessageText },
  { id: 'account', label: '账号管理', icon: mdiAccountCog },
  { id: 'profile', label: '用户画像', icon: mdiAccountBadge },
];

@observer
class ServiceSubTabs extends Component {
  render(): ReactElement {
    return (
      <nav className="flex flex-col items-center w-[56px] py-[8px] gap-[4px] bg-[var(--bg-tertiary,#252525)] border-r border-r-[var(--border-color,rgba(255,255,255,0.06))]">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`flex flex-col items-center justify-center w-[48px] h-[48px] gap-[2px] text-[10px] border-0 rounded-[8px] bg-transparent cursor-pointer transition-all duration-150 ease-in-out text-[var(--text-secondary,rgba(255,255,255,0.55))] hover:bg-[var(--hover-bg,rgba(255,255,255,0.08))] hover:text-[var(--text-primary,rgba(255,255,255,0.9))] ${navigationStore.activeServiceTab === tab.id ? '!bg-[var(--active-bg,rgba(255,255,255,0.12))] !text-[#1677ff]' : ''}`}
            onClick={() => {
              navigationStore.setServiceTab(tab.id);
            }}
          >
            <Icon path={tab.icon} size={1} />
            <span className="text-[10px] leading-[1.2] whitespace-nowrap">
              {tab.label}
            </span>
          </button>
        ))}
      </nav>
    );
  }
}

export default ServiceSubTabs;
