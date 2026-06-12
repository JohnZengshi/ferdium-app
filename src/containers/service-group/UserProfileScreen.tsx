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
  Dialog,
  Input,
  MessagePlugin,
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
    defaultMessage: 'Next Action',
  },
  colOwner: { id: 'userProfile.col.owner', defaultMessage: 'Owning Account' },
  view: { id: 'userProfile.view', defaultMessage: 'View' },
  searchPlaceholder: {
    id: 'userProfile.searchPlaceholder',
    defaultMessage: 'Fan name, phone number',
  },
  filterStatus: { id: 'userProfile.filterStatus', defaultMessage: 'Intent' },
  filterPlaceholder: {
    id: 'userProfile.filterPlaceholder',
    defaultMessage: 'Please select',
  },
  filterPersona: {
    id: 'userProfile.filterPersona',
    defaultMessage: 'Customer Value',
  },
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
  summaryDialogTitle: {
    id: 'userProfile.summaryDialogTitle',
    defaultMessage: 'Chat Summary',
  },
  summaryEmpty: {
    id: 'userProfile.summaryEmpty',
    defaultMessage: 'No summary yet',
  },
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
  intentColor: 'green' | 'orange' | 'red';
  conversationSummary: string;
  nextAction: string;
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
  orange: 'text-warning',
  red: 'text-error',
};
const INTENT_DOT_MAP: Record<string, string> = {
  green: 'bg-success',
  orange: 'bg-warning',
  red: 'bg-error',
};

function normalizeDisplayValue(value?: string | null): string {
  if (!value || value === 'unknown') {
    return '—';
  }

  return value;
}

function formatListValue(
  list?: unknown[],
  emptyFallback = '—',
  separator = '、',
): string {
  if (!Array.isArray(list) || list.length === 0) {
    return emptyFallback;
  }

  return list
    .map(item => String(item).trim())
    .filter(Boolean)
    .join(separator);
}

function formatIntentLevel(value?: string | null): string {
  switch (value) {
    case 'high': {
      return '高意向';
    }
    case 'medium': {
      return '中意向';
    }
    case 'low': {
      return '低意向';
    }
    default: {
      return '—';
    }
  }
}

function getIntentColor(value?: string | null): 'green' | 'orange' | 'red' {
  switch (value) {
    case 'high': {
      return 'green';
    }
    case 'medium': {
      return 'orange';
    }
    default: {
      return 'red';
    }
  }
}

function isHighCustomerValue(value?: string | null): boolean {
  return value === 'high' || value === '高价值';
}

function mapProfileToFanProfile(profile: CustomerProfileResponse): FanProfile {
  const stage = formatListValue(profile.purchase_signals);
  const stageColor: 'blue' | 'orange' = stage === '—' ? 'orange' : 'blue';
  const tag = formatListValue(profile.tags);
  const tagColor: 'orange' | 'red' = tag.includes('不匹配') ? 'red' : 'orange';
  const intentLevel = formatIntentLevel(profile.intent_level);
  const intentColor = getIntentColor(profile.intent_level);

  return {
    id: profile.customer_id || profile.id,
    username: profile.nickname || '—',
    phone: '',
    isVIP: isHighCustomerValue(profile.customer_value),
    region: normalizeDisplayValue(profile.region),
    gender: normalizeDisplayValue(profile.gender),
    stage,
    stageColor,
    tag,
    tagColor,
    intentLevel,
    intentColor,
    conversationSummary: profile.conversation_summary || '',
    nextAction: normalizeDisplayValue(profile.next_action),
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
  const [summaryDialogVisible, setSummaryDialogVisible] = useState(false);
  const [activeSummary, setActiveSummary] = useState('');

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
    if (page !== 1) {
      setPage(1);
      return;
    }

    fetchData();
  }, [fetchData, page]);

  const handleReset = useCallback(() => {
    setSearchText('');
    setFilterStatus(undefined);
    setFilterPersona(undefined);
    if (page !== 1) {
      setPage(1);
      return;
    }

    fetchData();
  }, [fetchData, page]);

  const handleViewSummary = useCallback(
    (summary: string) => {
      if (!summary.trim()) {
        MessagePlugin.warning(intl.formatMessage(messages.summaryEmpty));
        return;
      }

      setActiveSummary(summary);
      setSummaryDialogVisible(true);
    },
    [intl],
  );

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
        width: 'auto',
        cell: ({ row }) => (
          <AvatarCell
            title={row.id}
            subtitle={row.username === '—' ? row.phone : row.username}
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
            maxWidth={80}
            title={row.stage}
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
            maxWidth={80}
            title={row.tag}
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
        cell: ({ row }) => (
          <span
            role="button"
            tabIndex={0}
            className="cursor-pointer text-[14px] leading-[22px] text-brand"
            onClick={() => {
              handleViewSummary(row.conversationSummary);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleViewSummary(row.conversationSummary);
              }
            }}
          >
            {intl.formatMessage(messages.view)}
          </span>
        ),
      },
      {
        colKey: 'serviceNote',
        title: intl.formatMessage(messages.colServiceNote),
        width: 220,
        cell: ({ row }) => (
          <span
            className="block truncate text-[14px] leading-[22px] text-primary"
            title={row.nextAction}
          >
            {row.nextAction}
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
    [handleViewSummary, intl, page, pageSize],
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
                  { label: '高意向', value: 'high' },
                  { label: '中意向', value: 'medium' },
                  { label: '低意向', value: 'low' },
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
                  { label: '高价值', value: 'high' },
                  { label: '中价值', value: 'medium' },
                  { label: '低价值', value: 'low' },
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
          rightContent={null}
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

        <Dialog
          visible={summaryDialogVisible}
          header={intl.formatMessage(messages.summaryDialogTitle)}
          footer={false}
          closeOnOverlayClick
          destroyOnClose
          onClose={() => {
            setSummaryDialogVisible(false);
            setActiveSummary('');
          }}
        >
          <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words text-[14px] leading-[22px] text-primary">
            {activeSummary}
          </div>
        </Dialog>

        <div className="flex-1 bg-container" />
      </div>
    </div>
  );
}

export default observer(UserProfileScreen);
