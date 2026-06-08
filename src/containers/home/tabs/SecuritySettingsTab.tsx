import { Component, type ReactElement } from 'react';
import type { WrappedComponentProps } from 'react-intl';
import { defineMessages, injectIntl } from 'react-intl';
import { AddIcon } from 'tdesign-icons-react';
import { Dialog } from 'tdesign-react';

const messages = defineMessages({
  title: {
    id: 'securitySettingsTab.title',
    defaultMessage: 'Safety boundaries',
  },
  descP1: {
    id: 'securitySettingsTab.desc.p1',
    defaultMessage:
      'Set content the AI agent cannot promise, commit to, or reply freely, e.g.',
  },
  descP2: {
    id: 'securitySettingsTab.desc.p2',
    defaultMessage: '1. No offline meetings;',
  },
  descP3: {
    id: 'securitySettingsTab.desc.p3',
    defaultMessage: '2. No private contact info;',
  },
  descP4: {
    id: 'securitySettingsTab.desc.p4',
    defaultMessage: '3. No fabricated itineraries, etc.',
  },
  inputPlaceholder: {
    id: 'securitySettingsTab.inputPlaceholder',
    defaultMessage: 'Enter content',
  },
  inputConditionPlaceholder: {
    id: 'securitySettingsTab.inputConditionPlaceholder',
    defaultMessage: 'Enter condition',
  },
  addCondition: {
    id: 'securitySettingsTab.addCondition',
    defaultMessage: 'Add condition',
  },
  confirm: {
    id: 'securitySettingsTab.confirm',
    defaultMessage: 'Confirm',
  },
  toastDeleted: {
    id: 'securitySettingsTab.toast.deleted',
    defaultMessage: 'Deleted',
  },
  dialogTitle: {
    id: 'securitySettingsTab.dialog.title',
    defaultMessage: 'Save changes?',
  },
  dialogDesc: {
    id: 'securitySettingsTab.dialog.desc',
    defaultMessage: 'You have unsaved changes, do you want to save?',
  },
  dialogExit: {
    id: 'securitySettingsTab.dialog.exit',
    defaultMessage: 'Exit',
  },
  dialogSave: {
    id: 'securitySettingsTab.dialog.save',
    defaultMessage: 'Save',
  },
  boundaryOne: {
    id: 'securitySettingsTab.boundaryOne',
    defaultMessage: 'Boundary 1',
  },
  boundaryTwo: {
    id: 'securitySettingsTab.boundaryTwo',
    defaultMessage: 'Boundary 2',
  },
  boundaryThree: {
    id: 'securitySettingsTab.boundaryThree',
    defaultMessage: 'Boundary 3',
  },
  boundaryFour: {
    id: 'securitySettingsTab.boundaryFour',
    defaultMessage: 'Boundary 4',
  },
  boundaryFive: {
    id: 'securitySettingsTab.boundaryFive',
    defaultMessage: 'Boundary 5',
  },
  mockValue: {
    id: 'securitySettingsTab.mockValue',
    defaultMessage: 'Do not promise specific time for offline meetings',
  },
});

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
  Record<string, never> & WrappedComponentProps,
  SecuritySettingsTabState
> {
  constructor(props: Record<string, never> & WrappedComponentProps) {
    super(props);
    const { intl } = props;
    this.state = {
      focusedBoundaryId: null,
      showDeleteToast: false,
      showConfirmDialog: false,
      boundaries: [
        {
          id: 1,
          label: intl.formatMessage(messages.boundaryOne),
          value: '',
          placeholder: intl.formatMessage(messages.inputPlaceholder),
        },
        {
          id: 2,
          label: intl.formatMessage(messages.boundaryTwo),
          value: '',
          placeholder: intl.formatMessage(messages.inputPlaceholder),
        },
        {
          id: 3,
          label: intl.formatMessage(messages.boundaryThree),
          value: intl.formatMessage(messages.mockValue),
          placeholder: intl.formatMessage(messages.inputPlaceholder),
        },
        {
          id: 4,
          label: intl.formatMessage(messages.boundaryThree),
          value: intl.formatMessage(messages.mockValue),
          placeholder: intl.formatMessage(messages.inputPlaceholder),
        },
        {
          id: 5,
          label: intl.formatMessage(messages.boundaryFour),
          value: intl.formatMessage(messages.mockValue),
          placeholder: intl.formatMessage(messages.inputPlaceholder),
        },
        {
          id: 6,
          label: intl.formatMessage(messages.boundaryFive),
          value: intl.formatMessage(messages.mockValue),
          placeholder: intl.formatMessage(messages.inputPlaceholder),
        },
      ],
    };
  }

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
    const { intl } = this.props;
    this.setState(prev => ({
      boundaries: [
        ...prev.boundaries,
        {
          id: this.nextBoundaryId++,
          label: '',
          value: '',
          placeholder: intl.formatMessage(messages.inputConditionPlaceholder),
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
    const { intl } = this.props;

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
              {intl.formatMessage(messages.confirm)}
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
              {intl.formatMessage(messages.title)}
            </span>
          </div>
          <div className="ml-[32px] mt-[10px] text-[14px] font-normal leading-[24px] text-secondary">
            <p>{intl.formatMessage(messages.descP1)}</p>
            <p>{intl.formatMessage(messages.descP2)}</p>
            <p>{intl.formatMessage(messages.descP3)}</p>
            <p>{intl.formatMessage(messages.descP4)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-y-[20px]">
          {boundaries.map(item => {
            const isFocused = focusedBoundaryId === item.id;
            return (
              <div key={item.id} className="flex min-h-[52px] items-center">
                <div className="flex min-w-[88px] flex-shrink-0 items-center gap-[8px]">
                  <div className="h-[18px] w-[4px] flex-shrink-0 rounded-[2px] bg-brand" />
                  <span className="min-w-[76px] text-right text-[15px] font-medium leading-[22px] text-primary">
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
            <span className="text-[15px] font-medium text-brand">
              {intl.formatMessage(messages.addCondition)}
            </span>
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
                {intl.formatMessage(messages.toastDeleted)}
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
              {intl.formatMessage(messages.dialogTitle)}
            </span>
          </div>
          <p
            className="mt-[12px] text-[15px] font-normal text-placeholder"
            style={{ lineHeight: '24px' }}
          >
            {intl.formatMessage(messages.dialogDesc)}
          </p>
          <div className="mt-[24px] flex justify-end gap-[12px]">
            <button
              type="button"
              onClick={this.handleDialogExit}
              className="flex h-[36px] cursor-pointer items-center justify-center rounded-[6px] border-none bg-component px-[16px] text-[14px] font-medium text-secondary hover:bg-component"
            >
              {intl.formatMessage(messages.dialogExit)}
            </button>
            <button
              type="button"
              onClick={this.handleDialogSave}
              className="flex h-[36px] cursor-pointer items-center justify-center rounded-[6px] border-none bg-brand px-[16px] text-[14px] font-medium text-text-anti hover:bg-brand-hover"
            >
              {intl.formatMessage(messages.dialogSave)}
            </button>
          </div>
        </Dialog>
      </div>
    );
  }
}

export default injectIntl(SecuritySettingsTab);
