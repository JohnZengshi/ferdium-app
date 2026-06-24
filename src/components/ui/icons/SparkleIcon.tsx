import type { SVGProps } from 'react';

interface SparkleIconProps extends SVGProps<SVGSVGElement> {
  size?: string | number;
}

/* eslint-disable react/prop-types */
const SparkleIcon: React.FC<SparkleIconProps> = ({
  size = '16px',
  className = '',
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M8 0L9.09017 5.81983L15 8L9.09017 10.1802L8 16L6.90983 10.1802L1 8L6.90983 5.81983L8 0Z"
        fill="currentColor"
      />
    </svg>
  );
};
/* eslint-enable react/prop-types */

export default SparkleIcon;
