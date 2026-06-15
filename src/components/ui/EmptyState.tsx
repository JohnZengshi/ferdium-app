import type { ReactElement, ReactNode } from 'react';

interface EmptyStateProps {
  imageSrc: string;
  title: string;
  description: string;
  className?: string;
  children?: ReactNode;
}

const EmptyState = ({
  imageSrc,
  title,
  description,
  className = '',
  children,
}: EmptyStateProps): ReactElement => (
  <div
    className={`flex flex-col items-center ${className}`}
  >
    <img
      src={imageSrc}
      alt=""
      className="h-[210px] w-[260px] mb-[18px]"
    />
    <div className="flex flex-col items-center gap-[12px]">
      <p className="m-0 text-[16px] font-normal leading-[24px] text-[#6B7280]">
        {title}
      </p>
      <p className="m-0 text-[16px] font-normal leading-[24px] text-[#9CA3AF]">
        {description}
      </p>
    </div>
    {children}
  </div>
);

export default EmptyState;
