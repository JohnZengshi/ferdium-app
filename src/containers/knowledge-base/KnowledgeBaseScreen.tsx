import {
  AddIcon,
  AiArticleIcon,
  ChatIcon,
  CheckCircleIcon,
  Edit2Icon,
  Edit1Icon,
  FolderOpenIcon,
  GenderFemaleIcon,
  HomeIcon,
  QueueIcon,
  UserCircleIcon,
  UserSettingIcon,
  UserListIcon,
  WorkIcon,
} from 'tdesign-icons-react';
import { Component, type ReactElement } from 'react';
import {
  Button,
  DatePicker,
  Input,
  MessagePlugin,
  Pagination,
  Select,
  Table,
  Textarea,
  type PageInfo,
  type PrimaryTableCol,
} from 'tdesign-react';

type KnowledgeCategoryKey =
  | 'persona-profiles'
  | 'welcome-messages'
  | 'product-points'
  | 'follow-up-plans'
  | 'after-sales';

type KnowledgeViewMode = 'list' | 'create';

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

interface KnowledgeCreateFormData {
  note: string;
  personName: string;
  age: string;
  gender: string;
  familyStatus: string;
  occupation: string;
  participation: string;
}

interface KnowledgeBaseScreenState {
  activeCategoryKey: KnowledgeCategoryKey;
  currentPage: number;
  viewMode: KnowledgeViewMode;
  entries: KnowledgeEntry[];
  importText: string;
  formData: KnowledgeCreateFormData;
}
const PAGE_SIZE = 5;

const PERSONA_CATEGORY_KEY: KnowledgeCategoryKey = 'persona-profiles';

const IMPORT_SAMPLE_TEXT =
  'Amy，是一个24岁未婚未育的女销售，销售深度参与项目全流程，负责线索挖掘、客户对接、客情维护、需求梳理、产品讲解、异议处理及商务谈判，主导项目签约落地。标准化项目成交后衔接售后即可；企业级 / 大客户项目需持续跟进交付、验收与长期合作维护。销售为项目客户侧第一责任人，统筹对外沟通与商务推进。';

const DEFAULT_FORM_DATA: KnowledgeCreateFormData = {
  note: '',
  personName: '',
  age: '',
  gender: '',
  familyStatus: '',
  occupation: '',
  participation: '',
};

const GENDER_OPTIONS = [
  { label: '男', value: '男' },
  { label: '女', value: '女' },
  { label: '其他', value: '其他' },
];

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

const INITIAL_KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
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

function normalizeAge(text: string): string {
  const match = text.match(/(\d{1,2})\s*岁/);
  return match?.[1] ?? '';
}

function normalizeGender(text: string): string {
  if (text.includes('女')) {
    return '女';
  }

  if (text.includes('男')) {
    return '男';
  }

  return '';
}

function normalizeFamilyStatus(text: string): string {
  const presets = ['未婚未育', '未婚', '已婚已育', '已婚', '离异', '单身'];

  return presets.find(item => text.includes(item)) ?? '';
}

function normalizeOccupation(text: string): string {
  const match = text.match(
    /(销售经理|销售顾问|销售|客服专员|客服|产品经理|运营|设计师|教师|顾问|招商主管|项目经理)/,
  );

  return match?.[1] ?? '';
}

function normalizeParticipation(text: string): string {
  if (text.includes('深度参与') || text.includes('全流程')) {
    return '90%';
  }

  if (text.includes('主导') || text.includes('统筹')) {
    return '85%';
  }

  if (text.includes('协助')) {
    return '60%';
  }

  const percentageMatch = text.match(/(\d{1,3})%/);
  if (percentageMatch) {
    return `${percentageMatch[1]}%`;
  }

  return '';
}

function buildPersonaFormData(importText: string): KnowledgeCreateFormData {
  const trimmedText = importText.trim();
  const nameMatch = trimmedText.match(/^([^\s,。，]{1,12})[,，]/);

  return {
    note: trimmedText,
    personName: nameMatch?.[1] ?? '',
    age: normalizeAge(trimmedText),
    gender: normalizeGender(trimmedText),
    familyStatus: normalizeFamilyStatus(trimmedText),
    occupation: normalizeOccupation(trimmedText),
    participation: normalizeParticipation(trimmedText),
  };
}

function getFieldIcon(label: string): ReactElement {
  const iconClassName = 'h-[13.5px] w-[13.5px] text-[#0052D9]';

  switch (label) {
    case '姓名': {
      return <UserCircleIcon className={iconClassName} />;
    }
    case '人设备注': {
      return <Edit2Icon className={iconClassName} />;
    }
    case '出生日期': {
      return <UserListIcon className={iconClassName} />;
    }
    case '性别': {
      return <GenderFemaleIcon className={iconClassName} />;
    }
    case '家庭情况': {
      return <HomeIcon className={iconClassName} />;
    }
    case '职业': {
      return <WorkIcon className={iconClassName} />;
    }
    case '项目参与度': {
      return <FolderOpenIcon className={iconClassName} />;
    }
    default: {
      return <UserSettingIcon className={iconClassName} />;
    }
  }
}

class KnowledgeBaseScreen extends Component<
  Record<string, never>,
  KnowledgeBaseScreenState
> {
  constructor(props: Record<string, never>) {
    super(props);

    this.state = {
      activeCategoryKey: PERSONA_CATEGORY_KEY,
      currentPage: 1,
      viewMode: 'list',
      entries: INITIAL_KNOWLEDGE_ENTRIES,
      importText: IMPORT_SAMPLE_TEXT,
      formData: { ...DEFAULT_FORM_DATA },
    };
  }

  // Disable nested component warnings for TDesign Table cell renderers
  // These inline render functions keep the table structure close to the UI design
  columns: PrimaryTableCol<KnowledgeEntry>[] = [
    {
      colKey: 'code',
      title: '序号',
      width: 75,
      align: 'left',
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-[15px] leading-6 text-[rgba(0,0,0,0.9)]">
          {row.code}
        </span>
      ),
    },
    {
      colKey: 'name',
      title: '人设备注',
      minWidth: 120,
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
      minWidth: 80,
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
      minWidth: 60,
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
      minWidth: 60,
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
      minWidth: 80,
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
      title: '家庭情况',
      minWidth: 90,
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
      minWidth: 90,
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
      width: 200,
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
    return this.state.entries.filter(
      entry => entry.categoryKey === categoryKey,
    );
  }

  getNextEntryCode(categoryKey: KnowledgeCategoryKey): string {
    let maxCode = 0;

    for (const entry of this.state.entries) {
      if (entry.categoryKey === categoryKey) {
        const parsedCode = Number(entry.code);
        if (!Number.isNaN(parsedCode)) {
          maxCode = Math.max(maxCode, parsedCode);
        }
      }
    }

    return String(maxCode + 1);
  }

  get canSaveForm(): boolean {
    const { formData } = this.state;

    return (
      formData.note.trim().length > 0 &&
      formData.personName.trim().length > 0 &&
      formData.gender.trim().length > 0
    );
  }

  handleCategoryChange = (activeCategoryKey: KnowledgeCategoryKey): void => {
    this.setState({
      activeCategoryKey,
      currentPage: 1,
      viewMode: 'list',
    });
  };

  handlePaginationChange = (pageInfo: PageInfo): void => {
    this.setState({ currentPage: pageInfo.current });
  };

  handleOpenCreate = (): void => {
    if (this.state.activeCategoryKey !== PERSONA_CATEGORY_KEY) {
      MessagePlugin.info('当前仅支持创建社交账号人设资料');
      return;
    }

    this.setState({
      viewMode: 'create',
      importText: IMPORT_SAMPLE_TEXT,
      formData: buildPersonaFormData(IMPORT_SAMPLE_TEXT),
    });
  };

  handleBackToList = (): void => {
    this.setState({
      viewMode: 'list',
      importText: IMPORT_SAMPLE_TEXT,
      formData: { ...DEFAULT_FORM_DATA },
    });
  };

  handleImportTextChange = (value: string): void => {
    this.setState({ importText: value });
  };

  handleFormFieldChange = (
    field: keyof KnowledgeCreateFormData,
    value: string,
  ): void => {
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        [field]: value,
      },
    }));
  };

  handleImportPersona = (): void => {
    const { importText } = this.state;
    const trimmedText = importText.trim();

    if (!trimmedText) {
      MessagePlugin.warning('请先输入一段人物描述');
      return;
    }

    this.setState({
      formData: buildPersonaFormData(trimmedText),
    });

    MessagePlugin.success('已识别并填入表单');
  };

  handleSavePersona = (): void => {
    if (!this.canSaveForm) {
      MessagePlugin.warning('请至少补全姓名、性别和人设备注');
      return;
    }

    const { activeCategoryKey, formData } = this.state;
    const nextEntry: KnowledgeEntry = {
      id: `${activeCategoryKey}-${Date.now()}`,
      categoryKey: activeCategoryKey,
      code: this.getNextEntryCode(activeCategoryKey),
      note: formData.note.trim(),
      personName: formData.personName.trim(),
      age: formData.age.trim() || '-',
      gender: formData.gender.trim(),
      occupation: formData.occupation.trim() || '-',
      familyStatus: formData.familyStatus.trim() || '-',
      participation: formData.participation.trim() || '-',
    };

    this.setState(prevState => ({
      entries: [nextEntry, ...prevState.entries],
      currentPage: 1,
      viewMode: 'list',
      importText: IMPORT_SAMPLE_TEXT,
      formData: { ...DEFAULT_FORM_DATA },
    }));

    MessagePlugin.success('保存成功');
  };

  renderCreateField(
    label: string,
    content: ReactElement,
    className = 'w-full',
  ): ReactElement {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <div className="flex items-center gap-2 text-[14px] font-semibold leading-[22px] text-[rgba(0,0,0,0.9)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F2F3FF] text-[#0052D9]">
            {getFieldIcon(label)}
          </span>
          <span>{label}</span>
        </div>
        {content}
      </div>
    );
  }

  renderListView(activeCategory: KnowledgeCategory): ReactElement {
    const { activeCategoryKey, currentPage } = this.state;
    const activeEntries = this.getEntriesByCategory(activeCategoryKey);
    const pagedEntries = activeEntries.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE,
    );

    return (
      <section className="flex min-h-[860px] flex-col rounded-[6px] bg-white">
        <div className="shrink-0 px-8 pb-5 pt-8">
          <div className="flex flex-wrap items-start gap-4 lg:items-center">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <Button
                theme="primary"
                icon={<AddIcon />}
                className="border-[#0052D9] bg-[#0052D9] text-white"
                onClick={this.handleOpenCreate}
              >
                创建人设资料
              </Button>
              <p className="min-w-0 flex-1 text-[14px] leading-[22px] text-[rgba(0,0,0,0.4)]">
                {activeCategory.helper}
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-white px-8 pb-8">
          <div className="kb-table-shell flex min-h-0 flex-1 flex-col overflow-hidden border border-[#E7E7E7]">
            <div className="flex-1 overflow-auto">
              <Table
                className="kb-table"
                columns={this.columns}
                data={pagedEntries}
                rowKey="id"
                hover
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
    );
  }

  renderCreateView(): ReactElement {
    const { formData, importText } = this.state;

    return (
      <section className="flex h-full flex-col rounded-[6px] border border-[#E7E7E7] bg-white">
        <div className="flex items-center gap-3 border-b border-[#E7E7E7] px-6 py-4">
          <Button
            variant="text"
            theme="default"
            onClick={this.handleBackToList}
          >
            返回
          </Button>
          <h2 className="text-[16px] font-semibold leading-6 text-[rgba(0,0,0,0.9)]">
            创建人设资料
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[#F5F6FA] p-4">
          <div className="rounded-[6px] bg-white p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.1)]">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,589px)_minmax(320px,589px)]">
              <div className="flex flex-col gap-6">
                {this.renderCreateField(
                  '姓名',
                  <Input
                    size="large"
                    placeholder="请输入内容"
                    value={formData.personName}
                    onChange={value =>
                      this.handleFormFieldChange('personName', String(value))
                    }
                  />,
                )}

                {this.renderCreateField(
                  '人设备注',
                  <Input
                    size="large"
                    placeholder="请输入内容"
                    value={formData.note}
                    onChange={value =>
                      this.handleFormFieldChange('note', String(value))
                    }
                  />,
                )}

                <div className="grid gap-5 md:grid-cols-2">
                  {this.renderCreateField(
                    '出生日期',
                    <DatePicker
                      size="large"
                      placeholder="请选择日期"
                      enableTimePicker={false}
                      format="YYYY-MM-DD"
                      value={formData.age}
                      onChange={value =>
                        this.handleFormFieldChange('age', String(value))
                      }
                    />,
                  )}

                  {this.renderCreateField(
                    '性别',
                    <Select
                      size="large"
                      placeholder="请选择内容"
                      options={GENDER_OPTIONS}
                      value={formData.gender || undefined}
                      onChange={value =>
                        this.handleFormFieldChange(
                          'gender',
                          String(value ?? ''),
                        )
                      }
                      clearable
                    />,
                  )}
                </div>

                {this.renderCreateField(
                  '家庭情况',
                  <Textarea
                    placeholder="请输入内容"
                    autosize={{ minRows: 3, maxRows: 5 }}
                    value={formData.familyStatus}
                    onChange={value =>
                      this.handleFormFieldChange('familyStatus', String(value))
                    }
                  />,
                )}

                {this.renderCreateField(
                  '职业',
                  <Input
                    size="large"
                    placeholder="请输入内容"
                    value={formData.occupation}
                    onChange={value =>
                      this.handleFormFieldChange('occupation', String(value))
                    }
                  />,
                )}

                {this.renderCreateField(
                  '项目参与度',
                  <Textarea
                    placeholder="请输入内容"
                    autosize={{ minRows: 3, maxRows: 5 }}
                    value={formData.participation}
                    onChange={value =>
                      this.handleFormFieldChange('participation', String(value))
                    }
                  />,
                )}

                <div className="flex justify-center pt-2">
                  <Button
                    theme="primary"
                    className="border-[#0052D9] bg-[#0052D9] px-8 text-white"
                    onClick={this.handleSavePersona}
                  >
                    保存
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-[14px] font-semibold leading-[22px] text-[rgba(0,0,0,0.9)]">
                  <span className="flex h-[18px] w-[18px] items-center justify-center text-[#0052D9]">
                    <AiArticleIcon size="18px" />
                  </span>
                  <span>智能导入</span>
                </div>

                <div className="rounded-[12px] border border-[#0052D9] p-3">
                  <Textarea
                    autosize={{ minRows: 6, maxRows: 12 }}
                    placeholder="输入文本到此处，将自动识别人设信息"
                    value={importText}
                    onChange={value =>
                      this.handleImportTextChange(String(value))
                    }
                  />
                  <p className="mt-2 text-[12px] leading-5 text-[rgba(0,0,0,0.4)]">
                    例：Amy，是一个24岁未婚未育的女销售，销售深度参与项目全流程，负责线索挖掘、客户对接、客情维护、需求梳理、产品讲解、异议处理及商务谈判，主导项目签约落地。
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    theme="primary"
                    className="border-[#0052D9] bg-[#0052D9] text-white"
                    onClick={this.handleImportPersona}
                  >
                    识别并导入
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  render(): ReactElement {
    const { activeCategoryKey, viewMode } = this.state;
    const activeCategory = this.getCategoryByKey(activeCategoryKey);
    const menuCategory = this.getCategoryByKey(PERSONA_CATEGORY_KEY);

    return (
      <div className="knowledge-base-screen flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F6FA]">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="w-[232px] shrink-0 border-r border-[#E7E7E7] bg-white px-2 pt-2">
            <button
              type="button"
              onClick={() => this.handleCategoryChange(menuCategory.key)}
              className="flex w-full items-center gap-2 rounded-[3px] bg-[#F2F3FF] px-4 py-[7px] text-left text-[#0052D9]"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[#0052D9]">
                {menuCategory.icon}
              </span>
              <span className="truncate text-[14px] font-normal leading-[22px]">
                {menuCategory.label}
              </span>
            </button>
          </aside>

          <main className="min-w-0 flex-1 overflow-auto p-6">
            {viewMode === 'create'
              ? this.renderCreateView()
              : this.renderListView(activeCategory)}
          </main>
        </div>
      </div>
    );
  }
}

export default KnowledgeBaseScreen;
