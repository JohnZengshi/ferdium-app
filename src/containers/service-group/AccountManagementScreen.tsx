import { Component, type ReactElement } from 'react';
import {
  Button,
  Select,
  Table,
  Tag,
  type PrimaryTableCol,
} from 'tdesign-react';
import { Edit1Icon, RefreshIcon } from 'tdesign-icons-react';
import AvatarCell from '../../components/ui/AvatarCell';
import FilterToolbar from '../../components/ui/FilterToolbar';

interface Account {
  id: number;
  username: string;
  phone: string;
  status: 'online' | 'offline';
  persona: string;
  note: string;
  autoChat: 'on' | 'off' | 'healthy';
  proxy: string;
  createdAt: string;
}

const mockData: Account[] = Array.from({ length: 5 }, (_, index) => ({
  id: index + 6,
  username: '用户名',
  phone: '+85217856343',
  status: index === 2 ? 'offline' : 'online',
  persona: index === 1 ? '默认标签' : '人设名称',
  note: '美国1号手机',
  autoChat: index === 2 ? 'off' : index === 3 || index === 4 ? 'healthy' : 'on',
  proxy: '9.124.123.456.789',
  createdAt: '2025-05-12 08:12',
}));

class AccountManagementScreen extends Component {
  columns: PrimaryTableCol<Account>[] = [
    {
      colKey: 'id',
      title: '序号',
      width: 88,
      align: 'center',
      cell: ({ row }) => (
        <span className="text-[14px] leading-[22px] text-primary">
          {row.id}
        </span>
      ),
    },
    {
      colKey: 'username',
      title: '账号信息',
      width: 248,
      cell: ({ row }) => (
        <AvatarCell title={row.username} subtitle={row.phone} />
      ),
    },
    {
      colKey: 'status',
      title: '状态',
      width: 112,
      cell: ({ row }) => (
        <Tag
          variant="outline"
          theme={row.status === 'online' ? 'success' : 'danger'}
          className="!rounded-[6px] !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
        >
          {row.status === 'online' ? '在线' : '离线'}
        </Tag>
      ),
    },
    {
      colKey: 'persona',
      title: '账号人设',
      width: 160,
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
      title: '账号备注',
      width: 184,
      cell: ({ row }) => (
        <div className="flex items-center gap-[8px] text-[14px] leading-[22px] text-primary">
          <span>{row.note}</span>
          <Edit1Icon className="cursor-pointer text-secondary" size="14px" />
        </div>
      ),
    },
    {
      colKey: 'autoChat',
      title: '自动聊天',
      width: 132,
      cell: ({ row }) => {
        const isOff = row.autoChat === 'off';
        const text =
          row.autoChat === 'on'
            ? '开启'
            : row.autoChat === 'off'
              ? '关闭'
              : '健康';
        const textClass = isOff ? 'text-error' : 'text-success';
        const dotClass = isOff ? 'bg-error' : 'bg-success';

        return (
          <div
            className={`flex items-center gap-[8px] text-[14px] leading-[22px] ${textClass}`}
          >
            <span className={`h-[8px] w-[8px] rounded-full ${dotClass}`} />
            <span>{text}</span>
          </div>
        );
      },
    },
    {
      colKey: 'proxy',
      title: '代理 IP',
      width: 212,
      cell: ({ row }) => (
        <div className="flex items-center gap-[8px] text-[14px] leading-[22px] text-primary">
          <span>{row.proxy}</span>
          <Edit1Icon className="cursor-pointer text-secondary" size="14px" />
        </div>
      ),
    },
    {
      colKey: 'createdAt',
      title: '创建时间',
      width: 176,
      cell: ({ row }) => (
        <span className="text-[14px] leading-[22px] text-primary">
          {row.createdAt}
        </span>
      ),
    },
  ];

  render(): ReactElement {
    return (
      <div className="account-management-screen flex flex-1 flex-col bg-page p-[24px]">
        <div className="flex h-full w-full flex-col bg-container p-[32px]">
          <FilterToolbar
            leftContent={
              <>
                <span className="text-[14px] leading-[22px] text-primary">
                  状态
                </span>
                <Select className="!w-[160px]" placeholder="请选择内容状态" />
                <span className="text-[14px] leading-[22px] text-primary">
                  人设
                </span>
                <Select className="!w-[160px]" placeholder="请选择内容状态" />
                <Button theme="primary">搜索</Button>
                <Button
                  theme="default"
                  variant="outline"
                  icon={<RefreshIcon />}
                >
                  重置
                </Button>
              </>
            }
            rightContent={
              <>
                <span className="text-[14px] leading-[22px] text-secondary">
                  已选 2 项
                </span>
                <Button
                  theme="primary"
                  variant="text"
                  className="!rounded-[8px] !bg-brand-light !px-[14px] !text-brand"
                >
                  更多操作
                </Button>
                <RefreshIcon className="cursor-pointer text-[20px] text-primary" />
              </>
            }
          />

          <Table
            data={mockData}
            columns={this.columns}
            rowKey="id"
            bordered
            stripe={false}
            hover
            pagination={{
              current: 11,
              pageSize: 20,
              total: 101,
              showJumper: true,
              showPageSize: true,
              pageSizeOptions: [10, 20, 50],
            }}
            tableLayout="fixed"
          />

          <div className="flex-1 bg-container" />
        </div>
      </div>
    );
  }
}

export default AccountManagementScreen;
