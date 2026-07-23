jest.mock('electron', () => ({
  ipcRenderer: { send: jest.fn() },
}));
jest.mock('mobx-localstorage', () => ({}));

const Request = require('../../../src/stores/lib/Request').default;

describe('Request metric hook isolation', () => {
  it('resolves normally even when a metric hook throws', async () => {
    const throwingHook = jest.fn(() => {
      throw new Error('metric hook boom');
    });
    Request.registerMetricHook(throwingHook);

    const api = { ping: () => Promise.resolve('pong') };
    const req = new Request(api, 'ping');
    const result = await req.execute().promise;

    expect(result).toBe('pong');
    expect(throwingHook).toHaveBeenCalled();

    // cleanup
    Request._metricHooks.length = 0;
  });

  it('rejects with original error even when a metric hook throws', async () => {
    const throwingHook = jest.fn(() => {
      throw new Error('metric hook boom');
    });
    Request.registerMetricHook(throwingHook);

    const api = {
      fail: () => Promise.reject(new Error('api error')),
    };
    const req = new Request(api, 'fail');

    await expect(req.execute().promise).rejects.toThrow('api error');
    expect(throwingHook).toHaveBeenCalled();

    Request._metricHooks.length = 0;
  });
});

// eslint-disable-next-line jest/no-export
export type {};
