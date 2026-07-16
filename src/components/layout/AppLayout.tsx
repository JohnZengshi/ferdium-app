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

import { mdiFlash, mdiPowerPlug } from '@mdi/js';
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
import InstagramDMAccountManagementScreen from '../../containers/service-group/InstagramDMAccountManagementScreen';
import TelegramAccountManagementScreen from '../../containers/service-group/TelegramAccountManagementScreen';
import TikTokAccountManagementScreen from '../../containers/service-group/TikTokAccountManagementScreen';
import UserProfileScreen from '../../containers/service-group/UserProfileScreen';
import WhatsAppAccountManagementScreen from '../../containers/service-group/WhatsAppAccountManagementScreen';
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
  moduleTelegram: {
    id: 'appLayout.moduleTelegram',
    defaultMessage: 'Telegram',
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

const styles = {
  appContent: {
    width: '100%',
    transition,
    transform: 'translateX(0)',
  },
  titleBar: {
    display: 'block',
    zIndex: 1,
    width: '100%',
    height: '10px',
    position: 'absolute',
    top: 0,
  },
};

const toggleFullScreen = () => {
  ipcRenderer.send('window.toolbar-double-clicked');
};

const appVersion = APP_VERSION;

interface IProps extends WrappedComponentProps, WithStylesProps<typeof styles> {
  stores?: Stores;
  actions?: Actions;
  settings: SettingsStore;
  isUpdateAvailable: boolean;
  updateVersion: string;
  isFullScreen: boolean;
  sidebar: React.ReactElement;
  telegramSidebar: React.ReactElement;
  tiktokSidebar: React.ReactElement;
  instagramSidebar: React.ReactElement;
  whatsappServices: React.ReactElement;
  telegramServices: React.ReactElement;
  tiktokServices: React.ReactElement;
  instagramServices: React.ReactElement;
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
      this._handleAiToast as EventListener,
    );
    window.addEventListener(
      'tg-ai-toast',
      this._handleAiToast as EventListener,
    );
  }

  componentWillUnmount() {
    window.removeEventListener(
      'wa-ai-toast',
      this._handleAiToast as EventListener,
    );
    window.removeEventListener(
      'tg-ai-toast',
      this._handleAiToast as EventListener,
    );
  }

  _handleAiToast = (event: CustomEvent) => {
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
      telegramSidebar,
      tiktokSidebar,
      instagramSidebar,
      whatsappServices,
      telegramServices,
      tiktokServices,
      instagramServices,
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
      actions,
    } = this.props;

    const { intl } = this.props;

    const moduleNames: Record<FerdiumModule, string> = {
      home: intl.formatMessage(messages.moduleHome),
      whatsapp: intl.formatMessage(messages.moduleServiceType),
      telegram: intl.formatMessage(messages.moduleTelegram),
      tiktok: 'TikTok',
      instagramDM: 'Instagram DM',
      'knowledge-base': intl.formatMessage(messages.moduleKnowledgeBase),
      settings: intl.formatMessage(messages.moduleSettings),
    };

    const MODULE_ICONS: Partial<Record<FerdiumModule, string>> = {
      home: './assets/images/desktop-1.svg',
      whatsapp: './assets/images/chat-ws.svg',
      telegram: './assets/images/telegram.svg',
      'knowledge-base': './assets/images/collection.svg',
    };

    const { locked, automaticUpdates, useCompactWorkspaceDrawer } =
      settings.app;
    if (locked) {
      return <LockedScreen />;
    }

    const { activeModule, activeServiceTab } = navigationStore;
    const isServiceTypeMessagesMode =
      activeModule === 'whatsapp' && activeServiceTab === 'messages';
    const isTelegramMessagesMode =
      activeModule === 'telegram' && activeServiceTab === 'messages';
    const isTikTokMessagesMode =
      activeModule === 'tiktok' && activeServiceTab === 'messages';
    const isInstagramDMMessagesMode =
      activeModule === 'instagramDM' && activeServiceTab === 'messages';

    const appUpdateStatus = (stores?.app?.updateStatus ??
      '') as unknown as string;
    const { AVAILABLE, DOWNLOADED } = stores?.app?.updateStatusTypes || {};
    const showUpdateDot =
      stores?.settings?.app?.automaticUpdates &&
      (appUpdateStatus === AVAILABLE ||
        appUpdateStatus === DOWNLOADED ||
        showServicesUpdatedInfoBar);
    const rawUserName =
      `${stores?.user?.data?.firstname || ''} ${stores?.user?.data?.lastname || ''}`.trim();
    const normalizedProfileName = (stores?.user?.profileEmail || '').split(
      '@',
    )[0];
    const displayUserName =
      rawUserName && rawUserName !== 'Aitalk Application'
        ? rawUserName
        : normalizedProfileName || rawUserName;

    const renderMainContent = () => {
      // IMPORTANT: keep the services/webview container mounted and toggle visibility with CSS only.
      // Unmounting here will recreate webviews on tab switch, which breaks the cached session state
      // and causes a visible reload that hurts user experience.
      const isMessages =
        isServiceTypeMessagesMode ||
        isTelegramMessagesMode ||
        isTikTokMessagesMode ||
        isInstagramDMMessagesMode;
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
            <div
              className={`flex-1 flex flex-col min-h-0 ${isServiceTypeMessagesMode ? '' : 'hidden'}`}
            >
              {whatsappServices}
            </div>
            <div
              className={`flex-1 flex flex-col min-h-0 ${isTelegramMessagesMode ? '' : 'hidden'}`}
            >
              {telegramServices}
            </div>
            <div
              className={`flex-1 flex flex-col min-h-0 ${isTikTokMessagesMode ? '' : 'hidden'}`}
            >
              {tiktokServices}
            </div>
            <div
              className={`flex-1 flex flex-col min-h-0 ${isInstagramDMMessagesMode ? '' : 'hidden'}`}
            >
              {instagramServices}
            </div>
            <Outlet />
          </div>

          {!isMessages && activeModule === 'home' && <HomeScreen />}
          {!isMessages && activeModule === 'knowledge-base' && (
            <KnowledgeScreen />
          )}
          {!isMessages &&
            activeModule === 'whatsapp' &&
            activeServiceTab === 'account' && (
              <WhatsAppAccountManagementScreen />
            )}
          {!isMessages &&
            activeModule === 'whatsapp' &&
            activeServiceTab === 'profile' && <UserProfileScreen />}
          {!isMessages &&
            activeModule === 'telegram' &&
            activeServiceTab === 'account' && (
              <TelegramAccountManagementScreen />
            )}
          {!isMessages &&
            activeModule === 'telegram' &&
            activeServiceTab === 'profile' && <UserProfileScreen />}
          {!isMessages &&
            activeModule === 'tiktok' &&
            activeServiceTab === 'account' && <TikTokAccountManagementScreen />}
          {!isMessages &&
            activeModule === 'tiktok' &&
            activeServiceTab === 'profile' && <UserProfileScreen />}
          {!isMessages &&
            activeModule === 'instagramDM' &&
            activeServiceTab === 'account' && (
              <InstagramDMAccountManagementScreen />
            )}
          {!isMessages &&
            activeModule === 'instagramDM' &&
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
              <TitleBar menu={window['ferdium'].menu.template} />
            )}
            {isMac && !isFullScreen && (
              <span
                onDoubleClick={toggleFullScreen}
                className={classes.titleBar}
              />
            )}
            <div className={`h-full app__content ${classes.appContent}`}>
              <MainModuleTabs appVersion={appVersion} />

              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex-shrink-0 w-full h-[56px] bg-container border-b border-solid border-b-line flex items-center justify-between px-[24px]">
                  <span className="flex items-center gap-[12px] text-[16px] font-semibold leading-[24px] text-primary">
                    {activeModule === 'telegram' ? (
                      <span
                        className="h-[24px] w-[24px] flex-shrink-0 inline-block bg-brand"
                        style={{
                          maskImage: `url(${MODULE_ICONS.telegram})`,
                          WebkitMaskImage: `url(${MODULE_ICONS.telegram})`,
                          maskSize: 'contain',
                          WebkitMaskSize: 'contain',
                          maskRepeat: 'no-repeat',
                          WebkitMaskRepeat: 'no-repeat',
                          maskPosition: 'center',
                          WebkitMaskPosition: 'center',
                        }}
                      />
                    ) : (
                      MODULE_ICONS[activeModule] && (
                        <img
                          src={MODULE_ICONS[activeModule]}
                          alt=""
                          aria-hidden="true"
                          className="h-[24px] w-[24px] flex-shrink-0"
                        />
                      )
                    )}
                    {moduleNames[navigationStore.activeModule]}
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
                      <div className="w-[32px] h-[32px] rounded-full bg-transparent transition-colors hover:bg-component flex items-center justify-center text-secondary">
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
                        {displayUserName}
                      </span>
                      <button
                        type="button"
                        onClick={() => actions!.ui.openSettingsModal()}
                        className="p-[6px] sidebar__button sidebar__button--settings flex items-center justify-center"
                        data-tooltip-id="tooltip-sidebar-button"
                        data-tooltip-content={intl.formatMessage(
                          messages.settingsTooltip,
                        )}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-primary"
                        >
                          <path
                            d="M10.0004 0.70459L18.0506 5.35238V14.648L10.0004 19.2958L1.9502 14.648V5.35238L10.0004 0.70459ZM10.0004 2.62909L3.61686 6.31463V13.6857L10.0004 17.3713L16.384 13.6857V6.31463L10.0004 2.62909ZM10.0004 7.50017C8.6197 7.50017 7.50041 8.61946 7.50041 10.0002C7.50041 11.3809 8.6197 12.5002 10.0004 12.5002C11.3811 12.5002 12.5004 11.3809 12.5004 10.0002C12.5004 8.61946 11.3811 7.50017 10.0004 7.50017ZM5.83374 10.0002C5.83374 7.69899 7.69922 5.83351 10.0004 5.83351C12.3016 5.83351 14.1671 7.69899 14.1671 10.0002C14.1671 12.3014 12.3016 14.1668 10.0004 14.1668C7.69922 14.1668 5.83374 12.3014 5.83374 10.0002Z"
                            fill="currentColor"
                            fillOpacity="0.9"
                          />
                        </svg>
                        {showUpdateDot && (
                          <span className="update-available">•</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-row flex-1 min-h-0">
                  {activeModule === 'whatsapp' && <ServiceSubTabs />}
                  {activeModule === 'telegram' && (
                    <ServiceSubTabs moduleId="telegram" />
                  )}
                  {activeModule === 'tiktok' && (
                    <ServiceSubTabs moduleId="tiktok" />
                  )}
                  {activeModule === 'instagramDM' && (
                    <ServiceSubTabs moduleId="instagramDM" />
                  )}

                  {isServiceTypeMessagesMode && sidebar}
                  {isTelegramMessagesMode && telegramSidebar}
                  {isTikTokMessagesMode && tiktokSidebar}
                  {isInstagramDMMessagesMode && instagramSidebar}

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
          visible={stores!.ui.isSettingsModalVisible}
          onClose={() => actions!.ui.closeSettingsModal()}
        />
      </>
    );
  }
}

export default injectIntl(
  injectSheet(styles, { injectTheme: true })(AppLayout),
);
