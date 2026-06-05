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
import KnowledgeBaseScreen from '../../containers/knowledge-base/KnowledgeBaseScreen';
import AccountManagementScreen from '../../containers/service-group/AccountManagementScreen';
import UserProfileScreen from '../../containers/service-group/UserProfileScreen';
import { navigationStore } from '../../stores/NavigationStore';
import type { FerdiumModule } from '../../stores/NavigationStore';
import MainModuleTabs from './MainModuleTabs';
import ServiceSubTabs from './ServiceSubTabs';

const MODULE_LABELS: Record<FerdiumModule, string> = {
  home: '首页',
  'service-type': 'WA工具',
  'knowledge-base': '资料库',
  settings: '设置',
};

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
      // 首页模块
      if (activeModule === 'home') {
        return <HomeScreen />;
      }

      // 资料库模块
      if (activeModule === 'knowledge-base') {
        return <KnowledgeBaseScreen />;
      }

      // 服务类型模块 - 账号管理
      if (activeModule === 'service-type' && activeServiceTab === 'account') {
        return <AccountManagementScreen />;
      }

      // 服务类型模块 - 用户资料
      if (activeModule === 'service-type' && activeServiceTab === 'profile') {
        return <UserProfileScreen />;
      }

      // 服务类型模块 - 消息页（默认）
      return (
        <div className="flex flex-1 flex-col">
          <WorkspaceSwitchingIndicator />
          {!areRequiredRequestsSuccessful && showRequiredRequestsError && (
            <InfoBar
              type="danger"
              ctaLabel="Try again"
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
              ctaLabel="Try again"
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
      );
    };

    return (
      <>
        {isMac && !isFullScreen && <div className="window-draggable" />}
        <ErrorBoundary>
          <div
            className={`app ${useCompactWorkspaceDrawer ? 'app--compact-workspace' : ''}`}
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
            <div className={`app__content ${classes.appContent}`}>
              <MainModuleTabs />

              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex-shrink-0 w-full h-[56px] bg-white border-b border-solid border-b-[#E7E7E7] flex items-center justify-between px-[24px]">
                  <span
                    className="text-[16px] font-semibold leading-[24px]"
                    style={{ color: 'rgba(0,0,0,0.90)' }}
                  >
                    {MODULE_LABELS[navigationStore.activeModule]}
                  </span>

                  {stores?.user.data && (
                    <div className="flex items-center gap-[8px]">
                      <div className="w-[32px] h-[32px] rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs text-black/50">Avatar</span>
                      </div>
                      <span className="text-[14px] text-black/90">
                        {stores.user.data.firstname} {stores.user.data.lastname}
                      </span>
                      <img
                        src="./assets/images/topbar-user-chevron.svg"
                        alt=""
                        className="w-[16px] h-[16px]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          this.props.actions?.ui?.openSettings?.({
                            path: 'app',
                          })
                        }
                        className="ml-2 sidebar__button sidebar__button--settings"
                        data-tooltip-id="tooltip-sidebar-button"
                        data-tooltip-content="Settings"
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

                  <div className="app__service">{renderMainContent()}</div>

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
