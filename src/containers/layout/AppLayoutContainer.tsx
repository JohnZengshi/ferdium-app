import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import { ThemeProvider } from 'react-jss';
import { Outlet } from 'react-router-dom';
import tinycolor from 'tinycolor2';

import type { StoresProps } from '../../@types/ferdium-components.types';
import AccountSlider from '../../components/layout/AccountSlider';
import AppLayout from '../../components/layout/AppLayout';
import AppLoading from '../../components/layout/AppLoading';
import Services from '../../components/services/content/Services';
import { DEFAULT_ACCENT_COLOR } from '../../config';

interface IProps extends StoresProps {}

@inject('stores', 'actions')
@observer
class AppLayoutContainer extends Component<IProps> {
  render(): ReactElement {
    const { app, features, services, ui, settings, requests, user, router } =
      this.props.stores;

    /* HOTFIX for:
      [mobx] Encountered an uncaught exception that was thrown by a reaction or observer component, in: 'Reaction[bound ]' TypeError: Cannot read properties of null (reading 'push')
      at RouterStore.push (store.js:25)
      at UserStore._requireAuthenticatedUser
    */
    if (!user.isLoggedIn) {
      router.push(user.WELCOME_ROUTE);
    }

    const {
      // handleIPCMessage,
      setWebviewReference,
      detachService,
      // openWindow,
      reload,
      updateService,
    } = this.props.actions.service;

    let { accentColor } = settings.app;
    accentColor = tinycolor(accentColor).isValid()
      ? accentColor
      : DEFAULT_ACCENT_COLOR;
    document.documentElement.style.setProperty('--td-brand-color', accentColor);
    if (ui.isDarkThemeActive) {
      document.documentElement.setAttribute('theme-mode', 'dark');
    } else {
      document.documentElement.removeAttribute('theme-mode');
    }
    // ---

    const { retryRequiredRequests } = this.props.actions.requests;

    const { installUpdate } = this.props.actions.app;

    const { openSettings } = this.props.actions.ui;

    const isLoadingFeatures =
      features.featuresRequest.isExecuting &&
      !features.featuresRequest.wasExecuted;

    const isLoadingServices =
      services.allServicesRequest.isExecuting &&
      services.allServicesRequest.isExecutingFirstTime;

    const isLoadingSettings = !settings.loaded;

    if (isLoadingSettings || isLoadingFeatures || isLoadingServices) {
      return <AppLoading theme={ui.theme} />;
    }

    const sidebar = <AccountSlider />;

    const servicesContainer = (
      <Services
        services={services.allDisplayedUnordered}
        // handleIPCMessage={handleIPCMessage} // TODO: [TECH DEBT] check it later
        setWebviewReference={setWebviewReference}
        detachService={detachService}
        // openWindow={openWindow} // TODO: [TECH DEBT] check it later
        reload={reload}
        openSettings={openSettings}
        update={updateService}
        userHasCompletedSignup={user.hasCompletedSignup}
        isSpellcheckerEnabled={settings.app.enableSpellchecking}
      />
    );

    return (
      <ThemeProvider theme={ui.theme}>
        <AppLayout
          settings={settings}
          isFullScreen={app.isFullScreen}
          showServicesUpdatedInfoBar={ui.showServicesUpdatedInfoBar}
          appUpdateIsDownloaded={
            app.updateStatus === app.updateStatusTypes.DOWNLOADED
          }
          authRequestFailed={app.authRequestFailed}
          sidebar={sidebar}
          services={servicesContainer}
          installAppUpdate={installUpdate}
          showRequiredRequestsError={requests.showRequiredRequestsError}
          areRequiredRequestsSuccessful={requests.areRequiredRequestsSuccessful}
          retryRequiredRequests={retryRequiredRequests}
          areRequiredRequestsLoading={requests.areRequiredRequestsLoading}
          updateVersion={app.updateVersion}
          isUpdateAvailable={
            app.updateStatus === app.updateStatusTypes.AVAILABLE
          }
        >
          <Outlet />
        </AppLayout>
      </ThemeProvider>
    );
  }
}

export default AppLayoutContainer;
