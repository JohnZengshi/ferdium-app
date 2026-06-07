import { type ReactElement, useMemo } from 'react';
import { observer } from 'mobx-react';
import { useIntl, defineMessages } from 'react-intl';
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

const messages = defineMessages({
  colId: { id: 'userProfile.col.id', defaultMessage: '序号' },
  colFanAccount: { id: 'userProfile.col.fanAccount', defaultMessage: '粉丝账号' },
  colRegion: { id: 'userProfile.col.region', defaultMessage: '所在地区' },
  colGender: { id: 'userProfile.col.gender', defaultMessage: '性别' },
  colStage: { id: 'userProfile.col.stage', defaultMessage: '当前阶段' },
  colTag: { id: 'userProfile.col.tag', defaultMessage: '标签' },
  colIntentLevel: { id: 'userProfile.col.intentLevel', defaultMessage: '意向等级' },
  colChatSummary: { id: 'userProfile.col.chatSummary', defaultMessage: '聊天摘要' },
  colServiceNote: { id: 'userProfile.col.serviceNote', defaultMessage: '客服备注' },
  colOwner: { id: 'userProfile.col.owner', defaultMessage: '归属账号' },
  view: { id: 'userProfile.view', defaultMessage: '查看' },
  searchPlaceholder: { id: 'userProfile.searchPlaceholder', defaultMessage: '粉丝姓名。手机号' },
  filterStatus: { id: 'userProfile.filterStatus', defaultMessage: '状态' },
  filterPlaceholder: { id: 'userProfile.filterPlaceholder', defaultMessage: '请选择内容状态' },
  filterPersona: { id: 'userProfile.filterPersona', defaultMessage: '人设' },
  search: { id: 'userProfile.search', defaultMessage: '搜索' },
  reset: { id: 'userProfile.reset', defaultMessage: '重置' },
  selectedItems: { id: 'userProfile.selectedItems', defaultMessage: '已选 2 项' },
  moreActions: { id: 'userProfile.moreActions', defaultMessage: '更多操作' },
  vipLabel: { id: 'avatarCell.vipLabel', defaultMessage: '重粉' },
});

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
const INTENT_CLASS_MAP = { green: 'text-success', red: 'text-error' };
const INTENT_DOT_MAP = { green: 'bg-success', red: 'bg-error' };

function UserProfileScreen(): ReactElement {
  const intl = useIntl();

  const columns: PrimaryTableCol<FanProfile>[] = useMemo(
    () => [
      { colKey: 'id', title: intl.formatMessage(messages.colId), width: 64, align: 'center' },
      {
        colKey: 'username',
        title: intl.formatMessage(messages.colFanAccount),
        width: 220,
        cell: ({ row }) => (
          <AvatarCell
            title={row.username}
            subtitle={row.phone}
            isVIP={row.isVIP}
            vipLabel={intl.formatMessage(messages.vipLabel)}
          />
        ),
      },
      {
        colKey: 'region',
        title: intl.formatMessage(messages.colRegion),
        width: 120,
        cell: ({ row }) => (
          <span className="text-[14px] leading-[22px] text-primary">
            {row.region}
          </span>
        ),
      },
      {
        colKey: 'gender',
        title: intl.formatMessage(messages.colGender),
        width: 100,
        cell: ({ row }) => (
          <span className="text-[14px] leading-[22px] text-primary">
            {row.gender}
          </span>
        ),
      },
      {
        colKey: 'stage',
        title: intl.formatMessage(messages.colStage),
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
        title: intl.formatMessage(messages.colTag),
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
        title: intl.formatMessage(messages.colIntentLevel),
        width: 120,
        cell: ({ row }) => (
          <div
            className={`flex items-center gap-[8px] text-[14px] leading-[22px] ${INTENT_CLASS_MAP[row.intentColor]}`}
          >
            <span
              className={`h-[8px] w-[8px] rounded-full ${INTENT_DOT_MAP[row.intentColor]}`}
            />
            <span>{row.intentLevel}</span>
          </div>
        ),
      },
      {
        colKey: 'chatSummary',
        title: intl.formatMessage(messages.colChatSummary),
        width: 120,
        cell: () => (
          <span className="cursor-pointer text-[14px] leading-[22px] text-brand">
            {intl.formatMessage(messages.view)}
          </span>
        ),
      },
      {
        colKey: 'serviceNote',
        title: intl.formatMessage(messages.colServiceNote),
        width: 120,
        cell: () => (
          <span className="cursor-pointer text-[14px] leading-[22px] text-brand">
            {intl.formatMessage(messages.view)}
          </span>
        ),
      },
      {
        colKey: 'owner',
        title: intl.formatMessage(messages.colOwner),
        width: 200,
        cell: ({ row }) => (
          <AvatarCell title={row.ownerUsername} subtitle={row.ownerPhone} />
        ),
      },
    ],
    [intl],
  );

  return (
    <div className="flex flex-1 flex-col bg-page p-[24px]">
      <div className="flex h-full flex-col bg-container p-[32px]">
        <FilterToolbar
          leftContent={
            <>
              <Input
                prefixIcon={<SearchIcon />}
                placeholder={intl.formatMessage(messages.searchPlaceholder)}
                className="!w-[240px]"
              />
              <span className="text-[14px] leading-[22px] text-primary">
                {intl.formatMessage(messages.filterStatus)}
              </span>
              <Select className="!w-[160px]" placeholder={intl.formatMessage(messages.filterPlaceholder)} />
              <span className="text-[14px] leading-[22px] text-primary">
                {intl.formatMessage(messages.filterPersona)}
              </span>
              <Select className="!w-[160px]" placeholder={intl.formatMessage(messages.filterPlaceholder)} />
              <Button theme="primary">{intl.formatMessage(messages.search)}</Button>
              <Button
                theme="default"
                variant="outline"
                icon={<RefreshIcon />}
              >
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
          data={rows}
          columns={columns}
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

export default observer(UserProfileScreen);
