/* eslint-disable react/no-unstable-nested-components */
import { Component, type ReactElement } from 'react';
import type { WrappedComponentProps } from 'react-intl';
import { defineMessages, injectIntl } from 'react-intl';
import { ipcRenderer } from 'electron';
import { ChatBubble1FilledIcon, SendIcon } from 'tdesign-icons-react';
import { MessagePlugin, Pagination, Table } from 'tdesign-react';
import type { PrimaryTableCol } from 'tdesign-react';

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
});

interface NotificationRecord {
  id: number;
  time: string;
  platform: 'whatsapp' | 'telegram';
  account: string;
  user: string;
  triggerContent: string;
  rule: string;
  status: 'read' | 'unread';
}

const MOCK_DATA: NotificationRecord[] = [
  {
    id: 1,
    time: '2025-05-12 08:12',
    platform: 'whatsapp',
    account: '原本的用户昵称...',
    user: '王小明',
    triggerContent: '你是不是AI，怎...',
    rule: '规则3：客户质疑...',
    status: 'unread',
  },
  {
    id: 2,
    time: '2025-05-12 07:45',
    platform: 'whatsapp',
    account: '客户A-张伟...',
    user: '张伟',
    triggerContent: '线下见面怎么...',
    rule: '规则1：拒绝线...',
    status: 'read',
  },
  {
    id: 3,
    time: '2025-05-12 07:30',
    platform: 'telegram',
    account: '李经理-商务...',
    user: '李华',
    triggerContent: '退款怎么操作...',
    rule: '规则2：不处理...',
    status: 'unread',
  },
  {
    id: 4,
    time: '2025-05-12 06:55',
    platform: 'whatsapp',
    account: '莉莉的咨询...',
    user: '陈莉莉',
    triggerContent: '你能帮我做什...',
    rule: '规则3：客户质疑...',
    status: 'read',
  },
  {
    id: 5,
    time: '2025-05-12 06:20',
    platform: 'whatsapp',
    account: '新客户-赵四...',
    user: '赵四',
    triggerContent: '你们公司地址...',
    rule: '规则4：不透露...',
    status: 'unread',
  },
  {
    id: 6,
    time: '2025-05-12 05:50',
    platform: 'telegram',
    account: '王老师-教育...',
    user: '王芳',
    triggerContent: '能提供私人电...',
    rule: '规则5：不提供...',
    status: 'read',
  },
  {
    id: 7,
    time: '2025-05-12 05:15',
    platform: 'whatsapp',
    account: '周总-业务洽...',
    user: '周明',
    triggerContent: '你们这个产品...',
    rule: '规则1：拒绝线...',
    status: 'unread',
  },
  {
    id: 8,
    time: '2025-05-12 04:40',
    platform: 'telegram',
    account: '刘老师-报名...',
    user: '刘洋',
    triggerContent: '明天能见面聊...',
    rule: '规则1：拒绝线...',
    status: 'read',
  },
  {
    id: 9,
    time: '2025-05-11 23:20',
    platform: 'whatsapp',
    account: '运营号-咨询...',
    user: '林小红',
    triggerContent: '你们是正规公...',
    rule: '规则3：客户质疑...',
    status: 'unread',
  },
  {
    id: 10,
    time: '2025-05-11 22:45',
    platform: 'whatsapp',
    account: '合作伙伴-孙...',
    user: '孙伟',
    triggerContent: '这个合作方案...',
    rule: '规则2：不处理...',
    status: 'read',
  },
  {
    id: 11,
    time: '2025-05-11 22:10',
    platform: 'telegram',
    account: '黄老师-留学...',
    user: '黄丽',
    triggerContent: '能给我你的Wa...',
    rule: '规则5：不提供...',
    status: 'unread',
  },
  {
    id: 12,
    time: '2025-05-11 21:35',
    platform: 'whatsapp',
    account: '老客户-杨姐...',
    user: '杨丽萍',
    triggerContent: '之前说的优惠...',
    rule: '规则6：不承诺...',
    status: 'read',
  },
];

interface NotificationsTabState {
  selectedRowIds: number[];
  currentPage: number;
  pageSize: number;
}

class NotificationsTab extends Component<
  Record<string, never> & WrappedComponentProps,
  NotificationsTabState
> {
  constructor(props: Record<string, never> & WrappedComponentProps) {
    super(props);

    this.state = {
      selectedRowIds: [1],
      currentPage: 1,
      pageSize: 20,
    };
  }

  handlePageChange = (pageInfo: {
    current: number;
    pageSize: number;
  }): void => {
    this.setState({
      currentPage: pageInfo.current,
      pageSize: pageInfo.pageSize,
    });
  };

  handleSelectChange = (selectedRowKeys: (string | number)[]): void => {
    this.setState({ selectedRowIds: selectedRowKeys as number[] });
  };

  handleMarkAllRead = (): void => {};

  handleExportSelected = (): void => {
    const { intl } = this.props;
    const { selectedRowIds } = this.state;
    if (selectedRowIds.length === 0) {
      MessagePlugin.warning(intl.formatMessage(messages.noSelectionWarning));
      return;
    }
    const records = MOCK_DATA.filter(r => selectedRowIds.includes(r.id));
    this.downloadCSV(records, 'notifications_selected.csv');
  };

  handleExportAll = (): void => {
    this.downloadCSV(MOCK_DATA, 'notifications_all.csv');
  };

  downloadCSV = (records: NotificationRecord[], filename: string): void => {
    const headers = [
      'ID',
      'Time',
      'Platform',
      'Account',
      'User',
      'Content',
      'Rule',
      'Status',
    ];
    const csvRows = records.map(r =>
      [
        r.id,
        r.time,
        r.platform,
        r.account,
        r.user,
        r.triggerContent,
        r.rule,
        r.status,
      ]
        .map(cell => `"${String(cell).replaceAll('"', '""')}"`)
        .join(','),
    );
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const base64 = btoa(unescape(encodeURIComponent(csvContent)));
    const dataUri = `data:text/csv;base64,${base64}`;
    ipcRenderer.send('download-file', {
      content: dataUri,
      fileOptions: { name: filename },
    });
  };

  handleViewConversation = (): void => {};

  getColumns = (): PrimaryTableCol[] => {
    const { intl } = this.props;
    return [
      { colKey: 'row-select', type: 'multiple', width: 48 },
      {
        colKey: 'id',
        title: intl.formatMessage(messages.serialNumber),
        width: 56,
        align: 'center',
      },
      {
        colKey: 'time',
        title: intl.formatMessage(messages.time),
        width: 148,
        ellipsis: true,
        cell: ({ row }) => (
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {(row as NotificationRecord).time}
          </span>
        ),
      },
      {
        colKey: 'platform',
        title: intl.formatMessage(messages.platform),
        width: 124,
        cell: ({ row }) => {
          const r = row as NotificationRecord;
          if (r.platform === 'whatsapp') {
            return (
              <div className="flex items-center gap-[8px]">
                <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-success">
                  <ChatBubble1FilledIcon className="text-text-anti" />
                </div>
                <span className="text-[14px] text-primary">
                  {intl.formatMessage(messages.platformWhatsapp)}
                </span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-[8px]">
              <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-brand">
                <SendIcon className="text-text-anti" />
              </div>
              <span className="text-[14px] text-primary">
                {intl.formatMessage(messages.platformTelegram)}
              </span>
            </div>
          );
        },
      },
      {
        colKey: 'account',
        title: intl.formatMessage(messages.account),
        width: 144,
        ellipsis: true,
      },
      {
        colKey: 'user',
        title: intl.formatMessage(messages.conversation),
        width: 120,
        cell: ({ row }) => {
          const r = row as NotificationRecord;
          return (
            <div className="flex items-center gap-[8px]">
              <div className="flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-full bg-component text-[11px] font-medium text-placeholder">
                {r.user[0]}
              </div>
              <span className="truncate text-[14px] text-primary">
                {r.user}
              </span>
            </div>
          );
        },
      },
      {
        colKey: 'triggerContent',
        title: intl.formatMessage(messages.triggerContent),
        width: 200,
        ellipsis: true,
      },
      {
        colKey: 'rule',
        title: intl.formatMessage(messages.rule),
        width: 160,
        ellipsis: true,
      },
      {
        colKey: 'status',
        title: intl.formatMessage(messages.status),
        width: 84,
        cell: ({ row }) => {
          const r = row as NotificationRecord;
          const isRead = r.status === 'read';
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
        colKey: 'op',
        title: intl.formatMessage(messages.actions),
        width: 84,
        fixed: 'right',
        cell: () => (
          <button
            type="button"
            onClick={this.handleViewConversation}
            className="cursor-pointer border-none bg-transparent p-0 text-[14px] text-brand hover:text-brand-hover hover:underline"
          >
            {intl.formatMessage(messages.viewConversation)}
          </button>
        ),
      },
    ];
  };

  render(): ReactElement {
    const { selectedRowIds, currentPage, pageSize } = this.state;
    const { intl } = this.props;
    const someSelected = selectedRowIds.length > 0;

    return (
      <div
        className="mx-auto w-full px-[24px] pt-[24px]"
        style={{ maxWidth: '1440px' }}
      >
        <div className="mt-[16px] flex h-[44px] items-center gap-[12px]">
          <button
            type="button"
            onClick={this.handleMarkAllRead}
            className="flex h-[32px] cursor-pointer items-center justify-center rounded-[6px] border-none bg-brand px-[16px] text-[14px] font-medium text-text-anti"
          >
            {intl.formatMessage(messages.btnMarkAllRead)}
          </button>

          <button
            type="button"
            onClick={this.handleExportSelected}
            className="flex h-[32px] cursor-pointer items-center justify-center rounded-[6px] border border-solid border-line bg-container px-[16px] text-[14px] font-medium text-secondary"
          >
            {intl.formatMessage(messages.btnExportSelected)}
          </button>

          <button
            type="button"
            onClick={this.handleExportAll}
            className="flex h-[32px] cursor-pointer items-center justify-center rounded-[6px] border border-solid border-line bg-container px-[16px] text-[14px] font-medium text-secondary"
          >
            {intl.formatMessage(messages.btnExportAll)}
          </button>

          {someSelected && (
            <span className="text-[14px] font-normal text-placeholder">
              {intl.formatMessage(messages.selectedItems, {
                count: selectedRowIds.length,
              })}
            </span>
          )}
        </div>

        <div className="mt-[16px] rounded-[8px] border border-solid border-line">
          <Table
            data={MOCK_DATA}
            columns={this.getColumns()}
            rowKey="id"
            selectedRowKeys={selectedRowIds}
            onSelectChange={this.handleSelectChange}
            tableLayout="fixed"
            resizable
            lazyLoad
            hover
            stripe={false}
            bordered
            size="medium"
            className="[&_.t-table__header]:!bg-secondary-container [&_.t-table__header-th]:!border-b [&_.t-table__header-th]:!border-solid [&_.t-table__header-th]:!border-line [&_.t-table__header-th]:!text-[13px] [&_.t-table__header-th]:!font-medium [&_.t-table__header-th]:!text-placeholder [&_.t-table__body-td]:!h-[52px]"
          />

          <div className="flex h-[52px] items-center justify-between border-t border-solid border-line bg-container px-[24px]">
            <Pagination
              total={101}
              pageSize={pageSize}
              current={currentPage}
              onChange={this.handlePageChange}
              showJumper
              size="small"
            />
          </div>
        </div>
      </div>
    );
  }
}

export default injectIntl(NotificationsTab);
