import { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface LoadingScreenProps {
  isLoading?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading = true }) => {
  const [show, setShow] = useState(isLoading);

  useEffect(() => {
    if (!isLoading) {
      // Fade out after a short delay
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    } else {
      setShow(true);
    }
  }, [isLoading]);

  if (!show) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-300 ${
        isLoading ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Gradient background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/10 via-accent/5 to-transparent blur-3xl animate-pulse" />
      </div>

      {/* Logo container */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="animate-[scale-in_0.6s_ease-out,pulse_2s_ease-in-out_infinite_0.6s]">
          <Logo 
            variant="symbol" 
            className="w-24 h-24 md:w-32 md:h-32 drop-shadow-2xl"
            alt="XIMA Loading"
          />
        </div>
        
        {/* Loading dots */}
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-[pulse_1.4s_ease-in-out_infinite]" />
          <div className="w-2 h-2 rounded-full bg-primary animate-[pulse_1.4s_ease-in-out_infinite_0.2s]" />
          <div className="w-2 h-2 rounded-full bg-primary animate-[pulse_1.4s_ease-in-out_infinite_0.4s]" />
        </div>
      </div>
    </div>
  );
};
