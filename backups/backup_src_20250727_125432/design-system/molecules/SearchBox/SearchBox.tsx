/**
 * Design System - SearchBox Component (Molecule)
 * Week 8 Implementation - Component Library
 */

import React, { forwardRef, useState } from 'react';
import { cn } from '../../utils';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface SearchBoxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Search box size */
  size?: 'sm' | 'md' | 'lg';
  /** Show clear button when there's text */
  clearable?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Callback when clear button is clicked */
  onClear?: () => void;
  /** Callback when search is performed */
  onSearch?: (value: string) => void;
  /** Container class name */
  containerClassName?: string;
}

// Size styles
const sizeStyles = {
  sm: {
    container: 'h-8',
    input: 'text-sm px-8 py-1.5',
    icon: 'w-4 h-4',
    iconLeft: 'left-2.5',
    iconRight: 'right-2.5',
  },
  md: {
    container: 'h-10',
    input: 'text-sm px-10 py-2.5',
    icon: 'w-5 h-5',
    iconLeft: 'left-3',
    iconRight: 'right-3',
  },
  lg: {
    container: 'h-12',
    input: 'text-base px-12 py-3',
    icon: 'w-6 h-6',
    iconLeft: 'left-3.5',
    iconRight: 'right-3.5',
  },
};

export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(
  (
    {
      size = 'md',
      clearable = true,
      loading = false,
      onClear,
      onSearch,
      containerClassName,
      className,
      value,
      onChange,
      onKeyDown,
      placeholder = 'Cerca...',
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value || '');
    const currentValue = value !== undefined ? value : internalValue;
    const hasValue = Boolean(currentValue);
    const styles = sizeStyles[size];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onChange?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onSearch?.(currentValue as string);
      }
      onKeyDown?.(e);
    };

    const handleClear = () => {
      if (value === undefined) {
        setInternalValue('');
      }
      onClear?.();
      
      // Create synthetic event for onChange
      const syntheticEvent = {
        target: { value: '' },
        currentTarget: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(syntheticEvent);
    };

    return (
      <div className={cn('relative', styles.container, containerClassName)}>
        {/* Search Icon */}
        <MagnifyingGlassIcon
          className={cn(
            'absolute top-1/2 transform -translate-y-1/2 text-gray-400',
            styles.icon,
            styles.iconLeft
          )}
        />

        {/* Input */}
        <input
          ref={ref}
          type="text"
          value={currentValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            // Base styles
            'w-full rounded-full border border-gray-300',
            'bg-white text-gray-900 placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'transition-all duration-200',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            // Size styles
            styles.input,
            className
          )}
          {...props}
        />

        {/* Clear Button or Loading Spinner */}
        {loading ? (
          <div
            className={cn(
              'absolute top-1/2 transform -translate-y-1/2',
              styles.iconRight
            )}
          >
            <svg
              className={cn('animate-spin text-gray-400', styles.icon)}
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
          </div>
        ) : (
          clearable &&
          hasValue && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                'absolute top-1/2 transform -translate-y-1/2',
                'text-gray-400 hover:text-gray-600',
                'focus:outline-none focus:text-gray-600',
                'transition-colors duration-200',
                styles.iconRight
              )}
              aria-label="Cancella ricerca"
            >
              <XMarkIcon className={styles.icon} />
            </button>
          )
        )}
      </div>
    );
  }
);

SearchBox.displayName = 'SearchBox';

export default SearchBox;