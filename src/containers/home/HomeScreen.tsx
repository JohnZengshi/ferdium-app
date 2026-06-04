import { Component, type ReactElement } from 'react';
import { Button, Card, Divider, Empty, Skeleton } from 'tdesign-react';
import { AddIcon } from 'tdesign-icons-react';
import DigitalHumanCard from '../../components/home/DigitalHumanCard';
import OnboardingGuide from '../../components/home/OnboardingGuide';
import SocialAccountCard from '../../components/home/SocialAccountCard';

interface HomeScreenState {
  loading: boolean;
  digitalHumans: {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
    status: 'online' | 'offline' | 'busy';
    lastActive?: string;
  }[];
  socialAccounts: {
    id: string;
    platform: string;
    accountName: string;
    avatar?: string;
    isConnected: boolean;
    unreadCount?: number;
  }[];
  showOnboarding: boolean;
}

class HomeScreen extends Component<Record<string, unknown>, HomeScreenState> {
  constructor(props: Record<string, unknown>) {
    super(props);

    this.state = {
      loading: true,
      digitalHumans: [],
      socialAccounts: [],
      showOnboarding: true,
    };
  }

  async componentDidMount(): Promise<void> {
    await this.loadData();
  }

  loadData = async (): Promise<void> => {
    this.setState({ loading: true });

    try {
      // TODO: 调用实际 API 获取数据
      // const digitalHumans = await listDigitalHumansApiV1DigitalHumansGet();
      // const accounts = await listAccountsApi();

      // 模拟数据
      setTimeout(() => {
        this.setState({
          loading: false,
          digitalHumans: [
            {
              id: '1',
              name: '客服小智',
              description: '负责客户咨询和问题解答',
              status: 'online',
              lastActive: '2分钟前',
            },
            {
              id: '2',
              name: '销售助手',
              description: '协助销售线索跟进和转化',
              status: 'busy',
              lastActive: '10分钟前',
            },
          ],
          socialAccounts: [
            {
              id: '1',
              platform: 'whatsapp',
              accountName: '+86 138 1234 5678',
              isConnected: true,
              unreadCount: 5,
            },
            {
              id: '2',
              platform: 'wechat',
              accountName: '企业微信客服',
              isConnected: true,
              unreadCount: 0,
            },
            {
              id: '3',
              platform: 'telegram',
              accountName: '@customer_support',
              isConnected: false,
              unreadCount: 0,
            },
          ],
        });
      }, 800);
    } catch (error) {
      console.error('Failed to load home data:', error);
      this.setState({ loading: false });
    }
  };

  handleAddDigitalHuman = (): void => {
    // TODO: 打开创建数字员工对话框
  };

  handleAddSocialAccount = (): void => {
    // TODO: 打开添加社交账号对话框
  };

  // @ts-expect-error - TODO: 实现数字员工详情打开逻辑
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleDigitalHumanClick = (id: string): void => {
    // TODO: 打开数字员工详情
  };

  // @ts-expect-error - TODO: 实现社交账号详情打开逻辑
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleSocialAccountClick = (id: string): void => {
    // TODO: 打开社交账号详情或跳转到对应服务
  };

  // @ts-expect-error - TODO: 实现新手引导操作逻辑
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleOnboardingAction = (stepId: string): void => {
    // TODO: 处理新手引导操作
  };

  handleDismissOnboarding = (): void => {
    this.setState({ showOnboarding: false });
  };

  render(): ReactElement {
    const { loading, digitalHumans, socialAccounts, showOnboarding } =
      this.state;

    const onboardingSteps = [
      {
        id: 'add-account',
        title: '添加第一个社交账号',
        description: '连接 WhatsApp、WeChat 等社交平台账号',
        completed: socialAccounts.some(a => a.isConnected),
        action: {
          label: '立即添加',
          onClick: () => this.handleOnboardingAction('add-account'),
        },
      },
      {
        id: 'create-digital-human',
        title: '创建数字员工',
        description: '配置 AI 客服助手自动处理消息',
        completed: digitalHumans.length > 0,
        action: {
          label: '开始创建',
          onClick: () => this.handleOnboardingAction('create-digital-human'),
        },
      },
      {
        id: 'test-conversation',
        title: '测试对话',
        description: '发送测试消息验证配置是否正确',
        completed: false,
        action: {
          label: '去测试',
          onClick: () => this.handleOnboardingAction('test-conversation'),
        },
      },
    ];

    return (
      <div className="home-screen flex-1 bg-[var(--td-bg-color-page)] overflow-auto">
        {/* 主体内容 */}
        <div className="h-full p-6">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex gap-6">
              {/* 左侧：我的数字员工 */}
              <div className="flex-1 min-w-0">
                <Card
                  title="我的数字员工"
                  actions={
                    <Button
                      size="small"
                      theme="primary"
                      icon={<AddIcon />}
                      onClick={this.handleAddDigitalHuman}
                    >
                      添加
                    </Button>
                  }
                >
                  {loading ? (
                    <div className="space-y-4">
                      <Skeleton animation="gradient" />
                      <Skeleton animation="gradient" />
                    </div>
                  ) : digitalHumans.length > 0 ? (
                    <div className="space-y-3">
                      {digitalHumans.map(dh => (
                        <DigitalHumanCard
                          key={dh.id}
                          {...dh}
                          onClick={() => this.handleDigitalHumanClick(dh.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Empty description="暂无数字员工" />
                  )}
                </Card>

                <Divider className="my-6" />

                {/* 统计概览 */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[var(--td-brand-color)] mb-2">
                        {digitalHumans.length}
                      </div>
                      <div className="text-sm text-[var(--td-text-color-secondary)]">
                        数字员工
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[var(--td-success-color)] mb-2">
                        {socialAccounts.filter(a => a.isConnected).length}
                      </div>
                      <div className="text-sm text-[var(--td-text-color-secondary)]">
                        已连接账号
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[var(--td-warning-color)] mb-2">
                        {socialAccounts.reduce(
                          (sum, a) => sum + (a.unreadCount || 0),
                          0,
                        )}
                      </div>
                      <div className="text-sm text-[var(--td-text-color-secondary)]">
                        未读消息
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* 右侧：社交账号 + 新手引导 */}
              <div className="w-[380px] space-y-6">
                {/* 社交账号总览 */}
                <Card
                  title="社交账号"
                  actions={
                    <Button
                      size="small"
                      variant="outline"
                      icon={<AddIcon />}
                      onClick={this.handleAddSocialAccount}
                    >
                      添加
                    </Button>
                  }
                >
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton animation="gradient" />
                      <Skeleton animation="gradient" />
                    </div>
                  ) : socialAccounts.length > 0 ? (
                    <div className="space-y-2">
                      {socialAccounts.map(account => (
                        <SocialAccountCard
                          key={account.id}
                          {...account}
                          onClick={() =>
                            this.handleSocialAccountClick(account.id)
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <Empty description="暂无账号" />
                  )}
                </Card>

                {/* 新手引导 */}
                {showOnboarding && (
                  <OnboardingGuide
                    steps={onboardingSteps}
                    onDismiss={this.handleDismissOnboarding}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default HomeScreen;
