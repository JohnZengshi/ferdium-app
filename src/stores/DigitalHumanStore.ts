/**
 * DigitalHumanStore — 数字人管理 Store
 *
 * 职责：
 * - 管理数字人列表（owner看全部自建，member看被分配的）
 * - 创建/更新数字人
 * - 分配/取消分配数字人给子账号
 * - 本地缓存数字人数据
 */

import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import type {
  DigitalHumanCreateRequest,
  DigitalHumanResponse,
} from '../agent-flow-cs/api/generated/agentFlowCs.schemas';
import {
  assignDigitalHumanApiV1DigitalHumansDigitalHumanIdAssignmentsPost,
  createDigitalHumanApiV1DigitalHumansPost,
  getDigitalHumanApiV1DigitalHumansDigitalHumanIdGet,
  listDigitalHumanAssignmentsApiV1DigitalHumansDigitalHumanIdAssignmentsGet,
  listDigitalHumansApiV1DigitalHumansGet,
  unassignDigitalHumanApiV1DigitalHumansDigitalHumanIdAssignmentsDelete,
} from '../agent-flow-cs/api/generated/digital-humans/digital-humans';
import TypedStore from './lib/TypedStore';

export interface IDigitalHumanStore {
  digitalHumans: DigitalHumanResponse[];
  isLoading: boolean;
  error: string | null;

  // Computed
  activeDigitalHumans: DigitalHumanResponse[];
  digitalHumanCount: number;

  // Actions
  fetchDigitalHumans(): Promise<void>;
  createDigitalHuman(
    data: DigitalHumanCreateRequest,
  ): Promise<DigitalHumanResponse>;
  getDigitalHuman(id: string): Promise<DigitalHumanResponse>;
  assignToMember(digitalHumanId: string, memberId: string): Promise<void>;
  unassignFromMember(digitalHumanId: string, memberId: string): Promise<void>;
  getAssignments(digitalHumanId: string): Promise<string[]>;
  clearError(): void;
}

export default class DigitalHumanStore extends TypedStore {
  @observable digitalHumans: DigitalHumanResponse[] = [];

  @observable isLoading = false;

  @observable error: string | null = null;

  constructor(stores: any, api: any, actions: any) {
    super(stores, api, actions);
    makeObservable(this);
  }

  @computed get activeDigitalHumans(): DigitalHumanResponse[] {
    return this.digitalHumans.filter(
      dh => dh.status === 'active' && dh.is_enabled,
    );
  }

  @computed get digitalHumanCount(): number {
    return this.digitalHumans.length;
  }

  @action async fetchDigitalHumans(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await listDigitalHumansApiV1DigitalHumansGet();

      if (response.status === 200) {
        runInAction(() => {
          this.digitalHumans = response.data;
        });
      } else {
        throw new Error('Failed to fetch digital humans');
      }
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error';
        console.error('[DigitalHumanStore] fetchDigitalHumans failed:', error);
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  @action async createDigitalHuman(
    data: DigitalHumanCreateRequest,
  ): Promise<DigitalHumanResponse> {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await createDigitalHumanApiV1DigitalHumansPost(data);

      if (response.status === 200) {
        runInAction(() => {
          this.digitalHumans.push(response.data);
        });
        return response.data;
      }
      throw new Error('Failed to create digital human');
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error';
      });
      throw error;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  @action async getDigitalHuman(id: string): Promise<DigitalHumanResponse> {
    this.isLoading = true;
    this.error = null;

    try {
      const response =
        await getDigitalHumanApiV1DigitalHumansDigitalHumanIdGet(id);

      if (response.status === 200) {
        // Update local cache if exists
        runInAction(() => {
          const index = this.digitalHumans.findIndex(dh => dh.id === id);
          if (index !== -1) {
            this.digitalHumans[index] = response.data;
          }
        });
        return response.data;
      }
      throw new Error('Failed to get digital human');
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error';
      });
      throw error;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  @action async assignToMember(
    digitalHumanId: string,
    memberId: string,
  ): Promise<void> {
    this.error = null;

    try {
      const response =
        await assignDigitalHumanApiV1DigitalHumansDigitalHumanIdAssignmentsPost(
          digitalHumanId,
          { user_id: memberId },
        );

      if (response.status !== 201) {
        throw new Error('Failed to assign digital human');
      }
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error';
      });
      throw error;
    }
  }

  @action async unassignFromMember(
    digitalHumanId: string,
    memberId: string,
  ): Promise<void> {
    this.error = null;

    try {
      const response =
        await unassignDigitalHumanApiV1DigitalHumansDigitalHumanIdAssignmentsDelete(
          digitalHumanId,
          { user_id: memberId },
        );

      if (response.status !== 200) {
        throw new Error('Failed to unassign digital human');
      }
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error';
      });
      throw error;
    }
  }

  @action async getAssignments(digitalHumanId: string): Promise<string[]> {
    this.error = null;

    try {
      const response =
        await listDigitalHumanAssignmentsApiV1DigitalHumansDigitalHumanIdAssignmentsGet(
          digitalHumanId,
        );

      if (response.status === 200) {
        return response.data.user_ids || [];
      }
      throw new Error('Failed to get assignments');
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error';
      });
      throw error;
    }
  }

  @action clearError(): void {
    this.error = null;
  }

  // TypedStore interface
  setup(): void {
    // Initialize store if needed
  }

  teardown(): void {
    // Cleanup if needed
  }
}
