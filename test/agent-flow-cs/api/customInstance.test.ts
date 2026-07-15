jest.mock('tdesign-react', () => ({
  MessagePlugin: { error: jest.fn() },
}));
jest.mock('../../../src/whatsapp-automation/api/auth', () => ({
  getApiKey: jest.fn(),
}));
jest.mock('../../../src/agent-flow-cs/api/auth', () => ({
  getAccessToken: jest.fn(),
}));

const {
  MessagePlugin,
}: typeof import('tdesign-react') = require('tdesign-react');
const {
  getApiKey,
}: typeof import('../../../src/whatsapp-automation/api/auth') = require('../../../src/whatsapp-automation/api/auth');
const {
  AGENT_FLOW_CS_BASE,
  AgentFlowApiError,
  useCustomInstance,
}: typeof import('../../../src/agent-flow-cs/api/customInstance') = require('../../../src/agent-flow-cs/api/customInstance');
const {
  getAccessToken,
}: typeof import('../../../src/agent-flow-cs/api/auth') = require('../../../src/agent-flow-cs/api/auth');

const mockedFetch = jest.fn<
  ReturnType<typeof fetch>,
  Parameters<typeof fetch>
>();
const mockedGetAccessToken = jest.mocked(getAccessToken);
const mockedGetApiKey = jest.mocked(getApiKey);
const mockedMessageError = jest.mocked(MessagePlugin.error);

const response = (
  body: unknown,
  status: number,
  statusText = '',
  url = `${AGENT_FLOW_CS_BASE}/api/test`,
): Response => {
  const result = new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'X-Test': 'present' },
    status,
    statusText,
  });
  Object.defineProperty(result, 'url', { value: url });
  return result;
};

describe('Agent Flow CS custom instance', () => {
  beforeAll(() => {
    global.fetch = mockedFetch;
  });

  beforeEach(() => {
    mockedFetch.mockReset();
    mockedGetAccessToken.mockReset();
    mockedGetApiKey.mockReset();
    mockedMessageError.mockReset();
  });

  it('preserves URL, authentication, caller options, and Orval success shape', async () => {
    mockedGetAccessToken.mockReturnValue('jwt-token');
    mockedGetApiKey.mockReturnValue('wag_api-key');
    const successResponse = response({ id: 'digital-human-1' }, 200, 'OK');
    mockedFetch.mockResolvedValue(successResponse);

    const result = await useCustomInstance<{
      data: { id: string };
      headers: Headers;
      status: 200;
    }>('http://generated-host/api/test', {
      headers: { 'X-Caller': 'yes' },
      method: 'POST',
    });

    expect(mockedFetch).toHaveBeenCalledWith(`${AGENT_FLOW_CS_BASE}/api/test`, {
      headers: {
        Authorization: 'Bearer jwt-token',
        'Content-Type': 'application/json',
        'X-AKG-Api-Key': 'wag_api-key',
        'X-Caller': 'yes',
      },
      method: 'POST',
      signal: expect.any(AbortSignal),
    });
    expect(result).toEqual({
      data: { id: 'digital-human-1' },
      headers: successResponse.headers,
      status: 200,
    });
    expect(mockedMessageError).not.toHaveBeenCalled();
  });

  it('uses AKG authentication without sending a wag_ token as Bearer', async () => {
    mockedGetAccessToken.mockReturnValue('wag_access-key');
    mockedGetApiKey.mockReturnValue('wag_api-key');
    mockedFetch.mockResolvedValue(response({}, 200));

    await useCustomInstance('/api/test');

    const config = mockedFetch.mock.calls[0][1];
    expect(config?.headers).toEqual({
      'Content-Type': 'application/json',
      'X-AKG-Api-Key': 'wag_api-key',
    });
  });

  it('maps known error code and retains typed metadata', async () => {
    const body = {
      code: 'DIGITAL_HUMAN_NAME_CONFLICT',
      detail: { field: 'name' },
      message: 'digital human name already exists under this account',
    };
    mockedFetch.mockResolvedValue(response(body, 409, 'Conflict'));

    const request = useCustomInstance('/api/test');

    await expect(request).rejects.toMatchObject({
      body,
      code: 'DIGITAL_HUMAN_NAME_CONFLICT',
      detail: { field: 'name' },
      message:
        'A digital human with this name already exists under this account.',
      name: 'AgentFlowApiError',
      status: 409,
      statusText: 'Conflict',
      url: `${AGENT_FLOW_CS_BASE}/api/test`,
    });
    await expect(request).rejects.toBeInstanceOf(AgentFlowApiError);
    expect(mockedMessageError).toHaveBeenCalledTimes(1);
    expect(mockedMessageError).toHaveBeenCalledWith(
      'A digital human with this name already exists under this account.',
    );
  });

  it.each([
    ['BAD_REQUEST', 'Invalid request.'],
    [
      'AUTHENTICATION_REQUIRED',
      'Authentication required. Please sign in again.',
    ],
    ['INVALID_CREDENTIALS', 'Invalid credentials.'],
    ['PERMISSION_DENIED', 'You do not have permission to perform this action.'],
    [
      'DIGITAL_HUMAN_NOT_ASSIGNED',
      'Digital human is not assigned to this account.',
    ],
    [
      'KNOWLEDGE_COLLECTION_FORBIDDEN',
      'You do not have permission to access this knowledge collection.',
    ],
    ['RESOURCE_NOT_FOUND', 'Requested resource was not found.'],
    ['FEATURE_DISABLED', 'This feature is disabled.'],
    ['RESOURCE_CONFLICT', 'Request conflicts with existing data.'],
    ['DIGITAL_HUMAN_INACTIVE', 'Digital human is inactive.'],
    [
      'DIGITAL_HUMAN_NAME_CONFLICT',
      'A digital human with this name already exists under this account.',
    ],
    ['PAYLOAD_TOO_LARGE', 'Request payload is too large.'],
    ['INVALID_REQUEST', 'Request validation failed.'],
    ['RATE_LIMITED', 'Too many requests. Please try again later.'],
    ['INTERNAL_ERROR', 'Server error. Please try again later.'],
    ['UPSTREAM_FAILURE', 'Upstream service failed. Please try again later.'],
    [
      'SERVICE_UNAVAILABLE',
      'Service is temporarily unavailable. Please try again later.',
    ],
    ['KNOWLEDGE_BASE_DISABLED', 'Knowledge base is disabled.'],
  ])('maps published code %s before HTTP status', async (code, message) => {
    mockedFetch.mockResolvedValue(
      response({ code, message: 'backend fallback' }, 500),
    );

    await expect(useCustomInstance('/api/test')).rejects.toMatchObject({
      code,
      message,
      status: 500,
    });
    expect(mockedMessageError).toHaveBeenCalledWith(message);
  });

  it.each([
    [400, 'Invalid request.'],
    [401, 'Authentication required. Please sign in again.'],
    [403, 'You do not have permission to perform this action.'],
    [404, 'Requested resource was not found.'],
    [409, 'Request conflicts with existing data.'],
    [422, 'Request validation failed.'],
    [429, 'Too many requests. Please try again later.'],
    [500, 'Server error. Please try again later.'],
    [502, 'Service is temporarily unavailable. Please try again later.'],
    [503, 'Service is temporarily unavailable. Please try again later.'],
  ])('maps published HTTP %i to %s', async (status, message) => {
    mockedFetch.mockResolvedValue(
      response({ message: 'backend fallback' }, status),
    );

    await expect(useCustomInstance('/api/test')).rejects.toThrow(message);
    expect(mockedMessageError).toHaveBeenCalledWith(message);
  });

  it.each([
    [{ message: 'body message' }, '', 'body message'],
    [{ error: 'body error' }, '', 'body error'],
    [{ detail: 'body detail' }, '', 'body detail'],
    [{}, 'Teapot', 'Teapot'],
    [{}, '', 'Request failed (HTTP 418).'],
  ])(
    'uses body and response fallback order for %#',
    async (body, statusText, expected) => {
      mockedFetch.mockResolvedValue(response(body, 418, statusText));

      await expect(useCustomInstance('/api/test')).rejects.toThrow(expected);
      expect(mockedMessageError).toHaveBeenCalledWith(expected);
    },
  );

  it('preserves unknown code while falling back to backend message', async () => {
    mockedFetch.mockResolvedValue(
      response({ code: 'NEW_BACKEND_CODE', message: 'backend message' }, 418),
    );

    await expect(useCustomInstance('/api/test')).rejects.toMatchObject({
      code: 'NEW_BACKEND_CODE',
      message: 'backend message',
    });
    expect(mockedMessageError).toHaveBeenCalledWith('backend message');
  });

  it('retains structured detail without displaying it as text', async () => {
    const detail = [{ loc: ['body', 'name'], msg: 'required' }];
    mockedFetch.mockResolvedValue(response({ detail }, 418));

    await expect(useCustomInstance('/api/test')).rejects.toMatchObject({
      detail,
      message: 'Request failed (HTTP 418).',
    });
    expect(mockedMessageError).toHaveBeenCalledWith(
      'Request failed (HTTP 418).',
    );
  });

  it('handles a non-JSON error body', async () => {
    const nonJsonResponse = new Response('not JSON', { status: 418 });
    mockedFetch.mockResolvedValue(nonJsonResponse);

    await expect(useCustomInstance('/api/test')).rejects.toMatchObject({
      body: {},
      message: 'Request failed (HTTP 418).',
    });
    expect(mockedMessageError).toHaveBeenCalledWith(
      'Request failed (HTTP 418).',
    );
  });

  it('preserves network errors without showing an HTTP toast', async () => {
    const networkError = new TypeError('fetch failed');
    mockedFetch.mockRejectedValue(networkError);

    await expect(useCustomInstance('/api/test')).rejects.toBe(networkError);
    expect(mockedMessageError).not.toHaveBeenCalled();
  });

  it('preserves caller abort behavior without showing an HTTP toast', async () => {
    const abortError = new DOMException('Request aborted', 'AbortError');
    const controller = new AbortController();
    mockedFetch.mockRejectedValue(abortError);

    await expect(
      useCustomInstance('/api/test', { signal: controller.signal }),
    ).rejects.toBe(abortError);
    expect(mockedFetch.mock.calls[0][1]?.signal).toBe(controller.signal);
    expect(mockedMessageError).not.toHaveBeenCalled();
  });
});
