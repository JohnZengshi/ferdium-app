import Lottie from 'lottie-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import {
  AddIcon,
  ChevronLeftIcon,
  EditIcon,
  FileIcon,
  HomeIcon,
  UserIcon,
  WorkIcon,
} from 'tdesign-icons-react';
import {
  Button,
  DatePicker,
  Input,
  Loading,
  MessagePlugin,
  Pagination,
  Select,
} from 'tdesign-react';
import { getAccessToken } from '../../agent-flow-cs/api/auth';
import { AGENT_FLOW_CS_BASE } from '../../agent-flow-cs/api/customInstance';
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
import aiThinkingAnimation from '../../assets/ai-thinking.json';
import {
  type SidebarItem,
  SidebarMenu,
} from '../../components/home/SidebarMenu';
import EmptyState from '../../components/ui/EmptyState';
import BookSparkleIcon from '../../components/ui/icons/BookSparkleIcon';
import RegenerateIcon from '../../components/ui/icons/RegenerateIcon';
import SparkleIcon from '../../components/ui/icons/SparkleIcon';
import { updateOnboardingStep } from '../../helpers/onboarding-helpers';
import { getApiKey } from '../../whatsapp-automation/api/auth';

const aiIllustration = 'assets/images/ai-illustration.png';

const QUICK_TAGS = [
  { key: 'female', labelKey: 'tagFemale' },
  { key: 'male', labelKey: 'tagMale' },
  { key: 'young', labelKey: 'tagYoung' },
  { key: 'business-1', labelKey: 'tagBusiness' },
  { key: 'travel', labelKey: 'tagTravel' },
  { key: 'food', labelKey: 'tagFood' },
  { key: 'social-1', labelKey: 'tagSocial' },
  { key: 'sea', labelKey: 'tagSoutheastAsia' },
  { key: 'west', labelKey: 'tagWestern' },
  { key: 'business-2', labelKey: 'tagBusiness' },
  { key: 'active', labelKey: 'tagActiveSocial' },
] as const;

const sleep = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

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
      "Persona profile contains your social account information. Once linked to an account, the digital employee will chat using the account's persona.",
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
  savingTitle: {
    id: 'knowledgeScreen.savingTitle',
    defaultMessage: '正在优化人设中',
  },
  savingDescription: {
    id: 'knowledgeScreen.savingDescription',
    defaultMessage: '正在整理并完善这份人设资料，请稍候片刻…',
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
    defaultMessage: 'Social Persona',
  },
  smartImportPlaceholder: {
    id: 'knowledgeScreen.smartImportPlaceholder',
    defaultMessage:
      'Paste text here to automatically recognize persona information\n\nExample: Nina is a 24-year-old unmarried female sales representative who is deeply involved in the entire project process, responsible for lead generation, client engagement, relationship management, needs analysis, product presentation, objection handling, and business negotiation, leading project signing and implementation.\n\nNina is a 24-year-old unmarried female sales representative...',
  },
  editPersona: {
    id: 'knowledgeScreen.editPersona',
    defaultMessage: 'Edit',
  },
  clickToSetAvatar: {
    id: 'knowledgeScreen.clickToSetAvatar',
    defaultMessage: 'Click to set avatar',
  },
  changeAvatar: {
    id: 'knowledgeScreen.changeAvatar',
    defaultMessage: 'Change Avatar',
  },
  emptyKeywordError: {
    id: 'knowledgeScreen.emptyKeywordError',
    defaultMessage: 'Please enter keyword description before generating',
  },
  noPersonasTitle: {
    id: 'knowledgeScreen.noPersonasTitle',
    defaultMessage: 'No Persona Profiles',
  },
  noPersonasDescription: {
    id: 'knowledgeScreen.noPersonasDescription',
    defaultMessage: 'Create your first persona profile to get started',
  },
  defaultRemarkFallback: {
    id: 'knowledgeScreen.defaultRemarkFallback',
    defaultMessage: 'remark persona',
  },
  completionRate: {
    id: 'knowledgeScreen.completionRate',
    defaultMessage: 'Profile Completion',
  },
  createTitle: {
    id: 'knowledgeScreen.createTitle',
    defaultMessage: 'Create',
  },
  editTitle: {
    id: 'knowledgeScreen.editTitle',
    defaultMessage: 'Edit',
  },
  personaAccountTitle: {
    id: 'knowledgeScreen.personaAccountTitle',
    defaultMessage: ' Persona Account',
  },
  profileTitle: {
    id: 'knowledgeScreen.profileTitle',
    defaultMessage: ' Profile',
  },
  heroDescription: {
    id: 'knowledgeScreen.heroDescription',
    defaultMessage:
      '输入关键词，AI 将自动生成完整的社交账号人设资料，你可以审核后保存。',
  },
  keywordDescription: {
    id: 'knowledgeScreen.keywordDescription',
    defaultMessage: 'Keyword Description',
  },
  keywordPlaceholder: {
    id: 'knowledgeScreen.keywordPlaceholder',
    defaultMessage:
      'e.g. 25-year-old female from the Philippines, enjoys travel and food, outgoing personality, sales deeply involved in the full project lifecycle, responsible for lead mining, client engagement, relationship management, needs analysis, product demos, objection handling, and business negotiation, leading project signing and implementation. After standardized project closure, hand off to after-sales for WhatsApp account use.',
  },
  quickTags: {
    id: 'knowledgeScreen.quickTags',
    defaultMessage: 'Quick Tags',
  },
  tagFemale: {
    id: 'knowledgeScreen.tagFemale',
    defaultMessage: 'Female',
  },
  tagMale: {
    id: 'knowledgeScreen.tagMale',
    defaultMessage: 'Male',
  },
  tagYoung: {
    id: 'knowledgeScreen.tagYoung',
    defaultMessage: 'Young',
  },
  tagBusiness: {
    id: 'knowledgeScreen.tagBusiness',
    defaultMessage: 'Business Style',
  },
  tagTravel: {
    id: 'knowledgeScreen.tagTravel',
    defaultMessage: 'Travel Enthusiast',
  },
  tagFood: {
    id: 'knowledgeScreen.tagFood',
    defaultMessage: 'Food Enthusiast',
  },
  tagSocial: {
    id: 'knowledgeScreen.tagSocial',
    defaultMessage: 'Social Enthusiast',
  },
  tagSoutheastAsia: {
    id: 'knowledgeScreen.tagSoutheastAsia',
    defaultMessage: 'Southeast Asia',
  },
  tagWestern: {
    id: 'knowledgeScreen.tagWestern',
    defaultMessage: 'Western',
  },
  tagActiveSocial: {
    id: 'knowledgeScreen.tagActiveSocial',
    defaultMessage: 'High Activity Social Account',
  },
  aiGenerate: {
    id: 'knowledgeScreen.aiGenerate',
    defaultMessage: 'AI One-Click Generate',
  },
  regenerate: {
    id: 'knowledgeScreen.regenerate',
    defaultMessage: 'Regenerate',
  },
  aiThinking: {
    id: 'knowledgeScreen.aiThinking',
    defaultMessage: 'AI is thinking hard...',
  },
  aiThinkingDesc: {
    id: 'knowledgeScreen.aiThinkingDesc',
    defaultMessage:
      'Generating name, birthday, occupation, family status, hobbies, social profile and more, creating your exclusive persona...',
  },
  sectionPersonaRemark: {
    id: 'knowledgeScreen.sectionPersonaRemark',
    defaultMessage: 'Persona Note',
  },
  remarkPlaceholder: {
    id: 'knowledgeScreen.remarkPlaceholder',
    defaultMessage: 'Enter internal notes about this persona...',
  },
  sectionBasicInfo: {
    id: 'knowledgeScreen.sectionBasicInfo',
    defaultMessage: 'Basic Information',
  },
  fieldName: {
    id: 'knowledgeScreen.fieldName',
    defaultMessage: 'Name',
  },
  fieldGender: {
    id: 'knowledgeScreen.fieldGender',
    defaultMessage: 'Gender',
  },
  fieldBirthday: {
    id: 'knowledgeScreen.fieldBirthday',
    defaultMessage: 'Birthday',
  },
  fieldAge: {
    id: 'knowledgeScreen.fieldAge',
    defaultMessage: 'Age',
  },
  fieldCountry: {
    id: 'knowledgeScreen.fieldCountry',
    defaultMessage: 'Country/Region',
  },
  fieldLanguage: {
    id: 'knowledgeScreen.fieldLanguage',
    defaultMessage: 'Language',
  },
  sectionLifeBackground: {
    id: 'knowledgeScreen.sectionLifeBackground',
    defaultMessage: 'Life Background',
  },
  fieldCity: {
    id: 'knowledgeScreen.fieldCity',
    defaultMessage: 'City',
  },
  fieldFamily: {
    id: 'knowledgeScreen.fieldFamily',
    defaultMessage: 'Family Status',
  },
  familyPlaceholder: {
    id: 'knowledgeScreen.familyPlaceholder',
    defaultMessage: 'e.g. Single, lives with a cat',
  },
  sectionCareerBackground: {
    id: 'knowledgeScreen.sectionCareerBackground',
    defaultMessage: 'Career & Project Background',
  },
  fieldOccupation: {
    id: 'knowledgeScreen.fieldOccupation',
    defaultMessage: 'Occupation',
  },
  fieldMainWork: {
    id: 'knowledgeScreen.fieldMainWork',
    defaultMessage: 'Main Work in Project',
  },
  mainWorkPlaceholder: {
    id: 'knowledgeScreen.mainWorkPlaceholder',
    defaultMessage:
      'e.g. Space currently has a strategic partnership with Kraken exchange, mainly responsible for team building and marketing on the Kraken exchange platform.',
  },
  sectionPersonaPhotos: {
    id: 'knowledgeScreen.sectionPersonaPhotos',
    defaultMessage: 'Persona Photos',
  },
  uploadPhoto: {
    id: 'knowledgeScreen.uploadPhoto',
    defaultMessage: 'Click to upload',
  },
  uploadPhotoHint: {
    id: 'knowledgeScreen.uploadPhotoHint',
    defaultMessage: 'Supports JPG, PNG format persona photos',
  },
  deletePersona: {
    id: 'knowledgeScreen.deletePersona',
    defaultMessage: 'Delete',
  },
  cancel: {
    id: 'knowledgeScreen.cancel',
    defaultMessage: 'Cancel',
  },
  confirmSave: {
    id: 'knowledgeScreen.confirmSave',
    defaultMessage: 'Save',
  },
  generateFailed: {
    id: 'knowledgeScreen.generateFailed',
    defaultMessage: 'Generation failed',
  },
  updateFailed: {
    id: 'knowledgeScreen.updateFailed',
    defaultMessage: 'Failed to update persona',
  },
  createFailed: {
    id: 'knowledgeScreen.createFailed',
    defaultMessage: 'Failed to create persona',
  },
  readStreamFailed: {
    id: 'knowledgeScreen.readStreamFailed',
    defaultMessage: 'Failed to read AI response',
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

const getGenderLabel = (
  gender: string,
  intl: ReturnType<typeof useIntl>,
): string => {
  switch (gender) {
    case 'male': {
      return intl.formatMessage(messages.male);
    }
    case 'female': {
      return intl.formatMessage(messages.female);
    }
    default: {
      return gender;
    }
  }
};

const digitalHumanToFormData = (
  digitalHuman: AppApiSchemasDigitalHumanResponse,
): FormData => {
  const config = digitalHuman.persona_config;

  // 尝试从 participation 或 project_work 字段读取
  const getParticipation = (): string => {
    if (!config || typeof config !== 'object') {
      return '';
    }
    // 先尝试 participation，如果没有则尝试 project_work
    const { participation, project_work: projectWork } = config;
    const value =
      participation !== undefined && participation !== null
        ? participation
        : projectWork;
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : '';
  };

  return {
    name: digitalHuman.name,
    remark: getConfigString(config, 'remark'),
    age: getConfigString(config, 'age'),
    gender: getConfigString(config, 'gender'),
    birthday: getConfigString(config, 'birthday'),
    country: getConfigString(config, 'country'),
    language: getConfigString(config, 'language'),
    city: getConfigString(config, 'city'),
    family: getConfigString(config, 'family'),
    occupation: getConfigString(config, 'occupation'),
    participation: getParticipation(),
  };
};

const buildPersonaPrompt = (
  data: FormData,
  intl: ReturnType<typeof useIntl>,
): string =>
  [
    `${intl.formatMessage(messages.fieldName)}：${data.name}`,
    `${intl.formatMessage(messages.sectionPersonaRemark)}：${data.remark}`,
    `${intl.formatMessage(messages.fieldAge)}：${data.age}`,
    `${intl.formatMessage(messages.fieldGender)}：${getGenderLabel(data.gender, intl)}`,
    `${intl.formatMessage(messages.fieldFamily)}：${data.family}`,
    `${intl.formatMessage(messages.fieldOccupation)}：${data.occupation}`,
    `${intl.formatMessage(messages.participation)}：${data.participation}`,
  ].join('；');

const buildDigitalHumanRequest = (
  data: FormData,
  intl: ReturnType<typeof useIntl>,
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
  persona_prompt: buildPersonaPrompt(data, intl),
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [streamProgress, setStreamProgress] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isGeneratedContentHighlighted, setIsGeneratedContentHighlighted] =
    useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const genderOptions = useMemo(
    () => [
      { label: intl.formatMessage(messages.male), value: 'male' },
      { label: intl.formatMessage(messages.female), value: 'female' },
    ],
    [intl],
  );

  const completionPercent = useMemo(() => {
    let percent = 0;

    if (formData.name.trim()) percent += 5;
    if (formData.gender.trim()) percent += 5;
    if (formData.birthday.trim()) percent += 5;
    if (formData.age.trim()) percent += 5;
    if (formData.country.trim()) percent += 5;
    if (formData.language.trim()) percent += 5;

    if (formData.city.trim()) percent += 10;
    if (formData.family.trim()) percent += 10;

    if (formData.occupation.trim()) percent += 20;
    if (formData.participation.trim()) percent += 30;

    return percent;
  }, [formData]);

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      {
        key: 'persona',
        label: intl.formatMessage(messages.socialAccountPersona),
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9.58366 3.33366C7.97283 3.33366 6.66699 4.6395 6.66699 6.25033C6.66699 7.86116 7.97283 9.16699 9.58366 9.16699C11.1945 9.16699 12.5003 7.86116 12.5003 6.25033C12.5003 4.6395 11.1945 3.33366 9.58366 3.33366ZM5.00032 6.25033C5.00032 3.71902 7.05235 1.66699 9.58366 1.66699C12.115 1.66699 14.167 3.71902 14.167 6.25033C14.167 8.78163 12.115 10.8337 9.58366 10.8337C7.05235 10.8337 5.00032 8.78163 5.00032 6.25033ZM6.66699 13.3337C4.82604 13.3337 3.33366 14.826 3.33366 16.667H10.042V18.3337L1.66699 18.3337L1.66699 16.667C1.66699 13.9056 3.90557 11.667 6.66699 11.667H10.0003V13.3337H6.66699Z"
              fill="var(--td-brand-color)"
            />
            <path
              d="M16.2503 10.6253V11.772C16.8461 11.9254 17.3774 12.2393 17.7954 12.6649L18.7891 12.0911L19.6225 13.5345L18.6294 14.1078C18.7082 14.3919 18.7503 14.6912 18.7503 15.0003C18.7503 15.3095 18.7082 15.6088 18.6294 15.8928L19.6225 16.4661L18.7891 17.9095L17.7954 17.3358C17.3774 17.7614 16.8461 18.0753 16.2503 18.2286V19.3753H14.5836V18.2286C13.9878 18.0753 13.4565 17.7614 13.0385 17.3358L12.0447 17.9095L11.2114 16.4661L12.2044 15.8928C12.1257 15.6088 12.0836 15.3095 12.0836 15.0003C12.0836 14.6912 12.1257 14.3919 12.2044 14.1078L11.2114 13.5345L12.0447 12.0911L13.0385 12.6649C13.4565 12.2393 13.9878 11.9254 14.5836 11.772V10.6253H16.2503ZM13.9576 14.1947C13.8255 14.4335 13.7503 14.7081 13.7503 15.0003C13.7503 15.2925 13.8255 15.5672 13.9576 15.8059L13.988 15.8587C14.2796 16.343 14.8104 16.667 15.4169 16.667C16.0235 16.667 16.5543 16.343 16.8459 15.8587L16.8763 15.806C17.0084 15.5672 17.0836 15.2925 17.0836 15.0003C17.0836 14.7081 17.0084 14.4335 16.8763 14.1947L16.8459 14.142C16.5543 13.6576 16.0235 13.3337 15.4169 13.3337C14.8104 13.3337 14.2796 13.6576 13.988 14.142L13.9576 14.1947Z"
              fill="var(--td-brand-color)"
            />
          </svg>
        ),
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

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

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
          gender: getGenderLabel(parsedFormData.gender, intl),
          occupation: parsedFormData.occupation,
          familyStatus: parsedFormData.family,
          participation: parsedFormData.participation,
          source: digitalHuman,
        };
      }),
    [digitalHumans, intl],
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
    setSelectedTags([]);
    setView('create');
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setHasGenerated(false);
    setStreamProgress(0);
  }, []);

  const handleBack = useCallback(() => {
    setView('list');
    setEditingId(null);
    setFormData(INITIAL_FORM_DATA);
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setHasGenerated(false);
    setStreamProgress(0);
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

  const handleTagToggle = useCallback((tagKey: string) => {
    setSelectedTags(prev =>
      prev.includes(tagKey)
        ? prev.filter(k => k !== tagKey)
        : [...prev, tagKey],
    );
  }, []);

  const handleSmartImport = useCallback(() => {
    const trimmedText = smartImportText.trim();
    if (!trimmedText) {
      MessagePlugin.error(intl.formatMessage(messages.emptyKeywordError));
      return;
    }

    if (isGenerating) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setStreamProgress(0);
    setIsGeneratedContentHighlighted(false);

    const markGenerationComplete = async (
      updates?: Record<string, string>,
    ): Promise<void> => {
      setStreamProgress(100);
      setHasGenerated(true);

      if (updates && Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }

      setIsGeneratedContentHighlighted(true);
      window.setTimeout(() => {
        setIsGeneratedContentHighlighted(false);
      }, 1800);
    };

    const url = `${AGENT_FLOW_CS_BASE.replace(/\/+$/, '')}/api/v1/digital-humans/generate`;

    const bearerToken = getAccessToken();
    const akgApiKey = getApiKey();
    const isAkgKey = bearerToken?.startsWith('wag_');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (!isAkgKey && bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }
    if (akgApiKey) {
      headers['X-AKG-Api-Key'] = akgApiKey;
    }

    fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        keywords: trimmedText,
        tags: selectedTags,
      }),
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new Error(
            `${intl.formatMessage(messages.generateFailed)} (${response.status}): ${errorBody || response.statusText}`,
          );
        }

        const reader = response.body?.getReader();
        if (!reader)
          throw new Error(intl.formatMessage(messages.readStreamFailed));

        const decoder = new TextDecoder();
        let buffer = '';

        const FIELD_MAP: Record<string, string> = {
          project_work: 'participation',
        };

        const VALID_FIELDS = new Set([
          'name',
          'remark',
          'age',
          'gender',
          'birthday',
          'country',
          'language',
          'city',
          'family',
          'occupation',
          'participation',
        ]);

        const readStream = (): Promise<void> => {
          if (controller.signal.aborted) {
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
          }
          return reader.read().then(({ done, value }) => {
            if (done) {
              return markGenerationComplete();
            }

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            const events: any[] = [];
            for (const line of lines) {
              if (line.startsWith('data:')) {
                const jsonStr = line.slice(5).trim();
                if (jsonStr) {
                  try {
                    events.push(JSON.parse(jsonStr));
                  } catch {
                    /* skip */
                  }
                }
              }
            }

            // delay between progress updates so React renders animation frames
            const processEvents = async () => {
              for (const data of events) {
                if (data.type === 'progress' && data.progress !== undefined) {
                  setStreamProgress(data.progress);
                  // eslint-disable-next-line no-await-in-loop
                  await sleep(80);
                }

                if (data.type === 'field') {
                  const formField = FIELD_MAP[data.field] ?? data.field;
                  if (VALID_FIELDS.has(formField)) {
                    const v =
                      data.value === undefined ? '' : String(data.value);
                    setFormData(prev => ({ ...prev, [formField]: v }));
                  }
                }

                // complete event — final full data override
                if (data.type === 'complete' && data.persona) {
                  const updates: Record<string, string> = {};
                  for (const [key, val] of Object.entries(data.persona)) {
                    const formField = FIELD_MAP[key] ?? key;
                    if (VALID_FIELDS.has(formField)) {
                      updates[formField] = String(val ?? '');
                    }
                  }
                  // eslint-disable-next-line no-await-in-loop
                  await markGenerationComplete(updates);
                  return 'done';
                }
              }

              return 'continue';
            };

            /* eslint-disable consistent-return */
            return processEvents().then(status => {
              if (status === 'done') {
                return;
              }

              return readStream();
            });
            /* eslint-enable consistent-return */
          });
        };

        return readStream();
      })
      .catch((error: Error) => {
        if (error.name === 'AbortError') return;
        MessagePlugin.error(
          error.message || intl.formatMessage(messages.generateFailed),
        );
      })
      .finally(() => {
        setIsGenerating(false);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      });
  }, [intl, isGenerating, smartImportText, selectedTags]);

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      await MessagePlugin.error(intl.formatMessage(messages.nameRequired));
      return;
    }

    setIsSaving(true);
    try {
      const request = buildDigitalHumanRequest(formData, intl);
      let isNewCreation = false;
      if (editingId) {
        const updateRequest: DigitalHumanUpdateRequest = request;
        const response =
          await updateDigitalHumanApiV1DigitalHumansDigitalHumanIdPut(
            editingId,
            updateRequest,
          );
        if (response.status !== 200) {
          throw new Error(intl.formatMessage(messages.updateFailed));
        }
      } else {
        const response =
          await createDigitalHumanApiV1DigitalHumansPost(request);
        if (response.status !== 200) {
          throw new Error(intl.formatMessage(messages.createFailed));
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
      <style>
        {`
          @keyframes knowledge-progress-glow {
            0% {
              transform: translateX(0);
              opacity: 0;
            }
            18% {
              opacity: 1;
            }
            100% {
              transform: translateX(420%);
              opacity: 0;
            }
          }
        `}
      </style>
      <SidebarMenu
        items={sidebarItems}
        activeKey="persona"
        onItemClick={() => {}}
      />
      {view === 'list' ? (
        <div className="p-[24px] w-full h-full">
          <div className="flex flex-col flex-1 min-w-0 h-full bg-container p-[32px] rounded-[6px]">
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

            {tableData.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState
                  imageSrc="./assets/images/empty-accounts.svg"
                  title={intl.formatMessage(messages.noPersonasTitle)}
                  description={intl.formatMessage(
                    messages.noPersonasDescription,
                  )}
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-[20px]">
                {tableData.map(record => (
                  <div
                    key={record.id}
                    className="flex h-[320px] w-[280px] flex-col items-center rounded-[12px] px-[20px] pt-[28px] shadow-kb-card [background:var(--td-bg-color-kb-card-bg)]"
                  >
                    <div className="flex h-[128px] w-[128px] items-center justify-center overflow-hidden rounded-full border-[4px] border-solid border-line bg-component shadow-[0_4px_12px_rgba(63,133,255,0.23)]">
                      {record.source.avatar_url ? (
                        <img
                          src={record.source.avatar_url}
                          alt={record.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_30%,#434E63_0%,#273043_42%,#111827_100%)] text-white">
                          <UserIcon size="64px" />
                        </div>
                      )}
                    </div>

                    <div className="mt-[20px] max-w-full text-center text-[20px] font-bold leading-[26px] text-primary">
                      {record.name}
                    </div>

                    <div className="mt-[8px] line-clamp-2 min-h-[40px] max-w-[220px] text-center text-[14px] font-normal leading-[20px] text-secondary">
                      {record.remark ||
                        intl.formatMessage(messages.defaultRemarkFallback)}
                    </div>

                    <div className="mt-[10px]">
                      <Button
                        theme="primary"
                        className="!h-[36px] !w-[96px] !rounded-[4px] !border-none !bg-brand !text-[14px] !font-medium hover:!bg-brand-hover"
                        onClick={() => handleEditPersona(record)}
                      >
                        <span className="text-[14px] font-medium text-white">
                          {intl.formatMessage(messages.editPersona)}
                        </span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
        </div>
      ) : (
        <div className="flex flex-1 flex-col bg-page">
          <div className="flex h-[48px] w-full items-center justify-between bg-container px-[16px] border-b border-solid border-line">
            <button
              type="button"
              onClick={handleBack}
              disabled={isSaving}
              className={`flex items-center gap-[8px] border-none bg-transparent p-0 text-primary ${
                isSaving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              }`}
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
              <span className="text-[12px] text-primary">
                {intl.formatMessage(messages.completionRate)}
              </span>
              <div className="h-[4px] w-[170px] rounded-full bg-component overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <span className="text-[12px] text-primary">
                {completionPercent}%
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-auto relative">
            {isSaving && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(15,23,42,0.18)] backdrop-blur-[3px]">
                <div className="mx-[24px] flex w-[360px] max-w-full flex-col items-center rounded-[16px] border border-solid border-[rgba(56,207,244,0.2)] bg-container px-[28px] py-[24px] text-center shadow-[0_24px_60px_rgba(29,107,255,0.18)]">
                  <div className="relative flex h-[72px] w-[72px] items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-brand-light animate-ping opacity-75" />
                    <div className="absolute inset-[10px] rounded-full bg-[rgba(56,207,244,0.18)]" />
                    <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-container shadow-[0_10px_30px_rgba(29,107,255,0.16)]">
                      <Loading loading size="small" />
                    </div>
                  </div>
                  <div className="mt-[16px] text-[18px] font-semibold text-primary">
                    {intl.formatMessage(messages.savingTitle)}
                  </div>
                  <div className="mt-[8px] text-[13px] leading-[22px] text-secondary">
                    {intl.formatMessage(messages.savingDescription)}
                  </div>
                  <div className="mt-[16px] flex items-center gap-[8px]">
                    {[0, 1, 2].map(index => (
                      <span
                        key={index}
                        className="h-[8px] w-[8px] rounded-full bg-brand animate-bounce"
                        style={{ animationDelay: `${index * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-1 items-start gap-[24px] p-[24px_32px] pb-[40px] bg-kb-surface">
              <div className="w-[517px] min-h-[781px] flex-[0_0_517px] flex flex-col gap-[16px]">
                <div className="relative flex min-h-[160px] items-start justify-between pl-[28px] pt-[34px]">
                  <div className="relative max-w-[65%]">
                    <div className="relative m-0 text-[28px] font-[600] leading-[36px]">
                      <span className="text-primary">
                        {editingId
                          ? intl.formatMessage(messages.editTitle)
                          : intl.formatMessage(messages.createTitle)}
                      </span>
                      <span className="text-brand">
                        {intl.formatMessage(messages.personaAccountTitle)}
                      </span>
                      <span className="text-primary">
                        {intl.formatMessage(messages.profileTitle)}
                      </span>
                      <SparkleIcon
                        size="12px"
                        className="absolute right-[-8px] top-[4px] text-brand"
                      />
                      <SparkleIcon
                        size="10px"
                        className="absolute right-[-18px] top-[14px] text-brand"
                      />
                    </div>
                    <p className="m-0 mt-[18px] max-w-[380px] text-[14px] font-normal leading-[22px] text-secondary whitespace-pre-line">
                      {intl.formatMessage(messages.heroDescription)}
                    </p>
                  </div>
                  <div className="absolute right-0 top-[25px]">
                    <img
                      src={aiIllustration}
                      alt=""
                      className="h-[130px] w-[145px] object-contain"
                    />
                  </div>
                </div>

                <div className="w-[517px] rounded-[8px] border border-solid border-line bg-container p-[20px_24px] box-border">
                  <div className="flex items-center gap-[8px]">
                    <FileIcon size="18px" className="text-brand" />
                    <span className="text-[16px] font-semibold text-primary">
                      {intl.formatMessage(messages.keywordDescription)}
                    </span>
                  </div>

                  <textarea
                    placeholder={intl.formatMessage(
                      messages.keywordPlaceholder,
                    )}
                    value={smartImportText}
                    onChange={e => handleSmartImportTextChange(e.target.value)}
                    className="mt-[16px] h-[102px] w-full resize-none rounded-[8px] border-none bg-secondary-container px-[16px] py-[14px] text-[12px] leading-[22px] text-primary outline-none placeholder:text-[12px] placeholder:font-normal placeholder:leading-[22px] placeholder:text-placeholder box-border"
                  />

                  <div className="mt-[16px]">
                    <div className="flex items-center gap-[8px]">
                      <EditIcon size="18px" className="text-brand" />
                      <span className="text-[14px] font-semibold text-primary">
                        {intl.formatMessage(messages.quickTags)}
                      </span>
                    </div>

                    <div className="mt-[12px] flex flex-wrap gap-x-[8px] gap-y-[8px]">
                      {QUICK_TAGS.map(tag => {
                        const isSelected = selectedTags.includes(tag.key);
                        return (
                          <button
                            key={tag.key}
                            type="button"
                            onClick={() => handleTagToggle(tag.key)}
                            className={`h-[28px] rounded-[4px] px-[12px] text-[12px] leading-[28px] border-none cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-brand-light text-brand'
                                : 'bg-component text-primary'
                            }`}
                          >
                            {intl.formatMessage(
                              messages[tag.labelKey as keyof typeof messages],
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-[20px] flex gap-[16px]">
                    <button
                      type="button"
                      onClick={handleSmartImport}
                      disabled={isGenerating}
                      className={`flex h-[40px] w-[271px] items-center justify-center gap-[14px] rounded-[4px] border-none transition-all ${
                        isGenerating
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:brightness-105 cursor-pointer'
                      }`}
                      style={{
                        background:
                          'linear-gradient(90deg, #1D6BFF 0%, #38CFF4 100%)',
                      }}
                    >
                      <BookSparkleIcon
                        size="22px"
                        className="text-white flex-shrink-0"
                      />
                      <span className="text-[14px] font-medium leading-none text-white">
                        {intl.formatMessage(messages.aiGenerate)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSmartImport}
                      disabled={!hasGenerated || isGenerating}
                      className={`group flex h-[40px] w-[158px] items-center justify-center gap-[8px] rounded-[4px] border border-solid transition-all ${
                        !hasGenerated || isGenerating
                          ? 'border-line bg-component opacity-40 cursor-not-allowed'
                          : 'border-line bg-container hover:border-brand cursor-pointer'
                      }`}
                    >
                      <RegenerateIcon
                        size="16px"
                        className={`flex-shrink-0 ${
                          !hasGenerated || isGenerating
                            ? 'text-placeholder'
                            : 'text-primary group-hover:text-brand'
                        }`}
                      />
                      <span
                        className={`text-[14px] font-medium leading-none ${
                          !hasGenerated || isGenerating
                            ? 'text-placeholder'
                            : 'text-primary group-hover:text-brand'
                        }`}
                      >
                        {intl.formatMessage(messages.regenerate)}
                      </span>
                    </button>
                  </div>
                </div>

                {isGenerating && (
                  <div className="w-[517px] h-[106px] rounded-[8px] border border-solid border-line bg-container p-[16px_24px] box-border">
                    <div className="flex h-full items-start gap-[16px]">
                      <div className="flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center rounded-[10px]">
                        <Lottie
                          animationData={aiThinkingAnimation}
                          loop
                          autoplay
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-[14px] font-semibold text-primary">
                          {intl.formatMessage(messages.aiThinking)}
                        </div>
                        <div className="mt-[4px] text-[12px] leading-[20px] text-secondary">
                          {intl.formatMessage(messages.aiThinkingDesc)}
                        </div>
                        <div className="mt-[8px] flex items-center gap-[8px]">
                          <div className="flex-1">
                            <div className="relative h-[8px] w-full overflow-hidden rounded-full bg-component">
                              <div
                                className="relative h-[8px] rounded-full transition-[width] duration-100 linear"
                                style={{
                                  width: `${Math.round(streamProgress)}%`,
                                  background:
                                    'linear-gradient(90deg, #2F6BFF 0%, #36D0F4 100%)',
                                }}
                              >
                                <span
                                  className="absolute inset-y-0 left-[-35%] w-[35%] -skew-x-12 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.25)_35%,rgba(255,255,255,0.92)_50%,rgba(255,255,255,0.25)_65%,rgba(255,255,255,0)_100%)]"
                                  style={{
                                    animation:
                                      'knowledge-progress-glow 1.35s ease-in-out infinite',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="text-[12px] text-primary whitespace-nowrap">
                            {Math.round(streamProgress)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`flex-1 min-w-[0] flex flex-col gap-[16px] transition-all duration-500 ease-out ${
                  isGeneratedContentHighlighted
                    ? 'translate-y-0 scale-[1.01]'
                    : 'translate-y-0 scale-100'
                }`}
              >
                <div
                  className={`rounded-[8px] border border-solid p-[16px] transition-all duration-500 ${
                    isGeneratedContentHighlighted
                      ? 'border-[rgba(56,207,244,0.55)] bg-[rgba(47,107,255,0.04)] shadow-[0_16px_36px_rgba(47,107,255,0.12)]'
                      : 'border-line bg-container'
                  }`}
                >
                  <div className="mb-[12px]">
                    <div className="flex items-center gap-[8px]">
                      <UserIcon size="18px" className="text-brand" />
                      <span className="text-[14px] font-semibold text-primary">
                        {intl.formatMessage(messages.sectionPersonaRemark)}
                      </span>
                    </div>
                  </div>
                  <textarea
                    placeholder={intl.formatMessage(messages.remarkPlaceholder)}
                    value={formData.remark}
                    onChange={e => handleFormChange('remark', e.target.value)}
                    className="h-[72px] w-full resize-none rounded-[4px] border border-solid border-component-border bg-container p-[10px_12px] text-[12px] leading-[20px] text-primary outline-none placeholder:text-placeholder"
                  />
                </div>

                <div
                  className={`rounded-[8px] border border-solid p-[16px] transition-all duration-500 delay-75 ${
                    isGeneratedContentHighlighted
                      ? 'border-[rgba(56,207,244,0.55)] bg-[rgba(47,107,255,0.04)] shadow-[0_16px_36px_rgba(47,107,255,0.12)]'
                      : 'border-line bg-container'
                  }`}
                >
                  <div className="flex items-center gap-[8px] mb-[12px]">
                    <UserIcon size="18px" className="text-brand" />
                    <span className="text-[14px] font-semibold text-primary">
                      {intl.formatMessage(messages.sectionBasicInfo)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-[24px] gap-y-[16px]">
                    <div>
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        {intl.formatMessage(messages.fieldName)}
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
                        {intl.formatMessage(messages.fieldGender)}
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
                        {intl.formatMessage(messages.fieldBirthday)}
                      </div>
                      <DatePicker
                        placeholder={intl.formatMessage(
                          messages.datePlaceholder,
                        )}
                        value={formData.birthday || undefined}
                        onChange={value => {
                          handleFormChange(
                            'birthday',
                            value ? String(value) : '',
                          );
                        }}
                        className="!h-[36px] !w-full [&_.t-input]:!border-component-border"
                      />
                    </div>
                    <div>
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        {intl.formatMessage(messages.fieldAge)}
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
                        {intl.formatMessage(messages.fieldCountry)}
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
                        {intl.formatMessage(messages.fieldLanguage)}
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

                <div
                  className={`rounded-[8px] border border-solid p-[16px] transition-all duration-500 delay-150 ${
                    isGeneratedContentHighlighted
                      ? 'border-[rgba(56,207,244,0.55)] bg-[rgba(47,107,255,0.04)] shadow-[0_16px_36px_rgba(47,107,255,0.12)]'
                      : 'border-line bg-container'
                  }`}
                >
                  <div className="flex items-center gap-[8px] mb-[12px]">
                    <HomeIcon size="18px" className="text-brand" />
                    <span className="text-[14px] font-semibold text-primary">
                      {intl.formatMessage(messages.sectionLifeBackground)}
                    </span>
                  </div>
                  <div className="space-y-[16px]">
                    <div className="w-[320px]">
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        {intl.formatMessage(messages.fieldCity)}
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
                        {intl.formatMessage(messages.fieldFamily)}
                      </div>
                      <textarea
                        placeholder={intl.formatMessage(
                          messages.familyPlaceholder,
                        )}
                        value={formData.family}
                        onChange={e =>
                          handleFormChange('family', e.target.value)
                        }
                        className="h-[72px] w-full resize-none rounded-[4px] border border-solid border-component-border bg-container p-[10px_12px] text-[12px] leading-[20px] text-primary outline-none placeholder:text-placeholder"
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={`rounded-[8px] border border-solid p-[16px] transition-all duration-500 delay-200 ${
                    isGeneratedContentHighlighted
                      ? 'border-[rgba(56,207,244,0.55)] bg-[rgba(47,107,255,0.04)] shadow-[0_16px_36px_rgba(47,107,255,0.12)]'
                      : 'border-line bg-container'
                  }`}
                >
                  <div className="flex items-center gap-[8px] mb-[12px]">
                    <WorkIcon size="18px" className="text-brand" />
                    <span className="text-[14px] font-semibold text-primary">
                      {intl.formatMessage(messages.sectionCareerBackground)}
                    </span>
                  </div>
                  <div className="space-y-[16px]">
                    <div className="w-[320px]">
                      <div className="mb-[6px] text-[12px] font-semibold text-primary">
                        {intl.formatMessage(messages.fieldOccupation)}
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
                        {intl.formatMessage(messages.fieldMainWork)}
                      </div>
                      <textarea
                        placeholder={intl.formatMessage(
                          messages.mainWorkPlaceholder,
                        )}
                        value={formData.participation}
                        onChange={e =>
                          handleFormChange('participation', e.target.value)
                        }
                        className="h-[72px] w-full resize-none rounded-[4px] border border-solid border-component-border bg-container p-[10px_12px] text-[12px] leading-[20px] text-primary outline-none placeholder:text-placeholder"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex w-full min-h-[64px] flex-shrink-0 items-center justify-end gap-[12px] border-t border-solid border-line bg-container px-[32px] box-border">
              <Button
                variant="outline"
                theme="default"
                className="!h-[32px] !w-[88px] !rounded-[4px] !bg-component !text-primary !border-none !text-[14px]"
                onClick={handleBack}
                disabled={isSaving}
              >
                {intl.formatMessage(messages.cancel)}
              </Button>
              <Button
                theme="primary"
                loading={isSaving}
                className="!h-[32px] !w-[88px] !rounded-[4px] !bg-brand !text-[14px]"
                onClick={handleSave}
              >
                {intl.formatMessage(messages.save)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeScreen;
