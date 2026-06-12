import { useCallback, useEffect, useMemo, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import {
  AddIcon,
  ChevronLeftIcon,
  EditIcon,
  FileIcon,
  FolderIcon,
  HomeIcon,
  UserIcon,
  UsergroupIcon,
  WorkIcon,
} from 'tdesign-icons-react';
import {
  Avatar,
  Button,
  DatePicker,
  Input,
  MessagePlugin,
  Pagination,
  Select,
} from 'tdesign-react';
import type {
  AppApiSchemasDigitalHumanResponse,
  DigitalHumanCreateRequest,
  DigitalHumanUpdateRequest,
} from '../../agent-flow-cs/api/generated/agentFlowCs.schemas';
import {
  createDigitalHumanApiV1DigitalHumansPost,
  listDigitalHumansApiV1DigitalHumansGet,
  updateDigitalHumanApiV1DigitalHumansDigitalHumanIdPut,
} from '../../agent-flow-cs/api/generated/digital-humans/digital-humans';
import {
  type SidebarItem,
  SidebarMenu,
} from '../../components/home/SidebarMenu';
import { updateOnboardingStep } from '../../helpers/onboarding-helpers';

const aiIllustration = 'assets/images/ai-illustration.png';
const aiStars = 'assets/images/ai-stars.png';

const messages = defineMessages({
  createPersonaProfile: {
    id: 'knowledgeScreen.createPersonaProfile',
    defaultMessage: 'Create Persona Profile',
  },
  editPersonaProfile: {
    id: 'knowledgeScreen.editPersonaProfile',
    defaultMessage: 'Edit Persona Profile',
  },
  serialNumber: {
    id: 'knowledgeScreen.serialNumber',
    defaultMessage: 'No.',
  },
  personaRemark: {
    id: 'knowledgeScreen.personaRemark',
    defaultMessage: 'Persona Note',
  },
  name: {
    id: 'knowledgeScreen.name',
    defaultMessage: 'Name',
  },
  age: {
    id: 'knowledgeScreen.age',
    defaultMessage: 'Age',
  },
  gender: {
    id: 'knowledgeScreen.gender',
    defaultMessage: 'Gender',
  },
  occupation: {
    id: 'knowledgeScreen.occupation',
    defaultMessage: 'Occupation',
  },
  familyStatus: {
    id: 'knowledgeScreen.familyStatus',
    defaultMessage: 'Family Status',
  },
  participation: {
    id: 'knowledgeScreen.participation',
    defaultMessage: 'Project Involvement',
  },
  actions: {
    id: 'knowledgeScreen.actions',
    defaultMessage: 'Actions',
  },
  view: {
    id: 'knowledgeScreen.view',
    defaultMessage: 'View',
  },
  edit: {
    id: 'knowledgeScreen.edit',
    defaultMessage: 'Edit',
  },
  description: {
    id: 'knowledgeScreen.description',
    defaultMessage:
      '人设资料是您社交账号的信息资料，与账号绑定后，数字员工会以账号的人设进行聊天',
  },
  inputPlaceholder: {
    id: 'knowledgeScreen.inputPlaceholder',
    defaultMessage: 'Please enter',
  },
  datePlaceholder: {
    id: 'knowledgeScreen.datePlaceholder',
    defaultMessage: 'Select a date',
  },
  selectPlaceholder: {
    id: 'knowledgeScreen.selectPlaceholder',
    defaultMessage: 'Select an option',
  },
  save: {
    id: 'knowledgeScreen.save',
    defaultMessage: 'Save',
  },
  smartImport: {
    id: 'knowledgeScreen.smartImport',
    defaultMessage: 'Smart Import',
  },
  smartImportAndRecognize: {
    id: 'knowledgeScreen.smartImportAndRecognize',
    defaultMessage: 'Recognize & Import',
  },
  smartImportSuccess: {
    id: 'knowledgeScreen.smartImportSuccess',
    defaultMessage: 'Smart import successful',
  },
  saveSuccess: {
    id: 'knowledgeScreen.saveSuccess',
    defaultMessage: 'Saved successfully',
  },
  loadFailed: {
    id: 'knowledgeScreen.loadFailed',
    defaultMessage: 'Failed to load persona list',
  },
  saveFailed: {
    id: 'knowledgeScreen.saveFailed',
    defaultMessage: 'Save failed',
  },
  nameRequired: {
    id: 'knowledgeScreen.nameRequired',
    defaultMessage: 'Please enter a name',
  },
  male: {
    id: 'knowledgeScreen.male',
    defaultMessage: 'Male',
  },
  female: {
    id: 'knowledgeScreen.female',
    defaultMessage: 'Female',
  },
  socialAccountPersona: {
    id: 'knowledgeScreen.socialAccountPersona',
    defaultMessage: 'Social Account Persona',
  },
  smartImportPlaceholder: {
    id: 'knowledgeScreen.smartImportPlaceholder',
    defaultMessage:
      '输入文本到此处，将自动识别人设信息\n\n例：Amy，是一个24未婚未育的女销售，销售深度参与项目全流程，负责线索挖掘、客户对接、客情维护、需求梳理、产品讲解、异议处理及商务谈判，主导项目签约落地。标准化项目成交后衔接售后即可；企业级 / 大客户项目需持续跟进交付、验收与长期合作维护。销售为项目客户侧第一责任人，统筹对外沟通与商务推进。\n\nAmy，是一个24未婚未育的女销售，销售深度参与项目全流程，负责线索挖掘、客户对接...',
  },
  editPersona: {
    id: 'knowledgeScreen.editPersona',
    defaultMessage: '编辑人设',
  },
  clickToSetAvatar: {
    id: 'knowledgeScreen.clickToSetAvatar',
    defaultMessage: '点击设置头像',
  },
  changeAvatar: {
    id: 'knowledgeScreen.changeAvatar',
    defaultMessage: '更换头像',
  },
});

interface PersonaRecord {
  id: string;
  index: number;
  remark: string;
  name: string;
  age: string;
  gender: string;
  occupation: string;
  familyStatus: string;
  participation: string;
  source: AppApiSchemasDigitalHumanResponse;
}

interface FormData {
  name: string;
  remark: string;
  age: string;
  gender: string;
  birthday: string;
  country: string;
  language: string;
  city: string;
  family: string;
  occupation: string;
  participation: string;
}

const INITIAL_FORM_DATA: FormData = {
  name: '',
  remark: '',
  age: '',
  gender: '',
  birthday: '',
  country: '',
  language: '',
  city: '',
  family: '',
  occupation: '',
  participation: '',
};

const getConfigString = (
  config: AppApiSchemasDigitalHumanResponse['persona_config'],
  key: keyof FormData,
): string => {
  if (!config || typeof config !== 'object') {
    return '';
  }

  const value = config[key];
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
};

const getGenderLabel = (gender: string): string => {
  switch (gender) {
    case 'male': {
      return '男';
    }
    case 'female': {
      return '女';
    }
    default: {
      return gender;
    }
  }
};

const digitalHumanToFormData = (
  digitalHuman: AppApiSchemasDigitalHumanResponse,
): FormData => ({
  name: digitalHuman.name,
  remark: getConfigString(digitalHuman.persona_config, 'remark'),
  age: getConfigString(digitalHuman.persona_config, 'age'),
  gender: getConfigString(digitalHuman.persona_config, 'gender'),
  birthday: getConfigString(digitalHuman.persona_config, 'birthday'),
  country: getConfigString(digitalHuman.persona_config, 'country'),
  language: getConfigString(digitalHuman.persona_config, 'language'),
  city: getConfigString(digitalHuman.persona_config, 'city'),
  family: getConfigString(digitalHuman.persona_config, 'family'),
  occupation: getConfigString(digitalHuman.persona_config, 'occupation'),
  participation: getConfigString(digitalHuman.persona_config, 'participation'),
});

const buildPersonaPrompt = (data: FormData): string =>
  [
    `姓名：${data.name}`,
    `人设备注：${data.remark}`,
    `年龄：${data.age}`,
    `性别：${getGenderLabel(data.gender)}`,
    `家庭情况：${data.family}`,
    `职业：${data.occupation}`,
    `项目参与度：${data.participation}`,
  ].join('；');

const buildDigitalHumanRequest = (
  data: FormData,
): DigitalHumanCreateRequest => ({
  name: data.name.trim(),
  persona_config: {
    remark: data.remark,
    age: data.age,
    gender: data.gender,
    birthday: data.birthday,
    country: data.country,
    language: data.language,
    city: data.city,
    family: data.family,
    occupation: data.occupation,
    participation: data.participation,
  },
  persona_prompt: buildPersonaPrompt(data),
  status: 'active',
});

const KnowledgeScreen: React.FC = () => {
  const intl = useIntl();

  const [view, setView] = useState<'list' | 'create'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [smartImportText, setSmartImportText] = useState('');
  const [digitalHumans, setDigitalHumans] = useState<
    AppApiSchemasDigitalHumanResponse[]
  >([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const genderOptions = useMemo(
    () => [
      { label: intl.formatMessage(messages.male), value: 'male' },
      { label: intl.formatMessage(messages.female), value: 'female' },
    ],
    [intl],
  );

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      {
        key: 'persona',
        label: intl.formatMessage(messages.socialAccountPersona),
        icon: <UsergroupIcon />,
      },
    ],
    [intl],
  );

  const fetchDigitalHumans = useCallback(async () => {
    try {
      const response = await listDigitalHumansApiV1DigitalHumansGet();
      setDigitalHumans(response.data);
    } catch {
      await MessagePlugin.error(intl.formatMessage(messages.loadFailed));
    }
  }, [intl]);

  useEffect(() => {
    fetchDigitalHumans();
  }, [fetchDigitalHumans]);

  const tableData = useMemo<PersonaRecord[]>(
    () =>
      digitalHumans.map((digitalHuman, index) => {
        const parsedFormData = digitalHumanToFormData(digitalHuman);
        return {
          id: digitalHuman.id,
          index: index + 1,
          remark: parsedFormData.remark,
          name: digitalHuman.name,
          age: parsedFormData.age,
          gender: getGenderLabel(parsedFormData.gender),
          occupation: parsedFormData.occupation,
          familyStatus: parsedFormData.family,
          participation: parsedFormData.participation,
          source: digitalHuman,
        };
      }),
    [digitalHumans],
  );

  const handlePageChange = useCallback(
    (pageInfo: { current: number; pageSize: number }) => {
      setCurrentPage(pageInfo.current);
      setPageSize(pageInfo.pageSize);
    },
    [],
  );

  const handleCreate = useCallback(() => {
    setEditingId(null);
    setFormData(INITIAL_FORM_DATA);
    setSmartImportText('');
    setView('create');
  }, []);

  const handleBack = useCallback(() => {
    setView('list');
    setEditingId(null);
    setFormData(INITIAL_FORM_DATA);
  }, []);

  const handleEditPersona = useCallback((record: PersonaRecord) => {
    setEditingId(record.id);
    setFormData(digitalHumanToFormData(record.source));
    setView('create');
  }, []);

  const handleFormChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSmartImportTextChange = useCallback((value: string) => {
    setSmartImportText(value);
  }, []);

  const handleSmartImport = useCallback(async () => {
    await MessagePlugin.success(
      intl.formatMessage(messages.smartImportSuccess),
    );
  }, [intl]);

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      await MessagePlugin.error(intl.formatMessage(messages.nameRequired));
      return;
    }

    setIsSaving(true);
    try {
      const request = buildDigitalHumanRequest(formData);
      let isNewCreation = false;
      if (editingId) {
        const updateRequest: DigitalHumanUpdateRequest = request;
        const response =
          await updateDigitalHumanApiV1DigitalHumansDigitalHumanIdPut(
            editingId,
            updateRequest,
          );
        if (response.status !== 200) {
          throw new Error('Failed to update digital human');
        }
      } else {
        const response =
          await createDigitalHumanApiV1DigitalHumansPost(request);
        if (response.status !== 200) {
          throw new Error('Failed to create digital human');
        }
        isNewCreation = true;
      }

      await MessagePlugin.success({
        content: intl.formatMessage(messages.saveSuccess),
        placement: 'bottom',
      });
      await fetchDigitalHumans();

      // Update onboarding progress when creating a new persona profile
      if (isNewCreation) {
        updateOnboardingStep(2, true);
      }

      handleBack();
    } catch {
      await MessagePlugin.error(intl.formatMessage(messages.saveFailed));
    } finally {
      setIsSaving(false);
    }
  }, [editingId, fetchDigitalHumans, formData, handleBack, intl]);

  return (
    <div className="flex min-h-0 flex-1 bg-page">
      <SidebarMenu
        items={sidebarItems}
        activeKey="persona"
        onItemClick={() => {}}
      />
      {view === 'list' ? (
        <div className="flex-1 min-w-0 p-[32px]">
          {/* 顶部区域：创建按钮 + 说明文字 */}
          <div className="flex items-center mb-[24px]">
            <Button
              theme="primary"
              className="!h-[32px] !rounded-[3px] !bg-brand hover:!bg-brand-hover !px-[14px]"
              onClick={handleCreate}
            >
              <div className="flex items-center gap-[6px]">
                <AddIcon size="14px" />
                <span className="text-[14px] font-normal">
                  {intl.formatMessage(messages.createPersonaProfile)}
                </span>
              </div>
            </Button>
            <span className="ml-[16px] text-[14px] text-placeholder">
              {intl.formatMessage(messages.description)}
            </span>
          </div>

          {/* 卡片网格区域 */}
          <div className="flex flex-wrap gap-[24px]">
            {tableData.map(record => (
              <div
                key={record.id}
                className="flex flex-col items-center w-[262px] h-[300px] bg-secondary-container rounded-[9px] shadow-sm"
              >
                {/* 头像区域 */}
                <div className="mt-[24px]">
                  {record.source.avatar_url ? (
                    <Avatar
                      size="120px"
                      image={record.source.avatar_url}
                      className="!border-[3px] !border-line !rounded-full"
                    />
                  ) : (
                    <Avatar
                      size="120px"
                      className="!border-[3px] !border-line !rounded-full !bg-brand !text-white !text-[48px] !font-semibold"
                    >
                      {record.name.charAt(0).toUpperCase()}
                    </Avatar>
                  )}
                </div>

                {/* 人设名称 */}
                <div className="mt-[23px] text-[18px] font-semibold text-primary text-center max-w-[210px] truncate whitespace-nowrap overflow-hidden text-ellipsis">
                  {record.name}
                </div>

                {/* 描述信息 */}
                <div className="mt-[11px] text-[14px] text-secondary text-center max-w-[210px] truncate whitespace-nowrap overflow-hidden text-ellipsis">
                  {record.remark || '美国WhatsApp手机号的人设'}
                </div>

                {/* 编辑按钮 */}
                <div className="mt-[25px]">
                  <Button
                    theme="primary"
                    className="!w-[89px] !h-[32px] !rounded-[4px] !bg-brand hover:!bg-brand-hover"
                    onClick={() => handleEditPersona(record)}
                  >
                    <span className="text-[14px] font-normal">
                      {intl.formatMessage(messages.editPersona)}
                    </span>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 分页器 */}
          {tableData.length > 0 && (
            <div className="mt-[24px] flex items-center justify-between">
              <Pagination
                total={tableData.length}
                pageSize={pageSize}
                current={currentPage}
                onChange={handlePageChange}
                showJumper
                showPageSize
                size="small"
                className="[&_.t-pagination__select]:!w-[100px]"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col bg-page">
          {/* 顶部导航栏 */}
          <div className="flex h-[48px] w-full items-center justify-between bg-container px-[16px] border-b border-solid border-line">
            <button
              type="button"
              onClick={handleBack}
              className="flex cursor-pointer items-center gap-[8px] border-none bg-transparent p-0 text-primary"
            >
              <ChevronLeftIcon size="14px" className="text-primary" />
              <span className="text-[14px] font-medium text-primary">
                {intl.formatMessage(
                  editingId
                    ? messages.editPersonaProfile
                    : messages.createPersonaProfile,
                )}
              </span>
            </button>
            <div className="flex items-center gap-[12px]">
              <span className="text-[12px] text-primary">资料完成度</span>
              <div className="h-[4px] w-[170px] rounded-full bg-component overflow-hidden">
                <div className="h-full w-[80%] rounded-full bg-brand" />
              </div>
              <span className="text-[12px] text-primary">80%</span>
            </div>
          </div>

          {/* 主体布局 */}
          <div className="flex flex-1 flex-col overflow-auto relative">
            <div className="flex flex-1 items-start gap-[24px] p-[24px_32px] pb-[40px]">
              {/* 左侧区域 */}
              <div className="w-[517px] min-h-[781px] flex-[0_0_517px] flex flex-col gap-[16px]">
                {/* Hero 标题区 */}
                <div className="flex h-[108px] items-center justify-between">
                  <div>
                    <h2 className="m-0 text-[24px] font-bold leading-[34px]">
                      <span className="text-primary">创建</span>
                      <span className="text-brand">人设账号</span>
                      <span className="text-primary">资料</span>
                    </h2>
                    <p className="m-0 mt-[4px] w-[260px] text-[12px] leading-[22px] text-secondary">
                      输入关键词，AI
                      将自动生成人设完整的社交账号人设资料，你可以审核后保存。
                    </p>
                  </div>
                  <img
                    src={aiIllustration}
                    alt="AI资料卡插画"
                    className="h-[96px] w-[128px] object-contain"
                  />
                </div>

                {/* 关键词生成卡片 */}
                <div className="w-[517px] rounded-[8px] border border-solid border-line bg-container p-[20px_24px] box-border">
                  <div className="flex items-center gap-[8px]">
                    <FileIcon size="18px" className="text-brand" />
                    <span className="text-[16px] font-semibold text-primary">
                      关键词描述
                    </span>
                  </div>

                  <textarea
                    placeholder="例：25岁女性，菲律宾人，喜欢旅游和美食，性格开朗，销售深度参与项目全流程，负责线索挖掘、客户对接、客情维护、需求梳理、产品讲解、异议处理及商务谈判，主导项目签约落地。标准化项目成交后衔接售后即可用于WhatsApp账号。"
                    value={smartImportText}
                    onChange={e => handleSmartImportTextChange(e.target.value)}
                    className="mt-[16px] h-[102px] w-full resize-none rounded-[8px] border-none bg-secondary-container px-[16px] py-[14px] text-[12px] leading-[22px] text-primary outline-none placeholder:text-[12px] placeholder:font-normal placeholder:leading-[22px] placeholder:text-placeholder box-border"
                  />

                  <div className="mt-[16px]">
                    <div className="flex items-center gap-[8px]">
                      <EditIcon size="18px" className="text-brand" />
                      <span className="text-[14px] font-semibold text-primary">
                        快速标签
                      </span>
                    </div>

                    <div className="mt-[12px] flex flex-wrap gap-x-[8px] gap-y-[8px]">
                      {[
                        '女性',
                        '男性',
                        '年轻人',
                        '商务风',
                        '旅行爱好者',
                        '美食爱好者',
                        '社交爱好者',
                        '东南亚',
                        '欧美',
                        '商务风',
                        '高活跃社交账号',
                        '社交爱好者',
                      ].map(tag => {
                        const isSelected = tag === '高活跃社交账号';
                        return (
                          <button
                            key={tag}
                            type="button"
                            className={`h-[28px] rounded-[4px] px-[12px] text-[12px] leading-[28px] border-none cursor-pointer ${
                              isSelected
                                ? 'bg-brand-light text-brand'
                                : 'bg-component text-primary'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-[20px] flex gap-[16px]">
                    <button
                      type="button"
                      onClick={handleSmartImport}
                      className="flex h-[40px] w-[271px] items-center justify-center gap-[8px] rounded-[4px] border-none hover:brightness-105 transition-all cursor-pointer"
                      style={{
                        background:
                          'linear-gradient(90deg, #1D6BFF 0%, #38CFF4 100%)',
                      }}
                    >
                      <FileIcon size="16px" className="text-white" />
                      <span className="text-[14px] font-medium leading-[20px] text-white">
                        AI一键生成
                      </span>
                    </button>
                    <button
                      type="button"
                      className="group flex h-[40px] w-[158px] items-center justify-center gap-[8px] rounded-[4px] border border-solid border-line bg-container hover:border-brand transition-all"
                    >
                      <span className="text-[16px] text-primary group-hover:text-brand">
                        ↻
                      </span>
                      <span className="text-[14px] font-medium leading-[20px] text-primary group-hover:text-brand">
                        重新生成
                      </span>
                    </button>
                  </div>
                </div>

                {/* AI 生成进度卡片 */}
                <div className="w-[517px] h-[106px] rounded-[8px] border border-solid border-line bg-container p-[16px_24px] box-border">
                  <div className="flex items-start gap-[16px]">
                    <div className="flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center rounded-[10px]">
                      <img
                        src={aiStars}
                        alt="AI生成中"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold text-primary">
                        AI正在疯狂思考中.....
                      </div>
                      <div className="mt-[4px] text-[12px] leading-[20px] text-secondary">
                        正在生成姓名、生日、职业、家庭情况、兴趣爱好和社交资料等，打造专属于你的人设.....
                      </div>
                      <div className="mt-[8px] flex items-center gap-[10px]">
                        <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-component">
                          <div className="h-full w-[80%] rounded-full bg-gradient-to-r from-[#2F6BFF] to-[#36D0F4]" />
                        </div>
                        <span className="text-[12px] text-primary">80%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧区域：资料编辑区 */}
              <div className="flex-1 min-w-[0] flex flex-col gap-[16px]">
                {/* 人设备注 */}
                <div className="bg-container rounded-[8px] border border-solid border-line p-[16px]">
                  <div className="flex items-center justify-between mb-[12px]">
                    <div className="flex items-center gap-[8px]">
                      <UserIcon size="18px" className="text-brand" />
                      <span className="text-[14px] font-semibold text-primary">
                        人设备注
                      </span>
                    </div>
                    <Button
                      size="small"
                      variant="outline"
                      className="!bg-brand-light !text-brand !border-none !h-[28px] !px-[12px] !rounded-[4px] !text-[12px]"
                    >
                      <span>🪄 AI填充</span>
                    </Button>
                  </div>
                  <textarea
                    placeholder="输入关于此人设的内部备注...."
                    value={formData.remark}
                    onChange={e => handleFormChange('remark', e.target.value)}
                    className="h-[72px] w-full resize-none rounded-[4px] border border-solid border-component-border bg-container p-[10px_12px] text-[12px] leading-[20px] text-primary outline-none placeholder:text-placeholder"
                  />
                </div>

                {/* 基础信息 */}
                <div className="bg-container rounded-[8px] border border-solid border-line p-[16px]">
                  <div className="flex items-center justify-between mb-[12px]">
                    <div className="flex items-center gap-[8px]">
                      <UsergroupIcon size="18px" className="text-brand" />
                      <span className="text-[14px] font-semibold text-primary">
                        基础信息
                      </span>
                    </div>
                    <Button
                      size="small"
                      variant="outline"
                      className="!bg-brand-light !text-brand !border-none !h-[28px] !px-[12px] !rounded-[4px] !text-[12px]"
                    >
                      <span>🪄 AI优化</span>
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-[24px] gap-y-[16px]">
                    <div>
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        姓名{' '}
                        <span className="font-normal text-secondary">
                          (Name)
                        </span>
                      </div>
                      <Input
                        placeholder={intl.formatMessage(
                          messages.inputPlaceholder,
                        )}
                        value={formData.name}
                        onChange={v => handleFormChange('name', v)}
                        className="!h-[36px] !rounded-[4px] [&_.t-input]:!border-component-border !text-[12px]"
                      />
                    </div>
                    <div>
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        性别{' '}
                        <span className="font-normal text-secondary">
                          (Gender)
                        </span>
                      </div>
                      <Select
                        placeholder={intl.formatMessage(
                          messages.selectPlaceholder,
                        )}
                        options={genderOptions}
                        value={formData.gender}
                        onChange={value =>
                          handleFormChange('gender', String(value ?? ''))
                        }
                        className="!w-full [&_.t-select__trigger]:!h-[36px] [&_.t-input]:!border-component-border"
                      />
                    </div>
                    <div>
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        出生日期{' '}
                        <span className="font-normal text-secondary">
                          (Birthday)
                        </span>
                      </div>
                      <DatePicker
                        placeholder={intl.formatMessage(
                          messages.datePlaceholder,
                        )}
                        className="!h-[36px] !w-full [&_.t-input]:!border-component-border"
                      />
                    </div>
                    <div>
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        年龄{' '}
                        <span className="font-normal text-secondary">
                          (Age)
                        </span>
                      </div>
                      <Input
                        placeholder={intl.formatMessage(
                          messages.inputPlaceholder,
                        )}
                        value={formData.age}
                        onChange={v => handleFormChange('age', v)}
                        className="!h-[36px] !rounded-[4px] [&_.t-input]:!border-component-border !text-[12px]"
                      />
                    </div>
                    <div>
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        国家/地区{' '}
                        <span className="font-normal text-secondary">
                          (Country)
                        </span>
                      </div>
                      <Input
                        placeholder={intl.formatMessage(
                          messages.inputPlaceholder,
                        )}
                        value={formData.country}
                        onChange={v => handleFormChange('country', v)}
                        className="!h-[36px] !rounded-[4px] [&_.t-input]:!border-component-border !text-[12px]"
                      />
                    </div>
                    <div>
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        语言{' '}
                        <span className="font-normal text-secondary">
                          (Language)
                        </span>
                      </div>
                      <Input
                        placeholder={intl.formatMessage(
                          messages.inputPlaceholder,
                        )}
                        value={formData.language}
                        onChange={v => handleFormChange('language', v)}
                        className="!h-[36px] !rounded-[4px] [&_.t-input]:!border-component-border !text-[12px]"
                      />
                    </div>
                  </div>
                </div>

                {/* 生活背景 */}
                <div className="bg-container rounded-[8px] border border-solid border-line p-[16px]">
                  <div className="flex items-center justify-between mb-[12px]">
                    <div className="flex items-center gap-[8px]">
                      <HomeIcon size="18px" className="text-brand" />
                      <span className="text-[14px] font-semibold text-primary">
                        生活背景
                      </span>
                    </div>
                    <Button
                      size="small"
                      variant="outline"
                      className="!bg-brand-light !text-brand !border-none !h-[28px] !px-[12px] !rounded-[4px] !text-[12px]"
                    >
                      <span>🪄 AI填充</span>
                    </Button>
                  </div>
                  <div className="space-y-[16px]">
                    <div className="w-[320px]">
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        所在城市{' '}
                        <span className="font-normal text-secondary">
                          (City)
                        </span>
                      </div>
                      <Input
                        placeholder={intl.formatMessage(
                          messages.inputPlaceholder,
                        )}
                        value={formData.city}
                        onChange={v => handleFormChange('city', v)}
                        className="!h-[36px] !rounded-[4px] [&_.t-input]:!border-component-border !text-[12px]"
                      />
                    </div>
                    <div>
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        家庭情况{' '}
                        <span className="font-normal text-secondary">
                          (Family)
                        </span>
                      </div>
                      <textarea
                        placeholder="例：单身，与一只猫生活"
                        value={formData.family}
                        onChange={e =>
                          handleFormChange('family', e.target.value)
                        }
                        className="h-[72px] w-full resize-none rounded-[4px] border border-solid border-component-border bg-container p-[10px_12px] text-[12px] leading-[20px] text-primary outline-none placeholder:text-placeholder"
                      />
                    </div>
                  </div>
                </div>

                {/* 职业与项目背景 */}
                <div className="bg-container rounded-[8px] border border-solid border-line p-[16px]">
                  <div className="flex items-center justify-between mb-[12px]">
                    <div className="flex items-center gap-[8px]">
                      <WorkIcon size="18px" className="text-brand" />
                      <span className="text-[14px] font-semibold text-primary">
                        职业与项目背景
                      </span>
                    </div>
                    <Button
                      size="small"
                      variant="outline"
                      className="!bg-brand-light !text-brand !border-none !h-[28px] !px-[12px] !rounded-[4px] !text-[12px]"
                    >
                      <span>🪄 AI填充</span>
                    </Button>
                  </div>
                  <div className="space-y-[16px]">
                    <div className="w-[320px]">
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        职业{' '}
                        <span className="font-normal text-secondary">
                          (Occupation)
                        </span>
                      </div>
                      <Input
                        placeholder={intl.formatMessage(
                          messages.inputPlaceholder,
                        )}
                        value={formData.occupation}
                        onChange={v => handleFormChange('occupation', v)}
                        className="!h-[36px] !rounded-[4px] [&_.t-input]:!border-component-border !text-[12px]"
                      />
                    </div>
                    <div>
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        项目中的主要工作项目{' '}
                        <span className="font-normal text-secondary">
                          (Main work in project)
                        </span>
                      </div>
                      <textarea
                        placeholder="例：Space 目前与 Kraken 交易所有战略合作关系，主要在Kraken交易所平台上负责团队建设和市场营销。"
                        value={formData.participation}
                        onChange={e =>
                          handleFormChange('participation', e.target.value)
                        }
                        className="h-[72px] w-full resize-none rounded-[4px] border border-solid border-component-border bg-container p-[10px_12px] text-[12px] leading-[20px] text-primary outline-none placeholder:text-placeholder"
                      />
                    </div>
                  </div>
                </div>

                {/* 人设照片 */}
                <div className="bg-container rounded-[8px] border border-solid border-line p-[16px]">
                  <div className="flex items-center gap-[8px] mb-[12px]">
                    <FolderIcon size="18px" className="text-brand" />
                    <span className="text-[14px] font-semibold text-primary">
                      人设照片
                    </span>
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    <button
                      type="button"
                      className="w-[96px] h-[96px] rounded-[2px] border border-dashed border-component-border bg-secondary-container flex flex-col items-center justify-center gap-[4px] cursor-pointer hover:border-brand"
                    >
                      <span className="text-[28px] text-placeholder leading-none font-light">
                        +
                      </span>
                      <span className="text-[12px] text-placeholder">
                        点击上传图片
                      </span>
                    </button>
                    <span className="text-[12px] text-placeholder">
                      支持上传JPG、PNG格式的人设照片
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部操作栏 */}
            <div className="sticky bottom-0 z-10 flex w-full min-h-[64px] flex-shrink-0 items-center justify-end gap-[12px] border-t border-solid border-line bg-container px-[32px] box-border">
              <Button
                variant="outline"
                theme="default"
                className="!h-[32px] !w-[88px] !rounded-[4px] !bg-component !text-primary !border-none !text-[14px]"
              >
                删除人设
              </Button>
              <Button
                theme="primary"
                loading={isSaving}
                className="!h-[32px] !w-[88px] !rounded-[4px] !bg-brand !text-[14px]"
                onClick={handleSave}
              >
                确认保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeScreen;
