import { useRef } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

const MIN_DISTANCE_PX = 60;
const MAX_VERTICAL_PX = 50;

/**
 * Returns touch handlers that detect horizontal swipes. Vertical swipes
 * (like scrolling) are ignored. Returned object spreads onto a JSX element.
 */
export function useSwipe({ onSwipeLeft, onSwipeRight }: SwipeHandlers) {
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      startX.current = t.clientX;
      startY.current = t.clientY;
      tracking.current = true;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!tracking.current) return;
      tracking.current = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      if (Math.abs(dy) > MAX_VERTICAL_PX) return;
      if (Math.abs(dx) < MIN_DISTANCE_PX) return;
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    },
  };
}
