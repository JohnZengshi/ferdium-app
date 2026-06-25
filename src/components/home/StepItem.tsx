import type { ReactElement } from 'react';
import { defineMessages, useIntl } from 'react-intl';
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
        <svg
          width="24"
          height="28"
          viewBox="0 0 24 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0"
        >
          <path
            d="M12 25C16.9706 25 21 20.9706 21 16C21 11.0294 16.9706 7 12 7C7.02944 7 3 11.0294 3 16C3 20.9706 7.02944 25 12 25ZM23 16C23 22.0751 18.0751 27 12 27C5.92487 27 0.999999 22.0751 1 16C1 9.92487 5.92487 5 12 5C18.0751 5 23 9.92487 23 16ZM10.5 20.4142L6.08578 16L7.5 14.5858L10.5 17.5858L16.5 11.5858L17.9142 13L10.5 20.4142Z"
            fill="#0052D9"
          />
        </svg>
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
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="black"
          strokeOpacity="0.4"
          strokeWidth="2"
        />
        <text
          x="12"
          y="12"
          textAnchor="middle"
          dominantBaseline="central"
          fill="black"
          fillOpacity="0.4"
          fontSize="14"
          fontWeight="600"
        >
          {stepNumber}
        </text>
      </svg>
    );
  };

  const getStatusTag = (): ReactElement => {
    if (status === 'completed') {
      return (
        <svg
          width="66"
          height="32"
          viewBox="0 0 66 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mt-[6px]"
        >
          <rect width="66" height="32" rx="16" fill="#92DAB2" />
          <path
            d="M23.69 15.904H14.898V20.034C14.898 20.65 15.22 20.972 15.864 20.972H22.892C23.228 20.972 23.508 20.888 23.718 20.72C23.998 20.468 24.18 19.572 24.264 18.032L25.244 18.34C25.104 20.076 24.866 21.112 24.53 21.476C24.222 21.77 23.76 21.924 23.172 21.952H15.584C14.45 21.952 13.89 21.364 13.89 20.216V12.866H14.898V14.938H22.668V11.284H13.33V10.304H23.69V15.904ZM38.922 11.06V14.196H37.9V12.04H28.072V14.196H27.05V11.06H32.426C32.258 10.584 32.09 10.15 31.894 9.758L33.028 9.562C33.21 10.01 33.392 10.5 33.56 11.06H38.922ZM29.052 13.664H36.892V14.644H29.052V13.664ZM26.91 16.296H39.104V17.262H35.142V20.58C35.142 21 35.338 21.224 35.744 21.224H37.606C37.858 21.224 38.026 21.126 38.124 20.944C38.236 20.734 38.32 20.104 38.376 19.04L39.328 19.348C39.244 20.692 39.076 21.518 38.824 21.798C38.6 22.05 38.264 22.19 37.788 22.19H35.422C34.554 22.19 34.134 21.714 34.134 20.79V17.262H31.782V17.36C31.74 18.732 31.362 19.838 30.662 20.678C29.962 21.434 28.828 22.036 27.26 22.47L26.686 21.574C28.212 21.182 29.276 20.664 29.892 20.006C30.452 19.334 30.746 18.452 30.788 17.36V17.262H26.91V16.296ZM50.416 9.52C51.088 10.024 51.662 10.542 52.138 11.06L51.494 11.704H53.202V12.67H48.89C48.988 14.406 49.17 15.778 49.422 16.786C49.506 17.136 49.604 17.458 49.702 17.766C50.402 16.646 50.962 15.33 51.396 13.832L52.306 14.224C51.746 16.072 51.018 17.64 50.122 18.9C50.318 19.348 50.528 19.74 50.752 20.062C51.214 20.734 51.592 21.07 51.872 21.07C52.124 21.056 52.362 20.328 52.572 18.886L53.482 19.39C53.146 21.252 52.67 22.19 52.04 22.19C51.452 22.19 50.822 21.77 50.15 20.93C49.898 20.594 49.66 20.202 49.45 19.768C48.47 20.916 47.322 21.77 46.006 22.358L45.446 21.518C46.846 20.888 48.036 19.964 49.002 18.746C48.806 18.228 48.624 17.668 48.47 17.066C48.162 15.89 47.966 14.42 47.854 12.67H43.052V14.994H46.482C46.454 17.36 46.342 18.886 46.16 19.572C45.978 20.174 45.544 20.482 44.844 20.51C44.508 20.51 44.102 20.482 43.654 20.454L43.346 19.544C43.892 19.572 44.354 19.586 44.732 19.586C45.04 19.572 45.236 19.362 45.32 18.97C45.404 18.494 45.446 17.486 45.474 15.946H43.052V16.366C42.996 18.872 42.436 20.888 41.4 22.4L40.63 21.714C41.526 20.426 41.988 18.648 42.03 16.366V11.704H47.812C47.784 11.004 47.77 10.29 47.77 9.534H48.806C48.806 10.318 48.82 11.032 48.848 11.704H51.466C51.046 11.2 50.486 10.682 49.772 10.136L50.416 9.52Z"
            fill="white"
            fillOpacity="0.9"
          />
        </svg>
      );
    }

    return (
      <Tag className="!mt-[6px] !h-[32px] !min-w-[66px] !rounded-[16px] !border-0 !text-[14px] !font-medium !leading-[32px] !text-center flex items-center justify-center bg-component text-primary">
        {intl.formatMessage(messages.pending)}
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
