import classnames from 'classnames';
import { type IReactionDisposer, autorun } from 'mobx';
import { inject, observer } from 'mobx-react';
import { Component } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import TopBarProgress from 'react-topbar-progress-indicator';
import { CUSTOM_WEBSITE_RECIPE_ID } from '../../../config';
import WebControlsScreen from '../../../features/webControls/containers/WebControlsScreen';
import type ServiceModel from '../../../models/Service';
import type { RealStores } from '../../../stores';
import MediaSource from '../../MediaSource';
import StatusBarTargetUrl from '../../ui/StatusBarTargetUrl';
import WebviewLoader from '../../ui/WebviewLoader';
import ServiceDisabled from './ServiceDisabled';
import ServiceWebview from './ServiceWebview';
import WebviewCrashHandler from './WebviewCrashHandler';
import WebviewErrorHandler from './WebviewErrorHandler';

const messages = defineMessages({
  hibernatingMessage: {
    id: 'service.hibernating.message',
    defaultMessage: 'This service is currently hibernating.',
  },
  hibernatingAction: {
    id: 'service.hibernating.action',
    defaultMessage: 'Try switching services or reloading Aitalk.',
  },
});

interface IProps extends WrappedComponentProps {
  service: ServiceModel;
  setWebviewRef: () => void;
  detachService: () => void;
  reload: () => void;
  edit: () => void;
  enable: () => void;
  // isActive?: boolean; // TODO: [TECH DEBT][PROP NOT USED IN COMPONENT] check it
  stores?: RealStores;
  isSpellcheckerEnabled: boolean;
}

interface IState {
  forceRepaint: boolean;
  targetUrl: string;
  statusBarVisible: boolean;
}

@inject('stores', 'actions')
@observer
class ServiceView extends Component<IProps, IState> {
  // hibernationTimer = null; // TODO: [TS DEBT] class property not reassigned, need to find its purpose

  autorunDisposer: IReactionDisposer | undefined;

  forceRepaintTimeout: NodeJS.Timeout | undefined;

  postLoginReadyCheckRunning = false;

  constructor(props: IProps) {
    super(props);

    this.state = {
      forceRepaint: false,
      targetUrl: '',
      statusBarVisible: false,
    };
  }

  componentDidMount() {
    this.autorunDisposer = autorun(() => {
      if (this.props.service.isActive) {
        this.setState({ forceRepaint: true });
        this.forceRepaintTimeout = setTimeout(() => {
          this.setState({ forceRepaint: false });
        }, 100);
      }
    });
  }

  handleDidStopLoading = () => {
    const { service, stores } = this.props;
    const isPostLoginReloading =
      stores!.whatsappAutomation.postLoginReloadingServices.has(service.id);
    const wasPostLoginReloadTriggered =
      stores!.whatsappAutomation.postLoginReloadTriggeredServices.has(
        service.id,
      );
    if (
      !isPostLoginReloading ||
      !wasPostLoginReloadTriggered ||
      this.postLoginReadyCheckRunning ||
      !service.webview
    )
      return;

    this.postLoginReadyCheckRunning = true;
    service.webview
      .executeJavaScript(
        `
        new Promise(resolve => {
          const isReady = () =>
            Boolean(
              document.querySelector('#main') &&
              document.querySelector('#main footer, footer')
            );
          if (isReady()) {
            resolve(true);
            return;
          }
          const observer = new MutationObserver(() => {
            if (!isReady()) return;
            observer.disconnect();
            resolve(true);
          });
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
          });
          window.setTimeout(() => {
            observer.disconnect();
            resolve(false);
          }, 8000);
        });
      `,
      )
      .catch(() => false)
      .then(() => {
        window.requestAnimationFrame(() => {
          stores!.whatsappAutomation.finishPostLoginReload(service.id);
          this.postLoginReadyCheckRunning = false;
        });
      });
  };

  componentWillUnmount() {
    this.autorunDisposer!();
    clearTimeout(this.forceRepaintTimeout);
    // clearTimeout(this.hibernationTimer); // TODO: [TS DEBT] class property not reassigned, need to find its purpose
  }

  render() {
    const {
      detachService,
      service,
      setWebviewRef,
      reload,
      edit,
      enable,
      stores,
      isSpellcheckerEnabled,
      intl,
    } = this.props;

    const { navigationBarBehaviour, navigationBarManualActive } =
      stores!.settings.app;

    const showNavBar =
      navigationBarBehaviour === 'always' ||
      (navigationBarBehaviour === 'custom' &&
        service.recipe.id === CUSTOM_WEBSITE_RECIPE_ID) ||
      navigationBarManualActive;

    const webviewClasses = classnames({
      services__webview: true,
      'services__webview-wrapper': true,
      'is-active': service.isActive,
      'services__webview--force-repaint': this.state.forceRepaint,
    });

    const statusBar = this.state.statusBarVisible ? (
      <StatusBarTargetUrl text={this.state.targetUrl} />
    ) : null;
    const isPostLoginReloading =
      stores!.whatsappAutomation.postLoginReloadingServices.has(service.id);

    return (
      <div
        className={`${webviewClasses} h-full flex flex-col `}
        data-name={service.name}
        style={{ order: service.order }}
      >
        {service.isActive && service.isEnabled && (
          <>
            {service.hasCrashed && (
              <WebviewCrashHandler
                name={service.recipe.name}
                // webview={service.webview} // TODO: [TECH DEBT][PROPS NOT EXIST IN COMPONENT] check it
                reload={reload}
              />
            )}
            {service.isEnabled &&
              service.isLoading &&
              service.isFirstLoad &&
              !service.isHibernating &&
              !service.isServiceAccessRestricted && (
                <WebviewLoader loaded={false} name={service.name} />
              )}
            {service.isProgressbarEnabled &&
              service.isLoadingPage &&
              !service.isFirstLoad &&
              !isPostLoginReloading && <TopBarProgress />}
            {isPostLoginReloading && (
              <div
                className="absolute inset-0 z-[1000] flex bg-white dark:bg-[#111b21]"
                aria-live="polite"
                aria-busy="true"
              >
                <WebviewLoader loaded={false} name={service.name} />
              </div>
            )}
            {service.isError && (
              <WebviewErrorHandler
                name={service.recipe.name}
                errorMessage={service.errorMessage}
                reload={reload}
                edit={edit}
              />
            )}
          </>
        )}
        {service.isEnabled ? (
          // eslint-disable-next-line react/jsx-no-useless-fragment
          <>
            {service.isHibernating ? (
              <div className="flex h-full w-full flex-col items-center justify-center text-center">
                <span
                  role="img"
                  aria-label="Sleeping Emoji"
                  className="text-[42px]"
                >
                  😴
                </span>
                <br />
                <br />
                {intl.formatMessage(messages.hibernatingMessage)}
                <br />
                {intl.formatMessage(messages.hibernatingAction)}
              </div>
            ) : (
              <>
                {showNavBar && <WebControlsScreen service={service} />}
                <MediaSource service={service} />
                <ServiceWebview
                  service={service}
                  setWebviewReference={setWebviewRef}
                  detachService={detachService}
                  isSpellcheckerEnabled={isSpellcheckerEnabled}
                  onDidStopLoading={this.handleDidStopLoading}
                  stores={stores}
                />
              </>
            )}
          </>
        ) : (
          // eslint-disable-next-line react/jsx-no-useless-fragment
          <>
            {service.isActive && (
              <ServiceDisabled
                name={service.name === '' ? service.recipe.name : service.name}
                // webview={service.webview} // TODO: [TECH DEBT][PROPS NOT EXIST IN COMPONENT] check it
                enable={enable}
              />
            )}
          </>
        )}
        {statusBar}
      </div>
    );
  }
}

export default injectIntl(ServiceView);
