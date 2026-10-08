import { useState, useEffect } from 'react';

export interface ResponsiveState {
  isMobile: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  screenWidth: number;
  screenHeight: number;
}

/**
 * Universal Responsive & Platform Detection Hook for US Stock AI Scanner & Alert
 * Accurately detects Android Capacitor runtime, Android UserAgent, and mobile screen breakpoints.
 */
export function useResponsive(): ResponsiveState {
  const checkPlatform = (): ResponsiveState => {
    const isClient = typeof window !== 'undefined';
    if (!isClient) {
      return {
        isMobile: false,
        isAndroid: false,
        isDesktop: true,
        orientation: 'landscape',
        screenWidth: 1360,
        screenHeight: 860
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    const capacitorPlatform = (window as any).Capacitor?.getPlatform?.();
    const isCapacitorAndroid = capacitorPlatform === 'android';
    const isAndroidUA = /Android/i.test(navigator.userAgent);
    const isAndroid = isCapacitorAndroid || isAndroidUA;

    const isMobileBreakpoint = width < 768;
    const isMobile = isAndroid || isMobileBreakpoint;
    const isDesktop = !isMobile;
    const orientation: 'portrait' | 'landscape' = height > width ? 'portrait' : 'landscape';

    return {
      isMobile,
      isAndroid,
      isDesktop,
      orientation,
      screenWidth: width,
      screenHeight: height
    };
  };

  const [state, setState] = useState<ResponsiveState>(checkPlatform);

  useEffect(() => {
    const handleResize = () => {
      setState(checkPlatform());
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return state;
}
