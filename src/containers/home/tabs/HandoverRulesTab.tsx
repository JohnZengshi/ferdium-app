import { type ReactElement, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { CheckIcon, CloseIcon, NotificationIcon } from 'tdesign-icons-react';
import { Button, Dialog, Input, MessagePlugin } from 'tdesign-react';
import RuleListEditor from './RuleListEditor';

const messages = defineMessages({
  title: {
    id: 'handoverRulesTab.title',
    defaultMessage: 'Handover rules',
  },
  descP1: {
    id: 'handoverRulesTab.desc.p1',
    defaultMessage:
      'When a message triggers your rules, the AI agent will alert a human operator, e.g.',
  },
  descP2: {
    id: 'handoverRulesTab.desc.p2',
    defaultMessage: '1. Suspecting it is AI, not a real person;',
  },
  descP3: {
    id: 'handoverRulesTab.desc.p3',
    defaultMessage: '2. Asking about payments;',
  },
  descP4: {
    id: 'handoverRulesTab.desc.p4',
    defaultMessage: '3. Asking about product returns and safety.',
  },
  notificationTitle: {
    id: 'handoverRulesTab.notificationTitle',
    defaultMessage: 'Bind notification account',
  },
  notificationDesc: {
    id: 'handoverRulesTab.notificationDesc',
    defaultMessage:
      'When a rule is triggered, alerts will be pushed to the bound channel for timely handling.',
  },
  telegramBot: {
    id: 'handoverRulesTab.telegramBot',
    defaultMessage: 'Telegram Bot',
  },
  bound: {
    id: 'handoverRulesTab.bound',
    defaultMessage: 'Bound',
  },
  unbound: {
    id: 'handoverRulesTab.unbound',
    defaultMessage: 'Unbound',
  },
  goBind: {
    id: 'handoverRulesTab.goBind',
    defaultMessage: 'Bind',
  },
  unbind: {
    id: 'handoverRulesTab.unbind',
    defaultMessage: 'Unbind',
  },
  edit: {
    id: 'handoverRulesTab.edit',
    defaultMessage: 'Edit',
  },
  addRule: {
    id: 'handoverRulesTab.addRule',
    defaultMessage: 'Add handover rule',
  },
  bindDialogTitle: {
    id: 'handoverRulesTab.bindDialogTitle',
    defaultMessage: 'Telegram Bot Settings',
  },
  editDialogTitle: {
    id: 'handoverRulesTab.editDialogTitle',
    defaultMessage: 'Edit Telegram Bot',
  },
  botTokenLabel: {
    id: 'handoverRulesTab.botTokenLabel',
    defaultMessage: 'Bot Token',
  },
  botTokenPlaceholder: {
    id: 'handoverRulesTab.botTokenPlaceholder',
    defaultMessage: 'Enter your Telegram Bot Token',
  },
  chatIdLabel: {
    id: 'handoverRulesTab.chatIdLabel',
    defaultMessage: 'Chat ID',
  },
  chatIdPlaceholder: {
    id: 'handoverRulesTab.chatIdPlaceholder',
    defaultMessage: 'Enter your Telegram Chat ID',
  },
  test: {
    id: 'handoverRulesTab.test',
    defaultMessage: 'Test',
  },
  confirm: {
    id: 'handoverRulesTab.confirm',
    defaultMessage: 'Confirm',
  },
  cancel: {
    id: 'handoverRulesTab.cancel',
    defaultMessage: 'Cancel',
  },
  testSuccess: {
    id: 'handoverRulesTab.testSuccess',
    defaultMessage: 'Test successful, notification channel works!',
  },
  testFailed: {
    id: 'handoverRulesTab.testFailed',
    defaultMessage: 'Test failed, please check Bot Token and Chat ID.',
  },
  bindSuccess: {
    id: 'handoverRulesTab.bindSuccess',
    defaultMessage: 'Telegram Bot bound successfully!',
  },
  unbindSuccess: {
    id: 'handoverRulesTab.unbindSuccess',
    defaultMessage: 'Telegram Bot unbound successfully!',
  },
  unbindConfirmTitle: {
    id: 'handoverRulesTab.unbindConfirmTitle',
    defaultMessage: 'Unbind Telegram Bot',
  },
  unbindConfirmContent: {
    id: 'handoverRulesTab.unbindConfirmContent',
    defaultMessage:
      'Are you sure you want to unbind the Telegram Bot? Notifications will no longer be sent.',
  },
  unbindConfirmYes: {
    id: 'handoverRulesTab.unbindConfirmYes',
    defaultMessage: 'Yes, unbind',
  },
});

const HandoverRulesTab = (): ReactElement => {
  const intl = useIntl();

  const [bound, setBound] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [unbindConfirmVisible, setUnbindConfirmVisible] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [editMode, setEditMode] = useState(false);

  const handleBind = (): void => {
    setEditMode(false);
    setBotToken('');
    setChatId('');
    setDialogVisible(true);
  };

  const handleEdit = (): void => {
    setEditMode(true);
    setDialogVisible(true);
  };

  const handleUnbind = (): void => {
    setUnbindConfirmVisible(true);
  };

  const confirmUnbind = (): void => {
    setBound(false);
    setBotToken('');
    setChatId('');
    setUnbindConfirmVisible(false);
    MessagePlugin.success(intl.formatMessage(messages.unbindSuccess));
  };

  const handleTest = (): void => {
    // TODO: 실제 Telegram API 호출로 대체
    if (botToken && chatId) {
      MessagePlugin.success(intl.formatMessage(messages.testSuccess));
    } else {
      MessagePlugin.error(intl.formatMessage(messages.testFailed));
    }
  };

  const handleConfirm = (): void => {
    // TODO: 실제 API 저장 로직으로 대체
    setBound(true);
    setDialogVisible(false);
    MessagePlugin.success(intl.formatMessage(messages.bindSuccess));
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

      <div
        className="mb-[32px] rounded-[12px] bg-container px-[32px] pb-[28px] pt-[28px]"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-[12px]">
          <div className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-[8px] bg-brand">
            <NotificationIcon className="text-text-anti" />
          </div>
          <span
            className="text-[18px] font-semibold text-primary"
            style={{ lineHeight: '36px', letterSpacing: '0.3px' }}
          >
            {intl.formatMessage(messages.notificationTitle)}
          </span>
        </div>

        <p
          className="ml-[48px] mt-[14px] text-[14px] font-normal text-placeholder"
          style={{ lineHeight: '22px', maxWidth: '500px' }}
        >
          {intl.formatMessage(messages.notificationDesc)}
        </p>

        <div className="mt-[24px] flex gap-[24px]">
          <div className="relative flex-1 overflow-hidden rounded-[12px] bg-brand-light p-[24px]">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-[40%] opacity-[0.08]">
              <svg viewBox="0 0 200 160" className="h-full w-full">
                <path
                  d="M200 160C160 100 120 120 80 80S40 20 0 40V160H200Z"
                  style={{ fill: 'var(--td-brand-color)' }}
                />
              </svg>
            </div>

            <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[12px] bg-brand">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path
                  d="M24.5 4.5L2.5 13.5L9.5 16.5L20.5 9L12 18L12.5 19L20 24.5L24.5 4.5Z"
                  fill="white"
                />
              </svg>
            </div>

            <span className="mt-[16px] block text-[16px] font-medium leading-[22px] text-primary">
              {intl.formatMessage(messages.telegramBot)}
            </span>

            <div
              className={`mt-[12px] inline-flex h-[28px] items-center gap-[4px] rounded-[6px] px-[10px] ${
                bound ? 'bg-success-light' : 'bg-secondary-container'
              }`}
            >
              {bound ? (
                <>
                  <CheckIcon size="16px" className="text-success-active" />
                  <span className="text-[13px] font-medium leading-none text-success-active">
                    {intl.formatMessage(messages.bound)}
                  </span>
                </>
              ) : (
                <>
                  <CloseIcon size="16px" className="text-placeholder" />
                  <span className="text-[13px] font-medium leading-none text-placeholder">
                    {intl.formatMessage(messages.unbound)}
                  </span>
                </>
              )}
            </div>

            {bound ? (
              <div className="absolute bottom-[24px] right-[24px] flex gap-[8px]">
                <button
                  type="button"
                  onClick={handleUnbind}
                  className="flex h-[32px] w-[88px] cursor-pointer items-center justify-center rounded-[6px] border border-solid border-error bg-container text-[13px] font-medium text-error"
                >
                  {intl.formatMessage(messages.unbind)}
                </button>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="flex h-[32px] w-[88px] cursor-pointer items-center justify-center rounded-[6px] border border-solid border-brand bg-container text-[13px] font-medium text-brand"
                >
                  {intl.formatMessage(messages.edit)}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleBind}
                className="absolute bottom-[24px] right-[24px] flex h-[32px] w-[88px] cursor-pointer items-center justify-center rounded-[6px] border-none bg-brand text-[13px] font-medium text-text-anti"
              >
                {intl.formatMessage(messages.goBind)}
              </button>
            )}
          </div>
        </div>
      </div>

      <RuleListEditor
        addLabel={intl.formatMessage(messages.addRule)}
        namePrefix="规则"
        ruleType="handoff_policy"
      />

      {/* Bind/Edit Dialog */}
      <Dialog
        header={intl.formatMessage(
          editMode ? messages.editDialogTitle : messages.bindDialogTitle,
        )}
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        footer={
          <div className="flex justify-end gap-[8px]">
            <Button variant="outline" onClick={() => setDialogVisible(false)}>
              {intl.formatMessage(messages.cancel)}
            </Button>
            <Button variant="outline" theme="primary" onClick={handleTest}>
              {intl.formatMessage(messages.test)}
            </Button>
            <Button theme="primary" onClick={handleConfirm}>
              {intl.formatMessage(messages.confirm)}
            </Button>
          </div>
        }
        destroyOnClose
      >
        <div className="flex flex-col gap-[16px] pt-[8px]">
          <div>
            <div className="mb-[6px] text-[14px] font-medium text-primary">
              {intl.formatMessage(messages.botTokenLabel)}
            </div>
            <Input
              placeholder={intl.formatMessage(messages.botTokenPlaceholder)}
              value={botToken}
              onChange={(val: string) => setBotToken(val)}
            />
          </div>
          <div>
            <div className="mb-[6px] text-[14px] font-medium text-primary">
              {intl.formatMessage(messages.chatIdLabel)}
            </div>
            <Input
              placeholder={intl.formatMessage(messages.chatIdPlaceholder)}
              value={chatId}
              onChange={(val: string) => setChatId(val)}
            />
          </div>
        </div>
      </Dialog>

      {/* Unbind Confirm Dialog */}
      <Dialog
        header={intl.formatMessage(messages.unbindConfirmTitle)}
        visible={unbindConfirmVisible}
        onClose={() => setUnbindConfirmVisible(false)}
        footer={
          <div className="flex justify-end gap-[8px]">
            <Button
              variant="outline"
              onClick={() => setUnbindConfirmVisible(false)}
            >
              {intl.formatMessage(messages.cancel)}
            </Button>
            <Button theme="danger" onClick={confirmUnbind}>
              {intl.formatMessage(messages.unbindConfirmYes)}
            </Button>
          </div>
        }
        destroyOnClose
      >
        <p className="text-[14px] text-primary">
          {intl.formatMessage(messages.unbindConfirmContent)}
        </p>
      </Dialog>
    </div>
  );
};

export default HandoverRulesTab;
