import { Card, Tag } from 'tdesign-react';
import { CheckCircleFilledIcon, ErrorCircleFilledIcon } from 'tdesign-icons-react';
import type { ReactElement } from 'react';

interface SocialAccountCardProps {
  id: string;
  platform: string;
  accountName: string;
  avatar?: string;
  isConnected: boolean;
  unreadCount?: number;
  onClick?: () => void;
}

const platformIcons: Record<string, string> = {
  whatsapp: '📱',
  wechat: '💬',
  telegram: '✈️',
  slack: '📢',
  discord: '🎮',
};

export default function SocialAccountCard({
  platform,
  accountName,
  avatar,
  isConnected,
  unreadCount,
  onClick,
}: SocialAccountCardProps): ReactElement {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              {avatar ? (
                <img
                  src={avatar}
                  alt={accountName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--td-gray-color-3)] flex items-center justify-center text-xl">
                  {platformIcons[platform.toLowerCase()] || '📧'}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium truncate">{accountName}</h4>
                {isConnected ? (
                  <CheckCircleFilledIcon
                    size="16px"
                    style={{ color: 'var(--td-success-color)' }}
                  />
                ) : (
                  <ErrorCircleFilledIcon
                    size="16px"
                    style={{ color: 'var(--td-error-color)' }}
                  />
                )}
              </div>
              <p className="text-xs text-[var(--td-text-color-placeholder)] capitalize">
                {platform}
              </p>
            </div>
          </div>

          {unreadCount !== undefined && unreadCount > 0 && (
            <Tag theme="danger" size="small">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Tag>
          )}
        </div>
      </Card>
    </div>
  );
}
