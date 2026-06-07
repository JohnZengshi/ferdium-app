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
        <div className="h-[32px] w-[32px] overflow-hidden rounded-full border-[1px] border-line">
          <img
            src={avatarUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-component text-[13px] font-medium text-secondary">
          {title.slice(0, 1)}
        </div>
      )}
      <div className="flex flex-col">
        <div className="flex items-center gap-[6px]">
          <span className="text-[14px] leading-[22px] text-primary font-medium">
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
          <span className="text-[12px] leading-[20px] text-secondary">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default AvatarCell;
