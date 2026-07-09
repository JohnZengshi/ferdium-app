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
import { EditIcon } from 'tdesign-icons-react';
import {
  Button,
  MessagePlugin,
  type PrimaryTableCol,
  Table,
} from 'tdesign-react';
import type { Actions } from '../../actions/lib/actions';
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
  colProxy: {
    id: 'telegramAccountMgmt.col.proxy',
    defaultMessage: 'Proxy',
  },
  colAction: {
    id: 'telegramAccountMgmt.col.action',
    defaultMessage: 'Action',
  },
  edit: { id: 'telegramAccountMgmt.edit', defaultMessage: 'Edit' },
  proxyLocal: {
    id: 'telegramAccountMgmt.proxyLocal',
    defaultMessage: 'Local',
  },
  updateSuccess: {
    id: 'telegramAccountMgmt.updateSuccess',
    defaultMessage: 'Update successful',
  },
  updateFailed: {
    id: 'telegramAccountMgmt.updateFailed',
    defaultMessage: 'Update failed',
  },
});

interface TelegramServiceRow {
  id: string;
  name: string;
  serviceId: string;
  proxy: string;
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
  const drawerKeyRef = useRef(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const telegramServices: Service[] = stores?.services?.telegramServices ?? [];

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

  const handleDrawerConfirm = useCallback(
    async (data: { name: string; proxy: ServiceProxy }) => {
      if (!editingServiceId) return;
      try {
        await actions?.service?.updateService?.({
          serviceId: editingServiceId,
          serviceData: { name: data.name, proxy: data.proxy },
          redirect: false,
        });
        setDrawerVisible(false);
        setEditingServiceId(null);
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

  const data: TelegramServiceRow[] = useMemo(
    () =>
      telegramServices.map(s => ({
        id: s.id,
        name: s.name,
        serviceId: s.id,
        proxy: formatProxy(s.proxy),
      })),
    [telegramServices],
  );

  const editingService = useMemo(
    () => telegramServices.find(s => s.id === editingServiceId) ?? null,
    [editingServiceId, telegramServices],
  );

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
        width: 300,
        fixed: 'left',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-[14px] leading-[22px] text-primary">
              {row.name}
            </span>
            <span className="text-[12px] leading-[18px] text-placeholder">
              {row.serviceId}
            </span>
          </div>
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
    [handleEdit, intl],
  );

  return (
    <div className="telegram-account-management-screen flex flex-1 flex-col bg-page p-[24px]">
      <div className="flex h-full w-full flex-col bg-container p-[32px] rounded-[6px]">
        <Table
          data={data}
          columns={columns}
          rowKey="id"
          tableLayout="fixed"
          size="medium"
          hover
          stripe
          bordered
          pagination={{
            pageSize: 20,
            total: data.length,
            showJumper: true,
            showPageSize: false,
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
        defaultName="Telegram"
      />
    </div>
  );
}

export default inject(
  'stores',
  'actions',
)(observer(TelegramAccountManagementScreen));
