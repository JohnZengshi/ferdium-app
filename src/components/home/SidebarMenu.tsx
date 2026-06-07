import { type ReactElement } from 'react';

interface SidebarItem {
  key: string;
  label: string;
  icon: ReactElement;
  badge?: string;
}

interface SidebarMenuProps {
  items: SidebarItem[];
  activeKey: string;
  onItemClick: (key: string) => void;
}

function SidebarMenu({
  items,
  activeKey,
  onItemClick,
}: SidebarMenuProps): ReactElement {
  return (
    <div className="flex w-[232px] flex-shrink-0 flex-col bg-white pb-[8px] pt-[8px]">
      {items.map(item => {
        const isActive = item.key === activeKey;
        return (
          <div
            key={item.key}
            role="button"
            tabIndex={0}
            onClick={() => onItemClick(item.key)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') onItemClick(item.key);
            }}
            className={`ml-[8px] mr-[8px] mb-[8px] flex h-[36px] cursor-pointer items-center rounded-[4px] pl-[12px] pr-[16px] transition-colors duration-200 ${
              isActive ? 'bg-[#F0F5FF]' : 'hover:bg-[#F7F7F7]'
            }`}
          >
            <div
              className={`flex h-[18px] w-[18px] items-center justify-center ${
                isActive ? 'text-[#165DFF]' : 'text-[#666666]'
              }`}
            >
              {item.icon}
            </div>
            <span
              className={`ml-[10px] text-[15px] ${
                isActive
                  ? 'font-medium text-[#165DFF]'
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

export { SidebarMenu, type SidebarItem };
