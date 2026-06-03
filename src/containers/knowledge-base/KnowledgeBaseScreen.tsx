import { mdiBookOpenVariant } from '@mdi/js';
import Icon from '@mdi/react';
import { Component, type ReactElement } from 'react';

class KnowledgeBaseScreen extends Component {
  render(): ReactElement {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[var(--bg-primary,#111111)] text-[var(--text-primary,rgba(255,255,255,0.9))] p-[40px]">
        <Icon
          path={mdiBookOpenVariant}
          size={4}
          color="var(--text-secondary, rgba(255,255,255,0.45))"
          className="mb-[24px]"
        />
        <h1 className="text-[28px] mb-[16px] font-medium">资料库</h1>
        <p className="text-[16px] text-[var(--text-secondary,rgba(255,255,255,0.65))] max-w-[400px] text-center leading-[1.6]">
          集中管理您的 WA 常用话术、文档模板及知识条目。
        </p>
      </div>
    );
  }
}

export default KnowledgeBaseScreen;
