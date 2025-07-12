import React from 'react';
import { useTranslation } from 'react-i18next';
import { XIMAtar } from '@/types/ximatar';

interface XimatarDisplayProps {
  ximatar: XIMAtar;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const XimatarDisplay: React.FC<XimatarDisplayProps> = ({ 
  ximatar, 
  showDescription = true, 
  size = 'md' 
}) => {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'it';
  
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
    <div className="flex flex-col items-center text-center space-y-2">
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-primary/20`}>
        <img 
          src={ximatar.image} 
          alt={ximatar.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div>
        <h3 className="font-semibold text-lg">{ximatar.title}</h3>
        <p className="text-sm text-muted-foreground">{ximatar.animal}</p>
        {showDescription && (
          <p className="text-sm mt-2 max-w-xs">
            {ximatar.personality[lang].description}
          </p>
        )}
      </div>
    </div>
  );
};