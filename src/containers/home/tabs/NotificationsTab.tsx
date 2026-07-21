import { ipcRenderer } from 'electron';
/* eslint-disable react/no-unstable-nested-components */
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import {
  DateRangePicker,
  Dialog,
  Loading,
  MessagePlugin,
  Pagination,
  Select,
  Table,
} from 'tdesign-react';
import type { DateRangeValue, PrimaryTableCol } from 'tdesign-react';
import type { HandoffBriefResponse } from '../../../agent-flow-cs/api/generated/agentFlowCs.schemas';
import {
  listHandoffsByReadApiV1HandoffReadGet,
  listMemberHandoffsApiV1HandoffGet,
  markHandoffReadApiV1HandoffHandoffIdReadPost,
} from '../../../agent-flow-cs/api/generated/handoff/handoff';
import { HANDOFF_UNREAD_CHANGED_EVENT } from '../../../stores/HandoffStore';
import { navigationStore } from '../../../stores/NavigationStore';

const messages = defineMessages({
  serialNumber: {
    id: 'notificationsTab.col.serialNumber',
    defaultMessage: '#',
  },
  time: {
    id: 'notificationsTab.col.time',
    defaultMessage: 'Time',
  },
  platform: {
    id: 'notificationsTab.col.platform',
    defaultMessage: 'Platform',
  },
  account: {
    id: 'notificationsTab.col.account',
    defaultMessage: 'Account',
  },
  conversation: {
    id: 'notificationsTab.col.conversation',
    defaultMessage: 'Conversation',
  },
  triggerContent: {
    id: 'notificationsTab.col.triggerContent',
    defaultMessage: 'Content',
  },
  rule: {
    id: 'notificationsTab.col.rule',
    defaultMessage: 'Rule',
  },
  status: {
    id: 'notificationsTab.col.status',
    defaultMessage: 'Status',
  },
  actions: {
    id: 'notificationsTab.col.actions',
    defaultMessage: 'Actions',
  },
  btnMarkAllRead: {
    id: 'notificationsTab.btn.markAllRead',
    defaultMessage: 'Mark all read',
  },
  btnExportSelected: {
    id: 'notificationsTab.btn.exportSelected',
    defaultMessage: 'Export selected',
  },
  btnExportAll: {
    id: 'notificationsTab.btn.exportAll',
    defaultMessage: 'Export all',
  },
  selectedItems: {
    id: 'notificationsTab.selected.items',
    defaultMessage: '{count} selected',
  },
  noSelectionWarning: {
    id: 'notificationsTab.warning.noSelection',
    defaultMessage: 'Please select the content to export',
  },
  platformWhatsapp: {
    id: 'notificationsTab.platform.whatsapp',
    defaultMessage: 'WhatsApp',
  },
  platformTelegram: {
    id: 'notificationsTab.platform.telegram',
    defaultMessage: 'Telegram',
  },
  statusRead: {
    id: 'notificationsTab.status.read',
    defaultMessage: 'Read',
  },
  statusUnread: {
    id: 'notificationsTab.status.unread',
    defaultMessage: 'Unread',
  },
  viewConversation: {
    id: 'notificationsTab.action.viewConversation',
    defaultMessage: 'View',
  },
  jumpToChat: {
    id: 'notificationsTab.action.jumpToChat',
    defaultMessage: 'Chat',
  },
  loading: {
    id: 'notificationsTab.loading',
    defaultMessage: 'Loading...',
  },
  loadError: {
    id: 'notificationsTab.error.load',
    defaultMessage: 'Failed to load notification records',
  },
  filterNotificationTime: {
    id: 'notificationsTab.filter.notificationTime',
    defaultMessage: 'Notify time',
  },
  filterSocialMedia: {
    id: 'notificationsTab.filter.socialMedia',
    defaultMessage: 'Social media',
  },
  filterStatus: {
    id: 'notificationsTab.filter.status',
    defaultMessage: 'Status',
  },
  filterAll: {
    id: 'notificationsTab.filter.all',
    defaultMessage: 'All',
  },
  filterWhatsApp: {
    id: 'notificationsTab.filter.whatsapp',
    defaultMessage: 'WhatsApp',
  },
  filterTelegram: {
    id: 'notificationsTab.filter.telegram',
    defaultMessage: 'Telegram',
  },
  filterRead: {
    id: 'notificationsTab.filter.read',
    defaultMessage: 'Read',
  },
  filterUnread: {
    id: 'notificationsTab.filter.unread',
    defaultMessage: 'Unread',
  },
  startDate: {
    id: 'notificationsTab.filter.startDate',
    defaultMessage: 'Start date',
  },
  endDate: {
    id: 'notificationsTab.filter.endDate',
    defaultMessage: 'End date',
  },
  selectStatus: {
    id: 'notificationsTab.filter.selectStatus',
    defaultMessage: 'Select status',
  },
  btnSearch: {
    id: 'notificationsTab.btn.search',
    defaultMessage: 'Search',
  },
  btnReset: {
    id: 'notificationsTab.btn.reset',
    defaultMessage: 'Reset',
  },
  dialogTitle: {
    id: 'notificationsTab.dialog.title',
    defaultMessage: 'Notification Detail',
  },
  dialogTriggerContent: {
    id: 'notificationsTab.dialog.triggerContent',
    defaultMessage: 'Trigger Content',
  },
  dialogAlertRule: {
    id: 'notificationsTab.dialog.alertRule',
    defaultMessage: 'Alert Rule',
  },
  dialogClose: {
    id: 'notificationsTab.dialog.close',
    defaultMessage: 'Close',
  },
});

/** 使用生成的 HandoffBriefResponse 类型 */
type HandoffRecord = HandoffBriefResponse;

type WebviewLoader = {
  loadURL: (url: string) => Promise<void> | void;
  executeJavaScript: (script: string) => Promise<unknown>;
};

type FerdiumBridge = Window & {
  ferdium?: {
    actions?: {
      service?: {
        setActive: (payload: { serviceId: string }) => void;
      };
    };
    stores?: {
      services?: {
        one: (id: string) => {
          webview: WebviewLoader | null;
          isAttached: boolean;
          isLoading: boolean;
        };
      };
    };
  };
};

const PAGE_SIZE = 20;

/** 判断 customer_jid 是否为 Telegram peer（纯数字或 tg 前缀 id） */
const isTelegramJid = (jid?: string | null): boolean => {
  if (!jid) return false;
  // WA 格式始终含 @s.whatsapp.net / @c.us，凡是这种格式一律不走 TG
  if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@c.us')) return false;
  // TG peer id 为纯数字（私聊，如 8398103325）、负数（群/频道，如 -1001234567890）
  // 或数字前有 peer 前缀（群/频道，如 peer123、channel123）
  return /^-?\d+$/u.test(jid) || /^(?:peer|chat|channel)-?\d+$/iu.test(jid);
};

/** 归一化平台判定：优先后端返回的 platform 字段，回退到 jid 规则推断 */
const isTelegramPlatform = (record: HandoffRecord): boolean => {
  const p = record.platform?.toLowerCase();
  if (p === "telegram") return true;
  if (p === "whatsapp") return false;
  // platform 缺失时回退旧的 jid 推断逻辑
  return isTelegramJid(record.customer_jid);
};

const formatDateTime = (iso: string): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
};

const NotificationsTab = (): ReactElement => {
  const intl = useIntl();
  const [records, setRecords] = useState<HandoffRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>(
    [],
  );
  const [socialFilter, setSocialFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>([]);
  const [dialogRecord, setDialogRecord] = useState<HandoffRecord | null>(null);

  const loadRecords = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const offset = (page - 1) * PAGE_SIZE;
        const [start, end] = dateRange;
        const timeParams: { created_after?: string; created_before?: string } =
          {};
        if (start && end) {
          timeParams.created_after = `${String(start)}T00:00:00`;
          timeParams.created_before = `${String(end)}T23:59:59`;
        }
        // 筛选全部时走业务态接口，筛选已读/未读时走已读视图接口
        const result: any =
          statusFilter === 'all'
            ? await listMemberHandoffsApiV1HandoffGet({
                ...timeParams,
                offset,
                limit: PAGE_SIZE,
              })
            : await listHandoffsByReadApiV1HandoffReadGet({
                unread: statusFilter === 'unread',
                ...timeParams,
                offset,
                limit: PAGE_SIZE,
              });
        const payload =
          result.data as import('../../../agent-flow-cs/api/generated/agentFlowCs.schemas').HandoffListResponse;
        setRecords(payload.items ?? []);
        setTotal(payload.total);
      } catch (error) {
        MessagePlugin.error(
          error instanceof Error
            ? error.message
            : intl.formatMessage(messages.loadError),
        );
        setRecords([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [intl, statusFilter, dateRange],
  );

  useEffect(() => {
    loadRecords(1).catch(() => {});
  }, [loadRecords]);

  const handlePageChange = useCallback(
    (pageInfo: { current: number; pageSize: number }) => {
      setCurrentPage(pageInfo.current);
      loadRecords(pageInfo.current).catch(() => {});
    },
    [loadRecords],
  );

  const handleSelectChange = useCallback((keys: (string | number)[]) => {
    setSelectedRowKeys(keys);
  }, []);

  const handleSearch = useCallback((): void => {
    loadRecords(1).catch(() => {});
  }, [loadRecords]);

  const handleReset = useCallback((): void => {
    setSocialFilter('all');
    setStatusFilter('all');
    setDateRange([]);
    loadRecords(1).catch(() => {});
  }, [loadRecords]);

  const handleMarkAllRead = useCallback((): void => {}, []);

  const handleExportSelected = useCallback((): void => {
    if (selectedRowKeys.length === 0) {
      MessagePlugin.warning(intl.formatMessage(messages.noSelectionWarning));
      return;
    }
    const selected = records.filter(r => selectedRowKeys.includes(r.id));
    downloadCSV(selected, intl);
  }, [intl, records, selectedRowKeys]);

  const handleExportAll = useCallback((): void => {
    downloadCSV(records, intl);
  }, [intl, records]);

  const handleViewConversation = useCallback(
    async (record: HandoffRecord) => {
      // 仅未读时才调用标记已读接口
      if (!record.read_at) {
        try {
          await markHandoffReadApiV1HandoffHandoffIdReadPost(record.id);
          // 通知全局 Store 刷新未读计数
          window.dispatchEvent(new Event(HANDOFF_UNREAD_CHANGED_EVENT));
          // 刷新列表更新已读状态
          loadRecords(currentPage).catch(() => {});
        } catch (error) {
          MessagePlugin.error(
            error instanceof Error ? error.message : 'Failed to mark as read',
          );
        }
      }
      setDialogRecord(record);
    },
    [currentPage, loadRecords],
  );

  const handleCloseDialog = useCallback(() => {
    setDialogRecord(null);
  }, []);

  const handleJumpToChat = useCallback(
    async (record: HandoffRecord) => {
      // 标记已读（与 handleViewConversation 保持一致）
      if (!record.read_at) {
        try {
          await markHandoffReadApiV1HandoffHandoffIdReadPost(record.id);
          window.dispatchEvent(new Event(HANDOFF_UNREAD_CHANGED_EVENT));
          loadRecords(currentPage).catch(() => {});
        } catch (error) {
          MessagePlugin.error(
            error instanceof Error ? error.message : 'Failed to mark as read',
          );
        }
      }

      const sessionId = record.wa_session_id;
      const jid = record.customer_jid;

      if (!jid) {
        MessagePlugin.warning('Missing customer chat ID');
        if (window.location.search.includes('debug=tg'))
          console.warn('[JumpToChat][TG] jid empty, record=', record);
        return;
      }

      const isTG = isTelegramPlatform(record);
      const platformLabel = isTG ? 'Telegram' : 'WhatsApp';

      // --- 选择 sessionId：TG 的 sessionId 仍走 wa_session_id 字段（后端复用该字段承载两种平台的 session id） ---
      if (!sessionId) {
        MessagePlugin.warning(`Missing ${platformLabel} session`);
        return;
      }

      const { ferdium } = window as unknown as FerdiumBridge;
      const service = ferdium?.stores?.services?.one(sessionId);
      if (!service) {
        MessagePlugin.warning(`${platformLabel} service not found`);
        return;
      }

      // 同步模块当前服务，避免 AppLayoutContainer reaction 切回该模块第一个服务
      const module = isTG ? 'telegram' : 'whatsapp';
      console.warn(
        '[JumpToChat][TG] isTG=',
        isTG,
        'sessionId=',
        sessionId,
        'jid=',
        jid,
        'module=',
        module,
      );
      navigationStore.setModuleActiveService(module, sessionId);
      ferdium?.actions?.service?.setActive({ serviceId: sessionId });
      navigationStore.setModule(module);

      // Tier 1: 等待 webview 挂载 + 页面加载完成（最多 30s）
      const wv = await new Promise<WebviewLoader | null>(resolve => {
        const start = Date.now();
        const poll = () => {
          const s = ferdium?.stores?.services?.one(sessionId);
          if (s?.webview && s.isAttached && !s.isLoading) {
            resolve(s.webview);
            return;
          }
          if (Date.now() - start > 30_000) {
            resolve(null);
            return;
          }
          window.setTimeout(poll, 500);
        };
        poll();
      });

      if (!wv) {
        MessagePlugin.warning(
          `${platformLabel} webview not ready, please try again`,
        );
        return;
      }

      /* ---------- Telegram 跳转：hash 路由直接定位 peer ---------- */
      if (isTG) {
        // Tier 2: 等待聊天列表渲染（K 版 .ListItem.chat-item-clickable，或通用 chat list 容器）
        const tgReady = await new Promise<boolean>(resolve => {
          const start = Date.now();
          const poll = () => {
            wv.executeJavaScript(
              "!!document.querySelector('.ListItem.Chat.chat-item-clickable, .chat-list-container, .chatlist-container, .sidebar-chat-list')",
            )
              .then((found: unknown) => {
                if (found) {
                  resolve(true);
                  return;
                }
                if (Date.now() - start > 15_000) {
                  resolve(false);
                  return;
                }
                window.setTimeout(poll, 1000);
              })
              .catch(() => {
                if (Date.now() - start > 15_000) {
                  resolve(false);
                  return;
                }
                window.setTimeout(poll, 1000);
              });
          };
          poll();
        });

        if (!tgReady) {
          MessagePlugin.warning('Telegram chat list not ready, trying anyway');
        }

        const escapedPeerId = JSON.stringify(jid);
        const tgScript = `
          (async function() {
            var peerId = ${escapedPeerId};
            var result = { ok: false, method: '', reason: '', hashBefore: '', hashAfter: '' };
            var wait = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };

            result.hashBefore = window.location.hash;

            var link = document.querySelector('a[href="#' + peerId + '"]')
                     || document.querySelector('[data-peer-id="' + peerId + '"]')
                     || document.querySelector('div[data-peer-id="' + peerId + '"]');

            if (link) {
              /* 1. 优先原生 <a> 导航：清掉可能存在的 preventDefault 干扰路径，
                 直接构造真实指针事件序列（Ripple 组件靠 pointerdown/mousedown 触发，
                 单纯 .click() 不会走它的路由逻辑） */
              var rect = link.getBoundingClientRect();
              var cx = rect.left + rect.width / 2;
              var cy = rect.top + rect.height / 2;
              var commonOpts = {
                bubbles: true, cancelable: true, view: window,
                clientX: cx, clientY: cy, button: 0, buttons: 1,
              };
              link.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true }, commonOpts)));
              link.dispatchEvent(new MouseEvent('mousedown', commonOpts));
              await wait(30);
              link.dispatchEvent(new PointerEvent('pointerup', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true }, commonOpts)));
              link.dispatchEvent(new MouseEvent('mouseup', commonOpts));
              link.dispatchEvent(new MouseEvent('click', commonOpts));
              await wait(50);
              result.hashAfter = window.location.hash;

              if (result.hashAfter && result.hashAfter !== result.hashBefore) {
                result.ok = true;
                result.method = 'pointer-sequence';
                return result;
              }

              /* 2. 兜底：直接调用原生 click()（部分场景仍然有效） */
              link.click();
              await wait(50);
              result.hashAfter = window.location.hash;
              if (result.hashAfter && result.hashAfter !== result.hashBefore) {
                result.ok = true;
                result.method = 'native-click';
                return result;
              }
            }

            /* 3. hash 路由兜底 + 轮询验证（K 版可能只监听 hashchange 或 popstate） */
            var targetHash = '#' + peerId;
            var oldUrl = location.href;
            var oldHash = window.location.hash;
            window.location.hash = targetHash;
            window.dispatchEvent(new HashChangeEvent('hashchange', {
              oldURL: oldUrl,
              newURL: location.href,
            }));
            // 轮询最多 1500ms 确认 hash 真的指向目标 peer，防止伪成功
            var deadline2 = Date.now() + 1500;
            var hashChanged = window.location.hash === targetHash &&
              (window.location.hash !== oldHash || !!link);
            while (!hashChanged && Date.now() < deadline2) {
              await wait(100);
              hashChanged = window.location.hash === targetHash;
            }
            result.hashAfter = window.location.hash;
            result.method = hashChanged ? 'hash-fallback' : 'hash-fallback-failed';
            result.ok = hashChanged;
            console.warn('[TG-JS][fallback] targetHash=', targetHash, 'hashAfter=', result.hashAfter, 'ok=', result.ok);
            if (!hashChanged) { result.reason = 'hash-did-not-update'; }
            return result;
          })()
        `;

        try {
          const res = (await wv.executeJavaScript(tgScript)) as {
            ok?: boolean;
            method?: string;
            reason?: string;
            hashBefore?: string;
            hashAfter?: string;
          };
          if (!res?.ok) {
            MessagePlugin.warning(
              `Failed to open Telegram chat: ${res?.reason || 'unknown'}`,
            );
          }
        } catch {
          MessagePlugin.warning(
            'Failed to open Telegram chat, please try again',
          );
        }
        return;
      }

      /* ---------- WhatsApp 跳转（原有逻辑，不变） ---------- */

      // Tier 2: 等待 WhatsApp Web 搜索框出现（最多 20s）
      const waReady = await new Promise<boolean>(resolve => {
        const start = Date.now();
        const poll = () => {
          wv.executeJavaScript(
            '!!document.querySelector(\'div[data-testid="chat-list-search-container"] input[type="text"], input[data-tab="3"], div[contenteditable="true"][data-testid="chat-list-search"]\')',
          )
            .then((found: unknown) => {
              if (found) {
                resolve(true);
                return;
              }
              if (Date.now() - start > 20_000) {
                resolve(false);
                return;
              }
              window.setTimeout(poll, 1000);
            })
            .catch(() => {
              if (Date.now() - start > 20_000) {
                resolve(false);
                return;
              }
              window.setTimeout(poll, 1000);
            });
        };
        poll();
      });

      if (!waReady) {
        MessagePlugin.warning('WhatsApp Web not fully loaded, trying anyway');
      }

      // 从 JID 提取手机号用于搜索（如 8613607365287@s.whatsapp.net → 8613607365287）
      const phone = jid
        .replace(/@s\.whatsapp\.net$/u, '')
        .replace(/@c\.us$/u, '');
      const escapedJid = JSON.stringify(jid);
      const escapedPhone = JSON.stringify(phone);

      const script = `
        (async function() {
          const targetJid = ${escapedJid};
          const targetPhone = ${escapedPhone};
          const wait = ms => new Promise(r => window.setTimeout(r, ms));
          const result = { ok: false, method: '', reason: '' };

          /* --- 搜索框检测（多级兜底） --- */
          const findSearchInput = () => {
            const container = document.querySelector('div[data-testid="chat-list-search-container"]');
            if (container) {
              const inp = container.querySelector('input[type="text"]');
              if (inp) return inp;
            }
            const byTab = document.querySelector('input[data-tab="3"], div[contenteditable="true"][data-tab="3"]');
            if (byTab) return byTab;
            const byAria = document.querySelector(
              'input[role="textbox"][aria-label*="搜索"], input[role="textbox"][aria-label*="Search"], ' +
              'div[contenteditable="true"][aria-label*="搜索"], div[contenteditable="true"][aria-label*="Search"]'
            );
            if (byAria) return byAria;
            const legacy = document.querySelector('div[contenteditable="true"][data-testid="chat-list-search"]');
            if (legacy) return legacy;
            return document.querySelector('#side input[type="text"], #pane-side input[type="text"]') || null;
          };

          const searchInput = findSearchInput();
          if (!searchInput) {
            result.reason = 'search-input-not-found';
            return result;
          }

          /* --- 聚焦 + 输入手机号 --- */
          searchInput.focus();
          searchInput.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

          const tagName = (searchInput.tagName || '').toLowerCase();
          if (tagName === 'input' || tagName === 'textarea') {
            const valueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value'
            )?.set;
            if (typeof valueSetter === 'function') {
              valueSetter.call(searchInput, targetPhone);
            } else {
              searchInput.value = targetPhone;
            }
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (searchInput.isContentEditable) {
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            document.execCommand('insertText', false, targetPhone);
            searchInput.dispatchEvent(new InputEvent('input', {
              bubbles: true, inputType: 'insertText', data: targetPhone,
            }));
          } else {
            result.reason = 'search-input-unsupported-type';
            return result;
          }

          /* --- 轮询搜索结果出现后按回车（最多 8s） --- */
          const fireEnter = el => {
            const opts = {
              key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
              bubbles: true, cancelable: true,
            };
            el.dispatchEvent(new KeyboardEvent('keydown', opts));
            el.dispatchEvent(new KeyboardEvent('keypress', opts));
            el.dispatchEvent(new KeyboardEvent('keyup', opts));
          };
          const waitForResults = async () => {
            const deadline = Date.now() + 8000;
            while (Date.now() < deadline) {
              const result = document.querySelector(
                '[data-testid="cell-frame-container"], ' +
                '[role="listitem"][data-id], ' +
                '[role="gridcell"]'
              );
              if (result) {
                fireEnter(searchInput);
                return true;
              }
              await wait(200);
            }
            return false;
          };
          const entered = await waitForResults();
          if (!entered) {
            fireEnter(searchInput); // 超时了也试一次
          }

          /* --- 检测聊天是否已打开，未打开则 hash 兜底 --- */
          result.reason = '';
          const chatOpened = await (async () => {
            const deadline = Date.now() + 3000;
            while (Date.now() < deadline) {
              if (
                window.location.hash.includes(targetJid) ||
                document.querySelector(
                  'header[data-testid="conversation-header"]',
                ) ||
                document.querySelector(
                  '[data-testid="conversation-compose-box-input"]',
                )
              ) {
                return true;
              }
              await wait(300);
            }
            return false;
          })();
          if (!chatOpened) {
            window.location.hash =
              '#!/c/' + encodeURIComponent(targetJid);
            result.method = 'hash-fallback';
          } else {
            result.method = 'search-enter';
          }
          result.ok = true;
          return result;
        })()
      `;

      try {
        const res = (await wv.executeJavaScript(script)) as {
          ok?: boolean;
          method?: string;
          reason?: string;
        };
        if (!res?.ok) {
          MessagePlugin.warning(
            `Failed to open chat: ${res?.reason || 'unknown'}`,
          );
        }
      } catch {
        MessagePlugin.warning('Failed to open WhatsApp chat, please try again');
      }
    },
    [currentPage, loadRecords],
  );

  const columns: PrimaryTableCol[] = [
    { colKey: 'row-select', type: 'multiple', width: 48 },
    {
      colKey: 'serialNumber',
      title: intl.formatMessage(messages.serialNumber),
      width: 56,
      align: 'center',
      cell: ({ rowIndex }: { rowIndex: number }) =>
        (currentPage - 1) * PAGE_SIZE + rowIndex + 1,
    },
    {
      colKey: 'id',
      title: intl.formatMessage(messages.account),
      width: 100,
      ellipsis: true,
    },
    {
      colKey: 'conversation_id',
      title: intl.formatMessage(messages.conversation),
      width: 100,
      ellipsis: true,
    },
    {
      colKey: 'reason',
      title: intl.formatMessage(messages.triggerContent),
      width: 160,
      ellipsis: true,
    },
    {
      colKey: 'source',
      title: intl.formatMessage(messages.rule),
      width: 120,
      ellipsis: true,
    },
    {
      colKey: 'status',
      title: intl.formatMessage(messages.status),
      width: 100,
      cell: ({ row }) => {
        const r = row as HandoffRecord;
        const isRead = !!r.read_at;
        return (
          <span
            className="inline-flex items-center gap-[6px]"
            style={{ whiteSpace: 'nowrap' }}
          >
            <span
              className={`inline-block h-[6px] w-[6px] rounded-full ${isRead ? 'bg-success' : 'bg-error'}`}
            />
            <span
              className={`text-[14px] font-normal leading-[22px] ${isRead ? 'text-success' : 'text-error'}`}
            >
              {isRead
                ? intl.formatMessage(messages.statusRead)
                : intl.formatMessage(messages.statusUnread)}
            </span>
          </span>
        );
      },
    },
    {
      colKey: 'platform',
      title: intl.formatMessage(messages.platform),
      width: 96,
      cell: ({ row }) => {
        const r = row as HandoffRecord;
        const isTG = isTelegramPlatform(r);
        return (
          <div
            className="flex items-center gap-[8px]"
            style={{ whiteSpace: 'nowrap' }}
          >
            <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full">
              <img
                className="size-[16px]"
                src={
                  isTG
                    ? './assets/icons/telegram.svg'
                    : './assets/icons/whats.svg'
                }
                alt=""
              />
            </div>
            <span className="text-[14px] text-primary">
              {intl.formatMessage(
                isTG ? messages.platformTelegram : messages.platformWhatsapp,
              )}
            </span>
          </div>
        );
      },
    },
    {
      colKey: 'created_at',
      title: intl.formatMessage(messages.time),
      width: 132,
      ellipsis: true,
      cell: ({ row }) => {
        const r = row as HandoffRecord;
        return (
          <span
            style={{
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            {formatDateTime(r.created_at)}
          </span>
        );
      },
    },
    {
      colKey: 'op',
      title: intl.formatMessage(messages.actions),
      width: 150,
      cell: ({ row }) => {
        const r = row as HandoffRecord;
        return (
          <div className="flex items-center gap-[12px]">
            <button
              type="button"
              onClick={() => handleViewConversation(r)}
              className="cursor-pointer border-none bg-transparent p-0 text-[14px] text-brand hover:text-brand-hover hover:underline"
            >
              {intl.formatMessage(messages.viewConversation)}
            </button>
            <button
              type="button"
              onClick={() => handleJumpToChat(r)}
              className="cursor-pointer border-none bg-transparent p-0 text-[14px] text-brand hover:text-brand-hover hover:underline"
            >
              {intl.formatMessage(messages.jumpToChat)}
            </button>
          </div>
        );
      },
    },
  ];

  const someSelected = selectedRowKeys.length > 0;

  return (
    <>
      <div className="mx-auto w-full min-h-full py-[32px] px-[30px] bg-container rounded-[6px]">
        <div className="flex h-[56px] items-center gap-[20px]">
          <div className="flex items-center gap-[8px]">
            <span className="text-[14px] font-normal text-secondary">
              {intl.formatMessage(messages.filterNotificationTime)}
            </span>
            <DateRangePicker
              mode="date"
              value={dateRange}
              onChange={value => setDateRange(value)}
              placeholder={[
                intl.formatMessage(messages.startDate),
                intl.formatMessage(messages.endDate),
              ]}
              style={{ width: 260, height: 32 }}
              className="[&_.t-input]:h-[32px] [&_.t-input]:rounded-[6px] [&_.t-input]:border-line"
            />
          </div>

          <div className="flex items-center gap-[8px]">
            <span className="text-[14px] font-normal text-secondary">
              {intl.formatMessage(messages.filterSocialMedia)}
            </span>
            <Select
              style={{ width: 160 }}
              className="[&_.t-select__trigger]:h-[32px] [&_.t-input]:rounded-[6px] [&_.t-input]:border-line"
              placeholder={intl.formatMessage(messages.selectStatus)}
              options={[
                { label: intl.formatMessage(messages.filterAll), value: 'all' },
                { label: 'WhatsApp', value: 'whatsapp' },
                // { label: 'Telegram', value: 'telegram' },
              ]}
              value={socialFilter}
              onChange={value => {
                if (typeof value === 'string') setSocialFilter(value);
              }}
            />
          </div>

          <div className="flex items-center gap-[8px]">
            <span className="text-[14px] font-normal text-secondary">
              {intl.formatMessage(messages.filterStatus)}
            </span>
            <Select
              style={{ width: 160 }}
              className="[&_.t-select__trigger]:h-[32px] [&_.t-input]:rounded-[6px] [&_.t-input]:border-line"
              placeholder={intl.formatMessage(messages.selectStatus)}
              options={[
                { label: intl.formatMessage(messages.filterAll), value: 'all' },
                {
                  label: intl.formatMessage(messages.filterRead),
                  value: 'read',
                },
                {
                  label: intl.formatMessage(messages.filterUnread),
                  value: 'unread',
                },
              ]}
              value={statusFilter}
              onChange={value => {
                if (typeof value === 'string') setStatusFilter(value);
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="flex h-[32px] w-[64px] cursor-pointer items-center justify-center rounded-[6px] border-none bg-brand text-[14px] font-medium text-text-anti"
          >
            {intl.formatMessage(messages.btnSearch)}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex h-[32px] w-[64px] cursor-pointer items-center justify-center rounded-[6px] border border-solid border-line bg-container text-[14px] font-medium text-secondary"
          >
            {intl.formatMessage(messages.btnReset)}
          </button>
        </div>

        <div className="mt-[16px] flex h-[44px] items-center gap-[12px]">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex h-[32px] cursor-pointer items-center justify-center rounded-[6px] border-none bg-brand px-[16px] text-[14px] font-medium text-text-anti"
          >
            {intl.formatMessage(messages.btnMarkAllRead)}
          </button>

          <button
            type="button"
            onClick={handleExportSelected}
            className="flex h-[32px] cursor-pointer items-center justify-center rounded-[6px] border border-solid border-line bg-container px-[16px] text-[14px] font-medium text-secondary"
          >
            {intl.formatMessage(messages.btnExportSelected)}
          </button>

          <button
            type="button"
            onClick={handleExportAll}
            className="flex h-[32px] cursor-pointer items-center justify-center rounded-[6px] border border-solid border-line bg-container px-[16px] text-[14px] font-medium text-secondary"
          >
            {intl.formatMessage(messages.btnExportAll)}
          </button>

          {someSelected && (
            <span className="text-[14px] font-normal text-placeholder">
              {intl.formatMessage(messages.selectedItems, {
                count: selectedRowKeys.length,
              })}
            </span>
          )}
        </div>

        <div className="mt-[16px] rounded-[8px]">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loading loading text={intl.formatMessage(messages.loading)} />
            </div>
          ) : (
            <Table
              data={records}
              columns={columns}
              rowKey="id"
              selectedRowKeys={selectedRowKeys}
              onSelectChange={handleSelectChange}
              tableLayout="fixed"
              hover
              stripe={false}
              bordered
              size="medium"
            />
          )}

          <div className="flex h-[52px] items-center justify-between bg-container px-[24px]">
            <Pagination
              total={total}
              pageSize={PAGE_SIZE}
              current={currentPage}
              onChange={handlePageChange}
              showJumper
              size="small"
            />
          </div>
        </div>
      </div>

      {dialogRecord && (
        <Dialog
          visible
          header={intl.formatMessage(messages.dialogTitle)}
          onClose={handleCloseDialog}
          footer={
            <button
              type="button"
              onClick={handleCloseDialog}
              className="flex h-[32px] cursor-pointer items-center justify-center rounded-[6px] border-none bg-brand px-[24px] text-[14px] font-medium text-text-anti"
            >
              {intl.formatMessage(messages.dialogClose)}
            </button>
          }
          width={480}
          placement="center"
        >
          <div className="flex flex-col gap-[20px] py-[8px]">
            <div className="flex flex-col gap-[8px]">
              <span className="text-[13px] font-medium text-secondary">
                {intl.formatMessage(messages.dialogTriggerContent)}
              </span>
              <div className="rounded-[6px] bg-secondary-container px-[16px] py-[12px] text-[14px] leading-[22px] text-primary">
                {dialogRecord.reason || '-'}
              </div>
            </div>
            <div className="flex flex-col gap-[8px]">
              <span className="text-[13px] font-medium text-secondary">
                {intl.formatMessage(messages.dialogAlertRule)}
              </span>
              <div className="rounded-[6px] bg-secondary-container px-[16px] py-[12px] text-[14px] leading-[22px] text-primary">
                {dialogRecord.source || '-'}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
};

function downloadCSV(
  records: HandoffRecord[],
  intl: ReturnType<typeof useIntl>,
): void {
  const headers = [
    '#',
    intl.formatMessage(messages.account),
    intl.formatMessage(messages.conversation),
    intl.formatMessage(messages.triggerContent),
    intl.formatMessage(messages.status),
    intl.formatMessage(messages.rule),
    intl.formatMessage(messages.platform),
    intl.formatMessage(messages.time),
  ];
  const csvRows = records.map((r, i) =>
    [
      i + 1,
      r.id,
      r.conversation_id,
      r.reason,
      r.status,
      r.source,
      isTelegramPlatform(r) ? 'Telegram' : 'WhatsApp',
      formatDateTime(r.created_at),
    ]
      .map(cell => `"${String(cell).replaceAll('"', '""')}"`)
      .join(','),
  );
  // Prepend UTF-8 BOM so Excel correctly recognizes the encoding for CJK characters
  const csvContent = `\uFEFF${[headers.join(','), ...csvRows].join('\n')}`;
  const base64 = btoa(unescape(encodeURIComponent(csvContent)));
  const dataUri = `data:text/csv;base64,${base64}`;
  ipcRenderer.send('download-file', {
    content: dataUri,
    fileOptions: { name: 'notifications.csv' },
  });
}

export default NotificationsTab;
