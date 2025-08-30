/**
 * Design System - Label Component (Atom)
 * Week 8 Implementation - Component Library
 */

import React from 'react';
import { cn } from '../../utils';

export type LabelSize = 'sm' | 'md' | 'lg';
export type LabelVariant = 'default' | 'required' | 'optional';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Label text */
  children: React.ReactNode;
  /** Label size */
  size?: LabelSize;
  /** Label variant */
  variant?: LabelVariant;
  /** Show required asterisk */
  required?: boolean;
  /** Custom className */
  className?: string;
}

// Size styles
const sizeStyles: Record<LabelSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
};

// Variant styles
const variantStyles: Record<LabelVariant, string> = {
  default: 'text-gray-700 font-medium',
  required: 'text-gray-700 font-medium',
  optional: 'text-gray-600 font-normal'
};

/**
 * Label component - Accessible form label with consistent styling
 */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>((
  {
    children,
    size = 'md',
    variant = 'default',
    required = false,
    className,
    ...props
  },
  ref
) => {
  return (
    <label
      ref={ref}
      className={cn(
        'block',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-red-500 ml-1" aria-label="required">
          *
        </span>
      )}
    </label>
  );
});

Label.displayName = 'Label';

export default Label;