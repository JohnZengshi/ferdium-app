import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';

import { NotificationIcon } from 'tdesign-icons-react';
import { Button, Dialog, Input, MessagePlugin } from 'tdesign-react';
import type { TelegramBotResponse } from '../../../agent-flow-cs/api/generated/agentFlowCs.schemas';
import {
  createBotApiV1TelegramBotsPost,
  deleteBotApiV1TelegramBotsBotIdDelete,
  listBotsApiV1TelegramBotsGet,
  testBotApiV1TelegramBotsBotIdTestPost,
  updateBotApiV1TelegramBotsBotIdPatch,
  verifyTokenApiV1TelegramBotsVerifyTokenPost,
} from '../../../agent-flow-cs/api/generated/telegram-bots/telegram-bots';
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
  nameLabel: {
    id: 'handoverRulesTab.nameLabel',
    defaultMessage: 'Bot Name',
  },
  namePlaceholder: {
    id: 'handoverRulesTab.namePlaceholder',
    defaultMessage: 'Enter a name for this bot',
  },
  saveFailed: {
    id: 'handoverRulesTab.saveFailed',
    defaultMessage: 'Operation failed, please try again.',
  },
  deleteFailed: {
    id: 'handoverRulesTab.deleteFailed',
    defaultMessage: 'Unbind failed, please try again.',
  },
  namePrefix: {
    id: 'handoverRulesTab.namePrefix',
    defaultMessage: 'Rule',
  },
});

const HandoverRulesTab = (): ReactElement => {
  const intl = useIntl();

  const [currentBot, setCurrentBot] = useState<TelegramBotResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [unbindConfirmVisible, setUnbindConfirmVisible] = useState(false);
  const [botName, setBotName] = useState('');
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [editMode, setEditMode] = useState(false);

  const bound = currentBot !== null;

  const fetchBotList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBotsApiV1TelegramBotsGet({ limit: 1 });
      if (res.status === 200 && res.data.items && res.data.items.length > 0) {
        setCurrentBot(res.data.items[0]);
      }
    } catch {
      // silently ignore — treat as unbound
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBotList();
  }, [fetchBotList]);

  const handleBind = (): void => {
    setEditMode(false);
    setBotName('');
    setBotToken('');
    setChatId('');
    setDialogVisible(true);
  };

  const handleEdit = (): void => {
    setEditMode(true);
    setBotName(currentBot?.name ?? '');
    setBotToken('');
    setChatId(currentBot?.chat_id ?? '');
    setDialogVisible(true);
  };

  const handleUnbind = (): void => {
    setUnbindConfirmVisible(true);
  };

  const confirmUnbind = async (): Promise<void> => {
    if (!currentBot) return;
    try {
      const res = await deleteBotApiV1TelegramBotsBotIdDelete(currentBot.id);
      if (res.status === 204) {
        setCurrentBot(null);
        setBotName('');
        setBotToken('');
        setChatId('');
        setUnbindConfirmVisible(false);
        MessagePlugin.success(intl.formatMessage(messages.unbindSuccess));
      }
    } catch {
      MessagePlugin.error(intl.formatMessage(messages.deleteFailed));
    }
  };

  const handleTest = async (): Promise<void> => {
    setTesting(true);
    try {
      let success = false;
      let errorMsg: string | null | undefined = null;

      if (botToken.trim() && chatId.trim()) {
        // 有 token + chatId → 调 verify-token（新建/编辑均可）
        const res = await verifyTokenApiV1TelegramBotsVerifyTokenPost({
          bot_token: botToken.trim(),
          chat_id: chatId.trim(),
        });
        success = res.status === 200 && res.data.success;
        errorMsg = res.status === 200 ? res.data.error : null;
      } else if (editMode && currentBot) {
        // 编辑模式未改 token → 用已有 botId 测试
        const res = await testBotApiV1TelegramBotsBotIdTestPost(currentBot.id);
        success = res.status === 200 && res.data.success;
        errorMsg = res.status === 200 ? res.data.error : null;
      }

      if (success) {
        MessagePlugin.success(intl.formatMessage(messages.testSuccess));
      } else {
        MessagePlugin.error(
          errorMsg || intl.formatMessage(messages.testFailed),
        );
      }
    } catch {
      MessagePlugin.error(intl.formatMessage(messages.testFailed));
    } finally {
      setTesting(false);
    }
  };

  const handleConfirm = async (): Promise<void> => {
    if (!botName.trim() || !botToken.trim() || !chatId.trim()) return;
    setSaving(true);
    try {
      if (editMode && currentBot) {
        const res = await updateBotApiV1TelegramBotsBotIdPatch(currentBot.id, {
          name: botName.trim(),
          bot_token: botToken.trim(),
          chat_id: chatId.trim(),
        });
        if (res.status === 200) {
          setCurrentBot(res.data);
          setDialogVisible(false);
          MessagePlugin.success(intl.formatMessage(messages.bindSuccess));
        }
      } else {
        const res = await createBotApiV1TelegramBotsPost({
          name: botName.trim(),
          bot_token: botToken.trim(),
          chat_id: chatId.trim(),
        });
        if (res.status === 201) {
          setCurrentBot(res.data);
          setDialogVisible(false);
          MessagePlugin.success(intl.formatMessage(messages.bindSuccess));
        }
      }
    } catch {
      MessagePlugin.error(intl.formatMessage(messages.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full min-h-full py-[32px] bg-container rounded-[6px]">
      <div className="mx-auto w-[72%]">
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

          <div className="w-[297px] mt-[24px] flex gap-[24px]">
            <div className="relative flex-1 overflow-hidden rounded-[12px] bg-brand-light p-[24px]">
              <div className="pointer-events-none absolute right-0 top-0 h-full w-[101px]">
                <img
                  src="./assets/images/handover-card-decoration.svg"
                  alt=""
                  className="block h-full w-full max-w-none"
                />
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

              {loading ? (
                <div className="absolute bottom-[24px] right-[24px]">
                  <div className="h-[32px] w-[88px] animate-pulse rounded-[6px] bg-secondary-container" />
                </div>
              ) : bound ? (
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
          namePrefix={intl.formatMessage(messages.namePrefix)}
          ruleType="handoff_policy"
        />
      </div>

      {/* Bind/Edit Dialog */}
      <Dialog
        header={intl.formatMessage(
          editMode ? messages.editDialogTitle : messages.bindDialogTitle,
        )}
        visible={dialogVisible}
        closeOnOverlayClick={false}
        onClose={() => setDialogVisible(false)}
        footer={
          <div className="flex justify-end gap-[8px]">
            <Button
              variant="outline"
              disabled={saving || testing}
              onClick={() => setDialogVisible(false)}
            >
              {intl.formatMessage(messages.cancel)}
            </Button>
            <Button
              variant="outline"
              theme="primary"
              disabled={
                (!(botToken.trim() && chatId.trim()) &&
                  !(editMode && currentBot)) ||
                saving ||
                testing
              }
              loading={testing}
              onClick={handleTest}
            >
              {intl.formatMessage(messages.test)}
            </Button>
            <Button
              theme="primary"
              disabled={saving || testing}
              loading={saving}
              onClick={handleConfirm}
            >
              {intl.formatMessage(messages.confirm)}
            </Button>
          </div>
        }
        destroyOnClose
      >
        <div className="flex flex-col gap-[16px] pt-[8px]">
          <div>
            <div className="mb-[6px] text-[14px] font-medium text-primary">
              {intl.formatMessage(messages.nameLabel)}
            </div>
            <Input
              placeholder={intl.formatMessage(messages.namePlaceholder)}
              value={botName}
              onChange={(val: string) => setBotName(val)}
            />
          </div>
          <div>
            <div className="mb-[6px] text-[14px] font-medium text-primary">
              {intl.formatMessage(messages.botTokenLabel)}
            </div>
            <Input
              placeholder={intl.formatMessage(messages.botTokenPlaceholder)}
              value={botToken}
              onChange={(val: string) => setBotToken(val)}
            />
            {editMode && (
              <div className="mt-[4px] text-[12px] text-placeholder">
                {currentBot?.bot_token}
              </div>
            )}
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
