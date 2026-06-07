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

const DEFAULT_STAGE_TAGS = [
  '身份质疑阶段',
  '产品异议阶段',
  '风险顾虑阶段',
  '数字员工回复',
  '投诉/退款阶段',
  '高意向转化阶段',
  '业务启动期',
  '快速扩张期',
  '生态融合与战略升级期',
];

const DEFAULT_EFFICIENCY_DATA = [
  { label: '节省客户工作时间', value: 82 },
  { label: '平均企业运营效率', value: 72 },
  { label: '流程自动化完成率', value: 95 },
  { label: '高风险拦截成功率', value: 99 },
];

const DEFAULT_CORE_COMPETENCIES = [
  {
    title: '风险识别',
    description: '实时监测会话内容，智能识别潜在风险和异常行为',
    iconBg: '#FFF1F0',
    iconColor: '#F53F3F',
    iconText: '⚠',
  },
  {
    title: '边界控制',
    description: '严格限定数字员工的行为边界和权限范围',
    iconBg: '#E8F5FF',
    iconColor: '#2080F0',
    iconText: '◈',
  },
  {
    title: '人工接管触发',
    description: '当风险等级超过阈值时，自动触发人工接管流程',
    iconBg: '#FFF7E6',
    iconColor: '#FAAD14',
    iconText: '◎',
  },
  {
    title: '高意向预警',
    description: '识别高意向客户并通知人工跟进，提升成交效率',
    iconBg: '#F0FFF0',
    iconColor: '#52C41A',
    iconText: '◆',
  },
  {
    title: '会话暂停控制',
    description: '在特定场景下自动暂停会话，等待人工介入处理',
    iconBg: '#F3F0FF',
    iconColor: '#722ED1',
    iconText: '■',
  },
];

class ResumeTab extends Component<ResumeTabProps> {
  renderStageCard(): ReactElement {
    const tags = this.props.stageTags || DEFAULT_STAGE_TAGS;
    return (
      <div className="flex h-[284px] flex-col rounded-[8px] bg-white p-[24px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#EEF3FF]">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#0052D9]">
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
          <span className="text-[20px] font-bold text-[#1F1F1F]">适用阶段</span>
        </div>
        <div className="mt-[16px] flex flex-wrap gap-[14px]">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex h-[28px] items-center justify-center rounded-[4px] bg-[#EEF4FF] px-[8px] text-[16px] font-medium text-[#0052D9]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }

  renderMonicaShowcase(): ReactElement {
    const name = this.props.employeeName || 'Monica';
    const role = this.props.employeeRole || '接管助手';
    const avatarSrc = this.props.avatarSrc || './assets/images/monica.png';
    return (
      <div className="relative flex h-full flex-col items-center overflow-hidden rounded-[8px]">
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={avatarSrc}
            alt={name}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="absolute left-[15%] top-[18%] h-[8px] w-[8px] rounded-full bg-[#D6E8FF]" />
        <div className="absolute right-[12%] top-[22%] h-[6px] w-[6px] rounded-full bg-[#B5D4FF]" />
        <div className="absolute bottom-[25%] left-[10%] h-[10px] w-[10px] rounded-full bg-[#C5D8FF]" />
        <div className="absolute bottom-[30%] right-[15%] h-[7px] w-[7px] rounded-full bg-[#D0E0FF]" />
        <div className="absolute left-[25%] top-[35%] h-[5px] w-[5px] rounded-full bg-[#E0ECFF]" />
        <div className="absolute right-[8%] top-[40%] h-[9px] w-[9px] rounded-full bg-[#C8DBFF]" />

        <div className="relative z-10 ml-[40px] mt-[50px] flex flex-col items-start self-start">
          <span className="text-[48px] font-bold leading-[56px] text-[#1F1F1F]">
            {name}
          </span>
          <span className="mt-[8px] text-[18px] font-semibold leading-[26px] text-[#222222]">
            职位：{role}
          </span>
        </div>

        <div className="relative z-10 mb-[19px] mt-auto flex flex-col items-center">
          <span className="mb-[12px] text-[18px] font-semibold leading-[26px] text-[#222222]">
            具备技能
          </span>
          <div className="flex flex-wrap justify-center gap-[12px] px-[20px]">
            {['识别风险', '预警异常', '人工接管'].map(skill => (
              <span
                key={skill}
                className="inline-flex h-[38px] items-center justify-center rounded-[19px] border border-solid border-[#2F6BFF] bg-white px-[16px] text-[14px] font-medium text-[#0052D9]"
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
    const profileText =
      this.props.profile ||
      'Monica 会持续监控所有会话，在识别到高风险、高异议、高价值或超出边界的问题时，自动触发预警并协助人工接管。';
    return (
      <div className="flex flex-col h-[148px] rounded-[8px] bg-white p-[24px] min-h-[148px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#EEF3FF]">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#0052D9]">
              <UserIcon />
            </div>
          </div>
          <span className="text-[20px] font-bold text-[#1F1F1F]">个人介绍</span>
        </div>
        <p className="mt-[16px] text-[16px] font-normal text-[#4E5969]">
          {profileText}
        </p>
      </div>
    );
  }

  renderCustomerReviewCard(): ReactElement {
    const reviews = this.props.reviews || [
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
    ];
    return (
      <div className="flex h-[292px] flex-col rounded-[8px] bg-white p-[24px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#EEF3FF]">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#0052D9]">
              <FolderOpenIcon />
            </div>
          </div>
          <span className="text-[20px] font-bold text-[#1F1F1F]">客户评价</span>
        </div>
        <div className="mt-[16px] flex flex-col gap-[19px]">
          {reviews.map((item, i) => (
            <div
              key={i}
              className="flex flex-row flex-wrap items-baseline border-l-[4px] border-solid border-[#0052D9] pl-[12px]"
            >
              <span className="text-[14px] font-normal leading-[24px] text-[#4E5969]">
                {item.text}
                {item.highlight && (
                  <span className="font-bold text-[#FF7A00]">
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
    const defaultBarData = [
      { label: '中小型企业', value: 80 },
      { label: '大型企业', value: 750 },
      { label: '超大型企业', value: 1500 },
    ];
    const barData = this.props.costChartData || defaultBarData;
    const defaultYLabels = [1600, 1100, 600, 100, 0];
    const maxVal = Math.max(...barData.map(d => d.value));
    const yLabels = this.props.costChartData
      ? [
          maxVal,
          Math.round(maxVal * 0.7),
          Math.round(maxVal * 0.4),
          Math.round(maxVal * 0.1),
          0,
        ]
      : defaultYLabels;
    const getBarHeight = (value: number): number => {
      if (!this.props.costChartData) {
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
    const costTitle = this.props.costLabel || '成本节约数据';
    const costAxisLabel = this.props.costLabel || '成本节约（万元）';
    const summaryItems = this.props.costSummary || [
      { label: '总成本节约', value: '12.6亿' },
      { label: '纠纷处理时长缩短', value: '67%' },
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
      <div className="flex h-[428px] flex-col rounded-[12px] bg-white p-[24px]">
        <div className="flex items-center gap-[12px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#EEF3FF]">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#0052D9]">
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
          <span className="text-[20px] font-bold leading-[28px] text-[#1F1F1F]">
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
                  <div className="h-[6px] w-[6px] flex-shrink-0 rounded-full bg-white" />
                  <span className="whitespace-nowrap text-[12px] font-medium leading-[16px] text-white">
                    {s.label}
                  </span>
                </div>
                <span
                  className="text-[24px] font-bold leading-[28px] text-white"
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

        <span className="mt-[24px] text-[14px] font-medium text-[#333333]">
          {costAxisLabel}
        </span>

        <div className="mt-[8px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 0, left: -32, bottom: 0 }}
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#BFDBFE" />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontalValues={yTickValues}
                stroke="#E5E5E5"
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
                  return yLabels[idx] === undefined ? '' : String(yLabels[idx]);
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
                  fill="#111827"
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
    const effData = this.props.efficiencyData || DEFAULT_EFFICIENCY_DATA;
    return (
      <div className="flex h-[312px] flex-col rounded-[8px] bg-white p-[32px] pb-[36px] pt-[28px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#EEF3FF]">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#0052D9]">
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
          <span className="text-[20px] font-bold text-[#1F1F1F]">
            效率提升数据
          </span>
        </div>
        <div className="mt-[24px] flex flex-col gap-[20px]">
          {effData.map(item => (
            <div key={item.label} className="flex flex-col gap-[8px]">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#4E5969]">
                  {item.label}
                </span>
                <span className="text-[16px] font-bold text-[#0052D9]">
                  {item.value}%
                </span>
              </div>
              <div className="h-[8px] w-full overflow-hidden rounded-[4px] bg-[#EEF1F5]">
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
    const compData = this.props.coreCompetencies || DEFAULT_CORE_COMPETENCIES;
    return (
      <div className="flex h-[312px] flex-col rounded-[8px] bg-white p-[32px] pb-[36px] pt-[28px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#EEF3FF]">
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#0052D9]">
              <LockOnIcon />
            </div>
          </div>
          <span className="text-[20px] font-bold text-[#1F1F1F]">核心能力</span>
        </div>
        <div className="mt-[10px] grid grid-cols-3 gap-[16px]">
          {compData.map(cap => (
            <div
              key={cap.title}
              className="flex items-start gap-[16px] rounded-[10px] border border-solid border-[#EEF1F5] bg-[#FAFBFD] p-[16px]"
            >
              <div
                className="flex h-[48px] w-[48px] flex-shrink-0 items-center justify-center rounded-[8px] text-[20px]"
                style={{ backgroundColor: cap.iconBg }}
              >
                {cap.iconText}
              </div>
              <div className="flex-1">
                <span className="block text-[16px] font-bold leading-[22px] text-[#1F1F1F]">
                  {cap.title}
                </span>
                <span className="mt-[4px] block text-[13px] font-normal leading-[20px] text-[#86909C] line-clamp-2">
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

export default ResumeTab;
