import { inject, observer } from 'mobx-react';
import { Component, type ReactElement } from 'react';
import { UserIcon, LockOnIcon } from 'tdesign-icons-react';
import Link from '../ui/Link';

interface IProps {
  loginRoute: string;
}

@inject('actions')
@observer
class Welcome extends Component<IProps> {
  render(): ReactElement {
    const { loginRoute } = this.props;

    return (
      <div className="welcome">
        <div className="flex flex-col gap-[20px]">
          <div className="relative">
            <UserIcon className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#909399]" />
            <input
              type="text"
              placeholder="请输入用户名"
              className="h-[48px] w-full rounded-[4px] border border-solid border-[#DCDFE6] bg-white pl-[42px] pr-[16px] text-[14px] text-[#1F1F1F] outline-none placeholder:text-[#909399]"
            />
          </div>
          <div className="relative">
            <LockOnIcon className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#909399]" />
            <input
              type="password"
              placeholder="请输入密码"
              className="h-[48px] w-full rounded-[4px] border border-solid border-[#DCDFE6] bg-white pl-[42px] pr-[16px] text-[14px] text-[#1F1F1F] outline-none placeholder:text-[#909399]"
            />
          </div>
        </div>

        <div className="mt-[12px] flex items-center gap-[8px]">
          <input
            type="checkbox"
            id="remember"
            className="h-[14px] w-[14px] cursor-pointer appearance-none rounded-[2px] border border-solid border-[#DCDFE6] bg-white checked:border-[#0052D9] checked:bg-[#0052D9]"
          />
          <label
            htmlFor="remember"
            className="cursor-pointer select-none text-[13px] text-[#333]"
          >
            记住密码
          </label>
        </div>

        <Link
          to={loginRoute}
          className="mt-[24px] flex h-[48px] w-full items-center justify-center rounded-[4px] bg-[#0052D9] text-[16px] font-medium text-white no-underline"
        >
          进入拓客
        </Link>
      </div>
    );
  }
}

export default Welcome;
