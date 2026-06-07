import { Component, type ReactElement } from 'react';
import {
  Button,
  Input,
  Select,
  Table,
  Tag,
  type PrimaryTableCol,
} from 'tdesign-react';
import { RefreshIcon, SearchIcon } from 'tdesign-icons-react';
import AvatarCell from '../../components/ui/AvatarCell';
import FilterToolbar from '../../components/ui/FilterToolbar';

interface FanProfile {
  id: number;
  username: string;
  phone: string;
  isVIP: boolean;
  region: string;
  gender: string;
  stage: string;
  stageColor: 'blue' | 'orange';
  tag: string;
  tagColor: 'orange' | 'red';
  intentLevel: string;
  intentColor: 'green' | 'red';
  ownerUsername: string;
  ownerPhone: string;
}

const rows: FanProfile[] = Array.from({ length: 5 }, (_, i): FanProfile => {
  switch (i) {
    case 0: {
      return {
        id: 6,
        username: '用户名',
        phone: '+85217856343',
        isVIP: true,
        region: '美国',
        gender: '男',
        stage: '新增线索',
        stageColor: 'blue',
        tag: '金融理财',
        tagColor: 'orange',
        intentLevel: '高意向',
        intentColor: 'green',
        ownerUsername: '用户名',
        ownerPhone: '+85217856343',
      };
    }
    case 1: {
      return {
        id: 7,
        username: '用户名',
        phone: '+85217856343',
        isVIP: false,
        region: '美国',
        gender: '男',
        stage: '未知',
        stageColor: 'orange',
        tag: '不匹配',
        tagColor: 'red',
        intentLevel: '不匹配',
        intentColor: 'red',
        ownerUsername: '用户名',
        ownerPhone: '+85217856343',
      };
    }
    default: {
      return {
        id: 6 + i,
        username: '用户名',
        phone: '+85217856343',
        isVIP: false,
        region: '美国',
        gender: '男',
        stage: '默认标签',
        stageColor: 'blue',
        tag: '默认标签',
        tagColor: 'orange',
        intentLevel: '健康',
        intentColor: 'green',
        ownerUsername: '用户名',
        ownerPhone: '+85217856343',
      };
    }
  }
});

const STAGE_COLOR_MAP = {
  blue: 'primary' as const,
  orange: 'warning' as const,
};
const TAG_COLOR_MAP = { orange: 'warning' as const, red: 'danger' as const };
const INTENT_COLOR_MAP = { green: '#00B42A', red: '#F53F3F' };

class UserProfileScreen extends Component {
  columns: PrimaryTableCol<FanProfile>[] = [
    { colKey: 'id', title: '序号', width: 64, align: 'center' },
    {
      colKey: 'username',
      title: '粉丝账号',
      width: 220,
      cell: ({ row }) => (
        <AvatarCell
          title={row.username}
          subtitle={row.phone}
          isVIP={row.isVIP}
          vipLabel="重粉"
        />
      ),
    },
    {
      colKey: 'region',
      title: '所在地区',
      width: 120,
      cell: ({ row }) => (
        <span className="text-[14px] leading-[22px] text-[#1F2329]">
          {row.region}
        </span>
      ),
    },
    {
      colKey: 'gender',
      title: '性别',
      width: 100,
      cell: ({ row }) => (
        <span className="text-[14px] leading-[22px] text-[#1F2329]">
          {row.gender}
        </span>
      ),
    },
    {
      colKey: 'stage',
      title: '当前阶段',
      width: 140,
      cell: ({ row }) => (
        <Tag
          variant="outline"
          theme={STAGE_COLOR_MAP[row.stageColor]}
          className="!rounded-[6px] !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
        >
          {row.stage}
        </Tag>
      ),
    },
    {
      colKey: 'tag',
      title: '标签',
      width: 140,
      cell: ({ row }) => (
        <Tag
          variant="outline"
          theme={TAG_COLOR_MAP[row.tagColor]}
          className="!rounded-[6px] !px-[10px] !py-[2px] !text-[12px] !leading-[20px]"
        >
          {row.tag}
        </Tag>
      ),
    },
    {
      colKey: 'intentLevel',
      title: '意向等级',
      width: 120,
      cell: ({ row }) => {
        const color = INTENT_COLOR_MAP[row.intentColor];
        return (
          <div
            className="flex items-center gap-[8px] text-[14px] leading-[22px]"
            style={{ color }}
          >
            <span
              className="h-[8px] w-[8px] rounded-full"
              style={{ backgroundColor: color }}
            />
            <span>{row.intentLevel}</span>
          </div>
        );
      },
    },
    {
      colKey: 'chatSummary',
      title: '聊天摘要',
      width: 120,
      cell: () => (
        <span className="cursor-pointer text-[14px] leading-[22px] text-[#0052D9]">
          查看
        </span>
      ),
    },
    {
      colKey: 'serviceNote',
      title: '客服备注',
      width: 120,
      cell: () => (
        <span className="cursor-pointer text-[14px] leading-[22px] text-[#0052D9]">
          查看
        </span>
      ),
    },
    {
      colKey: 'owner',
      title: '归属账号',
      width: 200,
      cell: ({ row }) => (
        <AvatarCell title={row.ownerUsername} subtitle={row.ownerPhone} />
      ),
    },
  ];

  render(): ReactElement {
    return (
      <div className="flex flex-1 flex-col bg-[#F3F3F3] p-[24px]">
        <div className="flex h-full flex-col bg-white p-[32px]">
          <FilterToolbar
            leftContent={
              <>
                <Input
                  prefixIcon={<SearchIcon />}
                  placeholder="粉丝姓名。手机号"
                  className="!w-[240px]"
                />
                <span className="text-[14px] leading-[22px] text-[#1F2329]">
                  状态
                </span>
                <Select className="!w-[160px]" placeholder="请选择内容状态" />
                <span className="text-[14px] leading-[22px] text-[#1F2329]">
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
                <span className="text-[14px] leading-[22px] text-[#86909C]">
                  已选 2 项
                </span>
                <Button
                  theme="primary"
                  variant="text"
                  className="!rounded-[8px] !bg-[#E8F3FF] !px-[14px] !text-[#0052D9]"
                >
                  更多操作
                </Button>
                <RefreshIcon className="cursor-pointer text-[20px] text-[#1F2329]" />
              </>
            }
          />

          <Table
            data={rows}
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

          <div className="flex-1 bg-white" />
        </div>
      </div>
    );
  }
}

export default UserProfileScreen;
