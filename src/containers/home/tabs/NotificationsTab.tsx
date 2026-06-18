import { ipcRenderer } from 'electron';
/* eslint-disable react/no-unstable-nested-components */
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { ChatBubble1FilledIcon } from 'tdesign-icons-react';
import {
  DateRangePicker,
  Loading,
  MessagePlugin,
  Pagination,
  Select,
  Table,
} from 'tdesign-react';
import type { PrimaryTableCol } from 'tdesign-react';
import { useCustomInstance } from '../../../agent-flow-cs/api/customInstance';

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
});

/** 接口 /api/v1/handoff 返回的记录字段 */
interface HandoffRecord {
  id: string;
  conversation_id: string;
  reason: string;
  status: string;
  source: string;
  created_at: string;
}

interface HandoffListResponse {
  items: HandoffRecord[];
  total: number;
  limit: number;
  offset: number;
}

const HANDOFF_BASE = '/api/v1/handoff';
const PAGE_SIZE = 20;

const fetchHandoffRecords = async (
  offset: number,
  limit: number,
): Promise<HandoffListResponse> => {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const response = await useCustomInstance<{
    data: HandoffListResponse | HandoffRecord[];
    status: number;
    headers: Headers;
  }>(`${HANDOFF_BASE}?${searchParams.toString()}`, {
    method: 'GET',
  });

  const payload = response.data;

  if (Array.isArray(payload)) {
    return {
      items: payload,
      limit,
      offset,
      total: payload.length,
    };
  }

  return payload;
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
const NOTIFICATIONS_TABLE_CLASS =
  '[&_.t-table__header-th]:!whitespace-nowrap [&_.t-table__header-th]:!text-[13px] [&_.t-table__header-th]:!font-medium [&_.t-table__body-td]:!h-[52px] [&_.t-table__body-td]:!whitespace-nowrap [&_.t-table__body-td]:!overflow-hidden [&_.t-table__body-td]:!text-ellipsis [&_.t-table__body-td]:align-middle [&_.t-table__cell]:!whitespace-nowrap';

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

  const loadRecords = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const offset = (page - 1) * PAGE_SIZE;
        const result = await fetchHandoffRecords(offset, PAGE_SIZE);
        setRecords(result.items);
        setTotal(result.total);
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
    [intl],
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

  const handleViewConversation = useCallback((): void => {}, []);

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
        const isRead =
          r.status === 'read' || r.status === 'Read' || r.status === 'READ';
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
      cell: () => (
        <button
          type="button"
          onClick={handleViewConversation}
          className="cursor-pointer border-none bg-transparent p-0 text-[14px] text-brand hover:text-brand-hover hover:underline"
        >
          {intl.formatMessage(messages.viewConversation)}
        </button>
      ),
    },
  ];

  const someSelected = selectedRowKeys.length > 0;

  return (
    <div
      className="mx-auto w-full px-[24px] pt-[24px]"
      style={{ maxWidth: '1440px' }}
    >
      <div className="flex h-[56px] items-center gap-[20px]">
        <div className="flex items-center gap-[8px]">
          <span className="text-[14px] font-normal text-secondary">
            {intl.formatMessage(messages.filterNotificationTime)}
          </span>
          <DateRangePicker
            mode="date"
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
              { label: intl.formatMessage(messages.filterRead), value: 'read' },
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

      <div className="mt-[16px] rounded-[8px] border border-solid border-line">
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
            className={NOTIFICATIONS_TABLE_CLASS}
          />
        )}

        <div className="flex h-[52px] items-center justify-between border-t border-solid border-line bg-container px-[24px]">
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
  const csvContent = [headers.join(','), ...csvRows].join('\n');
  const base64 = btoa(unescape(encodeURIComponent(csvContent)));
  const dataUri = `data:text/csv;base64,${base64}`;
  ipcRenderer.send('download-file', {
    content: dataUri,
    fileOptions: { name: 'notifications.csv' },
  });
}

export default NotificationsTab;
