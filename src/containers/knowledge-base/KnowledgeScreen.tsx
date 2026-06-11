import { useCallback, useEffect, useMemo, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import {
  AddIcon,
  ChevronLeftIcon,
  EditIcon,
  FileIcon,
  FolderIcon,
  HomeIcon,
  UploadIcon,
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
              className="!h-[32px] !rounded-[3px] !bg-[#0F5FE8] hover:!bg-[#0B5FEA] !px-[14px]"
              onClick={handleCreate}
            >
              <div className="flex items-center gap-[6px]">
                <AddIcon size="14px" />
                <span className="text-[14px] font-normal">
                  {intl.formatMessage(messages.createPersonaProfile)}
                </span>
              </div>
            </Button>
            <span className="ml-[16px] text-[14px] text-[#8C8C8C]">
              {intl.formatMessage(messages.description)}
            </span>
          </div>

          {/* 卡片网格区域 */}
          <div className="flex flex-wrap gap-[24px]">
            {tableData.map(record => (
              <div
                key={record.id}
                className="flex flex-col items-center w-[262px] h-[300px] bg-[#F3F7FF] rounded-[9px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                {/* 头像区域 */}
                <div className="mt-[24px]">
                  {record.source.avatar_url ? (
                    <Avatar
                      size="120px"
                      image={record.source.avatar_url}
                      className="!border-[3px] !border-[#DDEBFF] !rounded-full"
                    />
                  ) : (
                    <div className="w-[120px] h-[120px] rounded-full bg-[#F2F2F2] flex flex-col items-center justify-center gap-[8px] cursor-pointer">
                      <UploadIcon size="24px" className="text-[#9E9E9E]" />
                      <span className="text-[13px] text-[#9E9E9E]">
                        {intl.formatMessage(messages.clickToSetAvatar)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 人设名称 */}
                <div className="mt-[23px] text-[18px] font-semibold text-[#222222] text-center max-w-[210px] truncate whitespace-nowrap overflow-hidden text-ellipsis">
                  {record.name}
                </div>

                {/* 描述信息 */}
                <div className="mt-[11px] text-[14px] text-[#4F4F4F] text-center max-w-[210px] truncate whitespace-nowrap overflow-hidden text-ellipsis">
                  {record.remark || '美国WhatsApp手机号的人设'}
                </div>

                {/* 编辑按钮 */}
                <div className="mt-[25px]">
                  <Button
                    theme="primary"
                    className="!w-[89px] !h-[32px] !rounded-[4px] !bg-[#0F5FE8] hover:!bg-[#0B5FEA]"
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
        <div className="flex flex-1 flex-col">
          <div className="flex h-[60px] items-center bg-container px-[24px]">
            <button
              type="button"
              onClick={handleBack}
              className="flex cursor-pointer items-center gap-[8px] border-none bg-transparent p-0 text-primary"
            >
              <ChevronLeftIcon size="20px" />
              <span className="text-[16px] font-bold">
                {intl.formatMessage(
                  editingId
                    ? messages.editPersonaProfile
                    : messages.createPersonaProfile,
                )}
              </span>
            </button>
          </div>

          <div className="flex flex-1 gap-[48px] p-[20px] pl-[80px] pr-[32px] bg-white">
            {/* 左侧区域：关键词描述 + 快速标签 + AI生成 */}
            <div className="flex-[0.36] min-w-[420px] max-w-[560px]">
              {/* 页面标题区 */}
              <div className="mb-[70px] flex items-start gap-[16px]">
                <h2 className="text-[34px] font-bold text-[#1677FF] leading-[44px] m-0">
                  人设账号
                </h2>
                <div className="w-[170px] h-[140px] rounded-[8px] bg-[#F0F5FF] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#86909C] text-[13px]">
                    蓝色 AI 资料插画占位
                  </span>
                </div>
              </div>

              {/* 关键词描述卡片 */}
              <div className="bg-white rounded-[8px] border border-solid border-[#E5E6EB] shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-[24px] mb-[16px]">
                <div className="flex items-center gap-[8px] h-[24px] mb-[18px]">
                  <FileIcon size="20px" className="text-[#1677FF]" />
                  <span className="text-[16px] font-semibold text-[#1F2329] leading-[22px]">
                    关键词描述
                  </span>
                </div>
                <textarea
                  placeholder="例：25岁女性，菲律宾人，喜欢旅游和美食，性格开朗，销售深度参与项目全流程，负责线索挖掘、客户对接、客情维护、需求梳理、产品讲解、异议处理及商务谈判，主导项目签约落地。标准化项目成交后衔接售后即可用于WhatsApp账号。"
                  value={smartImportText}
                  onChange={e => handleSmartImportTextChange(e.target.value)}
                  className="h-[148px] w-full resize-none rounded-[6px] border-none bg-[#F7F8FA] p-[18px] text-[14px] leading-[24px] text-[#1F2329] outline-none placeholder:text-[#A8ABB2]"
                />

                {/* 快速标签区 */}
                <div className="mt-[24px]">
                  <div className="flex items-center gap-[8px] h-[22px] mb-[16px]">
                    <EditIcon size="20px" className="text-[#1677FF]" />
                    <span className="text-[16px] font-semibold text-[#1F2329] leading-[22px]">
                      快速标签
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-[12px_14px]">
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
                          className={`h-[32px] px-[14px] rounded-[4px] border cursor-pointer text-[14px] leading-[32px] ${
                            isSelected
                              ? 'bg-[#E8F3FF] border-solid border-[#1677FF] text-[#1677FF]'
                              : 'bg-[#F2F3F5] border-transparent text-[#1F2329]'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 操作按钮区 */}
                <div className="mt-[24px] flex gap-[24px]">
                  <Button
                    theme="primary"
                    className="!w-[280px] !h-[42px] !rounded-[4px] !bg-gradient-to-r !from-[#1677FF] !to-[#25D6E8] hover:!opacity-90"
                    onClick={handleSmartImport}
                  >
                    <div className="flex items-center gap-[8px]">
                      <span className="text-[16px]">🪄</span>
                      <span className="text-[15px] font-medium">
                        AI一键生成
                      </span>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    theme="default"
                    className="!w-[200px] !h-[42px] !rounded-[4px] !border-[#E5E6EB] !text-[#4E5969]"
                  >
                    <div className="flex items-center gap-[8px]">
                      <span className="text-[16px] text-[#86909C]">↻</span>
                      <span className="text-[15px] font-normal">重新生成</span>
                    </div>
                  </Button>
                </div>
              </div>

              {/* AI生成进度卡片 */}
              <div className="bg-white rounded-[8px] border border-solid border-[#E5E6EB] shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-[28px_36px]">
                <div className="flex items-start gap-[24px]">
                  <div className="w-[50px] h-[50px] rounded-[12px] bg-gradient-to-br from-[#1677FF] to-[#25D6E8] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[24px]">🪄</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[15px] font-semibold text-[#1F2329] leading-[22px] mb-[6px]">
                      AI正在疯狂思考中....
                    </div>
                    <div className="text-[13px] text-[#86909C] leading-[20px] mb-[14px]">
                      正在生成姓名、生日、职业、家庭情况、兴趣爱好和社交资料等，打造专属于你的人设....
                    </div>
                    <div className="flex items-center gap-[12px]">
                      <div className="w-[360px] h-[6px] rounded-full bg-[#E5E6EB] overflow-hidden">
                        <div className="h-full w-[80%] bg-gradient-to-r from-[#1677FF] to-[#25D6E8] rounded-full" />
                      </div>
                      <span className="text-[14px] text-[#4E5969] flex-shrink-0">
                        80%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧区域：资料编辑区 */}
            <div className="flex-1 min-w-[640px]">
              {/* 人设备注 */}
              <div className="bg-white rounded-[8px] border border-solid border-[#E5E6EB] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-[24px] mb-[16px]">
                <div className="flex items-center justify-between h-[28px] mb-[18px]">
                  <div className="flex items-center gap-[8px]">
                    <UserIcon size="20px" className="text-[#1677FF]" />
                    <span className="text-[16px] font-semibold text-[#1F2329]">
                      人设备注
                    </span>
                  </div>
                  <Button
                    size="small"
                    variant="outline"
                    className="!bg-[#F0F5FF] !text-[#1677FF] !border-none !h-[32px] !px-[14px] !rounded-[4px]"
                  >
                    <div className="flex items-center gap-[4px]">
                      <span className="text-[15px]">🪄</span>
                      <span className="text-[14px]">AI填充</span>
                    </div>
                  </Button>
                </div>
                <textarea
                  placeholder="输入关于此人设的内部备注...."
                  value={formData.remark}
                  onChange={e => handleFormChange('remark', e.target.value)}
                  className="h-[94px] w-full resize-none rounded-[2px] border border-solid border-[#DCDCDC] p-[14px_16px] text-[14px] text-[#1F2329] outline-none placeholder:text-[#BFBFBF]"
                />
              </div>

              {/* 基础信息 */}
              <div className="bg-white rounded-[8px] border border-solid border-[#E5E6EB] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-[24px] mb-[16px]">
                <div className="flex items-center justify-between h-[28px] mb-[18px]">
                  <div className="flex items-center gap-[8px]">
                    <UsergroupIcon size="20px" className="text-[#1677FF]" />
                    <span className="text-[16px] font-semibold text-[#1F2329]">
                      基础信息
                    </span>
                  </div>
                  <Button
                    size="small"
                    variant="outline"
                    className="!bg-[#F0F5FF] !text-[#1677FF] !border-none !h-[32px] !px-[14px] !rounded-[4px]"
                  >
                    <div className="flex items-center gap-[4px]">
                      <span className="text-[15px]">🪄</span>
                      <span className="text-[14px]">AI优化</span>
                    </div>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-x-[56px] gap-y-[18px]">
                  <div>
                    <div className="block text-[14px] font-semibold text-[#1F2329] mb-[8px]">
                      姓名{' '}
                      <span className="text-[12px] font-normal text-[#4E5969]">
                        (Name)
                      </span>
                    </div>
                    <Input
                      placeholder={intl.formatMessage(
                        messages.inputPlaceholder,
                      )}
                      value={formData.name}
                      onChange={v => handleFormChange('name', v)}
                      className="!h-[42px] !rounded-[3px] [&_.t-input]:!border-[#DCDCDC]"
                    />
                  </div>
                  <div>
                    <div className="block text-[14px] font-semibold text-[#1F2329] mb-[8px]">
                      性别{' '}
                      <span className="text-[12px] font-normal text-[#4E5969]">
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
                      className="!w-full [&_.t-select__trigger]:!h-[42px] [&_.t-input]:!border-[#DCDCDC]"
                    />
                  </div>
                  <div>
                    <div className="block text-[14px] font-semibold text-[#1F2329] mb-[8px]">
                      出生日期{' '}
                      <span className="text-[12px] font-normal text-[#4E5969]">
                        (Birthday)
                      </span>
                    </div>
                    <DatePicker
                      placeholder={intl.formatMessage(messages.datePlaceholder)}
                      className="!h-[42px] !w-full [&_.t-input]:!border-[#DCDCDC]"
                    />
                  </div>
                  <div>
                    <div className="block text-[14px] font-semibold text-[#1F2329] mb-[8px]">
                      年龄{' '}
                      <span className="text-[12px] font-normal text-[#4E5969]">
                        (Age)
                      </span>
                    </div>
                    <Input
                      placeholder={intl.formatMessage(
                        messages.inputPlaceholder,
                      )}
                      value={formData.age}
                      onChange={v => handleFormChange('age', v)}
                      className="!h-[42px] !rounded-[3px] [&_.t-input]:!border-[#DCDCDC]"
                    />
                  </div>
                  <div>
                    <div className="block text-[14px] font-semibold text-[#1F2329] mb-[8px]">
                      国家/地区{' '}
                      <span className="text-[12px] font-normal text-[#4E5969]">
                        (Country)
                      </span>
                    </div>
                    <Input
                      placeholder={intl.formatMessage(
                        messages.inputPlaceholder,
                      )}
                      value={formData.country}
                      onChange={v => handleFormChange('country', v)}
                      className="!h-[42px] !rounded-[3px] [&_.t-input]:!border-[#DCDCDC]"
                    />
                  </div>
                  <div>
                    <div className="block text-[14px] font-semibold text-[#1F2329] mb-[8px]">
                      语言{' '}
                      <span className="text-[12px] font-normal text-[#4E5969]">
                        (Language)
                      </span>
                    </div>
                    <Input
                      placeholder={intl.formatMessage(
                        messages.inputPlaceholder,
                      )}
                      value={formData.language}
                      onChange={v => handleFormChange('language', v)}
                      className="!h-[42px] !rounded-[3px] [&_.t-input]:!border-[#DCDCDC]"
                    />
                  </div>
                </div>
              </div>

              {/* 生活背景 */}
              <div className="bg-white rounded-[8px] border border-solid border-[#E5E6EB] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-[24px] mb-[16px]">
                <div className="flex items-center justify-between h-[28px] mb-[18px]">
                  <div className="flex items-center gap-[8px]">
                    <HomeIcon size="20px" className="text-[#1677FF]" />
                    <span className="text-[16px] font-semibold text-[#1F2329]">
                      生活背景
                    </span>
                  </div>
                  <Button
                    size="small"
                    variant="outline"
                    className="!bg-[#F0F5FF] !text-[#1677FF] !border-none !h-[32px] !px-[14px] !rounded-[4px]"
                  >
                    <div className="flex items-center gap-[4px]">
                      <span className="text-[15px]">🪄</span>
                      <span className="text-[14px]">AI填充</span>
                    </div>
                  </Button>
                </div>
                <div className="space-y-[18px]">
                  <div>
                    <div className="block text-[14px] font-semibold text-[#1F2329] mb-[8px]">
                      所在城市{' '}
                      <span className="text-[12px] font-normal text-[#4E5969]">
                        (City)
                      </span>
                    </div>
                    <Input
                      placeholder={intl.formatMessage(
                        messages.inputPlaceholder,
                      )}
                      value={formData.city}
                      onChange={v => handleFormChange('city', v)}
                      className="!h-[42px] !rounded-[3px] [&_.t-input]:!border-[#DCDCDC]"
                    />
                  </div>
                  <div>
                    <div className="block text-[14px] font-semibold text-[#1F2329] mb-[8px]">
                      家庭情况{' '}
                      <span className="text-[12px] font-normal text-[#4E5969]">
                        (Family)
                      </span>
                    </div>
                    <textarea
                      placeholder="例：单身，与一只猫生活"
                      value={formData.family}
                      onChange={e => handleFormChange('family', e.target.value)}
                      className="h-[96px] w-full resize-none rounded-[3px] border border-solid border-[#DCDCDC] p-[14px] text-[14px] text-[#1F2329] outline-none placeholder:text-[#BFBFBF]"
                    />
                  </div>
                </div>
              </div>

              {/* 职业与项目背景 */}
              <div className="bg-white rounded-[8px] border border-solid border-[#E5E6EB] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-[24px] mb-[16px]">
                <div className="flex items-center justify-between h-[28px] mb-[18px]">
                  <div className="flex items-center gap-[8px]">
                    <WorkIcon size="20px" className="text-[#1677FF]" />
                    <span className="text-[16px] font-semibold text-[#1F2329]">
                      职业与项目背景
                    </span>
                  </div>
                  <Button
                    size="small"
                    variant="outline"
                    className="!bg-[#F0F5FF] !text-[#1677FF] !border-none !h-[32px] !px-[14px] !rounded-[4px]"
                  >
                    <div className="flex items-center gap-[4px]">
                      <span className="text-[15px]">🪄</span>
                      <span className="text-[14px]">AI填充</span>
                    </div>
                  </Button>
                </div>
                <div className="space-y-[18px]">
                  <div>
                    <div className="block text-[14px] font-semibold text-[#1F2329] mb-[8px]">
                      职业{' '}
                      <span className="text-[12px] font-normal text-[#4E5969]">
                        (Occupation)
                      </span>
                    </div>
                    <Input
                      placeholder={intl.formatMessage(
                        messages.inputPlaceholder,
                      )}
                      value={formData.occupation}
                      onChange={v => handleFormChange('occupation', v)}
                      className="!h-[42px] !rounded-[3px] [&_.t-input]:!border-[#DCDCDC]"
                    />
                  </div>
                  <div>
                    <div className="block text-[14px] font-semibold text-[#1F2329] mb-[8px]">
                      项目中的主要工作项目{' '}
                      <span className="text-[12px] font-normal text-[#4E5969]">
                        (Main work in project)
                      </span>
                    </div>
                    <textarea
                      placeholder="例：Space 目前与 Kraken 交易所有战略合作关系，主要在Kraken交易所平台上负责团队建设和市场营销。"
                      value={formData.participation}
                      onChange={e =>
                        handleFormChange('participation', e.target.value)
                      }
                      className="h-[94px] w-full resize-none rounded-[3px] border border-solid border-[#DCDCDC] p-[14px_16px] text-[14px] text-[#1F2329] outline-none placeholder:text-[#BFBFBF]"
                    />
                  </div>
                </div>
              </div>

              {/* 人设照片 */}
              <div className="bg-white rounded-[8px] border border-solid border-[#E5E6EB] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-[24px] mb-[16px]">
                <div className="flex items-center gap-[8px] h-[28px] mb-[18px]">
                  <FolderIcon size="20px" className="text-[#1677FF]" />
                  <span className="text-[16px] font-semibold text-[#1F2329]">
                    人设照片
                  </span>
                </div>
                <div className="flex flex-col gap-[12px]">
                  <button
                    type="button"
                    className="w-[128px] h-[128px] rounded-[2px] border border-dashed border-[#DCDCDC] bg-[#F7F8FA] flex flex-col items-center justify-center gap-[8px] cursor-pointer hover:border-[#1677FF]"
                  >
                    <span className="text-[30px] text-[#8C8C8C] leading-none font-light">
                      +
                    </span>
                    <span className="text-[12px] text-[#8C8C8C]">
                      点击上传图片
                    </span>
                  </button>
                  <span className="text-[12px] text-[#A8ABB2]">
                    支持上传JPG、PNG格式的人设照片
                  </span>
                </div>
              </div>

              {/* 保存按钮 */}
              <div className="flex justify-end">
                <Button
                  theme="primary"
                  loading={isSaving}
                  className="!h-[40px] !w-[120px] !rounded-[6px]"
                  onClick={handleSave}
                >
                  {intl.formatMessage(messages.save)}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeScreen;
