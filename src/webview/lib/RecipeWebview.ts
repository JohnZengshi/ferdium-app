import { basename } from 'node:path';
import { BrowserWindow } from '@electron/remote';
import { ipcRenderer } from 'electron';
import { existsSync, pathExistsSync, readFileSync } from 'fs-extra';
import { safeParseInt } from '../../jsUtils';

const debug = require('../../preload-safe-debug')(
  'Ferdium:Plugin:RecipeWebview',
);

// Time to wait for a webview to ACK an injected unsafe script before
// aborting the rest of the current batch.
const INJECT_JS_UNSAFE_ACK_TIMEOUT_MS = 30_000;

class RecipeWebview {
  badgeHandler: any;

  dialogTitleHandler: any;

  notificationsHandler: any;

  sessionHandler: any;

  injectJSUnsafeChain: Promise<void> = Promise.resolve();

  injectJSUnsafeSeq = 0;

  injectJSUnsafeRunning = false;

  constructor(
    badgeHandler,
    dialogTitleHandler,
    notificationsHandler,
    sessionHandler,
  ) {
    this.badgeHandler = badgeHandler;
    this.dialogTitleHandler = dialogTitleHandler;
    this.notificationsHandler = notificationsHandler;
    this.sessionHandler = sessionHandler;

    ipcRenderer.on('poll', () => {
      this.loopFunc();

      debug('Poll event');

      // This event is for checking if the service recipe is still actively
      // communicating with the client
      ipcRenderer.sendToHost('alive');
    });
  }

  loopFunc = () => null;

  toggleToTalkFunc = () => null;

  darkModeHandler: ((darkMode: boolean, config: any) => void) | null = null;

  // TODO Remove this once we implement a proper wrapper.
  get ipcRenderer() {
    return ipcRenderer;
  }

  // TODO Remove this once we implement a proper wrapper.
  get BrowserWindow() {
    return BrowserWindow;
  }

  /**
   * Initialize the loop
   *
   * @param {Function}        Function that will be executed
   */
  loop(fn) {
    this.loopFunc = fn;
  }

  /**
   * Set the unread message badge
   *
   * @param {string | number | undefined | null} direct      Set the count of direct messages
   *                                                         eg. Slack direct mentions, or a
   *                                                         message to @channel
   * @param {string | number | undefined | null} indirect    Set a badge that defines there are
   *                                                         new messages but they do not involve
   *                                                         me directly to me eg. in a channel
   */
  setBadge(direct = 0, indirect = 0) {
    this.badgeHandler.setBadge(direct, indirect);
  }

  /**
   * Set the active dialog title to the app title
   *
   * @param {string | undefined | null} title                Set the active dialog title
   *                                                         to the app title
   *                                                         eg. WhatsApp contact name
   */
  setDialogTitle(title) {
    this.dialogTitleHandler.setDialogTitle(title);
  }

  /**
   * Safely parse the given text into an integer
   *
   * @param  {string | number | undefined | null} text to be parsed
   */
  safeParseInt(text) {
    return safeParseInt(text);
  }

  /**
   * Find if link contains image
   *
   * @param  {string | number | undefined | null} text to be parsed
   */
  isImage(link): boolean {
    if (link === undefined) {
      return false;
    }

    const { role } = link.dataset;

    if (role !== undefined) {
      const roles = ['img'];
      return roles.includes(role);
    }

    const url = link.getAttribute('href');

    const regex = /\.(jpg|jpeg|png|webp|avif|gif|svg)($|\?|:)/;

    return regex.test(url.split(/[#?]/)[0]);
  }

  /**
   * Injects the contents of a CSS file into the current webview
   *
   * @param {Array} files     CSS files that should be injected. This must
   *                          be an absolute path to the file
   */
  injectCSS(...files) {
    files.forEach(file => {
      if (pathExistsSync(file)) {
        const styles = document.createElement('style');
        styles.innerHTML = readFileSync(file, 'utf8');

        const head = document.querySelector('head');

        if (head) {
          head.append(styles);
          debug('Append styles', styles);
        }
      }
    });
  }

  injectJSUnsafe(...files): Promise<void> {
    const scripts = files.flatMap(file => {
      if (!existsSync(file)) {
        debug('Script not found', file);
        return [];
      }

      try {
        return [{ name: basename(file), source: readFileSync(file, 'utf8') }];
      } catch (error) {
        debug('Unable to read script', file, error);
        return [];
      }
    });

    if (scripts.length === 0) {
      return Promise.resolve();
    }

    const runBatch = () =>
      new Promise<void>((resolve, reject) => {
        let index = 0;
        let timeout: ReturnType<typeof setTimeout> | undefined;
        let currentSeq: number | undefined;
        let finished = false;
        const finish = (error?: unknown) => {
          if (finished) {
            return;
          }
          finished = true;
          if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
          }
          ipcRenderer.removeListener('inject-js-unsafe-ack', onAck);
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        };
        const sendNext = () => {
          const script = scripts[index];
          if (!script) {
            finish();
            return;
          }

          currentSeq = this.injectJSUnsafeSeq;
          this.injectJSUnsafeSeq += 1;
          try {
            debug('Inject script to main world', script.name);
            ipcRenderer.sendToHost('inject-js-unsafe', {
              ...script,
              seq: currentSeq,
            });
            timeout = setTimeout(
              () =>
                finish(
                  new Error(`injectJSUnsafe: ACK timeout for "${script.name}"`),
                ),
              INJECT_JS_UNSAFE_ACK_TIMEOUT_MS,
            );
          } catch (error) {
            debug('Unable to inject script', script.name, error);
            finish(error);
          }
        };
        const onAck = (
          _event: Electron.IpcRendererEvent,
          ack: {
            name?: string;
            seq?: number;
            success?: boolean;
            error?: string;
          },
        ) => {
          const script = scripts[index];
          if (
            finished ||
            !script ||
            ack.name !== script.name ||
            ack.seq !== currentSeq
          ) {
            return;
          }

          if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
          }
          if (!ack.success) {
            console.error('Unsafe script injection failed', {
              script: script.name,
              seq: ack.seq,
              error: ack.error,
            });
            finish(
              new Error(
                `injectJSUnsafe: injection failed for "${script.name}": ${ack.error ?? 'unknown error'}`,
              ),
            );
            return;
          }

          index += 1;
          sendNext();
        };

        ipcRenderer.on('inject-js-unsafe-ack', onAck);
        sendNext();
      });

    const runningBefore = this.injectJSUnsafeRunning;
    this.injectJSUnsafeRunning = true;
    const batchPromise = runningBefore
      ? this.injectJSUnsafeChain.then(runBatch)
      : runBatch();
    let batchError: Error | undefined;
    const nextChain = batchPromise
      .catch(error => {
        batchError = error instanceof Error ? error : new Error(String(error));
      })
      .then(() => {
        if (this.injectJSUnsafeChain === nextChain) {
          this.injectJSUnsafeRunning = false;
        }
      });
    this.injectJSUnsafeChain = nextChain;
    const result = nextChain.then(() => {
      if (batchError) {
        throw batchError;
      }
    });
    // Recipes historically discard this result. Mark it handled while
    // preserving rejection for callers that await or catch the same promise.
    result.catch(() => {});
    return result;
  }

  /**
   * Set a custom handler for turning on and off dark mode
   *
   * @param {function} handler
   */
  handleDarkMode(handler) {
    this.darkModeHandler = handler;
  }

  onNotify(fn) {
    if (typeof fn === 'function') {
      this.notificationsHandler.onNotify = fn;
    }
  }

  initialize(fn) {
    if (typeof fn === 'function') {
      fn();
    }
  }

  clearStorageData(serviceId, targetsToClear) {
    ipcRenderer.send('clear-storage-data', {
      serviceId,
      targetsToClear,
    });
  }

  releaseServiceWorkers() {
    this.sessionHandler.releaseServiceWorkers();
  }

  setAvatarImage(avatarUrl) {
    ipcRenderer.sendToHost('avatar', avatarUrl);
  }

  openNewWindow(url) {
    ipcRenderer.sendToHost('new-window', url);
  }

  toggleToTalk(fn) {
    this.toggleToTalkFunc = fn;
  }
}

export default RecipeWebview;
