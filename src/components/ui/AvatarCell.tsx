import type { ReactElement } from 'react';
import { Tag } from 'tdesign-react';

interface AvatarCellProps {
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  isVIP?: boolean;
  vipLabel?: string;
  className?: string;
}

const AvatarCell = ({
  title,
  subtitle,
  avatarUrl,
  isVIP,
  vipLabel = '重粉',
  className = '',
}: AvatarCellProps): ReactElement => {
  return (
    <div className={`flex items-center gap-[12px] py-[2px] ${className}`}>
      {avatarUrl ? (
        <div className="h-[32px] w-[32px] overflow-hidden rounded-full border-[1px] border-[#E5E6EB]">
          <img
            src={avatarUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#E5E6EB] text-[13px] font-medium text-[#4E5969]">
          {title.slice(0, 1)}
        </div>
      )}
      <div className="flex flex-col">
        <div className="flex items-center gap-[6px]">
          <span className="text-[14px] leading-[22px] text-[#1F2329] font-medium">
            {title}
          </span>
          {isVIP && (
            <Tag
              theme="danger"
              variant="light"
              className="!rounded-[4px] !px-[6px] !py-0 !text-[11px]"
            >
              {vipLabel}
            </Tag>
          )}
        </div>
        {subtitle && (
          <span className="text-[12px] leading-[20px] text-[#86909C]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default AvatarCell;
