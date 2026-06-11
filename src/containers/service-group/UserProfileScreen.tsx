import { observer } from 'mobx-react';
/* eslint-disable react/no-unstable-nested-components */
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { RefreshIcon, SearchIcon } from 'tdesign-icons-react';
import {
  Button,
  Input,
  type PrimaryTableCol,
  Select,
  Table,
  Tag,
} from 'tdesign-react';
import type {
  AppApiSchemasOwnersCustomerProfileListResponse,
  CustomerProfileResponse,
  ListCustomerProfilesApiV1CustomerProfilesGetParams,
} from '../../agent-flow-cs/api/generated/agentFlowCs.schemas';
import { listCustomerProfilesApiV1CustomerProfilesGet } from '../../agent-flow-cs/api/generated/customer-profiles/customer-profiles';
import AvatarCell from '../../components/ui/AvatarCell';
import FilterToolbar from '../../components/ui/FilterToolbar';

const messages = defineMessages({
  colId: { id: 'userProfile.col.id', defaultMessage: 'No.' },
  colFanAccount: {
    id: 'userProfile.col.fanAccount',
    defaultMessage: 'Fan Account',
  },
  colRegion: { id: 'userProfile.col.region', defaultMessage: 'Region' },
  colGender: { id: 'userProfile.col.gender', defaultMessage: 'Gender' },
  colStage: { id: 'userProfile.col.stage', defaultMessage: 'Current Stage' },
  colTag: { id: 'userProfile.col.tag', defaultMessage: 'Tag' },
  colIntentLevel: {
    id: 'userProfile.col.intentLevel',
    defaultMessage: 'Intent Level',
  },
  colChatSummary: {
    id: 'userProfile.col.chatSummary',
    defaultMessage: 'Chat Summary',
  },
  colServiceNote: {
    id: 'userProfile.col.serviceNote',
    defaultMessage: 'Agent Notes',
  },
  colOwner: { id: 'userProfile.col.owner', defaultMessage: 'Owning Account' },
  view: { id: 'userProfile.view', defaultMessage: 'View' },
  searchPlaceholder: {
    id: 'userProfile.searchPlaceholder',
    defaultMessage: 'Fan name, phone number',
  },
  filterStatus: { id: 'userProfile.filterStatus', defaultMessage: 'Status' },
  filterPlaceholder: {
    id: 'userProfile.filterPlaceholder',
    defaultMessage: 'Select status',
  },
  filterPersona: { id: 'userProfile.filterPersona', defaultMessage: 'Persona' },
  search: { id: 'userProfile.search', defaultMessage: 'Search' },
  reset: { id: 'userProfile.reset', defaultMessage: 'Reset' },
  selectedItems: {
    id: 'userProfile.selectedItems',
    defaultMessage: '2 selected',
  },
  moreActions: {
    id: 'userProfile.moreActions',
    defaultMessage: 'More Actions',
  },
  vipLabel: { id: 'avatarCell.vipLabel', defaultMessage: 'VIP' },
});

interface FanProfile {
  id: string;
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

const STAGE_COLOR_MAP: Record<string, 'primary' | 'warning'> = {
  blue: 'primary',
  orange: 'warning',
};
const TAG_COLOR_MAP: Record<string, 'warning' | 'danger'> = {
  orange: 'warning',
  red: 'danger',
};
const INTENT_CLASS_MAP: Record<string, string> = {
  green: 'text-success',
  red: 'text-error',
};
const INTENT_DOT_MAP: Record<string, string> = {
  green: 'bg-success',
  red: 'bg-error',
};

function mapProfileToFanProfile(profile: CustomerProfileResponse): FanProfile {
  const stage = profile.customer_value || '—';
  const stageColor: 'blue' | 'orange' = stage.includes('高')
    ? 'blue'
    : 'orange';

  const firstTag =
    Array.isArray(profile.tags) && profile.tags.length > 0
      ? String(profile.tags[0])
      : '—';
  const tagColor: 'orange' | 'red' = firstTag.includes('不匹配')
    ? 'red'
    : 'orange';

  const intentLevel = profile.intent_level || '—';
  const intentColor: 'green' | 'red' =
    intentLevel.includes('高') || intentLevel.toLowerCase().includes('high')
      ? 'green'
      : 'red';

  return {
    id: profile.customer_id || profile.id,
    username: profile.nickname || '—',
    phone: '',
    isVIP: profile.customer_value === '高价值',
    region: profile.region || '—',
    gender: profile.gender || '—',
    stage,
    stageColor,
    tag: firstTag,
    tagColor,
    intentLevel,
    intentColor,
    ownerUsername: profile.owner_username || '—',
    ownerPhone: '',
  };
}

function UserProfileScreen(): ReactElement {
  const intl = useIntl();

  const [data, setData] = useState<FanProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterPersona, setFilterPersona] = useState<string | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: ListCustomerProfilesApiV1CustomerProfilesGetParams = {
        page,
        page_size: pageSize,
      };
      if (searchText) params.search = searchText;
      if (filterStatus) params.intent_level = filterStatus;
      if (filterPersona) params.customer_value = filterPersona;

      const result = await listCustomerProfilesApiV1CustomerProfilesGet(params);
      const body =
        result.data as AppApiSchemasOwnersCustomerProfileListResponse;
      const items = (body.items || []).map(profile =>
        mapProfileToFanProfile(profile),
      );
      setData(items);
      setTotal(body.total);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchText, filterStatus, filterPersona]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback(() => {
    setPage(1);
    fetchData();
  }, [fetchData]);

  const handleReset = useCallback(() => {
    setSearchText('');
    setFilterStatus(undefined);
    setFilterPersona(undefined);
    setPage(1);
  }, []);

  const columns = useMemo<PrimaryTableCol<FanProfile>[]>(
    () => [
      {
        colKey: 'id',
        title: intl.formatMessage(messages.colId),
        width: 64,
        align: 'center',
        cell: ({ rowIndex }) => rowIndex + 1 + (page - 1) * pageSize,
      },
      {
        colKey: 'username',
        title: intl.formatMessage(messages.colFanAccount),
        width: 220,
        cell: ({ row }) => (
          <AvatarCell
            title={row.id}
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
        fixed: 'right',
        cell: ({ row }) => (
          <AvatarCell title={row.ownerUsername} subtitle={row.ownerPhone} />
        ),
      },
    ],
    [intl, page, pageSize],
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
                value={searchText}
                onChange={setSearchText}
              />
              <span className="text-[14px] leading-[22px] text-primary">
                {intl.formatMessage(messages.filterStatus)}
              </span>
              <Select
                className="!w-[160px]"
                placeholder={intl.formatMessage(messages.filterPlaceholder)}
                value={filterStatus}
                onChange={val => setFilterStatus(val as string)}
                clearable
                options={[
                  { label: '高意向', value: '高意向' },
                  { label: '低意向', value: '低意向' },
                  { label: '新增线索', value: '新增线索' },
                  { label: '不匹配', value: '不匹配' },
                ]}
              />
              <span className="text-[14px] leading-[22px] text-primary">
                {intl.formatMessage(messages.filterPersona)}
              </span>
              <Select
                className="!w-[160px]"
                placeholder={intl.formatMessage(messages.filterPlaceholder)}
                value={filterPersona}
                onChange={val => setFilterPersona(val as string)}
                clearable
                options={[
                  { label: '高价值', value: '高价值' },
                  { label: '中价值', value: '中价值' },
                  { label: '低价值', value: '低价值' },
                ]}
              />
              <Button theme="primary" onClick={handleSearch}>
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
              <RefreshIcon
                className="cursor-pointer text-[20px] text-primary"
                onClick={() => fetchData()}
              />
            </>
          }
        />

        <Table
          data={data}
          columns={columns}
          rowKey="id"
          bordered
          stripe={false}
          hover
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showJumper: true,
            showPageSize: true,
            pageSizeOptions: [10, 20, 50],
          }}
          onPageChange={pageInfo => {
            setPage(pageInfo.current);
            setPageSize(pageInfo.pageSize);
          }}
          tableLayout="fixed"
          resizable
          lazyLoad
        />

        <div className="flex-1 bg-container" />
      </div>
    </div>
  );
}

export default observer(UserProfileScreen);
