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
        <div className="flex h-[32px] min-w-[32px] items-center justify-center rounded-full bg-component text-secondary">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16.5 7.5C16.5 9.98528 14.4853 12 12 12 9.51472 12 7.5 9.98528 7.5 7.5 7.5 5.01472 9.51472 3 12 3 14.4853 3 16.5 5.01472 16.5 7.5ZM20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21H20Z"
              fill="transparent"
            />
            <path
              d="M16.5 7.5C16.5 9.98528 14.4853 12 12 12 9.51472 12 7.5 9.98528 7.5 7.5 7.5 5.01472 9.51472 3 12 3 14.4853 3 16.5 5.01472 16.5 7.5ZM20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21H20Z"
              strokeLinecap="square"
              strokeWidth="2"
              stroke="currentColor"
            />
          </svg>
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
