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
import { Badge, MessagePlugin } from 'tdesign-react';
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
import SettingsModal from './SettingsModal';

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
  notificationsTooltip: {
    id: 'appLayout.notificationsTooltip',
    defaultMessage: 'Notifications',
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
  settingsModalVisible: boolean;
}

@inject('stores', 'actions')
@observer
class AppLayout extends Component<PropsWithChildren<IProps>, IState> {
  constructor(props) {
    super(props);

    this.state = {
      shouldShowAppUpdateInfoBar: true,
      shouldShowServicesUpdatedInfoBar: true,
      settingsModalVisible: false,
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

    const MODULE_ICONS: Partial<Record<FerdiumModule, string>> = {
      home: './assets/images/desktop-1.svg',
      'service-type': './assets/images/chat-ws.svg',
      'knowledge-base': './assets/images/collection.svg',
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
                    {activeModule === 'knowledge-base' ? (
                      <svg
                        width="84"
                        height="24"
                        viewBox="0 0 84 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="flex-shrink-0"
                      >
                        <path
                          d="M18 4H19V2H18H6H5V4H6L18 4ZM21 7.5H20L4 7.5H3V5.5L4 5.5L20 5.5H21V7.5ZM23 9V10V21V22H22H2H1V21V10V9H2L22 9H23ZM21 11L3 11L3 20H21V11Z"
                          fill="#0052D9"
                        />
                        <path
                          d="M38.016 5.04C38.976 5.344 39.856 5.712 40.656 6.16L39.76 7.504C38.928 6.976 38.064 6.56 37.184 6.272L38.016 5.04ZM42.784 4.784L44.432 4.992C44.336 5.296 44.224 5.584 44.096 5.856H50.32V6.848C50.144 7.616 49.92 8.4 49.632 9.168L48.032 8.688C48.256 8.288 48.448 7.824 48.608 7.312H46.448C46.384 7.6 46.304 7.872 46.224 8.128C47.072 9.216 48.656 9.984 50.992 10.4L50.4 11.856C48.16 11.392 46.544 10.592 45.536 9.44C45.376 9.632 45.232 9.808 45.088 9.968C44.352 10.736 43.056 11.328 41.216 11.76L40.592 10.272C42.08 9.968 43.152 9.536 43.808 8.992C44.288 8.56 44.64 8 44.848 7.312H43.248C42.832 7.856 42.336 8.352 41.776 8.8L40.784 7.504C41.776 6.768 42.432 5.872 42.784 4.784ZM49.264 11.936V16.72H47.584V13.488H40.368V16.912H38.704V11.936H49.264ZM43.264 13.856L44.944 13.984C44.72 16.032 44.224 17.392 43.488 18.032C42.704 18.88 40.8 19.424 37.776 19.68L37.104 18.16C39.6 18.048 41.248 17.68 42.048 17.056C42.752 16.432 43.152 15.36 43.264 13.856ZM39.968 8.128L40.928 9.264C40.128 10.064 39.136 10.8 37.952 11.504L36.864 10.208C38.096 9.568 39.136 8.864 39.968 8.128ZM45.216 16.592C47.28 17.088 49.168 17.696 50.864 18.416L49.968 19.808C48.144 18.976 46.288 18.32 44.368 17.856L45.216 16.592ZM54.016 5.088C55.136 5.904 56.096 6.72 56.88 7.52L55.744 8.64C55.072 7.872 54.128 7.056 52.896 6.16L54.016 5.088ZM53.728 9.008C54.784 9.792 55.664 10.576 56.384 11.344L55.264 12.48C54.656 11.744 53.76 10.944 52.608 10.08L53.728 9.008ZM55.136 13.392L56.576 13.968C55.904 15.984 55.136 17.872 54.304 19.632L52.752 18.944C53.68 17.12 54.464 15.28 55.136 13.392ZM59.648 7.952H61.808C61.936 7.568 62.048 7.2 62.128 6.832H58.864V10.832C58.8 14.512 58.192 17.456 57.024 19.696L55.76 18.576C56.72 16.72 57.216 14.128 57.264 10.832V5.36H67.104V6.832H63.696C63.6 7.216 63.504 7.584 63.376 7.952H66.32V13.888H63.808V18.032C63.808 19.088 63.312 19.616 62.32 19.616H60.976L60.624 18.112C61.008 18.176 61.392 18.208 61.776 18.208C62.064 18.208 62.224 18.016 62.224 17.632V13.888H59.648V7.952ZM64.864 12.576V11.52H61.104V12.576H64.864ZM61.104 10.32H64.864V9.232H61.104V10.32ZM59.84 14.8L61.312 15.12C60.928 16.56 60.4 17.792 59.696 18.848L58.352 18C59.056 17.008 59.552 15.936 59.84 14.8ZM65.824 14.704C66.416 15.792 66.928 16.96 67.376 18.208L65.968 18.832C65.504 17.456 64.992 16.24 64.448 15.184L65.824 14.704ZM76.848 4.752C77.072 5.168 77.312 5.616 77.536 6.128H83.184V7.76H71.52V11.12C71.472 14.672 70.96 17.52 70 19.664L68.576 18.4C69.376 16.656 69.792 14.224 69.824 11.12V6.128H75.664C75.456 5.744 75.232 5.392 74.976 5.072L76.848 4.752ZM75.264 7.904L76.848 8.272C76.752 8.592 76.64 8.912 76.544 9.232H82.48V10.688H75.984C75.616 11.552 75.232 12.32 74.816 12.992H77.072V11.312H78.736V12.992H82.144V14.496H78.736V15.776H83.328V17.296H78.736V19.696H77.072V17.296H71.552V15.776H77.072V14.496H73.136L72.784 13.024C73.28 12.4 73.744 11.616 74.192 10.688H72.144V9.232H74.8C74.96 8.8 75.104 8.352 75.264 7.904Z"
                          fill="black"
                          fillOpacity="0.9"
                        />
                      </svg>
                    ) : (
                      <>
                        {MODULE_ICONS[activeModule] && (
                          <img
                            src={MODULE_ICONS[activeModule]}
                            alt=""
                            aria-hidden="true"
                            className="h-[24px] w-[24px] flex-shrink-0"
                          />
                        )}
                        {MODULE_LABELS[navigationStore.activeModule]}
                      </>
                    )}
                  </span>

                  {stores?.user.data && (
                    <div className="flex items-center gap-[8px]">
                      <Badge
                        count={stores?.handoff?.unreadCount ?? 0}
                        maxCount={99}
                        size="small"
                        offset={[5, 5]}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            navigationStore.setModule('home');
                            navigationStore.setHomeView('strategy');
                            navigationStore.setStrategyTab('notifications');
                          }}
                          className="flex h-[32px] w-[32px] items-center justify-center rounded-full border-0 bg-transparent p-0 text-secondary hover:bg-secondary-container hover:text-primary"
                          aria-label={intl.formatMessage(
                            messages.notificationsTooltip,
                          )}
                          data-tooltip-id="tooltip-sidebar-button"
                          data-tooltip-content={intl.formatMessage(
                            messages.notificationsTooltip,
                          )}
                        >
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M18 9.6C18 6.462 15.314 4 12 4S6 6.462 6 9.6v3.297c0 .483-.173.95-.488 1.316L4 15.973V18h16v-2.027l-1.512-1.76A2 2 0 0 1 18 12.897V9.6Z"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M9.5 20a2.5 2.5 0 0 0 5 0"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </Badge>
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
                          this.setState({
                            settingsModalVisible: true,
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
        <SettingsModal
          visible={this.state.settingsModalVisible}
          onClose={() => this.setState({ settingsModalVisible: false })}
        />
      </>
    );
  }
}

export default injectIntl(
  injectSheet(styles, { injectTheme: true })(AppLayout),
);
