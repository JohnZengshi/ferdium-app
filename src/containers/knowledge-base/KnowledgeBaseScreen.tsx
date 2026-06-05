import {
  AddIcon,
  ChatIcon,
  CheckCircleIcon,
  Edit1Icon,
  QueueIcon,
  UserSettingIcon,
} from 'tdesign-icons-react';
import { Component, type ReactElement } from 'react';
import {
  Button,
  Pagination,
  Table,
  type PageInfo,
  type PrimaryTableCol,
} from 'tdesign-react';

type KnowledgeCategoryKey =
  | 'persona-profiles'
  | 'welcome-messages'
  | 'product-points'
  | 'follow-up-plans'
  | 'after-sales';

interface KnowledgeCategory {
  key: KnowledgeCategoryKey;
  label: string;
  helper: string;
  icon: ReactElement;
}

interface KnowledgeEntry {
  id: string;
  categoryKey: KnowledgeCategoryKey;
  code: string;
  note: string;
  personName: string;
  age: string;
  gender: string;
  occupation: string;
  familyStatus: string;
  participation: string;
}

interface KnowledgeBaseScreenState {
  activeCategoryKey: KnowledgeCategoryKey;
  currentPage: number;
}

const PAGE_SIZE = 5;

const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  {
    key: 'persona-profiles',
    label: '社交账号人设',
    helper:
      '人设资料是您社交账号的信息资料，与账号绑定后，数字员工会以账号的人设进行聊天。',
    icon: <UserSettingIcon size="24px" />,
  },
  {
    key: 'welcome-messages',
    label: '开场欢迎语',
    helper: '统一首次触达时的开场信息与响应节奏。',
    icon: <ChatIcon size="24px" />,
  },
  {
    key: 'product-points',
    label: '产品卖点',
    helper: '沉淀可直接复用的产品说明、卖点与活动信息。',
    icon: <QueueIcon size="24px" />,
  },
  {
    key: 'follow-up-plans',
    label: '跟单推进',
    helper: '整理报价跟进、催付与复购提醒等沟通资料。',
    icon: <Edit1Icon size="24px" />,
  },
  {
    key: 'after-sales',
    label: '售后处理',
    helper: '统一物流、退换货、投诉升级等售后话术。',
    icon: <CheckCircleIcon size="24px" />,
  },
];

const KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  {
    id: 'persona-001',
    categoryKey: 'persona-profiles',
    code: '6',
    note: '成熟稳重，擅长处理高净值客户咨询，注重表达专业感与信任感。',
    personName: '林嘉怡',
    age: '23',
    gender: '女',
    occupation: 'UI设计师',
    familyStatus: '离异',
    participation: '89%',
  },
  {
    id: 'persona-002',
    categoryKey: 'persona-profiles',
    code: '7',
    note: '表达热情自然，善于制造轻松聊天氛围，适合初次触达场景。',
    personName: '周子涵',
    age: '23',
    gender: '男',
    occupation: 'UI设计师',
    familyStatus: '离异',
    participation: '89%',
  },
  {
    id: 'persona-003',
    categoryKey: 'persona-profiles',
    code: '8',
    note: '注重逻辑清晰与条理性，回答克制简洁，强调产品价值和交付流程。',
    personName: '陈思远',
    age: '23',
    gender: '男',
    occupation: 'UI设计师',
    familyStatus: '离异',
    participation: '89%',
  },
  {
    id: 'persona-004',
    categoryKey: 'persona-profiles',
    code: '9',
    note: '人设偏温和细腻，擅长售后安抚和长期关系维护，适合复购客户。',
    personName: '赵雨桐',
    age: '23',
    gender: '女',
    occupation: 'UI设计师',
    familyStatus: '离异',
    participation: '89%',
  },
  {
    id: 'persona-005',
    categoryKey: 'persona-profiles',
    code: '10',
    note: '擅长用轻松语气推动成交，适合营销活动期间的短链路转化沟通。',
    personName: '黄一鸣',
    age: '23',
    gender: '男',
    occupation: 'UI设计师',
    familyStatus: '离异',
    participation: '89%',
  },
  {
    id: 'persona-006',
    categoryKey: 'persona-profiles',
    code: '11',
    note: '偏理性专业风格，回答速度快，适合商务合作、项目对接类会话。',
    personName: '许安然',
    age: '23',
    gender: '女',
    occupation: 'UI设计师',
    familyStatus: '离异',
    participation: '89%',
  },
  {
    id: 'welcome-001',
    categoryKey: 'welcome-messages',
    code: '12',
    note: '欢迎语场景下的示例人设说明，强调响应速度和礼貌开场。',
    personName: '顾晨曦',
    age: '24',
    gender: '女',
    occupation: '客服专员',
    familyStatus: '已婚',
    participation: '76%',
  },
  {
    id: 'welcome-002',
    categoryKey: 'welcome-messages',
    code: '13',
    note: '晚间自动欢迎语示例，话术更柔和，适配休息时段的预期管理。',
    personName: '沈知夏',
    age: '25',
    gender: '女',
    occupation: '客服专员',
    familyStatus: '已婚',
    participation: '73%',
  },
  {
    id: 'product-001',
    categoryKey: 'product-points',
    code: '14',
    note: '产品卖点场景样例，突出专业介绍、提炼重点和销售转化能力。',
    personName: '宋明哲',
    age: '28',
    gender: '男',
    occupation: '产品经理',
    familyStatus: '已婚',
    participation: '81%',
  },
  {
    id: 'follow-001',
    categoryKey: 'follow-up-plans',
    code: '15',
    note: '跟单推进示例资料，适合持续跟进客户并推动决策。',
    personName: '贺景行',
    age: '27',
    gender: '男',
    occupation: '销售顾问',
    familyStatus: '已婚',
    participation: '92%',
  },
  {
    id: 'after-sales-001',
    categoryKey: 'after-sales',
    code: '16',
    note: '售后资料示例，侧重情绪安抚、补偿说明和问题闭环。',
    personName: '唐婉清',
    age: '26',
    gender: '女',
    occupation: '售后专员',
    familyStatus: '已婚',
    participation: '84%',
  },
];

class KnowledgeBaseScreen extends Component<
  Record<string, never>,
  KnowledgeBaseScreenState
> {
  constructor(props: Record<string, never>) {
    super(props);

    this.state = {
      activeCategoryKey: 'persona-profiles',
      currentPage: 1,
    };
  }

  // Disable nested component warnings for TDesign Table cell renderers
  // These inline render functions keep the table structure close to the Figma layout
  columns: PrimaryTableCol<KnowledgeEntry>[] = [
    {
      colKey: 'code',
      title: '序号',
      width: 88,
      align: 'left',
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }) => (
        <span className="text-[15px] leading-6 text-[rgba(0,0,0,0.9)]">
          {row.code}
        </span>
      ),
    },
    {
      colKey: 'name',
      title: '人设备注',
      width: 296,
      align: 'left',
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }) => (
        <div className="min-w-0 py-0.5">
          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] leading-6 text-[rgba(0,0,0,0.9)]">
            {row.note}
          </div>
        </div>
      ),
    },
    {
      colKey: 'account',
      title: '姓名',
      width: 165,
      align: 'left',
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }) => (
        <span className="text-[15px] leading-6 text-[rgba(0,0,0,0.9)]">
          {row.personName}
        </span>
      ),
    },
    {
      colKey: 'scene',
      title: '年龄',
      width: 139,
      align: 'left',
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }) => (
        <span className="text-[15px] leading-6 text-[rgba(0,0,0,0.9)]">
          {row.age}
        </span>
      ),
    },
    {
      colKey: 'tone',
      title: '性别',
      width: 129,
      align: 'left',
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }) => (
        <span className="text-[15px] leading-6 text-[rgba(0,0,0,0.9)]">
          {row.gender}
        </span>
      ),
    },
    {
      colKey: 'creator',
      title: '职业',
      width: 164,
      align: 'left',
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }) => (
        <span className="text-[15px] leading-6 text-[rgba(0,0,0,0.9)]">
          {row.occupation}
        </span>
      ),
    },
    {
      colKey: 'updatedAt',
      title: '家庭清空',
      width: 120,
      align: 'left',
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }) => (
        <span className="text-[15px] leading-6 text-[rgba(0,0,0,0.9)]">
          {row.familyStatus}
        </span>
      ),
    },
    {
      colKey: 'status',
      title: '项目参与度',
      width: 120,
      align: 'left',
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }) => (
        <span className="text-[15px] leading-6 text-[rgba(0,0,0,0.9)]">
          {row.participation}
        </span>
      ),
    },
    {
      colKey: 'actions',
      title: '操作',
      width: 268,
      align: 'left',
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: () => (
        <div className="flex items-center gap-1">
          <Button
            size="small"
            theme="primary"
            variant="text"
            className="text-[#0052D9]"
          >
            查看
          </Button>
          <Button
            size="small"
            theme="primary"
            variant="text"
            className="text-[#0052D9]"
          >
            编辑
          </Button>
        </div>
      ),
    },
  ];

  getCategoryByKey(key: KnowledgeCategoryKey): KnowledgeCategory {
    return (
      KNOWLEDGE_CATEGORIES.find(category => category.key === key) ??
      KNOWLEDGE_CATEGORIES[0]
    );
  }

  getEntriesByCategory(categoryKey: KnowledgeCategoryKey): KnowledgeEntry[] {
    return KNOWLEDGE_ENTRIES.filter(entry => entry.categoryKey === categoryKey);
  }

  handleCategoryChange = (activeCategoryKey: KnowledgeCategoryKey): void => {
    this.setState({ activeCategoryKey, currentPage: 1 });
  };

  handlePaginationChange = (pageInfo: PageInfo): void => {
    this.setState({ currentPage: pageInfo.current });
  };

  render(): ReactElement {
    const { activeCategoryKey, currentPage } = this.state;
    const activeCategory = this.getCategoryByKey(activeCategoryKey);
    const activeEntries = this.getEntriesByCategory(activeCategoryKey);
    const pagedEntries = activeEntries.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE,
    );

    return (
      <div className="knowledge-base-screen flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F6FA]">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="w-[232px] shrink-0 border-r border-[#E7E7E7] bg-white pl-[1px] pt-[1px]">
            <div className="space-y-1 pr-2">
              {KNOWLEDGE_CATEGORIES.map(category => {
                const isActive = category.key === activeCategoryKey;

                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => this.handleCategoryChange(category.key)}
                    className={`flex w-full items-center gap-2 rounded-[3px] px-4 py-[7px] text-left transition-colors ${
                      isActive
                        ? 'bg-[#F2F3FF] text-[#0052D9]'
                        : 'bg-white text-[rgba(0,0,0,0.9)] hover:bg-[#F7F7F7]'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center ${
                        isActive ? 'text-[#0052D9]' : 'text-[rgba(0,0,0,0.4)]'
                      }`}
                    >
                      {category.icon}
                    </span>

                    <span className="truncate text-[14px] font-normal leading-[22px]">
                      {category.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="min-w-0 flex-1 overflow-auto p-6">
            <section className="flex h-full flex-col rounded-[6px] border border-[#E7E7E7] bg-white">
              <div className="shrink-0 px-6 pb-6 pt-6">
                <div className="flex flex-wrap items-start gap-4 lg:items-center">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                    <Button
                      theme="primary"
                      icon={<AddIcon />}
                      className="border-[#0052D9] bg-[#0052D9] text-white"
                    >
                      创建资料
                    </Button>
                    <p className="min-w-0 flex-1 text-[15px] leading-6 text-[rgba(0,0,0,0.45)]">
                      {activeCategory.helper}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col bg-white px-6 pb-6">
                <div className="kb-table-shell flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="flex-1 overflow-auto">
                    <Table
                      className="kb-table"
                      columns={this.columns}
                      data={pagedEntries}
                      rowKey="id"
                      hover
                      tableLayout="fixed"
                      empty={
                        <div className="py-16 text-center text-[15px] leading-6 text-[rgba(0,0,0,0.4)]">
                          暂无资料
                        </div>
                      }
                    />
                  </div>

                  <div className="kb-table-footer shrink-0 flex flex-col gap-3 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="kb-table-total">
                      共<strong>{activeEntries.length}</strong>条
                    </div>

                    <Pagination
                      className="kb-table-pagination"
                      current={currentPage}
                      pageSize={PAGE_SIZE}
                      size="small"
                      theme="simple"
                      total={activeEntries.length}
                      showJumper={false}
                      showPageSize={false}
                      totalContent={false}
                      onChange={this.handlePaginationChange}
                    />
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }
}

export default KnowledgeBaseScreen;
