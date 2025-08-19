/**
 * Design System - Input Component (Atom)
 * Week 8 Implementation - Component Library
 */

import React, { forwardRef } from 'react';
import { cn } from '../../utils';

// Input variants and sizes
export type InputVariant = 'default' | 'filled' | 'outline';
export type InputSize = 'sm' | 'md' | 'lg';
export type InputState = 'default' | 'error' | 'success' | 'disabled';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input variant */
  variant?: InputVariant;
  /** Input size */
  size?: InputSize;
  /** Input state */
  state?: InputState;
  /** Label text */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Error message */
  errorMessage?: string;
  /** Success message */
  successMessage?: string;
  /** Icon before input */
  leftIcon?: React.ReactNode;
  /** Icon after input */
  rightIcon?: React.ReactNode;
  /** Full width input */
  fullWidth?: boolean;
  /** Show required indicator */
  required?: boolean;
}

// Variant styles
const variantStyles: Record<InputVariant, string> = {
  default: `
    border border-gray-300 bg-white
    focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20
  `,
  filled: `
    border border-transparent bg-gray-100
    focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:bg-white
  `,
  outline: `
    border-2 border-gray-300 bg-transparent
    focus:border-blue-500 focus:ring-0
  `,
};

// Size styles
const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-3 py-2 text-sm min-h-[40px]',
  lg: 'px-4 py-3 text-base min-h-[48px]',
};

// State styles
const stateStyles: Record<InputState, string> = {
  default: '',
  error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
  success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
  disabled: 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200',
};

// Base input styles
const baseStyles = `
  w-full
  rounded-full
  font-medium
  transition-all duration-200
  focus:outline-none
  placeholder:text-gray-400
  disabled:cursor-not-allowed disabled:opacity-50
`;

// Label styles
const labelStyles = `
  block text-sm font-medium text-gray-700 mb-1
`;

// Helper text styles
const helperTextStyles = `
  mt-1 text-xs
`;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      size = 'md',
      state = 'default',
      label,
      helperText,
      errorMessage,
      successMessage,
      leftIcon,
      rightIcon,
      fullWidth = true,
      required = false,
      disabled,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const currentState = disabled ? 'disabled' : errorMessage ? 'error' : successMessage ? 'success' : state;
    const hasIcons = leftIcon || rightIcon;

    const inputClasses = cn(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      stateStyles[currentState],
      hasIcons && 'flex items-center',
      leftIcon && 'pl-10',
      rightIcon && 'pr-10',
      !fullWidth && 'w-auto',
      className
    );

    const renderInput = () => (
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{leftIcon}</span>
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{rightIcon}</span>
          </div>
        )}
      </div>
    );

    const renderMessage = () => {
      if (errorMessage) {
        return (
          <p className={cn(helperTextStyles, 'text-red-600')}>
            {errorMessage}
          </p>
        );
      }
      
      if (successMessage) {
        return (
          <p className={cn(helperTextStyles, 'text-green-600')}>
            {successMessage}
          </p>
        );
      }
      
      if (helperText) {
        return (
          <p className={cn(helperTextStyles, 'text-gray-500')}>
            {helperText}
          </p>
        );
      }
      
      return null;
    };

    if (label) {
      return (
        <div className={cn('w-full', !fullWidth && 'w-auto')}>
          <label htmlFor={inputId} className={labelStyles}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {renderInput()}
          {renderMessage()}
        </div>
      );
    }

    return (
      <div className={cn('w-full', !fullWidth && 'w-auto')}>
        {renderInput()}
        {renderMessage()}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;