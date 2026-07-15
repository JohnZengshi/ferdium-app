import type { Stores } from '../../@types/stores.types';
import type { Actions } from '../../actions/lib/actions';
import TelegramAutomationStore from './store';

const debug = require('../../preload-safe-debug')(
  'Ferdium:feature:telegram-automation:init',
);

export const telegramAutomationStore = new TelegramAutomationStore();

export default function initTelegramAutomation(
  stores: Stores,
  actions: Actions,
) {
  debug('[Telegram] initTelegramAutomation called');
  // eslint-disable-next-line no-param-reassign
  stores.telegramAutomation = telegramAutomationStore;
  telegramAutomationStore.start(stores, actions);
}
