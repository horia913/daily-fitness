// Animation configurations for consistent motion design
// Based on top fitness apps animation principles

export const animationConfig = {
  // Duration presets
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  // Easing functions
  easing: {
    // Custom bezier for page transitions
    momentum: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    // Standard easings
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    // Spring-like easing
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  
  // Scale values
  scale: {
    press: 0.94,
    hover: 1.02,
    normal: 1.0,
  },
  
  // Transition timings
  transition: {
    button: {
      press: 'transform 60ms cubic-bezier(0.0, 0.0, 0.2, 1)',
      release: 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    card: {
      hover: 'all 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      press: 'all 200ms cubic-bezier(0.0, 0.0, 0.2, 1)',
    },
    page: {
      enter: 'all 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      exit: 'all 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
  },
} as const;

// Number animation config
export const numberAnimationConfig = {
  getDuration: (value: number) => {
    // Base duration on magnitude
    if (value < 10) return 800;
    if (value < 100) return 1000;
    return 1200;
  },
  easing: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
};

// Skeleton shimmer animation
export const skeletonAnimation = {
  duration: 1400, // ms
  angle: -20, // degrees
  keyframes: `
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `,
};

// Particle float animation
export const particleAnimation = {
  duration: (min: number = 20000, max: number = 40000) => 
    Math.random() * (max - min) + min,
  keyframes: `
    @keyframes float {
      0% {
        transform: translateY(100vh) translateX(0);
        opacity: 0;
      }
      10% {
        opacity: 0.3;
      }
      90% {
        opacity: 0.3;
      }
      100% {
        transform: translateY(-10vh) translateX(10vw);
        opacity: 0;
      }
    }
  `,
};

// Pulsing glow animation for streaks/highlights
export const pulseAnimation = {
  duration: 2000,
  keyframes: `
    @keyframes pulse {
      0%, 100% {
        opacity: 0.3;
        transform: scale(1);
      }
      50% {
        opacity: 0.6;
        transform: scale(1.02);
      }
    }
  `,
};

// Confetti/celebration animation
export const celebrationAnimation = {
  duration: 2000,
  keyframes: `
    @keyframes celebrate {
      0% {
        transform: translateY(0) scale(0);
        opacity: 0;
      }
      50% {
        transform: translateY(-50px) scale(1.2);
        opacity: 1;
      }
      100% {
        transform: translateY(-100px) scale(1);
        opacity: 0;
      }
    }
  `,
};

// Gradient shift animation for background
export const gradientShiftAnimation = {
  duration: 10000,
  keyframes: `
    @keyframes gradientShift {
      0%, 100% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 0% 100%;
      }
    }
  `,
};

// Stagger animation helper
export function getStaggerDelay(index: number, baseDelay: number = 100): number {
  return index * baseDelay;
}

// Spring animation parameters for React Spring
export const springConfig = {
  default: { tension: 170, friction: 26 },
  gentle: { tension: 120, friction: 14 },
  wobbly: { tension: 180, friction: 12 },
  stiff: { tension: 210, friction: 20 },
  slow: { tension: 280, friction: 60 },
  molasses: { tension: 280, friction: 120 },
};

