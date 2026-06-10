import { inject, observer } from 'mobx-react';
/* eslint-disable react/no-unstable-nested-components */
import { type ReactElement, useMemo, useRef, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { Edit1Icon, RefreshIcon } from 'tdesign-icons-react';
import {
  Button,
  type PrimaryTableCol,
  type PrimaryTableRef,
  Select,
  Table,
  Tag,
} from 'tdesign-react';
import AvatarCell from '../../components/ui/AvatarCell';
import FilterToolbar from '../../components/ui/FilterToolbar';
import { WA_SESSION_STATUS } from '../../features/whatsappAutomation/constants';
import type Service from '../../models/Service';

const messages = defineMessages({
  colId: { id: 'accountMgmt.col.id', defaultMessage: '序号' },
  colAccountInfo: {
    id: 'accountMgmt.col.accountInfo',
    defaultMessage: '账号信息',
  },
  colStatus: { id: 'accountMgmt.col.status', defaultMessage: '状态' },
  colPersona: { id: 'accountMgmt.col.persona', defaultMessage: '账号人设' },
  colNote: { id: 'accountMgmt.col.note', defaultMessage: '账号备注' },
  colAutoChat: { id: 'accountMgmt.col.autoChat', defaultMessage: '自动聊天' },
  colProxy: { id: 'accountMgmt.col.proxy', defaultMessage: '代理 IP' },
  colCreatedAt: { id: 'accountMgmt.col.createdAt', defaultMessage: '创建时间' },
  statusOnline: { id: 'accountMgmt.status.online', defaultMessage: '在线' },
  statusOffline: { id: 'accountMgmt.status.offline', defaultMessage: '离线' },
  autoChatOn: { id: 'accountMgmt.autoChat.on', defaultMessage: '开启' },
  autoChatOff: { id: 'accountMgmt.autoChat.off', defaultMessage: '关闭' },
  autoChatHealthy: {
    id: 'accountMgmt.autoChat.healthy',
    defaultMessage: '健康',
  },
  filterStatus: { id: 'accountMgmt.filterStatus', defaultMessage: '状态' },
  filterPlaceholder: {
    id: 'accountMgmt.filterPlaceholder',
    defaultMessage: '请选择内容状态',
  },
  filterPersona: { id: 'accountMgmt.filterPersona', defaultMessage: '人设' },
  search: { id: 'accountMgmt.search', defaultMessage: '搜索' },
  reset: { id: 'accountMgmt.reset', defaultMessage: '重置' },
  selectedItems: {
    id: 'accountMgmt.selectedItems',
    defaultMessage: '已选 2 项',
  },
  moreActions: { id: 'accountMgmt.moreActions', defaultMessage: '更多操作' },
});

interface Account {
  id: string;
  username: string;
  phone: string;
  status: 'online' | 'offline' | 'error' | 'unknown';
  persona: string;
  note: string;
  autoChat: 'on' | 'off' | 'healthy' | 'unknown';
  proxy: string;
  createdAt: string;
}

interface ServiceProxyConfig {
  isEnabled?: boolean;
  host?: string;
  port?: string | number;
}
const formatProxy = (proxy: unknown): string => {
  if (!proxy || typeof proxy !== 'object') {
    return '';
  }

  const config = proxy as ServiceProxyConfig;

  if (!config.isEnabled || !config.host) {
    return '';
  }

  return config.port ? `${config.host}:${config.port}` : config.host;
};

interface IProps {
  stores?: any;
}

function AccountManagementScreen({ stores }: IProps): ReactElement {
  const intl = useIntl();
  const [tableLayout] = useState<'fixed'>('fixed');
  const tableRef = useRef<PrimaryTableRef>(null);

  const allServices: Service[] = stores?.services?.all ?? [];
  const waStatuses: Map<string, string> =
    stores?.whatsappAutomation?.sessionStatuses ?? new Map();

  const data: Account[] = useMemo(
    () =>
      allServices.map(service => {
        const waStatus = waStatuses.get(service.id);
        let status: Account['status'] = 'offline';
        switch (waStatus) {
          case WA_SESSION_STATUS.CONNECTED: {
            status = 'online';

            break;
          }
          case WA_SESSION_STATUS.DISCONNECTED: {
            break;
          }
          case WA_SESSION_STATUS.LOGGED_OUT:
          case WA_SESSION_STATUS.STOPPED:
          case WA_SESSION_STATUS.SERVER_ERROR: {
            status = 'error';

            break;
          }
          default: {
            break;
          }
        }

        return {
          id: service.id,
          username: service.name,
          phone: '', // 暂无
          status,
          persona: service.recipe?.name ?? '',
          note: service.team || '',
          autoChat: service.isEnabled ? 'on' : 'off',
          proxy: formatProxy(service.proxy),
          createdAt: '', // 暂无
        };
      }),
    [allServices, waStatuses],
  );

  const columns: PrimaryTableCol<Account>[] = useMemo(
    () => [
      {
        colKey: 'id',
        title: intl.formatMessage(messages.colId),
        width: 96,
        fixed: 'left',
        align: 'center',
        cell: ({ rowIndex }) => (
          <span className="text-[14px] leading-[22px] text-primary">
            {rowIndex + 1}
          </span>
        ),
      },
      {
        colKey: 'username',
        title: intl.formatMessage(messages.colAccountInfo),
        width: 320,
        fixed: 'left',
        cell: ({ row }) => (
          <AvatarCell title={row.username} subtitle={row.phone} />
        ),
      },
      {
        colKey: 'status',
        title: intl.formatMessage(messages.colStatus),
        width: 128,
        cell: ({ row }) => (
          <Tag
            variant="outline"
            theme={row.status === 'online' ? 'success' : 'danger'}
            className="!rounded-[6px] !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
          >
            {intl.formatMessage(
              row.status === 'online'
                ? messages.statusOnline
                : messages.statusOffline,
            )}
          </Tag>
        ),
      },
      {
        colKey: 'persona',
        title: intl.formatMessage(messages.colPersona),
        width: 200,
        cell: ({ row }) => (
          <Tag
            variant="outline"
            theme="warning"
            className="cursor-pointer !rounded-[6px] !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
          >
            {row.persona}
          </Tag>
        ),
      },
      {
        colKey: 'note',
        title: intl.formatMessage(messages.colNote),
        width: 240,
        cell: ({ row }) => (
          <div className="flex items-center gap-[8px] text-[14px] leading-[22px] text-primary">
            <span>{row.note}</span>
            <Edit1Icon className="cursor-pointer text-secondary" size="14px" />
          </div>
        ),
      },
      {
        colKey: 'autoChat',
        title: intl.formatMessage(messages.colAutoChat),
        width: 160,
        cell: ({ row }) => {
          const isOff = row.autoChat === 'off';
          let statusText: string;
          switch (row.autoChat) {
            case 'on': {
              statusText = intl.formatMessage(messages.autoChatOn);
              break;
            }
            case 'off': {
              statusText = intl.formatMessage(messages.autoChatOff);
              break;
            }
            default: {
              statusText = intl.formatMessage(messages.autoChatHealthy);
              break;
            }
          }
          const textClass = isOff ? 'text-error' : 'text-success';
          const dotClass = isOff ? 'bg-error' : 'bg-success';

          return (
            <div
              className={`flex items-center gap-[8px] text-[14px] leading-[22px] ${textClass}`}
            >
              <span className={`h-[8px] w-[8px] rounded-full ${dotClass}`} />
              <span>{statusText}</span>
            </div>
          );
        },
      },
      {
        colKey: 'proxy',
        title: intl.formatMessage(messages.colProxy),
        width: 280,
        cell: ({ row }) => (
          <div className="flex items-center gap-[8px] text-[14px] leading-[22px] text-primary">
            <span>{row.proxy}</span>
            <Edit1Icon className="cursor-pointer text-secondary" size="14px" />
          </div>
        ),
      },
      {
        colKey: 'createdAt',
        title: intl.formatMessage(messages.colCreatedAt),
        width: 256,
        fixed: 'right',
        cell: ({ row }) => (
          <span className="text-[14px] leading-[22px] text-primary">
            {row.createdAt}
          </span>
        ),
      },
    ],
    [intl],
  );

  return (
    <div className="account-management-screen flex flex-1 flex-col bg-page p-[24px]">
      <div className="flex h-full w-full flex-col bg-container p-[32px]">
        <FilterToolbar
          leftContent={
            <>
              <span className="text-[14px] leading-[22px] text-primary">
                {intl.formatMessage(messages.filterStatus)}
              </span>
              <Select
                className="!w-[160px]"
                placeholder={intl.formatMessage(messages.filterPlaceholder)}
              />
              <span className="text-[14px] leading-[22px] text-primary">
                {intl.formatMessage(messages.filterPersona)}
              </span>
              <Select
                className="!w-[160px]"
                placeholder={intl.formatMessage(messages.filterPlaceholder)}
              />
              <Button theme="primary">
                {intl.formatMessage(messages.search)}
              </Button>
              <Button theme="default" variant="outline" icon={<RefreshIcon />}>
                {intl.formatMessage(messages.reset)}
              </Button>
            </>
          }
          rightContent={
            <>
              <span className="text-[14px] leading-[22px] text-secondary">
                {intl.formatMessage(messages.selectedItems)}
              </span>
              <Button
                theme="primary"
                variant="text"
                className="!rounded-[8px] !bg-brand-light !px-[14px] !text-brand"
              >
                {intl.formatMessage(messages.moreActions)}
              </Button>

              <RefreshIcon className="cursor-pointer text-[20px] text-primary" />
            </>
          }
        />

        <Table
          ref={tableRef}
          data={data}
          columns={columns}
          rowKey="id"
          bordered
          stripe={false}
          hover
          maxHeight="calc(100vh - 360px)"
          tableLayout={tableLayout}
          tableContentWidth={tableLayout === 'fixed' ? undefined : '1200px'}
          resizable
          lazyLoad
          pagination={{
            current: 11,
            pageSize: 20,
            total: 101,
            showJumper: true,
            showPageSize: true,
            pageSizeOptions: [10, 20, 50],
          }}
        />
      </div>
    </div>
  );
}

export default inject('stores')(observer(AccountManagementScreen));
