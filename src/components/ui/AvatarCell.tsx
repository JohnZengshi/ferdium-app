import type { ReactElement } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import { Tag } from 'tdesign-react';

const messages = defineMessages({
  vipLabel: {
    id: 'avatarCell.vipLabel',
    defaultMessage: 'VIP',
  },
});

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
  vipLabel,
  className = '',
  intl,
}: AvatarCellProps & WrappedComponentProps): ReactElement => {
  const displayVipLabel = vipLabel || intl.formatMessage(messages.vipLabel);
  return (
    <div
      className={`flex min-w-0 items-center gap-[12px] py-[2px] ${className}`}
    >
      {avatarUrl ? (
        <div className="h-[32px] w-[32px] overflow-hidden rounded-full border-[1px] border-line">
          <img
            src={avatarUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-[32px] min-w-[32px] items-center justify-center rounded-full bg-component text-[13px] font-medium text-secondary">
          {title.slice(0, 1)}
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-[6px]">
          <span
            className="block overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-medium leading-[22px] text-primary"
            title={title}
          >
            {title}
          </span>
          {isVIP && (
            <Tag
              theme="danger"
              variant="light"
              className="!rounded-[4px] !px-[6px] !py-0 !text-[11px]"
            >
              {displayVipLabel}
            </Tag>
          )}
        </div>
        {subtitle && (
          <span
            className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12px] leading-[20px] text-secondary"
            title={subtitle}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default injectIntl(AvatarCell);
