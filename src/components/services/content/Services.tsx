import { observer } from 'mobx-react';
import ms from 'ms';
import { Component, type ReactElement } from 'react';
import Confetti from 'react-confetti';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import withStyles, { type WithStylesProps } from 'react-jss';
import type Service from '../../../models/Service';
import Appear from '../../ui/effects/Appear';
import ServiceView from './ServiceView';

const messages = defineMessages({
  noAccountsTitle: {
    id: 'services.noAccountsTitle',
    defaultMessage: 'No Accounts Yet',
  },
  noAccountsDescription: {
    id: 'services.noAccountsDescription',
    defaultMessage: 'Once you link an account, your chat data will appear here',
  },
  login: {
    id: 'services.login',
    defaultMessage: 'Please login to use Ferdium.',
  },
  serverless: {
    id: 'services.serverless',
    defaultMessage: 'Use Ferdium without an Account',
  },
  serverInfo: {
    id: 'services.serverInfo',
    defaultMessage:
      'Optionally, you can change your Ferdium server by clicking the cog in the bottom left corner. If you are switching over (from one of the hosted servers) to using Ferdium without an account, please be informed that you can export your data from that server and subsequently import it using the Help menu to resurrect all your workspaces and configured services!',
  },
});

const styles = {
  confettiContainer: {
    position: 'absolute',
    width: '100%',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  emptyAccountLayer: {
    height: '100%',
    width: '100%',
  },
  emptyAccountContent: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    transform: 'translateY(52px)',
  },
  emptyAccountState: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  emptyAccountImage: {
    height: 210,
    width: 260,
    marginBottom: 18,
  },
  emptyAccountTitle: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: '24px',
    margin: 0,
  },
  emptyAccountDescription: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: '24px',
    margin: 0,
  },
};

interface IProps extends WrappedComponentProps, WithStylesProps<typeof styles> {
  services?: Service[];
  setWebviewReference: () => void;
  detachService: () => void;
  // handleIPCMessage: () => void; // TODO: [TECH DEBT] later check it
  // openWindow: () => void; // TODO: [TECH DEBT] later check it
  reload: (options: { serviceId: string }) => void;
  openSettings: (options: { path: string }) => void;
  update: (options: {
    serviceId: string;
    serviceData: { isEnabled: boolean };
    redirect: boolean;
  }) => void;
  userHasCompletedSignup: boolean;
  isSpellcheckerEnabled: boolean;
}

interface IState {
  showConfetti: boolean;
}

@observer
class Services extends Component<IProps, IState> {
  confettiTimeout: number | null = null;

  constructor(props: IProps) {
    super(props);

    this.state = {
      showConfetti: true,
    };
  }

  componentDidMount(): void {
    this.confettiTimeout = window.setTimeout(() => {
      this.setState({
        showConfetti: false,
      });
    }, ms('8s'));
  }

  componentWillUnmount(): void {
    if (this.confettiTimeout) {
      clearTimeout(this.confettiTimeout);
    }
  }

  render(): ReactElement {
    const {
      services = [],
      // handleIPCMessage, // TODO: [TECH DEBT] later check it
      setWebviewReference,
      detachService,
      // openWindow, // TODO: [TECH DEBT] later check it
      reload,
      openSettings,
      update,
      userHasCompletedSignup,
      classes,
      isSpellcheckerEnabled,
      intl,
    } = this.props;

    const { showConfetti } = this.state;

    return (
      <div className="services">
        {userHasCompletedSignup && (
          <div className={classes.confettiContainer}>
            <Confetti
              width={window.innerWidth}
              height={window.innerHeight}
              numberOfPieces={showConfetti ? 200 : 0}
            />
          </div>
        )}
        {services.length === 0 && (
          <Appear transitionName="slideUp">
            <div
              className={`services__no-service ${classes.emptyAccountLayer}`}
            >
              <div className={classes.emptyAccountContent}>
                <img
                  src="./assets/images/empty-accounts.svg"
                  alt=""
                  className={classes.emptyAccountImage}
                />
                <div className={classes.emptyAccountState}>
                  <p className={classes.emptyAccountTitle}>
                    {intl.formatMessage(messages.noAccountsTitle)}
                  </p>
                  <p className={classes.emptyAccountDescription}>
                    {intl.formatMessage(messages.noAccountsDescription)}
                  </p>
                </div>
              </div>
            </div>
          </Appear>
        )}
        {services
          .filter(service => !service.isTodosService)
          .map(service => (
            <ServiceView
              key={service.id}
              service={service}
              // handleIPCMessage={handleIPCMessage} //  TODO: [TECH DEBT][PROPS NOT EXIST IN COMPONENT] later check it
              setWebviewRef={setWebviewReference}
              detachService={detachService}
              // openWindow={openWindow} //  TODO: [TECH DEBT][PROPS NOT EXIST IN COMPONENT] later check it
              reload={() => reload({ serviceId: service.id })}
              edit={() => openSettings({ path: `services/edit/${service.id}` })}
              enable={() =>
                update({
                  serviceId: service.id,
                  serviceData: {
                    isEnabled: true,
                  },
                  redirect: false,
                })
              }
              isSpellcheckerEnabled={isSpellcheckerEnabled}
            />
          ))}
      </div>
    );
  }
}

export default injectIntl(withStyles(styles, { injectTheme: true })(Services));
