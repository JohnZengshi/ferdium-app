jest.mock('fs-extra', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  pathExistsSync: jest.fn(),
}));

jest.mock('electron', () => ({
  ipcRenderer: {
    on: jest.fn(),
    removeListener: jest.fn(),
    sendToHost: jest.fn(),
  },
}));

jest.mock('@electron/remote', () => ({ BrowserWindow: {} }));

jest.mock('../../../src/preload-safe-debug', () => () => () => {});
jest.mock('../../../src/jsUtils', () => ({
  safeParseInt: Number,
}));

const { ipcRenderer } = require('electron');
const { existsSync, readFileSync } = require('fs-extra');
const RecipeWebview = require('../../../src/webview/lib/RecipeWebview').default;

function ack(name: string, seq: number, success: boolean, error?: string) {
  return {
    name,
    seq,
    success,
    ...(error ? { error } : {}),
  };
}

function captureListener() {
  const calls = (ipcRenderer.on as jest.Mock).mock.calls.filter(
    ([channel]) => channel === 'inject-js-unsafe-ack',
  );
  return calls.at(-1)?.[1] as
    | ((event: unknown, ack: unknown) => void)
    | undefined;
}

function setupFs(files: Record<string, string>) {
  (existsSync as jest.Mock).mockImplementation((file: string) =>
    Object.prototype.hasOwnProperty.call(files, file),
  );
  (readFileSync as jest.Mock).mockImplementation(
    (file: string) => files[file] ?? Buffer.alloc(0),
  );
}

describe('RecipeWebview.injectJSUnsafe - ACK-gated sequential transport', () => {
  let rw: InstanceType<typeof RecipeWebview>;

  beforeEach(() => {
    jest.clearAllMocks();
    (ipcRenderer.sendToHost as jest.Mock).mockImplementation(() => {});
    rw = new RecipeWebview({}, {}, {}, {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends scripts one at a time in file order, each gated by ACK with seq', () => {
    setupFs({
      '/r/a.js': 'a();',
      '/r/b.js': 'b();',
      '/r/c.js': 'c();',
    });

    rw.injectJSUnsafe('/r/a.js', '/r/b.js', '/r/c.js');

    expect(ipcRenderer.on).toHaveBeenCalledWith(
      'inject-js-unsafe-ack',
      expect.any(Function),
    );
    const listener = captureListener();
    expect(listener).toBeDefined();

    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(1);
    expect(ipcRenderer.sendToHost).toHaveBeenLastCalledWith(
      'inject-js-unsafe',
      {
        name: 'a.js',
        source: 'a();',
        seq: 0,
      },
    );

    listener!({}, ack('a.js', 0, true));
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(2);
    expect(ipcRenderer.sendToHost).toHaveBeenLastCalledWith(
      'inject-js-unsafe',
      {
        name: 'b.js',
        source: 'b();',
        seq: 1,
      },
    );

    listener!({}, ack('b.js', 1, true));
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(3);
    expect(ipcRenderer.sendToHost).toHaveBeenLastCalledWith(
      'inject-js-unsafe',
      {
        name: 'c.js',
        source: 'c();',
        seq: 2,
      },
    );

    listener!({}, ack('c.js', 2, true));
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(3);
  });

  it('aborts remaining scripts and rejects after a failed ACK', async () => {
    setupFs({
      '/r/x.js': 'x();',
      '/r/y.js': 'y();',
      '/r/z.js': 'z();',
      '/r/next.js': 'next();',
    });

    const p = rw.injectJSUnsafe('/r/x.js', '/r/y.js', '/r/z.js');
    const next = rw.injectJSUnsafe('/r/next.js');
    const listener = captureListener();

    listener!({}, ack('x.js', 0, true));
    expect(ipcRenderer.sendToHost).toHaveBeenLastCalledWith(
      'inject-js-unsafe',
      {
        name: 'y.js',
        source: 'y();',
        seq: 1,
      },
    );

    listener!({}, ack('y.js', 1, false, 'boom'));
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(2);
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      'inject-js-unsafe-ack',
      listener,
    );
    await expect(p).rejects.toThrow(
      'injectJSUnsafe: injection failed for "y.js": boom',
    );
    await Promise.resolve();
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(3);
    expect(ipcRenderer.sendToHost).toHaveBeenLastCalledWith(
      'inject-js-unsafe',
      expect.objectContaining({ name: 'next.js', seq: 2 }),
    );

    const nextListener = captureListener();
    nextListener!({}, ack('next.js', 2, true));
    await expect(next).resolves.toBeUndefined();
  });

  it('skips missing files and only sends scripts that exist', () => {
    setupFs({
      '/r/exists.js': 'code();',
    });

    rw.injectJSUnsafe('/r/missing.js', '/r/exists.js');
    const listener = captureListener();

    expect(existsSync).toHaveBeenCalledWith('/r/missing.js');
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(1);
    expect(ipcRenderer.sendToHost).toHaveBeenCalledWith('inject-js-unsafe', {
      name: 'exists.js',
      source: 'code();',
      seq: 0,
    });

    listener!({}, ack('exists.js', 0, true));
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      'inject-js-unsafe-ack',
      listener,
    );
  });

  it('skips unreadable files and sends remaining readable scripts', () => {
    setupFs({
      '/r/unreadable.js': 'unreadable();',
      '/r/readable.js': 'readable();',
    });
    (readFileSync as jest.Mock).mockImplementation((file: string) => {
      if (file === '/r/unreadable.js') {
        throw new Error('read failed');
      }
      return 'readable();';
    });

    rw.injectJSUnsafe('/r/unreadable.js', '/r/readable.js');
    const listener = captureListener();

    expect(readFileSync).toHaveBeenNthCalledWith(1, '/r/unreadable.js', 'utf8');
    expect(readFileSync).toHaveBeenNthCalledWith(2, '/r/readable.js', 'utf8');
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(1);
    expect(ipcRenderer.sendToHost).toHaveBeenCalledWith('inject-js-unsafe', {
      name: 'readable.js',
      source: 'readable();',
      seq: 0,
    });

    listener!({}, ack('readable.js', 0, true));
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      'inject-js-unsafe-ack',
      listener,
    );
  });

  it('removes the ACK listener and rejects when sendToHost throws', async () => {
    setupFs({
      '/r/first.js': 'first();',
      '/r/second.js': 'second();',
      '/r/third.js': 'third();',
    });
    (ipcRenderer.sendToHost as jest.Mock).mockImplementation(
      (_channel: string, script: { name: string }) => {
        if (script.name === 'second.js') {
          throw new Error('send failed');
        }
      },
    );

    const p = rw.injectJSUnsafe('/r/first.js', '/r/second.js', '/r/third.js');
    const listener = captureListener();

    listener!({}, ack('first.js', 0, true));
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(2);
    expect(ipcRenderer.sendToHost).toHaveBeenLastCalledWith(
      'inject-js-unsafe',
      {
        name: 'second.js',
        source: 'second();',
        seq: 1,
      },
    );
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      'inject-js-unsafe-ack',
      listener,
    );

    listener!({}, ack('second.js', 1, true));
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(2);

    await expect(p).rejects.toThrow('send failed');
  });

  it('does not send anything (and removes no listener) when all files missing', () => {
    setupFs({});

    rw.injectJSUnsafe('/r/a.js', '/r/b.js');

    expect(ipcRenderer.sendToHost).not.toHaveBeenCalled();
    expect(captureListener()).toBeUndefined();
  });

  it('handles a large (~350 KB) source without splitting or truncation', () => {
    const bigSource = 'X'.repeat(350 * 1024);
    setupFs({ '/r/big.js': bigSource });

    rw.injectJSUnsafe('/r/big.js');
    const listener = captureListener();

    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(1);
    const sentArg = (ipcRenderer.sendToHost as jest.Mock).mock.calls[0][1];
    expect(sentArg).toEqual({ name: 'big.js', source: bigSource, seq: 0 });
    expect(sentArg.source.length).toBe(350 * 1024);

    listener!({}, ack('big.js', 0, true));
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      'inject-js-unsafe-ack',
      listener,
    );
  });

  it('ignores ACK whose name or seq does not match the in-flight script', () => {
    setupFs({
      '/r/first.js': 'first();',
      '/r/second.js': 'second();',
    });

    rw.injectJSUnsafe('/r/first.js', '/r/second.js');
    const listener = captureListener();

    listener!({}, ack('second.js', 0, true));
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(1);
    expect(ipcRenderer.sendToHost).toHaveBeenLastCalledWith(
      'inject-js-unsafe',
      {
        name: 'first.js',
        source: 'first();',
        seq: 0,
      },
    );

    listener!({}, ack('first.js', 99, true));
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(1);

    listener!({}, ack('first.js', 0, true));
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(2);

    listener!({}, ack('second.js', 1, true));
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(2);
  });

  it('uses monotonic instance-level seq to prevent stale ACK collisions', async () => {
    setupFs({
      '/r/a.js': 'a();',
      '/r/b.js': 'b();',
    });

    const p1 = rw.injectJSUnsafe('/r/a.js');
    const listener1 = captureListener();
    expect(ipcRenderer.sendToHost).toHaveBeenLastCalledWith(
      'inject-js-unsafe',
      expect.objectContaining({ seq: 0 }),
    );

    listener1!({}, ack('a.js', 0, true));
    await p1;

    const p2 = rw.injectJSUnsafe('/r/b.js');
    await Promise.resolve();
    const listener2 = captureListener();
    expect(ipcRenderer.sendToHost).toHaveBeenLastCalledWith(
      'inject-js-unsafe',
      expect.objectContaining({ seq: 1 }),
    );

    listener2!({}, ack('b.js', 0, true));
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(2);
    listener2!({}, ack('b.js', 1, true));
    await p2;
  });

  it('rejects timed-out batch and unblocks next FIFO batch', async () => {
    jest.useFakeTimers();
    setupFs({
      '/r/a.js': 'a();',
      '/r/b.js': 'b();',
    });

    const p1 = rw.injectJSUnsafe('/r/a.js');
    const p2 = rw.injectJSUnsafe('/r/b.js');

    jest.advanceTimersByTime(30_000);
    await expect(p1).rejects.toThrow('injectJSUnsafe: ACK timeout for "a.js"');
    await Promise.resolve();

    expect(ipcRenderer.sendToHost).toHaveBeenLastCalledWith(
      'inject-js-unsafe',
      expect.objectContaining({ name: 'b.js', seq: 1 }),
    );

    const listener2 = captureListener();
    listener2!({}, ack('b.js', 1, true));
    await expect(p2).resolves.toBeUndefined();
  });

  it('aborts remaining scripts and rejects on ACK timeout', async () => {
    jest.useFakeTimers();
    setupFs({
      '/r/a.js': 'a();',
      '/r/b.js': 'b();',
      '/r/c.js': 'c();',
    });

    const p = rw.injectJSUnsafe('/r/a.js', '/r/b.js', '/r/c.js');
    const listener = captureListener();

    listener!({}, ack('a.js', 0, true));
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(2);
    expect(ipcRenderer.sendToHost).toHaveBeenLastCalledWith(
      'inject-js-unsafe',
      expect.objectContaining({ name: 'b.js', seq: 1 }),
    );

    jest.advanceTimersByTime(30_000);
    jest.runAllTimers();

    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      'inject-js-unsafe-ack',
      listener,
    );
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(2);

    await expect(p).rejects.toThrow('injectJSUnsafe: ACK timeout for "b.js"');
  });

  it('clears timeout when ACK arrives before timeout', async () => {
    jest.useFakeTimers();
    setupFs({
      '/r/x.js': 'x();',
    });

    const p = rw.injectJSUnsafe('/r/x.js');
    const listener = captureListener();

    jest.advanceTimersByTime(29_000);
    listener!({}, ack('x.js', 0, true));
    await p;
    jest.advanceTimersByTime(1000);

    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      'inject-js-unsafe-ack',
      listener,
    );
  });

  it('idempotent cleanup: second finish call does not double-clear', async () => {
    jest.useFakeTimers();
    setupFs({
      '/r/test.js': 'test();',
    });

    const p = rw.injectJSUnsafe('/r/test.js');
    const listener = captureListener();

    jest.advanceTimersByTime(30_000);
    jest.runAllTimers();

    const removeCallsBefore = (ipcRenderer.removeListener as jest.Mock).mock
      .calls.length;
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      'inject-js-unsafe-ack',
      listener,
    );

    listener!({}, ack('test.js', 0, true));

    const removeCallsAfter = (ipcRenderer.removeListener as jest.Mock).mock
      .calls.length;
    expect(removeCallsAfter).toBe(removeCallsBefore);

    await expect(p).rejects.toThrow(
      'injectJSUnsafe: ACK timeout for "test.js"',
    );
  });

  it('returns Promise<void> that resolves when chain completes', async () => {
    setupFs({
      '/r/sync.js': 'sync();',
    });

    const p = rw.injectJSUnsafe('/r/sync.js');
    expect(p).toBeInstanceOf(Promise);
    const listener = captureListener();

    listener!({}, ack('sync.js', 0, true));

    await expect(p).resolves.toBeUndefined();
  });

  it('returns immediately with resolved Promise when no scripts to inject', async () => {
    setupFs({});

    const p = rw.injectJSUnsafe('/r/missing.js');
    expect(p).toBeInstanceOf(Promise);

    await expect(p).resolves.toBeUndefined();
  });

  it('does not emit unhandledRejection when a failed call is discarded', async () => {
    setupFs({ '/r/discarded.js': 'discarded();' });
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);

    rw.injectJSUnsafe('/r/discarded.js');
    const listener = captureListener();
    listener!({}, ack('discarded.js', 0, false, 'discarded failure'));
    await Promise.resolve();
    await Promise.resolve();

    process.removeListener('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('recovers FIFO after a discarded rejected predecessor', async () => {
    setupFs({
      '/r/discarded.js': 'discarded();',
      '/r/next.js': 'next();',
    });

    rw.injectJSUnsafe('/r/discarded.js');
    const next = rw.injectJSUnsafe('/r/next.js');
    const firstListener = captureListener();

    firstListener!({}, ack('discarded.js', 0, false, 'discarded failure'));
    await new Promise(resolve => {
      setImmediate(resolve);
    });

    expect(ipcRenderer.sendToHost).toHaveBeenLastCalledWith(
      'inject-js-unsafe',
      expect.objectContaining({ name: 'next.js', seq: 1 }),
    );
    const nextListener = captureListener();
    nextListener!({}, ack('next.js', 1, true));

    await expect(next).resolves.toBeUndefined();
  });
});
