import type { ReactElement, ReactNode } from 'react';

interface FilterToolbarProps {
  leftContent: ReactNode;
  rightContent?: ReactNode;
  className?: string;
}

const FilterToolbar = ({
  leftContent,
  rightContent,
  className = '',
}: FilterToolbarProps): ReactElement => {
  return (
    <div
      className={`mb-[24px] flex flex-wrap items-center gap-[16px] ${className}`}
    >
      {leftContent}
      <div className="flex-1" />
      {rightContent}
    </div>
  );
};

export default FilterToolbar;
