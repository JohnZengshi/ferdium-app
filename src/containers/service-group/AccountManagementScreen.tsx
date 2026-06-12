import { inject, observer } from 'mobx-react';
/* eslint-disable react/no-unstable-nested-components */
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { RefreshIcon } from 'tdesign-icons-react';
import {
  Button,
  type PrimaryTableCol,
  type PrimaryTableRef,
  Select,
  Table,
  Tag,
} from 'tdesign-react';
import type {
  AppApiSchemasDigitalHumanResponse,
  WhatsAppBindingResponse,
} from '../../agent-flow-cs/api/generated/agentFlowCs.schemas';
import { getWhatsappBindingApiV1WhatsappBindGet } from '../../agent-flow-cs/api/generated/whatsapp/whatsapp';
import AvatarCell from '../../components/ui/AvatarCell';
import FilterToolbar from '../../components/ui/FilterToolbar';
import {
  type MappedAccountStatus,
  type WhatsAppSessionStatus,
  getMappedStatus,
} from '../../features/whatsappAutomation/helpers';
import type Service from '../../models/Service';
import { getSessions } from '../../whatsapp-automation/api/generated/sessions/sessions';
import type { Session } from '../../whatsapp-automation/api/generated/wAAKGAPIDocumentation.schemas';

const messages = defineMessages({
  colId: { id: 'accountMgmt.col.id', defaultMessage: '#' },
  colAccountInfo: {
    id: 'accountMgmt.col.accountInfo',
    defaultMessage: 'Account Info',
  },
  colStatus: { id: 'accountMgmt.col.status', defaultMessage: 'Status' },
  colPersona: { id: 'accountMgmt.col.persona', defaultMessage: 'Persona' },
  colProxy: { id: 'accountMgmt.col.proxy', defaultMessage: 'Proxy IP' },
  colCreatedAt: {
    id: 'accountMgmt.col.createdAt',
    defaultMessage: 'Created At',
  },
  statusOnline: { id: 'accountMgmt.status.online', defaultMessage: 'Online' },
  statusOffline: {
    id: 'accountMgmt.status.offline',
    defaultMessage: 'Offline',
  },
  statusError: {
    id: 'accountMgmt.status.error',
    defaultMessage: 'Error',
  },
  statusUnknown: {
    id: 'accountMgmt.status.unknown',
    defaultMessage: 'Unknown',
  },
  personaUnbound: {
    id: 'accountMgmt.persona.unbound',
    defaultMessage: 'Unbound',
  },
  proxyLocal: {
    id: 'accountMgmt.proxy.local',
    defaultMessage: 'Local Direct',
  },
  filterStatus: { id: 'accountMgmt.filterStatus', defaultMessage: 'Status' },
  filterPlaceholder: {
    id: 'accountMgmt.filterPlaceholder',
    defaultMessage: 'Select content status',
  },
  search: { id: 'accountMgmt.search', defaultMessage: 'Search' },
  reset: { id: 'accountMgmt.reset', defaultMessage: 'Reset' },
  filterOptionAll: {
    id: 'accountMgmt.filter.all',
    defaultMessage: 'All',
  },
  filterOptionOnline: {
    id: 'accountMgmt.filter.online',
    defaultMessage: 'Online',
  },
  filterOptionOffline: {
    id: 'accountMgmt.filter.offline',
    defaultMessage: 'Offline',
  },
  filterOptionError: {
    id: 'accountMgmt.filter.error',
    defaultMessage: 'Error',
  },
});

interface Account {
  id: string;
  username: string;
  phone: string;
  status: MappedAccountStatus;
  persona: string;
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

  const [sessionCreatedAtMap, setSessionCreatedAtMap] = useState<
    Map<string, string>
  >(new Map());
  const [personaNameMap, setPersonaNameMap] = useState<Map<string, string>>(
    new Map(),
  );
  const [filterStatus, setFilterStatus] = useState<string | undefined>();

  const allServices: Service[] = stores?.services?.all ?? [];
  const waStatuses: Map<string, WhatsAppSessionStatus> =
    stores?.whatsappAutomation?.sessionStatuses ?? new Map();
  const digitalHumans: AppApiSchemasDigitalHumanResponse[] =
    stores?.digitalHumans?.digitalHumans ?? [];

  // Fetch session creation times from WA API
  const fetchSessionTimes = useCallback(async () => {
    try {
      const response = await getSessions();
      if (response.status === 200) {
        const sessions: Session[] = response.data;
        const map = new Map<string, string>();
        for (const session of sessions) {
          if (session.sessionId && session.createdAt) {
            map.set(session.sessionId, session.createdAt);
          }
        }
        setSessionCreatedAtMap(map);
      }
    } catch {
      // Silently ignore errors
    }
  }, []);

  // Fetch persona bindings from agent-flow-cs API
  const fetchPersonaBindings = useCallback(async () => {
    try {
      const response = await getWhatsappBindingApiV1WhatsappBindGet();
      if (response.status === 200) {
        const binding = response.data as WhatsAppBindingResponse | null;
        if (binding?.session_id && binding.digital_human_id) {
          const dh = digitalHumans.find(d => d.id === binding.digital_human_id);
          if (dh) {
            setPersonaNameMap(prev => {
              const next = new Map(prev);
              next.set(binding.session_id, dh.name);
              return next;
            });
          }
        }
      }
    } catch {
      // Silently ignore errors
    }
  }, [digitalHumans]);

  useEffect(() => {
    fetchSessionTimes();
  }, [fetchSessionTimes]);

  useEffect(() => {
    if (digitalHumans.length > 0) {
      fetchPersonaBindings();
    }
  }, [fetchPersonaBindings, digitalHumans.length]);

  const data: Account[] = useMemo(
    () =>
      allServices.map(service => {
        const waStatus = waStatuses.get(service.id);
        const status = getMappedStatus(waStatus);

        const proxyValue = formatProxy(service.proxy);
        const createdAt = sessionCreatedAtMap.get(service.id) ?? '';

        return {
          id: service.id,
          username: service.name,
          phone: '',
          status,
          persona: personaNameMap.get(service.id) ?? '',
          proxy: proxyValue,
          createdAt,
        };
      }),
    [allServices, waStatuses, sessionCreatedAtMap, personaNameMap],
  );

  // Filter data by status
  const filteredData = useMemo(() => {
    if (!filterStatus) {
      return data;
    }

    return data.filter(account => account.status === filterStatus);
  }, [data, filterStatus]);

  const columns: PrimaryTableCol<Account>[] = useMemo(
    () => [
      {
        colKey: 'id',
        title: intl.formatMessage(messages.colId),
        width: 60,
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
        width: 240,
        fixed: 'left',
        cell: ({ row }) => (
          <AvatarCell title={row.username} subtitle={row.phone} />
        ),
      },
      {
        colKey: 'status',
        title: intl.formatMessage(messages.colStatus),
        width: 100,
        cell: ({ row }) => {
          switch (row.status) {
            case 'online': {
              const theme = 'success';
              const statusTextKey = 'statusOnline';
              return (
                <Tag
                  variant="outline"
                  theme={theme}
                  className="!rounded-[6px] !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
                >
                  {intl.formatMessage(messages[statusTextKey])}
                </Tag>
              );
            }
            case 'offline': {
              const theme = 'warning';
              const statusTextKey = 'statusOffline';
              return (
                <Tag
                  variant="outline"
                  theme={theme}
                  className="!rounded-[6px] !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
                >
                  {intl.formatMessage(messages[statusTextKey])}
                </Tag>
              );
            }
            case 'error': {
              const theme = 'danger';
              const statusTextKey = 'statusError';
              return (
                <Tag
                  variant="outline"
                  theme={theme}
                  className="!rounded-[6px] !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
                >
                  {intl.formatMessage(messages[statusTextKey])}
                </Tag>
              );
            }
            default: {
              return (
                <Tag
                  variant="outline"
                  theme="default"
                  className="!rounded-[6px] !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
                >
                  {intl.formatMessage(messages.statusUnknown)}
                </Tag>
              );
            }
          }
        },
      },
      {
        colKey: 'persona',
        title: intl.formatMessage(messages.colPersona),
        width: 160,
        cell: ({ row }) => {
          const hasPersona = row.persona !== '';

          if (hasPersona) {
            return (
              <Tag
                variant="outline"
                theme="warning"
                className="cursor-pointer !rounded-[6px] !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
              >
                {row.persona}
              </Tag>
            );
          }

          return (
            <span className="text-[14px] leading-[22px] text-placeholder">
              {intl.formatMessage(messages.personaUnbound)}
            </span>
          );
        },
      },
      {
        colKey: 'proxy',
        title: intl.formatMessage(messages.colProxy),
        width: 180,
        cell: ({ row }) => (
          <span className="text-[14px] leading-[22px] text-primary">
            {row.proxy || intl.formatMessage(messages.proxyLocal)}
          </span>
        ),
      },
      {
        colKey: 'createdAt',
        title: intl.formatMessage(messages.colCreatedAt),
        width: 180,
        cell: ({ row }) => (
          <span className="text-[14px] leading-[22px] text-primary">
            {row.createdAt
              ? new Date(row.createdAt).toLocaleString('zh-CN')
              : '—'}
          </span>
        ),
      },
    ],
    [intl],
  );

  const handleReset = useCallback(() => {
    setFilterStatus(undefined);
  }, []);

  const statusFilterOptions = useMemo(
    () => [
      { label: intl.formatMessage(messages.filterOptionAll), value: '' },
      {
        label: intl.formatMessage(messages.filterOptionOnline),
        value: 'online',
      },
      {
        label: intl.formatMessage(messages.filterOptionOffline),
        value: 'offline',
      },
      { label: intl.formatMessage(messages.filterOptionError), value: 'error' },
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
                value={filterStatus ?? ''}
                onChange={val => {
                  const value = val as string;
                  setFilterStatus(value || undefined);
                }}
                options={statusFilterOptions}
              />
              <Button theme="primary">
                {intl.formatMessage(messages.search)}
              </Button>
              <Button
                theme="default"
                variant="outline"
                icon={<RefreshIcon />}
                onClick={handleReset}
              >
                {intl.formatMessage(messages.reset)}
              </Button>
            </>
          }
          rightContent={null}
        />

        <Table
          ref={tableRef}
          data={filteredData}
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
            current: 1,
            pageSize: 20,
            total: filteredData.length,
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
