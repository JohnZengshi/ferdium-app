import { Component, type ReactElement } from 'react';
import {
  Button,
  DatePicker,
  Input,
  MessagePlugin,
  Pagination,
  Select,
  Table,
} from 'tdesign-react';
import type { PrimaryTableCol } from 'tdesign-react';
import {
  AddIcon,
  CalendarIcon,
  ChevronLeftIcon,
  EditIcon,
  FileIcon,
  FolderIcon,
  GenderMaleIcon,
  HomeIcon,
  UsergroupIcon,
  UserIcon,
  WorkIcon,
} from 'tdesign-icons-react';
import {
  SidebarMenu,
  type SidebarItem,
} from '../../components/home/SidebarMenu';

interface PersonaRecord {
  id: number;
  remark: string;
  name: string;
  age: number;
  gender: string;
  occupation: string;
  familyStatus: string;
  participation: string;
}

interface FormData {
  name: string;
  remark: string;
  age: string;
  gender: string;
  family: string;
  occupation: string;
  participation: string;
}

interface KnowledgeScreenState {
  view: 'list' | 'create';
  currentPage: number;
  pageSize: number;
  formData: FormData;
  smartImportText: string;
}

const MOCK_DATA: PersonaRecord[] = Array.from({ length: 5 }, (_, i) => ({
  id: i + 6,
  remark: '嘻嘻嘻嘻嘻嘻嘻嘻嘻嘻嘻嘻嘻...',
  name: '哈哈哈哈哈哈...',
  age: 23,
  gender: '男',
  occupation: 'UI设计师',
  familyStatus: '离异',
  participation: '89%',
}));

const GENDER_OPTIONS = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
];

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    key: 'persona',
    label: '社交账号人设',
    icon: <UsergroupIcon />,
  },
];

const SMART_IMPORT_PLACEHOLDER = `输入文本到此处，将自动识别人设信息

例：Amy，是一个24未婚未育的女销售，销售深度参与项目全流程，负责线索挖掘、客户对接、客情维护、需求梳理、产品讲解、异议处理及商务谈判，主导项目签约落地。标准化项目成交后衔接售后即可；企业级 / 大客户项目需持续跟进交付、验收与长期合作维护。销售为项目客户侧第一责任人，统筹对外沟通与商务推进。Amy，是一个24未婚未育的女销售，销售深度参与项目全流程，负责线索挖掘、客户对接...`;

const FormLabel = ({
  icon,
  text,
}: {
  icon: ReactElement;
  text: string;
}): ReactElement => (
  <div className="mb-[8px] flex items-center gap-[8px]">
    <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-brand-light text-brand">
      {icon}
    </div>
    <span className="text-[14px] font-bold text-primary">{text}</span>
  </div>
);

class KnowledgeScreen extends Component<
  Record<string, never>,
  KnowledgeScreenState
> {
  constructor(props: Record<string, never>) {
    super(props);
    this.state = {
      view: 'list',
      currentPage: 11,
      pageSize: 20,
      formData: {
        name: '',
        remark: '',
        age: '',
        gender: '',
        family: '',
        occupation: '',
        participation: '',
      },
      smartImportText: '',
    };
  }

  columns: PrimaryTableCol<PersonaRecord>[] = [
    {
      colKey: 'id',
      title: '序号',
      width: 80,
      align: 'center',
    },
    {
      colKey: 'remark',
      title: '人设备注',
      width: 220,
      ellipsis: true,
    },
    {
      colKey: 'name',
      title: '姓名',
      width: 140,
      ellipsis: true,
    },
    {
      colKey: 'age',
      title: '年龄',
      width: 100,
    },
    {
      colKey: 'gender',
      title: '性别',
      width: 100,
    },
    {
      colKey: 'occupation',
      title: '职业',
      width: 140,
    },
    {
      colKey: 'familyStatus',
      title: '家庭情况',
      width: 120,
    },
    {
      colKey: 'participation',
      title: '项目参与度',
      width: 120,
    },
    {
      colKey: 'op',
      title: '操作',
      width: 140,
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: () => (
        <div className="flex items-center gap-[16px]">
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent p-0 text-[14px] text-brand hover:underline"
            onClick={() => this.handleView()}
          >
            查看
          </button>
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent p-0 text-[14px] text-brand hover:underline"
            onClick={() => this.handleEditPersona()}
          >
            编辑
          </button>
        </div>
      ),
    },
  ];

  handlePageChange = (pageInfo: {
    current: number;
    pageSize: number;
  }): void => {
    this.setState({
      currentPage: pageInfo.current,
      pageSize: pageInfo.pageSize,
    });
  };

  handleCreate = (): void => {
    this.setState({ view: 'create' });
  };

  handleBack = (): void => {
    this.setState({ view: 'list' });
  };

  handleView = (): void => {
    // TODO: navigate to detail view
  };

  handleEditPersona = (): void => {
    // TODO: navigate to edit view
  };

  handleFormChange = (field: keyof FormData, value: string): void => {
    this.setState(prev => ({
      formData: { ...prev.formData, [field]: value },
    }));
  };

  handleSmartImportTextChange = (value: string): void => {
    this.setState({ smartImportText: value });
  };

  handleSmartImport = async (): Promise<void> => {
    await MessagePlugin.success('智能导入成功');
  };

  handleSave = async (): Promise<void> => {
    await MessagePlugin.success({ content: '保存成功', placement: 'bottom' });
  };

  renderContent(): ReactElement {
    const { view, currentPage, pageSize, formData, smartImportText } =
      this.state;

    if (view === 'list') {
      return (
        <div className="flex-1 p-[24px]">
          <div className="rounded-[4px] bg-container p-[24px]">
            <div className="flex items-center">
              <Button
                theme="primary"
                className="!h-[32px] !rounded-[2px] !px-[12px]"
                onClick={this.handleCreate}
              >
                <div className="flex items-center gap-[8px]">
                  <AddIcon />
                  <span>创建人设资料</span>
                </div>
              </Button>
              <span className="ml-[12px] text-[12px] text-secondary">
                人设资料是您社交账号的信息资料，与账号绑定后，数字员工会以账号的人设进行聊天
              </span>
            </div>

            <div className="mt-[24px]">
              <Table
                data={MOCK_DATA}
                columns={this.columns}
                rowKey="id"
                bordered
                hover
                stripe={false}
                tableLayout="fixed"
                className="[&_.t-table__header]:!bg-secondary-container [&_.t-table__header-th]:!h-[40px] [&_.t-table__header-th]:!border-b [&_.t-table__header-th]:!border-solid [&_.t-table__header-th]:!border-line [&_.t-table__header-th]:!text-[14px] [&_.t-table__header-th]:!font-normal [&_.t-table__header-th]:!text-primary [&_.t-table__body-td]:!h-[56px] [&_.t-table__body-td]:!border-b [&_.t-table__body-td]:!border-solid [&_.t-table__body-td]:!border-line [&_.t-table__body-td]:!p-0"
              />
            </div>

            <div className="mt-[24px] flex items-center justify-between">
              <Pagination
                total={101}
                pageSize={pageSize}
                current={currentPage}
                onChange={this.handlePageChange}
                showJumper
                showPageSize
                size="small"
                className="[&_.t-pagination__select]:!w-[100px]"
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col">
        <div className="flex h-[60px] items-center bg-container px-[24px]">
          <button
            type="button"
            onClick={this.handleBack}
            className="flex cursor-pointer items-center gap-[8px] border-none bg-transparent p-0 text-primary"
          >
            <ChevronLeftIcon size="20px" />
            <span className="text-[16px] font-bold">创建人设资料</span>
          </button>
        </div>

        <div className="flex flex-1 gap-[40px] p-[24px]">
          <div
            className="flex-1 rounded-[4px] bg-container p-[24px]"
            style={{ maxWidth: 600 }}
          >
            <div className="mb-[24px]">
              <FormLabel icon={<UserIcon size="14px" />} text="姓名" />
              <Input
                placeholder="请输入内容"
                value={formData.name}
                onChange={v => this.handleFormChange('name', v)}
                className="!h-[36px] !rounded-[2px] [&_.t-input]:!border-line"
              />
            </div>

            <div className="mb-[24px]">
              <FormLabel icon={<EditIcon size="14px" />} text="人设备注" />
              <Input
                placeholder="请输入内容"
                value={formData.remark}
                onChange={v => this.handleFormChange('remark', v)}
                className="!h-[36px] !rounded-[2px] [&_.t-input]:!border-line"
              />
            </div>

            <div className="mb-[24px] flex gap-[16px]">
              <div className="flex-1">
                <FormLabel icon={<CalendarIcon size="14px" />} text="年龄" />
                <DatePicker
                  placeholder="请选择日期"
                  className="!h-[36px] !w-full !rounded-[2px] [&_.t-input]:!h-[36px] [&_.t-input]:!border-line [&_.t-input]:!rounded-[2px]"
                />
              </div>
              <div className="flex-1">
                <FormLabel icon={<GenderMaleIcon size="14px" />} text="性别" />
                <Select
                  placeholder="请选择内容"
                  options={GENDER_OPTIONS}
                  className="!w-full [&_.t-select__trigger]:!h-[36px] [&_.t-input]:!rounded-[2px] [&_.t-input]:!border-line"
                />
              </div>
            </div>

            <div className="mb-[24px]">
              <FormLabel icon={<HomeIcon size="14px" />} text="家庭情况" />
              <textarea
                placeholder="请输入内容"
                value={formData.family}
                onChange={e => this.handleFormChange('family', e.target.value)}
                className="!h-[80px] w-full resize-y rounded-[2px] border border-solid border-line p-[8px] text-[14px] text-primary outline-none placeholder:text-secondary"
              />
            </div>

            <div className="mb-[24px]">
              <FormLabel icon={<WorkIcon size="14px" />} text="职业" />
              <Input
                placeholder="请输入内容"
                value={formData.occupation}
                onChange={v => this.handleFormChange('occupation', v)}
                className="!h-[36px] !rounded-[2px] [&_.t-input]:!border-line"
              />
            </div>

            <div className="mb-[24px]">
              <FormLabel icon={<FolderIcon size="14px" />} text="项目参与度" />
              <textarea
                placeholder="请输入内容"
                value={formData.participation}
                onChange={e =>
                  this.handleFormChange('participation', e.target.value)
                }
                className="!h-[80px] w-full resize-y rounded-[2px] border border-solid border-line p-[8px] text-[14px] text-primary outline-none placeholder:text-secondary"
              />
            </div>

            <div className="mt-[32px] flex justify-center">
              <Button
                theme="primary"
                className="!h-[36px] !w-[80px] !rounded-[2px]"
                onClick={this.handleSave}
              >
                保存
              </Button>
            </div>
          </div>

          <div className="flex-1 rounded-[4px] bg-container p-[24px]">
            <div className="mb-[16px] flex items-center gap-[8px]">
              <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-brand-light text-brand">
                <FileIcon size="14px" />
              </div>
              <span className="text-[16px] font-bold text-primary">
                智能导入
              </span>
            </div>

            <textarea
              placeholder={SMART_IMPORT_PLACEHOLDER}
              value={smartImportText}
              onChange={e => this.handleSmartImportTextChange(e.target.value)}
              className="h-[140px] w-full resize-y rounded-[4px] border border-solid border-brand p-[12px] text-[12px] leading-[1.5] text-secondary outline-none placeholder:text-secondary"
            />

            <div className="mt-[16px] flex justify-end">
              <Button
                theme="primary"
                className="!h-[36px] !w-[100px] !rounded-[2px]"
                onClick={this.handleSmartImport}
              >
                识别并导入
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render(): ReactElement {
    return (
      <div className="flex min-h-0 flex-1 bg-page">
        <SidebarMenu
          items={SIDEBAR_ITEMS}
          activeKey="persona"
          onItemClick={() => {}}
        />
        {this.renderContent()}
      </div>
    );
  }
}

export default KnowledgeScreen;
