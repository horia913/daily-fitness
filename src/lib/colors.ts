// Semantic Color Palette for DailyFitness
// Based on top fitness apps design principles

export const semanticColors = {
  // Energy/Action (Start, Active, High Intensity)
  energy: {
    primary: '#FF6B35',
    light: '#FF8A5B',
    dark: '#E55325',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #FF4E50 100%)',
  },
  
  // Trust/Progress (Secondary Actions, Stats)
  trust: {
    primary: '#4A90E2',
    light: '#5CA0F2',
    dark: '#3A7BC8',
    gradient: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
  },
  
  // Success/Achievement (Completed, Goals Met)
  success: {
    primary: '#7CB342',
    light: '#9CCC65',
    dark: '#689F38',
    gradient: 'linear-gradient(135deg, #7CB342 0%, #558B2F 100%)',
  },
  
  // Warning/Intensity (High effort, alerts)
  warning: {
    primary: '#FFA726',
    light: '#FFB74D',
    dark: '#FB8C00',
    gradient: 'linear-gradient(135deg, #FFA726 0%, #FF9800 100%)',
  },
  
  // Critical/Peak (Max effort, urgent)
  critical: {
    primary: '#E53935',
    light: '#EF5350',
    dark: '#C62828',
    gradient: 'linear-gradient(135deg, #E53935 0%, #D32F2F 100%)',
  },
  
  // Neutral/Inactive
  neutral: {
    primary: '#9E9E9E',
    light: '#BDBDBD',
    dark: '#757575',
    gradient: 'linear-gradient(135deg, #9E9E9E 0%, #757575 100%)',
  },
} as const;

// Time-based gradient colors - Palette A: Athletic Blue/Teal
export const timeBasedGradients = {
  morning: {
    light: ['#DBEAFE', '#BFDBFE', '#FED7AA', '#FFEDD5'], // Cool blues → sunrise orange
    dark: ['#0C1821', '#0F2027', '#1E293B', '#1C1917'],
  },
  afternoon: {
    light: ['#BAE6FD', '#A5F3FC', '#99F6E4', '#FEF3C7'], // Bright blue → teal → cream
    dark: ['#0C1821', '#0F2027', '#134E4A', '#1F2937'],
  },
  evening: {
    light: ['#7DD3FC', '#60A5FA', '#FBBF24', '#FDE68A'], // Deep blue → golden hour
    dark: ['#0C4A6E', '#075985', '#92400E', '#78350F'],
  },
  night: {
    light: ['#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1'], // Deep purple/indigo
    dark: ['#1E1B4B', '#312E81', '#3730A3', '#4C1D95'],
  },
} as const;

// Get time-based gradient colors
export function getTimeBasedGradient(isDark: boolean = false): string[] {
  const hour = new Date().getHours();
  const mode = isDark ? 'dark' : 'light';
  
  if (hour >= 5 && hour < 12) {
    return [...timeBasedGradients.morning[mode]] as string[];
  } else if (hour >= 12 && hour < 18) {
    return [...timeBasedGradients.afternoon[mode]] as string[];
  } else if (hour >= 18 && hour < 22) {
    return [...timeBasedGradients.evening[mode]] as string[];
  } else {
    return [...timeBasedGradients.night[mode]] as string[];
  }
}

// Rarity colors for achievements
export const rarityColors = {
  common: {
    color: '#CD7F32',
    gradient: ['#CD7F32', '#8B4513'],
    glow: '#CD7F32',
  },
  uncommon: {
    color: '#C0C0C0',
    gradient: ['#C0C0C0', '#A0A0A0'],
    glow: '#C0C0C0',
  },
  rare: {
    color: '#FFD700',
    gradient: ['#FFD700', '#FFA500'],
    glow: '#FFD700',
  },
  epic: {
    color: '#9B59B6',
    gradient: ['#9B59B6', '#8E44AD'],
    glow: '#9B59B6',
  },
  legendary: {
    color: '#FF1744',
    gradient: ['#FF1744', '#F50057', '#E91E63', '#9C27B0'],
    glow: '#FF1744',
  },
} as const;

// Background system colors
export const backgroundColors = {
  light: {
    primary: '#FFFFFF',
    secondary: '#F5F7FA',
    tertiary: '#EBEBF0',
  },
  dark: {
    primary: '#000000',
    secondary: '#1C1C1E',
    tertiary: '#2C2C2E',
  },
} as const;

