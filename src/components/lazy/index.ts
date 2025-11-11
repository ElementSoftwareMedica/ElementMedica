/**
 * Lazy Components Index
 * Week 11 Implementation - Component Lazy Loading
 */

export { LazyCalendar } from './LazyCalendar';
// Charts removed - now using Recharts directly (Phase 4 optimization)
// export { LazyChart, LazyLineChart, LazyBarChart, LazyPieChart, LazyDoughnutChart } from './LazyChart';

// Re-export utility components
export { LoadingFallback, SkeletonLoader } from '../ui/LoadingFallback';
export { ErrorBoundary, withErrorBoundary } from '../ui/ErrorBoundary';
export { LazyRoute, createLazyRoute, preloadRoute } from '../../router/LazyRoute';