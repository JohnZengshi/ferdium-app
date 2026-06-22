/**
 * HandoffStore — 人工接管（通知记录）全局状态管理
 *
 * 职责：
 * - 维护未读接管数量（跨组件共享：首页、设置策略、导航标签）
 * - 提供 fetchUnreadCount() 供任意组件触发刷新
 * - 监听 'handoff-unread-changed' 自定义事件实现跨组件实时同步
 */

import { action, makeObservable, observable, runInAction } from 'mobx';
import { listHandoffsByReadApiV1HandoffReadGet } from '../agent-flow-cs/api/generated/handoff/handoff';
import TypedStore from './lib/TypedStore';

/** 通知记录已读状态变更时派发的事件名 */
export const HANDOFF_UNREAD_CHANGED_EVENT = 'handoff-unread-changed';

export default class HandoffStore extends TypedStore {
  /** 未读接管记录总数 */
  @observable unreadCount: number = 0;

  /** 轮询定时器 ID，用于 cleanup */
  private _pollingTimer: ReturnType<typeof setInterval> | null = null;

  /** 轮询间隔（毫秒） */
  private static readonly POLL_INTERVAL = 30_000;

  /** 缓存的事件处理函数引用，用于 teardown 时移除 */
  private _onUnreadChanged = (): void => {
    this.fetchUnreadCount().catch(() => {});
  };

  constructor(stores: any, api: any, actions: any) {
    super(stores, api, actions);
    makeObservable(this);
  }

  setup(): void {
    // 启动时立即拉取一次
    this.fetchUnreadCount().catch(() => {});

    // 之后每 30 秒自动刷新
    this._pollingTimer = setInterval(() => {
      this.fetchUnreadCount().catch(() => {});
    }, HandoffStore.POLL_INTERVAL);

    // 监听跨组件通知：当通知记录中执行了标记已读操作后立即刷新
    window.addEventListener(
      HANDOFF_UNREAD_CHANGED_EVENT,
      this._onUnreadChanged,
    );
  }

  teardown(): void {
    super.teardown();
    if (this._pollingTimer) {
      clearInterval(this._pollingTimer);
      this._pollingTimer = null;
    }
    window.removeEventListener(
      HANDOFF_UNREAD_CHANGED_EVENT,
      this._onUnreadChanged,
    );
  }

  /**
   * 拉取未读接管数量。
   * 调用 GET /api/v1/handoff/read?unread=true，取 response.data.total。
   */
  @action async fetchUnreadCount(): Promise<void> {
    try {
      const response = await listHandoffsByReadApiV1HandoffReadGet({
        unread: true,
      });
      const data = response.data as { total: number };
      runInAction(() => {
        this.unreadCount = data.total ?? 0;
      });
    } catch {
      // 静默失败，保留上次的值
    }
  }
}
