import { mdiAccountGroupOutline } from '@mdi/js';
import Icon from '@mdi/react';
import { Component, type ReactElement } from 'react';

class AccountManagementScreen extends Component {
  render(): ReactElement {
    return (
      <div className="account-management-screen flex flex-1 flex-col items-center justify-center bg-[var(--bg-primary,#111111)] text-[var(--text-primary,rgba(255,255,255,0.9))] p-[40px]">
        <Icon
          path={mdiAccountGroupOutline}
          size={4}
          color="var(--text-secondary, rgba(255,255,255,0.45))"
          className="mb-[24px]"
        />
        <h1 className="text-[28px] mb-[16px] font-medium">账号管理</h1>
        <p className="text-[16px] text-[var(--text-secondary,rgba(255,255,255,0.65))] max-w-[400px] text-center leading-[1.6]">
          管理所有已连接的 WhatsApp 账号，查看在线状态及进行批量设置。
        </p>
      </div>
    );
  }
}

export default AccountManagementScreen;
