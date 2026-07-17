import { inject, observer } from 'mobx-react';
/* eslint-disable react/no-unstable-nested-components */
import {
  type ReactElement,
  useCallback,
  useMemo,
  useRef,
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
import EditServiceDrawer from '../../components/ui/EditServiceDrawer';
import type { ServiceProxy } from '../../components/ui/EditServiceDrawer';
import { formatProxy } from '../../helpers/formatProxy';
import type Service from '../../models/Service';
import type { RealStores } from '../../stores';

const messages = defineMessages({
  colId: { id: 'instagramDMAccountMgmt.col.id', defaultMessage: '#' },
  colAccountInfo: {
    id: 'instagramDMAccountMgmt.col.accountInfo',
    defaultMessage: 'Account Info',
  },
  colStatus: {
    id: 'instagramDMAccountMgmt.col.status',
    defaultMessage: 'Status',
  },
  colEnabled: {
    id: 'instagramDMAccountMgmt.col.enabled',
    defaultMessage: 'Enabled',
  },
  colProxy: {
    id: 'instagramDMAccountMgmt.col.proxy',
    defaultMessage: 'Proxy IP',
  },
  colAction: {
    id: 'instagramDMAccountMgmt.col.action',
    defaultMessage: 'Actions',
  },
  edit: { id: 'instagramDMAccountMgmt.edit', defaultMessage: 'Edit' },
  delete: { id: 'instagramDMAccountMgmt.delete', defaultMessage: 'Delete' },
  statusAvailable: {
    id: 'instagramDMAccountMgmt.status.available',
    defaultMessage: 'Available',
  },
  statusError: {
    id: 'instagramDMAccountMgmt.status.error',
    defaultMessage: 'Error',
  },
  proxyLocal: {
    id: 'instagramDMAccountMgmt.proxyLocal',
    defaultMessage: 'Local',
  },
  updateSuccess: {
    id: 'instagramDMAccountMgmt.updateSuccess',
    defaultMessage: 'Update successful',
  },
  updateFailed: {
    id: 'instagramDMAccountMgmt.updateFailed',
    defaultMessage: 'Update failed',
  },
  deleteConfirmTitle: {
    id: 'instagramDMAccountMgmt.deleteConfirmTitle',
    defaultMessage: 'Delete account?',
  },
  deleteConfirmContent: {
    id: 'instagramDMAccountMgmt.deleteConfirmContent',
    defaultMessage:
      'This account and its local service settings will be removed.',
  },
  deleteSuccess: {
    id: 'instagramDMAccountMgmt.deleteSuccess',
    defaultMessage: 'Deleted successfully',
  },
  deleteFailed: {
    id: 'instagramDMAccountMgmt.deleteFailed',
    defaultMessage: 'Delete failed',
  },
  cancel: { id: 'instagramDMAccountMgmt.cancel', defaultMessage: 'Cancel' },
  confirm: { id: 'instagramDMAccountMgmt.confirm', defaultMessage: 'Confirm' },
});

interface InstagramDMServiceRow {
  id: string;
  name: string;
  proxy: string;
  isEnabled: boolean;
  hasError: boolean;
}

interface IProps {
  stores?: RealStores;
  actions?: Actions;
}

function InstagramDMAccountManagementScreen({
  stores,
  actions,
}: IProps): ReactElement {
  const intl = useIntl();
  const drawerKeyRef = useRef(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const instagramDMServices: Service[] =
    stores?.services?.all?.filter(
      service => service.recipe?.id === 'instagram-direct-messages',
    ) ?? [];
  const isLoading = stores?.services?.allServicesRequest?.isExecuting ?? false;

  const handleEdit = useCallback((serviceId: string) => {
    setEditingServiceId(serviceId);
    drawerKeyRef.current += 1;
    setDrawerVisible(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerVisible(false);
    setEditingServiceId(null);
    drawerKeyRef.current += 1;
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
        console.error('Failed to update Instagram DM service:', error);
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
            console.error('Failed to delete Instagram DM service:', error);
            MessagePlugin.error(intl.formatMessage(messages.deleteFailed));
          }
        },
        onClose: () => dialog.hide(),
      });
    },
    [actions, intl],
  );

  const data: InstagramDMServiceRow[] = instagramDMServices.map(service => ({
    id: service.id,
    name: service.name,
    proxy: formatProxy(service.proxy),
    isEnabled: service.isEnabled,
    hasError: service.hasCrashed || service.isError,
  }));

  const editingService = useMemo(
    () => instagramDMServices.find(s => s.id === editingServiceId) ?? null,
    [editingServiceId, instagramDMServices],
  );

  const columns: PrimaryTableCol<InstagramDMServiceRow>[] = useMemo(
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
        cell: ({ row }) => (
          <span className="text-[14px] leading-[22px] text-primary">
            {row.name}
          </span>
        ),
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
                () => undefined,
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
    [handleDelete, handleEdit, intl, updateService, updatingIds],
  );

  return (
    <div className="instagram-dm-account-management-screen flex flex-1 flex-col bg-page p-[24px]">
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
      </div>
      <EditServiceDrawer
        key={drawerKeyRef.current}
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
        defaultName="Instagram"
      />
    </div>
  );
}

export default inject(
  'stores',
  'actions',
)(observer(InstagramDMAccountManagementScreen));
