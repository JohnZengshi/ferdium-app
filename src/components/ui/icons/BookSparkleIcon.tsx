import type { SVGProps } from 'react';

interface BookSparkleIconProps extends SVGProps<SVGSVGElement> {
  size?: string | number;
}

/* eslint-disable react/prop-types */
const BookSparkleIcon: React.FC<BookSparkleIconProps> = ({
  size = '22px',
  className = '',
  ...props
}) => {
  const numericSize = typeof size === 'string' ? Number.parseFloat(size) : size;
  const width = (numericSize * 29) / 22;

  return (
    <svg
      width={width}
      height={numericSize}
      viewBox="0 0 29 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Open book */}
      <path
        d="M14.5 1.875C15.8337 1.875 17.0782 2.14393 18.0171 2.61328C18.369 2.78932 18.7116 3.01428 18.9985 3.28564C19.0939 3.19485 19.1951 3.11001 19.2996 3.03152L19.8987 2.58026L20.8003 3.77927L20.2004 4.23053C19.8304 4.50877 19.75 4.73978 19.75 4.875V14.3635C19.8269 14.3197 19.9046 14.2774 19.9829 14.2383C20.9218 13.7689 22.1663 13.5 23.5 13.5C24.2986 13.5 25.0636 13.5974 25.75 13.7747V7.5H27.25V15.9807L26.1938 15.5076C25.5101 15.2016 24.566 15 23.5 15C22.3485 15 21.3428 15.2352 20.6531 15.5801C19.919 15.9472 19.7501 16.3158 19.75 16.5H18.25C18.2499 16.3158 18.081 15.9472 17.3469 15.5801C16.6572 15.2352 15.6515 15 14.5 15C13.434 15 12.4899 15.2016 11.8062 15.5076L10.75 15.9807V2.8271C10.8776 2.72939 11.0012 2.62426 11.1375 2.53857C11.27 2.45519 11.5258 2.32013 11.9373 2.19429C12.4866 2.02652 13.3115 1.875 14.5 1.875ZM14.5 3.375C13.4385 3.375 12.7634 3.50977 12.3752 3.62842C12.3293 3.64251 12.2882 3.65903 12.25 3.67236V13.7747C12.9364 13.5974 13.7014 13.5 14.5 13.5C15.8337 13.5 17.0782 13.7689 18.0171 14.2383C18.0954 14.2774 18.1731 14.3197 18.25 14.3635V4.875C18.25 4.69077 18.0812 4.32226 17.3469 3.95508C16.6572 3.61023 15.6515 3.375 14.5 3.375Z"
        fill="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Main sparkle */}
      <path
        d="M25.3992 2.6001L27.677 3.5625L25.3992 4.52422L24.4375 6.80203L23.4751 4.52422L21.198 3.5625L22.8335 2.8718L23.4751 2.6001L23.7468 1.9585L24.4375 0.323047L25.3992 2.6001Z"
        fill="currentColor"
      />
      {/* Small sparkle dot */}
      <circle cx="28.5" cy="1.5" r="1.2" fill="currentColor" />
    </svg>
  );
};
/* eslint-enable react/prop-types */

export default BookSparkleIcon;
