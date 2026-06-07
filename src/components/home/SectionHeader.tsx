import { type ReactElement } from 'react';

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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-[10px]">
        {icon}
        <h2 className={`${titleClassName} font-bold text-[#1D2129] !mb-0`}>
          {title}
        </h2>
        {description && (
          <p className="ml-[4px] text-[14px] text-[#86909C]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-[8px]">{actions}</div>}
    </div>
  );
}
