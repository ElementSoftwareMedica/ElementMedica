/**
 * Design System - Badge Component (Atom)
 * GDPR Entity Page Implementation
 */

import React from 'react';
import { cn } from '../../utils';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info' | 'error';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Badge variant */
  variant?: BadgeVariant;
  /** Badge size */
  size?: BadgeSize;
  /** Badge content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
}

// Badge variants with dark mode support
const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-primary-600 text-white dark:bg-primary-500',
  secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  outline: 'border border-gray-300 bg-transparent text-gray-700 dark:border-gray-600 dark:text-gray-300',
  destructive: 'bg-red-600 text-white dark:bg-red-700',
  success: 'bg-green-600 text-white dark:bg-green-700',
  warning: 'bg-yellow-500 text-white dark:bg-yellow-600',
  info: 'bg-blue-600 text-white dark:bg-blue-700',
  error: 'bg-red-600 text-white dark:bg-red-700'
};

const badgeSizes: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base'
};

/**
 * Badge component for displaying status, counts, or labels
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        badgeVariants[variant],
        badgeSizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;