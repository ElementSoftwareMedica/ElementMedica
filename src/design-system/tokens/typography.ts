/**
 * Design System - Typography Tokens
 * Week 8 Implementation - Component Library
 */

export const typography = {
  // Font Families
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
    serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
  },

  // Font Sizes
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem',  // 72px
    '8xl': '6rem',    // 96px
    '9xl': '8rem',    // 128px
  },

  // Font Weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Line Heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  // Text Styles (Semantic combinations)
  textStyles: {
    // Headings
    h1: {
      fontSize: '3rem',
      fontWeight: '700',
      lineHeight: '1.25',
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2.25rem',
      fontWeight: '600',
      lineHeight: '1.25',
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.875rem',
      fontWeight: '600',
      lineHeight: '1.375',
      letterSpacing: '-0.025em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: '600',
      lineHeight: '1.375',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: '600',
      lineHeight: '1.5',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: '600',
      lineHeight: '1.5',
    },

    // Body Text
    bodyLarge: {
      fontSize: '1.125rem',
      fontWeight: '400',
      lineHeight: '1.625',
    },
    body: {
      fontSize: '1rem',
      fontWeight: '400',
      lineHeight: '1.5',
    },
    bodySmall: {
      fontSize: '0.875rem',
      fontWeight: '400',
      lineHeight: '1.5',
    },

    // UI Text
    label: {
      fontSize: '0.875rem',
      fontWeight: '500',
      lineHeight: '1.25',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: '400',
      lineHeight: '1.25',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: '600',
      lineHeight: '1.25',
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
    },

    // Interactive Elements
    button: {
      fontSize: '0.875rem',
      fontWeight: '500',
      lineHeight: '1.25',
    },
    buttonLarge: {
      fontSize: '1rem',
      fontWeight: '500',
      lineHeight: '1.25',
    },
    buttonSmall: {
      fontSize: '0.75rem',
      fontWeight: '500',
      lineHeight: '1.25',
    },

    // Code
    code: {
      fontSize: '0.875rem',
      fontWeight: '400',
      lineHeight: '1.5',
      fontFamily: ['JetBrains Mono', 'monospace'],
    },
    codeInline: {
      fontSize: '0.875rem',
      fontWeight: '400',
      fontFamily: ['JetBrains Mono', 'monospace'],
    },
  },
} as const;

// Type definitions
export type FontFamily = keyof typeof typography.fontFamily;
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type LineHeight = keyof typeof typography.lineHeight;
export type LetterSpacing = keyof typeof typography.letterSpacing;
export type TextStyle = keyof typeof typography.textStyles;

// Helper function to get typography value
export const getTypography = (token: string): any => {
  const keys = token.split('.');
  let value: any = typography;
  
  for (const key of keys) {
    value = value[key];
    if (value === undefined) {
      console.warn(`Typography token '${token}' not found`);
      return undefined;
    }
  }
  
  return value;
};

// CSS Custom Properties for typography
export const typographyCSSVars = {
  // Font Families
  '--font-sans': typography.fontFamily.sans.join(', '),
  '--font-mono': typography.fontFamily.mono.join(', '),
  '--font-serif': typography.fontFamily.serif.join(', '),
  
  // Font Sizes
  '--text-xs': typography.fontSize.xs,
  '--text-sm': typography.fontSize.sm,
  '--text-base': typography.fontSize.base,
  '--text-lg': typography.fontSize.lg,
  '--text-xl': typography.fontSize.xl,
  '--text-2xl': typography.fontSize['2xl'],
  '--text-3xl': typography.fontSize['3xl'],
  '--text-4xl': typography.fontSize['4xl'],
  
  // Font Weights
  '--font-light': typography.fontWeight.light,
  '--font-normal': typography.fontWeight.normal,
  '--font-medium': typography.fontWeight.medium,
  '--font-semibold': typography.fontWeight.semibold,
  '--font-bold': typography.fontWeight.bold,
  
  // Line Heights
  '--leading-tight': typography.lineHeight.tight,
  '--leading-normal': typography.lineHeight.normal,
  '--leading-relaxed': typography.lineHeight.relaxed,
} as const;

// Utility function to apply text style
export const applyTextStyle = (style: TextStyle) => {
  const textStyle = typography.textStyles[style];
  if (!textStyle) {
    console.warn(`Text style '${style}' not found`);
    return {};
  }
  return textStyle;
};