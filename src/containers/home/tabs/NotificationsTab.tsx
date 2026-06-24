import { ipcRenderer } from 'electron';
/* eslint-disable react/no-unstable-nested-components */
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { ChatBubble1FilledIcon } from 'tdesign-icons-react';
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

const PAGE_SIZE = 20;

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
      cell: () => (
        <div
          className="flex items-center gap-[8px]"
          style={{ whiteSpace: 'nowrap' }}
        >
          <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-success">
            <ChatBubble1FilledIcon className="text-text-anti" />
          </div>
          <span className="text-[14px] text-primary">
            {intl.formatMessage(messages.platformWhatsapp)}
          </span>
        </div>
      ),
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
      width: 96,
      cell: ({ row }) => {
        const r = row as HandoffRecord;
        return (
          <button
            type="button"
            onClick={() => handleViewConversation(r)}
            className="cursor-pointer border-none bg-transparent p-0 text-[14px] text-brand hover:text-brand-hover hover:underline"
          >
            {intl.formatMessage(messages.viewConversation)}
          </button>
        );
      },
    },
  ];

  const someSelected = selectedRowKeys.length > 0;

  return (
    <>
      <div className="mx-auto w-full min-h-full py-[32px] px-[30px] bg-container">
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
      'WhatsApp',
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
