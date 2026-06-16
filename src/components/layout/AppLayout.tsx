import { ipcRenderer } from 'electron';
import { TitleBar } from 'electron-react-titlebar/renderer';
import { inject, observer } from 'mobx-react';
import type React from 'react';
import { Component, type PropsWithChildren } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import injectSheet, { type WithStylesProps } from 'react-jss';

import { mdiCog, mdiFlash, mdiPowerPlug } from '@mdi/js';
import { Outlet } from 'react-router-dom';
import { MessagePlugin } from 'tdesign-react';
import { Component as BasicAuth } from '../../features/basicAuth';
import { Component as PublishDebugInfo } from '../../features/publishDebugInfo';
import { Component as QuickSwitch } from '../../features/quickSwitch';
import { updateVersionParse } from '../../helpers/update-helpers';
import InfoBar from '../ui/InfoBar';
import ErrorBoundary from '../util/ErrorBoundary';

import { isMac, isSnap, isWindows } from '../../environment';
import Todos from '../../features/todos/containers/TodosScreen';
import WorkspaceSwitchingIndicator from '../../features/workspaces/components/WorkspaceSwitchingIndicator';
import AppUpdateInfoBar from '../AppUpdateInfoBar';
import Icon from '../ui/icon';

import type { Stores } from '../../@types/stores.types';
import type { Actions } from '../../actions/lib/actions';
import LockedScreen from '../../containers/auth/LockedScreen';
import type SettingsStore from '../../stores/SettingsStore';

import HomeScreen from '../../containers/home/HomeScreen';
import KnowledgeScreen from '../../containers/knowledge-base/KnowledgeScreen';
import AccountManagementScreen from '../../containers/service-group/AccountManagementScreen';
import UserProfileScreen from '../../containers/service-group/UserProfileScreen';
import { navigationStore } from '../../stores/NavigationStore';
import type { FerdiumModule } from '../../stores/NavigationStore';
import MainModuleTabs from './MainModuleTabs';
import ServiceSubTabs from './ServiceSubTabs';

const messages = defineMessages({
  servicesUpdated: {
    id: 'infobar.servicesUpdated',
    defaultMessage: 'Your services have been updated.',
  },
  buttonReloadServices: {
    id: 'infobar.buttonReloadServices',
    defaultMessage: 'Reload services',
  },
  requiredRequestsFailed: {
    id: 'infobar.requiredRequestsFailed',
    defaultMessage: 'Could not load services and user information',
  },
  authRequestFailed: {
    id: 'infobar.authRequestFailed',
    defaultMessage:
      'There were errors while trying to perform an authenticated request. Please try logging out and back in if this error persists.',
  },
  moduleHome: {
    id: 'appLayout.moduleHome',
    defaultMessage: 'Home',
  },
  moduleServiceType: {
    id: 'appLayout.moduleServiceType',
    defaultMessage: 'Whats',
  },
  moduleKnowledgeBase: {
    id: 'appLayout.moduleKnowledgeBase',
    defaultMessage: 'Knowledge Base',
  },
  moduleSettings: {
    id: 'appLayout.moduleSettings',
    defaultMessage: 'Settings',
  },
  settingsTooltip: {
    id: 'appLayout.settingsTooltip',
    defaultMessage: 'Settings',
  },
  avatarPlaceholder: {
    id: 'appLayout.avatarPlaceholder',
    defaultMessage: 'Avatar',
  },
  tryAgain: {
    id: 'appLayout.tryAgain',
    defaultMessage: 'Try again',
  },
});

const transition = window?.matchMedia('(prefers-reduced-motion: no-preference)')
  ? 'transform 0.5s ease'
  : 'none';

const styles = () => ({
  appContent: {
    width: '100%',
    transition,
    transform() {
      return 'translateX(0)';
    },
  },
  titleBar: {
    display: 'block',
    zIndex: 1,
    width: '100%',
    height: '10px',
    position: 'absolute',
    top: 0,
  },
});

const toggleFullScreen = () => {
  ipcRenderer.send('window.toolbar-double-clicked');
};

interface IProps extends WrappedComponentProps, WithStylesProps<typeof styles> {
  stores?: Stores;
  actions?: Actions;
  settings: SettingsStore;
  isUpdateAvailable: boolean;
  updateVersion: string;
  isFullScreen: boolean;
  sidebar: React.ReactElement;
  services: React.ReactElement;
  showServicesUpdatedInfoBar: boolean;
  appUpdateIsDownloaded: boolean;
  authRequestFailed: boolean;
  installAppUpdate: () => void;
  showRequiredRequestsError: boolean;
  areRequiredRequestsSuccessful: boolean;
  retryRequiredRequests: () => void;
  areRequiredRequestsLoading: boolean;
}

interface IState {
  shouldShowAppUpdateInfoBar: boolean;
  shouldShowServicesUpdatedInfoBar: boolean;
}

@inject('stores', 'actions')
@observer
class AppLayout extends Component<PropsWithChildren<IProps>, IState> {
  constructor(props) {
    super(props);

    this.state = {
      shouldShowAppUpdateInfoBar: true,
      shouldShowServicesUpdatedInfoBar: true,
    };
  }

  componentDidMount() {
    window.addEventListener(
      'wa-ai-toast',
      this._handleWaAiToast as EventListener,
    );
  }

  componentWillUnmount() {
    window.removeEventListener(
      'wa-ai-toast',
      this._handleWaAiToast as EventListener,
    );
  }

  _handleWaAiToast = (event: CustomEvent) => {
    const { theme, message, detail } = event.detail as {
      theme?: string;
      message?: string;
      detail?: string;
    };
    const text = detail || message || '接口错误';

    switch (theme) {
      case 'warning': {
        MessagePlugin.warning(text, 4000);

        break;
      }
      case 'success': {
        MessagePlugin.success(text, 4000);

        break;
      }
      case 'info': {
        MessagePlugin.info(text, 4000);

        break;
      }
      default: {
        MessagePlugin.error(text, 4000);
      }
    }
  };

  render() {
    const {
      classes,
      isFullScreen,
      sidebar,
      services,
      showServicesUpdatedInfoBar,
      appUpdateIsDownloaded,
      authRequestFailed,
      installAppUpdate,
      settings,
      stores,
      showRequiredRequestsError,
      areRequiredRequestsSuccessful,
      retryRequiredRequests,
      areRequiredRequestsLoading,
      updateVersion,
      isUpdateAvailable,
    } = this.props;

    const { intl } = this.props;

    const MODULE_LABELS: Record<FerdiumModule, string> = {
      home: intl.formatMessage(messages.moduleHome),
      'service-type': intl.formatMessage(messages.moduleServiceType),
      'knowledge-base': intl.formatMessage(messages.moduleKnowledgeBase),
      settings: intl.formatMessage(messages.moduleSettings),
    };

    const { locked, automaticUpdates, useCompactWorkspaceDrawer } =
      settings.app;
    if (locked) {
      return <LockedScreen />;
    }

    const { activeModule, activeServiceTab } = navigationStore;
    const isServiceTypeMessagesMode =
      activeModule === 'service-type' && activeServiceTab === 'messages';

    const appUpdateStatus = (stores?.app?.updateStatus ??
      '') as unknown as string;
    const { AVAILABLE, DOWNLOADED } = stores?.app?.updateStatusTypes || {};
    const showUpdateDot =
      stores?.settings?.app?.automaticUpdates &&
      (appUpdateStatus === AVAILABLE ||
        appUpdateStatus === DOWNLOADED ||
        showServicesUpdatedInfoBar);

    const renderMainContent = () => {
      // IMPORTANT: keep the services/webview container mounted and toggle visibility with CSS only.
      // Unmounting here will recreate webviews on tab switch, which breaks the cached session state
      // and causes a visible reload that hurts user experience.
      const isMessages = isServiceTypeMessagesMode;
      return (
        <>
          <div className={`flex flex-1 flex-col${isMessages ? '' : ' hidden'}`}>
            <WorkspaceSwitchingIndicator />
            {!areRequiredRequestsSuccessful && showRequiredRequestsError && (
              <InfoBar
                type="danger"
                ctaLabel={intl.formatMessage(messages.tryAgain)}
                ctaLoading={areRequiredRequestsLoading}
                sticky
                onClick={retryRequiredRequests}
              >
                <Icon icon={mdiFlash} />
                {intl.formatMessage(messages.requiredRequestsFailed)}
              </InfoBar>
            )}
            {authRequestFailed && (
              <InfoBar
                type="danger"
                ctaLabel={intl.formatMessage(messages.tryAgain)}
                ctaLoading={areRequiredRequestsLoading}
                sticky
                onClick={retryRequiredRequests}
              >
                <Icon icon={mdiFlash} />
                {intl.formatMessage(messages.authRequestFailed)}
              </InfoBar>
            )}
            {automaticUpdates &&
              showServicesUpdatedInfoBar &&
              this.state.shouldShowServicesUpdatedInfoBar && (
                <InfoBar
                  type="primary"
                  ctaLabel={intl.formatMessage(messages.buttonReloadServices)}
                  onClick={() => window.location.reload()}
                  onHide={() => {
                    this.setState({
                      shouldShowServicesUpdatedInfoBar: false,
                    });
                  }}
                >
                  <Icon icon={mdiPowerPlug} />
                  {intl.formatMessage(messages.servicesUpdated)}
                </InfoBar>
              )}
            {automaticUpdates &&
              (appUpdateIsDownloaded || (isSnap && isUpdateAvailable)) &&
              this.state.shouldShowAppUpdateInfoBar && (
                <AppUpdateInfoBar
                  onInstallUpdate={installAppUpdate}
                  updateVersionParsed={updateVersionParse(updateVersion)}
                  onHide={() => {
                    this.setState({ shouldShowAppUpdateInfoBar: false });
                  }}
                />
              )}
            <BasicAuth />
            <QuickSwitch />
            <PublishDebugInfo />
            {services}
            <Outlet />
          </div>

          {!isMessages && activeModule === 'home' && <HomeScreen />}
          {!isMessages && activeModule === 'knowledge-base' && (
            <KnowledgeScreen />
          )}
          {!isMessages &&
            activeModule === 'service-type' &&
            activeServiceTab === 'account' && <AccountManagementScreen />}
          {!isMessages &&
            activeModule === 'service-type' &&
            activeServiceTab === 'profile' && <UserProfileScreen />}
        </>
      );
    };

    return (
      <>
        {isMac && !isFullScreen && <div className="window-draggable" />}
        <ErrorBoundary>
          <div
            className={`h-full app ${useCompactWorkspaceDrawer ? 'app--compact-workspace' : ''}`}
          >
            {isWindows && !isFullScreen && (
              <TitleBar
                menu={window['ferdium'].menu.template}
                icon="assets/images/logo.svg"
              />
            )}
            {isMac && !isFullScreen && (
              <span
                onDoubleClick={toggleFullScreen}
                className={classes.titleBar}
              />
            )}
            <div className={`h-full app__content ${classes.appContent}`}>
              <MainModuleTabs />

              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex-shrink-0 w-full h-[56px] bg-container border-b border-solid border-b-line flex items-center justify-between px-[24px]">
                  <span className="flex items-center gap-[12px] text-[16px] font-semibold leading-[24px] text-primary">
                    {MODULE_LABELS[navigationStore.activeModule]}
                  </span>

                  {stores?.user.data && (
                    <div className="flex items-center gap-[8px]">
                      <div className="w-[32px] h-[32px] rounded-full bg-component flex items-center justify-center text-secondary">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="square"
                          />
                          <path
                            d="M15.5 8.5C15.5 10.433 13.933 12 12 12C10.067 12 8.5 10.433 8.5 8.5C8.5 6.567 10.067 5 12 5C13.933 5 15.5 6.567 15.5 8.5Z"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="square"
                          />
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M18.5 19.5996V19C18.5 16.7909 16.7091 15 14.5 15H9.5C7.29086 15 5.5 16.7909 5.5 19V19.5996C7.24803 21.0961 9.51846 22 12 22C14.4815 22 16.752 21.0961 18.5 19.5996Z"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="square"
                          />
                        </svg>
                      </div>
                      <span className="text-[14px] text-primary">
                        {stores.user.waAkgEmail ||
                          `${stores.user.data.firstname} ${stores.user.data.lastname}`}
                      </span>
                      {/* <img
                        src="./assets/images/topbar-user-chevron.svg"
                        alt=""
                        className="w-[16px] h-[16px]"
                      /> */}
                      <button
                        type="button"
                        onClick={() =>
                          this.props.actions?.ui?.openSettings?.({
                            path: 'app',
                          })
                        }
                        className="ml-2 p-3 -m-3 sidebar__button sidebar__button--settings"
                        data-tooltip-id="tooltip-sidebar-button"
                        data-tooltip-content={intl.formatMessage(
                          messages.settingsTooltip,
                        )}
                      >
                        <Icon icon={mdiCog} size={1} />
                        {showUpdateDot && (
                          <span className="update-available">•</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-row flex-1 min-h-0">
                  {activeModule === 'service-type' && <ServiceSubTabs />}

                  {isServiceTypeMessagesMode && sidebar}

                  <div className="app__service flex-auto min-w-0">
                    {renderMainContent()}
                  </div>

                  {isServiceTypeMessagesMode && <Todos />}
                </div>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      </>
    );
  }
}

export default injectIntl(
  injectSheet(styles, { injectTheme: true })(AppLayout),
);
