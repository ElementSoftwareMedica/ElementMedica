import React, { Suspense } from 'react';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { LoadingFallback } from '../ui/LoadingFallback';

/**
 * Lazy-loaded Chart components
 * Week 11 Implementation - Component Lazy Loading
 */

// Lazy load Chart.js components
const Line = React.lazy(() => import('react-chartjs-2').then(module => ({ default: module.Line })));
const Bar = React.lazy(() => import('react-chartjs-2').then(module => ({ default: module.Bar })));
const Pie = React.lazy(() => import('react-chartjs-2').then(module => ({ default: module.Pie })));
const Doughnut = React.lazy(() => import('react-chartjs-2').then(module => ({ default: module.Doughnut })));

interface LazyChartProps {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  [key: string]: any;
}

const ChartFallback = () => (
  <div className="h-64 flex items-center justify-center border rounded-lg bg-gray-50">
    <LoadingFallback message="Loading Chart..." size="lg" />
  </div>
);

export const LazyChart: React.FC<LazyChartProps> = ({ type, ...props }) => {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return <Line {...props} />;
      case 'bar':
        return <Bar {...props} />;
      case 'pie':
        return <Pie {...props} />;
      case 'doughnut':
        return <Doughnut {...props} />;
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={<ChartFallback />}>
        {renderChart()}
      </Suspense>
    </ErrorBoundary>
  );
};

// Individual lazy chart components
export const LazyLineChart: React.FC<any> = (props) => (
  <ErrorBoundary>
    <Suspense fallback={<ChartFallback />}>
      <Line {...props} />
    </Suspense>
  </ErrorBoundary>
);

export const LazyBarChart: React.FC<any> = (props) => (
  <ErrorBoundary>
    <Suspense fallback={<ChartFallback />}>
      <Bar {...props} />
    </Suspense>
  </ErrorBoundary>
);

export const LazyPieChart: React.FC<any> = (props) => (
  <ErrorBoundary>
    <Suspense fallback={<ChartFallback />}>
      <Pie {...props} />
    </Suspense>
  </ErrorBoundary>
);

export const LazyDoughnutChart: React.FC<any> = (props) => (
  <ErrorBoundary>
    <Suspense fallback={<ChartFallback />}>
      <Doughnut {...props} />
    </Suspense>
  </ErrorBoundary>
);

export default LazyChart;