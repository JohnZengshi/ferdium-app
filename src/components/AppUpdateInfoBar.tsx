import { defineMessages, useIntl } from 'react-intl';

import { mdiInformation } from '@mdi/js';
import type { MouseEventHandler } from 'react';
import InfoBar from './ui/InfoBar';
import Icon from './ui/icon';

import { isSnap, isWinPortable } from '../environment';

const messages = defineMessages({
  updateAvailable: {
    id: 'infobar.updateAvailable',
    defaultMessage: 'A new update for Aitalk is available.',
  },
  buttonInstallUpdate: {
    id: 'infobar.buttonInstallUpdate',
    defaultMessage: 'Restart & install update',
  },
  isSnapMessage: {
    id: 'infobar.isSnapMessage',
    defaultMessage: 'Please update via Snap Store.',
  },
});

export interface IProps {
  onInstallUpdate: MouseEventHandler<HTMLButtonElement>;
  onHide: () => void;
  updateVersionParsed: string;
}

const AppUpdateInfoBar = (props: IProps) => {
  const { onInstallUpdate, updateVersionParsed, onHide } = props;
  const intl = useIntl();

  return (
    <InfoBar
      type="primary"
      ctaLabel={
        isSnap ? undefined : intl.formatMessage(messages.buttonInstallUpdate)
      }
      onClick={event => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        !isWinPortable && !isSnap && onInstallUpdate(event);
      }}
      onHide={onHide}
    >
      <Icon icon={mdiInformation} />
      <p style={{ padding: '0 0.5rem 0 1rem' }}>
        {intl.formatMessage(messages.updateAvailable)}
        {isSnap && ` ${intl.formatMessage(messages.isSnapMessage)}`}
        {` (v${updateVersionParsed})`}
      </p>
    </InfoBar>
  );
};

export default AppUpdateInfoBar;
