/**
 * DigitalHumansScreen — 数字人管理页面
 *
 * 职责：
 * - 列表展示所有数字人（owner 看全部，member 看被分配的）
 * - 创建/编辑数字人
 * - 查看数字人详情
 * - 分配数字人给子账号（仅 owner）
 */

import type { RouterStore } from '@superwf/mobx-react-router';
import { inject, observer } from 'mobx-react';
import type React from 'react';
import { Component } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import { AddIcon } from 'tdesign-icons-react';
import { Badge, Button, MessagePlugin, Space, Table, Tag } from 'tdesign-react';
import type { AppApiSchemasDigitalHumanResponse } from '../../../agent-flow-cs/api/generated/agentFlowCs.schemas';
import DigitalHumanForm from '../../../components/settings/digital-humans/DigitalHumanForm';
import type DigitalHumanStore from '../../../stores/DigitalHumanStore';

interface DigitalHumansScreenProps {
  stores?: {
    digitalHuman: DigitalHumanStore;
    router: RouterStore;
  };
}

interface State {
  dialogVisible: boolean;
  selectedDigitalHuman: AppApiSchemasDigitalHumanResponse | null;
}

type WithIntlProps = DigitalHumansScreenProps & WrappedComponentProps;

const messages = defineMessages({
  pageTitle: {
    id: 'digitalHumansScreen.pageTitle',
    defaultMessage: 'Digital Humans',
  },
  createDigitalHuman: {
    id: 'digitalHumansScreen.createDigitalHuman',
    defaultMessage: 'Create Digital Human',
  },
  nameColumn: { id: 'digitalHumansScreen.nameColumn', defaultMessage: 'Name' },
  accountHandleColumn: {
    id: 'digitalHumansScreen.accountHandleColumn',
    defaultMessage: 'Account Handle',
  },
  platformColumn: {
    id: 'digitalHumansScreen.platformColumn',
    defaultMessage: 'Platform',
  },
  statusColumn: {
    id: 'digitalHumansScreen.statusColumn',
    defaultMessage: 'Status',
  },
  createdAtColumn: {
    id: 'digitalHumansScreen.createdAtColumn',
    defaultMessage: 'Created At',
  },
  actionsColumn: {
    id: 'digitalHumansScreen.actionsColumn',
    defaultMessage: 'Actions',
  },
  disabledStatus: {
    id: 'digitalHumansScreen.disabledStatus',
    defaultMessage: 'Disabled',
  },
  activeStatus: {
    id: 'digitalHumansScreen.activeStatus',
    defaultMessage: 'Active',
  },
  inactiveStatus: {
    id: 'digitalHumansScreen.inactiveStatus',
    defaultMessage: 'Inactive',
  },
  viewButton: { id: 'digitalHumansScreen.viewButton', defaultMessage: 'View' },
  editButton: { id: 'digitalHumansScreen.editButton', defaultMessage: 'Edit' },
  assignedToaster: {
    id: 'digitalHumansScreen.assignedToaster',
    defaultMessage: 'Assigned to {count} sub-accounts',
  },
  fetchAssignmentError: {
    id: 'digitalHumansScreen.fetchAssignmentError',
    defaultMessage: 'Failed to get assignment info',
  },
});

@inject('stores')
@observer
class DigitalHumansScreen extends Component<WithIntlProps, State> {
  constructor(props: WithIntlProps) {
    super(props);
    this.state = {
      dialogVisible: false,
      selectedDigitalHuman: null,
    };
  }

  get digitalHumanStore(): DigitalHumanStore {
    return this.props.stores!.digitalHuman;
  }

  componentDidMount(): void {
    this.digitalHumanStore.fetchDigitalHumans().catch(console.error);
  }

  handleCreate = (): void => {
    this.setState({
      dialogVisible: true,
      selectedDigitalHuman: null,
    });
  };

  handleEdit = (digitalHuman: AppApiSchemasDigitalHumanResponse): void => {
    this.setState({
      dialogVisible: true,
      selectedDigitalHuman: digitalHuman,
    });
  };

  handleView = async (
    digitalHuman: AppApiSchemasDigitalHumanResponse,
  ): Promise<void> => {
    try {
      const assignments = await this.digitalHumanStore.getAssignments(
        digitalHuman.id,
      );
      MessagePlugin.info(
        this.props.intl.formatMessage(messages.assignedToaster, {
          count: assignments.length,
        }),
      );
    } catch {
      MessagePlugin.error(
        this.props.intl.formatMessage(messages.fetchAssignmentError),
      );
    }
  };

  // Disable nested component warnings for TDesign Table cell renderers
  // These are standard TDesign patterns and won't cause re-render issues

  get columns() {
    const { intl } = this.props;
    return [
      {
        colKey: 'name',
        title: intl.formatMessage(messages.nameColumn),
        width: 200,
        // eslint-disable-next-line react/no-unstable-nested-components
        cell: ({ row }: { row: AppApiSchemasDigitalHumanResponse }) => (
          <Space>
            {row.avatar_url && (
              <img
                src={row.avatar_url}
                alt={row.name}
                style={{ width: 32, height: 32, borderRadius: '50%' }}
              />
            )}
            <span>{row.name}</span>
          </Space>
        ),
      },
      {
        colKey: 'account_handle',
        title: intl.formatMessage(messages.accountHandleColumn),
        width: 150,
      },
      {
        colKey: 'platform',
        title: intl.formatMessage(messages.platformColumn),
        width: 120,
        // eslint-disable-next-line react/no-unstable-nested-components
        cell: ({ row }: { row: AppApiSchemasDigitalHumanResponse }) => (
          <Tag variant="light">{row.platform || 'WhatsApp'}</Tag>
        ),
      },
      {
        colKey: 'status',
        title: intl.formatMessage(messages.statusColumn),
        width: 100,
        // eslint-disable-next-line react/no-unstable-nested-components
        cell: ({ row }: { row: AppApiSchemasDigitalHumanResponse }) => {
          if (!row.is_enabled) {
            return (
              <Badge count={intl.formatMessage(messages.disabledStatus)} />
            );
          }
          return row.status === 'active' ? (
            <Badge
              count={intl.formatMessage(messages.activeStatus)}
              color="success"
            />
          ) : (
            <Badge
              count={intl.formatMessage(messages.inactiveStatus)}
              color="default"
            />
          );
        },
      },
      {
        colKey: 'default_provider',
        title: 'LLM Provider',
        width: 120,
      },
      {
        colKey: 'created_at',
        title: intl.formatMessage(messages.createdAtColumn),
        width: 180,

        cell: ({ row }: { row: AppApiSchemasDigitalHumanResponse }) =>
          new Date(row.created_at).toLocaleString('zh-CN'),
      },
      {
        colKey: 'actions',
        title: intl.formatMessage(messages.actionsColumn),
        width: 180,
        // eslint-disable-next-line react/no-unstable-nested-components
        cell: ({ row }: { row: AppApiSchemasDigitalHumanResponse }) => (
          <Space>
            <Button
              size="small"
              variant="text"
              onClick={() => this.handleView(row)}
            >
              {intl.formatMessage(messages.viewButton)}
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => this.handleEdit(row)}
            >
              {intl.formatMessage(messages.editButton)}
            </Button>
          </Space>
        ),
      },
    ];
  }

  handleDialogClose = (): void => {
    this.setState({
      dialogVisible: false,
      selectedDigitalHuman: null,
    });
  };

  render(): React.ReactNode {
    const { dialogVisible, selectedDigitalHuman } = this.state;
    const { digitalHumans, isLoading } = this.digitalHumanStore;
    const { intl } = this.props;

    return (
      <div className="p-5 max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold">
            {intl.formatMessage(messages.pageTitle)}
          </h2>
          <Button icon={<AddIcon />} onClick={this.handleCreate}>
            {intl.formatMessage(messages.createDigitalHuman)}
          </Button>
        </div>

        <Table
          data={digitalHumans}
          columns={this.columns}
          rowKey="id"
          loading={isLoading}
        />

        <DigitalHumanForm
          visible={dialogVisible}
          digitalHuman={selectedDigitalHuman}
          onClose={this.handleDialogClose}
          store={this.digitalHumanStore}
          onSuccess={() =>
            this.digitalHumanStore.fetchDigitalHumans().catch(console.error)
          }
        />
      </div>
    );
  }
}

export default injectIntl(DigitalHumansScreen);
