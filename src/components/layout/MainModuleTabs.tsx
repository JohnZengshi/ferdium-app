import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';

import type { Stores } from '../../@types/stores.types';
import { navigationStore } from '../../stores/NavigationStore';
import type { FerdiumModule } from '../../stores/NavigationStore';

const MODULES: {
  id: FerdiumModule;
  label: string;
  icon: string;
  iconActive: string;
}[] = [
  {
    id: 'home',
    label: '首页',
    icon: './assets/images/tab-home.svg',
    iconActive: './assets/images/tab-home-active.svg',
  },
  {
    id: 'service-type',
    label: 'WA工具',
    icon: './assets/images/tab-whats.svg',
    iconActive: './assets/images/tab-whats-active.svg',
  },
  {
    id: 'knowledge-base',
    label: '资料库',
    icon: './assets/images/tab-library.svg',
    iconActive: './assets/images/tab-library-active.svg',
  },
];

interface IProps {
  stores?: Stores;
}

@inject('stores')
@observer
class MainModuleTabs extends Component<IProps> {
  render(): ReactElement {
    const { stores } = this.props;
    const badge = stores?.services.mainModuleBadge;

    return (
      <nav className="flex flex-col items-center w-[88px] py-[24px] h-full min-h-0 bg-white border-r border-solid border-black/10">
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
                <img
                  src={isActive ? mod.iconActive : mod.icon}
                  alt={mod.label}
                  className="w-[48px]"
                />
                <span
                  className={`text-[12px] leading-5 whitespace-nowrap ${isActive ? 'text-[#0052D9]' : 'text-black/60'}`}
                >
                  {mod.label}
                </span>
                {mod.id === 'service-type' && badge != null && (
                  <span className="absolute top-0 right-0 flex items-center justify-center min-w-[12px] h-[12px] text-[9px] text-white/90 bg-[#D54941] rounded-full leading-[15px] translate-x-[2px] -translate-y-[2px]">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <img
          src="./assets/images/sidebar-ai-bot.png"
          alt="AI助手"
          className="w-[40px]"
        />
      </nav>
    );
  }
}

export default MainModuleTabs;
