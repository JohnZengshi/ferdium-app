import { mdiFlash } from '@mdi/js';
import type { Response } from 'electron';
import { TitleBar } from 'electron-react-titlebar/renderer';
import { observer } from 'mobx-react';
import {
  Component,
  type MouseEventHandler,
  type ReactElement,
  cloneElement,
} from 'react';
import { type WrappedComponentProps, injectIntl } from 'react-intl';
import { serverName } from '../../api/apiBase';
import { isSnap, isWindows } from '../../environment';
import { Component as PublishDebugInfo } from '../../features/publishDebugInfo';
import { updateVersionParse } from '../../helpers/update-helpers';
import globalMessages from '../../i18n/globalMessages';
import AppUpdateInfoBar from '../AppUpdateInfoBar';
import InfoBar from '../ui/InfoBar';
import Icon from '../ui/icon';

export interface IProps extends WrappedComponentProps {
  children: ReactElement;
  error: Response;
  isOnline: boolean;
  isAPIHealthy: boolean;
  retryHealthCheck: MouseEventHandler<HTMLButtonElement>;
  isHealthCheckLoading: boolean;
  isFullScreen: boolean;
  installAppUpdate: MouseEventHandler<HTMLButtonElement>;
  appUpdateIsDownloaded: boolean;
  updateVersion: string;
  isUpdateAvailable: boolean;
}

interface IState {
  shouldShowAppUpdateInfoBar: boolean;
}

@observer
class AuthLayout extends Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      shouldShowAppUpdateInfoBar: true,
    };
  }

  render(): ReactElement {
    const {
      children,
      error,
      isOnline,
      isAPIHealthy,
      retryHealthCheck,
      isHealthCheckLoading,
      isFullScreen,
      installAppUpdate,
      appUpdateIsDownloaded,
      updateVersion,
      intl,
      isUpdateAvailable,
    } = this.props;

    let serverNameParse = serverName();
    serverNameParse =
      serverNameParse === 'Custom' ? 'your Custom Server' : serverNameParse;

    return (
      <>
        {isWindows && !isFullScreen && (
          <TitleBar
            menu={window['ferdium'].menu.template}
            icon="assets/images/logo.svg"
          />
        )}
        <div className="auth relative flex min-h-screen h-auto flex-col justify-center overflow-hidden bg-[#f5f6fe]">
          <div className="auth__background pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <img
              alt=""
              className="auth__background-image h-full w-full object-cover"
              src="./assets/images/login-background.png"
            />
          </div>
          <div
            className={`auth__header-bar absolute inset-x-0 top-0 z-2 flex h-auto items-center bg-white/[0.05] px-[24px] backdrop-blur-[10px] ${isFullScreen ? 'py-[12px]' : 'pt-[30px] pb-[12px]'}`}
          >
            <img
              className="auth__logo h-[56px]"
              src="./assets/images/login-logo.png"
              alt=""
            />
          </div>
          {!isOnline && (
            <InfoBar type="warning">
              <Icon icon={mdiFlash} />
              {intl.formatMessage(globalMessages.notConnectedToTheInternet)}
            </InfoBar>
          )}
          {(appUpdateIsDownloaded || (isSnap && isUpdateAvailable)) &&
            this.state.shouldShowAppUpdateInfoBar && (
              <AppUpdateInfoBar
                onInstallUpdate={installAppUpdate}
                updateVersionParsed={updateVersionParse(updateVersion)}
                onHide={() => {
                  this.setState({ shouldShowAppUpdateInfoBar: false });
                }}
              />
            )}
          {isOnline && !isAPIHealthy && (
            <InfoBar
              type="danger"
              ctaLabel="Try again"
              ctaLoading={isHealthCheckLoading}
              sticky
              onClick={retryHealthCheck}
            >
              <Icon icon={mdiFlash} />
              {intl.formatMessage(globalMessages.APIUnhealthy, {
                serverNameParse,
              })}
            </InfoBar>
          )}
          <div className="auth__layout relative z-1 flex min-h-screen w-full items-center justify-center overflow-auto p-6">
            {/* eslint-disable-next-line @eslint-react/no-clone-element */}
            {cloneElement(children, { error })}
          </div>
        </div>
        <PublishDebugInfo />
      </>
    );
  }
}

export default injectIntl(AuthLayout);
