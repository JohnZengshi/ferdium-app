import { mdiBadgeAccountOutline } from '@mdi/js';
import Icon from '@mdi/react';
import { Component, type ReactElement } from 'react';

class UserProfileScreen extends Component {
  render(): ReactElement {
    return (
      <div className="user-profile-screen flex flex-1 flex-col items-center justify-center bg-[var(--bg-primary,#111111)] text-[var(--text-primary,rgba(255,255,255,0.9))] p-[40px]">
        <Icon
          path={mdiBadgeAccountOutline}
          size={4}
          color="var(--text-secondary, rgba(255,255,255,0.45))"
          className="mb-[24px]"
        />
        <h1 className="text-[28px] mb-[16px] font-medium">用户画像</h1>
        <p className="text-[16px] text-[var(--text-secondary,rgba(255,255,255,0.65))] max-w-[400px] text-center leading-[1.6]">
          查看联系人和群组的详细画像，包括标签、备注及互动历史。
        </p>
      </div>
    );
  }
}

export default UserProfileScreen;
