import { defineMessages } from 'react-intl';

export const employeeMonica = './assets/images/handover-assistant.png';
export const employeeMike = './assets/images/sales-director.png';
export const employeeAlice = './assets/images/emotional-companion.png';
export const employeeLily = './assets/images/business-specialist.png';
export const employeeAllen = './assets/images/risk-control-director.png';
export const employeeAmy = './assets/images/user-operations.png';

export interface EmployeeResume {
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

export const messages = defineMessages({
  // ─── Toast messages ───
  autoReplyEnabled: {
    id: 'homeScreen.autoReplyEnabled',
    defaultMessage: 'Auto reply enabled',
  },
  autoReplyDisabled: {
    id: 'homeScreen.autoReplyDisabled',
    defaultMessage: 'Auto reply disabled',
  },
  refreshSuccess: {
    id: 'homeScreen.refreshSuccess',
    defaultMessage: 'Session status refreshed successfully',
  },
  refreshError: {
    id: 'homeScreen.refreshError',
    defaultMessage: 'Failed to refresh session status',
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
    defaultMessage:
      'Let digital employees be your best sales partners, handling inquiries and automating conversions 24/7.',
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
    defaultMessage:
      'Click Profile Management on the left to create persona data',
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
    defaultMessage:
      'After setup, configure auto-reply for the social accounts and conversation tags. Finally, toggle the master switch on the homepage to activate your digital employees!',
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

  // ─── Employee Mike ───
  employeeMikeProfile: {
    id: 'homeScreen.employee.mike.profile',
    defaultMessage:
      'Mike is responsible for daily maintenance of the digital employee team, continuously monitoring service quality, and automatically alerting when customer satisfaction drops or churn risk exists.',
  },
  employeeMikeCostLabel: {
    id: 'homeScreen.employee.mike.costLabel',
    defaultMessage: 'Maintenance Cost (10K CNY)',
  },
  employeeMikeCostChart1: {
    id: 'homeScreen.employee.mike.costChart1',
    defaultMessage: 'Micro Enterprise',
  },
  employeeMikeCostChart2: {
    id: 'homeScreen.employee.mike.costChart2',
    defaultMessage: 'Medium Enterprise',
  },
  employeeMikeCostChart3: {
    id: 'homeScreen.employee.mike.costChart3',
    defaultMessage: 'Large Group',
  },
  employeeMikeCostSummary1: {
    id: 'homeScreen.employee.mike.costSummary1',
    defaultMessage: 'Total Revenue Recovered',
  },
  employeeMikeCostSummary2: {
    id: 'homeScreen.employee.mike.costSummary2',
    defaultMessage: 'Churn Rate Reduced',
  },
  employeeMikeEff1: {
    id: 'homeScreen.employee.mike.eff1',
    defaultMessage: 'Visit Completion Rate',
  },
  employeeMikeEff2: {
    id: 'homeScreen.employee.mike.eff2',
    defaultMessage: 'Complaint Response Rate',
  },
  employeeMikeEff3: {
    id: 'homeScreen.employee.mike.eff3',
    defaultMessage: 'Survey Coverage Rate',
  },
  employeeMikeEff4: {
    id: 'homeScreen.employee.mike.eff4',
    defaultMessage: 'Churn Prediction Accuracy',
  },
  employeeMikeStage1: {
    id: 'homeScreen.employee.mike.stage1',
    defaultMessage: 'Customer Silence',
  },
  employeeMikeStage2: {
    id: 'homeScreen.employee.mike.stage2',
    defaultMessage: 'Product Recommendation',
  },
  employeeMikeStage3: {
    id: 'homeScreen.employee.mike.stage3',
    defaultMessage: 'Complaint Escalation',
  },
  employeeMikeStage4: {
    id: 'homeScreen.employee.mike.stage4',
    defaultMessage: 'Promotion Sensitive',
  },
  employeeMikeStage5: {
    id: 'homeScreen.employee.mike.stage5',
    defaultMessage: 'Competitor Churn',
  },
  employeeMikeReview1Text: {
    id: 'homeScreen.employee.mike.review1Text',
    defaultMessage: 'Customer repurchase rate increased by',
  },
  employeeMikeReview1Suffix: {
    id: 'homeScreen.employee.mike.review1Suffix',
    defaultMessage: ', monthly recovery of over 150 churned customers',
  },
  employeeMikeReview2Text: {
    id: 'homeScreen.employee.mike.review2Text',
    defaultMessage:
      'Satisfaction score improved from 78 to 92, complaint response time reduced by',
  },
  employeeMikeReview3Text: {
    id: 'homeScreen.employee.mike.review3Text',
    defaultMessage:
      'Completed over 800K customer visits, retention rate increased by',
  },
  employeeMikeComp1Title: {
    id: 'homeScreen.employee.mike.comp1Title',
    defaultMessage: 'Scheduled Visits',
  },
  employeeMikeComp1Desc: {
    id: 'homeScreen.employee.mike.comp1Desc',
    defaultMessage:
      'Automatically plan visit schedules and proactively reach out to maintain relationships',
  },
  employeeMikeComp2Title: {
    id: 'homeScreen.employee.mike.comp2Title',
    defaultMessage: 'Satisfaction Survey',
  },
  employeeMikeComp2Desc: {
    id: 'homeScreen.employee.mike.comp2Desc',
    defaultMessage: 'Auto-send surveys and analyze results',
  },
  employeeMikeComp3Title: {
    id: 'homeScreen.employee.mike.comp3Title',
    defaultMessage: 'Churn Warning',
  },
  employeeMikeComp3Desc: {
    id: 'homeScreen.employee.mike.comp3Desc',
    defaultMessage: 'Predict churn risk based on behavioral models',
  },
  employeeMikeComp4Title: {
    id: 'homeScreen.employee.mike.comp4Title',
    defaultMessage: 'Service Monitoring',
  },
  employeeMikeComp4Desc: {
    id: 'homeScreen.employee.mike.comp4Desc',
    defaultMessage: 'Real-time monitoring of service quality metric anomalies',
  },
  employeeMikeComp5Title: {
    id: 'homeScreen.employee.mike.comp5Title',
    defaultMessage: 'Care Reminder',
  },
  employeeMikeComp5Desc: {
    id: 'homeScreen.employee.mike.comp5Desc',
    defaultMessage: 'Auto-send care notifications at key touchpoints',
  },

  // ─── Employee Alice ───
  employeeAliceProfile: {
    id: 'homeScreen.employee.alice.profile',
    defaultMessage:
      'Alice has precise community reach capabilities, intelligently matching personalized marketing content based on customer profiles to achieve efficient conversions.',
  },
  employeeAliceCostLabel: {
    id: 'homeScreen.employee.alice.costLabel',
    defaultMessage: 'Marketing Spend (10K CNY)',
  },
  employeeAliceCostChart1: {
    id: 'homeScreen.employee.alice.costChart1',
    defaultMessage: 'Small Campaign',
  },
  employeeAliceCostChart2: {
    id: 'homeScreen.employee.alice.costChart2',
    defaultMessage: 'Medium Campaign',
  },
  employeeAliceCostChart3: {
    id: 'homeScreen.employee.alice.costChart3',
    defaultMessage: 'Large Campaign',
  },
  employeeAliceCostSummary1: {
    id: 'homeScreen.employee.alice.costSummary1',
    defaultMessage: 'Average ROI',
  },
  employeeAliceCostSummary2: {
    id: 'homeScreen.employee.alice.costSummary2',
    defaultMessage: 'Marketing Cost Reduced',
  },
  employeeAliceEff1: {
    id: 'homeScreen.employee.alice.eff1',
    defaultMessage: 'Copywriting Efficiency',
  },
  employeeAliceEff2: {
    id: 'homeScreen.employee.alice.eff2',
    defaultMessage: 'Community Reach Precision',
  },
  employeeAliceEff3: {
    id: 'homeScreen.employee.alice.eff3',
    defaultMessage: 'Campaign Analysis Speed',
  },
  employeeAliceEff4: {
    id: 'homeScreen.employee.alice.eff4',
    defaultMessage: 'Marketing ROI Uplift',
  },
  employeeAliceStage1: {
    id: 'homeScreen.employee.alice.stage1',
    defaultMessage: 'Brand Awareness',
  },
  employeeAliceStage2: {
    id: 'homeScreen.employee.alice.stage2',
    defaultMessage: 'Campaign Preheating',
  },
  employeeAliceStage3: {
    id: 'homeScreen.employee.alice.stage3',
    defaultMessage: 'Community Operations',
  },
  employeeAliceStage4: {
    id: 'homeScreen.employee.alice.stage4',
    defaultMessage: 'Content Distribution',
  },
  employeeAliceStage5: {
    id: 'homeScreen.employee.alice.stage5',
    defaultMessage: 'Conversion Harvest',
  },
  employeeAliceReview1Text: {
    id: 'homeScreen.employee.alice.review1Text',
    defaultMessage: 'Campaign click-through rate increased by',
  },
  employeeAliceReview1Suffix: {
    id: 'homeScreen.employee.alice.review1Suffix',
    defaultMessage: ', average conversion rate 32% per campaign',
  },
  employeeAliceReview2Text: {
    id: 'homeScreen.employee.alice.review2Text',
    defaultMessage: 'Community engagement increased by',
  },
  employeeAliceReview2Suffix: {
    id: 'homeScreen.employee.alice.review2Suffix',
    defaultMessage: ', user retention up 45%',
  },
  employeeAliceReview3Text: {
    id: 'homeScreen.employee.alice.review3Text',
    defaultMessage:
      'Completed over 12K viral copies, content production efficiency improved',
  },
  employeeAliceComp1Title: {
    id: 'homeScreen.employee.alice.comp1Title',
    defaultMessage: 'Viral Copywriting',
  },
  employeeAliceComp1Desc: {
    id: 'homeScreen.employee.alice.comp1Desc',
    defaultMessage:
      'Generate high-conversion marketing copy based on AIDA model',
  },
  employeeAliceComp2Title: {
    id: 'homeScreen.employee.alice.comp2Title',
    defaultMessage: 'Precision Community Reach',
  },
  employeeAliceComp2Desc: {
    id: 'homeScreen.employee.alice.comp2Desc',
    defaultMessage: 'Match marketing content precisely based on user profiles',
  },
  employeeAliceComp3Title: {
    id: 'homeScreen.employee.alice.comp3Title',
    defaultMessage: 'Campaign Analytics',
  },
  employeeAliceComp3Desc: {
    id: 'homeScreen.employee.alice.comp3Desc',
    defaultMessage:
      'Multi-dimensional analysis of campaign ROI and user engagement',
  },
  employeeAliceComp4Title: {
    id: 'homeScreen.employee.alice.comp4Title',
    defaultMessage: 'Content Matrix Management',
  },
  employeeAliceComp4Desc: {
    id: 'homeScreen.employee.alice.comp4Desc',
    defaultMessage:
      'Coordinate multi-platform content publishing and scheduling',
  },
  employeeAliceComp5Title: {
    id: 'homeScreen.employee.alice.comp5Title',
    defaultMessage: 'User Profile Building',
  },
  employeeAliceComp5Desc: {
    id: 'homeScreen.employee.alice.comp5Desc',
    defaultMessage: 'Auto-aggregate user behavior data to build tag system',
  },

  // ─── Employee Lily ───
  employeeLilyProfile: {
    id: 'homeScreen.employee.lily.profile',
    defaultMessage:
      'Lily specializes in after-sales support, quickly responding to customer issues, auto-matching knowledge base solutions, and guiding customers through complex business processes.',
  },
  employeeLilyCostLabel: {
    id: 'homeScreen.employee.lily.costLabel',
    defaultMessage: 'After-Sales Cost (10K CNY)',
  },
  employeeLilyCostChart1: {
    id: 'homeScreen.employee.lily.costChart1',
    defaultMessage: 'Small Enterprise',
  },
  employeeLilyCostChart2: {
    id: 'homeScreen.employee.lily.costChart2',
    defaultMessage: 'Medium Enterprise',
  },
  employeeLilyCostChart3: {
    id: 'homeScreen.employee.lily.costChart3',
    defaultMessage: 'Large Enterprise',
  },
  employeeLilyCostSummary1: {
    id: 'homeScreen.employee.lily.costSummary1',
    defaultMessage: 'Labor Cost Saved',
  },
  employeeLilyCostSummary2: {
    id: 'homeScreen.employee.lily.costSummary2',
    defaultMessage: 'Service Time Reduced',
  },
  employeeLilyEff1: {
    id: 'homeScreen.employee.lily.eff1',
    defaultMessage: 'Quick Response Rate',
  },
  employeeLilyEff2: {
    id: 'homeScreen.employee.lily.eff2',
    defaultMessage: 'Knowledge Match Accuracy',
  },
  employeeLilyEff3: {
    id: 'homeScreen.employee.lily.eff3',
    defaultMessage: 'Complex Process Completion',
  },
  employeeLilyEff4: {
    id: 'homeScreen.employee.lily.eff4',
    defaultMessage: 'Follow-up Completion Rate',
  },
  employeeLilyStage1: {
    id: 'homeScreen.employee.lily.stage1',
    defaultMessage: 'After-Sales Inquiry',
  },
  employeeLilyStage2: {
    id: 'homeScreen.employee.lily.stage2',
    defaultMessage: 'Refund Processing',
  },
  employeeLilyStage3: {
    id: 'homeScreen.employee.lily.stage3',
    defaultMessage: 'Complaint Escalation',
  },
  employeeLilyStage4: {
    id: 'homeScreen.employee.lily.stage4',
    defaultMessage: 'Satisfaction Follow-up',
  },
  employeeLilyStage5: {
    id: 'homeScreen.employee.lily.stage5',
    defaultMessage: 'Repurchase Guidance',
  },
  employeeLilyReview1Text: {
    id: 'homeScreen.employee.lily.review1Text',
    defaultMessage: 'Response time reduced from 15min to',
  },
  employeeLilyReview1Suffix: {
    id: 'homeScreen.employee.lily.review1Suffix',
    defaultMessage: ', customer satisfaction up 32%',
  },
  employeeLilyReview2Text: {
    id: 'homeScreen.employee.lily.review2Text',
    defaultMessage: 'Refund processing efficiency improved by',
  },
  employeeLilyReview2Suffix: {
    id: 'homeScreen.employee.lily.review2Suffix',
    defaultMessage: ', processing reduced from 48h to 6h',
  },
  employeeLilyReview3Text: {
    id: 'homeScreen.employee.lily.review3Text',
    defaultMessage: 'Knowledge base match accuracy reaches',
  },
  employeeLilyReview3Suffix: {
    id: 'homeScreen.employee.lily.review3Suffix',
    defaultMessage: ', first-contact resolution rate up to 86%',
  },
  employeeLilyComp1Title: {
    id: 'homeScreen.employee.lily.comp1Title',
    defaultMessage: 'Quick Response',
  },
  employeeLilyComp1Desc: {
    id: 'homeScreen.employee.lily.comp1Desc',
    defaultMessage: '24/7 online, sub-second response to after-sales issues',
  },
  employeeLilyComp2Title: {
    id: 'homeScreen.employee.lily.comp2Title',
    defaultMessage: 'Knowledge Base Auto-Match',
  },
  employeeLilyComp2Desc: {
    id: 'homeScreen.employee.lily.comp2Desc',
    defaultMessage: 'Smart match knowledge base solutions and auto-push',
  },
  employeeLilyComp3Title: {
    id: 'homeScreen.employee.lily.comp3Title',
    defaultMessage: 'Complex Process Guidance',
  },
  employeeLilyComp3Desc: {
    id: 'homeScreen.employee.lily.comp3Desc',
    defaultMessage: 'Step-by-step guidance for business operations',
  },
  employeeLilyComp4Title: {
    id: 'homeScreen.employee.lily.comp4Title',
    defaultMessage: 'Smart Refund Processing',
  },
  employeeLilyComp4Desc: {
    id: 'homeScreen.employee.lily.comp4Desc',
    defaultMessage: 'Auto-audit refund eligibility and trigger processing',
  },
  employeeLilyComp5Title: {
    id: 'homeScreen.employee.lily.comp5Title',
    defaultMessage: 'Repurchase Guidance',
  },
  employeeLilyComp5Desc: {
    id: 'homeScreen.employee.lily.comp5Desc',
    defaultMessage:
      'Auto-push repurchase reminders and offers at conversation end',
  },

  // ─── Employee Allen ───
  employeeAllenProfile: {
    id: 'homeScreen.employee.allen.profile',
    defaultMessage:
      'Allen focuses on lead collection and cleaning, scraping information from multiple channels, auto-identifying key contacts, and pre-screening to improve sales team efficiency.',
  },
  employeeAllenCostLabel: {
    id: 'homeScreen.employee.allen.costLabel',
    defaultMessage: 'Acquisition Cost (10K CNY)',
  },
  employeeAllenCostChart1: {
    id: 'homeScreen.employee.allen.costChart1',
    defaultMessage: 'Startup',
  },
  employeeAllenCostChart2: {
    id: 'homeScreen.employee.allen.costChart2',
    defaultMessage: 'Growth Stage',
  },
  employeeAllenCostChart3: {
    id: 'homeScreen.employee.allen.costChart3',
    defaultMessage: 'Mature Enterprise',
  },
  employeeAllenCostSummary1: {
    id: 'homeScreen.employee.allen.costSummary1',
    defaultMessage: 'Acquisition Cost Reduced',
  },
  employeeAllenCostSummary2: {
    id: 'homeScreen.employee.allen.costSummary2',
    defaultMessage: 'Lead Conversion Rate Up',
  },
  employeeAllenEff1: {
    id: 'homeScreen.employee.allen.eff1',
    defaultMessage: 'Web Scraping Coverage',
  },
  employeeAllenEff2: {
    id: 'homeScreen.employee.allen.eff2',
    defaultMessage: 'Key Contact Recognition',
  },
  employeeAllenEff3: {
    id: 'homeScreen.employee.allen.eff3',
    defaultMessage: 'Lead Screening Automation',
  },
  employeeAllenEff4: {
    id: 'homeScreen.employee.allen.eff4',
    defaultMessage: 'Sales Follow-up Efficiency',
  },
  employeeAllenStage1: {
    id: 'homeScreen.employee.allen.stage1',
    defaultMessage: 'Info Collection',
  },
  employeeAllenStage2: {
    id: 'homeScreen.employee.allen.stage2',
    defaultMessage: 'Lead Screening',
  },
  employeeAllenStage3: {
    id: 'homeScreen.employee.allen.stage3',
    defaultMessage: 'Customer Reach',
  },
  employeeAllenStage4: {
    id: 'homeScreen.employee.allen.stage4',
    defaultMessage: 'Needs Discovery',
  },
  employeeAllenStage5: {
    id: 'homeScreen.employee.allen.stage5',
    defaultMessage: 'Conversion Follow-up',
  },
  employeeAllenReview1Text: {
    id: 'homeScreen.employee.allen.review1Text',
    defaultMessage: 'Lead collection efficiency improved by',
  },
  employeeAllenReview1Suffix: {
    id: 'homeScreen.employee.allen.review1Suffix',
    defaultMessage: ', daily collection of 5000+ leads',
  },
  employeeAllenReview2Text: {
    id: 'homeScreen.employee.allen.review2Text',
    defaultMessage: 'Lead screening accuracy reaches',
  },
  employeeAllenReview2Suffix: {
    id: 'homeScreen.employee.allen.review2Suffix',
    defaultMessage: ', invalid leads reduced by 62%',
  },
  employeeAllenReview3Text: {
    id: 'homeScreen.employee.allen.review3Text',
    defaultMessage: 'Sales follow-up efficiency improved',
  },
  employeeAllenReview3Suffix: {
    id: 'homeScreen.employee.allen.review3Suffix',
    defaultMessage: ', conversion rate up 35%',
  },
  employeeAllenComp1Title: {
    id: 'homeScreen.employee.allen.comp1Title',
    defaultMessage: 'Web-wide Scraping',
  },
  employeeAllenComp1Desc: {
    id: 'homeScreen.employee.allen.comp1Desc',
    defaultMessage: 'Multi-source data collection, auto-aggregate leads',
  },
  employeeAllenComp2Title: {
    id: 'homeScreen.employee.allen.comp2Title',
    defaultMessage: 'Key Contact Identification',
  },
  employeeAllenComp2Desc: {
    id: 'homeScreen.employee.allen.comp2Desc',
    defaultMessage: 'Identify key decision-makers via social graph',
  },
  employeeAllenComp3Title: {
    id: 'homeScreen.employee.allen.comp3Title',
    defaultMessage: 'Lead Pre-Screening',
  },
  employeeAllenComp3Desc: {
    id: 'homeScreen.employee.allen.comp3Desc',
    defaultMessage: 'Multi-dimensional scoring to screen high-value leads',
  },
  employeeAllenComp4Title: {
    id: 'homeScreen.employee.allen.comp4Title',
    defaultMessage: 'Customer Profile Building',
  },
  employeeAllenComp4Desc: {
    id: 'homeScreen.employee.allen.comp4Desc',
    defaultMessage: 'Auto-build 360-degree customer profiles',
  },
  employeeAllenComp5Title: {
    id: 'homeScreen.employee.allen.comp5Title',
    defaultMessage: 'Smart Lead Assignment',
  },
  employeeAllenComp5Desc: {
    id: 'homeScreen.employee.allen.comp5Desc',
    defaultMessage: 'Auto-assign leads by industry/region',
  },

  // ─── Employee Amy ───
  employeeAmyProfile: {
    id: 'homeScreen.employee.amy.profile',
    defaultMessage:
      'Amy excels at business development, auto-generating personalized business letters, intelligently matching potential partners, efficiently scheduling meetings and managing calendars.',
  },
  employeeAmyCostLabel: {
    id: 'homeScreen.employee.amy.costLabel',
    defaultMessage: 'BD Cost (10K CNY)',
  },
  employeeAmyCostChart1: {
    id: 'homeScreen.employee.amy.costChart1',
    defaultMessage: 'Small Partnership',
  },
  employeeAmyCostChart2: {
    id: 'homeScreen.employee.amy.costChart2',
    defaultMessage: 'Medium Partnership',
  },
  employeeAmyCostChart3: {
    id: 'homeScreen.employee.amy.costChart3',
    defaultMessage: 'Strategic Alliance',
  },
  employeeAmyCostSummary1: {
    id: 'homeScreen.employee.amy.costSummary1',
    defaultMessage: 'BD Cost Reduced',
  },
  employeeAmyCostSummary2: {
    id: 'homeScreen.employee.amy.costSummary2',
    defaultMessage: 'Deal Signing Rate Up',
  },
  employeeAmyEff1: {
    id: 'homeScreen.employee.amy.eff1',
    defaultMessage: 'Partner Discovery Precision',
  },
  employeeAmyEff2: {
    id: 'homeScreen.employee.amy.eff2',
    defaultMessage: 'Letter Auto-Generation Rate',
  },
  employeeAmyEff3: {
    id: 'homeScreen.employee.amy.eff3',
    defaultMessage: 'Meeting Scheduling Automation',
  },
  employeeAmyEff4: {
    id: 'homeScreen.employee.amy.eff4',
    defaultMessage: 'Partnership Process Efficiency',
  },
  employeeAmyStage1: {
    id: 'homeScreen.employee.amy.stage1',
    defaultMessage: 'Business Introduction',
  },
  employeeAmyStage2: {
    id: 'homeScreen.employee.amy.stage2',
    defaultMessage: 'Negotiation',
  },
  employeeAmyStage3: {
    id: 'homeScreen.employee.amy.stage3',
    defaultMessage: 'Contract Approval',
  },
  employeeAmyStage4: {
    id: 'homeScreen.employee.amy.stage4',
    defaultMessage: 'Project Delivery',
  },
  employeeAmyStage5: {
    id: 'homeScreen.employee.amy.stage5',
    defaultMessage: 'Ecosystem Collaboration',
  },
  employeeAmyReview1Text: {
    id: 'homeScreen.employee.amy.review1Text',
    defaultMessage: 'BD efficiency increased by',
  },
  employeeAmyReview1Suffix: {
    id: 'homeScreen.employee.amy.review1Suffix',
    defaultMessage: ', 60+ business meetings per month',
  },
  employeeAmyReview2Text: {
    id: 'homeScreen.employee.amy.review2Text',
    defaultMessage: 'Partner match accuracy reaches',
  },
  employeeAmyReview2Suffix: {
    id: 'homeScreen.employee.amy.review2Suffix',
    defaultMessage: ', collaboration intent conversion up 48%',
  },
  employeeAmyReview3Text: {
    id: 'homeScreen.employee.amy.review3Text',
    defaultMessage: 'Business letter production improved',
  },
  employeeAmyReview3Suffix: {
    id: 'homeScreen.employee.amy.review3Suffix',
    defaultMessage: ', letter response rate up to 56%',
  },
  employeeAmyComp1Title: {
    id: 'homeScreen.employee.amy.comp1Title',
    defaultMessage: 'Partner Discovery',
  },
  employeeAmyComp1Desc: {
    id: 'homeScreen.employee.amy.comp1Desc',
    defaultMessage: 'Smart match potential partners via industry graph',
  },
  employeeAmyComp2Title: {
    id: 'homeScreen.employee.amy.comp2Title',
    defaultMessage: 'Business Letter Writing',
  },
  employeeAmyComp2Desc: {
    id: 'homeScreen.employee.amy.comp2Desc',
    defaultMessage: 'Personalized generation of professional business letters',
  },
  employeeAmyComp3Title: {
    id: 'homeScreen.employee.amy.comp3Title',
    defaultMessage: 'Meeting Scheduling',
  },
  employeeAmyComp3Desc: {
    id: 'homeScreen.employee.amy.comp3Desc',
    defaultMessage: 'Auto-coordinate schedules to arrange meetings',
  },
  employeeAmyComp4Title: {
    id: 'homeScreen.employee.amy.comp4Title',
    defaultMessage: 'Contract Clause Analysis',
  },
  employeeAmyComp4Desc: {
    id: 'homeScreen.employee.amy.comp4Desc',
    defaultMessage: 'Smart identify key clauses and risk points',
  },
  employeeAmyComp5Title: {
    id: 'homeScreen.employee.amy.comp5Title',
    defaultMessage: 'Ecosystem Resource Mgmt',
  },
  employeeAmyComp5Desc: {
    id: 'homeScreen.employee.amy.comp5Desc',
    defaultMessage: 'Track full lifecycle of partnership progress',
  },
});

export const MOCK_EMPLOYEES = [
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
    capabilityDefaults: [
      '24/7 Online',
      'Multilingual Communication',
      'Smart Demand Mining',
    ],
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
    capabilityDefaults: [
      'Regular Follow-up',
      'Satisfaction Survey',
      'Churn Warning',
    ],
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
    capabilityDefaults: [
      'Viral Copywriting',
      'Precision Community Targeting',
      'Campaign Analysis',
    ],
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
    capabilityDefaults: [
      'Quick Response',
      'Knowledge Base Auto-Matching',
      'Complex Process Guidance',
    ],
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
    capabilityDefaults: [
      'Web-wide Data Scraping',
      'Key Contact Identification',
      'Lead Screening',
    ],
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
    capabilityDefaults: [
      'Partner Mining',
      'Business Letter Writing',
      'Meeting Scheduling',
    ],
    ctaKey: 'homeScreen.resume',
    ctaDefault: 'Resume',
  },
];

export function getEmployeeResumes(intl: any): Record<string, EmployeeResume> {
  return {
    monica: {
      name: 'Monica',
      avatarSrc: './assets/images/monica.png',
      employeeRole: intl.formatMessage(messages.roleSeniorSalesExpert),
      stageTags: [
        intl.formatMessage({
          id: 'resumeTab.stageIdentityQuestioning',
          defaultMessage: '',
        }),
        intl.formatMessage({
          id: 'resumeTab.stageProductObjection',
          defaultMessage: '',
        }),
        intl.formatMessage({
          id: 'resumeTab.stageRiskConcern',
          defaultMessage: '',
        }),
        intl.formatMessage({
          id: 'resumeTab.stageDigitalReply',
          defaultMessage: '',
        }),
        intl.formatMessage({
          id: 'resumeTab.stageComplaintRefund',
          defaultMessage: '',
        }),
        intl.formatMessage({
          id: 'resumeTab.stageHighIntentConversion',
          defaultMessage: '',
        }),
        intl.formatMessage({
          id: 'resumeTab.stageBusinessStartup',
          defaultMessage: '',
        }),
        intl.formatMessage({
          id: 'resumeTab.stageFastExpansion',
          defaultMessage: '',
        }),
        intl.formatMessage({
          id: 'resumeTab.stageEcosystemIntegration',
          defaultMessage: '',
        }),
      ],
      profile: intl.formatMessage({
        id: 'resumeTab.defaultProfile',
        defaultMessage: '',
      }),
      reviews: [
        {
          text: intl.formatMessage({
            id: 'resumeTab.reviewConversionRate',
            defaultMessage: '',
          }),
          highlight: '12%',
          suffix: intl.formatMessage({
            id: 'resumeTab.reviewConversionRateSuffix',
            defaultMessage: '',
          }),
        },
        {
          text: intl.formatMessage({
            id: 'resumeTab.reviewSatisfaction',
            defaultMessage: '',
          }),
          highlight: '12x',
        },
        {
          text: intl.formatMessage({
            id: 'resumeTab.reviewConsultationVolume',
            defaultMessage: '',
          }),
          highlight: '41%',
        },
      ],
      costLabel: intl.formatMessage({
        id: 'resumeTab.costAxisLabel',
        defaultMessage: '',
      }),
      costChartData: [
        {
          label: intl.formatMessage({
            id: 'resumeTab.enterpriseSME',
            defaultMessage: '',
          }),
          value: 80,
        },
        {
          label: intl.formatMessage({
            id: 'resumeTab.enterpriseLarge',
            defaultMessage: '',
          }),
          value: 750,
        },
        {
          label: intl.formatMessage({
            id: 'resumeTab.enterpriseExtraLarge',
            defaultMessage: '',
          }),
          value: 1500,
        },
      ],
      costSummary: [
        {
          label: intl.formatMessage({
            id: 'resumeTab.costTotalSavings',
            defaultMessage: '',
          }),
          value: '1.26B',
        },
        {
          label: intl.formatMessage({
            id: 'resumeTab.costDisputeDuration',
            defaultMessage: '',
          }),
          value: '67%',
        },
      ],
      efficiencyData: [
        {
          label: intl.formatMessage({
            id: 'resumeTab.effCustomerWorkHour',
            defaultMessage: '',
          }),
          value: 82,
        },
        {
          label: intl.formatMessage({
            id: 'resumeTab.effOperationEfficiency',
            defaultMessage: '',
          }),
          value: 72,
        },
        {
          label: intl.formatMessage({
            id: 'resumeTab.effProcessAutomation',
            defaultMessage: '',
          }),
          value: 95,
        },
        {
          label: intl.formatMessage({
            id: 'resumeTab.effHighRiskInterception',
            defaultMessage: '',
          }),
          value: 99,
        },
      ],
      coreCompetencies: [
        {
          title: intl.formatMessage({
            id: 'resumeTab.compRiskIdentification',
            defaultMessage: '',
          }),
          description: intl.formatMessage({
            id: 'resumeTab.compRiskIdentificationDesc',
            defaultMessage: '',
          }),
          iconBg: '#FFF1F0',
          iconText: '⚠',
        },
        {
          title: intl.formatMessage({
            id: 'resumeTab.compBoundaryControl',
            defaultMessage: '',
          }),
          description: intl.formatMessage({
            id: 'resumeTab.compBoundaryControlDesc',
            defaultMessage: '',
          }),
          iconBg: '#E8F5FF',
          iconText: '◈',
        },
        {
          title: intl.formatMessage({
            id: 'resumeTab.compHumanHandover',
            defaultMessage: '',
          }),
          description: intl.formatMessage({
            id: 'resumeTab.compHumanHandoverDesc',
            defaultMessage: '',
          }),
          iconBg: '#FFF7E6',
          iconText: '◎',
        },
        {
          title: intl.formatMessage({
            id: 'resumeTab.compHighIntentAlert',
            defaultMessage: '',
          }),
          description: intl.formatMessage({
            id: 'resumeTab.compHighIntentAlertDesc',
            defaultMessage: '',
          }),
          iconBg: '#F0FFF0',
          iconText: '◆',
        },
        {
          title: intl.formatMessage({
            id: 'resumeTab.compSessionPause',
            defaultMessage: '',
          }),
          description: intl.formatMessage({
            id: 'resumeTab.compSessionPauseDesc',
            defaultMessage: '',
          }),
          iconBg: '#F3F0FF',
          iconText: '■',
        },
      ],
    },
    mike: {
      name: 'Mike',
      avatarSrc: './assets/images/mike.png',
      employeeRole: intl.formatMessage(messages.roleCustomerMaintenance),
      stageTags: [
        intl.formatMessage(messages.employeeMikeStage1),
        intl.formatMessage(messages.employeeMikeStage2),
        intl.formatMessage(messages.employeeMikeStage3),
        intl.formatMessage(messages.employeeMikeStage4),
        intl.formatMessage(messages.employeeMikeStage5),
      ],
      profile: intl.formatMessage(messages.employeeMikeProfile),
      reviews: [
        {
          text: intl.formatMessage(messages.employeeMikeReview1Text),
          highlight: '23%',
          suffix: intl.formatMessage(messages.employeeMikeReview1Suffix),
        },
        {
          text: intl.formatMessage(messages.employeeMikeReview2Text),
          highlight: '65%',
        },
        {
          text: intl.formatMessage(messages.employeeMikeReview3Text),
          highlight: '18%',
        },
      ],
      costLabel: intl.formatMessage(messages.employeeMikeCostLabel),
      costChartData: [
        {
          label: intl.formatMessage(messages.employeeMikeCostChart1),
          value: 30,
        },
        {
          label: intl.formatMessage(messages.employeeMikeCostChart2),
          value: 200,
        },
        {
          label: intl.formatMessage(messages.employeeMikeCostChart3),
          value: 800,
        },
      ],
      costSummary: [
        {
          label: intl.formatMessage(messages.employeeMikeCostSummary1),
          value: '830M',
        },
        {
          label: intl.formatMessage(messages.employeeMikeCostSummary2),
          value: '42%',
        },
      ],
      efficiencyData: [
        { label: intl.formatMessage(messages.employeeMikeEff1), value: 94 },
        { label: intl.formatMessage(messages.employeeMikeEff2), value: 88 },
        { label: intl.formatMessage(messages.employeeMikeEff3), value: 76 },
        { label: intl.formatMessage(messages.employeeMikeEff4), value: 91 },
      ],
      coreCompetencies: [
        {
          title: intl.formatMessage(messages.employeeMikeComp1Title),
          description: intl.formatMessage(messages.employeeMikeComp1Desc),
          iconBg: '#FFF1F0',
          iconText: '🔔',
        },
        {
          title: intl.formatMessage(messages.employeeMikeComp2Title),
          description: intl.formatMessage(messages.employeeMikeComp2Desc),
          iconBg: '#E8F5FF',
          iconText: '📊',
        },
        {
          title: intl.formatMessage(messages.employeeMikeComp3Title),
          description: intl.formatMessage(messages.employeeMikeComp3Desc),
          iconBg: '#FFF7E6',
          iconText: '⚠',
        },
        {
          title: intl.formatMessage(messages.employeeMikeComp4Title),
          description: intl.formatMessage(messages.employeeMikeComp4Desc),
          iconBg: '#F0FFF0',
          iconText: '📈',
        },
        {
          title: intl.formatMessage(messages.employeeMikeComp5Title),
          description: intl.formatMessage(messages.employeeMikeComp5Desc),
          iconBg: '#F3F0FF',
          iconText: '💌',
        },
      ],
    },
    alice: {
      name: 'Alice',
      avatarSrc: './assets/images/alice.png',
      employeeRole: intl.formatMessage(messages.roleMarketingAmbassador),
      stageTags: [
        intl.formatMessage(messages.employeeAliceStage1),
        intl.formatMessage(messages.employeeAliceStage2),
        intl.formatMessage(messages.employeeAliceStage3),
        intl.formatMessage(messages.employeeAliceStage4),
        intl.formatMessage(messages.employeeAliceStage5),
      ],
      profile: intl.formatMessage(messages.employeeAliceProfile),
      reviews: [
        {
          text: intl.formatMessage(messages.employeeAliceReview1Text),
          highlight: '156%',
          suffix: intl.formatMessage(messages.employeeAliceReview1Suffix),
        },
        {
          text: intl.formatMessage(messages.employeeAliceReview2Text),
          highlight: '89%',
          suffix: intl.formatMessage(messages.employeeAliceReview2Suffix),
        },
        {
          text: intl.formatMessage(messages.employeeAliceReview3Text),
          highlight: '12x',
        },
      ],
      costLabel: intl.formatMessage(messages.employeeAliceCostLabel),
      costChartData: [
        {
          label: intl.formatMessage(messages.employeeAliceCostChart1),
          value: 10,
        },
        {
          label: intl.formatMessage(messages.employeeAliceCostChart2),
          value: 80,
        },
        {
          label: intl.formatMessage(messages.employeeAliceCostChart3),
          value: 300,
        },
      ],
      costSummary: [
        {
          label: intl.formatMessage(messages.employeeAliceCostSummary1),
          value: '8.5x',
        },
        {
          label: intl.formatMessage(messages.employeeAliceCostSummary2),
          value: '57%',
        },
      ],
      efficiencyData: [
        { label: intl.formatMessage(messages.employeeAliceEff1), value: 96 },
        { label: intl.formatMessage(messages.employeeAliceEff2), value: 85 },
        { label: intl.formatMessage(messages.employeeAliceEff3), value: 78 },
        { label: intl.formatMessage(messages.employeeAliceEff4), value: 92 },
      ],
      coreCompetencies: [
        {
          title: intl.formatMessage(messages.employeeAliceComp1Title),
          description: intl.formatMessage(messages.employeeAliceComp1Desc),
          iconBg: '#FFF1F0',
          iconText: '✍',
        },
        {
          title: intl.formatMessage(messages.employeeAliceComp2Title),
          description: intl.formatMessage(messages.employeeAliceComp2Desc),
          iconBg: '#E8F5FF',
          iconText: '🎯',
        },
        {
          title: intl.formatMessage(messages.employeeAliceComp3Title),
          description: intl.formatMessage(messages.employeeAliceComp3Desc),
          iconBg: '#FFF7E6',
          iconText: '📊',
        },
        {
          title: intl.formatMessage(messages.employeeAliceComp4Title),
          description: intl.formatMessage(messages.employeeAliceComp4Desc),
          iconBg: '#F0FFF0',
          iconText: '📋',
        },
        {
          title: intl.formatMessage(messages.employeeAliceComp5Title),
          description: intl.formatMessage(messages.employeeAliceComp5Desc),
          iconBg: '#F3F0FF',
          iconText: '👤',
        },
      ],
    },
    lily: {
      name: 'Lily',
      avatarSrc: './assets/images/lily.png',
      employeeRole: intl.formatMessage(messages.roleAfterSalesExpert),
      stageTags: [
        intl.formatMessage(messages.employeeLilyStage1),
        intl.formatMessage(messages.employeeLilyStage2),
        intl.formatMessage(messages.employeeLilyStage3),
        intl.formatMessage(messages.employeeLilyStage4),
        intl.formatMessage(messages.employeeLilyStage5),
      ],
      profile: intl.formatMessage(messages.employeeLilyProfile),
      reviews: [
        {
          text: intl.formatMessage(messages.employeeLilyReview1Text),
          highlight: '45秒',
          suffix: intl.formatMessage(messages.employeeLilyReview1Suffix),
        },
        {
          text: intl.formatMessage(messages.employeeLilyReview2Text),
          highlight: '78%',
          suffix: intl.formatMessage(messages.employeeLilyReview2Suffix),
        },
        {
          text: intl.formatMessage(messages.employeeLilyReview3Text),
          highlight: '94%',
          suffix: intl.formatMessage(messages.employeeLilyReview3Suffix),
        },
      ],
      costLabel: intl.formatMessage(messages.employeeLilyCostLabel),
      costChartData: [
        {
          label: intl.formatMessage(messages.employeeLilyCostChart1),
          value: 20,
        },
        {
          label: intl.formatMessage(messages.employeeLilyCostChart2),
          value: 120,
        },
        {
          label: intl.formatMessage(messages.employeeLilyCostChart3),
          value: 500,
        },
      ],
      costSummary: [
        {
          label: intl.formatMessage(messages.employeeLilyCostSummary1),
          value: '520M',
        },
        {
          label: intl.formatMessage(messages.employeeLilyCostSummary2),
          value: '73%',
        },
      ],
      efficiencyData: [
        { label: intl.formatMessage(messages.employeeLilyEff1), value: 97 },
        { label: intl.formatMessage(messages.employeeLilyEff2), value: 94 },
        { label: intl.formatMessage(messages.employeeLilyEff3), value: 82 },
        { label: intl.formatMessage(messages.employeeLilyEff4), value: 90 },
      ],
      coreCompetencies: [
        {
          title: intl.formatMessage(messages.employeeLilyComp1Title),
          description: intl.formatMessage(messages.employeeLilyComp1Desc),
          iconBg: '#FFF1F0',
          iconText: '⚡',
        },
        {
          title: intl.formatMessage(messages.employeeLilyComp2Title),
          description: intl.formatMessage(messages.employeeLilyComp2Desc),
          iconBg: '#E8F5FF',
          iconText: '📚',
        },
        {
          title: intl.formatMessage(messages.employeeLilyComp3Title),
          description: intl.formatMessage(messages.employeeLilyComp3Desc),
          iconBg: '#FFF7E6',
          iconText: '🧭',
        },
        {
          title: intl.formatMessage(messages.employeeLilyComp4Title),
          description: intl.formatMessage(messages.employeeLilyComp4Desc),
          iconBg: '#F0FFF0',
          iconText: '💰',
        },
        {
          title: intl.formatMessage(messages.employeeLilyComp5Title),
          description: intl.formatMessage(messages.employeeLilyComp5Desc),
          iconBg: '#F3F0FF',
          iconText: '🔄',
        },
      ],
    },
    allen: {
      name: 'Allen',
      avatarSrc: './assets/images/allen.png',
      employeeRole: intl.formatMessage(messages.roleLeadAssistant),
      stageTags: [
        intl.formatMessage(messages.employeeAllenStage1),
        intl.formatMessage(messages.employeeAllenStage2),
        intl.formatMessage(messages.employeeAllenStage3),
        intl.formatMessage(messages.employeeAllenStage4),
        intl.formatMessage(messages.employeeAllenStage5),
      ],
      profile: intl.formatMessage(messages.employeeAllenProfile),
      reviews: [
        {
          text: intl.formatMessage(messages.employeeAllenReview1Text),
          highlight: '340%',
          suffix: intl.formatMessage(messages.employeeAllenReview1Suffix),
        },
        {
          text: intl.formatMessage(messages.employeeAllenReview2Text),
          highlight: '87%',
          suffix: intl.formatMessage(messages.employeeAllenReview2Suffix),
        },
        {
          text: intl.formatMessage(messages.employeeAllenReview3Text),
          highlight: '2.8x',
          suffix: intl.formatMessage(messages.employeeAllenReview3Suffix),
        },
      ],
      costLabel: intl.formatMessage(messages.employeeAllenCostLabel),
      costChartData: [
        {
          label: intl.formatMessage(messages.employeeAllenCostChart1),
          value: 5,
        },
        {
          label: intl.formatMessage(messages.employeeAllenCostChart2),
          value: 60,
        },
        {
          label: intl.formatMessage(messages.employeeAllenCostChart3),
          value: 400,
        },
      ],
      costSummary: [
        {
          label: intl.formatMessage(messages.employeeAllenCostSummary1),
          value: '64%',
        },
        {
          label: intl.formatMessage(messages.employeeAllenCostSummary2),
          value: '35%',
        },
      ],
      efficiencyData: [
        { label: intl.formatMessage(messages.employeeAllenEff1), value: 93 },
        { label: intl.formatMessage(messages.employeeAllenEff2), value: 86 },
        { label: intl.formatMessage(messages.employeeAllenEff3), value: 91 },
        { label: intl.formatMessage(messages.employeeAllenEff4), value: 78 },
      ],
      coreCompetencies: [
        {
          title: intl.formatMessage(messages.employeeAllenComp1Title),
          description: intl.formatMessage(messages.employeeAllenComp1Desc),
          iconBg: '#FFF1F0',
          iconText: '🌐',
        },
        {
          title: intl.formatMessage(messages.employeeAllenComp2Title),
          description: intl.formatMessage(messages.employeeAllenComp2Desc),
          iconBg: '#E8F5FF',
          iconText: '🔍',
        },
        {
          title: intl.formatMessage(messages.employeeAllenComp3Title),
          description: intl.formatMessage(messages.employeeAllenComp3Desc),
          iconBg: '#FFF7E6',
          iconText: '⚖',
        },
        {
          title: intl.formatMessage(messages.employeeAllenComp4Title),
          description: intl.formatMessage(messages.employeeAllenComp4Desc),
          iconBg: '#F0FFF0',
          iconText: '👤',
        },
        {
          title: intl.formatMessage(messages.employeeAllenComp5Title),
          description: intl.formatMessage(messages.employeeAllenComp5Desc),
          iconBg: '#F3F0FF',
          iconText: '📨',
        },
      ],
    },
    amy: {
      name: 'Amy',
      avatarSrc: './assets/images/amy.png',
      employeeRole: intl.formatMessage(messages.roleBusinessDevElite),
      stageTags: [
        intl.formatMessage(messages.employeeAmyStage1),
        intl.formatMessage(messages.employeeAmyStage2),
        intl.formatMessage(messages.employeeAmyStage3),
        intl.formatMessage(messages.employeeAmyStage4),
        intl.formatMessage(messages.employeeAmyStage5),
      ],
      profile: intl.formatMessage(messages.employeeAmyProfile),
      reviews: [
        {
          text: intl.formatMessage(messages.employeeAmyReview1Text),
          highlight: '215%',
          suffix: intl.formatMessage(messages.employeeAmyReview1Suffix),
        },
        {
          text: intl.formatMessage(messages.employeeAmyReview2Text),
          highlight: '82%',
          suffix: intl.formatMessage(messages.employeeAmyReview2Suffix),
        },
        {
          text: intl.formatMessage(messages.employeeAmyReview3Text),
          highlight: '10x',
          suffix: intl.formatMessage(messages.employeeAmyReview3Suffix),
        },
      ],
      costLabel: intl.formatMessage(messages.employeeAmyCostLabel),
      costChartData: [
        {
          label: intl.formatMessage(messages.employeeAmyCostChart1),
          value: 15,
        },
        {
          label: intl.formatMessage(messages.employeeAmyCostChart2),
          value: 100,
        },
        {
          label: intl.formatMessage(messages.employeeAmyCostChart3),
          value: 600,
        },
      ],
      costSummary: [
        {
          label: intl.formatMessage(messages.employeeAmyCostSummary1),
          value: '52%',
        },
        {
          label: intl.formatMessage(messages.employeeAmyCostSummary2),
          value: '48%',
        },
      ],
      efficiencyData: [
        { label: intl.formatMessage(messages.employeeAmyEff1), value: 88 },
        { label: intl.formatMessage(messages.employeeAmyEff2), value: 95 },
        { label: intl.formatMessage(messages.employeeAmyEff3), value: 83 },
        { label: intl.formatMessage(messages.employeeAmyEff4), value: 76 },
      ],
      coreCompetencies: [
        {
          title: intl.formatMessage(messages.employeeAmyComp1Title),
          description: intl.formatMessage(messages.employeeAmyComp1Desc),
          iconBg: '#FFF1F0',
          iconText: '🤝',
        },
        {
          title: intl.formatMessage(messages.employeeAmyComp2Title),
          description: intl.formatMessage(messages.employeeAmyComp2Desc),
          iconBg: '#E8F5FF',
          iconText: '✉',
        },
        {
          title: intl.formatMessage(messages.employeeAmyComp3Title),
          description: intl.formatMessage(messages.employeeAmyComp3Desc),
          iconBg: '#FFF7E6',
          iconText: '📅',
        },
        {
          title: intl.formatMessage(messages.employeeAmyComp4Title),
          description: intl.formatMessage(messages.employeeAmyComp4Desc),
          iconBg: '#F0FFF0',
          iconText: '📄',
        },
        {
          title: intl.formatMessage(messages.employeeAmyComp5Title),
          description: intl.formatMessage(messages.employeeAmyComp5Desc),
          iconBg: '#F3F0FF',
          iconText: '🔗',
        },
      ],
    },
  };
}
