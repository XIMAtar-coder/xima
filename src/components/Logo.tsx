import logoFull from '@/assets/logo_full.png';
import symbolImg from '@/assets/symbol.png';

interface LogoProps {
  variant?: 'full' | 'symbol';
  className?: string;
  alt?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  variant = 'full', 
  className = '', 
  alt = 'XIMA Logo' 
}) => {
  const src = variant === 'full' ? logoFull : symbolImg;
  
  return (
    <img 
      src={src}
      alt={alt}
      className={className}
    />
  );
};
