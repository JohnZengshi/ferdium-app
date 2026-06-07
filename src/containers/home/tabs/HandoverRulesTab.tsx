import { Component, type ReactElement } from 'react';
import {
  AddIcon,
  NotificationIcon,
  CheckIcon,
  CloseIcon,
} from 'tdesign-icons-react';

interface RuleItem {
  id: number;
  label: string;
  value: string;
  placeholder: string;
}

interface HandoverRulesTabState {
  rules: RuleItem[];
  focusedRuleId: number | null;
}

class HandoverRulesTab extends Component<
  Record<string, never>,
  HandoverRulesTabState
> {
  state: HandoverRulesTabState = {
    focusedRuleId: null,
    rules: [
      { id: 1, label: '规则一', value: '', placeholder: '请输入内容' },
      { id: 2, label: '规则二', value: '', placeholder: '请输入内容' },
      {
        id: 3,
        label: '规则三',
        value: '客户要求线下见面时，不要承诺答应具体时间',
        placeholder: '请输入内容',
      },
      {
        id: 4,
        label: '规则四',
        value: '客户要求线下见面时，不要承诺答应具体时间',
        placeholder: '请输入内容',
      },
    ],
  };

  private nextRuleId = 5;

  handleRuleDelete = (id: number): void => {
    this.setState(prev => ({ rules: prev.rules.filter(r => r.id !== id) }));
  };

  handleRuleAdd = (): void => {
    this.setState(prev => ({
      rules: [
        ...prev.rules,
        {
          id: this.nextRuleId++,
          label: '',
          value: '',
          placeholder: '请输入条件',
        },
      ],
    }));
  };

  handleRuleChange = (id: number, value: string): void => {
    this.setState(prev => ({
      rules: prev.rules.map(r => (r.id === id ? { ...r, value } : r)),
    }));
  };

  renderAction = (item: RuleItem): ReactElement | null => {
    switch (item.id) {
      case 1: {
        return null;
      }
      case 2:
      case 3: {
        return (
          <button
            type="button"
            onClick={() => this.handleRuleChange(item.id, '')}
            className="flex h-[32px] w-[32px] flex-shrink-0 cursor-pointer items-center justify-center border-none bg-transparent"
          >
            <CloseIcon className="text-[#9CA3AF]" />
          </button>
        );
      }
      case 4: {
        return (
          <button
            type="button"
            className="flex h-[28px] w-[56px] flex-shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-none bg-[#2563EB] text-[13px] font-medium text-white"
          >
            确定
          </button>
        );
      }
      default: {
        return null;
      }
    }
  };

  render(): ReactElement {
    const { rules, focusedRuleId } = this.state;

    return (
      <div
        className="mx-auto w-full max-w-[960px] pt-[48px]"
        style={{ width: 'calc(100% - 64px)' }}
      >
        <div className="relative mb-[32px] rounded-[12px] border border-solid border-[#D6E4FF] bg-[#EBF2FF] px-[24px] pb-[20px] pt-[20px]">
          <div className="absolute left-[24px] top-[20px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#2563EB]">
            <span className="text-[13px] font-semibold leading-none text-white">
              i
            </span>
          </div>
          <div className="ml-[32px]">
            <span
              className="text-[17px] font-semibold leading-[26px] text-[#111827]"
              style={{ letterSpacing: '0.2px' }}
            >
              人工接管规则
            </span>
          </div>
          <div className="ml-[32px] mt-[10px] text-[14px] font-normal leading-[24px] text-[#4B5563]">
            <p>
              当客户的消息触发您设置的规则时，数字员工会推送消息给人工进行预警，例如
            </p>
            <p>1、怀疑不是真人，是AI 在聊天；</p>
            <p>2、询问付款和充值；</p>
            <p>3、询问产品收益和安全。</p>
          </div>
        </div>

        <div
          className="mb-[32px] rounded-[12px] bg-white px-[32px] pb-[28px] pt-[28px]"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-[12px]">
            <div className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[#2563EB]">
              <NotificationIcon className="text-white" />
            </div>
            <span
              className="text-[18px] font-semibold text-[#111827]"
              style={{ lineHeight: '36px', letterSpacing: '0.3px' }}
            >
              绑定人工通知账号
            </span>
          </div>

          <p
            className="ml-[48px] mt-[14px] text-[14px] font-normal text-[#6B7280]"
            style={{ lineHeight: '22px', maxWidth: '500px' }}
          >
            绑定后，当触发接管规则时，数字员工将预警提醒推送到所选渠道，方便人工及时处理。
          </p>

          <div className="mt-[24px] flex gap-[24px]">
            <div className="relative flex-1 overflow-hidden rounded-[12px] bg-[#F0FDF4] p-[24px]">
              <div className="pointer-events-none absolute right-0 top-0 h-full w-[40%] opacity-[0.08]">
                <svg viewBox="0 0 200 160" className="h-full w-full">
                  <path
                    d="M200 160C160 100 120 120 80 80S40 20 0 40V160H200Z"
                    fill="#22C55E"
                  />
                </svg>
              </div>

              <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[12px] bg-[#22C55E]">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path
                    d="M14 3C7.92487 3 3 7.92487 3 14C3 16.5 3.8 18.8 5.2 20.7L4 25L8.5 23.5C10.3 24.5 12.2 25 14 25C20.0751 25 25 20.0751 25 14C25 7.92487 20.0751 3 14 3Z"
                    fill="white"
                  />
                  <path
                    d="M10.5 11C10.5 11 10.5 9.5 11.5 9.5C12.5 9.5 13.5 11 14 12C14.5 11 15.5 9.5 16.5 9.5C17.5 9.5 17.5 11 17.5 11C17.5 12.5 16 14 16 14C16 14 17 15.5 16.5 17C16 18.5 14 19 14 19C14 19 12 18.5 11.5 17C11 15.5 12 14 12 14C12 14 10.5 12.5 10.5 11Z"
                    fill="#22C55E"
                  />
                </svg>
              </div>

              <span className="mt-[16px] block text-[16px] font-medium leading-[22px] text-[#111827]">
                WhatsApp Bot通知
              </span>

              <div className="mt-[12px] inline-flex h-[28px] items-center gap-[4px] rounded-[6px] bg-[#DCFCE7] px-[10px]">
                <CheckIcon size="16px" className="text-[#16A34A]" />
                <span className="text-[13px] font-medium leading-none text-[#16A34A]">
                  已绑定
                </span>
              </div>

              <button
                type="button"
                className="absolute bottom-[24px] right-[24px] flex h-[32px] w-[88px] cursor-pointer items-center justify-center rounded-[6px] border border-solid border-[#2563EB] bg-white text-[13px] font-medium text-[#2563EB]"
              >
                重新绑定
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-[12px] bg-[#EFF6FF] p-[24px]">
              <div className="pointer-events-none absolute right-0 top-0 h-full w-[40%] opacity-[0.08]">
                <svg viewBox="0 0 200 160" className="h-full w-full">
                  <path
                    d="M200 160C160 100 120 120 80 80S40 20 0 40V160H200Z"
                    fill="#2563EB"
                  />
                </svg>
              </div>

              <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[12px] bg-[#2563EB]">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path
                    d="M24.5 4.5L2.5 13.5L9.5 16.5L20.5 9L12 18L12.5 19L20 24.5L24.5 4.5Z"
                    fill="white"
                  />
                </svg>
              </div>

              <span className="mt-[16px] block text-[16px] font-medium leading-[22px] text-[#111827]">
                Telegram Bot通知
              </span>

              <div className="mt-[12px] inline-flex h-[28px] items-center gap-[4px] rounded-[6px] bg-[#F3F4F6] px-[10px]">
                <CloseIcon size="16px" className="text-[#9CA3AF]" />
                <span className="text-[13px] font-medium leading-none text-[#6B7280]">
                  未绑定
                </span>
              </div>

              <button
                type="button"
                className="absolute bottom-[24px] right-[24px] flex h-[32px] w-[88px] cursor-pointer items-center justify-center rounded-[6px] border-none bg-[#2563EB] text-[13px] font-medium text-white"
              >
                去绑定
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-y-[20px]">
          {rules.map(item => {
            const isFocused = focusedRuleId === item.id;
            return (
              <div key={item.id} className="flex min-h-[52px] items-center">
                <div className="flex w-[88px] flex-shrink-0 items-center gap-[8px]">
                  <div className="h-[18px] w-[4px] flex-shrink-0 rounded-[2px] bg-[#2563EB]" />
                  <span className="w-[76px] text-right text-[15px] font-medium leading-[22px] text-[#1F2937]">
                    {item.label}
                  </span>
                </div>

                <div className="ml-[16px] flex-1">
                  <div
                    className={`flex items-center h-[44px] rounded-[8px] bg-white transition-all duration-200 ${
                      isFocused
                        ? 'border-[1.5px] border-[#2563EB] shadow-[0_0_0_3px_rgba(37,99,235,0.08)]'
                        : 'border border-[#E5E7EB]'
                    }`}
                  >
                    <input
                      type="text"
                      value={item.value}
                      onChange={e =>
                        this.handleRuleChange(item.id, e.target.value)
                      }
                      placeholder={item.placeholder}
                      onFocus={() => this.setState({ focusedRuleId: item.id })}
                      onBlur={() => this.setState({ focusedRuleId: null })}
                      autoFocus={item.id === 2}
                      className="h-full flex-1 rounded-[8px] border-none bg-transparent px-[16px] text-[15px] font-normal text-[#1F2937] outline-none placeholder:text-[#9CA3AF]"
                      style={{ lineHeight: '44px' }}
                    />
                    <div className="flex items-center pr-[12px]">
                      {this.renderAction(item)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="ml-[104px] mt-[28px]"
          style={{ width: 'calc(100% - 104px)' }}
        >
          <button
            type="button"
            onClick={this.handleRuleAdd}
            className="flex h-[48px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border-[1.5px] border-dashed border-[#2563EB] bg-transparent transition-colors duration-200 hover:bg-[rgba(37,99,235,0.04)]"
          >
            <AddIcon size="18px" className="text-[#2563EB]" />
            <span className="text-[15px] font-medium text-[#2563EB]">
              新增接管规则
            </span>
          </button>
        </div>
      </div>
    );
  }
}

export default HandoverRulesTab;
