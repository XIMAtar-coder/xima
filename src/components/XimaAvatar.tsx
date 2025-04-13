
import React from 'react';
import { Avatar } from '../types';

interface XimaAvatarProps {
  avatar: Avatar;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const XimaAvatar: React.FC<XimaAvatarProps> = ({ 
  avatar, 
  size = 'md',
  showDetails = false 
}) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-48 h-48'
  };

  return (
    <div className={`flex flex-col items-center ${showDetails ? 'space-y-4' : ''}`}>
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-4 border-xima-purple bg-white flex items-center justify-center`}>
        <img 
          src={avatar.image || "/placeholder.svg"} 
          alt={`${avatar.animal} Avatar`} 
          className="w-full h-full object-cover"
        />
      </div>
      
      {showDetails && (
        <div className="text-center">
          <h3 className="text-lg font-medium">{avatar.animal}</h3>
          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Key Features:</h4>
            {avatar.features.map((feature, index) => (
              <div key={index} className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{feature.name}</span>
                  <span className="text-xima-purple">{feature.strength}/10</span>
                </div>
                <p className="text-xs text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default XimaAvatar;
