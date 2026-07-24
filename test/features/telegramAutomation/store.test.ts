// NOTE: esbuild-runner does not hoist jest.mock above ESM imports, so the store
// must be loaded with require() AFTER the jest.mock calls; otherwise it captures
// the real generated API module.
import { TELEGRAM_BIND_STATUS } from '../../../src/features/telegramAutomation/constants';

jest.mock('../../../src/agent-flow-cs/api/sse', () => ({
  subscribeSSE: jest.fn(),
}));

jest.mock('../../../src/agent-flow-cs/api/generated/telegram/telegram', () => ({
  __esModule: true,
  createInstanceApiV1TelegramInstancesPost: jest.fn(),
  createTelegramBindingApiV1TelegramBindPost: jest.fn(),
  deleteTelegramInstanceApiV1TelegramInstancesInstanceIdDelete: jest.fn(),
  listTelegramInstancesApiV1TelegramInstancesGet: jest.fn(),
  loginCodeApiV1TelegramInstancesInstanceIdLoginCodePost: jest.fn(),
  loginPasswordApiV1TelegramInstancesInstanceIdLoginPasswordPost: jest.fn(),
  loginPhoneApiV1TelegramInstancesInstanceIdLoginPhonePost: jest.fn(),
  startInstanceApiV1TelegramInstancesInstanceIdStartPost: jest.fn(),
}));

jest.mock('../../../src/preload-safe-debug', () => () => () => {});

const {
  default: TelegramAutomationStore,
} = require('../../../src/features/telegramAutomation/store');
const telegramApi = require('../../../src/agent-flow-cs/api/generated/telegram/telegram');

const PASSWORD_API =
  telegramApi.loginPasswordApiV1TelegramInstancesInstanceIdLoginPasswordPost as jest.Mock;
const START_API =
  telegramApi.startInstanceApiV1TelegramInstancesInstanceIdStartPost as jest.Mock;
const BIND_API =
  telegramApi.createTelegramBindingApiV1TelegramBindPost as jest.Mock;

const SERVICE_ID = 'tg-svc-1';
const ATTEMPT = 1;

function makeStore(): InstanceType<typeof TelegramAutomationStore> {
  const store = new (TelegramAutomationStore as any)();
  // Stub DOM/webview-touching helpers so _submitPassword can run headless.
  (store as any)._setModalLoading = jest.fn();
  (store as any)._clearModalError = jest.fn();
  (store as any)._showModalError = jest.fn();
  (store as any)._setModalView = jest.fn();
  (store as any)._injectOrUpdateStatusIndicator = jest.fn();
  // _handleAuthorized is locked non-writable by mobx @action. Because start()
  // is never called, this.stores is null, so _handleAuthorized no-ops before
  // reaching startInstance/createBinding. Authorization is therefore detected
  // via the _injectOrUpdateStatusIndicator('connected') call and the absence of
  // startInstance/binding API calls.
  store._serviceBindAttempts.set(SERVICE_ID, ATTEMPT);
  return store;
}

async function submit(
  store: InstanceType<typeof TelegramAutomationStore>,
  body: unknown,
) {
  PASSWORD_API.mockResolvedValue({ data: body });
  await (store as any)._submitPassword(SERVICE_ID, 'hunter2', ATTEMPT);
}

describe('TelegramAutomationStore._submitPassword authorization guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authorizes only on explicit status authorized', async () => {
    const store = makeStore();
    await submit(store, { status: 'authorized', me: { id: 1 } });

    expect((store as any)._injectOrUpdateStatusIndicator).toHaveBeenCalledWith(
      SERVICE_ID,
      'connected',
    );
  });

  it('does NOT authorize on legacy { ok: true } (waits for status stream)', async () => {
    const store = makeStore();
    await submit(store, { ok: true });

    expect(
      (store as any)._injectOrUpdateStatusIndicator,
    ).not.toHaveBeenCalledWith(SERVICE_ID, 'connected');
    expect(START_API).not.toHaveBeenCalled();
    expect(BIND_API).not.toHaveBeenCalled();
    expect((store as any)._showModalError).not.toHaveBeenCalled();
  });

  it('does NOT authorize on { ok: true, me } (legacy success body)', async () => {
    const store = makeStore();
    await submit(store, { ok: true, me: { id: 1 } });

    expect(
      (store as any)._injectOrUpdateStatusIndicator,
    ).not.toHaveBeenCalledWith(SERVICE_ID, 'connected');
    expect(START_API).not.toHaveBeenCalled();
    expect(BIND_API).not.toHaveBeenCalled();
  });

  it('treats password_submitted as pending (no authorize, no error)', async () => {
    const store = makeStore();
    await submit(store, { status: 'password_submitted' });

    expect(
      (store as any)._injectOrUpdateStatusIndicator,
    ).not.toHaveBeenCalledWith(SERVICE_ID, 'connected');
    expect(START_API).not.toHaveBeenCalled();
    expect(BIND_API).not.toHaveBeenCalled();
    expect((store as any)._showModalError).not.toHaveBeenCalled();
  });

  it('shows retry error on password_required without authorizing', async () => {
    const store = makeStore();
    await submit(store, { status: 'password_required' });

    expect(
      (store as any)._injectOrUpdateStatusIndicator,
    ).not.toHaveBeenCalledWith(SERVICE_ID, 'connected');
    expect(START_API).not.toHaveBeenCalled();
    expect(BIND_API).not.toHaveBeenCalled();
    expect((store as any)._showModalError).toHaveBeenCalledWith(
      SERVICE_ID,
      'Incorrect password, please try again',
    );
  });

  it('does not authorize on unauthorized / not_authorized bodies', async () => {
    const store = makeStore();
    await submit(store, { status: 'unauthorized' });
    await submit(store, { status: 'not_authorized' });

    expect(
      (store as any)._injectOrUpdateStatusIndicator,
    ).not.toHaveBeenCalledWith(SERVICE_ID, 'connected');
    expect(START_API).not.toHaveBeenCalled();
    expect(BIND_API).not.toHaveBeenCalled();
  });

  it('shows failure error and does not authorize when API rejects', async () => {
    const store = makeStore();
    PASSWORD_API.mockRejectedValue(new Error('PASSWORD_HASH_INVALID'));
    await (store as any)._submitPassword(SERVICE_ID, 'wrong', ATTEMPT);

    expect(
      (store as any)._injectOrUpdateStatusIndicator,
    ).not.toHaveBeenCalledWith(SERVICE_ID, 'connected');
    expect(START_API).not.toHaveBeenCalled();
    expect(BIND_API).not.toHaveBeenCalled();
    expect((store as any)._showModalError).toHaveBeenCalledWith(
      SERVICE_ID,
      'Failed to verify password',
    );
  });

  it('keeps WAITING_FOR_PASSWORD bind status while pending', async () => {
    const store = makeStore();
    await submit(store, { status: 'password_submitted' });

    expect(store._serviceBindStatus.get(SERVICE_ID)).toBe(
      TELEGRAM_BIND_STATUS.WAITING_FOR_PASSWORD,
    );
  });
});
