import React, { Suspense } from 'react';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { LoadingFallback } from '../ui/LoadingFallback';

/**
 * Lazy-loaded Calendar component
 * Week 11 Implementation - Component Lazy Loading
 */

// Lazy load the FullCalendar component
const FullCalendar = React.lazy(() => import('@fullcalendar/react'));

interface LazyCalendarProps {
  [key: string]: any;
}

export const LazyCalendar: React.FC<LazyCalendarProps> = (props) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="h-96 flex items-center justify-center border rounded-lg">
          <LoadingFallback message="Loading Calendar..." size="lg" />
        </div>
      }>
        <FullCalendar {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyCalendar;