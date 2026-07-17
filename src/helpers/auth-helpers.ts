import type { Actions } from '../actions/lib/actions';
import { LIVE_FERDIUM_API, LOCAL_SERVER } from '../config';
import type { RealStores } from '../stores';

/**
 * Run the user-initiated logout sequence:
 *   1. set isLoggingOut so auth screens show the spinner
 *   2. dispatch actions.user.logout (clears tokens, invalidates caches, optional relaunch)
 *   3. redirect to the login route
 *
 * Used by SettingsModal / SettingsNavigation (user clicks "Log out")
 * and by customInstance.ts on 401 (server rejects our token).
 */
export interface LogoutOptions {
  /** If true, reset settings.app.server from LOCAL_SERVER to LIVE_FERDIUM_API. */
  resetServerToLive?: boolean;
}
export const logoutAndRedirect = (
  stores: RealStores,
  actions: Actions,
  options: LogoutOptions = {},
): void => {
  const { resetServerToLive = false } = options;
  if (resetServerToLive && stores.settings.app.server === LOCAL_SERVER) {
    actions.settings.update({
      type: 'app',
      data: { server: LIVE_FERDIUM_API },
    });
  }
  // eslint-disable-next-line no-param-reassign
  stores.user.isLoggingOut = true;
  actions.user.logout();
  stores.router.push(stores.user.logoutRedirectRoute);
};
