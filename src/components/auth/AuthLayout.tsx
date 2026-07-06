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
      <div className="flex h-full flex-col">
        {isWindows && !isFullScreen && (
          <TitleBar menu={window['ferdium'].menu.template} />
        )}
        <div className="auth relative flex min-h-screen overflow-hidden">
          <div className="auth__background pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <video
              autoPlay
              className="auth__background-image h-full w-full object-cover"
              loop
              muted
              playsInline
              poster="./assets/images/login-bg.png"
            >
              <source src="./assets/videos/login-bg.mp4" type="video/mp4" />
            </video>
            <div className="pointer-events-none absolute left-0 top-0 h-full">
              <img
                alt=""
                className="h-full w-auto object-contain"
                src="./assets/images/login-bg-left-overlay.png"
              />
            </div>
          </div>

          {!isOnline && (
            <div className="fixed left-0 right-0 top-0 z-50">
              <InfoBar type="warning">
                <Icon icon={mdiFlash} />
                {intl.formatMessage(globalMessages.notConnectedToTheInternet)}
              </InfoBar>
            </div>
          )}
          {(appUpdateIsDownloaded || (isSnap && isUpdateAvailable)) &&
            this.state.shouldShowAppUpdateInfoBar && (
              <div className="fixed left-0 right-0 top-0 z-50">
                <AppUpdateInfoBar
                  onInstallUpdate={installAppUpdate}
                  updateVersionParsed={updateVersionParse(updateVersion)}
                  onHide={() => {
                    this.setState({ shouldShowAppUpdateInfoBar: false });
                  }}
                />
              </div>
            )}
          {isOnline && !isAPIHealthy && (
            <div className="fixed left-0 right-0 top-0 z-50">
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
            </div>
          )}

          <div className="relative z-10 flex w-[45%] min-w-[480px] flex-col">
            <div className="px-[48px] pt-[40px]">
              <img
                className="auth__logo h-[56px]"
                src="./assets/images/login-logo.png"
                alt=""
              />
            </div>
            <div className="flex flex-1 items-center justify-start">
              <div className="w-full max-w-[400px] ml-[7.2vw]">
                <div className="auth__layout">
                  {/* eslint-disable-next-line @eslint-react/no-clone-element */}
                  {cloneElement(children, { error })}
                </div>
              </div>
            </div>
          </div>

          {/* Right-side title group — adaptive, centered within right content area */}
          <div
            className="absolute right-[4vw] top-[9vh] z-10 w-[52vw] min-w-[760px] max-w-[980px] text-center"
            aria-hidden="true"
          >
            <div className="text-[48px] font-semibold leading-[56px] tracking-[0] text-[#003CAB] font-['PingFang_SC','Microsoft_YaHei',sans-serif]">
              开启智能一体化管理体验
            </div>

            <div className="flex items-center justify-center mt-[clamp(18px,2.2vh,30px)] gap-[clamp(12px,1.2vw,24px)]">
              <div className="h-[1px] shrink-0 flex-1 max-w-[170px] bg-[#003CAB]/70" />
              <span className="text-[clamp(18px,1.35vw,26px)] font-semibold leading-[1.3] tracking-[0] text-[#003CAB] font-['PingFang_SC','Microsoft_YaHei',sans-serif] whitespace-nowrap">
                企业级 <span className="text-[#F6A04A]">AI 数字员工</span>{' '}
                多账号统一管理平台
              </span>
              <div className="h-[1px] shrink-0 flex-1 max-w-[170px] bg-[#003CAB]/70" />
            </div>
          </div>
        </div>
        <PublishDebugInfo />
      </div>
    );
  }
}

export default injectIntl(AuthLayout);
