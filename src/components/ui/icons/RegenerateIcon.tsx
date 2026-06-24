import type { SVGProps } from 'react';

interface RegenerateIconProps extends SVGProps<SVGSVGElement> {
  size?: string | number;
}

/* eslint-disable react/prop-types */
const RegenerateIcon: React.FC<RegenerateIconProps> = ({
  size = '16px',
  className = '',
  ...props
}) => {
  const numericSize = typeof size === 'string' ? Number.parseFloat(size) : size;

  return (
    <svg
      width={numericSize}
      height={numericSize}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M7.3748 3.376C5.9438 1.40649 3.622 0.125 0.999805 0.125C-3.06995 0.125 -6.41776 3.21156 -6.83213 7.17197L-6.91016 7.91792L-5.41827 8.07398L-5.34024 7.32803C-5.00498 4.12341 -2.29393 1.625 0.999805 1.625C3.28031 1.625 5.28244 2.82274 6.40933 4.625H3.6248V6.125H8.8748V0.875H7.3748V3.376ZM7.41787 7.926L7.33984 8.67197C7.00458 11.8766 4.29353 14.375 0.999805 14.375C-1.28069 14.375 -3.28282 13.1773 -4.40971 11.375H-1.6252V9.875H-6.8752V15.125H-5.3752V12.624C-3.94417 14.5935 -1.62235 15.875 0.999805 15.875C5.06956 15.875 8.41737 12.7884 8.83174 8.82803L8.90977 8.08209L7.41787 7.926Z"
        fill="currentColor"
        transform="translate(7, 0)"
      />
    </svg>
  );
};
/* eslint-enable react/prop-types */

export default RegenerateIcon;
