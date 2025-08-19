/**
 * Design System - Typography Component (Atom)
 * Week 8 Implementation - Component Library
 */

import React from 'react';
import { cn } from '../../utils';
import { typography } from '../../tokens/typography';

export type TypographyVariant = 
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'body1' | 'body2' | 'caption' | 'overline'
  | 'subtitle1' | 'subtitle2';

export type TypographySize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type TypographyWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
export type TypographyAlign = 'left' | 'center' | 'right' | 'justify';
export type TypographyColor = 'primary' | 'secondary' | 'muted' | 'error' | 'warning' | 'success' | 'inherit';

export interface TypographyProps {
  /** Typography variant */
  variant?: TypographyVariant;
  /** Typography size override */
  size?: TypographySize;
  /** Font weight */
  weight?: TypographyWeight;
  /** Text alignment */
  align?: TypographyAlign;
  /** Text color */
  color?: TypographyColor;
  /** HTML element to render */
  as?: keyof JSX.IntrinsicElements;
  /** Truncate text with ellipsis */
  truncate?: boolean;
  /** Number of lines to show before truncating */
  lineClamp?: number;
  /** Custom className */
  className?: string;
  /** Children content */
  children: React.ReactNode;
}

// Variant to element mapping
const variantElementMap: Record<TypographyVariant, keyof JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  subtitle1: 'h6',
  subtitle2: 'h6',
  body1: 'p',
  body2: 'p',
  caption: 'span',
  overline: 'span'
};

// Variant styles mapping
const variantStyles: Record<TypographyVariant, string> = {
  h1: 'text-4xl font-bold leading-tight tracking-tight',
  h2: 'text-3xl font-bold leading-tight tracking-tight',
  h3: 'text-2xl font-semibold leading-tight',
  h4: 'text-xl font-semibold leading-tight',
  h5: 'text-lg font-medium leading-tight',
  h6: 'text-base font-medium leading-tight',
  subtitle1: 'text-lg font-normal leading-normal',
  subtitle2: 'text-base font-normal leading-normal',
  body1: 'text-base font-normal leading-relaxed',
  body2: 'text-sm font-normal leading-relaxed',
  caption: 'text-xs font-normal leading-normal',
  overline: 'text-xs font-medium leading-normal uppercase tracking-wide'
};

// Size styles
const sizeStyles: Record<TypographySize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl'
};

// Weight styles
const weightStyles: Record<TypographyWeight, string> = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold'
};

// Alignment styles
const alignStyles: Record<TypographyAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify'
};

// Color styles
const colorStyles: Record<TypographyColor, string> = {
  primary: 'text-gray-900',
  secondary: 'text-gray-600',
  muted: 'text-gray-500',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  success: 'text-green-600',
  inherit: 'text-inherit'
};

// Line clamp styles
const lineClampStyles: Record<number, string> = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
  6: 'line-clamp-6'
};

/**
 * Typography component - Consistent text styling across the application
 */
export const Typography: React.FC<TypographyProps> = ({
  variant = 'body1',
  size,
  weight,
  align = 'left',
  color = 'primary',
  as,
  truncate = false,
  lineClamp,
  className,
  children,
  ...props
}) => {
  // Determine the HTML element to render
  const Component = as || variantElementMap[variant];

  // Build className
  const classes = cn(
    // Base variant styles
    variantStyles[variant],
    
    // Size override
    size && sizeStyles[size],
    
    // Weight override
    weight && weightStyles[weight],
    
    // Alignment
    alignStyles[align],
    
    // Color
    colorStyles[color],
    
    // Truncation
    truncate && 'truncate',
    
    // Line clamp
    lineClamp && lineClampStyles[lineClamp],
    
    // Custom className
    className
  );

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
};

// Convenience components for common use cases
export const Heading1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h1" {...props} />
);

export const Heading2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h2" {...props} />
);

export const Heading3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h3" {...props} />
);

export const Heading4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h4" {...props} />
);

export const Heading5: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h5" {...props} />
);

export const Heading6: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h6" {...props} />
);

export const Subtitle1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="subtitle1" {...props} />
);

export const Subtitle2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="subtitle2" {...props} />
);

export const Body1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body1" {...props} />
);

export const Body2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body2" {...props} />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
);

export const Overline: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="overline" {...props} />
);

export default Typography;