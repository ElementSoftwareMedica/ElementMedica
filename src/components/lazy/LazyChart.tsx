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

// Chart.js type definitions
interface ChartDataset {
  label?: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: {
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    title?: {
      display?: boolean;
      text?: string;
    };
  };
  scales?: {
    x?: {
      display?: boolean;
    };
    y?: {
      display?: boolean;
    };
  };
}

interface BaseChartProps {
  data: ChartData;
  options?: ChartOptions;
  width?: number;
  height?: number;
}

interface LazyChartProps extends BaseChartProps {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
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
export const LazyLineChart: React.FC<BaseChartProps> = (props) => (
  <ErrorBoundary>
    <Suspense fallback={<ChartFallback />}>
      <Line {...props} />
    </Suspense>
  </ErrorBoundary>
);

export const LazyBarChart: React.FC<BaseChartProps> = (props) => (
  <ErrorBoundary>
    <Suspense fallback={<ChartFallback />}>
      <Bar {...props} />
    </Suspense>
  </ErrorBoundary>
);

export const LazyPieChart: React.FC<BaseChartProps> = (props) => (
  <ErrorBoundary>
    <Suspense fallback={<ChartFallback />}>
      <Pie {...props} />
    </Suspense>
  </ErrorBoundary>
);

export const LazyDoughnutChart: React.FC<BaseChartProps> = (props) => (
  <ErrorBoundary>
    <Suspense fallback={<ChartFallback />}>
      <Doughnut {...props} />
    </Suspense>
  </ErrorBoundary>
);

export default LazyChart;