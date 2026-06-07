import { type ReactElement } from 'react';
import { CheckCircleFilledIcon } from 'tdesign-icons-react';
import { Tag } from 'tdesign-react';

interface StepItemProps {
  stepNumber: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  isLast: boolean;
}

export function StepItem(props: StepItemProps): ReactElement {
  const { stepNumber, title, description, status, isLast } = props;

  const getIndicator = (): ReactElement => {
    if (status === 'completed') {
      return (
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[2px] border-[#0052D9] bg-white">
          <CheckCircleFilledIcon className="text-[12px] text-[#0052D9]" />
        </div>
      );
    }
    if (status === 'current') {
      return (
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#0052D9] text-[14px] font-bold leading-none text-white">
          {stepNumber}
        </div>
      );
    }
    return (
      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[2px] border-[#999999] bg-white text-[14px] font-semibold leading-none text-[#999999]">
        {stepNumber}
      </div>
    );
  };

  const getStatusTag = (): ReactElement => {
    let tagBgColor = '#E8E8E8';
    let tagTextColor = '#222222';
    if (status === 'completed') {
      tagBgColor = '#8BDCAD';
      tagTextColor = 'white';
    }

    return (
      <Tag
        className="!mt-[6px] !h-[32px] !min-w-[66px] !rounded-[16px] !border-0 !text-[14px] !font-medium !leading-[32px] !text-center flex items-center justify-center"
        style={{ backgroundColor: tagBgColor, color: tagTextColor }}
      >
        {status === 'completed' ? '已完成' : '待设置'}
      </Tag>
    );
  };

  const titleColor =
    status === 'current'
      ? '#0052D9'
      : status === 'completed'
        ? '#222222'
        : '#999999';
  const descriptionColor = status === 'completed' ? '#666666' : '#999999';
  const connectorBgColor =
    status === 'completed' || status === 'current' ? '#0052D9' : '#E6E6E6';

  return (
    <div className="flex min-h-[79px] items-start justify-between">
      <div className="flex min-w-0 items-start">
        <div className="relative mr-[29px] flex w-[22px] flex-shrink-0 justify-center">
          {getIndicator()}
          {!isLast && (
            <div
              className="absolute left-[10px] top-[32px] h-[31px] w-[2px]"
              style={{ backgroundColor: connectorBgColor }}
            />
          )}
        </div>
        <div className="pt-[1px]">
          <div
            className="text-[16px] font-semibold leading-[22px]"
            style={{ color: titleColor }}
          >
            {title}
          </div>
          <div
            className="mt-[10px] text-[14px] font-normal leading-[20px]"
            style={{ color: descriptionColor }}
          >
            {description}
          </div>
        </div>
      </div>
      {getStatusTag()}
    </div>
  );
}
