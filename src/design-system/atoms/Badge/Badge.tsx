/**
 * Design System - Badge Component (Atom)
 * GDPR Entity Page Implementation
 */

import React from 'react';
import { cn } from '../../utils';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';
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

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-primary-600 text-white',
  secondary: 'bg-gray-100 text-gray-800',
  outline: 'border border-gray-300 bg-transparent text-gray-700',
  destructive: 'bg-red-600 text-white'
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