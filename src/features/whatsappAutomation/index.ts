import WhatsAppAutomationStore from './store';

const debug = require('../../preload-safe-debug')(
  'Ferdium:feature:whatsapp-automation:init',
);

export const whatsappAutomationStore = new WhatsAppAutomationStore();

export default function initWhatsAppAutomation(
  stores: { whatsappAutomation?: any },
  actions: any,
) {
  debug('[WA-AKG] initWhatsAppAutomation called');
  // eslint-disable-next-line no-param-reassign
  stores.whatsappAutomation = whatsappAutomationStore;
  whatsappAutomationStore.start(stores, actions);
}
