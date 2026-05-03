import React from 'react';

interface LogoProps {
  variant?: 'full' | 'symbol';
  /** Force a color variant. If omitted, uses the dark logo (works on light backgrounds). */
  tone?: 'dark' | 'white';
  className?: string;
  alt?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  tone = 'dark',
  className = '',
  alt = 'XIMA',
}) => {
  const file =
    variant === 'symbol'
      ? tone === 'white'
        ? '/images/xima-symbol-white.svg'
        : '/images/xima-symbol-dark.svg'
      : tone === 'white'
        ? '/images/xima-full-white.svg'
        : '/images/xima-full-dark.svg';

  return <img src={file} alt={alt} className={className} />;
};

export default Logo;
