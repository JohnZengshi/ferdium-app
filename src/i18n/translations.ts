/* eslint-disable global-require */
import { APP_LOCALES } from './languages';

const debug = require('../preload-safe-debug')('Ferdium:I18n');

export default function generatedTranslations() {
  const translations = [];
  for (const key of Object.keys(APP_LOCALES)) {
    try {
      // eslint-disable-next-line import/no-dynamic-require
      const translation = require(`./locales/${key}.json`);
      translations[key] = translation;
    } catch {
      debug(`Can't find translations for ${key}`);
    }
  }
  return translations;
}
