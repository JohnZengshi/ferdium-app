/**
 * DigitalHumansScreen — 数字人管理页面
 *
 * 职责：
 * - 列表展示所有数字人（owner 看全部，member 看被分配的）
 * - 创建/编辑数字人
 * - 查看数字人详情
 * - 分配数字人给子账号（仅 owner）
 */

import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import type { RouterStore } from '@superwf/mobx-react-router';
import { Space, Table, Button, Tag, Badge, MessagePlugin } from 'tdesign-react';
import { AddIcon } from 'tdesign-icons-react';
import type DigitalHumanStore from '../../../stores/DigitalHumanStore';
import type { DigitalHumanResponse } from '../../../agent-flow-cs/api/generated/agentFlowCs.schemas';
import DigitalHumanForm from '../../../components/settings/digital-humans/DigitalHumanForm';

interface DigitalHumansScreenProps {
  stores?: {
    digitalHuman: DigitalHumanStore;
    router: RouterStore;
  };
}

interface State {
  dialogVisible: boolean;
  selectedDigitalHuman: DigitalHumanResponse | null;
}

@inject('stores')
@observer
export default class DigitalHumansScreen extends Component<
  DigitalHumansScreenProps,
  State
> {
  constructor(props: DigitalHumansScreenProps) {
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

  handleEdit = (digitalHuman: DigitalHumanResponse): void => {
    this.setState({
      dialogVisible: true,
      selectedDigitalHuman: digitalHuman,
    });
  };

  handleView = async (digitalHuman: DigitalHumanResponse): Promise<void> => {
    // 查看数字人分配信息
    try {
      const assignments = await this.digitalHumanStore.getAssignments(
        digitalHuman.id,
      );
      MessagePlugin.info(`已分配给 ${assignments.length} 个子账号`);
    } catch {
      MessagePlugin.error('获取分配信息失败');
    }
  };

  // Disable nested component warnings for TDesign Table cell renderers
  // These are standard TDesign patterns and won't cause re-render issues

  columns = [
    {
      colKey: 'name',
      title: '数字人名称',
      width: 200,
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }: { row: DigitalHumanResponse }) => (
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
      title: '账号句柄',
      width: 150,
    },
    {
      colKey: 'platform',
      title: '平台',
      width: 120,
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }: { row: DigitalHumanResponse }) => (
        <Tag variant="light">{row.platform || 'WhatsApp'}</Tag>
      ),
    },
    {
      colKey: 'status',
      title: '状态',
      width: 100,
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }: { row: DigitalHumanResponse }) => {
        if (!row.is_enabled) {
          return <Badge count="已禁用" />;
        }
        return row.status === 'active' ? (
          <Badge count="活跃" color="success" />
        ) : (
          <Badge count="未激活" color="default" />
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
      title: '创建时间',
      width: 180,

      cell: ({ row }: { row: DigitalHumanResponse }) =>
        new Date(row.created_at).toLocaleString('zh-CN'),
    },
    {
      colKey: 'actions',
      title: '操作',
      width: 180,
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }: { row: DigitalHumanResponse }) => (
        <Space>
          <Button
            size="small"
            variant="text"
            onClick={() => this.handleView(row)}
          >
            查看
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => this.handleEdit(row)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  handleDialogClose = (): void => {
    this.setState({
      dialogVisible: false,
      selectedDigitalHuman: null,
    });
  };

  render(): React.ReactNode {
    const { dialogVisible, selectedDigitalHuman } = this.state;
    const { digitalHumans, isLoading } = this.digitalHumanStore;

    return (
      <div className="p-5 max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold">数字人管理</h2>
          <Button icon={<AddIcon />} onClick={this.handleCreate}>
            创建数字人
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
