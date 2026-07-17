import { reaction } from 'mobx';
import { inject, observer } from 'mobx-react';
import { type CSSProperties, Component, type ReactElement } from 'react';
import { type WrappedComponentProps, injectIntl } from 'react-intl';
import {
  ErrorCircleIcon,
  RefreshIcon,
  WifiIcon,
  WifiOffIcon,
} from 'tdesign-icons-react';
import {
  Badge,
  Button,
  Dialog,
  MessagePlugin,
  Progress,
  Switch,
} from 'tdesign-react';
import {
  getWorkflowApiV1AgentWorkflowGet,
  updateWorkflowApiV1AgentWorkflowPut,
} from '../../agent-flow-cs/api/generated/agent-workflow/agent-workflow';
import type { WorkflowSettingsResponse } from '../../agent-flow-cs/api/generated/agentFlowCs.schemas';
import { SectionHeader } from '../../components/home/SectionHeader';
import { StepItem } from '../../components/home/StepItem';
import {
  calculateOnboardingProgress,
  getOnboardingProgress,
  getStepStatus,
  updateOnboardingStep,
} from '../../helpers/onboarding-helpers';
import type { RealStores } from '../../stores';
import { navigationStore } from '../../stores/NavigationStore';
import StrategyConfigScreen from './StrategyConfigScreen';
import {
  type EmployeeResume,
  type EmployeeRoleKey,
  MOCK_EMPLOYEES,
  getEmployeeResumes,
  messages,
} from './homeScreenData';
import ResumeTab from './tabs/ResumeTab';

interface HomeScreenProps {
  stores?: RealStores;
}

type IHomeScreenProps = HomeScreenProps & WrappedComponentProps;

interface HomeScreenState {
  isAutoReply: boolean;
  dialogEmployee: EmployeeResume | null;
  step1Completed: boolean;
  onboardingVersion: number;
}

type DisplayEmployee = {
  id: string;
  mockId: EmployeeRoleKey;
  name: string;
  role: string;
  avatar: string;
  capabilities: string[];
  cta: string;
  hasBadge?: boolean;
};

const formatHandoffBadge = (total: number): string | undefined => {
  if (total <= 0) return undefined;
  if (total > 99) return '99+';
  return String(total);
};

@inject('stores')
@observer
class HomeScreen extends Component<IHomeScreenProps, HomeScreenState> {
  _statusReactionDisposer: (() => void) | undefined;

  constructor(props: IHomeScreenProps) {
    super(props);

    const onboardingProgress = getOnboardingProgress();

    this.state = {
      isAutoReply: false,
      dialogEmployee: null,
      step1Completed: onboardingProgress.step1Completed,
      onboardingVersion: 0,
    };
  }

  handleOpenStrategy = (): void => {
    navigationStore.setHomeView('strategy');
    navigationStore.setStrategyTab('resume');
  };

  handleOpenResume = (employee: DisplayEmployee): void => {
    const { intl } = this.props;
    const lookupId: EmployeeRoleKey = employee.mockId;
    const resume = getEmployeeResumes(intl)[lookupId];
    if (resume) {
      this.setState({ dialogEmployee: resume });
    }
  };

  handleCloseResume = (): void => {
    this.setState({ dialogEmployee: null });
  };

  handleBackToDashboard = (): void => {
    navigationStore.setHomeView('dashboard');
  };

  async componentDidMount(): Promise<void> {
    await this.fetchWorkflow();
    await this.props.stores!.digitalHuman.fetchDigitalHumans();
    await this.props.stores!.whatsappAutomation.fetchAllSessionStatuses();
    await this.checkStep1Completion();

    window.addEventListener(
      'onboarding-step-updated',
      this.handleOnboardingStepUpdated,
    );

    this._statusReactionDisposer = reaction(
      () => {
        const { whatsappAutomation } = this.props.stores!;
        return [...whatsappAutomation.sessionStatuses.entries()]
          .map(([id, status]) => `${id}:${status}`)
          .join('|');
      },
      () => {
        this.checkStep1Completion();
      },
      { delay: 500 },
    );
  }

  fetchWorkflow = async (): Promise<void> => {
    try {
      const response = await getWorkflowApiV1AgentWorkflowGet();
      this.setState({
        isAutoReply: (response.data as WorkflowSettingsResponse)
          .agent_workflow_enabled,
      });
    } catch (error) {
      console.error('Failed to fetch workflow settings:', error);
    }
  };

  componentWillUnmount(): void {
    if (this._statusReactionDisposer) {
      this._statusReactionDisposer();
      this._statusReactionDisposer = undefined;
    }
    window.removeEventListener(
      'onboarding-step-updated',
      this.handleOnboardingStepUpdated,
    );
  }

  handleOnboardingStepUpdated = (): void => {
    this.setState(prev => ({ onboardingVersion: prev.onboardingVersion + 1 }));
  };

  /**
   * Check if step 1 (account binding) is completed
   * Note: This is a one-time onboarding check, not a real-time status monitor.
   * Once the user completes this step, it stays completed even if they delete
   * the service later, since the goal is to guide new users, not track live status.
   */
  checkStep1Completion = async (): Promise<void> => {
    const { whatsappAutomation } = this.props.stores!;

    if (this.state.step1Completed) {
      return;
    }

    try {
      const isBinding = await whatsappAutomation.hasAnyAccountBinding();

      if (isBinding) {
        this.setState({ step1Completed: true });
        updateOnboardingStep(1, true);
      }
    } catch (error) {
      console.error('Failed to check step 1 completion:', error);
    }
  };

  handleAutoReplyChange = async (val: boolean): Promise<void> => {
    // Optimistic UI update
    const previousState = this.state.isAutoReply;
    this.setState({ isAutoReply: val });
    const { intl } = this.props;

    try {
      await updateWorkflowApiV1AgentWorkflowPut({
        agent_workflow_enabled: val,
      });

      const { services } = this.props.stores!;
      services.allDisplayed.forEach(service => {
        if (service.recipe.id === 'whatsapp' && service.webview) {
          service.webview.send('wa-ai-force-refresh-status');
        }
      });

      MessagePlugin.success(
        val
          ? intl!.formatMessage(messages.autoReplyEnabled)
          : intl!.formatMessage(messages.autoReplyDisabled),
      );
    } catch (error) {
      this.setState({ isAutoReply: previousState });
      MessagePlugin.error(
        intl!.formatMessage({
          id: 'home.autoReplyError',
          defaultMessage: 'Failed to update auto-reply settings',
        }),
      );
      console.error('Failed to update workflow settings:', error);
    }
  };

  handleRefreshSocialAccounts = async (): Promise<void> => {
    const { whatsappAutomation } = this.props.stores!;
    const { intl } = this.props;

    try {
      await whatsappAutomation.fetchAllSessionStatuses();
      MessagePlugin.success(intl.formatMessage(messages.refreshSuccess));
    } catch {
      MessagePlugin.error(intl.formatMessage(messages.refreshError));
    }
  };

  renderSocialAccountTable(): ReactElement {
    const { services, whatsappAutomation } = this.props.stores!;
    const { intl } = this.props;

    const getServiceCounts = (
      platformServices: typeof services.allDisplayed,
    ) => {
      let online = 0;
      let offline = 0;
      let error = 0;

      platformServices.forEach(service => {
        if (
          service.hasCrashed ||
          service.isError ||
          service.lostRecipeConnection
        ) {
          error += 1;
        } else if (service.isAttached && service.webview) {
          online += 1;
        } else {
          offline += 1;
        }
      });

      return { total: platformServices.length, online, offline, error };
    };

    const whatsappCounts = {
      total: services.whatsAppServices.length,
      online: 0,
      offline: 0,
      error: 0,
    };

    services.whatsAppServices.forEach(service => {
      const status = whatsappAutomation.sessionStatuses.get(service.id);
      if (status === 'CONNECTED') whatsappCounts.online += 1;
      else if (!status || status === 'DISCONNECTED')
        whatsappCounts.offline += 1;
      else whatsappCounts.error += 1;
    });

    const data = [
      {
        type: 'WhatsApp',
        icon: './assets/icons/whats.svg',
        useIconMask: false,
        ...whatsappCounts,
      },
      {
        type: 'Telegram',
        icon: '',
        useIconMask: true,
        ...getServiceCounts(services.telegramServices),
      },
      {
        type: 'Ins DM',
        icon: './assets/images/instagram-dm.svg',
        useIconMask: false,
        ...getServiceCounts(services.instagramDMServices),
      },
    ];

    return (
      <div className="mt-[24px] w-full overflow-hidden rounded-[6px] border border-solid border-line">
        <table className="w-full [border-collapse:collapse] [table-layout:fixed] [&_td]:border-solid [&_th]:border-solid">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
          </colgroup>
          <thead>
            <tr className="h-[45px] bg-secondary-container">
              <th className="border-r border-b border-line px-[12px] text-left text-[12px] font-medium text-placeholder">
                {intl.formatMessage(messages.type)}
              </th>
              <th className="border-r border-b border-line text-center text-[12px] font-medium text-placeholder">
                {intl.formatMessage(messages.totalCount)}
              </th>
              <th className="border-r border-b border-line text-center text-[12px] font-medium">
                <span className="inline-flex items-center gap-[6px]">
                  <WifiIcon className="text-success text-[14px]" />
                  <span className="text-success">
                    {intl.formatMessage(messages.online)}
                  </span>
                </span>
              </th>
              <th className="border-r border-b border-line text-center text-[12px] font-medium">
                <span className="inline-flex items-center gap-[6px]">
                  <WifiOffIcon className="text-warning text-[14px]" />
                  <span className="text-warning">
                    {intl.formatMessage(messages.offline)}
                  </span>
                </span>
              </th>
              <th className="border-b border-line text-center text-[12px] font-medium">
                <span className="inline-flex items-center gap-[6px]">
                  <ErrorCircleIcon className="text-error text-[14px]" />
                  <span className="text-error">
                    {intl.formatMessage(messages.errorStatus)}
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr
                key={row.type}
                className="text-[14px] font-medium leading-[20px] text-primary"
              >
                <td className="min-w-0 border-r border-line px-[12px] py-[13px]">
                  <div className="flex min-w-0 items-center gap-[8px]">
                    {row.useIconMask ? (
                      <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[#2AABEE]">
                        <svg
                          className="size-[12px] text-white"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M20.67 3.67 17.5 19.48c-.24 1.12-.86 1.4-1.75.87l-4.83-3.56-2.33 2.24c-.26.26-.47.47-.97.47l.35-4.91 8.93-8.07c.39-.35-.08-.54-.6-.19L5.25 13.3.5 11.81c-1.03-.32-1.05-1.03.22-1.53L19.3 3.12c.86-.31 1.61.2 1.37.55Z" />
                        </svg>
                      </span>
                    ) : row.type === 'Ins DM' ? (
                      <span className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] bg-[linear-gradient(145deg,#6c3ce9_5%,#c832a7_40%,#ff4f5e_68%,#ff9b35_100%)]">
                        <svg
                          className="size-[13px] text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <rect
                            x="2.5"
                            y="2.5"
                            width="19"
                            height="19"
                            rx="6"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="M6.8 11.8 17.4 7.2l-4.6 10.6-1.5-4.5-4.5-1.5Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                          <path
                            d="m11.3 13.3 3.1-3.1"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    ) : (
                      <img
                        className="size-[16px] shrink-0"
                        src={row.icon}
                        alt=""
                      />
                    )}
                    <span className="min-w-0 truncate leading-[20px]">
                      {row.type}
                    </span>
                  </div>
                </td>
                <td className="border-r border-line text-center">
                  {row.total}
                </td>
                <td className="border-r border-line text-center">
                  {row.online}
                </td>
                <td className="border-r border-line text-center">
                  {row.offline}
                </td>
                <td className="text-center">{row.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  renderEmployeeCard(employee: DisplayEmployee): ReactElement {
    const { unreadCount } = this.props.stores!.handoff;
    const badgeText = employee.hasBadge
      ? formatHandoffBadge(unreadCount)
      : undefined;
    const isMonica = employee.mockId === 'seniorSalesExpert';
    const buttonClassName = `!h-[32px] !px-[20px] !py-[6px] !rounded-[8px] font-bold text-text-anti shadow-sm${isMonica ? ' !bg-[#6C4E14]' : ' bg-brand'}`;
    const buttonStyle: CSSProperties | undefined = isMonica
      ? { borderColor: '#6C4E14' }
      : undefined;

    return (
      <div
        key={employee.id}
        className="group relative flex h-[331px] w-[237px] flex-col overflow-hidden rounded-[16px] border border-line bg-container transition-all hover:shadow-md"
      >
        <div className="absolute inset-0 z-0">
          <img
            src={employee.avatar}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        <div className="relative z-10 mt-auto mb-[24px] flex flex-col items-center">
          {badgeText ? (
            <Badge count={badgeText} shape="round" offset={[-4, -4]}>
              <Button
                theme="primary"
                size="small"
                className={buttonClassName}
                style={buttonStyle}
                onClick={this.handleOpenStrategy}
              >
                {employee.cta}
              </Button>
            </Badge>
          ) : (
            <Button
              theme="primary"
              size="small"
              className={buttonClassName}
              style={buttonStyle}
              onClick={
                employee.hasBadge
                  ? this.handleOpenStrategy
                  : () => this.handleOpenResume(employee)
              }
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
        width={1475}
        placement="center"
        header={false}
        footer={false}
        onClose={this.handleCloseResume}
        className="[&_.t-dialog\\_\\_body]:!p-0 [&_.t-dialog\\_\\_wrap]:!items-center [&_.t-dialog]:!p-0"
      >
        <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-[12px]">
          <div className="flex h-[56px] flex-shrink-0 items-center justify-between border-b border-solid border-line bg-container px-[16px]">
            <span className="text-[16px] font-semibold leading-[24px] text-primary">
              {this.props.intl.formatMessage(messages.resumeTitle, {
                name: emp.name,
              })}
            </span>
            <button
              type="button"
              onClick={this.handleCloseResume}
              className="flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-[3px] border-0 bg-transparent p-[2px] text-secondary hover:text-primary"
            >
              <span
                className="block h-[16px] w-[16px] bg-current"
                style={{
                  mask: 'url(./assets/icons/close-x.svg) center / contain no-repeat',
                  WebkitMask:
                    'url(./assets/icons/close-x.svg) center / contain no-repeat',
                }}
              />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto p-[22px]"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--td-brand-color-light) 73%, transparent) 0%, color-mix(in srgb, var(--td-brand-color-light) 14%, transparent) 100%)',
            }}
          >
            <ResumeTab
              stageTags={emp.stageTags}
              profile={emp.profile}
              reviews={emp.reviews}
              costLabel={emp.costLabel}
              costChartData={emp.costChartData}
              costSummary={emp.costSummary}
              efficiencyData={emp.efficiencyData}
              employeeName={emp.name}
              employeeRole={emp.employeeRole}
              avatarSrc={emp.avatarSrc}
            />
          </div>
        </div>
      </Dialog>
    );
  }

  render(): ReactElement {
    if (navigationStore.activeHomeView === 'strategy') {
      return (
        <StrategyConfigScreen
          onBack={this.handleBackToDashboard}
          handoffUnreadCount={this.props.stores!.handoff.unreadCount}
          initialTab={navigationStore.activeStrategyTab}
        />
      );
    }

    const { isAutoReply } = this.state;
    const { intl } = this.props;
    const digitalHumanStore = this.props.stores!.digitalHuman;
    const realEmployees = digitalHumanStore.digitalHumans;

    const displayEmployees: DisplayEmployee[] = MOCK_EMPLOYEES.map(emp => ({
      id: emp.id,
      mockId: emp.id,
      name: emp.name,
      role: intl.formatMessage({
        id: emp.roleKey,
        defaultMessage: emp.roleDefault,
      }),
      avatar: emp.avatar,
      capabilities: emp.capabilityKeys.map((key, i) =>
        intl.formatMessage({
          id: key,
          defaultMessage: emp.capabilityDefaults[i],
        }),
      ),
      cta: intl.formatMessage({
        id: emp.ctaKey,
        defaultMessage: emp.ctaDefault,
      }),
      hasBadge: emp.hasBadge,
    }));
    realEmployees.forEach((real, idx) => {
      displayEmployees[idx] = {
        ...displayEmployees[idx],
        id: real.id,
        name: real.name,
        role: real.platform || intl.formatMessage(messages.digitalAssistant),
        capabilities: [
          real.persona_prompt || intl.formatMessage(messages.smartChatService),
          intl.formatMessage(messages.multiChannel),
          intl.formatMessage(messages.precisionMarketing),
        ],
      };
    });

    return (
      <>
        <div className="flex h-full flex-col bg-page p-[24px] overflow-auto">
          <div className="flex gap-[24px] h-full">
            <div className="flex min-h-0 flex-[2] flex-col rounded-[6px] bg-container p-[32px] shadow-sm min-w-[770px]">
              <SectionHeader
                icon={
                  <div className="flex h-[32px] min-w-[32px] items-center justify-center rounded-full bg-brand-light">
                    <img
                      src="./assets/icons/user-business-filled.svg"
                      alt=""
                      className="h-[18px] w-auto"
                    />
                  </div>
                }
                title={intl.formatMessage(messages.myDigitalEmployees)}
                description={intl.formatMessage(messages.digitalEmployeesDesc)}
                actions={
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[14px] text-secondary">
                      {intl.formatMessage(messages.autoReply)}
                    </span>
                    <Switch
                      value={isAutoReply}
                      onChange={this.handleAutoReplyChange}
                    />
                  </div>
                }
              />

              <div className="mt-[40px] min-h-0 flex-1 overflow-y-auto pr-[4px]">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(237px,1fr))] gap-[20px]">
                  {displayEmployees.map(emp => this.renderEmployeeCard(emp))}
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-[24px] min-w-[347px]">
              <div className="flex h-[369px] flex-col rounded-[8px] bg-container px-[32px] pb-[24px] pt-[28px] shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[16px]">
                    <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-brand-light">
                      <img
                        src="./assets/icons/logo-wecom-filled.svg"
                        alt=""
                        className="h-[18px] w-[18px]"
                      />
                    </div>
                    <h2 className="text-[20px] font-bold leading-[28px] text-primary !mb-0">
                      {intl.formatMessage(messages.socialAccountOverview)}
                    </h2>
                  </div>
                  <RefreshIcon
                    className="h-[22px] w-[22px] cursor-pointer text-primary hover:text-brand transition-colors"
                    onClick={this.handleRefreshSocialAccounts}
                  />
                </div>

                {this.renderSocialAccountTable()}
                <div className="flex h-[48px] mt-auto items-center justify-center">
                  <span className="text-[11px] font-normal text-placeholder">
                    {intl.formatMessage(messages.moreSocialComing)}
                  </span>
                </div>
              </div>

              <div className="flex h-fit flex-auto flex-col rounded-[8px] bg-container px-[32px] pb-[36px] pt-[28px] shadow-sm">
                <div className="flex h-[55px] items-start justify-between">
                  <div className="flex items-start">
                    <div className="relative h-[32px] w-[32px] flex-shrink-0">
                      <div className="absolute inset-0 rounded-full bg-brand-light" />
                      <div className="absolute left-[7px] top-[7px] flex h-[18px] w-[18px] items-center justify-center rounded-full">
                        <img src="./assets/icons/explore-filled.svg" alt="" />
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
                        percentage={calculateOnboardingProgress(
                          getOnboardingProgress(),
                        )}
                        color="var(--td-brand-color)"
                        trackColor="var(--td-border-level-1-color)"
                        strokeWidth={4}
                        label={false}
                      />
                    </div>
                    <span className="text-[14px] font-medium leading-[20px] text-primary">
                      {calculateOnboardingProgress(getOnboardingProgress())}%
                    </span>
                  </div>
                </div>

                <div className="mt-[24px] flex flex-1 flex-col">
                  <StepItem
                    stepNumber={1}
                    title={intl.formatMessage(messages.step2Title)}
                    description={intl.formatMessage(messages.step2Desc)}
                    status={getStepStatus(1, getOnboardingProgress())}
                    isLast={false}
                  />
                  <StepItem
                    stepNumber={2}
                    title={intl.formatMessage(messages.step1Title)}
                    description={intl.formatMessage(messages.step1Desc)}
                    status={getStepStatus(2, getOnboardingProgress())}
                    isLast={false}
                  />
                  <StepItem
                    stepNumber={3}
                    title={intl.formatMessage(messages.step3Title)}
                    description={intl.formatMessage(messages.step3Desc)}
                    status={getStepStatus(3, getOnboardingProgress())}
                    isLast={false}
                  />
                  <StepItem
                    stepNumber={4}
                    title={intl.formatMessage(messages.step4Title)}
                    description={intl.formatMessage(messages.step4Desc)}
                    status={getStepStatus(4, getOnboardingProgress())}
                    isLast
                  />
                </div>

                <div className="mt-auto w-full flex-shrink-0 rounded-[6px] bg-brand-light px-[34px] py-[15px]">
                  <div className="flex items-start gap-[10px]">
                    <div className="mt-[9px] flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-semibold leading-none text-text-anti">
                      i
                    </div>
                    <p className="flex-1 text-[14px] font-[400] leading-[22px] text-primary">
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

export default injectIntl(HomeScreen as any);
