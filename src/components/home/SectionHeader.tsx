import type { ReactElement } from 'react';

interface SectionHeaderProps {
  icon: ReactElement;
  title: string;
  titleClassName?: string;
  description?: string;
  actions?: ReactElement;
}

export function SectionHeader(props: SectionHeaderProps): ReactElement {
  const {
    icon,
    title,
    titleClassName = 'text-[20px]',
    description,
    actions,
  } = props;

  return (
    <div className="flex flex-col gap-[26px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[16px]">
          {icon}
          <h2 className={`${titleClassName} font-bold text-primary !mb-0`}>
            {title}
          </h2>
        </div>
        {actions && (
          <div className="flex items-center gap-[8px]">{actions}</div>
        )}
      </div>
      {description && (
        <p className="ml-[4px] text-[14px] text-secondary">{description}</p>
      )}
    </div>
  );
}
