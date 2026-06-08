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
import { injectIntl, type WrappedComponentProps } from 'react-intl';
import type { RealStores } from '../../stores';
import { StepItem } from '../../components/home/StepItem';
import { SectionHeader } from '../../components/home/SectionHeader';
import StrategyConfigScreen from './StrategyConfigScreen';
import ResumeTab from './tabs/ResumeTab';
import {
  type EmployeeResume,
  messages,
  MOCK_EMPLOYEES,
  getEmployeeResumes,
} from './homeScreenData';

interface HomeScreenProps {
  stores?: RealStores;
  history?: any;
}

type IHomeScreenProps = HomeScreenProps & WrappedComponentProps;

interface HomeScreenState {
  isAutoReply: boolean;
  viewMode: 'dashboard' | 'strategy';
  dialogEmployee: EmployeeResume | null;
}

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
    const { intl } = this.props;
    const resume = getEmployeeResumes(intl)[employee.id];
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
                  <span className="text-success">
                    {intl.formatMessage(messages.online)}
                  </span>
                </span>
              </th>
              <th className="w-[117px] border-r border-line text-center text-[12px] font-medium">
                <span className="inline-flex items-center gap-[6px]">
                  <WifiOffIcon className="text-warning text-[14px]" />
                  <span className="text-warning">
                    {intl.formatMessage(messages.offline)}
                  </span>
                </span>
              </th>
              <th className="w-[116px] text-center text-[12px] font-medium">
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
        <div
          className="relative max-h-[85vh] overflow-y-auto rounded-[12px] p-[22px]"
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

    const displayEmployees: {
      id: string;
      name: string;
      role: string;
      avatar: string;
      capabilities: string[];
      cta: string;
      hasBadge?: boolean;
    }[] = MOCK_EMPLOYEES.map(emp => ({
      id: emp.id,
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

                <div className="mt-[24px] min-h-[66px] w-full rounded-[6px] bg-brand-light px-[34px] py-[15px]">
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

export default injectIntl(HomeScreen as any);
