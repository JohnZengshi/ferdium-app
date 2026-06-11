import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { defineMessages, useIntl } from 'react-intl';
import {
  AddIcon,
  CalendarIcon,
  ChevronLeftIcon,
  EditIcon,
  FileIcon,
  FolderIcon,
  GenderMaleIcon,
  HomeIcon,
  UserIcon,
  UsergroupIcon,
  WorkIcon,
} from 'tdesign-icons-react';
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
  family: string;
  occupation: string;
  participation: string;
}

const INITIAL_FORM_DATA: FormData = {
  name: '',
  remark: '',
  age: '',
  gender: '',
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
    family: data.family,
    occupation: data.occupation,
    participation: data.participation,
  },
  persona_prompt: buildPersonaPrompt(data),
  status: 'active',
});

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
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);
    try {
      const response = await listDigitalHumansApiV1DigitalHumansGet();
      setDigitalHumans(response.data);
    } catch {
      await MessagePlugin.error(intl.formatMessage(messages.loadFailed));
    } finally {
      setIsLoading(false);
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

  const pagedTableData = useMemo(
    () => tableData.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, pageSize, tableData],
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

  const handleView = useCallback((record: PersonaRecord) => {
    setEditingId(record.id);
    setFormData(digitalHumanToFormData(record.source));
    setView('create');
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

  const columns: PrimaryTableCol<PersonaRecord>[] = useMemo(
    () => [
      {
        colKey: 'index',
        title: intl.formatMessage(messages.serialNumber),
        width: 80,
        align: 'center',
      },
      {
        colKey: 'remark',
        title: intl.formatMessage(messages.personaRemark),
        width: 220,
        ellipsis: true,
      },
      {
        colKey: 'name',
        title: intl.formatMessage(messages.name),
        width: 140,
        ellipsis: true,
      },
      {
        colKey: 'age',
        title: intl.formatMessage(messages.age),
        width: 100,
      },
      {
        colKey: 'gender',
        title: intl.formatMessage(messages.gender),
        width: 100,
      },
      {
        colKey: 'occupation',
        title: intl.formatMessage(messages.occupation),
        width: 140,
      },
      {
        colKey: 'familyStatus',
        title: intl.formatMessage(messages.familyStatus),
        width: 120,
      },
      {
        colKey: 'participation',
        title: intl.formatMessage(messages.participation),
        width: 120,
      },
      {
        colKey: 'op',
        title: intl.formatMessage(messages.actions),
        width: 140,
        fixed: 'right',
        // eslint-disable-next-line react/no-unstable-nested-components
        cell: ({ row }) => (
          <div className="flex items-center gap-[16px]">
            <button
              type="button"
              className="cursor-pointer border-none bg-transparent p-0 text-[14px] text-brand hover:underline"
              onClick={() => handleView(row)}
            >
              {intl.formatMessage(messages.view)}
            </button>
            <button
              type="button"
              className="cursor-pointer border-none bg-transparent p-0 text-[14px] text-brand hover:underline"
              onClick={() => handleEditPersona(row)}
            >
              {intl.formatMessage(messages.edit)}
            </button>
          </div>
        ),
      },
    ],
    [intl, handleView, handleEditPersona],
  );

  return (
    <div className="flex min-h-0 flex-1 bg-page">
      <SidebarMenu
        items={sidebarItems}
        activeKey="persona"
        onItemClick={() => {}}
      />
      {view === 'list' ? (
        <div className="flex-1 min-w-0 p-[24px]">
          <div className="rounded-[4px] bg-container p-[24px]">
            <div className="flex items-center">
              <Button
                theme="primary"
                className="!h-[32px] !rounded-[2px] !px-[12px]"
                onClick={handleCreate}
              >
                <div className="flex items-center gap-[8px]">
                  <AddIcon />
                  <span>
                    {intl.formatMessage(messages.createPersonaProfile)}
                  </span>
                </div>
              </Button>
              <span className="ml-[12px] text-[12px] text-secondary">
                {intl.formatMessage(messages.description)}
              </span>
            </div>

            <div className="mt-[24px]">
              <Table
                data={pagedTableData}
                columns={columns}
                rowKey="id"
                loading={isLoading}
                bordered
                hover
                stripe={false}
                tableLayout="fixed"
                resizable
                lazyLoad
                className="[&_.t-table__header]:!bg-secondary-container [&_.t-table__header-th]:!h-[40px] [&_.t-table__header-th]:!border-b [&_.t-table__header-th]:!border-solid [&_.t-table__header-th]:!border-line [&_.t-table__header-th]:!text-[14px] [&_.t-table__header-th]:!font-normal [&_.t-table__header-th]:!text-primary [&_.t-table__body-td]:!h-[56px] [&_.t-table__body-td]:!border-b [&_.t-table__body-td]:!border-solid [&_.t-table__body-td]:!border-line [&_.t-table__body-td]:!p-0"
              />
            </div>

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
          </div>
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

          <div className="flex flex-1 gap-[40px] p-[24px]">
            <div className="max-w-[600px] flex-1 rounded-[4px] bg-container p-[24px]">
              <div className="mb-[24px]">
                <FormLabel
                  icon={<UserIcon size="14px" />}
                  text={intl.formatMessage(messages.name)}
                />
                <Input
                  placeholder={intl.formatMessage(messages.inputPlaceholder)}
                  value={formData.name}
                  onChange={v => handleFormChange('name', v)}
                  className="!h-[36px] !rounded-[2px] [&_.t-input]:!border-line"
                />
              </div>

              <div className="mb-[24px]">
                <FormLabel
                  icon={<EditIcon size="14px" />}
                  text={intl.formatMessage(messages.personaRemark)}
                />
                <Input
                  placeholder={intl.formatMessage(messages.inputPlaceholder)}
                  value={formData.remark}
                  onChange={v => handleFormChange('remark', v)}
                  className="!h-[36px] !rounded-[2px] [&_.t-input]:!border-line"
                />
              </div>

              <div className="mb-[24px] flex gap-[16px]">
                <div className="flex-1">
                  <FormLabel
                    icon={<CalendarIcon size="14px" />}
                    text={intl.formatMessage(messages.age)}
                  />
                  <DatePicker
                    placeholder={intl.formatMessage(messages.datePlaceholder)}
                    value={formData.age}
                    onChange={value =>
                      handleFormChange('age', String(value ?? ''))
                    }
                    className="!h-[36px] !w-full !rounded-[2px] [&_.t-input]:!h-[36px] [&_.t-input]:!border-line [&_.t-input]:!rounded-[2px]"
                  />
                </div>
                <div className="flex-1">
                  <FormLabel
                    icon={<GenderMaleIcon size="14px" />}
                    text={intl.formatMessage(messages.gender)}
                  />
                  <Select
                    placeholder={intl.formatMessage(messages.selectPlaceholder)}
                    options={genderOptions}
                    value={formData.gender}
                    onChange={value =>
                      handleFormChange('gender', String(value ?? ''))
                    }
                    className="!w-full [&_.t-select__trigger]:!h-[36px] [&_.t-input]:!rounded-[2px] [&_.t-input]:!border-line"
                  />
                </div>
              </div>

              <div className="mb-[24px]">
                <FormLabel
                  icon={<HomeIcon size="14px" />}
                  text={intl.formatMessage(messages.familyStatus)}
                />
                <textarea
                  placeholder={intl.formatMessage(messages.inputPlaceholder)}
                  value={formData.family}
                  onChange={e => handleFormChange('family', e.target.value)}
                  className="!h-[80px] w-full resize-y rounded-[2px] border border-solid border-line bg-special-component p-[8px] text-[14px] text-primary outline-none placeholder:text-secondary"
                />
              </div>

              <div className="mb-[24px]">
                <FormLabel
                  icon={<WorkIcon size="14px" />}
                  text={intl.formatMessage(messages.occupation)}
                />
                <Input
                  placeholder={intl.formatMessage(messages.inputPlaceholder)}
                  value={formData.occupation}
                  onChange={v => handleFormChange('occupation', v)}
                  className="!h-[36px] !rounded-[2px] [&_.t-input]:!border-line"
                />
              </div>

              <div className="mb-[24px]">
                <FormLabel
                  icon={<FolderIcon size="14px" />}
                  text={intl.formatMessage(messages.participation)}
                />
                <textarea
                  placeholder={intl.formatMessage(messages.inputPlaceholder)}
                  value={formData.participation}
                  onChange={e =>
                    handleFormChange('participation', e.target.value)
                  }
                  className="!h-[80px] w-full resize-y rounded-[2px] border border-solid border-line bg-special-component p-[8px] text-[14px] text-primary outline-none placeholder:text-secondary"
                />
              </div>

              <div className="mt-[32px] flex justify-center">
                <Button
                  theme="primary"
                  loading={isSaving}
                  className="!h-[36px] !w-[80px] !rounded-[2px]"
                  onClick={handleSave}
                >
                  {intl.formatMessage(messages.save)}
                </Button>
              </div>
            </div>

            <div className="flex-1 rounded-[4px] bg-container p-[24px]">
              <div className="mb-[16px] flex items-center gap-[8px]">
                <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-brand-light text-brand">
                  <FileIcon size="14px" />
                </div>
                <span className="text-[16px] font-bold text-primary">
                  {intl.formatMessage(messages.smartImport)}
                </span>
              </div>

              <textarea
                placeholder={intl.formatMessage(
                  messages.smartImportPlaceholder,
                )}
                value={smartImportText}
                onChange={e => handleSmartImportTextChange(e.target.value)}
                className="h-[140px] w-full resize-y rounded-[4px] border border-solid border-brand bg-special-component p-[12px] text-[12px] leading-[1.5] text-secondary outline-none placeholder:text-secondary"
              />

              <div className="mt-[16px] flex justify-end">
                <Button
                  theme="primary"
                  className="!h-[36px] !w-[100px] !rounded-[2px]"
                  onClick={handleSmartImport}
                >
                  {intl.formatMessage(messages.smartImportAndRecognize)}
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
