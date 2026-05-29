/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  disable as disableDarkMode,
  enable as enableDarkMode,
} from 'darkreader';
import { contextBridge, ipcRenderer } from 'electron';
import { pathExistsSync, readFileSync } from 'fs-extra';
import { debounce, noop } from 'lodash';
import { autorun, computed, makeObservable, observable } from 'mobx';

import customDarkModeCss from './darkmode/custom';
import ignoreList from './darkmode/ignore';

import RecipeWebview from './lib/RecipeWebview';
import Userscript from './lib/Userscript';

import BadgeHandler from './badge';
import contextMenu from './contextMenu';
import {
  darkModeStyleExists,
  injectDarkModeStyle,
  isDarkModeStyleInjected,
  removeDarkModeStyle,
} from './darkmode';
import DialogTitleHandler from './dialogTitle';
import FindInPage from './find';
import {
  NotificationsHandler,
  notificationsClassDefinition,
} from './notifications';
import { getDisplayMediaSelector, screenShareJs } from './screenshare';
import SessionHandler from './sessionHandler';
import {
  getSpellcheckerLocaleByFuzzyIdentifier,
  switchDict,
} from './spellchecker';

import type { AppStore } from '../@types/stores.types';
import { DEFAULT_APP_SETTINGS } from '../config';
import type { FingerprintConfig } from '../helpers/fingerprint-helpers';
import { cleanseJSObject, ifUndefined, safeParseInt } from '../jsUtils';
import type Service from '../models/Service';

// For some services darkreader tries to use the chrome extension message API
// This will cause the service to fail loading
// As the message API is not actually needed, we'll add this shim sendMessage
// function in order for darkreader to continue working
// @ts-expect-error Fix this
window.chrome.runtime.sendMessage = noop;

const debug = require('../preload-safe-debug')('Ferdium:Plugin');

const badgeHandler = new BadgeHandler();

const dialogTitleHandler = new DialogTitleHandler();

const sessionHandler = new SessionHandler();

const notificationsHandler = new NotificationsHandler();

// Patching window.open
const originalWindowOpen = window.open;

window.open = (url, frameName, features): WindowProxy | null => {
  debug('window.open', url, frameName, features);
  if (!url) {
    // The service hasn't yet supplied a URL (as used in Skype).
    // Return a new dummy window object and wait for the service to change the properties
    const newWindow = {
      location: {
        href: '',
      },
    };

    const checkInterval = setInterval(() => {
      // Has the service changed the URL yet?
      if (newWindow.location.href !== '') {
        if (features) {
          originalWindowOpen(newWindow.location.href, frameName, features);
        } else {
          // Open the new URL
          ipcRenderer.sendToHost('new-window', newWindow.location.href);
        }
        clearInterval(checkInterval);
      }
    }, 0);

    setTimeout(() => {
      // Stop checking for location changes after 1 second
      clearInterval(checkInterval);
    }, 1000);

    return newWindow as Window;
  }

  // We need to differentiate if the link should be opened in a popup or in the systems default browser
  if (!frameName && !features && typeof features !== 'string') {
    ipcRenderer.sendToHost('new-window', url);
    return null;
  }

  if (url) {
    return originalWindowOpen(url, frameName, features);
  }
  return null;
};

// We can't override APIs here, so we first expose functions via 'window.ferdium',
// then overwrite the corresponding field of the window object by injected JS.
contextBridge.exposeInMainWorld('ferdium', {
  open: window.open,
  setBadge: (
    direct: string | number | null | undefined,
    indirect: string | number | null | undefined,
  ) => badgeHandler.setBadge(direct, indirect),
  safeParseInt: (text: string | number | null | undefined) =>
    safeParseInt(text),
  setDialogTitle: (title: string | null | undefined) =>
    dialogTitleHandler.setDialogTitle(title),
  displayNotification: (title: string, options: any) => {
    return notificationsHandler.displayNotification(
      title,
      // The following line is needed so that a proper clone of the "options" object is made.
      // This line was causing issues with some services.
      cleanseJSObject(options),
    );
  },
  getDisplayMediaSelector,
});

ipcRenderer.sendToHost(
  'inject-js-unsafe',
  'window.open = window.ferdium.open;',
  notificationsClassDefinition,
  screenShareJs,
);

class RecipeController {
  @observable settings: {
    overrideSpellcheckerLanguage: boolean;
    app: AppStore;
    service: Service;
  } = {
    overrideSpellcheckerLanguage: false,
    // @ts-expect-error Fix this
    app: DEFAULT_APP_SETTINGS,
    // @ts-expect-error Fix this
    service: {
      isDarkModeEnabled: false,
      spellcheckerLanguage: '',
    },
  };

  ipcEvents = {
    'initialize-recipe': 'loadRecipeModule',
    'settings-update': 'updateAppSettings',
    'service-settings-update': 'updateServiceSettings',
    'get-service-id': 'serviceIdEcho',
    'find-in-page': 'openFindInPage',
    'toggle-to-talk': 'toggleToTalk',
  };

  universalDarkModeInjected = false;

  recipe: RecipeWebview | null = null;

  userscript: Userscript | null = null;

  hasUpdatedBeforeRecipeLoaded = false;

  constructor() {
    makeObservable(this);

    this.initialize();
  }

  @computed get spellcheckerLanguage() {
    return ifUndefined<string>(
      this.settings.service.spellcheckerLanguage,
      this.settings.app.spellcheckerLanguage,
    );
  }

  findInPage: FindInPage | null = null;

  async initialize() {
    for (const channel of Object.keys(this.ipcEvents)) {
      ipcRenderer.on(channel, (...args) => {
        debug('Received IPC event for channel', channel, 'with', ...args);
        this[this.ipcEvents[channel]](...args);
      });
    }

    debug('Send "hello" to host');
    setTimeout(() => ipcRenderer.sendToHost('hello'), 100);

    contextMenu(
      () => this.settings.app.enableSpellchecking,
      () => this.settings.app.spellcheckerLanguage,
      () => this.spellcheckerLanguage,
      () => this.settings.app.searchEngine,
      () => this.settings.app.clipboardNotifications,
      () => this.settings.app.enableTranslator,
      () => this.settings.app.translatorEngine,
      () => this.settings.app.translatorLanguage,
    );

    autorun(() => this.update());

    document.addEventListener('DOMContentLoaded', () => {
      this.findInPage = new FindInPage({
        inputFocusColor: '#CE9FFC',
        textColor: '#212121',
      });
    });

    // Add ability to go forward or back with mouse buttons (inside the recipe)
    window.addEventListener('mouseup', e => {
      if (e.button === 3) {
        e.preventDefault();
        e.stopPropagation();
        window.history.back();
      } else if (e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
        window.history.forward();
      }
    });
  }

  loadRecipeModule(_event, config, recipe) {
    debug('loadRecipeModule');
    const modulePath = join(recipe.path, 'webview.js');
    debug('module path', modulePath);
    // Delete module from cache
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete require.cache[require.resolve(modulePath)];
    try {
      this.recipe = new RecipeWebview(
        badgeHandler,
        dialogTitleHandler,
        notificationsHandler,
        sessionHandler,
      );
      if (existsSync(modulePath)) {
        require(modulePath)(this.recipe, { ...config, recipe });
        debug('Initialize Recipe', config, recipe);
      }

      this.settings.service = Object.assign(config, { recipe });

      // Inject fingerprint overrides if fingerprint config is present
      const fingerprint = config.fingerprint as FingerprintConfig | undefined;
      if (fingerprint) {
        // eslint-disable-next-line no-use-before-define, @typescript-eslint/no-use-before-define -- buildFingerprintScript defined below
        const script = buildFingerprintScript(fingerprint);
        ipcRenderer.sendToHost('inject-js-unsafe', script);
        ipcRenderer.sendToHost('setFingerprintHeaders', {
          partition: `persist:service-${config.id}`,
          userAgentData: fingerprint.userAgentData,
        });
      }

      // Make sure to update the WebView, otherwise the custom darkmode handler may not be used
      this.update();
    } catch (error) {
      console.error('Recipe initialization failed', error);
    }

    this.loadUserFiles(recipe, config);
  }

  async loadUserFiles(recipe, config) {
    const styles = document.createElement('style');

    const userCss = join(recipe.path, 'user.css');
    if (pathExistsSync(userCss)) {
      const data = readFileSync(userCss);
      styles.innerHTML += data.toString();
      debug('Loaded user.css from: ', userCss);
    }
    document.querySelector('head')?.append(styles);

    const userJs = join(recipe.path, 'user.js');
    if (pathExistsSync(userJs)) {
      const loadUserJs = () => {
        const userJsModule = require(userJs);

        if (typeof userJsModule === 'function') {
          this.userscript = new Userscript(this.recipe, this, config);
          userJsModule(config, this.userscript);
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          loadUserJs();
        });
      } else {
        loadUserJs();
      }
    }
  }

  openFindInPage() {
    this.findInPage?.openFindWindow();
  }

  update() {
    debug('enableSpellchecking', this.settings.app.enableSpellchecking);
    debug('isDarkModeEnabled', this.settings.service.isDarkModeEnabled);
    debug(
      'System spellcheckerLanguage',
      this.settings.app.spellcheckerLanguage,
    );
    debug(
      'Service spellcheckerLanguage',
      this.settings.service.spellcheckerLanguage,
    );
    debug('darkReaderSettigs', this.settings.service.darkReaderSettings);
    debug('searchEngine', this.settings.app.searchEngine);
    debug('enableTranslator', this.settings.app.enableTranslator);
    debug('translatorEngine', this.settings.app.translatorEngine);
    debug('translatorLanguage', this.settings.app.translatorLanguage);

    if (this.userscript?.internal_setSettings) {
      this.userscript.internal_setSettings(this.settings);
    }

    if (this.settings.app.enableSpellchecking) {
      let { spellcheckerLanguage } = this;
      debug(`Setting spellchecker language to ${spellcheckerLanguage}`);
      if (spellcheckerLanguage.includes('automatic')) {
        this.automaticLanguageDetection();
        debug(
          'Found `automatic` locale, falling back to user locale until detected',
          this.settings.app.locale,
        );
        spellcheckerLanguage = this.settings.app.locale;
      }
      switchDict(spellcheckerLanguage, this.settings.service.id);
    } else {
      debug('Disable spellchecker');
    }

    if (!this.recipe) {
      this.hasUpdatedBeforeRecipeLoaded = true;
    }

    debug(
      'Darkmode enabled?',
      this.settings.service.isDarkModeEnabled,
      'Dark theme active?',
      // @ts-expect-error Fix this
      this.settings.app.isDarkThemeActive,
    );

    const handlerConfig = {
      removeDarkModeStyle,
      disableDarkMode,
      enableDarkMode,
      injectDarkModeStyle: () =>
        injectDarkModeStyle(this.settings.service.recipe.path),
      isDarkModeStyleInjected,
    };

    if (this.settings.service.isDarkModeEnabled) {
      debug('Enable dark mode');

      // Check if recipe has a custom dark mode handler
      if (this.recipe?.darkModeHandler) {
        debug('Using custom dark mode handler');

        // Remove other dark mode styles if they were already loaded
        if (this.hasUpdatedBeforeRecipeLoaded) {
          this.hasUpdatedBeforeRecipeLoaded = false;
          removeDarkModeStyle();
          disableDarkMode();
        }

        this.recipe.darkModeHandler(true, handlerConfig);
      } else if (darkModeStyleExists(this.settings.service.recipe.path)) {
        debug('Injecting darkmode from recipe');
        injectDarkModeStyle(this.settings.service.recipe.path);

        // Make sure universal dark mode is disabled
        disableDarkMode();
        this.universalDarkModeInjected = false;
      } else if (
        this.settings.app.universalDarkMode &&
        !ignoreList.includes(window.location.host)
      ) {
        debug('Injecting Dark Reader');

        // Use Dark Reader instead
        const { brightness, contrast, sepia } =
          this.settings.service.darkReaderSettings;
        enableDarkMode(
          { brightness, contrast, sepia },
          {
            css: customDarkModeCss[window.location.host] || '',
            invert: [],
            ignoreImageAnalysis: [],
            ignoreInlineStyle: [],
            disableStyleSheetsProxy: false,
          },
        );
        this.universalDarkModeInjected = true;
      }
    } else {
      debug('Remove dark mode');
      debug('DarkMode disabled - removing remaining styles');

      if (this.recipe?.darkModeHandler) {
        // Remove other dark mode styles if they were already loaded
        if (this.hasUpdatedBeforeRecipeLoaded) {
          this.hasUpdatedBeforeRecipeLoaded = false;
          removeDarkModeStyle();
          disableDarkMode();
        }

        this.recipe.darkModeHandler(false, handlerConfig);
      } else if (isDarkModeStyleInjected()) {
        debug('Removing injected darkmode from recipe');
        removeDarkModeStyle();
      } else {
        debug('Removing Dark Reader');

        disableDarkMode();
        this.universalDarkModeInjected = false;
      }
    }

    // Remove dark reader if (universal) dark mode was just disabled
    if (
      this.universalDarkModeInjected &&
      (!this.settings.app.darkMode ||
        !this.settings.service.isDarkModeEnabled ||
        !this.settings.app.universalDarkMode)
    ) {
      disableDarkMode();
      this.universalDarkModeInjected = false;
    }
  }

  updateAppSettings(_event, data) {
    this.settings.app = Object.assign(this.settings.app, data);
  }

  updateServiceSettings(_event, data) {
    this.settings.service = Object.assign(this.settings.service, data);
  }

  serviceIdEcho(event) {
    debug('Received a service echo ping');
    event.sender.send('service-id', this.settings.service.id);
  }

  async automaticLanguageDetection() {
    window.addEventListener(
      'keyup',
      debounce(async e => {
        const element = e.target;

        if (!element) return;

        let value = '';
        if (element.isContentEditable) {
          value = element.textContent;
        } else if (element.value) {
          value = element.value;
        }

        // Force a minimum length to get better detection results
        if (value.length < 25) return;

        debug('Detecting language for', value);
        const locale = await ipcRenderer.invoke('detect-language', {
          sample: value,
        });
        if (!locale) {
          return;
        }

        const spellcheckerLocale =
          getSpellcheckerLocaleByFuzzyIdentifier(locale);
        debug(
          'Language detected reliably, setting spellchecker language to',
          spellcheckerLocale,
        );
        if (spellcheckerLocale) {
          switchDict(spellcheckerLocale, this.settings.service.id);
        }
      }, 225),
    );
  }

  toggleToTalk() {
    this.recipe?.toggleToTalkFunc?.();
  }
}

/**
 * Build a JavaScript string that overrides browser fingerprinting APIs.
 * The returned string is injected into the main world (the web page's JS context)
 * via ipcRenderer.sendToHost('inject-js-unsafe', script).
 *
 * Uses an inline mulberry32 PRNG since modules cannot be imported in the main world.
 */
function buildFingerprintScript(fp: FingerprintConfig): string {
  const { canvasSeed } = fp;
  const { audioSeed } = fp;
  const webglVendor = fp.webglConfig.vendor;
  const webglRenderer = fp.webglConfig.renderer;
  const { hardwareConcurrency } = fp;
  const { deviceMemory } = fp;
  const languages = JSON.stringify(fp.languages);
  const brands = JSON.stringify(fp.userAgentData.brands);
  const { mobile } = fp.userAgentData;
  const { platform } = fp.userAgentData;

  return `(function() {
  'use strict';

  // === Inline mulberry32 PRNG (seeded from numeric seed) ===
  function _fpPRNG(seed) {
    var s = seed | 0;
    return function() {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // === 1. Canvas fingerprint override ===
  var CANVAS_SEED = ${canvasSeed};
  var _origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  var _origToBlob = HTMLCanvasElement.prototype.toBlob;

  HTMLCanvasElement.prototype.toDataURL = function() {
    var ctx = this.getContext('2d');
    if (ctx) {
      var imageData = ctx.getImageData(0, 0, this.width, this.height);
      var s = CANVAS_SEED;
      for (var i = 0; i < imageData.data.length; i += 4) {
        s = (s + 0x6D2B79F5) | 0;
        var t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        var noise = ((t ^ (t >>> 14)) >>> 0) % 7 - 3;
        imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
        imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
        imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);
    }
    return _origToDataURL.apply(this, arguments);
  };

  HTMLCanvasElement.prototype.toBlob = function() {
    var ctx = this.getContext('2d');
    if (ctx) {
      var imageData = ctx.getImageData(0, 0, this.width, this.height);
      var s = CANVAS_SEED;
      for (var i = 0; i < imageData.data.length; i += 4) {
        s = (s + 0x6D2B79F5) | 0;
        var t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        var noise = ((t ^ (t >>> 14)) >>> 0) % 7 - 3;
        imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
        imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
        imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);
    }
    return _origToBlob.apply(this, arguments);
  };

  // === 2. WebGL parameter override ===
  var UNMASKED_VENDOR = 0x9245;
  var UNMASKED_RENDERER = 0x9246;

  var _origGetParam = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    if (param === UNMASKED_VENDOR) return ${JSON.stringify(webglVendor)};
    if (param === UNMASKED_RENDERER) return ${JSON.stringify(webglRenderer)};
    return _origGetParam.call(this, param);
  };

  if (typeof WebGL2RenderingContext !== 'undefined') {
    var _origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(param) {
      if (param === UNMASKED_VENDOR) return ${JSON.stringify(webglVendor)};
      if (param === UNMASKED_RENDERER) return ${JSON.stringify(webglRenderer)};
      return _origGetParam2.call(this, param);
    };
  }

  // === 3. AudioContext fingerprint override ===
  var AUDIO_SEED = ${audioSeed};

  var _origCreateOscillator = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function() {
    var osc = _origCreateOscillator.call(this);
    osc.frequency.value = osc.frequency.value + (AUDIO_SEED % 10);
    return osc;
  };

  var _origCreateDynamics = AudioContext.prototype.createDynamicsCompressor;
  AudioContext.prototype.createDynamicsCompressor = function() {
    var comp = _origCreateDynamics.call(this);
    comp.ratio.value = comp.ratio.value + (AUDIO_SEED % 5) * 0.1;
    comp.threshold.value = comp.threshold.value - (AUDIO_SEED % 3);
    return comp;
  };

  var _origGetFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
  AnalyserNode.prototype.getFloatFrequencyData = function(array) {
    _origGetFloatFreq.call(this, array);
    var rng = _fpPRNG(AUDIO_SEED);
    for (var i = 0; i < array.length; i++) {
      array[i] = array[i] + (rng() * 0.0002 - 0.0001);
    }
  };

  var _origGetChannelData = AudioBuffer.prototype.getChannelData;
  AudioBuffer.prototype.getChannelData = function(channel) {
    var data = _origGetChannelData.call(this, channel);
    var rng = _fpPRNG(AUDIO_SEED + channel);
    for (var i = 0; i < data.length; i++) {
      data[i] = data[i] + (rng() * 0.0002 - 0.0001);
    }
    return data;
  };

  // === 4. Navigator overrides ===
  var _languages = ${languages};
  var _brands = ${brands};
  var _mobile = ${mobile};
  var _platform = ${JSON.stringify(platform)};

  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: function() { return ${hardwareConcurrency}; },
    configurable: true,
  });

  Object.defineProperty(navigator, 'deviceMemory', {
    get: function() { return ${deviceMemory}; },
    configurable: true,
  });

  Object.defineProperty(navigator, 'languages', {
    get: function() { return _languages.slice(); },
    configurable: true,
  });

  Object.defineProperty(navigator, 'userAgentData', {
    get: function() {
      return {
        brands: _brands,
        mobile: _mobile,
        platform: _platform,
        getHighEntropyValues: function() {
          return Promise.resolve({
            brands: _brands,
            mobile: _mobile,
            platform: _platform,
            architecture: '',
            bitness: '',
            model: '',
            platformVersion: '',
            uaFullVersion: '',
          });
        },
        toJSON: function() {
          return { brands: _brands, mobile: _mobile, platform: _platform };
        },
      };
    },
    configurable: true,
  });
})();`;
}

/* eslint-disable no-new */
new RecipeController();
