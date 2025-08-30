import React, { Suspense } from 'react';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { LoadingFallback } from '../components/ui/LoadingFallback';

/**
 * Lazy-loaded Quotes and Invoices page
 * Week 11 Implementation - Lazy Loading Optimization
 */

const QuotesAndInvoices = React.lazy(() => import('./QuotesAndInvoices'));

export const QuotesAndInvoicesLazy: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Loading Quotes & Invoices..." />}>
        <QuotesAndInvoices />
      </Suspense>
    </ErrorBoundary>
  );
};

export default QuotesAndInvoicesLazy;