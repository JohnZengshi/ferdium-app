import { reaction } from 'mobx';
import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import { ThemeProvider } from 'react-jss';
import { Outlet } from 'react-router-dom';
import tinycolor from 'tinycolor2';

import type { StoresProps } from '../../@types/ferdium-components.types';
import AppLayout from '../../components/layout/AppLayout';
import AppLoading from '../../components/layout/AppLoading';
import InstagramDMAccountSlider from '../../components/layout/InstagramDMAccountSlider';
import TelegramAccountSlider from '../../components/layout/TelegramAccountSlider';
import TikTokAccountSlider from '../../components/layout/TikTokAccountSlider';
import WhatsAppAccountSlider from '../../components/layout/WhatsAppAccountSlider';
import Services from '../../components/services/content/Services';
import { DEFAULT_ACCENT_COLOR } from '../../config';
import { navigationStore } from '../../stores/NavigationStore';

interface IProps extends StoresProps {}

@inject('stores', 'actions')
@observer
class AppLayoutContainer extends Component<IProps> {
  private _moduleDisposer?: () => void;

  componentDidMount(): void {
    const { actions } = this.props;
    this._moduleDisposer = reaction(
      () => ({
        module: navigationStore.activeModule,
        waCount: this.props.stores?.services?.whatsAppServices?.length ?? 0,
        tgCount: this.props.stores?.services?.telegramServices?.length ?? 0,
        ttCount: this.props.stores?.services?.tiktokServices?.length ?? 0,
        igCount: this.props.stores?.services?.instagramDMServices?.length ?? 0,
      }),
      ({ module }) => {
        const { stores } = this.props;
        if (!stores || !actions) return;
        const serviceId = navigationStore.moduleActiveService[module];
        const currentActive = stores.services.all.find(s => s.isActive);
        if (serviceId) {
          if (currentActive?.id !== serviceId) {
            actions.service.setActive({ serviceId });
          }
          return;
        }
        const moduleList =
          module === 'whatsapp'
            ? stores.services.whatsAppServices
            : module === 'telegram'
              ? stores.services.telegramServices
              : module === 'tiktok'
                ? stores.services.tiktokServices
                : module === 'instagramDM'
                  ? stores.services.instagramDMServices
                  : [];
        const first = moduleList[0];
        if (first && currentActive?.id !== first.id) {
          navigationStore.setModuleActiveService(module, first.id);
          actions.service.setActive({ serviceId: first.id });
        }
      },
      { fireImmediately: true },
    );
  }

  componentWillUnmount(): void {
    this._moduleDisposer?.();
  }

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

    const sidebar = <WhatsAppAccountSlider />;
    const telegramSidebar = <TelegramAccountSlider />;
    const tiktokSidebar = <TikTokAccountSlider />;
    const instagramSidebar = <InstagramDMAccountSlider />;

    const commonServiceProps = {
      setWebviewReference,
      detachService,
      reload,
      openSettings,
      update: updateService,
      userHasCompletedSignup: user.hasCompletedSignup,
      isSpellcheckerEnabled: settings.app.enableSpellchecking,
    } as const;

    const whatsappServicesContainer = (
      <Services services={services.whatsAppServices} {...commonServiceProps} />
    );

    const telegramServicesContainer = (
      <Services services={services.telegramServices} {...commonServiceProps} />
    );

    const tiktokServicesContainer = (
      <Services services={services.tiktokServices} {...commonServiceProps} />
    );

    const instagramDMServicesContainer = (
      <Services
        services={services.instagramDMServices}
        {...commonServiceProps}
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
          telegramSidebar={telegramSidebar}
          tiktokSidebar={tiktokSidebar}
          instagramSidebar={instagramSidebar}
          whatsappServices={whatsappServicesContainer}
          telegramServices={telegramServicesContainer}
          tiktokServices={tiktokServicesContainer}
          instagramDMServices={instagramDMServicesContainer}
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
