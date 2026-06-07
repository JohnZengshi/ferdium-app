import {
  mdiCloseCircle,
  mdiDelete,
  mdiDeleteSweep,
  mdiDownload,
  mdiFolderOpen,
  mdiPauseCircle,
  mdiPlayCircle,
} from '@mdi/js';
import { shell } from 'electron';
import { round } from 'lodash';
import { observer } from 'mobx-react';
import prettyBytes from 'pretty-bytes';
import { Component } from 'react';
import { type IntlShape, defineMessages, injectIntl } from 'react-intl';
import { Button, Progress } from 'tdesign-react';
import type { Actions } from '../../actions/lib/actions';
import type { RealStores } from '../../stores';
import Icon from '../ui/icon';

const messages = defineMessages({
  headline: {
    id: 'downloadManager.headline',
    defaultMessage: 'Download Manager',
  },
  empty: {
    id: 'downloadManager.empty',
    defaultMessage: 'Your download list is empty.',
  },
  clearAllCompleted: {
    id: 'downloadManager.clearAllCompleted',
    defaultMessage: 'Clear all completed',
  },
  statusPaused: {
    id: 'downloadManager.status.paused',
    defaultMessage: 'Paused',
  },
  statusCancelled: {
    id: 'downloadManager.status.cancelled',
    defaultMessage: 'Cancelled',
  },
  statusError: {
    id: 'downloadManager.status.error',
    defaultMessage: 'Error',
  },
});

interface IProps {
  intl: IntlShape;
  stores?: RealStores;
  actions?: Actions;
}

interface IState {
  data: string;
}

class DownloadManagerDashboard extends Component<IProps, IState> {
  render() {
    const { intl, stores, actions } = this.props;

    const downloads = stores?.app.downloads ?? [];

    return (
      <div className="settings__main">
        <div className="settings__header">
          <span className="settings__header-item">
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Icon icon={mdiDownload} size={1.5} />
              {intl.formatMessage(messages.headline)}
              <span className="badge badge--success">beta</span>
            </div>
          </span>
        </div>
        <div className="settings__body">
          {downloads.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 32,
              }}
            >
              <Icon icon={mdiDownload} size={1.8} />
              <h4>{intl.formatMessage(messages.empty)}</h4>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-end',
                height: 'fit-content',
              }}
            >
              <div style={{ maxWidth: 176 }}>
                <button
                  type="button"
                  onClick={() => {
                    actions?.app.removeDownload(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <Icon icon={mdiDeleteSweep} size={1.5} />
                  <span>{intl.formatMessage(messages.clearAllCompleted)}</span>
                </button>
              </div>
            </div>
          )}
          {downloads.map(download => {
            const {
              totalBytes,
              receivedBytes,
              filename,
              url,
              savePath,
              state,
              id,
              paused,
            } = download;

            const downloadPercentage =
              receivedBytes !== undefined && totalBytes !== undefined
                ? round((receivedBytes / totalBytes) * 100, 2)
                : null;

            const isPaused = state === 'progressing' && paused === true;
            const stateParse =
              state === 'progressing'
                ? paused === false || paused === undefined
                  ? null
                  : intl.formatMessage(messages.statusPaused)
                : state === 'cancelled'
                  ? intl.formatMessage(messages.statusCancelled)
                  : state === 'completed'
                    ? null
                    : intl.formatMessage(messages.statusError);

            return (
              <div
                key={id}
                style={{
                  marginBottom: 16,
                  backgroundColor: 'var(--td-bg-color-container, #fff)',
                  borderRadius: 'var(--td-radius-default, 4px)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  display: 'flex',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                  }}
                >
                  <div style={{ padding: 16 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 16,
                      }}
                    >
                      <button
                        type="button"
                        disabled={state !== 'completed'}
                        style={{
                          all: 'unset',
                          pointerEvents:
                            state === 'completed' ? undefined : 'none',
                          cursor: state === 'completed' ? 'pointer' : 'default',
                        }}
                        onClick={() => {
                          if (savePath) shell.openPath(savePath);
                        }}
                      >
                        <h6
                          style={{
                            color:
                              state === 'completed'
                                ? 'var(--td-brand-color)'
                                : undefined,
                            textDecoration:
                              stateParse !== null && !isPaused
                                ? 'line-through'
                                : state === 'completed'
                                  ? 'underline'
                                  : undefined,
                          }}
                        >
                          {filename}
                        </h6>
                      </button>
                      <h6
                        style={{
                          color: isPaused
                            ? 'var(--td-warning-color)'
                            : undefined,
                        }}
                      >
                        {stateParse !== null && !isPaused
                          ? stateParse
                          : isPaused
                            ? stateParse
                            : null}
                      </h6>
                    </div>
                    <span style={{ fontSize: '0.875rem' }}>{url}</span>
                    <Progress
                      percentage={downloadPercentage || 0}
                      style={{ marginTop: 8, marginBottom: 8 }}
                    />
                    <span style={{ fontSize: '0.875rem' }}>
                      {`${
                        downloadPercentage ? `${downloadPercentage}%  - ` : ''
                      }${
                        receivedBytes ? `${prettyBytes(receivedBytes)} of ` : ''
                      }${totalBytes ? prettyBytes(totalBytes) : ''}`}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 8,
                    gap: 4,
                  }}
                >
                  {state !== 'completed' && state !== 'cancelled' && (
                    <Button
                      icon={<Icon icon={mdiCloseCircle} />}
                      shape="square"
                      variant="text"
                      theme="danger"
                      size="small"
                      onClick={() => {
                        actions?.app.stopDownload(id);
                      }}
                    />
                  )}
                  {state === 'progressing' && (
                    <Button
                      icon={
                        paused === false || paused === undefined ? (
                          <Icon icon={mdiPauseCircle} />
                        ) : (
                          <Icon icon={mdiPlayCircle} />
                        )
                      }
                      shape="square"
                      variant="text"
                      theme={
                        paused === false || paused === undefined
                          ? 'warning'
                          : 'success'
                      }
                      size="small"
                      onClick={() => {
                        actions?.app.togglePauseDownload(id);
                      }}
                    />
                  )}
                  {(state === 'cancelled' || state === 'completed') && (
                    <Button
                      icon={<Icon icon={mdiDelete} />}
                      shape="square"
                      variant="text"
                      theme="danger"
                      size="small"
                      onClick={() => {
                        actions?.app.removeDownload(id);
                      }}
                    />
                  )}
                  {state !== 'cancelled' && (
                    <Button
                      icon={<Icon icon={mdiFolderOpen} />}
                      shape="square"
                      variant="text"
                      theme="primary"
                      size="small"
                      onClick={() => {
                        if (savePath) shell.showItemInFolder(savePath);
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default injectIntl(observer(DownloadManagerDashboard));
