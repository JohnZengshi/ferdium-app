import { ipcRenderer } from 'electron';
/* eslint-disable react/no-unstable-nested-components */
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { ChatBubble1FilledIcon } from 'tdesign-icons-react';
import { Loading, MessagePlugin, Pagination, Table } from 'tdesign-react';
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

const NotificationsTab = (): ReactElement => {
  const intl = useIntl();
  const [records, setRecords] = useState<HandoffRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>(
    [],
  );

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
      width: 160,
      ellipsis: true,
    },
    {
      colKey: 'conversation_id',
      title: intl.formatMessage(messages.conversation),
      width: 160,
      ellipsis: true,
    },
    {
      colKey: 'reason',
      title: intl.formatMessage(messages.triggerContent),
      width: 220,
      ellipsis: true,
    },
    {
      colKey: 'source',
      title: intl.formatMessage(messages.rule),
      width: 180,
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
          <span className="inline-flex items-center gap-[6px]">
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
      width: 130,
      cell: () => (
        <div className="flex items-center gap-[8px]">
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
      width: 160,
      ellipsis: true,
      cell: ({ row }) => {
        const r = row as HandoffRecord;
        return (
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatDateTime(r.created_at)}
          </span>
        );
      },
    },
    {
      colKey: 'op',
      title: intl.formatMessage(messages.actions),
      width: 84,
      fixed: 'right',
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
            resizable
            hover
            stripe={false}
            bordered
            size="medium"
            className="[&_.t-table__header]:!bg-secondary-container [&_.t-table__header-th]:!border-b [&_.t-table__header-th]:!border-solid [&_.t-table__header-th]:!border-line [&_.t-table__header-th]:!text-[13px] [&_.t-table__header-th]:!font-medium [&_.t-table__header-th]:!text-placeholder [&_.t-table__body-td]:!h-[52px]"
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
