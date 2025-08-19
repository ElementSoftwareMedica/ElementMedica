import React from 'react';
import { cn } from '../../design-system/utils';

/**
 * Loading fallback component for lazy-loaded routes and components
 * Week 11 Implementation - Lazy Loading Optimization
 */

interface LoadingFallbackProps {
  className?: string;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12'
};

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  className,
  message = 'Loading...',
  size = 'md'
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[200px] space-y-4',
      className
    )}>
      {/* Spinner */}
      <div className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size]
      )} />
      
      {/* Loading message */}
      <p className="text-sm text-gray-600 animate-pulse">
        {message}
      </p>
    </div>
  );
};

/**
 * Skeleton loader for specific content types
 */
export const SkeletonLoader: React.FC<{ type?: 'table' | 'card' | 'form' }> = ({ 
  type = 'card' 
}) => {
  if (type === 'table') {
    return (
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-20 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  // Default card skeleton
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="h-6 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
    </div>
  );
};

export default LoadingFallback;