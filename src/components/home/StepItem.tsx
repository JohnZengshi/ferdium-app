import type { ReactElement } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { CheckCircleFilledIcon } from 'tdesign-icons-react';
import { Tag } from 'tdesign-react';

const messages = defineMessages({
  completed: { id: 'stepItem.completed', defaultMessage: 'Done' },
  pending: { id: 'stepItem.pending', defaultMessage: 'Not Set' },
});

interface StepItemProps {
  stepNumber: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  isLast: boolean;
}

export function StepItem(props: StepItemProps): ReactElement {
  const intl = useIntl();
  const { stepNumber, title, description, status, isLast } = props;

  const getIndicator = (): ReactElement => {
    if (status === 'completed') {
      return (
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[2px] border-brand bg-container">
          <CheckCircleFilledIcon className="text-[12px] text-brand" />
        </div>
      );
    }
    if (status === 'current') {
      return (
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand text-[14px] font-bold leading-none text-text-anti">
          {stepNumber}
        </div>
      );
    }
    return (
      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[2px] border-placeholder bg-container text-[14px] font-semibold leading-none text-placeholder">
        {stepNumber}
      </div>
    );
  };

  const getStatusTag = (): ReactElement => {
    const tagClasses =
      status === 'completed'
        ? 'bg-success text-text-anti'
        : 'bg-component text-primary';

    return (
      <Tag
        className={`!mt-[6px] !h-[32px] !min-w-[66px] !rounded-[16px] !border-0 !text-[14px] !font-medium !leading-[32px] !text-center flex items-center justify-center ${tagClasses}`}
      >
        {intl.formatMessage(
          status === 'completed' ? messages.completed : messages.pending,
        )}
      </Tag>
    );
  };

  const titleClass =
    status === 'current'
      ? 'text-brand'
      : status === 'completed'
        ? 'text-primary'
        : 'text-placeholder';
  const descriptionClass =
    status === 'completed' ? 'text-secondary' : 'text-placeholder';
  const connectorClass =
    status === 'completed' || status === 'current' ? 'bg-brand' : 'bg-line';

  return (
    <div className="flex min-h-[79px] items-start justify-between">
      <div className="flex min-w-0 items-start">
        <div className="relative mr-[29px] flex w-[22px] flex-shrink-0 justify-center">
          {getIndicator()}
          {!isLast && (
            <div
              className={`absolute left-[10px] top-[32px] h-[31px] w-[2px] ${connectorClass}`}
            />
          )}
        </div>
        <div className="pt-[1px]">
          <div
            className={`text-[16px] font-semibold leading-[22px] ${titleClass}`}
          >
            {title}
          </div>
          <div
            className={`mt-[10px] text-[14px] font-normal leading-[20px] ${descriptionClass}`}
          >
            {description}
          </div>
        </div>
      </div>
      {getStatusTag()}
    </div>
  );
}
