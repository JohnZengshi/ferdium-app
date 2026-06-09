import type { Stores } from '../../@types/stores.types';
import type { Actions } from '../../actions/lib/actions';
import WhatsAppAutomationStore from './store';

const debug = require('../../preload-safe-debug')(
  'Ferdium:feature:whatsapp-automation:init',
);

export const whatsappAutomationStore = new WhatsAppAutomationStore();

export default function initWhatsAppAutomation(
  stores: Stores,
  actions: Actions,
) {
  debug('[WA-AKG] initWhatsAppAutomation called');
  // eslint-disable-next-line no-param-reassign
  stores.whatsappAutomation = whatsappAutomationStore;
  whatsappAutomationStore.start(stores, actions);
}
