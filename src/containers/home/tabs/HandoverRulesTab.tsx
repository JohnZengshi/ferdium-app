import { CheckIcon, CloseIcon, NotificationIcon } from 'tdesign-icons-react';
import type { ReactElement } from 'react';
import { defineMessages, useIntl } from 'react-intl';
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
  whatsappBot: {
    id: 'handoverRulesTab.whatsappBot',
    defaultMessage: 'WhatsApp Bot',
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
  rebind: {
    id: 'handoverRulesTab.rebind',
    defaultMessage: 'Rebind',
  },
  goBind: {
    id: 'handoverRulesTab.goBind',
    defaultMessage: 'Bind',
  },
  addRule: {
    id: 'handoverRulesTab.addRule',
    defaultMessage: 'Add handover rule',
  },
});

const HandoverRulesTab = (): ReactElement => {
  const intl = useIntl();

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
          <div className="relative flex-1 overflow-hidden rounded-[12px] bg-success-light p-[24px]">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-[40%] opacity-[0.08]">
              <svg viewBox="0 0 200 160" className="h-full w-full">
                <path
                  d="M200 160C160 100 120 120 80 80S40 20 0 40V160H200Z"
                  style={{ fill: 'var(--td-success-color)' }}
                />
              </svg>
            </div>

            <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[12px] bg-success">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path
                  d="M14 3C7.92487 3 3 7.92487 3 14C3 16.5 3.8 18.8 5.2 20.7L4 25L8.5 23.5C10.3 24.5 12.2 25 14 25C20.0751 25 25 20.0751 25 14C25 7.92487 20.0751 3 14 3Z"
                  fill="white"
                />
                <path
                  d="M10.5 11C10.5 11 10.5 9.5 11.5 9.5C12.5 9.5 13.5 11 14 12C14.5 11 15.5 9.5 16.5 9.5C17.5 9.5 17.5 11 17.5 11C17.5 12.5 16 14 16 14C16 14 17 15.5 16.5 17C16 18.5 14 19 14 19C14 19 12 18.5 11.5 17C11 15.5 12 14 12 14C12 14 10.5 12.5 10.5 11Z"
                  style={{ fill: 'var(--td-success-color)' }}
                />
              </svg>
            </div>

            <span className="mt-[16px] block text-[16px] font-medium leading-[22px] text-primary">
              {intl.formatMessage(messages.whatsappBot)}
            </span>

            <div className="mt-[12px] inline-flex h-[28px] items-center gap-[4px] rounded-[6px] bg-success-light px-[10px]">
              <CheckIcon size="16px" className="text-success-active" />
              <span className="text-[13px] font-medium leading-none text-success-active">
                {intl.formatMessage(messages.bound)}
              </span>
            </div>

            <button
              type="button"
              className="absolute bottom-[24px] right-[24px] flex h-[32px] w-[88px] cursor-pointer items-center justify-center rounded-[6px] border border-solid border-brand bg-container text-[13px] font-medium text-brand"
            >
              {intl.formatMessage(messages.rebind)}
            </button>
          </div>

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

            <div className="mt-[12px] inline-flex h-[28px] items-center gap-[4px] rounded-[6px] bg-secondary-container px-[10px]">
              <CloseIcon size="16px" className="text-placeholder" />
              <span className="text-[13px] font-medium leading-none text-placeholder">
                {intl.formatMessage(messages.unbound)}
              </span>
            </div>

            <button
              type="button"
              className="absolute bottom-[24px] right-[24px] flex h-[32px] w-[88px] cursor-pointer items-center justify-center rounded-[6px] border-none bg-brand text-[13px] font-medium text-text-anti"
            >
              {intl.formatMessage(messages.goBind)}
            </button>
          </div>
        </div>
      </div>

      <RuleListEditor
        addLabel={intl.formatMessage(messages.addRule)}
        namePrefix="规则"
        ruleType="handoff_policy"
      />
    </div>
  );
};

export default HandoverRulesTab;
