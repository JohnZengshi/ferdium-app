import type { ReactElement } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import {
  CheckCircleIcon,
  CloseCircleIcon,
  UserIcon,
} from 'tdesign-icons-react';
import { Card } from 'tdesign-react';

const messages = defineMessages({
  online: {
    id: 'digitalHumanCard.online',
    defaultMessage: 'Online',
  },
  offline: {
    id: 'digitalHumanCard.offline',
    defaultMessage: 'Offline',
  },
  busy: {
    id: 'digitalHumanCard.busy',
    defaultMessage: 'Busy',
  },
  lastActive: {
    id: 'digitalHumanCard.lastActive',
    defaultMessage: 'Last active: {time}',
  },
});

interface DigitalHumanCardProps {
  name: string;
  description?: string;
  avatar?: string;
  status: 'online' | 'offline' | 'busy';
  lastActive?: string;
  onClick?: () => void;
}

const statusConfig = {
  online: {
    icon: CheckCircleIcon,
    color: 'var(--td-success-color)',
  },
  offline: {
    icon: CloseCircleIcon,
    color: 'var(--td-error-color)',
  },
  busy: {
    icon: CloseCircleIcon,
    color: 'var(--td-warning-color)',
  },
};

const DigitalHumanCard = ({
  name,
  description,
  avatar,
  status,
  lastActive,
  onClick,
  intl,
}: DigitalHumanCardProps & WrappedComponentProps): ReactElement => {
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-all duration-200 hover:shadow-lg"
      role="button"
      tabIndex={0}
      onKeyPress={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      <Card>
        <div className="flex items-start gap-3">
          <div className="relative">
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center">
                <UserIcon
                  size="24px"
                  style={{ color: 'var(--td-text-color-anti)' }}
                />
              </div>
            )}
            <div
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-container"
              style={{ backgroundColor: statusInfo.color }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-medium truncate">{name}</h3>
              <span className="text-xs text-placeholder">
                {intl.formatMessage(messages[status])}
              </span>
            </div>

            {description && (
              <p className="text-sm text-secondary line-clamp-2 mb-2">
                {description}
              </p>
            )}

            {lastActive && (
              <div className="flex items-center gap-1 text-xs text-placeholder">
                <StatusIcon size="14px" style={{ color: statusInfo.color }} />
                <span>
                  {intl.formatMessage(messages.lastActive, {
                    time: lastActive,
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default injectIntl(DigitalHumanCard);
