import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import {
  AddIcon,
  RefreshIcon,
  UserIcon,
  ChevronRightIcon,
  WifiIcon,
  WifiOffIcon,
  ErrorCircleIcon,
  UsergroupIcon,
} from 'tdesign-icons-react';
import {
  Button,
  Switch,
  Progress,
  Badge,
  MessagePlugin,
  Dialog,
} from 'tdesign-react';
import { defineMessages, injectIntl, type WrappedComponentProps } from 'react-intl';
import type { RealStores } from '../../stores';
import { StepItem } from '../../components/home/StepItem';
import { SectionHeader } from '../../components/home/SectionHeader';
import StrategyConfigScreen from './StrategyConfigScreen';
import ResumeTab from './tabs/ResumeTab';

const employeeMonica = './assets/images/handover-assistant.png';
const employeeMike = './assets/images/sales-director.png';
const employeeAlice = './assets/images/emotional-companion.png';
const employeeLily = './assets/images/business-specialist.png';
const employeeAllen = './assets/images/risk-control-director.png';
const employeeAmy = './assets/images/user-operations.png';

interface HomeScreenProps {
  stores?: RealStores;
  history?: any;
}

type IHomeScreenProps = HomeScreenProps & WrappedComponentProps;

interface EmployeeResume {
  name: string;
  stageTags: string[];
  profile: string;
  reviews: { text: string; highlight?: string; suffix?: string }[];
  costLabel: string;
  costChartData: { label: string; value: number }[];
  costSummary: { label: string; value: string }[];
  efficiencyData: { label: string; value: number }[];
  coreCompetencies: {
    title: string;
    description: string;
    iconBg: string;
    iconText: string;
  }[];
  avatarSrc?: string;
  employeeRole?: string;
}

interface HomeScreenState {
  isAutoReply: boolean;
  viewMode: 'dashboard' | 'strategy';
  dialogEmployee: EmployeeResume | null;
}

const EMPLOYEE_RESUMES: Record<string, EmployeeResume> = {
  monica: {
    name: 'Monica',
    avatarSrc: './assets/images/monica.png',
    employeeRole: '高级销售专家',
    stageTags: [
      '身份质疑阶段',
      '产品异议阶段',
      '风险顾虑阶段',
      '数字员工回复',
      '投诉/退款阶段',
      '高意向转化阶段',
      '业务启动期',
      '快速扩张期',
      '生态融合与战略升级期',
    ],
    profile:
      'Monica 会持续监控所有会话，在识别到高风险、高异议、高价值或超出边界的问题时，自动触发预警并协助人工接管。',
    reviews: [
      {
        text: '客户转化率提升了',
        highlight: '12%',
        suffix: '，月均新增成交额超过2000w元',
      },
      {
        text: '满意度评分从85分提升至98.5分，客户复购率增长',
        highlight: '12倍',
      },
      {
        text: '累计处理客户咨询超过230w次，帮助企业节省人力成本',
        highlight: '41%',
      },
    ],
    costLabel: '成本节约（万元）',
    costChartData: [
      { label: '中小型企业', value: 80 },
      { label: '大型企业', value: 750 },
      { label: '超大型企业', value: 1500 },
    ],
    costSummary: [
      { label: '总成本节约', value: '12.6亿' },
      { label: '纠纷处理时长缩短', value: '67%' },
    ],
    efficiencyData: [
      { label: '节省客户工作时间', value: 82 },
      { label: '平均企业运营效率', value: 72 },
      { label: '流程自动化完成率', value: 95 },
      { label: '高风险拦截成功率', value: 99 },
    ],
    coreCompetencies: [
      {
        title: '风险识别',
        description: '实时监测会话内容，智能识别潜在风险和异常行为',
        iconBg: '#FFF1F0',
        iconText: '⚠',
      },
      {
        title: '边界控制',
        description: '严格限定数字员工的行为边界和权限范围',
        iconBg: '#E8F5FF',
        iconText: '◈',
      },
      {
        title: '人工接管触发',
        description: '当风险等级超过阈值时，自动触发人工接管流程',
        iconBg: '#FFF7E6',
        iconText: '◎',
      },
      {
        title: '高意向预警',
        description: '识别高意向客户并通知人工跟进，提升成交效率',
        iconBg: '#F0FFF0',
        iconText: '◆',
      },
      {
        title: '会话暂停控制',
        description: '在特定场景下自动暂停会话，等待人工介入处理',
        iconBg: '#F3F0FF',
        iconText: '■',
      },
    ],
  },
  mike: {
    name: 'Mike',
    avatarSrc: './assets/images/mike.png',
    employeeRole: '客户维护专员',
    stageTags: [
      '客户沉默期',
      '产品推荐期',
      '投诉升级期',
      '优惠敏感期',
      '竞品流失期',
    ],
    profile:
      'Mike 负责数字员工团队的日常维护管理，持续监测服务质量，在客户满意度下降或存在流失风险时自动预警。',
    reviews: [
      {
        text: '客户复购率提升',
        highlight: '23%',
        suffix: '，月均挽回流失客户超过150位',
      },
      {
        text: '客户满意度从78分提升至92分，投诉响应时间缩短',
        highlight: '65%',
      },
      { text: '累计完成客户回访超过80w次，客户留存率提升', highlight: '18%' },
    ],
    costLabel: '维护成本（万元）',
    costChartData: [
      { label: '小微企业', value: 30 },
      { label: '中型企业', value: 200 },
      { label: '大型集团', value: 800 },
    ],
    costSummary: [
      { label: '总计挽回营收', value: '8.3亿' },
      { label: '客户流失率降低', value: '42%' },
    ],
    efficiencyData: [
      { label: '客户回访完成率', value: 94 },
      { label: '投诉处理及时率', value: 88 },
      { label: '满意度调查覆盖率', value: 76 },
      { label: '流失预警准确率', value: 91 },
    ],
    coreCompetencies: [
      {
        title: '定期回访',
        description: '自动规划回访计划，定时触达客户维护关系',
        iconBg: '#FFF1F0',
        iconText: '🔔',
      },
      {
        title: '满意度调查',
        description: '自动发放调查问卷并分析结果',
        iconBg: '#E8F5FF',
        iconText: '📊',
      },
      {
        title: '流失预警',
        description: '根据行为模型预判客户流失风险',
        iconBg: '#FFF7E6',
        iconText: '⚠',
      },
      {
        title: '服务监测',
        description: '实时监测服务质量指标异常波动',
        iconBg: '#F0FFF0',
        iconText: '📈',
      },
      {
        title: '关怀提醒',
        description: '在关键节点自动发送关怀通知',
        iconBg: '#F3F0FF',
        iconText: '💌',
      },
    ],
  },
  alice: {
    name: 'Alice',
    avatarSrc: './assets/images/alice.png',
    employeeRole: '营销推广大使',
    stageTags: [
      '品牌认知期',
      '活动预热期',
      '社群运营期',
      '内容传播期',
      '转化收割期',
    ],
    profile:
      'Alice 具备精准社群触达能力，可根据客户画像智能匹配个性化营销内容，实现高效转化。',
    reviews: [
      {
        text: '营销活动点击率提升',
        highlight: '156%',
        suffix: '，单场活动平均转化率32%',
      },
      {
        text: '社群活跃度提升',
        highlight: '89%',
        suffix: '，用户留存率提高45%',
      },
      {
        text: '累计完成爆款文案超过1.2w篇，内容生产效率提升',
        highlight: '12倍',
      },
    ],
    costLabel: '营销投入（万元）',
    costChartData: [
      { label: '小型活动', value: 10 },
      { label: '中型活动', value: 80 },
      { label: '大型活动', value: 300 },
    ],
    costSummary: [
      { label: 'ROI平均值', value: '8.5x' },
      { label: '营销成本降低', value: '57%' },
    ],
    efficiencyData: [
      { label: '文案生成效率', value: 96 },
      { label: '社群触达精准度', value: 85 },
      { label: '活动效果分析速度', value: 78 },
      { label: '营销ROI提升', value: 92 },
    ],
    coreCompetencies: [
      {
        title: '爆款文案生成',
        description: '基于AIDA模型生成高转化营销文案',
        iconBg: '#FFF1F0',
        iconText: '✍',
      },
      {
        title: '精准社群触达',
        description: '根据用户画像精准匹配营销内容',
        iconBg: '#E8F5FF',
        iconText: '🎯',
      },
      {
        title: '活动效果分析',
        description: '多维度分析活动ROI与用户参与度',
        iconBg: '#FFF7E6',
        iconText: '📊',
      },
      {
        title: '内容矩阵管理',
        description: '统筹多平台内容发布与排期管理',
        iconBg: '#F0FFF0',
        iconText: '📋',
      },
      {
        title: '用户画像构建',
        description: '自动聚合用户行为数据构建标签体系',
        iconBg: '#F3F0FF',
        iconText: '👤',
      },
    ],
  },
  lily: {
    name: 'Lily',
    avatarSrc: './assets/images/lily.png',
    employeeRole: '售后支持专家',
    stageTags: [
      '售后咨询期',
      '退款处理期',
      '投诉升级期',
      '满意度回访期',
      '复购引导期',
    ],
    profile:
      'Lily 专注售后支持场景，可快速响应客户问题，自动匹配知识库解决方案，引导客户完成复杂业务流程。',
    reviews: [
      {
        text: '售后响应时间从15分钟缩短至',
        highlight: '45秒',
        suffix: '，客户满意度提升32%',
      },
      {
        text: '退款处理效率提升',
        highlight: '78%',
        suffix: '，处理时长从48小时缩短至6小时',
      },
      {
        text: '知识库匹配准确率高达',
        highlight: '94%',
        suffix: '，一线解决率提升至86%',
      },
    ],
    costLabel: '售后成本（万元）',
    costChartData: [
      { label: '小型企业', value: 20 },
      { label: '中型企业', value: 120 },
      { label: '大型企业', value: 500 },
    ],
    costSummary: [
      { label: '人工成本节约', value: '5.2亿' },
      { label: '售后处理时长缩短', value: '73%' },
    ],
    efficiencyData: [
      { label: '问题快速响应率', value: 97 },
      { label: '知识库匹配准确率', value: 94 },
      { label: '复杂流程引导完成率', value: 82 },
      { label: '客户回访完成率', value: 90 },
    ],
    coreCompetencies: [
      {
        title: '问题快速响应',
        description: '7×24小时在线，秒级响应客户售后问题',
        iconBg: '#FFF1F0',
        iconText: '⚡',
      },
      {
        title: '知识库自动对标',
        description: '智能匹配知识库解决方案并自动推送',
        iconBg: '#E8F5FF',
        iconText: '📚',
      },
      {
        title: '复杂流程引导',
        description: 'Step-by-Step引导客户完成业务操作',
        iconBg: '#FFF7E6',
        iconText: '🧭',
      },
      {
        title: '退款智能处理',
        description: '自动审核退款条件并触发处理流程',
        iconBg: '#F0FFF0',
        iconText: '💰',
      },
      {
        title: '复购智能引导',
        description: '在服务尾声自动推送复购提醒与优惠',
        iconBg: '#F3F0FF',
        iconText: '🔄',
      },
    ],
  },
  allen: {
    name: 'Allen',
    avatarSrc: './assets/images/allen.png',
    employeeRole: '线索收集助手',
    stageTags: [
      '信息搜集期',
      '线索筛选期',
      '客户触达期',
      '需求挖掘期',
      '转化跟进期',
    ],
    profile:
      'Allen 专注线索收集与清洗，可从全网多渠道抓取信息，自动识别关键联系人并进行初步洗选，提高销售团队效率。',
    reviews: [
      {
        text: '线索收集效率提升',
        highlight: '340%',
        suffix: '，日均收集线索超过5000条',
      },
      {
        text: '线索洗选准确率达',
        highlight: '87%',
        suffix: '，无效线索减少62%',
      },
      {
        text: '销售团队跟进效率提升',
        highlight: '2.8倍',
        suffix: '，成交转化率提高35%',
      },
    ],
    costLabel: '获客成本（万元）',
    costChartData: [
      { label: '初创企业', value: 5 },
      { label: '成长期企业', value: 60 },
      { label: '成熟企业', value: 400 },
    ],
    costSummary: [
      { label: '获客成本降低', value: '64%' },
      { label: '线索成交率提高', value: '35%' },
    ],
    efficiencyData: [
      { label: '全网信息抓取覆盖率', value: 93 },
      { label: '关键联系人识别准确率', value: 86 },
      { label: '线索洗选自动化率', value: 91 },
      { label: '销售跟进效率提升', value: 78 },
    ],
    coreCompetencies: [
      {
        title: '全网信息抓取',
        description: '多源数据采集，自动聚合全网线索信息',
        iconBg: '#FFF1F0',
        iconText: '🌐',
      },
      {
        title: '关键联系人识别',
        description: '基于社交图谱自动识别决策链关键人',
        iconBg: '#E8F5FF',
        iconText: '🔍',
      },
      {
        title: '线索初步洗选',
        description: '多维度评分模型洗选高价值线索',
        iconBg: '#FFF7E6',
        iconText: '⚖',
      },
      {
        title: '客户画像构建',
        description: '自动构建360度客户画像',
        iconBg: '#F0FFF0',
        iconText: '👤',
      },
      {
        title: '线索智能分配',
        description: '按行业/地域自动分配线索至对应销售',
        iconBg: '#F3F0FF',
        iconText: '📨',
      },
    ],
  },
  amy: {
    name: 'Amy',
    avatarSrc: './assets/images/amy.png',
    employeeRole: '商务拓展精英',
    stageTags: [
      '商务接洽期',
      '合作谈判期',
      '合同审批期',
      '项目交付期',
      '生态合作期',
    ],
    profile:
      'Amy 擅长商务拓展场景，可自动生成个性化商务信函，智能匹配潜在合作伙伴，高效预约会议并管理日程。',
    reviews: [
      {
        text: '商务接洽效率提升',
        highlight: '215%',
        suffix: '，月均完成商务会议60+场',
      },
      {
        text: '合作伙伴匹配准确率达',
        highlight: '82%',
        suffix: '，合作意向转化率提高48%',
      },
      {
        text: '商务信函生产效率提升',
        highlight: '10倍',
        suffix: '，信函回复率提升至56%',
      },
    ],
    costLabel: '商务成本（万元）',
    costChartData: [
      { label: '小型合作', value: 15 },
      { label: '中型合作', value: 100 },
      { label: '大型战略合作', value: 600 },
    ],
    costSummary: [
      { label: '商务拓展成本降低', value: '52%' },
      { label: '合作签约率提升', value: '48%' },
    ],
    efficiencyData: [
      { label: '合作伙伴挖掘精准度', value: 88 },
      { label: '商务信函自动生成率', value: 95 },
      { label: '会议预约自动化率', value: 83 },
      { label: '合作流程效率提升', value: 76 },
    ],
    coreCompetencies: [
      {
        title: '合作伙伴挖掘',
        description: '基于行业图谱智能匹配潜在合作方',
        iconBg: '#FFF1F0',
        iconText: '🤝',
      },
      {
        title: '商务信函代写',
        description: '个性化生成专业商务信函与方案',
        iconBg: '#E8F5FF',
        iconText: '✉',
      },
      {
        title: '会议预约日程',
        description: '自动协调多方时间完成会议安排',
        iconBg: '#FFF7E6',
        iconText: '📅',
      },
      {
        title: '合同条款分析',
        description: '智能识别合同关键条款与风险点',
        iconBg: '#F0FFF0',
        iconText: '📄',
      },
      {
        title: '生态资源管理',
        description: '跟踪合作关系全生命周期进度',
        iconBg: '#F3F0FF',
        iconText: '🔗',
      },
    ],
  },
};

const messages = defineMessages({
  // ─── Toast messages ───
  autoReplyEnabled: {
    id: 'homeScreen.autoReplyEnabled',
    defaultMessage: 'Auto reply enabled',
  },
  autoReplyDisabled: {
    id: 'homeScreen.autoReplyDisabled',
    defaultMessage: 'Auto reply disabled',
  },

  // ─── Social account table ───
  type: { id: 'homeScreen.type', defaultMessage: 'Type' },
  totalCount: { id: 'homeScreen.totalCount', defaultMessage: 'Total' },
  online: { id: 'homeScreen.online', defaultMessage: 'Online' },
  offline: { id: 'homeScreen.offline', defaultMessage: 'Offline' },
  errorStatus: { id: 'homeScreen.errorStatus', defaultMessage: 'Error' },
  moreSocialComing: {
    id: 'homeScreen.moreSocialComing',
    defaultMessage: 'More social media coming soon~',
  },

  // ─── Dashboard section header ───
  myDigitalEmployees: {
    id: 'homeScreen.myDigitalEmployees',
    defaultMessage: 'My Digital Employees',
  },
  digitalEmployeesDesc: {
    id: 'homeScreen.digitalEmployeesDesc',
    defaultMessage: 'Let digital employees be your best sales partners, handling inquiries and automating conversions 24/7.',
  },
  autoReply: { id: 'homeScreen.autoReply', defaultMessage: 'Auto Reply' },

  // ─── Social account overview ───
  socialAccountOverview: {
    id: 'homeScreen.socialAccountOverview',
    defaultMessage: 'Social Accounts Overview',
  },

  // ─── Onboarding guide ───
  onboardingTitle: {
    id: 'homeScreen.onboardingTitle',
    defaultMessage: 'Onboarding Guide',
  },
  completionProgress: {
    id: 'homeScreen.completionProgress',
    defaultMessage: 'Progress',
  },
  step1Title: {
    id: 'homeScreen.step1Title',
    defaultMessage: 'Bind Account',
  },
  step1Desc: {
    id: 'homeScreen.step1Desc',
    defaultMessage: 'Click any social platform on the left to bind an account',
  },
  step2Title: {
    id: 'homeScreen.step2Title',
    defaultMessage: 'Create Persona Profile',
  },
  step2Desc: {
    id: 'homeScreen.step2Desc',
    defaultMessage: 'Click Profile Management on the left to create persona data',
  },
  step3Title: {
    id: 'homeScreen.step3Title',
    defaultMessage: 'Set Alert Rules (Optional)',
  },
  step3Desc: {
    id: 'homeScreen.step3Desc',
    defaultMessage: 'Click Monica digital employee to set alert rules',
  },
  step4Title: {
    id: 'homeScreen.step4Title',
    defaultMessage: 'Bind Persona to Account',
  },
  step4Desc: {
    id: 'homeScreen.step4Desc',
    defaultMessage: 'Bind the created persona to the linked social account',
  },
  setupInfoText: {
    id: 'homeScreen.setupInfoText',
    defaultMessage: 'After setup, configure auto-reply for the social accounts and conversation tags. Finally, toggle the master switch on the homepage to activate your digital employees!',
  },

  // ─── Employee MOCK roles ───
  roleSeniorSalesExpert: {
    id: 'homeScreen.roleSeniorSalesExpert',
    defaultMessage: 'Senior Sales Expert',
  },
  roleCustomerMaintenance: {
    id: 'homeScreen.roleCustomerMaintenance',
    defaultMessage: 'Customer Maintenance Specialist',
  },
  roleMarketingAmbassador: {
    id: 'homeScreen.roleMarketingAmbassador',
    defaultMessage: 'Marketing Ambassador',
  },
  roleAfterSalesExpert: {
    id: 'homeScreen.roleAfterSalesExpert',
    defaultMessage: 'After-Sales Support Expert',
  },
  roleLeadAssistant: {
    id: 'homeScreen.roleLeadAssistant',
    defaultMessage: 'Lead Collection Assistant',
  },
  roleBusinessDevElite: {
    id: 'homeScreen.roleBusinessDevElite',
    defaultMessage: 'Business Development Elite',
  },

  // ─── Employee capabilities ───
  capAlwaysOnline: {
    id: 'homeScreen.capAlwaysOnline',
    defaultMessage: '24/7 Online',
  },
  capMultilingual: {
    id: 'homeScreen.capMultilingual',
    defaultMessage: 'Multilingual Communication',
  },
  capSmartDemand: {
    id: 'homeScreen.capSmartDemand',
    defaultMessage: 'Smart Demand Mining',
  },
  capRegularVisit: {
    id: 'homeScreen.capRegularVisit',
    defaultMessage: 'Regular Follow-up',
  },
  capSatisfactionSurvey: {
    id: 'homeScreen.capSatisfactionSurvey',
    defaultMessage: 'Satisfaction Survey',
  },
  capChurnWarning: {
    id: 'homeScreen.capChurnWarning',
    defaultMessage: 'Churn Warning',
  },
  capViralCopywriting: {
    id: 'homeScreen.capViralCopywriting',
    defaultMessage: 'Viral Copywriting',
  },
  capPrecisionCommunity: {
    id: 'homeScreen.capPrecisionCommunity',
    defaultMessage: 'Precision Community Targeting',
  },
  capActivityAnalysis: {
    id: 'homeScreen.capActivityAnalysis',
    defaultMessage: 'Campaign Analysis',
  },
  capQuickResponse: {
    id: 'homeScreen.capQuickResponse',
    defaultMessage: 'Quick Response',
  },
  capKnowledgeBase: {
    id: 'homeScreen.capKnowledgeBase',
    defaultMessage: 'Knowledge Base Auto-Matching',
  },
  capComplexProcess: {
    id: 'homeScreen.capComplexProcess',
    defaultMessage: 'Complex Process Guidance',
  },
  capWebScraping: {
    id: 'homeScreen.capWebScraping',
    defaultMessage: 'Web-wide Data Scraping',
  },
  capKeyContact: {
    id: 'homeScreen.capKeyContact',
    defaultMessage: 'Key Contact Identification',
  },
  capLeadScreening: {
    id: 'homeScreen.capLeadScreening',
    defaultMessage: 'Lead Screening',
  },
  capPartnerMining: {
    id: 'homeScreen.capPartnerMining',
    defaultMessage: 'Partner Mining',
  },
  capBusinessLetter: {
    id: 'homeScreen.capBusinessLetter',
    defaultMessage: 'Business Letter Writing',
  },
  capMeetingScheduling: {
    id: 'homeScreen.capMeetingScheduling',
    defaultMessage: 'Meeting Scheduling',
  },

  // ─── Buttons / CTAs ───
  setStrategy: {
    id: 'homeScreen.setStrategy',
    defaultMessage: 'Set Strategy',
  },
  resume: { id: 'homeScreen.resume', defaultMessage: 'Resume' },

  // ─── Fallback data ───
  digitalAssistant: {
    id: 'homeScreen.digitalAssistant',
    defaultMessage: 'Digital Assistant',
  },
  smartChatService: {
    id: 'homeScreen.smartChatService',
    defaultMessage: 'Smart Chat Service',
  },
  multiChannel: {
    id: 'homeScreen.multiChannel',
    defaultMessage: 'Multi-channel Reach',
  },
  precisionMarketing: {
    id: 'homeScreen.precisionMarketing',
    defaultMessage: 'Precision Marketing',
  },
});

const MOCK_EMPLOYEES = [
  {
    id: 'monica',
    name: 'Monica',
    roleKey: 'homeScreen.roleSeniorSalesExpert',
    roleDefault: 'Senior Sales Expert',
    avatar: employeeMonica,
    capabilityKeys: [
      'homeScreen.capAlwaysOnline',
      'homeScreen.capMultilingual',
      'homeScreen.capSmartDemand',
    ],
    capabilityDefaults: ['24/7 Online', 'Multilingual Communication', 'Smart Demand Mining'],
    ctaKey: 'homeScreen.setStrategy',
    ctaDefault: 'Set Strategy',
    hasBadge: true,
  },
  {
    id: 'mike',
    name: 'Mike',
    roleKey: 'homeScreen.roleCustomerMaintenance',
    roleDefault: 'Customer Maintenance Specialist',
    avatar: employeeMike,
    capabilityKeys: [
      'homeScreen.capRegularVisit',
      'homeScreen.capSatisfactionSurvey',
      'homeScreen.capChurnWarning',
    ],
    capabilityDefaults: ['Regular Follow-up', 'Satisfaction Survey', 'Churn Warning'],
    ctaKey: 'homeScreen.resume',
    ctaDefault: 'Resume',
  },
  {
    id: 'alice',
    name: 'Alice',
    roleKey: 'homeScreen.roleMarketingAmbassador',
    roleDefault: 'Marketing Ambassador',
    avatar: employeeAlice,
    capabilityKeys: [
      'homeScreen.capViralCopywriting',
      'homeScreen.capPrecisionCommunity',
      'homeScreen.capActivityAnalysis',
    ],
    capabilityDefaults: ['Viral Copywriting', 'Precision Community Targeting', 'Campaign Analysis'],
    ctaKey: 'homeScreen.resume',
    ctaDefault: 'Resume',
  },
  {
    id: 'lily',
    name: 'Lily',
    roleKey: 'homeScreen.roleAfterSalesExpert',
    roleDefault: 'After-Sales Support Expert',
    avatar: employeeLily,
    capabilityKeys: [
      'homeScreen.capQuickResponse',
      'homeScreen.capKnowledgeBase',
      'homeScreen.capComplexProcess',
    ],
    capabilityDefaults: ['Quick Response', 'Knowledge Base Auto-Matching', 'Complex Process Guidance'],
    ctaKey: 'homeScreen.resume',
    ctaDefault: 'Resume',
  },
  {
    id: 'allen',
    name: 'Allen',
    roleKey: 'homeScreen.roleLeadAssistant',
    roleDefault: 'Lead Collection Assistant',
    avatar: employeeAllen,
    capabilityKeys: [
      'homeScreen.capWebScraping',
      'homeScreen.capKeyContact',
      'homeScreen.capLeadScreening',
    ],
    capabilityDefaults: ['Web-wide Data Scraping', 'Key Contact Identification', 'Lead Screening'],
    ctaKey: 'homeScreen.resume',
    ctaDefault: 'Resume',
  },
  {
    id: 'amy',
    name: 'Amy',
    roleKey: 'homeScreen.roleBusinessDevElite',
    roleDefault: 'Business Development Elite',
    avatar: employeeAmy,
    capabilityKeys: [
      'homeScreen.capPartnerMining',
      'homeScreen.capBusinessLetter',
      'homeScreen.capMeetingScheduling',
    ],
    capabilityDefaults: ['Partner Mining', 'Business Letter Writing', 'Meeting Scheduling'],
    ctaKey: 'homeScreen.resume',
    ctaDefault: 'Resume',
  },
];

@inject('stores')
@observer
class HomeScreen extends Component<IHomeScreenProps, HomeScreenState> {
  constructor(props: IHomeScreenProps) {
    super(props);

    this.state = {
      isAutoReply: false,
      viewMode: 'dashboard',
      dialogEmployee: null,
    };
  }

  handleOpenStrategy = (): void => {
    this.setState({ viewMode: 'strategy' });
  };

  handleOpenResume = (employee: any): void => {
    const resume = EMPLOYEE_RESUMES[employee.id];
    if (resume) {
      this.setState({ dialogEmployee: resume });
    }
  };

  handleCloseResume = (): void => {
    this.setState({ dialogEmployee: null });
  };

  handleBackToDashboard = (): void => {
    this.setState({ viewMode: 'dashboard' });
  };

  async componentDidMount(): Promise<void> {
    await this.props.stores!.digitalHuman.fetchDigitalHumans();
  }

  handleAutoReplyChange = (val: boolean): void => {
    this.setState({ isAutoReply: val });
    const { intl } = this.props;
    MessagePlugin.success(
      val
        ? intl!.formatMessage(messages.autoReplyEnabled)
        : intl!.formatMessage(messages.autoReplyDisabled),
    );
  };

  renderSocialAccountTable(): ReactElement {
    const { services, whatsappAutomation } = this.props.stores!;
    const { intl } = this.props;
    const whatsappServices = services.allDisplayed.filter(
      s => s.recipe.id === 'whatsapp',
    );

    const totalCount = whatsappServices.length;
    let onlineCount = 0;
    let offlineCount = 0;
    let errorCount = 0;

    whatsappServices.forEach(s => {
      const status = whatsappAutomation.sessionStatuses.get(s.id);
      if (status === 'CONNECTED') onlineCount++;
      else if (status === 'DISCONNECTED') offlineCount++;
      else errorCount++;
    });

    const data = [
      {
        type: 'Whats',
        total: totalCount || 10,
        online: onlineCount || 3,
        offline: offlineCount || 7,
        error: errorCount || 2,
      },
    ];

    return (
      <div className="mt-[24px] overflow-hidden rounded-[6px] border border-line">
        <table
          className="w-full"
          style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}
        >
          <thead>
            <tr className="h-[45px] bg-secondary-container">
              <th className="w-[116px] border-r border-line pl-[12px] text-left text-[12px] font-medium text-placeholder">
                {intl.formatMessage(messages.type)}
              </th>
              <th className="w-[117px] border-r border-line text-center text-[12px] font-medium text-placeholder">
                {intl.formatMessage(messages.totalCount)}
              </th>
              <th className="w-[117px] border-r border-line text-center text-[12px] font-medium">
                <span className="inline-flex items-center gap-[6px]">
                  <WifiIcon className="text-success text-[14px]" />
                  <span className="text-success">{intl.formatMessage(messages.online)}</span>
                </span>
              </th>
              <th className="w-[117px] border-r border-line text-center text-[12px] font-medium">
                <span className="inline-flex items-center gap-[6px]">
                  <WifiOffIcon className="text-warning text-[14px]" />
                  <span className="text-warning">{intl.formatMessage(messages.offline)}</span>
                </span>
              </th>
              <th className="w-[116px] text-center text-[12px] font-medium">
                <span className="inline-flex items-center gap-[6px]">
                  <ErrorCircleIcon className="text-error text-[14px]" />
                  <span className="text-error">{intl.formatMessage(messages.errorStatus)}</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="h-[46px] text-[14px] font-medium text-primary">
              <td className="border-r border-line pl-[12px]">
                <div className="flex items-center gap-[8px]">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path
                      d="M7.5 1C3.9 1 1 3.6 1 6.8C1 8.3 1.5 9.7 2.4 10.8L1.5 14L4.7 12.6C5.6 13.1 6.5 13.3 7.5 13.3C11.1 13.3 14 10.7 14 7.2C14 3.7 11.1 1 7.5 1Z"
                      style={{ fill: 'var(--td-success-color)' }}
                    />
                    <path
                      d="M5.5 6C5.5 5 6.5 4.5 7.5 4.5C8.5 4.5 9.5 5 9.5 6"
                      stroke="white"
                      strokeWidth="1"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <line
                      x1="7.5"
                      y1="4.5"
                      x2="7.5"
                      y2="8.5"
                      stroke="white"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>Whats</span>
                </div>
              </td>
              <td className="border-r border-line text-center">
                {data[0].total}
              </td>
              <td className="border-r border-line text-center">
                {data[0].online}
              </td>
              <td className="border-r border-line text-center">
                {data[0].offline}
              </td>
              <td className="text-center">{data[0].error}</td>
            </tr>
          </tbody>
        </table>
        <div className="flex h-[48px] items-center justify-center border-t border-line">
          <span className="text-[11px] font-normal text-placeholder">
            {intl.formatMessage(messages.moreSocialComing)}
          </span>
        </div>
      </div>
    );
  }

  renderEmployeeCard(employee: any): ReactElement {
    return (
      <div
        key={employee.id}
        className="relative flex h-[331px] w-[237px] flex-col overflow-hidden rounded-[16px] border border-line bg-container transition-all hover:shadow-md"
      >
        <div className="absolute inset-0 z-0">
          <img
            src={employee.avatar}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        <div className="relative z-10 mt-auto mb-[24px] flex flex-col items-center">
          {employee.hasBadge ? (
            <Badge count="99+" shape="round" offset={[-4, -4]}>
              <Button
                theme="primary"
                size="small"
                className="!bg-brand !px-[20px] !py-[6px] !rounded-[8px] font-bold text-text-anti shadow-sm"
                suffix={<ChevronRightIcon />}
                onClick={this.handleOpenStrategy}
              >
                {employee.cta}
              </Button>
            </Badge>
          ) : (
            <Button
              theme="primary"
              size="small"
              className="!bg-brand !px-[20px] !py-[6px] !rounded-[8px] font-bold text-text-anti shadow-sm"
              suffix={<ChevronRightIcon />}
              onClick={() => this.handleOpenResume(employee)}
            >
              {employee.cta}
            </Button>
          )}
        </div>
      </div>
    );
  }

  renderResumeDialog(): ReactElement | null {
    const emp = this.state.dialogEmployee;
    if (!emp) return null;

    return (
      <Dialog
        visible
        closeBtn={false}
        destroyOnClose
        width="min(90vw,1400px)"
        placement="center"
        header={false}
        footer={false}
        onClose={this.handleCloseResume}
        className="[&_.t-dialog\\_\\_body]:!p-0 [&_.t-dialog\\_\\_wrap]:!items-center [&_.t-dialog]:!p-0"
      >
        <div className="relative max-h-[85vh] overflow-y-auto rounded-[12px] bg-container p-[22px]">
          <ResumeTab
            stageTags={emp.stageTags}
            profile={emp.profile}
            reviews={emp.reviews}
            costLabel={emp.costLabel}
            costChartData={emp.costChartData}
            costSummary={emp.costSummary}
            efficiencyData={emp.efficiencyData}
            coreCompetencies={emp.coreCompetencies as any}
            employeeName={emp.name}
            employeeRole={emp.employeeRole}
            avatarSrc={emp.avatarSrc}
          />
        </div>
      </Dialog>
    );
  }

  render(): ReactElement {
    if (this.state.viewMode === 'strategy') {
      return <StrategyConfigScreen onBack={this.handleBackToDashboard} />;
    }

    const { isAutoReply } = this.state;
    const { intl } = this.props;
    const digitalHumanStore = this.props.stores!.digitalHuman;
    const realEmployees = digitalHumanStore.digitalHumans;

    const displayEmployees: Array<{
      id: string;
      name: string;
      role: string;
      avatar: string;
      capabilities: string[];
      cta: string;
      hasBadge?: boolean;
    }> = MOCK_EMPLOYEES.map(emp => ({
      id: emp.id,
      name: emp.name,
      role: intl.formatMessage({ id: emp.roleKey, defaultMessage: emp.roleDefault }),
      avatar: emp.avatar,
      capabilities: emp.capabilityKeys.map((key, i) =>
        intl.formatMessage({ id: key, defaultMessage: emp.capabilityDefaults[i] }),
      ),
      cta: intl.formatMessage({ id: emp.ctaKey, defaultMessage: emp.ctaDefault }),
      hasBadge: emp.hasBadge,
    }));
    realEmployees.slice(0, 6).forEach((real, idx) => {
      displayEmployees[idx] = {
        id: real.id,
        name: real.name,
        role: real.platform || intl.formatMessage(messages.digitalAssistant),
        avatar: real.avatar_url || 'https://tdesign.gtimg.com/site/avatar.jpg',
        capabilities: [
          real.persona_prompt || intl.formatMessage(messages.smartChatService),
          intl.formatMessage(messages.multiChannel),
          intl.formatMessage(messages.precisionMarketing),
        ],
        cta: intl.formatMessage(messages.resume),
        hasBadge: false,
      };
    });

    return (
      <>
        <div className="flex h-full flex-col bg-page p-[24px] overflow-auto">
          <div className="flex gap-[24px] h-full">
            <div className="flex flex-[2] flex-col rounded-[24px] bg-container p-[32px] shadow-sm">
              <SectionHeader
                icon={
                  <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-brand-light">
                    <UserIcon className="text-[24px] text-brand" />
                  </div>
                }
                title={intl.formatMessage(messages.myDigitalEmployees)}
                description={intl.formatMessage(messages.digitalEmployeesDesc)}
                actions={
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[14px] text-secondary">{intl.formatMessage(messages.autoReply)}</span>
                    <Switch
                      value={isAutoReply}
                      onChange={this.handleAutoReplyChange}
                    />
                  </div>
                }
              />

              <div className="mt-[40px] grid grid-cols-[repeat(auto-fill,minmax(237px,1fr))] gap-[20px]">
                {displayEmployees.map(emp => this.renderEmployeeCard(emp))}
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-[24px]">
              <div className="flex h-[369px] flex-col rounded-[8px] bg-container px-[32px] pb-[24px] pt-[28px] shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[16px]">
                    <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-brand-light">
                      <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand">
                        <UsergroupIcon className="text-text-anti text-[10px]" />
                      </div>
                    </div>
                    <h2 className="text-[20px] font-bold leading-[28px] text-primary !mb-0">
                      {intl.formatMessage(messages.socialAccountOverview)}
                    </h2>
                  </div>
                  <RefreshIcon className="h-[22px] w-[22px] cursor-pointer text-primary" />
                </div>

                {this.renderSocialAccountTable()}
              </div>

              <div className="flex h-[509px] w-[647px] flex-auto flex-col rounded-[8px] bg-container px-[32px] pb-[36px] pt-[28px] shadow-sm">
                <div className="flex h-[55px] items-start justify-between">
                  <div className="flex items-start">
                    <div className="relative h-[32px] w-[32px] flex-shrink-0">
                      <div className="absolute inset-0 rounded-full bg-brand-light" />
                      <div className="absolute left-[7px] top-[7px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand">
                        <AddIcon className="text-[10px] text-text-anti" />
                      </div>
                    </div>
<span className="ml-[16px] pt-[2px] text-[20px] font-bold leading-[28px] text-primary">
                     {intl.formatMessage(messages.onboardingTitle)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-[6px]">
<span className="text-[14px] font-medium leading-[20px] text-secondary">
                       {intl.formatMessage(messages.completionProgress)}
                    </span>
                    <div className="mx-[12px] w-[91px]">
                      <Progress
                        percentage={57}
                        color="var(--td-brand-color)"
                        trackColor="var(--td-border-level-1-color)"
                        strokeWidth={4}
                        label={false}
                      />
                    </div>
                    <span className="text-[14px] font-medium leading-[20px] text-primary">
                      80%
                    </span>
                  </div>
                </div>

                <div className="mt-[24px] flex flex-1 flex-col">
                  <StepItem
                    stepNumber={1}
                    title={intl.formatMessage(messages.step1Title)}
                    description={intl.formatMessage(messages.step1Desc)}
                    status="completed"
                    isLast={false}
                  />
                  <StepItem
                    stepNumber={2}
                    title={intl.formatMessage(messages.step2Title)}
                    description={intl.formatMessage(messages.step2Desc)}
                    status="current"
                    isLast={false}
                  />
                  <StepItem
                    stepNumber={3}
                    title={intl.formatMessage(messages.step3Title)}
                    description={intl.formatMessage(messages.step3Desc)}
                    status="pending"
                    isLast={false}
                  />
                  <StepItem
                    stepNumber={4}
                    title={intl.formatMessage(messages.step4Title)}
                    description={intl.formatMessage(messages.step4Desc)}
                    status="pending"
                    isLast
                  />
                </div>

                <div className="mt-[24px] h-[66px] w-full rounded-[6px] bg-brand-light px-[34px] py-[15px]">
                  <div className="flex items-start gap-[10px]">
                    <div className="mt-[9px] flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-semibold leading-none text-text-anti">
                      i
                    </div>
                    <p className="max-w-[501px] text-[14px] font-medium leading-[22px] text-primary">
                      {intl.formatMessage(messages.setupInfoText)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {this.renderResumeDialog()}
      </>
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default injectIntl(HomeScreen as any);
