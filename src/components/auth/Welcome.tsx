import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import { type WrappedComponentProps, defineMessages, injectIntl } from 'react-intl';
import { UserIcon, LockOnIcon } from 'tdesign-icons-react';
import Link from '../ui/Link';

const messages = defineMessages({
  usernamePlaceholder: { id: 'welcome.usernamePlaceholder', defaultMessage: '请输入用户名' },
  passwordPlaceholder: { id: 'welcome.passwordPlaceholder', defaultMessage: '请输入密码' },
  rememberPassword: { id: 'welcome.rememberPassword', defaultMessage: '记住密码' },
  enterApp: { id: 'welcome.enterApp', defaultMessage: '进入拓客' },
});

interface IProps {
  loginRoute: string;
}

@inject('actions')
@observer
class Welcome extends Component<IProps & WrappedComponentProps> {
  render(): ReactElement {
    const { loginRoute, intl } = this.props;

    return (
      <div className="welcome">
        <div className="flex flex-col gap-[20px]">
          <div className="relative">
            <UserIcon className="absolute left-[14px] top-1/2 -translate-y-1/2 text-placeholder" />
            <input
              type="text"
              placeholder={intl.formatMessage(messages.usernamePlaceholder)}
              className="h-[48px] w-full rounded-[4px] border border-solid border-line bg-container pl-[42px] pr-[16px] text-[14px] text-primary outline-none placeholder:text-placeholder"
            />
          </div>
          <div className="relative">
            <LockOnIcon className="absolute left-[14px] top-1/2 -translate-y-1/2 text-placeholder" />
            <input
              type="password"
              placeholder={intl.formatMessage(messages.passwordPlaceholder)}
              className="h-[48px] w-full rounded-[4px] border border-solid border-line bg-container pl-[42px] pr-[16px] text-[14px] text-primary outline-none placeholder:text-placeholder"
            />
          </div>
        </div>

        <div className="mt-[12px] flex items-center gap-[8px]">
          <input
            type="checkbox"
            id="remember"
            className="h-[14px] w-[14px] cursor-pointer appearance-none rounded-[2px] border border-solid border-line bg-container checked:border-brand checked:bg-brand"
          />
          <label
            htmlFor="remember"
            className="cursor-pointer select-none text-[13px] text-primary"
          >
            {intl.formatMessage(messages.rememberPassword)}
          </label>
        </div>

        <Link
          to={loginRoute}
          className="mt-[24px] flex h-[48px] w-full items-center justify-center rounded-[4px] bg-brand text-[16px] font-medium text-text-anti no-underline"
        >
          {intl.formatMessage(messages.enterApp)}
        </Link>
      </div>
    );
  }
}

export default injectIntl(Welcome);
