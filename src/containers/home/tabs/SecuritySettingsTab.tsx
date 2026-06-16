import type { ReactElement } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import RuleListEditor from './RuleListEditor';

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
  addCondition: {
    id: 'securitySettingsTab.addCondition',
    defaultMessage: 'Add condition',
  },
  namePrefix: {
    id: 'securitySettingsTab.namePrefix',
    defaultMessage: 'Boundary',
  },
});

const SecuritySettingsTab = (): ReactElement => {
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

      <RuleListEditor
        addLabel={intl.formatMessage(messages.addCondition)}
        namePrefix={intl.formatMessage(messages.namePrefix)}
        ruleType="safety_boundary"
      />
    </div>
  );
};

export default SecuritySettingsTab;
