import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

function getDeviceType(width: number): DeviceType {
  if (width < 768) return 'mobile';
  if (width < 1280) return 'tablet';
  return 'desktop';
}

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(() =>
    typeof window !== 'undefined' ? getDeviceType(window.innerWidth) : 'desktop'
  );

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDeviceType(getDeviceType(window.innerWidth));
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return deviceType;
}
