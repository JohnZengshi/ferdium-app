import { inject, observer } from 'mobx-react';
/* eslint-disable react/no-unstable-nested-components */
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { EditIcon, RefreshIcon } from 'tdesign-icons-react';
import {
  Button,
  MessagePlugin,
  type PrimaryTableCol,
  Select,
  Switch,
  Table,
  Tag,
} from 'tdesign-react';
import type {
  AppApiSchemasDigitalHumanResponse,
  WhatsAppBindingResponse,
} from '../../agent-flow-cs/api/generated/agentFlowCs.schemas';
import { listDigitalHumansApiV1DigitalHumansGet } from '../../agent-flow-cs/api/generated/digital-humans/digital-humans';
import {
  getWhatsappBindingApiV1WhatsappBindGet,
  pauseWhatsappSessionApiV1WhatsappSessionsSessionIdPausePost,
  resumeWhatsappSessionApiV1WhatsappSessionsSessionIdResumePost,
} from '../../agent-flow-cs/api/generated/whatsapp/whatsapp';
import AvatarCell from '../../components/ui/AvatarCell';
import EditServiceDrawer from '../../components/ui/EditServiceDrawer';
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
  colAction: {
    id: 'accountMgmt.col.action',
    defaultMessage: 'Actions',
  },
  edit: {
    id: 'accountMgmt.edit',
    defaultMessage: 'Edit',
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
  updateSuccess: {
    id: 'accountMgmt.updateSuccess',
    defaultMessage: 'Update successful',
  },
  updateFailed: {
    id: 'accountMgmt.updateFailed',
    defaultMessage: 'Update failed',
  },
  colAutoChat: {
    id: 'accountMgmt.col.autoChat',
    defaultMessage: 'Auto Chat',
  },
  autoChatOn: {
    id: 'accountMgmt.autoChat.on',
    defaultMessage: 'On',
  },
  autoChatOff: {
    id: 'accountMgmt.autoChat.off',
    defaultMessage: 'Off',
  },
  autoChatToggleSuccess: {
    id: 'accountMgmt.autoChat.toggleSuccess',
    defaultMessage: 'Auto chat updated',
  },
  autoChatToggleFailed: {
    id: 'accountMgmt.autoChat.toggleFailed',
    defaultMessage: 'Failed to toggle auto chat',
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
  autoChatStatus: string;
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
  actions?: any;
}

function AccountManagementScreen({ stores, actions }: IProps): ReactElement {
  const intl = useIntl();

  const [sessionCreatedAtMap, setSessionCreatedAtMap] = useState<
    Map<string, string>
  >(new Map());
  const [personaNameMap, setPersonaNameMap] = useState<Map<string, string>>(
    new Map(),
  );
  const [autoChatStatusMap, setAutoChatStatusMap] = useState<
    Map<string, string>
  >(new Map());
  const [autoChatLoadingIds, setAutoChatLoadingIds] = useState<Set<string>>(
    new Set(),
  );
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const allServices: Service[] = stores?.services?.all ?? [];
  const waStatuses: Map<string, WhatsAppSessionStatus> =
    stores?.whatsappAutomation?.sessionStatuses ?? new Map();

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

  const fetchAllPersonaBindings = useCallback(async () => {
    let digitalHumanList: AppApiSchemasDigitalHumanResponse[] = [];
    try {
      const listRes = await listDigitalHumansApiV1DigitalHumansGet();
      digitalHumanList = listRes.data;
    } catch {
      return;
    }

    const results = await Promise.all(
      allServices.map(async service => {
        try {
          const response = await getWhatsappBindingApiV1WhatsappBindGet({
            session_id: service.id,
          });
          if (response.status === 200) {
            const binding = response.data as WhatsAppBindingResponse | null;
            const personaName = binding?.digital_human_id
              ? digitalHumanList.find(d => d.id === binding.digital_human_id)
                  ?.name
              : undefined;

            return {
              serviceId: service.id,
              personaName,
              autoChatStatus: binding?.status,
            };
          }
        } catch {
          // Silently ignore errors
        }
        return null;
      }),
    );

    const personaMap = new Map<string, string>();
    const autoChatMap = new Map<string, string>();
    for (const result of results) {
      if (result) {
        if (result.personaName) {
          personaMap.set(result.serviceId, result.personaName);
        }
        if (result.autoChatStatus) {
          autoChatMap.set(result.serviceId, result.autoChatStatus);
        }
      }
    }
    setPersonaNameMap(personaMap);
    setAutoChatStatusMap(autoChatMap);
  }, [allServices]);

  useEffect(() => {
    fetchSessionTimes();
  }, [fetchSessionTimes]);

  useEffect(() => {
    if (allServices.length > 0) {
      fetchAllPersonaBindings();
    }
  }, [fetchAllPersonaBindings, allServices.length]);

  // MobX observer will track observable properties (service.name, service.proxy)
  // refreshVersion is used to force re-computation when needed
  const data: Account[] = allServices.map(service => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshVersion; // Force dependency on refreshVersion to trigger refresh
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
      autoChatStatus: autoChatStatusMap.get(service.id) ?? '',
    };
  });

  // Filter data by status
  const filteredData = useMemo(() => {
    if (!filterStatus) {
      return data;
    }

    return data.filter(account => account.status === filterStatus);
  }, [data, filterStatus]);

  const handleAutoChatToggle = useCallback(
    async (serviceId: string, checked: boolean) => {
      setAutoChatLoadingIds(prev => new Set(prev).add(serviceId));
      try {
        await (checked
          ? resumeWhatsappSessionApiV1WhatsappSessionsSessionIdResumePost(
              serviceId,
            )
          : pauseWhatsappSessionApiV1WhatsappSessionsSessionIdPausePost(
              serviceId,
            ));

        // Refresh binding status from server
        const response = await getWhatsappBindingApiV1WhatsappBindGet({
          session_id: serviceId,
        });
        if (response.status === 200) {
          const binding = response.data as WhatsAppBindingResponse | null;
          setAutoChatStatusMap(prev => {
            const map = new Map(prev);
            if (binding?.status) {
              map.set(serviceId, binding.status);
            } else {
              map.delete(serviceId);
            }
            return map;
          });
        }

        MessagePlugin.success({
          content: intl.formatMessage(messages.autoChatToggleSuccess),
          duration: 3000,
        });
      } catch (error) {
        console.error('Failed to toggle auto chat:', error);
        MessagePlugin.error({
          content: intl.formatMessage(messages.autoChatToggleFailed),
          duration: 3000,
        });
      } finally {
        setAutoChatLoadingIds(prev => {
          const map = new Set(prev);
          map.delete(serviceId);
          return map;
        });
      }
    },
    [intl],
  );

  const handleEdit = useCallback((serviceId: string) => {
    setEditingServiceId(serviceId);
    setDrawerVisible(true);
  }, []);

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
                  className=" !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
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
                  className=" !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
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
                  className=" !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
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
                  className=" !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
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
                className="cursor-pointer  !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
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
      {
        colKey: 'autoChat',
        title: intl.formatMessage(messages.colAutoChat),
        width: 120,
        align: 'center',
        cell: ({ row }) => {
          const isActive = row.autoChatStatus === 'active';
          const loading = autoChatLoadingIds.has(row.id);
          return (
            <Switch
              value={isActive}
              loading={loading}
              size="small"
              onChange={val => {
                handleAutoChatToggle(row.id, val as boolean);
              }}
            />
          );
        },
      },
      {
        colKey: 'action',
        title: intl.formatMessage(messages.colAction),
        width: 100,
        fixed: 'right',
        align: 'center',
        cell: ({ row }) => (
          <Button
            theme="default"
            variant="outline"
            size="small"
            icon={<EditIcon />}
            onClick={() => handleEdit(row.id)}
          >
            {intl.formatMessage(messages.edit)}
          </Button>
        ),
      },
    ],
    [intl, handleEdit, handleAutoChatToggle, autoChatLoadingIds],
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

  const editingService = useMemo(
    () => allServices.find(s => s.id === editingServiceId) ?? null,
    [allServices, editingServiceId],
  );

  const handleEditConfirm = useCallback(
    async (data: { name: string; proxy: any }) => {
      if (!editingServiceId) return;

      try {
        await actions?.service?.updateService?.({
          serviceId: editingServiceId,
          serviceData: {
            name: data.name,
            proxy: data.proxy,
          },
          redirect: false,
        });

        setDrawerVisible(false);
        setEditingServiceId(null);
        setRefreshVersion(v => v + 1); // Trigger data refresh

        MessagePlugin.success({
          content: intl.formatMessage(messages.updateSuccess),
          duration: 3000,
        });
      } catch (error) {
        console.error('Failed to update service:', error);
        MessagePlugin.error({
          content: intl.formatMessage(messages.updateFailed),
          duration: 3000,
        });
      }
    },
    [actions, editingServiceId, intl],
  );

  const handleEditClose = useCallback(() => {
    setDrawerVisible(false);
    setEditingServiceId(null);
  }, []);

  return (
    <div className="account-management-screen flex flex-1 flex-col bg-page p-[24px]">
      <div className="flex h-full w-full flex-col bg-container p-[32px] rounded-[6px]">
        <FilterToolbar
          leftContent={
            <>
              <span className="text-[14px] leading-[22px] text-primary">
                {intl.formatMessage(messages.filterStatus)}
              </span>
              <Select
                key={`status-select-${intl.locale}`}
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
          data={filteredData}
          columns={columns}
          rowKey="id"
          bordered
          stripe={false}
          hover
          tableLayout="auto"
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

        <EditServiceDrawer
          key={editingServiceId ?? 'closed'}
          visible={drawerVisible}
          initialData={
            editingService
              ? {
                  name: editingService.name,
                  proxy: editingService.proxy as ServiceProxyConfig | null,
                  cookie: (editingService as { cookie?: string }).cookie || '',
                }
              : null
          }
          onClose={handleEditClose}
          onConfirm={handleEditConfirm}
        />
      </div>
    </div>
  );
}

export default inject('stores', 'actions')(observer(AccountManagementScreen));
