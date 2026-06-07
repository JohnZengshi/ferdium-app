import { Component, type ReactElement } from 'react';
import { AddIcon } from 'tdesign-icons-react';
import { Dialog } from 'tdesign-react';

interface BoundaryItem {
  id: number;
  label: string;
  value: string;
  placeholder: string;
}

interface SecuritySettingsTabState {
  boundaries: BoundaryItem[];
  focusedBoundaryId: number | null;
  showDeleteToast: boolean;
  showConfirmDialog: boolean;
}

class SecuritySettingsTab extends Component<
  Record<string, never>,
  SecuritySettingsTabState
> {
  state: SecuritySettingsTabState = {
    focusedBoundaryId: null,
    showDeleteToast: false,
    showConfirmDialog: false,
    boundaries: [
      { id: 1, label: '边界一', value: '', placeholder: '请输入内容' },
      { id: 2, label: '边界二', value: '', placeholder: '请输入内容' },
      {
        id: 3,
        label: '边界三',
        value: '客户要求线下见面时，不要承诺答应具体时间',
        placeholder: '请输入内容',
      },
      {
        id: 4,
        label: '边界三',
        value: '客户要求线下见面时，不要承诺答应具体时间',
        placeholder: '请输入内容',
      },
      {
        id: 5,
        label: '边界四',
        value: '客户要求线下见面时，不要承诺答应具体时间',
        placeholder: '请输入内容',
      },
      {
        id: 6,
        label: '边界五',
        value: '客户要求线下见面时，不要承诺答应具体时间',
        placeholder: '请输入内容',
      },
    ],
  };

  private nextBoundaryId = 7;

  handleBoundaryDelete = (id: number): void => {
    this.setState(
      prev => ({ boundaries: prev.boundaries.filter(b => b.id !== id) }),
      () => {
        this.setState({ showDeleteToast: true });
        setTimeout(() => this.setState({ showDeleteToast: false }), 2500);
      },
    );
  };

  handleBoundaryAdd = (): void => {
    this.setState(prev => ({
      boundaries: [
        ...prev.boundaries,
        {
          id: this.nextBoundaryId++,
          label: '',
          value: '',
          placeholder: '请输入条件',
        },
      ],
    }));
  };

  handleBoundaryChange = (id: number, value: string): void => {
    this.setState(prev => ({
      boundaries: prev.boundaries.map(b => (b.id === id ? { ...b, value } : b)),
    }));
  };

  handleBoundaryLabelChange = (id: number, label: string): void => {
    this.setState(prev => ({
      boundaries: prev.boundaries.map(b => (b.id === id ? { ...b, label } : b)),
    }));
  };

  handleSaveConfirm = (): void => {
    this.setState({ showConfirmDialog: true });
  };

  handleDialogExit = (): void => {
    this.setState({ showConfirmDialog: false });
  };

  handleDialogSave = (): void => {
    this.setState({ showConfirmDialog: false });
  };

  render(): ReactElement {
    const {
      boundaries,
      focusedBoundaryId,
      showDeleteToast,
      showConfirmDialog,
    } = this.state;

    const renderAction = (item: BoundaryItem): ReactElement | null => {
      switch (item.id) {
        case 1:
        case 5: {
          return null;
        }
        case 2:
        case 3: {
          return (
            <button
              type="button"
              onClick={() => this.handleBoundaryChange(item.id, '')}
              className="flex h-[32px] w-[32px] flex-shrink-0 cursor-pointer items-center justify-center border-none bg-transparent"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="text-placeholder"
              >
                <path
                  d="M4 4L12 12M12 4L4 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          );
        }
        case 4: {
          return (
            <button
              type="button"
              onClick={() => this.handleBoundaryDelete(item.id)}
              className="flex h-[32px] w-[32px] flex-shrink-0 cursor-pointer items-center justify-center border-none bg-transparent"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="text-placeholder"
              >
                <path
                  d="M2 4H14M5 4V2.5C5 2.22386 5.22386 2 5.5 2H10.5C10.7761 2 11 2.22386 11 2.5V4M6.5 6.5V12M9.5 6.5V12M3.5 4L4.5 13.5C4.5 13.7761 4.72386 14 5 14H11C11.2761 14 11.5 13.7761 11.5 13.5L12.5 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        }
        case 6: {
          return (
            <button
              type="button"
              onClick={this.handleSaveConfirm}
              className="flex h-[28px] w-[56px] flex-shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-none bg-brand text-[13px] font-medium text-text-anti"
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

    return (
      <div
        className="mx-auto w-full max-w-[960px] pt-[48px]"
        style={{ width: 'calc(100% - 64px)' }}
      >
        <div className="relative mb-[32px] rounded-[12px] border border-solid border-brand-light bg-brand-light px-[24px] pb-[20px] pt-[20px]">
          <div className="absolute left-[24px] top-[20px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand">
            <span className="text-[13px] font-semibold leading-none text-text-anti">
              i
            </span>
          </div>
          <div className="ml-[32px]">
            <span
              className="text-[17px] font-semibold leading-[26px] text-primary"
              style={{ letterSpacing: '0.2px' }}
            >
              安全边界
            </span>
          </div>
          <div className="ml-[32px] mt-[10px] text-[14px] font-normal leading-[24px] text-secondary">
            <p>设置数字员工团队不能答应、不能承诺、不能自由回复的内容，例如</p>
            <p>1、不答应线下见面；</p>
            <p>2、不提供私人联系方式；</p>
            <p>3、不编造行程等</p>
          </div>
        </div>

        <div className="flex flex-col gap-y-[20px]">
          {boundaries.map(item => {
            const isFocused = focusedBoundaryId === item.id;
            return (
              <div key={item.id} className="flex min-h-[52px] items-center">
                <div className="flex w-[88px] flex-shrink-0 items-center gap-[8px]">
                  <div className="h-[18px] w-[4px] flex-shrink-0 rounded-[2px] bg-brand" />
                  <span className="w-[76px] text-right text-[15px] font-medium leading-[22px] text-primary">
                    {item.label}
                  </span>
                </div>

                <div className="ml-[16px] flex-1">
                  <div
                    className={`flex items-center h-[44px] rounded-[8px] bg-container transition-all duration-200 ${
                      isFocused
                        ? 'border-[1.5px] border-brand shadow-[0_0_0_3px_rgba(37,99,235,0.08)]'
                        : 'border border-line'
                    }`}
                  >
                    <input
                      type="text"
                      value={item.value}
                      onChange={e =>
                        this.handleBoundaryChange(item.id, e.target.value)
                      }
                      placeholder={item.placeholder}
                      onFocus={() =>
                        this.setState({ focusedBoundaryId: item.id })
                      }
                      onBlur={() => this.setState({ focusedBoundaryId: null })}
                      autoFocus={item.id === 2}
                      className="h-full flex-1 rounded-[8px] border-none bg-transparent px-[16px] text-[15px] font-normal text-primary outline-none placeholder:text-placeholder"
                      style={{ lineHeight: '44px' }}
                    />
                    <div className="flex items-center pr-[12px]">
                      {renderAction(item)}
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
            onClick={this.handleBoundaryAdd}
            className="flex h-[48px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border-[1.5px] border-dashed border-brand bg-transparent transition-colors duration-200 hover:bg-brand-light"
          >
            <AddIcon size="18px" className="text-brand" />
            <span className="text-[15px] font-medium text-brand">新增条件</span>
          </button>
        </div>

        {showDeleteToast && (
          <div className="fixed bottom-[120px] left-1/2 z-[9999] -translate-x-1/2">
            <div className="flex items-center gap-[10px] rounded-[10px] border border-solid border-line bg-container px-[24px] py-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.10),0_2px_6px_rgba(0,0,0,0.06)]">
              <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-success">
                <span className="text-[12px] font-bold leading-none text-text-anti">
                  ✓
                </span>
              </div>
              <span className="text-[15px] font-normal text-primary">
                删除成功
              </span>
            </div>
          </div>
        )}

        <Dialog
          visible={showConfirmDialog}
          closeBtn={false}
          closeOnOverlayClick={false}
          destroyOnClose
          width={440}
          header={false}
          footer={false}
          className="[&_.t-dialog\\_\\_body]:!px-[32px] [&_.t-dialog\\_\\_body]:!pt-[32px] [&_.t-dialog\\_\\_body]:!pb-[24px]"
          style={{
            boxShadow:
              '0 16px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex items-center gap-[12px]">
            <div className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-full bg-brand">
              <span className="text-[16px] font-semibold leading-none text-text-anti">
                i
              </span>
            </div>
            <span
              className="text-[20px] font-semibold text-primary"
              style={{ lineHeight: '36px', letterSpacing: '0.5px' }}
            >
              是否保存
            </span>
          </div>
          <p
            className="mt-[12px] text-[15px] font-normal text-placeholder"
            style={{ lineHeight: '24px' }}
          >
            您有未保存的内容，是否要保存？
          </p>
          <div className="mt-[24px] flex justify-end gap-[12px]">
            <button
              type="button"
              onClick={this.handleDialogExit}
              className="flex h-[36px] cursor-pointer items-center justify-center rounded-[6px] border-none bg-component px-[16px] text-[14px] font-medium text-secondary hover:bg-component"
            >
              退出
            </button>
            <button
              type="button"
              onClick={this.handleDialogSave}
              className="flex h-[36px] cursor-pointer items-center justify-center rounded-[6px] border-none bg-brand px-[16px] text-[14px] font-medium text-text-anti hover:bg-brand-hover"
            >
              保存
            </button>
          </div>
        </Dialog>
      </div>
    );
  }
}

export default SecuritySettingsTab;
