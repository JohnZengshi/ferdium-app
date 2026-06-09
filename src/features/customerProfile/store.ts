import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import type { Stores } from '../../@types/stores.types';
import type { Actions } from '../../actions/lib/actions';
import type {
  CustomerProfileResponse,
  ListCustomerProfilesApiV1CustomerProfilesGetParams,
} from '../../agent-flow-cs/api/generated/agentFlowCs.schemas';
import { listCustomerProfilesApiV1CustomerProfilesGet } from '../../agent-flow-cs/api/generated/customer-profiles/customer-profiles';
import FeatureStore from '../utils/FeatureStore';

const debug = require('../../preload-safe-debug')(
  'Ferdium:feature:customer-profile:store',
);

export interface CustomerProfileFilters {
  intentLevel?: string;
  customerValue?: string;
  search?: string;
}

export default class CustomerProfileStore extends FeatureStore {
  @observable stores: Stores | null = null;

  actions: Actions | null = null;

  @observable isFeatureActive = false;

  @observable profiles: CustomerProfileResponse[] = [];

  @observable total = 0;

  @observable currentPage = 1;

  @observable pageSize = 20;

  @observable isLoading = false;

  @observable error: string | null = null;

  @observable filters: CustomerProfileFilters = {};

  constructor() {
    super();
    makeObservable(this);
  }

  @computed get paginationInfo() {
    return {
      current: this.currentPage,
      pageSize: this.pageSize,
      total: this.total,
    };
  }

  @action start(stores: Stores, actions: Actions) {
    this.stores = stores;
    this.actions = actions;
    debug('CustomerProfileStore::start');
    this.isFeatureActive = true;
  }

  @action stop() {
    super.stop();
    debug('CustomerProfileStore::stop');
    this.isFeatureActive = false;
  }

  /**
   * Fetch customer profiles with current filters and pagination
   */
  @action async fetchProfiles(): Promise<void> {
    if (this.isLoading) {
      debug('Fetch already in progress, skipping');
      return;
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const params: ListCustomerProfilesApiV1CustomerProfilesGetParams = {
        page: this.currentPage,
        page_size: this.pageSize,
      };

      // Add filters if they exist
      if (this.filters.intentLevel) {
        params.intent_level = this.filters.intentLevel;
      }
      if (this.filters.customerValue) {
        params.customer_value = this.filters.customerValue;
      }
      if (this.filters.search) {
        params.search = this.filters.search;
      }

      debug('Fetching customer profiles with params:', params);

      const response =
        await listCustomerProfilesApiV1CustomerProfilesGet(params);

      if (response.status === 200) {
        runInAction(() => {
          this.profiles = response.data.items;
          this.total = response.data.total;
          debug(
            `Fetched ${response.data.items.length} profiles, total: ${response.data.total}`,
          );
        });
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      debug('Error fetching customer profiles:', error);
      runInAction(() => {
        this.error = errorMessage;
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  /**
   * Update filters and trigger fetch
   */
  @action async updateFilters(
    newFilters: Partial<CustomerProfileFilters>,
  ): Promise<void> {
    debug('Updating filters:', newFilters);
    this.filters = { ...this.filters, ...newFilters };
    this.currentPage = 1; // Reset to first page when filters change
    await this.fetchProfiles();
  }

  /**
   * Reset all filters to default
   */
  @action async resetFilters(): Promise<void> {
    debug('Resetting filters');
    this.filters = {};
    this.currentPage = 1;
    await this.fetchProfiles();
  }

  /**
   * Change page
   */
  @action async changePage(page: number): Promise<void> {
    debug('Changing to page:', page);
    this.currentPage = page;
    await this.fetchProfiles();
  }

  /**
   * Change page size
   */
  @action async changePageSize(pageSize: number): Promise<void> {
    debug('Changing page size to:', pageSize);
    this.pageSize = pageSize;
    this.currentPage = 1; // Reset to first page when page size changes
    await this.fetchProfiles();
  }

  /**
   * Refresh current data
   */
  @action async refresh(): Promise<void> {
    debug('Refreshing customer profiles');
    await this.fetchProfiles();
  }
}
