import { Component, type ReactElement } from 'react';
import {
  type WrappedComponentProps,
  defineMessages,
  injectIntl,
} from 'react-intl';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { FolderOpenIcon, LockOnIcon, UserIcon } from 'tdesign-icons-react';

const messages = defineMessages({
  stageSectionTitle: {
    id: 'resumeTab.stageSectionTitle',
    defaultMessage: 'Applicable Stages',
  },
  stageIdentityQuestioning: {
    id: 'resumeTab.stageIdentityQuestioning',
    defaultMessage: 'Identity Questioning Stage',
  },
  stageProductObjection: {
    id: 'resumeTab.stageProductObjection',
    defaultMessage: 'Product Objection Stage',
  },
  stageRiskConcern: {
    id: 'resumeTab.stageRiskConcern',
    defaultMessage: 'Risk Concern Stage',
  },
  stageDigitalReply: {
    id: 'resumeTab.stageDigitalReply',
    defaultMessage: 'Digital Employee Reply',
  },
  stageComplaintRefund: {
    id: 'resumeTab.stageComplaintRefund',
    defaultMessage: 'Complaint / Refund Stage',
  },
  stageHighIntentConversion: {
    id: 'resumeTab.stageHighIntentConversion',
    defaultMessage: 'High-Intent Conversion Stage',
  },
  stageBusinessStartup: {
    id: 'resumeTab.stageBusinessStartup',
    defaultMessage: 'Business Startup',
  },
  stageFastExpansion: {
    id: 'resumeTab.stageFastExpansion',
    defaultMessage: 'Rapid Expansion',
  },
  stageEcosystemIntegration: {
    id: 'resumeTab.stageEcosystemIntegration',
    defaultMessage: 'Ecosystem Integration & Strategic Upgrade',
  },
  roleLabel: {
    id: 'resumeTab.roleLabel',
    defaultMessage: 'Role: {role}',
  },
  defaultRole: {
    id: 'resumeTab.defaultRole',
    defaultMessage: 'Risk Control Assistant',
  },
  skillsSectionTitle: {
    id: 'resumeTab.skillsSectionTitle',
    defaultMessage: 'Skills',
  },
  defaultSkillRiskDetection: {
    id: 'resumeTab.defaultSkillRiskDetection',
    defaultMessage: 'Risk Scan',
  },
  defaultSkillAnomalyWarning: {
    id: 'resumeTab.defaultSkillAnomalyWarning',
    defaultMessage: 'Alerts',
  },
  defaultSkillHandover: {
    id: 'resumeTab.defaultSkillHandover',
    defaultMessage: 'Handoff',
  },
  profileSectionTitle: {
    id: 'resumeTab.profileSectionTitle',
    defaultMessage: 'About',
  },
  reviewSectionTitle: {
    id: 'resumeTab.reviewSectionTitle',
    defaultMessage: 'Client Reviews',
  },
  reviewConversionRate: {
    id: 'resumeTab.reviewConversionRate',
    defaultMessage: 'Customer conversion rate increased by',
  },
  reviewConversionRateSuffix: {
    id: 'resumeTab.reviewConversionRateSuffix',
    defaultMessage: ', with monthly new deal volume exceeding ¥20M',
  },
  reviewSatisfaction: {
    id: 'resumeTab.reviewSatisfaction',
    defaultMessage:
      'Satisfaction score rose from 85 to 98.5, and customer repurchase rate grew',
  },
  reviewConsultationVolume: {
    id: 'resumeTab.reviewConsultationVolume',
    defaultMessage:
      'Handled over 2.3M customer inquiries, helping enterprises save on labor costs',
  },
  costSavingsTitle: {
    id: 'resumeTab.costSavingsTitle',
    defaultMessage: 'Cost Savings',
  },
  costAxisLabel: {
    id: 'resumeTab.costAxisLabel',
    defaultMessage: 'Cost Savings (¥10K)',
  },
  costTotalSavings: {
    id: 'resumeTab.costTotalSavings',
    defaultMessage: 'Total Cost Savings',
  },
  costDisputeDuration: {
    id: 'resumeTab.costDisputeDuration',
    defaultMessage: 'Dispute Resolution Time Reduced',
  },
  enterpriseSME: {
    id: 'resumeTab.enterpriseSME',
    defaultMessage: 'SMEs',
  },
  enterpriseLarge: {
    id: 'resumeTab.enterpriseLarge',
    defaultMessage: 'Large',
  },
  enterpriseExtraLarge: {
    id: 'resumeTab.enterpriseExtraLarge',
    defaultMessage: 'Giant',
  },
  efficiencySectionTitle: {
    id: 'resumeTab.efficiencySectionTitle',
    defaultMessage: 'Efficiency Gains',
  },
  effCustomerWorkHour: {
    id: 'resumeTab.effCustomerWorkHour',
    defaultMessage: 'Hours Saved',
  },
  effOperationEfficiency: {
    id: 'resumeTab.effOperationEfficiency',
    defaultMessage: 'Ops Efficiency',
  },
  effProcessAutomation: {
    id: 'resumeTab.effProcessAutomation',
    defaultMessage: 'Automation Rate',
  },
  effHighRiskInterception: {
    id: 'resumeTab.effHighRiskInterception',
    defaultMessage: 'Risk Interception',
  },
  coreCompetencyTitle: {
    id: 'resumeTab.coreCompetencyTitle',
    defaultMessage: 'Core Capabilities',
  },
  compRiskIdentification: {
    id: 'resumeTab.compRiskIdentification',
    defaultMessage: 'Risk Identification',
  },
  compBoundaryControl: {
    id: 'resumeTab.compBoundaryControl',
    defaultMessage: 'Boundary Control',
  },
  compHumanHandover: {
    id: 'resumeTab.compHumanHandover',
    defaultMessage: 'Human Handover Trigger',
  },
  compHighIntentAlert: {
    id: 'resumeTab.compHighIntentAlert',
    defaultMessage: 'High-Intent Alert',
  },
  compSessionPause: {
    id: 'resumeTab.compSessionPause',
    defaultMessage: 'Session Pause Control',
  },
  compRiskIdentificationDesc: {
    id: 'resumeTab.compRiskIdentificationDesc',
    defaultMessage:
      'Real-time conversation monitoring to intelligently detect potential risks and unusual behavior',
  },
  compBoundaryControlDesc: {
    id: 'resumeTab.compBoundaryControlDesc',
    defaultMessage:
      "Strictly defines the digital employee's behavior boundaries and permissions",
  },
  compHumanHandoverDesc: {
    id: 'resumeTab.compHumanHandoverDesc',
    defaultMessage:
      'Auto-triggers human handover when risk levels exceed the threshold',
  },
  compHighIntentAlertDesc: {
    id: 'resumeTab.compHighIntentAlertDesc',
    defaultMessage:
      'Identifies high-intent customers and notifies human agents to follow up, boosting conversion',
  },
  compSessionPauseDesc: {
    id: 'resumeTab.compSessionPauseDesc',
    defaultMessage:
      'Auto-pauses conversations in specific scenarios, waiting for human intervention',
  },
  defaultProfile: {
    id: 'resumeTab.defaultProfile',
    defaultMessage:
      'Monica monitors all chats and alerts humans on risky, high-value, disputed, or out-of-scope issues.',
  },
  reviewSatisfactionHighlight: {
    id: 'resumeTab.reviewSatisfactionHighlight',
    defaultMessage: '12x',
  },
});

interface ResumeTabProps {
  stageTags?: string[];
  profile?: string;
  reviews?: { text: string; highlight?: string; suffix?: string }[];
  costLabel?: string;
  costChartData?: { label: string; value: number }[];
  costSummary?: { label: string; value: string }[];
  efficiencyData?: { label: string; value: number }[];
  coreCompetencies?: {
    title: string;
    description: string;
    iconBg: string;
    iconSrc: string;
  }[];
  employeeName?: string;
  employeeRole?: string;
  avatarSrc?: string;
}

interface IProps extends ResumeTabProps, WrappedComponentProps { }

type CoreCompetencyItem = {
  title: string;
  description: string;
  iconBg?: string;
  iconSrc?: string;
};

const ICON_PATH = './assets/icons/strategy';

const CHARACTER_COMPETENCIES: Record<string, CoreCompetencyItem[]> = {
  Monica: [
    { title: '异常识别', description: '识别投诉、退款、纠纷、账号安全、支付问题等高风险会话', iconBg: '#FFF1F0', iconSrc: `${ICON_PATH}/异常识别.svg` },
    { title: '风险控制', description: '限制AI超范围回复（如承诺收益、违规优惠、私联引导等）', iconBg: '#E8F5FF', iconSrc: `${ICON_PATH}/风险控制.svg` },
    { title: '人工通知', description: '当客户要求真人或问题超出能力范围时，自动转人工处理', iconBg: '#FFF7E6', iconSrc: `${ICON_PATH}/人工通知.svg` },
    { title: '高意向预警', description: '识别高转化信号，提醒人工及时跟进避免流失', iconBg: '#F0FFF0', iconSrc: `${ICON_PATH}/高意向预警.svg` },
    { title: '风控记录', description: '自动沉淀风险事件，形成结构化风控与处理记录', iconBg: '#F3F0FF', iconSrc: `${ICON_PATH}/风控记录.svg` },
    { title: '非业务兜底', description: '识别非业务咨询并礼貌引导回业务流程', iconBg: '#FFF1F0', iconSrc: `${ICON_PATH}/非业务兜底.svg` },
  ],
  Alice: [
    { title: '陌生破冰', description: '基于用户语气与响应意愿，选择自然轻松的开场方式降低防备', iconBg: '#E8F5FF', iconSrc: `${ICON_PATH}/陌生破冰.svg` },
    { title: '日常互动', description: '围绕客户兴趣延展话题，保持沟通连续性与自然感', iconBg: '#FFF7E6', iconSrc: `${ICON_PATH}/日常互动.svg` },
    { title: '情绪价值', description: '对客户情绪进行理解、安抚与陪伴，提升沟通意愿', iconBg: '#F0FFF0', iconSrc: `${ICON_PATH}/情绪价值.svg` },
    { title: '人设信任建立', description: '通过非强推方式逐步建立信任与亲近感', iconBg: '#F3F0FF', iconSrc: `${ICON_PATH}/人设信任建立.svg` },
    { title: '话题拉回', description: '在客户表达兴趣或需求时，及时引导至业务/转化路径', iconBg: '#FFF1F0', iconSrc: `${ICON_PATH}/话题拉回.svg` },
    { title: '阶段判断', description: '识别客户所处阶段并匹配对应沟通策略与动作', iconBg: '#E8F5FF', iconSrc: `${ICON_PATH}/阶段判断.svg` },
  ],
  Leo: [
    { title: '意图识别', description: '识别客户真实需求并匹配业务应答策略', iconBg: '#FFF7E6', iconSrc: `${ICON_PATH}/识别意图.svg` },
    { title: '客户画像加载', description: '整合客户特征，匹配对应服务与转化策略', iconBg: '#F0FFF0', iconSrc: `${ICON_PATH}/加载客户画像.svg` },
    { title: '阶段判断', description: '识别客户所处生命周期阶段并制定跟进动作', iconBg: '#F3F0FF', iconSrc: `${ICON_PATH}/判断客户阶段.svg` },
    { title: '数字员工调度', description: '协同分配任务给数字员工完成接待与转化流程', iconBg: '#FFF1F0', iconSrc: `${ICON_PATH}/调度数字员工.svg` },
    { title: '关键节点识别', description: '捕捉业务转化关键节点并触发相应动作', iconBg: '#E8F5FF', iconSrc: `${ICON_PATH}/识别关键节点.svg` },
    { title: '缓存命中判断', description: '利用缓存数据快速响应，提升效率与体验', iconBg: '#FFF7E6', iconSrc: `${ICON_PATH}/命中缓存判断.svg` },
  ],
  Lily: [
    { title: '需求承接', description: '明确客户需求并推动进入服务流程', iconBg: '#F0FFF0', iconSrc: `${ICON_PATH}/需求承接.svg` },
    { title: '机会引导', description: '挖掘潜在机会并推动需求升级与方案推荐', iconBg: '#F3F0FF', iconSrc: `${ICON_PATH}/机会引导.svg` },
    { title: '产品切入', description: '结合业务场景精准植入产品卖点', iconBg: '#FFF1F0', iconSrc: `${ICON_PATH}/产品切入.svg` },
    { title: '转化推进', description: '推动预约、成交及转化闭环落地', iconBg: '#E8F5FF', iconSrc: `${ICON_PATH}/转化推进.svg` },
    { title: '异议回应', description: '针对客户疑虑进行解释与消解，降低流失', iconBg: '#FFF7E6', iconSrc: `${ICON_PATH}/异议回应.svg` },
    { title: '关键节点通知', description: '实时监控业务节点并提示重要状态变化', iconBg: '#F0FFF0', iconSrc: `${ICON_PATH}/关键节点通知.svg` },
  ],
  Kevin: [
    { title: '平台背景说明', description: '清晰解释产品/平台规则、业务背景与基础逻辑', iconBg: '#F3F0FF', iconSrc: `${ICON_PATH}/平台背景说明.svg` },
    { title: '功能操作讲解', description: '指导用户理解功能使用方式与操作路径', iconBg: '#FFF1F0', iconSrc: `${ICON_PATH}/功能操作讲解.svg` },
    { title: '奖励制度解释', description: '说明活动/机制/激励规则，降低理解成本', iconBg: '#E8F5FF', iconSrc: `${ICON_PATH}/奖励制度解释.svg` },
    { title: 'FAQ标准解答', description: '对高频问题进行标准化、规范化答复', iconBg: '#FFF7E6', iconSrc: `${ICON_PATH}/FAQ 标准解答.svg` },
    { title: '资料引用说明', description: '提供依据与规则来源，增强信息可信度', iconBg: '#F0FFF0', iconSrc: `${ICON_PATH}/资料引用说明.svg` },
    { title: '风险问题识别', description: '识别违规、误用或高风险问题并进行纠正引导', iconBg: '#F3F0FF', iconSrc: `${ICON_PATH}/风险问题识别.svg` },
  ],
  Nina: [
    { title: '关系维护', description: '持续经营客户关系，提升长期活跃与信任度', iconBg: '#FFF1F0', iconSrc: `${ICON_PATH}/关系维护.svg` },
    { title: '复购引导', description: '基于用户行为与周期，推动再次消费与转化', iconBg: '#E8F5FF', iconSrc: `${ICON_PATH}/复购引导.svg` },
    { title: '邀请推广', description: '引导用户参与分享、裂变与推广活动', iconBg: '#FFF7E6', iconSrc: `${ICON_PATH}/邀请推广.svg` },
    { title: '经纪人扶持', description: '支持经纪/销售角色提升转化与运营效率', iconBg: '#F0FFF0', iconSrc: `${ICON_PATH}/经纪人扶持.svg` },
    { title: '团队建设', description: '辅助构建与维护用户或销售团队结构', iconBg: '#F3F0FF', iconSrc: `${ICON_PATH}/团队建设.svg` },
    { title: '老客唤醒', description: '对沉默或流失客户进行激活与回访转化', iconBg: '#FFF1F0', iconSrc: `${ICON_PATH}/老客唤醒.svg` },
  ],
  Tom: [
    { title: '标签生成', description: '基于行为与属性自动生成客户标签体系', iconBg: '#E8F5FF', iconSrc: `${ICON_PATH}/标签生成.svg` },
    { title: '画像更新', description: '动态更新客户画像，保持信息实时性', iconBg: '#FFF7E6', iconSrc: `${ICON_PATH}/画像更新.svg` },
    { title: '聊天摘要', description: '自动提炼沟通关键信息，形成结构化记录', iconBg: '#F0FFF0', iconSrc: `${ICON_PATH}/聊天摘要.svg` },
    { title: '阶段记录', description: '记录客户所处生命周期与转化阶段', iconBg: '#F3F0FF', iconSrc: `${ICON_PATH}/阶段记录.svg` },
    { title: '意向评估', description: '识别客户购买/合作意向强弱', iconBg: '#FFF1F0', iconSrc: `${ICON_PATH}/意向评级.svg` },
    { title: '客户价值评估', description: '评估客户潜在价值与转化优先级', iconBg: '#E8F5FF', iconSrc: `${ICON_PATH}/客户价值评估.svg` },
  ],
  Emma: [
    { title: '精准客户接待', description: '基于客户特征进行分层接待与匹配服务', iconBg: '#FFF7E6', iconSrc: `${ICON_PATH}/精准客户接待.svg` },
    { title: '专业开场', description: '以标准化专业话术建立第一轮信任', iconBg: '#F0FFF0', iconSrc: `${ICON_PATH}/专业开场.svg` },
    { title: '兴趣确认', description: '识别客户关注点与核心需求方向', iconBg: '#F3F0FF', iconSrc: `${ICON_PATH}/兴趣确认.svg` },
    { title: '意向判断', description: '判断客户是否具备继续沟通与转化价值', iconBg: '#FFF1F0', iconSrc: `${ICON_PATH}/意向判断.svg` },
    { title: '基础筛选', description: '快速过滤低意向或不匹配客户', iconBg: '#E8F5FF', iconSrc: `${ICON_PATH}/基础筛选.svg` },
    { title: '转交判断', description: '识别需人工/专项跟进的客户并及时转接', iconBg: '#FFF7E6', iconSrc: `${ICON_PATH}/转交判断.svg` },
  ],
};

class ResumeTab extends Component<IProps> {
  renderStageCard(): ReactElement {
    const { intl, stageTags } = this.props;
    const tags = stageTags || [
      intl.formatMessage(messages.stageIdentityQuestioning),
      intl.formatMessage(messages.stageProductObjection),
      intl.formatMessage(messages.stageRiskConcern),
      intl.formatMessage(messages.stageDigitalReply),
      intl.formatMessage(messages.stageComplaintRefund),
      intl.formatMessage(messages.stageHighIntentConversion),
      intl.formatMessage(messages.stageBusinessStartup),
      intl.formatMessage(messages.stageFastExpansion),
      intl.formatMessage(messages.stageEcosystemIntegration),
    ];
    return (
      <div className="flex min-h-[284px] flex-col rounded-[8px] bg-container p-[24px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-brand-light">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M5 2V8M2 5H8"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <span className="text-[20px] font-bold text-primary">
            {intl.formatMessage(messages.stageSectionTitle)}
          </span>
        </div>
        <div className="mt-[16px] flex flex-wrap gap-[14px]">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex h-[28px] items-center justify-center rounded-[4px] bg-brand-light px-[8px] text-[16px] font-medium text-brand"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }

  renderMonicaShowcase(): ReactElement {
    const { intl, employeeName, employeeRole, avatarSrc } = this.props;
    const name = employeeName || 'Monica';
    const role = employeeRole || intl.formatMessage(messages.defaultRole);
    const avatarSrcFinal = avatarSrc || './assets/images/monica.png';
    return (
      <div className="relative flex h-full flex-col items-center overflow-hidden rounded-[8px]">
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            WebkitMaskImage:
              'linear-gradient(to bottom, #000 0%, #000 68%, rgba(0,0,0,0.85) 76%, rgba(0,0,0,0.45) 88%, rgba(0,0,0,0) 100%)',
            maskImage:
              'linear-gradient(to bottom, #000 0%, #000 68%, rgba(0,0,0,0.85) 76%, rgba(0,0,0,0.45) 88%, rgba(0,0,0,0) 100%)',
          }}
        >
          <img
            src={avatarSrcFinal}
            alt={name}
            className="h-[484px] w-[484px] -mt-[16px] object-contain"
          />
        </div>

        <div className="absolute left-[15%] top-[18%] h-[8px] w-[8px] rounded-full bg-brand-light" />
        <div className="absolute right-[12%] top-[22%] h-[6px] w-[6px] rounded-full bg-brand-light" />
        <div className="absolute bottom-[25%] left-[10%] h-[10px] w-[10px] rounded-full bg-brand-light" />
        <div className="absolute bottom-[30%] right-[15%] h-[7px] w-[7px] rounded-full bg-brand-light" />
        <div className="absolute left-[25%] top-[35%] h-[5px] w-[5px] rounded-full bg-brand-light" />
        <div className="absolute right-[8%] top-[40%] h-[9px] w-[9px] rounded-full bg-brand-light" />

        <div className="relative z-10 ml-[11px] mt-[50px] flex flex-col items-start self-start">
          <span className="text-[48px] font-bold leading-[56px] text-primary">
            {name}
          </span>
          <span className="mt-[8px] text-[18px] font-semibold leading-[26px] text-primary">
            {intl.formatMessage(messages.roleLabel, { role })}
          </span>
        </div>

        <div
          className="relative z-10 mx-auto mb-[36px] mt-auto flex h-[74px] w-[460px] items-center pl-[43px]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(64,140,255,0.56) 0%, rgba(64,140,255,0.36) 42%, rgba(64,140,255,0.14) 75%, rgba(64,140,255,0) 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%)',
          }}
        >
          <span className="mr-[21px] text-[18px] font-extrabold leading-none text-[#000000]">
            {intl.formatMessage(messages.skillsSectionTitle)}：
          </span>
          <div className="flex gap-[8px]">
            {[
              intl.formatMessage(messages.defaultSkillRiskDetection),
              intl.formatMessage(messages.defaultSkillAnomalyWarning),
              intl.formatMessage(messages.defaultSkillHandover),
            ].map(skill => (
              <span
                key={skill}
                className="inline-flex h-[33px] min-w-[84px] items-center justify-center rounded-[16.5px] border-2 border-solid border-[#0052D9] bg-[#F2F3FF] text-[16px] font-medium leading-none text-[#0052D9]"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  renderProfileCard(): ReactElement {
    const { intl, profile } = this.props;
    const profileText = profile || intl.formatMessage(messages.defaultProfile);
    return (
      <div className="flex flex-col min-h-[148px] rounded-[8px] bg-container p-[24px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-brand-light">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand">
              <UserIcon className="text-white" />
            </div>
          </div>
          <span className="text-[20px] font-bold text-primary">
            {intl.formatMessage(messages.profileSectionTitle)}
          </span>
        </div>
        <p className="mt-[16px] text-[16px] font-normal text-secondary leading-[24px]">
          {profileText}
        </p>
      </div>
    );
  }

  renderCustomerReviewCard(): ReactElement {
    const { intl, reviews } = this.props;
    const reviewItems = reviews || [
      {
        text: intl.formatMessage(messages.reviewConversionRate),
        highlight: '12%',
        suffix: intl.formatMessage(messages.reviewConversionRateSuffix),
      },
      {
        text: intl.formatMessage(messages.reviewSatisfaction),
        highlight: intl.formatMessage(messages.reviewSatisfactionHighlight),
      },
      {
        text: intl.formatMessage(messages.reviewConsultationVolume),
        highlight: '41%',
      },
    ];
    return (
      <div className="flex min-h-[292px] flex-col rounded-[8px] bg-container p-[24px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-brand-light">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand">
              <FolderOpenIcon className="text-white" />
            </div>
          </div>
          <span className="text-[20px] font-bold text-primary">
            {intl.formatMessage(messages.reviewSectionTitle)}
          </span>
        </div>
        <div className="mt-[16px] flex flex-col gap-[19px]">
          {reviewItems.map(item => (
            <div
              key={item.text}
              className="flex flex-row flex-wrap items-baseline border-l-[4px] border-solid border-brand pl-[12px]"
            >
              <span className="text-[14px] font-normal leading-[24px] text-secondary">
                {item.text}
                {item.highlight && (
                  <span className="font-bold text-warning">
                    {item.highlight}
                  </span>
                )}
                {item.suffix && <span>{item.suffix}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  renderCostSavingsCard(): ReactElement {
    const { intl, costLabel, costChartData, costSummary } = this.props;
    const costTitle =
      costLabel || intl.formatMessage(messages.costSavingsTitle);
    const costAxisLabelText =
      costLabel || intl.formatMessage(messages.costAxisLabel);
    const defaultBarData = [
      { label: intl.formatMessage(messages.enterpriseSME), value: 80 },
      { label: intl.formatMessage(messages.enterpriseLarge), value: 750 },
      { label: intl.formatMessage(messages.enterpriseExtraLarge), value: 1500 },
    ];
    const barData = costChartData || defaultBarData;
    const maxVal = Math.max(...barData.map(d => d.value));
    const yMax = Math.max(1600, Math.ceil(maxVal / 400) * 400);
    const yTickValues = Array.from(
      { length: yMax / 400 + 1 },
      (_, index) => index * 400,
    );
    const chartData = barData;
    const summaryItems = costSummary || [
      {
        label: intl.formatMessage(messages.costTotalSavings),
        value: '12.6亿',
      },
      {
        label: intl.formatMessage(messages.costDisputeDuration),
        value: '67%',
      },
    ];
    const summaryDefs = [
      {
        bg: '#7EC8F3',
        shadow: 'rgba(59,157,245,0.15)',
        icon: 'cost-savings.png',
        iconW: 44,
        iconH: 56,
      },
      {
        bg: '#8FDE8F',
        shadow: 'rgba(76,175,80,0.15)',
        icon: 'hourglass.png',
        iconW: 40,
        iconH: 56,
      },
    ];

    return (
      <div className="flex min-h-[428px] min-w-[380px] flex-col rounded-[12px] bg-container p-[24px]">
        <div className="flex items-center gap-[12px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-brand-light">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand">
              <svg width="10" height="10" viewBox="0.5 0.5 9 9" fill="none">
                <path
                  d="M2 8L5 5L8 2"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <span className="text-[20px] font-bold leading-[28px] text-primary">
            {costTitle}
          </span>
        </div>

        <div className="flex gap-[15px] mt-[16px]">
          {summaryItems.map((s, i) => {
            const def = summaryDefs[i] || summaryDefs[0];
            return (
              <div
                key={s.label}
                className="relative flex h-[84px] w-[208px] flex-col justify-center rounded-[16px] px-[12px] py-[8px] gap-[10px]"
                style={{
                  backgroundColor: def.bg,
                  boxShadow: `0 2px 4px ${def.shadow}`,
                }}
              >
                <div className="flex h-[16px] items-center gap-[6px]">
                  <div className="h-[6px] w-[6px] flex-shrink-0 rounded-full bg-container" />
                  <span className="whitespace-nowrap text-[12px] font-medium leading-[16px] text-text-anti">
                    {s.label}
                  </span>
                </div>
                <span
                  className="text-[24px] font-bold leading-[28px] text-text-anti"
                  style={{ letterSpacing: '-0.3px' }}
                >
                  {s.value}
                </span>
                <img
                  src={`./assets/icons/strategy/${def.icon}`}
                  alt={s.label}
                  className="absolute bottom-[8px] right-[12px] object-contain"
                  style={{ height: `${def.iconH}px`, width: `${def.iconW}px` }}
                />
              </div>
            );
          })}
        </div>

        <span className="mt-[24px] text-[14px] font-medium text-primary">
          {costAxisLabelText}
        </span>

        <div className="mt-[8px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 28, right: 24, left: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    style={{ stopColor: 'var(--td-brand-color)' }}
                  />
                  <stop
                    offset="100%"
                    style={{ stopColor: 'var(--td-brand-color-light)' }}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                style={{ stroke: 'var(--td-border-level-1-color)' }}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: 'var(--td-text-color-secondary)' }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                ticks={yTickValues}
                width={44}
                tick={{
                  fontSize: 12,
                  fill: 'var(--td-text-color-placeholder)',
                }}
                axisLine={false}
                tickLine={false}
                domain={[0, yMax]}
              />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
                barSize={52}
                fill="url(#barGradient)"
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  offset={8}
                  style={{ fill: 'var(--td-text-color-primary)' }}
                  fontSize={14}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  renderEfficiencyCard(): ReactElement {
    const { intl, efficiencyData } = this.props;
    const effData = efficiencyData || [
      {
        label: intl.formatMessage(messages.effCustomerWorkHour),
        value: 82,
      },
      {
        label: intl.formatMessage(messages.effOperationEfficiency),
        value: 72,
      },
      {
        label: intl.formatMessage(messages.effProcessAutomation),
        value: 95,
      },
      {
        label: intl.formatMessage(messages.effHighRiskInterception),
        value: 99,
      },
    ];
    return (
      <div className="relative h-[312px] w-[594px] rounded-[6px] bg-container">
        <div className="absolute left-[24px] top-[24px] flex h-[32px] w-[32px] items-center justify-center rounded-full bg-brand-light">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="3.5" cy="3.5" r="1.5" fill="var(--td-brand-color)" />
            <circle cx="3.5" cy="8" r="1.5" fill="var(--td-brand-color)" />
            <circle cx="3.5" cy="12.5" r="1.5" fill="var(--td-brand-color)" />
            <line
              x1="8"
              y1="3.5"
              x2="13"
              y2="3.5"
              stroke="var(--td-brand-color)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="8"
              x2="13"
              y2="8"
              stroke="var(--td-brand-color)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="12.5"
              x2="13"
              y2="12.5"
              stroke="var(--td-brand-color)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="absolute left-[72px] top-[29px] text-[20px] font-bold text-primary">
          {intl.formatMessage(messages.efficiencySectionTitle)}
        </span>
        {effData.map((item, idx) => {
          const trackTop = 76 + idx * 52;
          return (
            <div
              key={item.label}
              className="absolute left-0 right-0"
              style={{ top: trackTop, height: 32 }}
            >
              <div className="absolute left-[24px] top-[12px] h-[8px] w-[8px] rounded-full bg-brand" />
              <span className="absolute left-[41px] top-[4px] text-[16px] text-primary">
                {item.label}
              </span>
              <div className="absolute left-[175px] h-[32px] w-[395px] overflow-hidden rounded-[4px] bg-component">
                <div
                  className="relative flex h-full items-center justify-end rounded-[4px] pr-[12px]"
                  style={{
                    width: `${item.value}%`,
                    background:
                      'linear-gradient(90deg, #B5E2FF 0%, #4E90FF 100%)',
                  }}
                >
                  <span className="text-[18px] font-bold leading-none text-white">
                    {item.value}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  renderCoreCompetenciesCard(): ReactElement {
    const { intl, coreCompetencies, employeeName } = this.props;
    const characterKey = (employeeName || 'Monica') as keyof typeof CHARACTER_COMPETENCIES;
    const compData = coreCompetencies || CHARACTER_COMPETENCIES[characterKey] || CHARACTER_COMPETENCIES.Monica;
    return (
      <div className="flex min-h-[312px] flex-col rounded-[8px] bg-container p-[32px] pb-[36px] pt-[28px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-brand-light">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand">
              <LockOnIcon className="text-white" />
            </div>
          </div>
          <span className="text-[20px] font-bold text-primary">
            {intl.formatMessage(messages.coreCompetencyTitle)}
          </span>
        </div>
        <div className="mt-[10px] grid grid-cols-3 gap-[16px]">
          {compData.map(cap => (
            <div
              key={cap.title}
              className="flex items-start gap-[16px] rounded-[10px] border border-solid border-line bg-container p-[16px]"
            >
              <div
                className="flex h-[48px] w-[48px] flex-shrink-0 items-center justify-center rounded-[8px] text-[20px]"
                style={{ backgroundColor: cap.iconBg }}
              >
                {cap.iconSrc ? (
                  <img
                    src={cap.iconSrc}
                    alt={cap.title}
                    className="h-[24px] w-[24px]"
                  />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FFC107" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <span className="block text-[16px] font-bold leading-[22px] text-primary">
                  {cap.title}
                </span>
                <span className="mt-[4px] block text-[13px] font-normal leading-[20px] text-primary line-clamp-2">
                  {cap.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  render(): ReactElement {
    return (
      <div className="flex w-full flex-col gap-y-[16px]">
        <div className="grid grid-cols-[6fr_7fr_6fr] gap-x-[16px] gap-y-[16px]">
          <div className="flex min-w-0 flex-col gap-y-[16px]">
            {this.renderStageCard()}
            {this.renderCustomerReviewCard()}
          </div>
          <div className="min-w-0">{this.renderMonicaShowcase()}</div>
          <div className="flex min-w-0 flex-col gap-y-[16px]">
            {this.renderProfileCard()}
            {this.renderCostSavingsCard()}
          </div>
        </div>
        <div className="grid grid-cols-[3fr_7fr] gap-x-[16px] gap-y-[16px]">
          {this.renderEfficiencyCard()}
          {this.renderCoreCompetenciesCard()}
        </div>
      </div>
    );
  }
}

export default injectIntl(ResumeTab);
