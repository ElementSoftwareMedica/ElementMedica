/**
 * Design System - Button Component (Atom)
 * Week 8 Implementation - Component Library
 */

import React, { forwardRef } from 'react';
import { cn } from '../../utils';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { borderRadius, shadows } from '../../tokens/spacing';

// Button variants
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Loading state */
  loading?: boolean;
  /** Icon before text */
  leftIcon?: React.ReactNode;
  /** Icon after text */
  rightIcon?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  /** Children content */
  children?: React.ReactNode;
}

// Variant styles
const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-blue-600 text-white border-blue-600
    hover:bg-blue-700 hover:border-blue-700
    focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    active:bg-blue-800
    disabled:bg-blue-300 disabled:border-blue-300
  `,
  secondary: `
    bg-gray-100 text-gray-900 border-gray-300
    hover:bg-gray-200 hover:border-gray-400
    focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
    active:bg-gray-300
    disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200
  `,
  outline: `
    bg-transparent text-gray-700 border-gray-300
    hover:bg-gray-50 hover:border-gray-400
    focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    active:bg-gray-100
    disabled:text-gray-400 disabled:border-gray-200
  `,
  ghost: `
    bg-transparent text-gray-700 border-transparent
    hover:bg-gray-100
    focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
    active:bg-gray-200
    disabled:text-gray-400
  `,
  destructive: `
    bg-red-600 text-white border-red-600
    hover:bg-red-700 hover:border-red-700
    focus:ring-2 focus:ring-red-500 focus:ring-offset-2
    active:bg-red-800
    disabled:bg-red-300 disabled:border-red-300
  `,
};

// Size styles
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm font-medium min-h-[32px]',
  md: 'px-4 py-2 text-sm font-medium min-h-[40px]',
  lg: 'px-6 py-3 text-base font-medium min-h-[48px]',
};

// Base button styles
const baseStyles = `
  inline-flex items-center justify-center
  border border-solid
  rounded-full
  font-medium
  transition-all duration-200
  focus:outline-none
  disabled:cursor-not-allowed disabled:opacity-50
  select-none
  whitespace-nowrap
`;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {!loading && leftIcon && (
          <span className="mr-2 flex-shrink-0">{leftIcon}</span>
        )}
        
        {children && (
          <span className={leftIcon || rightIcon ? "flex-1 min-w-0" : "truncate"}>{children}</span>
        )}
        
        {!loading && rightIcon && (
          <span className="ml-2 flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;