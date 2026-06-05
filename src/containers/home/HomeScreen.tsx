import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import { AddIcon } from 'tdesign-icons-react';
import { Button, Card, Divider, Empty, Skeleton } from 'tdesign-react';
import DigitalHumanCard from '../../components/home/DigitalHumanCard';
import OnboardingGuide from '../../components/home/OnboardingGuide';
import SocialAccountCard from '../../components/home/SocialAccountCard';
import type { RealStores } from '../../stores';

interface HomeScreenProps {
  stores?: RealStores;
  history?: any;
}

interface HomeScreenState {
  loading: boolean;
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

@inject('stores')
@observer
class HomeScreen extends Component<HomeScreenProps, HomeScreenState> {
  constructor(props: HomeScreenProps) {
    super(props);

    this.state = {
      loading: true,
      socialAccounts: [],
      showOnboarding: true,
    };
  }

  async componentDidMount(): Promise<void> {
    // 加载真实数字人数据
    await this.props.stores!.digitalHuman.fetchDigitalHumans();

    // 加载社交账号数据（TODO: 实现真实API）
    // eslint-disable-next-line @eslint-react/no-set-state-in-component-did-mount
    this.setState({ loading: false });
  }

  handleAddDigitalHuman = (): void => {
    // 跳转到数字人管理页面
    this.props.stores!.router.push('/settings/digital-humans');
  };

  handleAddSocialAccount = (): void => {
    // TODO: 打开添加社交账号对话框
  };

  handleDigitalHumanClick = (): void => {
    // 跳转到数字人管理页面
    this.props.stores!.router.push('/settings/digital-humans');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleSocialAccountClick = (_id: string): void => {
    // TODO: 打开社交账号详情或跳转到对应服务
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleOnboardingAction = (_stepId: string): void => {
    // TODO: 处理新手引导操作
  };

  handleDismissOnboarding = (): void => {
    this.setState({ showOnboarding: false });
  };

  render(): ReactElement {
    const { loading, socialAccounts, showOnboarding } = this.state;
    const digitalHumanStore = this.props.stores!.digitalHuman;

    // 将真实数字人数据转换为组件需要的格式
    const digitalHumans = digitalHumanStore.digitalHumans.map(dh => ({
      id: dh.id,
      name: dh.name,
      description: dh.persona_prompt || `${dh.platform || 'WhatsApp'} 数字人`,
      avatar: dh.avatar_url || undefined,
      status: (dh.is_enabled && dh.status === 'active'
        ? 'online'
        : 'offline') as 'online' | 'offline' | 'busy',
      lastActive: new Date(dh.created_at).toLocaleString('zh-CN'),
    }));

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
                  {digitalHumanStore.isLoading ? (
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
                          onClick={() => this.handleDigitalHumanClick()}
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
