// Mobile utility functions for touch interactions and responsive design

export const isMobile = () => {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
};

export const isTablet = () => {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= 768 && window.innerWidth < 1024;
};

export const isDesktop = () => {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= 1024;
};

export const getTouchClasses = () => {
  return "touch-manipulation select-none";
};

export const getButtonTouchClasses = () => {
  return "touch-manipulation active:scale-95 active:opacity-80 transition-transform duration-75";
};

export const getMobileSpacing = () => {
  return "px-4 sm:px-6 lg:px-8";
};

export const getMobileGrid = (cols: string) => {
  switch (cols) {
    case "2":
      return "grid-cols-1 sm:grid-cols-2";
    case "3":
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    case "4":
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
    default:
      return "grid-cols-1";
  }
};

export const getMobileText = (size: string) => {
  switch (size) {
    case "xs":
      return "text-xs sm:text-sm";
    case "sm":
      return "text-sm sm:text-base";
    case "base":
      return "text-sm sm:text-base lg:text-lg";
    case "lg":
      return "text-base sm:text-lg lg:text-xl";
    case "xl":
      return "text-lg sm:text-xl lg:text-2xl";
    case "2xl":
      return "text-xl sm:text-2xl lg:text-3xl";
    case "3xl":
      return "text-2xl sm:text-3xl lg:text-4xl";
    case "4xl":
      return "text-3xl sm:text-4xl lg:text-5xl";
    default:
      return "text-sm sm:text-base";
  }
};

export const getMobilePadding = (size: string) => {
  switch (size) {
    case "sm":
      return "p-2 sm:p-3 lg:p-4";
    case "md":
      return "p-3 sm:p-4 lg:p-6";
    case "lg":
      return "p-4 sm:p-6 lg:p-8";
    case "xl":
      return "p-6 sm:p-8 lg:p-12";
    default:
      return "p-3 sm:p-4 lg:p-6";
  }
};

export const getMobileMargin = (size: string) => {
  switch (size) {
    case "sm":
      return "m-2 sm:m-3 lg:m-4";
    case "md":
      return "m-3 sm:m-4 lg:m-6";
    case "lg":
      return "m-4 sm:m-6 lg:m-8";
    case "xl":
      return "m-6 sm:m-8 lg:m-12";
    default:
      return "m-3 sm:m-4 lg:m-6";
  }
};

// Touch gesture helpers
export const handleSwipe = (
  element: HTMLElement,
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void
) => {
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches[0]) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (e.changedTouches[0]) {
      endX = e.changedTouches[0].clientX;
      endY = e.changedTouches[0].clientY;
    }

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }
  };

  element.addEventListener("touchstart", handleTouchStart, { passive: true });
  element.addEventListener("touchend", handleTouchEnd, { passive: true });

  return () => {
    element.removeEventListener("touchstart", handleTouchStart);
    element.removeEventListener("touchend", handleTouchEnd);
  };
};

// Mobile-specific animations
export const mobileAnimations = {
  fadeIn: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  },
  slideUp: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: "easeOut" },
  },
  slideIn: {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2 },
  },
};

// Mobile breakpoints
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

export const useBreakpoint = () => {
  if (typeof window === "undefined") return "sm";

  const width = window.innerWidth;
  if (width >= breakpoints["2xl"]) return "2xl";
  if (width >= breakpoints.xl) return "xl";
  if (width >= breakpoints.lg) return "lg";
  if (width >= breakpoints.md) return "md";
  return "sm";
};
