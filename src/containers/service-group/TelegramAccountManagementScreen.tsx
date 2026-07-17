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
import { DeleteIcon, EditIcon } from 'tdesign-icons-react';
import {
  Button,
  DialogPlugin,
  MessagePlugin,
  type PrimaryTableCol,
  Switch,
  Table,
  Tag,
} from 'tdesign-react';
import type { Actions } from '../../actions/lib/actions';
import type {
  AppApiSchemasDigitalHumanResponse,
  TelegramBindingResponse,
} from '../../agent-flow-cs/api/generated/agentFlowCs.schemas';
import { listDigitalHumansApiV1DigitalHumansGet } from '../../agent-flow-cs/api/generated/digital-humans/digital-humans';
import {
  getTelegramBindingApiV1TelegramBindGet,
  pauseTelegramSessionApiV1TelegramSessionsInstanceIdPausePost,
  resumeTelegramSessionApiV1TelegramSessionsInstanceIdResumePost,
} from '../../agent-flow-cs/api/generated/telegram/telegram';
import AvatarCell from '../../components/ui/AvatarCell';
import EditServiceDrawer from '../../components/ui/EditServiceDrawer';
import type { ServiceProxy } from '../../components/ui/EditServiceDrawer';
import { formatProxy } from '../../helpers/formatProxy';
import type Service from '../../models/Service';
import type { RealStores } from '../../stores';

const messages = defineMessages({
  colId: { id: 'telegramAccountMgmt.col.id', defaultMessage: '#' },
  colAccountInfo: {
    id: 'telegramAccountMgmt.col.accountInfo',
    defaultMessage: 'Account Info',
  },
  colStatus: { id: 'telegramAccountMgmt.col.status', defaultMessage: 'Status' },
  colPersona: {
    id: 'telegramAccountMgmt.col.persona',
    defaultMessage: 'Account Persona',
  },
  colAutoChat: {
    id: 'telegramAccountMgmt.col.autoChat',
    defaultMessage: 'Auto Chat',
  },
  colEnabled: {
    id: 'telegramAccountMgmt.col.enabled',
    defaultMessage: 'Enabled',
  },
  colProxy: { id: 'telegramAccountMgmt.col.proxy', defaultMessage: 'Proxy IP' },
  personaUnbound: {
    id: 'telegramAccountMgmt.persona.unbound',
    defaultMessage: 'Unbound',
  },
  personaLoadFailed: {
    id: 'telegramAccountMgmt.persona.loadFailed',
    defaultMessage: 'Failed to load',
  },
  autoChatToggleSuccess: {
    id: 'telegramAccountMgmt.autoChat.toggleSuccess',
    defaultMessage: 'Auto chat updated',
  },
  autoChatToggleFailed: {
    id: 'telegramAccountMgmt.autoChat.toggleFailed',
    defaultMessage: 'Failed to toggle auto chat',
  },
  colAction: {
    id: 'telegramAccountMgmt.col.action',
    defaultMessage: 'Actions',
  },
  edit: { id: 'telegramAccountMgmt.edit', defaultMessage: 'Edit' },
  delete: { id: 'telegramAccountMgmt.delete', defaultMessage: 'Delete' },
  statusAvailable: {
    id: 'telegramAccountMgmt.status.available',
    defaultMessage: 'Available',
  },
  statusError: {
    id: 'telegramAccountMgmt.status.error',
    defaultMessage: 'Error',
  },
  proxyLocal: {
    id: 'telegramAccountMgmt.proxyLocal',
    defaultMessage: 'Local Direct',
  },
  updateSuccess: {
    id: 'telegramAccountMgmt.updateSuccess',
    defaultMessage: 'Update successful',
  },
  updateFailed: {
    id: 'telegramAccountMgmt.updateFailed',
    defaultMessage: 'Update failed',
  },
  deleteConfirmTitle: {
    id: 'telegramAccountMgmt.deleteConfirmTitle',
    defaultMessage: 'Delete account?',
  },
  deleteConfirmContent: {
    id: 'telegramAccountMgmt.deleteConfirmContent',
    defaultMessage:
      'This account and its local service settings will be removed.',
  },
  deleteSuccess: {
    id: 'telegramAccountMgmt.deleteSuccess',
    defaultMessage: 'Deleted successfully',
  },
  deleteFailed: {
    id: 'telegramAccountMgmt.deleteFailed',
    defaultMessage: 'Delete failed',
  },
  cancel: { id: 'telegramAccountMgmt.cancel', defaultMessage: 'Cancel' },
  confirm: { id: 'telegramAccountMgmt.confirm', defaultMessage: 'Confirm' },
});

interface TelegramServiceRow {
  id: string;
  name: string;
  proxy: string;
  isEnabled: boolean;
  hasError: boolean;
  persona: string;
  personaLoadFailed: boolean;
  autoChatActive: boolean;
}

interface IProps {
  stores?: RealStores;
  actions?: Actions;
}

function TelegramAccountManagementScreen({
  stores,
  actions,
}: IProps): ReactElement {
  const intl = useIntl();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [personaNameMap, setPersonaNameMap] = useState<Map<string, string>>(
    new Map(),
  );
  const [bindingMap, setBindingMap] = useState<
    Map<string, TelegramBindingResponse>
  >(new Map());
  const [bindingFailedIds, setBindingFailedIds] = useState<Set<string>>(
    new Set(),
  );
  const [autoChatLoadingIds, setAutoChatLoadingIds] = useState<Set<string>>(
    new Set(),
  );

  const telegramServices: Service[] =
    stores?.services?.all?.filter(
      service => service.recipe?.id === 'telegram',
    ) ?? [];
  const isLoading = stores?.services?.allServicesRequest?.isExecuting ?? false;
  const serviceIdsKey = telegramServices
    .map(service => service.id)
    .join('\u0000');

  const fetchBindings = useCallback(async () => {
    const serviceIds = serviceIdsKey ? serviceIdsKey.split('\u0000') : [];
    if (serviceIds.length === 0) {
      setPersonaNameMap(new Map());
      setBindingMap(new Map());
      setBindingFailedIds(new Set());
      return;
    }

    let digitalHumans: AppApiSchemasDigitalHumanResponse[];
    try {
      const response = await listDigitalHumansApiV1DigitalHumansGet();
      if (response.status !== 200) throw new Error('Failed to load personas');
      digitalHumans = response.data;
    } catch {
      setPersonaNameMap(new Map());
      setBindingMap(new Map());
      setBindingFailedIds(new Set(serviceIds));
      return;
    }

    const results = await Promise.all(
      serviceIds.map(async serviceId => {
        try {
          const response = await getTelegramBindingApiV1TelegramBindGet({
            instance_id: serviceId,
          });
          if (response.status === 200) {
            return { serviceId, binding: response.data, failed: false };
          }
        } catch {
          // Represent this row as failed without replacing it with mock data.
        }
        return { serviceId, binding: null, failed: true };
      }),
    );

    const nextPersonaNames = new Map<string, string>();
    const nextBindings = new Map<string, TelegramBindingResponse>();
    const nextFailedIds = new Set<string>();
    for (const result of results) {
      if (result.failed) {
        nextFailedIds.add(result.serviceId);
      } else if (result.binding) {
        nextBindings.set(result.serviceId, result.binding);
        const persona = digitalHumans.find(
          item => item.id === result.binding?.digital_human_id,
        );
        if (persona) nextPersonaNames.set(result.serviceId, persona.name);
      }
    }
    setPersonaNameMap(nextPersonaNames);
    setBindingMap(nextBindings);
    setBindingFailedIds(nextFailedIds);
  }, [serviceIdsKey]);

  useEffect(() => {
    fetchBindings();
  }, [fetchBindings]);

  const handleEdit = useCallback((serviceId: string) => {
    setEditingServiceId(serviceId);
    setDrawerVisible(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerVisible(false);
    setEditingServiceId(null);
  }, []);

  const updateService = useCallback(
    async (serviceId: string, serviceData: object) => {
      setUpdatingIds(previous => new Set(previous).add(serviceId));
      try {
        await actions?.service?.updateService?.({
          serviceId,
          serviceData,
          redirect: false,
        });
        MessagePlugin.success({
          content: intl.formatMessage(messages.updateSuccess),
          duration: 3000,
        });
      } catch (error) {
        console.error('Failed to update Telegram service:', error);
        MessagePlugin.error({
          content: intl.formatMessage(messages.updateFailed),
          duration: 3000,
        });
        throw error;
      } finally {
        setUpdatingIds(previous => {
          const next = new Set(previous);
          next.delete(serviceId);
          return next;
        });
      }
    },
    [actions, intl],
  );

  const handleDrawerConfirm = useCallback(
    async (data: { name: string; proxy: ServiceProxy }) => {
      if (!editingServiceId) return;
      try {
        await updateService(editingServiceId, {
          name: data.name,
          proxy: data.proxy,
        });
        handleDrawerClose();
      } catch {
        // Feedback is handled by updateService.
      }
    },
    [editingServiceId, handleDrawerClose, updateService],
  );

  const handleDelete = useCallback(
    (serviceId: string) => {
      const dialog = DialogPlugin.confirm({
        placement: 'center',
        header: intl.formatMessage(messages.deleteConfirmTitle),
        body: intl.formatMessage(messages.deleteConfirmContent),
        cancelBtn: intl.formatMessage(messages.cancel),
        confirmBtn: intl.formatMessage(messages.confirm),
        onConfirm: async () => {
          try {
            await actions?.service?.deleteService?.({ serviceId });
            MessagePlugin.success(intl.formatMessage(messages.deleteSuccess));
            dialog.hide();
          } catch (error) {
            console.error('Failed to delete Telegram service:', error);
            MessagePlugin.error(intl.formatMessage(messages.deleteFailed));
          }
        },
        onClose: () => dialog.hide(),
      });
    },
    [actions, intl],
  );

  const handleAutoChatToggle = useCallback(
    async (serviceId: string, enabled: boolean) => {
      if (autoChatLoadingIds.has(serviceId)) return;
      setAutoChatLoadingIds(previous => new Set(previous).add(serviceId));
      try {
        const response = await (enabled
          ? resumeTelegramSessionApiV1TelegramSessionsInstanceIdResumePost(
              serviceId,
            )
          : pauseTelegramSessionApiV1TelegramSessionsInstanceIdPausePost(
              serviceId,
            ));
        if (response.status !== 200) throw new Error('Toggle failed');

        const bindingResponse = await getTelegramBindingApiV1TelegramBindGet({
          instance_id: serviceId,
        });
        if (bindingResponse.status !== 200 || !bindingResponse.data)
          throw new Error('Refresh failed');
        const refreshedBinding = bindingResponse.data;
        setBindingMap(previous => {
          const next = new Map(previous);
          next.set(serviceId, refreshedBinding);
          return next;
        });
        MessagePlugin.success(
          intl.formatMessage(messages.autoChatToggleSuccess),
        );
      } catch (error) {
        console.error('Failed to toggle Telegram auto chat:', error);
        MessagePlugin.error(intl.formatMessage(messages.autoChatToggleFailed));
      } finally {
        setAutoChatLoadingIds(previous => {
          const next = new Set(previous);
          next.delete(serviceId);
          return next;
        });
      }
    },
    [autoChatLoadingIds, intl],
  );

  const data: TelegramServiceRow[] = telegramServices.map(service => ({
    id: service.id,
    name: service.name,
    proxy: formatProxy(service.proxy),
    isEnabled: service.isEnabled,
    hasError: service.hasCrashed || service.isError,
    persona: personaNameMap.get(service.id) ?? '',
    personaLoadFailed: bindingFailedIds.has(service.id),
    autoChatActive:
      bindingMap.get(service.id)?.is_active === true ||
      bindingMap.get(service.id)?.status === 'active',
  }));

  const editingService =
    telegramServices.find(s => s.id === editingServiceId) ?? null;

  const columns: PrimaryTableCol<TelegramServiceRow>[] = useMemo(
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
        colKey: 'name',
        title: intl.formatMessage(messages.colAccountInfo),
        width: 260,
        fixed: 'left',
        cell: ({ row }) => <AvatarCell title={row.name} />,
      },
      {
        colKey: 'status',
        title: intl.formatMessage(messages.colStatus),
        width: 110,
        cell: ({ row }) => (
          <Tag variant="outline" theme={row.hasError ? 'danger' : 'success'}>
            {intl.formatMessage(
              row.hasError ? messages.statusError : messages.statusAvailable,
            )}
          </Tag>
        ),
      },
      {
        colKey: 'persona',
        title: intl.formatMessage(messages.colPersona),
        width: 160,
        cell: ({ row }) =>
          row.persona ? (
            <Tag variant="outline" theme="warning">
              {row.persona}
            </Tag>
          ) : (
            <span className="text-[14px] leading-[22px] text-placeholder">
              {intl.formatMessage(
                row.personaLoadFailed
                  ? messages.personaLoadFailed
                  : messages.personaUnbound,
              )}
            </span>
          ),
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
        colKey: 'autoChat',
        title: intl.formatMessage(messages.colAutoChat),
        width: 120,
        align: 'center',
        cell: ({ row }) => (
          <Switch
            value={row.autoChatActive}
            loading={autoChatLoadingIds.has(row.id)}
            disabled={!bindingMap.has(row.id)}
            size="small"
            onChange={value => handleAutoChatToggle(row.id, value as boolean)}
          />
        ),
      },
      {
        colKey: 'enabled',
        title: intl.formatMessage(messages.colEnabled),
        width: 100,
        align: 'center',
        cell: ({ row }) => (
          <Switch
            value={row.isEnabled}
            loading={updatingIds.has(row.id)}
            size="small"
            onChange={value =>
              updateService(row.id, { isEnabled: value as boolean }).catch(
                () => {},
              )
            }
          />
        ),
      },
      {
        colKey: 'action',
        title: intl.formatMessage(messages.colAction),
        width: 190,
        fixed: 'right',
        align: 'center',
        cell: ({ row }) => (
          <div className="flex justify-center gap-[8px]">
            <Button
              theme="default"
              variant="outline"
              size="small"
              icon={<EditIcon />}
              onClick={() => handleEdit(row.id)}
            >
              {intl.formatMessage(messages.edit)}
            </Button>
            <Button
              theme="danger"
              variant="outline"
              size="small"
              icon={<DeleteIcon />}
              onClick={() => handleDelete(row.id)}
            >
              {intl.formatMessage(messages.delete)}
            </Button>
          </div>
        ),
      },
    ],
    [
      autoChatLoadingIds,
      bindingMap,
      handleAutoChatToggle,
      handleDelete,
      handleEdit,
      intl,
      updateService,
      updatingIds,
    ],
  );

  return (
    <div className="telegram-account-management-screen flex flex-1 flex-col bg-page p-[24px]">
      <div className="flex h-full w-full flex-col bg-container p-[32px] rounded-[6px]">
        <Table
          data={data}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          bordered
          stripe={false}
          hover
          tableLayout="auto"
          lazyLoad
          pagination={{
            current: 1,
            pageSize: 20,
            total: data.length,
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
                  proxy: editingService.proxy as ServiceProxy | null,
                  cookie: '',
                }
              : null
          }
          onClose={handleDrawerClose}
          onConfirm={handleDrawerConfirm}
          defaultName="Telegram"
        />
      </div>
    </div>
  );
}

export default inject(
  'stores',
  'actions',
)(observer(TelegramAccountManagementScreen));
