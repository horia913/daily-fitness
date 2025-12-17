// Typography scale system
// Based on top fitness apps typography principles

export const typography = {
  // Font sizes
  size: {
    hero: '3rem', // 48px - Main metrics
    heroLg: '4rem', // 64px - Extra large metrics
    h1: '2rem', // 32px
    h2: '1.5rem', // 24px
    h3: '1.25rem', // 20px
    body: '1rem', // 16px
    bodyLg: '1.0625rem', // 17px
    caption: '0.875rem', // 14px
    label: '0.8125rem', // 13px
    small: '0.75rem', // 12px
  },
  
  // Font weights
  weight: {
    heavy: 800,
    bold: 700,
    semibold: 600,
    medium: 500,
    regular: 400,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Font stacks
  fontFamily: {
    // SF Pro for numbers (rounded, friendly)
    number: '-apple-system, BlinkMacSystemFont, "SF Pro Rounded", system-ui, sans-serif',
    // SF Pro Text for body copy
    body: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
    // Monospace for technical data
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
  },
} as const;

// Typography utility classes generator
export function getTypographyClass(
  variant: 'hero' | 'heroLg' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyLg' | 'caption' | 'label' | 'small',
  weight: 'heavy' | 'bold' | 'semibold' | 'medium' | 'regular' = 'regular'
): string {
  return `text-${variant} font-${weight}`;
}

// Get inline styles for typography
export function getTypographyStyles(
  variant: 'hero' | 'heroLg' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyLg' | 'caption' | 'label' | 'small',
  weight: 'heavy' | 'bold' | 'semibold' | 'medium' | 'regular' = 'regular',
  isNumber: boolean = false
): React.CSSProperties {
  return {
    fontSize: typography.size[variant],
    fontWeight: typography.weight[weight],
    fontFamily: isNumber ? typography.fontFamily.number : typography.fontFamily.body,
    lineHeight: variant.startsWith('h') || variant.includes('hero') 
      ? typography.lineHeight.tight 
      : typography.lineHeight.normal,
  };
}

// Typography scale for hero numbers with context labels
export function getHeroNumberWithLabel(
  numberSize: 'hero' | 'heroLg' = 'hero'
): {
  number: React.CSSProperties;
  label: React.CSSProperties;
} {
  return {
    number: {
      fontSize: typography.size[numberSize],
      fontWeight: typography.weight.heavy,
      fontFamily: typography.fontFamily.number,
      lineHeight: typography.lineHeight.tight,
    },
    label: {
      fontSize: typography.size.label,
      fontWeight: typography.weight.medium,
      fontFamily: typography.fontFamily.body,
      lineHeight: typography.lineHeight.normal,
      opacity: 0.6,
    },
  };
}

