import { mdiBookOpenPageVariant, mdiHome, mdiPuzzle } from '@mdi/js';
import Icon from '@mdi/react';
import { observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';

import { navigationStore } from '../../stores/NavigationStore';
import type { FerdiumModule } from '../../stores/NavigationStore';

const MODULES: { id: FerdiumModule; label: string; icon: string }[] = [
  { id: 'home', label: '首页', icon: mdiHome },
  { id: 'service-type', label: 'WA工具', icon: mdiPuzzle },
  { id: 'knowledge-base', label: '资料库', icon: mdiBookOpenPageVariant },
];

@observer
class MainModuleTabs extends Component {
  render(): ReactElement {
    return (
      <nav className="flex flex-col items-center w-[56px] py-[8px] gap-[4px] bg-[var(--bg-secondary,#1e1e1e)] border-r border-r-[var(--border-color,rgba(255,255,255,0.08))]">
        {MODULES.map(mod => (
          <button
            key={mod.id}
            type="button"
            className={`flex flex-col items-center justify-center w-[48px] h-[48px] gap-[2px] text-[10px] border-0 rounded-[8px] bg-transparent cursor-pointer transition-all duration-150 ease-in-out text-[var(--text-secondary,rgba(255,255,255,0.55))] hover:bg-[var(--hover-bg,rgba(255,255,255,0.08))] hover:text-[var(--text-primary,rgba(255,255,255,0.9))] ${navigationStore.activeModule === mod.id ? '!bg-[var(--active-bg,rgba(255,255,255,0.12))] !text-[#1677ff]' : ''}`}
            onClick={() => {
              navigationStore.setModule(mod.id);
            }}
          >
            <Icon path={mod.icon} size={1} />
            <span className="text-[10px] leading-[1.2] whitespace-nowrap">
              {mod.label}
            </span>
          </button>
        ))}
      </nav>
    );
  }
}

export default MainModuleTabs;
