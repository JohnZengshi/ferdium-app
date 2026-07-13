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

  it('continues after a failed ACK and removes listener at end', () => {
    setupFs({
      '/r/x.js': 'x();',
      '/r/y.js': 'y();',
      '/r/z.js': 'z();',
    });

    rw.injectJSUnsafe('/r/x.js', '/r/y.js', '/r/z.js');
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
    expect(ipcRenderer.sendToHost).toHaveBeenLastCalledWith(
      'inject-js-unsafe',
      {
        name: 'z.js',
        source: 'z();',
        seq: 2,
      },
    );

    listener!({}, ack('z.js', 2, true));
    expect(ipcRenderer.sendToHost).toHaveBeenCalledTimes(3);
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
      'inject-js-unsafe-ack',
      listener,
    );
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

  it('removes the ACK listener and aborts further sends when sendToHost throws', () => {
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

    rw.injectJSUnsafe('/r/first.js', '/r/second.js', '/r/third.js');
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
});
