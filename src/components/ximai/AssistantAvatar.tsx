import React from "react";
import SparkIcon from "./SparkIcon";

interface AssistantAvatarProps {
  size?: number; 
  className?: string;
  isActive?: boolean;
  isThinking?: boolean;
}

export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({ 
  size = 40, 
  className,
  isActive = false,
  isThinking = false
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className || ''}`}>
      <div 
        className={`
          rounded-full bg-background border border-border/20 
          flex items-center justify-center
          ${isActive ? 'animate-pulse-gentle' : ''}
          transition-all duration-150
        `}
        style={{ width: size, height: size }}
      >
        <SparkIcon 
          size={size * 0.6} 
          isActive={isActive || isThinking}
          className="transition-all duration-150"
        />
      </div>
      
      {/* Thinking state indicator */}
      {isThinking && (
        <div className="absolute -bottom-1 -right-1 flex space-x-0.5">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dots" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dots" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-typing-dots" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
};

export default AssistantAvatar;
