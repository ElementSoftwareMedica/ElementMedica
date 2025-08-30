/**
 * Design System - Spacing & Sizing Tokens
 * Week 8 Implementation - Component Library
 */

export const spacing = {
  // Base spacing scale (rem units)
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// Semantic spacing tokens
export const semanticSpacing = {
  // Component spacing
  component: {
    xs: spacing[1],     // 4px
    sm: spacing[2],     // 8px
    md: spacing[4],     // 16px
    lg: spacing[6],     // 24px
    xl: spacing[8],     // 32px
    '2xl': spacing[12], // 48px
  },

  // Layout spacing
  layout: {
    xs: spacing[4],     // 16px
    sm: spacing[6],     // 24px
    md: spacing[8],     // 32px
    lg: spacing[12],    // 48px
    xl: spacing[16],    // 64px
    '2xl': spacing[24], // 96px
    '3xl': spacing[32], // 128px
  },

  // Container spacing
  container: {
    xs: spacing[4],     // 16px
    sm: spacing[6],     // 24px
    md: spacing[8],     // 32px
    lg: spacing[12],    // 48px
    xl: spacing[16],    // 64px
  },

  // Section spacing
  section: {
    xs: spacing[8],     // 32px
    sm: spacing[12],    // 48px
    md: spacing[16],    // 64px
    lg: spacing[24],    // 96px
    xl: spacing[32],    // 128px
  },
} as const;

// Sizing tokens
export const sizing = {
  // Width/Height scale
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',

  // Fractional sizes
  '1/2': '50%',
  '1/3': '33.333333%',
  '2/3': '66.666667%',
  '1/4': '25%',
  '2/4': '50%',
  '3/4': '75%',
  '1/5': '20%',
  '2/5': '40%',
  '3/5': '60%',
  '4/5': '80%',
  '1/6': '16.666667%',
  '2/6': '33.333333%',
  '3/6': '50%',
  '4/6': '66.666667%',
  '5/6': '83.333333%',
  '1/12': '8.333333%',
  '2/12': '16.666667%',
  '3/12': '25%',
  '4/12': '33.333333%',
  '5/12': '41.666667%',
  '6/12': '50%',
  '7/12': '58.333333%',
  '8/12': '66.666667%',
  '9/12': '75%',
  '10/12': '83.333333%',
  '11/12': '91.666667%',

  // Special sizes
  auto: 'auto',
  full: '100%',
  screen: '100vh',
  min: 'min-content',
  max: 'max-content',
  fit: 'fit-content',
} as const;

// Border radius tokens
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// Shadow tokens
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

// Z-index tokens
export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  modal: '1040',
  popover: '1050',
  tooltip: '1060',
  toast: '1070',
} as const;

// Type definitions
export type Spacing = keyof typeof spacing;
export type SemanticSpacing = keyof typeof semanticSpacing.component;
export type Sizing = keyof typeof sizing;
export type BorderRadius = keyof typeof borderRadius;
export type Shadow = keyof typeof shadows;
export type ZIndex = keyof typeof zIndex;

// Helper functions
export const getSpacing = (token: Spacing): string => {
  return spacing[token] || '0';
};

export const getSizing = (token: Sizing): string => {
  return sizing[token] || 'auto';
};

export const getBorderRadius = (token: BorderRadius): string => {
  return borderRadius[token] || '0';
};

export const getShadow = (token: Shadow): string => {
  return shadows[token] || 'none';
};

// CSS Custom Properties
export const spacingCSSVars = {
  // Spacing
  '--spacing-xs': semanticSpacing.component.xs,
  '--spacing-sm': semanticSpacing.component.sm,
  '--spacing-md': semanticSpacing.component.md,
  '--spacing-lg': semanticSpacing.component.lg,
  '--spacing-xl': semanticSpacing.component.xl,
  
  // Layout
  '--layout-xs': semanticSpacing.layout.xs,
  '--layout-sm': semanticSpacing.layout.sm,
  '--layout-md': semanticSpacing.layout.md,
  '--layout-lg': semanticSpacing.layout.lg,
  '--layout-xl': semanticSpacing.layout.xl,
  
  // Border Radius
  '--radius-sm': borderRadius.sm,
  '--radius-base': borderRadius.base,
  '--radius-md': borderRadius.md,
  '--radius-lg': borderRadius.lg,
  '--radius-xl': borderRadius.xl,
  
  // Shadows
  '--shadow-sm': shadows.sm,
  '--shadow-base': shadows.base,
  '--shadow-md': shadows.md,
  '--shadow-lg': shadows.lg,
  '--shadow-xl': shadows.xl,
} as const;