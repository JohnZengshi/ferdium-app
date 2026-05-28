import WhatsAppAutomationStore from './store';

export const whatsappAutomationStore = new WhatsAppAutomationStore();

export default function initWhatsAppAutomation(
  stores: { whatsappAutomation?: any },
  actions: any,
) {
  console.log('[WA-AKG] initWhatsAppAutomation called');
  // eslint-disable-next-line no-param-reassign
  stores.whatsappAutomation = whatsappAutomationStore;
  whatsappAutomationStore.start(stores, actions);
}
