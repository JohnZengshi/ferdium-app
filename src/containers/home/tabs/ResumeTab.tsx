import { Component, type ReactElement } from 'react';
import { UserIcon, LockOnIcon, FolderOpenIcon } from 'tdesign-icons-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { type WrappedComponentProps, defineMessages, injectIntl } from 'react-intl';

const messages = defineMessages({
  stageSectionTitle: {
    id: 'resumeTab.stageSectionTitle',
    defaultMessage: '适用阶段',
  },
  stageIdentityQuestioning: {
    id: 'resumeTab.stageIdentityQuestioning',
    defaultMessage: '身份质疑阶段',
  },
  stageProductObjection: {
    id: 'resumeTab.stageProductObjection',
    defaultMessage: '产品异议阶段',
  },
  stageRiskConcern: {
    id: 'resumeTab.stageRiskConcern',
    defaultMessage: '风险顾虑阶段',
  },
  stageDigitalReply: {
    id: 'resumeTab.stageDigitalReply',
    defaultMessage: '数字员工回复',
  },
  stageComplaintRefund: {
    id: 'resumeTab.stageComplaintRefund',
    defaultMessage: '投诉/退款阶段',
  },
  stageHighIntentConversion: {
    id: 'resumeTab.stageHighIntentConversion',
    defaultMessage: '高意向转化阶段',
  },
  stageBusinessStartup: {
    id: 'resumeTab.stageBusinessStartup',
    defaultMessage: '业务启动期',
  },
  stageFastExpansion: {
    id: 'resumeTab.stageFastExpansion',
    defaultMessage: '快速扩张期',
  },
  stageEcosystemIntegration: {
    id: 'resumeTab.stageEcosystemIntegration',
    defaultMessage: '生态融合与战略升级期',
  },
  roleLabel: {
    id: 'resumeTab.roleLabel',
    defaultMessage: '职位：{role}',
  },
  defaultRole: {
    id: 'resumeTab.defaultRole',
    defaultMessage: '接管助手',
  },
  skillsSectionTitle: {
    id: 'resumeTab.skillsSectionTitle',
    defaultMessage: '具备技能',
  },
  defaultSkillRiskDetection: {
    id: 'resumeTab.defaultSkillRiskDetection',
    defaultMessage: '识别风险',
  },
  defaultSkillAnomalyWarning: {
    id: 'resumeTab.defaultSkillAnomalyWarning',
    defaultMessage: '预警异常',
  },
  defaultSkillHandover: {
    id: 'resumeTab.defaultSkillHandover',
    defaultMessage: '人工接管',
  },
  profileSectionTitle: {
    id: 'resumeTab.profileSectionTitle',
    defaultMessage: '个人介绍',
  },
  reviewSectionTitle: {
    id: 'resumeTab.reviewSectionTitle',
    defaultMessage: '客户评价',
  },
  reviewConversionRate: {
    id: 'resumeTab.reviewConversionRate',
    defaultMessage: '客户转化率提升了',
  },
  reviewConversionRateSuffix: {
    id: 'resumeTab.reviewConversionRateSuffix',
    defaultMessage: '，月均新增成交额超过2000w元',
  },
  reviewSatisfaction: {
    id: 'resumeTab.reviewSatisfaction',
    defaultMessage: '满意度评分从85分提升至98.5分，客户复购率增长',
  },
  reviewConsultationVolume: {
    id: 'resumeTab.reviewConsultationVolume',
    defaultMessage: '累计处理客户咨询超过230w次，帮助企业节省人力成本',
  },
  costSavingsTitle: {
    id: 'resumeTab.costSavingsTitle',
    defaultMessage: '成本节约数据',
  },
  costAxisLabel: {
    id: 'resumeTab.costAxisLabel',
    defaultMessage: '成本节约（万元）',
  },
  costTotalSavings: {
    id: 'resumeTab.costTotalSavings',
    defaultMessage: '总成本节约',
  },
  costDisputeDuration: {
    id: 'resumeTab.costDisputeDuration',
    defaultMessage: '纠纷处理时长缩短',
  },
  enterpriseSME: {
    id: 'resumeTab.enterpriseSME',
    defaultMessage: '中小型企业',
  },
  enterpriseLarge: {
    id: 'resumeTab.enterpriseLarge',
    defaultMessage: '大型企业',
  },
  enterpriseExtraLarge: {
    id: 'resumeTab.enterpriseExtraLarge',
    defaultMessage: '超大型企业',
  },
  efficiencySectionTitle: {
    id: 'resumeTab.efficiencySectionTitle',
    defaultMessage: '效率提升数据',
  },
  effCustomerWorkHour: {
    id: 'resumeTab.effCustomerWorkHour',
    defaultMessage: '节省客户工作时间',
  },
  effOperationEfficiency: {
    id: 'resumeTab.effOperationEfficiency',
    defaultMessage: '平均企业运营效率',
  },
  effProcessAutomation: {
    id: 'resumeTab.effProcessAutomation',
    defaultMessage: '流程自动化完成率',
  },
  effHighRiskInterception: {
    id: 'resumeTab.effHighRiskInterception',
    defaultMessage: '高风险拦截成功率',
  },
  coreCompetencyTitle: {
    id: 'resumeTab.coreCompetencyTitle',
    defaultMessage: '核心能力',
  },
  compRiskIdentification: {
    id: 'resumeTab.compRiskIdentification',
    defaultMessage: '风险识别',
  },
  compBoundaryControl: {
    id: 'resumeTab.compBoundaryControl',
    defaultMessage: '边界控制',
  },
  compHumanHandover: {
    id: 'resumeTab.compHumanHandover',
    defaultMessage: '人工接管触发',
  },
  compHighIntentAlert: {
    id: 'resumeTab.compHighIntentAlert',
    defaultMessage: '高意向预警',
  },
  compSessionPause: {
    id: 'resumeTab.compSessionPause',
    defaultMessage: '会话暂停控制',
  },
  compRiskIdentificationDesc: {
    id: 'resumeTab.compRiskIdentificationDesc',
    defaultMessage: '实时监测会话内容，智能识别潜在风险和异常行为',
  },
  compBoundaryControlDesc: {
    id: 'resumeTab.compBoundaryControlDesc',
    defaultMessage: '严格限定数字员工的行为边界和权限范围',
  },
  compHumanHandoverDesc: {
    id: 'resumeTab.compHumanHandoverDesc',
    defaultMessage: '当风险等级超过阈值时，自动触发人工接管流程',
  },
  compHighIntentAlertDesc: {
    id: 'resumeTab.compHighIntentAlertDesc',
    defaultMessage: '识别高意向客户并通知人工跟进，提升成交效率',
  },
  compSessionPauseDesc: {
    id: 'resumeTab.compSessionPauseDesc',
    defaultMessage: '在特定场景下自动暂停会话，等待人工介入处理',
  },
  defaultProfile: {
    id: 'resumeTab.defaultProfile',
    defaultMessage:
      'Monica 会持续监控所有会话，在识别到高风险、高异议、高价值或超出边界的问题时，自动触发预警并协助人工接管。',
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
    iconColor: string;
    iconText: string;
  }[];
  employeeName?: string;
  employeeRole?: string;
  avatarSrc?: string;
}

interface IProps extends ResumeTabProps, WrappedComponentProps { }

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
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={avatarSrcFinal}
            alt={name}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="absolute left-[15%] top-[18%] h-[8px] w-[8px] rounded-full bg-brand-light" />
        <div className="absolute right-[12%] top-[22%] h-[6px] w-[6px] rounded-full bg-brand-light" />
        <div className="absolute bottom-[25%] left-[10%] h-[10px] w-[10px] rounded-full bg-brand-light" />
        <div className="absolute bottom-[30%] right-[15%] h-[7px] w-[7px] rounded-full bg-brand-light" />
        <div className="absolute left-[25%] top-[35%] h-[5px] w-[5px] rounded-full bg-brand-light" />
        <div className="absolute right-[8%] top-[40%] h-[9px] w-[9px] rounded-full bg-brand-light" />

        <div className="relative z-10 ml-[40px] mt-[50px] flex flex-col items-start self-start">
          <span className="text-[48px] font-bold leading-[56px] text-primary">
            {name}
          </span>
          <span className="mt-[8px] text-[18px] font-semibold leading-[26px] text-primary">
            {intl.formatMessage(messages.roleLabel, { role })}
          </span>
        </div>

        <div className="relative z-10 mb-[19px] mt-auto flex flex-col items-center">
          <span className="mb-[12px] text-[18px] font-semibold leading-[26px] text-primary">
            {intl.formatMessage(messages.skillsSectionTitle)}
          </span>
          <div className="flex flex-wrap justify-center gap-[12px] px-[20px]">
            {[
              intl.formatMessage(messages.defaultSkillRiskDetection),
              intl.formatMessage(messages.defaultSkillAnomalyWarning),
              intl.formatMessage(messages.defaultSkillHandover),
            ].map(skill => (
              <span
                key={skill}
                className="inline-flex h-[38px] items-center justify-center rounded-[19px] border border-solid border-brand bg-container px-[16px] text-[14px] font-medium text-brand"
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
    const profileText =
      profile || intl.formatMessage(messages.defaultProfile);
    return (
      <div className="flex flex-col min-h-[148px] rounded-[8px] bg-container p-[24px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-brand-light">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand">
              <UserIcon />
            </div>
          </div>
          <span className="text-[20px] font-bold text-primary">
            {intl.formatMessage(messages.profileSectionTitle)}
          </span>
        </div>
        <p className="mt-[16px] text-[16px] font-normal text-secondary">
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
        highlight: '12倍',
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
              <FolderOpenIcon />
            </div>
          </div>
          <span className="text-[20px] font-bold text-primary">
            {intl.formatMessage(messages.reviewSectionTitle)}
          </span>
        </div>
        <div className="mt-[16px] flex flex-col gap-[19px]">
          {reviewItems.map((item, i) => (
            <div
              key={i}
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
    const costTitle = costLabel || intl.formatMessage(messages.costSavingsTitle);
    const costAxisLabelText =
      costLabel || intl.formatMessage(messages.costAxisLabel);
    const defaultBarData = [
      { label: intl.formatMessage(messages.enterpriseSME), value: 80 },
      { label: intl.formatMessage(messages.enterpriseLarge), value: 750 },
      { label: intl.formatMessage(messages.enterpriseExtraLarge), value: 1500 },
    ];
    const barData = costChartData || defaultBarData;
    const defaultYLabels = [1600, 1100, 600, 100, 0];
    const maxVal = Math.max(...barData.map(d => d.value));
    const yLabels = costChartData
      ? [
        maxVal,
        Math.round(maxVal * 0.7),
        Math.round(maxVal * 0.4),
        Math.round(maxVal * 0.1),
        0,
      ]
      : defaultYLabels;
    const getBarHeight = (value: number): number => {
      if (!costChartData) {
        if (value <= 100) return (value / 100) * 20;
        return 20 + ((value - 100) / 500) * 40;
      }
      const maxV = Math.max(...barData.map(d => d.value));
      const maxH = 100;
      return maxV > 0 ? (value / maxV) * maxH : 0;
    };
    const chartData = barData.map(d => ({
      ...d,
      barHeight: getBarHeight(d.value),
    }));
    const yTickValues = yLabels.map(v => getBarHeight(v));
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
      <div className="flex min-h-[428px] flex-col rounded-[12px] bg-container p-[24px]">
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
              margin={{ top: 4, right: 0, left: -32, bottom: 0 }}
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
                horizontalValues={yTickValues}
                style={{ stroke: 'var(--td-border-level-1-color)' }}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#666666' }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                ticks={yTickValues}
                width={32}
                tickFormatter={(v: number) => {
                  const idx = yTickValues.indexOf(v);
                  return yLabels[idx] === undefined
                    ? ''
                    : String(yLabels[idx]);
                }}
                tick={{ fontSize: 12, fill: '#999999' }}
                axisLine={false}
                tickLine={false}
                domain={[0, Math.max(...yTickValues)]}
              />
              <Bar
                dataKey="barHeight"
                radius={[4, 4, 0, 0]}
                barSize={52}
                fill="url(#barGradient)"
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="value"
                  position="top"
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
      <div className="flex min-h-[312px] flex-col rounded-[8px] bg-container p-[32px] pb-[36px] pt-[28px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-brand-light">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 5H8"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <span className="text-[20px] font-bold text-primary">
            {intl.formatMessage(messages.efficiencySectionTitle)}
          </span>
        </div>
        <div className="mt-[24px] flex flex-col gap-[20px]">
          {effData.map(item => (
            <div key={item.label} className="flex flex-col gap-[8px]">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-secondary">
                  {item.label}
                </span>
                <span className="text-[16px] font-bold text-brand">
                  {item.value}%
                </span>
              </div>
              <div className="h-[8px] w-full overflow-hidden rounded-[4px] bg-secondary-container">
                <div
                  className="h-full rounded-[4px]"
                  style={{
                    width: `${item.value}%`,
                    background:
                      'linear-gradient(90deg, #9CCCF7 0%, #5A96F2 100%)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  renderCoreCompetenciesCard(): ReactElement {
    const { intl, coreCompetencies } = this.props;
    const compData = coreCompetencies || [
      {
        title: intl.formatMessage(messages.compRiskIdentification),
        description: intl.formatMessage(messages.compRiskIdentificationDesc),
        iconBg: 'bg-error-light',
        iconColor: 'text-error',
        iconText: '⚠',
      },
      {
        title: intl.formatMessage(messages.compBoundaryControl),
        description: intl.formatMessage(messages.compBoundaryControlDesc),
        iconBg: 'bg-brand-light',
        iconColor: 'text-brand',
        iconText: '◈',
      },
      {
        title: intl.formatMessage(messages.compHumanHandover),
        description: intl.formatMessage(messages.compHumanHandoverDesc),
        iconBg: 'bg-warning-light',
        iconColor: 'text-warning',
        iconText: '◎',
      },
      {
        title: intl.formatMessage(messages.compHighIntentAlert),
        description: intl.formatMessage(messages.compHighIntentAlertDesc),
        iconBg: 'bg-success-light',
        iconColor: 'text-success',
        iconText: '◆',
      },
      {
        title: intl.formatMessage(messages.compSessionPause),
        description: intl.formatMessage(messages.compSessionPauseDesc),
        iconBg: 'bg-purple-50',
        iconColor: 'text-purple-600',
        iconText: '■',
      },
    ];
    return (
      <div className="flex min-h-[312px] flex-col rounded-[8px] bg-container p-[32px] pb-[36px] pt-[28px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-brand-light">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand">
              <LockOnIcon />
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
                className={`flex h-[48px] w-[48px] flex-shrink-0 items-center justify-center rounded-[8px] text-[20px] ${cap.iconBg} ${cap.iconColor}`}
              >
                {cap.iconText}
              </div>
              <div className="flex-1">
                <span className="block text-[16px] font-bold leading-[22px] text-primary">
                  {cap.title}
                </span>
                <span className="mt-[4px] block text-[13px] font-normal leading-[20px] text-placeholder line-clamp-2">
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
