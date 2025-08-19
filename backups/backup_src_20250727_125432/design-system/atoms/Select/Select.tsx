/**
 * Design System - Select Component (Atom)
 * Week 8 Implementation - Component Library
 */

import React from 'react';
import { cn } from '../../utils';

export type SelectSize = 'sm' | 'md' | 'lg';
export type SelectVariant = 'default' | 'outlined' | 'filled';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Select options */
  options?: SelectOption[];
  /** Select size */
  size?: SelectSize;
  /** Select variant */
  variant?: SelectVariant;
  /** Error state */
  error?: boolean;
  /** Custom className */
  className?: string;
  /** Placeholder option */
  placeholder?: string;
}

// Size styles
const sizeStyles: Record<SelectSize, string> = {
  sm: 'h-8 px-2 text-sm',
  md: 'h-10 px-3 text-base',
  lg: 'h-12 px-4 text-lg'
};

// Variant styles
const variantStyles: Record<SelectVariant, string> = {
  default: 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500',
  outlined: 'border-2 border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500',
  filled: 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-blue-500 focus:bg-white'
};

/**
 * Select component - Accessible dropdown select with consistent styling
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>((
  {
    options = [],
    size = 'md',
    variant = 'default',
    error = false,
    className,
    placeholder,
    children,
    ...props
  },
  ref
) => {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-md border transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'appearance-none bg-no-repeat bg-right',
        'bg-[url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e")] pr-8',
        sizeStyles[size],
        error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : variantStyles[variant],
        className
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
      {children}
    </select>
  );
});

Select.displayName = 'Select';

export default Select;