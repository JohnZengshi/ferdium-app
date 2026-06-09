import type { Stores } from '../../@types/stores.types';
import type { Actions } from '../../actions/lib/actions';
import CustomerProfileStore from './store';

const debug = require('../../preload-safe-debug')(
  'Ferdium:feature:customer-profile:init',
);

export const customerProfileStore = new CustomerProfileStore();

export default function initCustomerProfile(stores: Stores, actions: Actions) {
  debug('initCustomerProfile called');
  // eslint-disable-next-line no-param-reassign
  stores.customerProfile = customerProfileStore;
  customerProfileStore.start(stores, actions);
}
