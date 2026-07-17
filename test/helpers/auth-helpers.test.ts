import { LIVE_FERDIUM_API, LOCAL_SERVER } from '../../src/config';
import { logoutAndRedirect } from '../../src/helpers/auth-helpers';

describe('logoutAndRedirect', () => {
  const makeStores = (
    pathname = '/settings/digital-humans',
    server: string = LIVE_FERDIUM_API,
  ) =>
    ({
      router: {
        push: jest.fn(),
        location: { pathname },
      },
      user: {
        isLoggingOut: false,
        logoutRedirectRoute: '/auth/login',
      },
      settings: { app: { server } },
    }) as any;

  const makeActions = () =>
    ({
      user: { logout: jest.fn() },
      settings: { update: jest.fn() },
    }) as any;

  it('flips isLoggingOut, dispatches logout, and pushes the login route', () => {
    const stores = makeStores();
    const actions = makeActions();

    logoutAndRedirect(stores, actions);

    expect(stores.user.isLoggingOut).toBe(true);
    expect(actions.user.logout).toHaveBeenCalledTimes(1);
    expect(stores.router.push).toHaveBeenCalledWith('/auth/login');
    expect(actions.settings.update).not.toHaveBeenCalled();
  });

  it('does not touch server when resetServerToLive is omitted', () => {
    const stores = makeStores();
    const actions = makeActions();
    logoutAndRedirect(stores, actions);
    expect(actions.settings.update).not.toHaveBeenCalled();
  });

  it('does not touch server when resetServerToLive is true but server is not LOCAL_SERVER', () => {
    const stores = makeStores();
    const actions = makeActions();
    logoutAndRedirect(stores, actions, { resetServerToLive: true });
    expect(actions.settings.update).not.toHaveBeenCalled();
  });

  it('resets server to LIVE_FERDIUM_API when on LOCAL_SERVER and resetServerToLive is true', () => {
    const stores = makeStores('/settings', LOCAL_SERVER);
    const actions = makeActions();
    logoutAndRedirect(stores, actions, { resetServerToLive: true });
    expect(actions.settings.update).toHaveBeenCalledWith({
      type: 'app',
      data: { server: LIVE_FERDIUM_API },
    });
  });
});
