import { useState, useEffect, useCallback } from 'react';
import { useResponsive } from './useResponsive.ts';

export function useAndroidGestureExit() {
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const { isAndroid, isMobile } = useResponsive();

  const openExitModal = useCallback(() => {
    setIsExitModalOpen(true);
  }, []);

  const closeExitModal = useCallback(() => {
    setIsExitModalOpen(false);
  }, []);

  useEffect(() => {
    // Only active on Android or Mobile touch environments
    if (!isAndroid && !isMobile) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const duration = Date.now() - touchStartTime;

        // 1. Android 系统边缘侧滑手势 (左边缘右划、右边缘左划)
        const isLeftEdgeInward = touchStartX <= 40 && deltaX > 50;
        const isRightEdgeInward = touchStartX >= window.innerWidth - 40 && deltaX < -50;

        // 2. 屏幕水平方向短暂快滑手势 (左滑/右滑且垂直偏移小)
        const isQuickHorizontalFlick = Math.abs(deltaX) > 110 && Math.abs(deltaY) < 45 && duration < 320;

        if ((isLeftEdgeInward || isRightEdgeInward || isQuickHorizontalFlick) && Math.abs(deltaY) < 65) {
          setIsExitModalOpen(true);
        }
      }
    };

    // 3. 监听 Capacitor / 原生广播派发的返回手势事件
    const handleNativeGestureEvent = () => {
      setIsExitModalOpen(true);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('androidExitGesture', handleNativeGestureEvent);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('androidExitGesture', handleNativeGestureEvent);
    };
  }, [isAndroid, isMobile]);

  return {
    isExitModalOpen,
    openExitModal,
    closeExitModal
  };
}
