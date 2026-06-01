import localStorage from 'mobx-localstorage';
import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import { type IntlShape, injectIntl } from 'react-intl';
import type { StoresProps } from '../../@types/ferdium-components.types';
import type { AuthProvider } from '../../@types/auth';
import DynamicLogin from '../../components/auth/DynamicLogin';
import authManager from '../../lib/auth/AuthManager';
import FerdiumProvider from '../../lib/auth/providers/FerdiumProvider';

const debug = require('../../preload-safe-debug')('Ferdium:auth:PluggableAuthScreen');

interface IProps extends StoresProps {
  intl: IntlShape;
  error?: { status?: number; message?: string };
  providerType: 'ferdium' | 'nextauth';
}

/**
 * Generic auth screen that works with any registered AuthProvider.
 *
 * - providerType="ferdium" → creates FerdiumProvider directly (for Ferdium JWT login)
 * - providerType="nextauth" → uses authManager's active NextAuthProvider (for WA-AKG login)
 *
 * Merges WaAkgLoginScreen + DynamicLoginScreen into one component.
 */
@inject('stores', 'actions')
@observer
class PluggableAuthScreen extends Component<IProps> {
  private ferdiumProvider: FerdiumProvider | null = null;

  componentDidMount(): void {
    const { providerType } = this.props;
    if (providerType === 'nextauth') {
      authManager.setActiveProvider('nextauth');
    } else {
      this.ferdiumProvider = new FerdiumProvider();
    }
  }

  get provider(): AuthProvider | null {
    if (this.props.providerType === 'ferdium') {
      return this.ferdiumProvider ?? new FerdiumProvider();
    }
    return authManager.getActiveProvider();
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
      // WA-AKG login: apiKey is already stored by initializeAuth() → setApiKey().
      // Also set authToken so UserStore.isLoggedIn returns true after _logout() cleared it.
      if (result.apiKey) {
        localStorage.setItem('authToken', 'wa-akg');
      }
      stores.router.push('/');
    }
  };

  render(): ReactElement {
    const { stores, intl } = this.props;
    if (!stores?.user) {
      return <div>Loading...</div>;
    }
    const { isTokenExpired } = stores.user;
    const logoutReason = (
      stores.user as { logoutReason: string | null }
    ).logoutReason;
    const isServerLogout = logoutReason === 'SERVER';

    const activeProvider = this.provider;
    if (!activeProvider) {
      return <div>Loading provider...</div>;
    }

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

        <DynamicLogin
          provider={activeProvider}
          onAuthenticated={this.handleAuthenticated}
        />
      </>
    );
  }
}

export default injectIntl(PluggableAuthScreen);
