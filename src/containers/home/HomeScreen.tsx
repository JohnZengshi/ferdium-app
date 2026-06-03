import { mdiHomeVariantOutline } from '@mdi/js';
import Icon from '@mdi/react';
import { Component, type ReactElement } from 'react';

class HomeScreen extends Component {
  render(): ReactElement {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[var(--bg-primary,#111111)] text-[var(--text-primary,rgba(255,255,255,0.9))] p-[40px]">
        <Icon
          path={mdiHomeVariantOutline}
          size={4}
          color="var(--text-secondary, rgba(255,255,255,0.45))"
          className="mb-[24px]"
        />
        <h1 className="text-[28px] mb-[16px] font-medium">首页概览</h1>
        <p className="text-[16px] text-[var(--text-secondary,rgba(255,255,255,0.65))] max-w-[400px] text-center leading-[1.6]">
          欢迎使用 Ferdium
          增强版。这里将展示您的多账号状态、待办统计及常用快捷方式。
        </p>
      </div>
    );
  }
}

export default HomeScreen;
