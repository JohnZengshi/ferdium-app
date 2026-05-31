import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import { type IntlShape, injectIntl } from 'react-intl';
import type { StoresProps } from '../../@types/ferdium-components.types';
import DynamicLogin from '../../components/auth/DynamicLogin';
import authManager from '../../lib/auth/AuthManager';

const debug = require('../../preload-safe-debug')('Ferdium:WaAkgLoginScreen');

interface IProps extends StoresProps {
  intl: IntlShape;
  error?: { status?: number; message?: string };
}

@inject('stores', 'actions')
@observer
class WaAkgLoginScreen extends Component<IProps> {
  componentDidMount(): void {
    authManager.setActiveProvider('nextauth');
  }

  handleAuthenticated = (result: {
    token?: string;
    apiKey?: string;
  }): void => {
    const { stores } = this.props;
    if (!stores?.user) {
      debug('Stores not available');
      return;
    }
    if (result.token) {
      stores.user._tokenLogin(result.token);
    } else {
      stores.router.push('/');
    }
  };

  render(): ReactElement {
    const { stores, intl } = this.props;
    if (!stores?.user) {
      return <div>Loading...</div>;
    }
    const { isTokenExpired } = stores.user;
    const logoutReason = (stores.user as { logoutReason: string | null }).logoutReason;
    const isServerLogout = logoutReason === 'SERVER';

    const provider = authManager.getActiveProvider();

    return (
      <>
        {isTokenExpired && (
          <p className="error-message center">
            {intl.formatMessage({
              id: 'login.tokenExpired',
              defaultMessage: 'Your session expired, please login again.',
            })}
          </p>
        )}
        {isServerLogout && (
          <p className="error-message center">
            {intl.formatMessage({
              id: 'login.serverLogout',
              defaultMessage: 'Your session expired, please login again.',
            })}
          </p>
        )}

        {provider && (
          <DynamicLogin
            provider={provider}
            onAuthenticated={this.handleAuthenticated}
          />
        )}
      </>
    );
  }
}

export default injectIntl(WaAkgLoginScreen);