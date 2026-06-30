import localStorage from 'mobx-localstorage';
import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import { type IntlShape, defineMessages, injectIntl } from 'react-intl';
import type { AuthProvider } from '../../@types/auth';
import type { StoresProps } from '../../@types/ferdium-components.types';
import DynamicLogin from '../../components/auth/DynamicLogin';
import authManager from '../../lib/auth/AuthManager';
import FerdiumProvider from '../../lib/auth/providers/FerdiumProvider';

const debug = require('../../preload-safe-debug')(
  'Ferdium:auth:PluggableAuthScreen',
);

const messages = defineMessages({
  loading: { id: 'pluggableAuth.loading', defaultMessage: 'Loading...' },
  loadingProvider: {
    id: 'pluggableAuth.loadingProvider',
    defaultMessage: 'Loading provider...',
  },
});

interface IProps extends StoresProps {
  intl: IntlShape;
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

  handleAuthenticated = (result: { token?: string; apiKey?: string }): void => {
    
    const { stores } = this.props;
    if (!stores?.user) {
      debug('Stores not available');
      return;
    }
    
    const useAgentFlowAuth = process.env.USE_AGENT_FLOW_AUTH === 'true';
    if (result.token) {
      if (useAgentFlowAuth && this.props.providerType === 'ferdium') {
        stores.router.push(stores.user.HOME_ROUTE);
      } else {
        stores.user._tokenLogin(result.token);
      }
      
      // Agent Flow CS 模式：apiKey 已经在 FerdiumProvider 中存储
      // 这里只需要确认一下
    } else {
      // WA-AKG login: apiKey is already stored by initializeAuth() → setApiKey().
      // Also set authToken so UserStore.isLoggedIn returns true after _logout() cleared it.
      if (result.apiKey) {
        localStorage.setItem('authToken', 'wa-akg');
      }
      stores.router.push(stores.user.HOME_ROUTE);
    }
  };

  render(): ReactElement {
    const { stores, intl } = this.props;
    if (!stores?.user) {
      return <div>{intl.formatMessage(messages.loading)}</div>;
    }
    const { isTokenExpired } = stores.user;
    const { logoutReason } = stores.user as { logoutReason: string | null };
    const isServerLogout = logoutReason === 'SERVER';

    const activeProvider = this.provider;
    if (!activeProvider) {
      return <div>{intl.formatMessage(messages.loadingProvider)}</div>;
    }

    return (
      <>
        {isTokenExpired && (
          <p className="auth__error-message mt-2.5 text-center text-[14px] text-error">
            {intl.formatMessage({
              id: 'login.tokenExpired',
              defaultMessage: 'Your session expired, please login again.',
            })}
          </p>
        )}
        {isServerLogout && (
          <p className="auth__error-message mt-2.5 text-center text-[14px] text-error">
            {intl.formatMessage({
              id: 'login.serverLogout',
              defaultMessage: 'Your session expired, please login again.',
            })}
          </p>
        )}

        <div className="h-fit w-full">
          <DynamicLogin
            provider={activeProvider}
            onAuthenticated={this.handleAuthenticated}
          />
        </div>
      </>
    );
  }
}

export default injectIntl(PluggableAuthScreen);
