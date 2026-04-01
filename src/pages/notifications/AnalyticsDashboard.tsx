/**
 * AnalyticsDashboard - Dashboard Analytics Notifiche
 * 
 * Dashboard per visualizzare analytics e metriche delle notifiche.
 * Include KPI, trend, distribuzione per canale e engagement.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 8
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, TrendingUp, Send, Eye, MousePointer,
  BellOff, RefreshCw, Download, Calendar, ArrowUpRight,
  ArrowDownRight, Minus, Mail, Smartphone, Bell, Webhook,
  Filter
} from 'lucide-react';
import { apiGet } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// API Base
const API_BASE = '/api/v1/notifications/advanced';

// Types
interface OverviewStats {
  total: number;
  sent: number;
  read: number;
  clicked: number;
  dismissed: number;
  failed: number;
  rates: {
    delivery: number;
    open: number;
    click: number;
    dismiss: number;
    failure: number;
  };
}

interface DeliveryMetrics {
  [channel: string]: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    deliveryRate: number;
    failureRate: number;
    avgDeliveryTimeSeconds: number | null;
  };
}

interface TrendDataPoint {
  period: string;
  total: number;
  sent: number;
  read: number;
  clicked: number;
  dismissed: number;
  openRate: number;
  clickRate: number;
}

interface CategoryEngagement {
  category: string;
  total: number;
  sent: number;
  read: number;
  clicked: number;
  dismissed: number;
  openRate: number;
  clickRate: number;
  dismissRate: number;
}

interface Distribution {
  byType: Array<{ type: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

// Date range presets
const dateRangePresets = [
  { label: 'Ultimi 7 giorni', value: '7d', days: 7 },
  { label: 'Ultimi 30 giorni', value: '30d', days: 30 },
  { label: 'Ultimi 90 giorni', value: '90d', days: 90 },
  { label: 'Quest\'anno', value: 'ytd', days: 365 },
];

// Granularity options
const granularityOptions = [
  { label: 'Ora', value: 'hour' },
  { label: 'Giorno', value: 'day' },
  { label: 'Settimana', value: 'week' },
  { label: 'Mese', value: 'month' },
];

// Channel icons and colors
const channelConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  EMAIL: { icon: Mail, color: 'bg-blue-500', label: 'Email' },
  SMS: { icon: Smartphone, color: 'bg-green-500', label: 'SMS' },
  PUSH: { icon: Bell, color: 'bg-yellow-500', label: 'Push' },
  WEBHOOK: { icon: Webhook, color: 'bg-purple-500', label: 'Webhook' },
  IN_APP: { icon: Bell, color: 'bg-indigo-500', label: 'In-App' },
};

// Priority colors
const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-400',
  NORMAL: 'bg-blue-400',
  HIGH: 'bg-orange-400',
  URGENT: 'bg-red-500',
  CRITICAL: 'bg-red-700',
};

// Type colors
const typeColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
];

// Helper functions
const getDateRange = (preset: string) => {
  const now = new Date();
  const days = dateRangePresets.find(p => p.value === preset)?.days || 30;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  };
};

// KPI Card Component
interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  color?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title, value, subtitle, icon: Icon, trend, color = 'text-blue-600'
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center mt-3 text-sm">
          {trend > 0 ? (
            <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
          ) : trend < 0 ? (
            <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
          ) : (
            <Minus className="w-4 h-4 text-gray-400 mr-1" />
          )}
          <span className={trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}>
            {Math.abs(trend)}%
          </span>
          <span className="text-gray-400 ml-1">vs periodo prec.</span>
        </div>
      )}
    </CardContent>
  </Card>
);

// Simple Bar Chart Component
interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  horizontal?: boolean;
}

const SimpleBarChart: React.FC<BarChartProps> = ({ data, height = 200, horizontal = false }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  if (horizontal) {
    return (
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${item.color || 'bg-blue-500'}`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2" style={{ height: `${height}px` }}>
      {data.map((item, idx) => {
        const barHeight = maxValue > 0
          ? Math.max((item.value / maxValue) * 100, item.value > 0 ? 5 : 2)
          : 2;

        return (
          <div
            key={idx}
            className="flex-1 flex flex-col items-center justify-end group relative h-full"
          >
            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                {item.value} - {item.label}
              </div>
            </div>
            <div
              className={`w-full rounded-t transition-all duration-300 hover:opacity-80 ${item.color || 'bg-blue-500'}`}
              style={{ height: `${barHeight}%` }}
            />
            <span className="text-[10px] text-gray-400 mt-1 truncate max-w-full" title={item.label}>
              {item.label.length > 8 ? item.label.substring(0, 6) + '...' : item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Trend Line Chart Component
interface TrendChartProps {
  data: TrendDataPoint[];
  metric: 'total' | 'read' | 'clicked' | 'openRate' | 'clickRate';
  height?: number;
  color?: string;
}

const TrendLineChart: React.FC<TrendChartProps> = ({
  data,
  metric,
  height = 200,
  color = '#3b82f6'
}) => {
  const values = data.map(d => d[metric]);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  // Calculate Y-axis intermediate values
  const yAxisValues = [
    maxValue,
    minValue + (range * 0.75),
    minValue + (range * 0.5),
    minValue + (range * 0.25),
    minValue
  ];

  const points = data.map((item, idx) => ({
    x: data.length > 1 ? (idx / (data.length - 1)) * 100 : 50,
    y: 100 - ((item[metric] - minValue) / range) * 80 - 10, // Leave 10% padding top/bottom
  }));

  const pathD = points.length > 0
    ? `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`
    : '';

  const areaD = points.length > 0
    ? `M 0 100 L ${points.map(p => `${p.x} ${p.y}`).join(' L ')} L 100 100 Z`
    : '';

  // Format period label for display
  const formatPeriodLabel = (period: string): string => {
    if (!period) return '';
    // Handle different period formats (YYYY-MM-DD, YYYY-MM, etc.)
    if (period.includes('-')) {
      const parts = period.split('-');
      if (parts.length >= 2) {
        // Return day/month or month for shorter display
        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : `${parts[1]}`;
      }
    }
    return period.slice(-5); // Last 5 chars as fallback
  };

  // Select X-axis labels (show max 7 labels)
  const getXAxisLabels = () => {
    if (data.length <= 7) {
      return data.map((d, idx) => ({ label: formatPeriodLabel(d.period), idx }));
    }
    const step = Math.ceil(data.length / 6);
    const labels = [];
    for (let i = 0; i < data.length; i += step) {
      labels.push({ label: formatPeriodLabel(data[i].period), idx: i });
    }
    // Always include last point
    if (labels[labels.length - 1]?.idx !== data.length - 1) {
      labels.push({ label: formatPeriodLabel(data[data.length - 1].period), idx: data.length - 1 });
    }
    return labels;
  };

  const xAxisLabels = getXAxisLabels();

  return (
    <div className="relative" style={{ height: height + 40 }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pr-2" style={{ height: height - 10, width: 45 }}>
        {yAxisValues.map((val, idx) => (
          <span key={idx} className="text-right w-full">
            {metric.includes('Rate') ? `${Math.round(val)}%` : Math.round(val).toLocaleString()}
          </span>
        ))}
      </div>

      {/* Chart area */}
      <div className="absolute left-12 right-0" style={{ height }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {/* Grid lines */}
          {[10, 30, 50, 70, 90].map(y => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" />
          ))}
          {/* Vertical grid lines */}
          {xAxisLabels.map(({ idx }) => {
            const x = data.length > 1 ? (idx / (data.length - 1)) * 100 : 50;
            return (
              <line key={`v-${idx}`} x1={x} y1="0" x2={x} y2="100" stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" />
            );
          })}
          {/* Area fill */}
          <path d={areaD} fill={`${color}15`} />
          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Points */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="3"
              fill={color}
              className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <title>{data[idx].period}: {metric.includes('Rate') ? `${values[idx]}%` : values[idx]}</title>
            </circle>
          ))}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="absolute left-12 right-0 flex justify-between text-xs text-gray-400" style={{ top: height + 5 }}>
        {xAxisLabels.map(({ label, idx }) => (
          <span
            key={idx}
            className="text-center"
            style={{
              position: 'absolute',
              left: `${data.length > 1 ? (idx / (data.length - 1)) * 100 : 50}%`,
              transform: 'translateX(-50%)'
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

// Pie Chart Component
interface PieChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  size?: number;
}

const SimplePieChart: React.FC<PieChartProps> = ({ data, size = 200 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = -90;

  const segments = data.map((item, idx) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;

    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    return {
      path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: item.color || typeColors[idx % typeColors.length],
      label: item.label,
      value: item.value,
      percentage,
    };
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
        {segments.map((seg, idx) => (
          <path
            key={idx}
            d={seg.path}
            fill={seg.color}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <title>{seg.label}: {seg.value} ({seg.percentage.toFixed(1)}%)</title>
          </path>
        ))}
        {/* Center circle for donut effect */}
        <circle cx="50" cy="50" r="25" fill="white" />
        <text x="50" y="50" textAnchor="middle" dy="0.3em" className="text-lg font-bold" fill="#374151">
          {total}
        </text>
      </svg>
      {/* Legend */}
      <div className="flex flex-col gap-2">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600">{seg.label}</span>
            <span className="font-medium ml-auto">{seg.percentage.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Component
export default function AnalyticsDashboard() {
  const { showToast } = useToast();
  const [dateRange, setDateRange] = useState('30d');
  const [granularity, setGranularity] = useState('day');
  const [trendMetric, setTrendMetric] = useState<'total' | 'read' | 'clicked' | 'openRate' | 'clickRate'>('total');

  // Calculate date params
  const dateParams = useMemo(() => getDateRange(dateRange), [dateRange]);

  // Types for API responses
  interface ApiResponse<T> {
    success: boolean;
    data: T;
  }

  // Queries
  const {
    data: overview,
    isLoading: isLoadingOverview,
    refetch: refetchOverview
  } = useQuery<OverviewStats>({
    queryKey: ['notification-analytics-overview', dateParams],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<OverviewStats>>(`${API_BASE}/analytics/overview`, dateParams);
      return response.data;
    },
  });

  const {
    data: delivery,
    isLoading: isLoadingDelivery
  } = useQuery<DeliveryMetrics>({
    queryKey: ['notification-analytics-delivery', dateParams],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<DeliveryMetrics>>(`${API_BASE}/analytics/delivery`, dateParams);
      return response.data;
    },
  });

  const {
    data: trends,
    isLoading: isLoadingTrends
  } = useQuery<TrendDataPoint[]>({
    queryKey: ['notification-analytics-trends', dateParams, granularity],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<TrendDataPoint[]>>(`${API_BASE}/analytics/trends`, {
        ...dateParams,
        granularity
      });
      return response.data;
    },
  });

  const {
    data: engagement,
    isLoading: isLoadingEngagement
  } = useQuery<CategoryEngagement[]>({
    queryKey: ['notification-analytics-engagement', dateParams],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<CategoryEngagement[]>>(`${API_BASE}/analytics/engagement`, dateParams);
      return response.data;
    },
  });

  const {
    data: distribution,
    isLoading: isLoadingDistribution
  } = useQuery<Distribution>({
    queryKey: ['notification-analytics-distribution', dateParams],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<Distribution>>(`${API_BASE}/analytics/distribution`, dateParams);
      return response.data;
    },
  });

  // Handlers
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await apiGet<string>(`${API_BASE}/analytics/export`, {
        ...dateParams,
        format,
      });

      // Create download link
      const blob = new Blob([response as BlobPart], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notification-analytics-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast({
        message: `Analytics esportati in ${format.toUpperCase()}`,
        type: 'success'
      });
    } catch (error) {
      showToast({
        message: 'Errore durante l\'export',
        type: 'error'
      });
    }
  };

  const handleRefresh = () => {
    refetchOverview();
    showToast({ message: 'Dati aggiornati', type: 'success' });
  };

  // Prepare chart data
  const deliveryChartData = useMemo(() => {
    if (!delivery) return [];
    return Object.entries(delivery)
      .filter(([, data]) => data.total > 0)
      .map(([channel, data]) => ({
        label: channelConfig[channel]?.label || channel,
        value: data.total,
        color: channelConfig[channel]?.color || 'bg-gray-500',
      }));
  }, [delivery]);

  const typeChartData = useMemo(() => {
    if (!distribution?.byType) return [];
    return distribution.byType.map((item, idx) => ({
      label: item.type,
      value: item.count,
      color: typeColors[idx % typeColors.length],
    }));
  }, [distribution]);

  const priorityChartData = useMemo(() => {
    if (!distribution?.byPriority) return [];
    return distribution.byPriority.map(item => ({
      label: item.priority,
      value: item.count,
      color: priorityColors[item.priority] || 'bg-gray-400',
    }));
  }, [distribution]);

  const isLoading = isLoadingOverview || isLoadingDelivery || isLoadingTrends ||
    isLoadingEngagement || isLoadingDistribution;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Notifiche</h1>
            <p className="text-sm text-gray-500">
              Metriche e statistiche del sistema notifiche
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateRangePresets.map(preset => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Export */}
          <Select onValueChange={(v) => handleExport(v as 'json' | 'csv')}>
            <SelectTrigger className="w-[130px]">
              <Download className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Esporta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Totale Inviate"
          value={overview?.sent?.toLocaleString() || '0'}
          subtitle={`su ${overview?.total?.toLocaleString() || '0'} create`}
          icon={Send}
          color="text-blue-600"
        />
        <KpiCard
          title="Open Rate"
          value={`${overview?.rates?.open || 0}%`}
          subtitle={`${overview?.read?.toLocaleString() || '0'} lette`}
          icon={Eye}
          color="text-green-600"
        />
        <KpiCard
          title="Click Rate"
          value={`${overview?.rates?.click || 0}%`}
          subtitle={`${overview?.clicked?.toLocaleString() || '0'} click`}
          icon={MousePointer}
          color="text-purple-600"
        />
        <KpiCard
          title="Dismiss Rate"
          value={`${overview?.rates?.dismiss || 0}%`}
          subtitle={`${overview?.dismissed?.toLocaleString() || '0'} ignorate`}
          icon={BellOff}
          color="text-orange-600"
        />
        <KpiCard
          title="Delivery Rate"
          value={`${overview?.rates?.delivery || 0}%`}
          subtitle={`${overview?.failed || 0} fallite`}
          icon={TrendingUp}
          color="text-teal-600"
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trend</TabsTrigger>
          <TabsTrigger value="channels">Canali</TabsTrigger>
          <TabsTrigger value="distribution">Distribuzione</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trend Temporale</CardTitle>
                  <CardDescription>
                    Andamento delle notifiche nel periodo selezionato
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={trendMetric} onValueChange={(v) => setTrendMetric(v as typeof trendMetric)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">Totale</SelectItem>
                      <SelectItem value="read">Lette</SelectItem>
                      <SelectItem value="clicked">Click</SelectItem>
                      <SelectItem value="openRate">Open Rate %</SelectItem>
                      <SelectItem value="clickRate">Click Rate %</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={granularity} onValueChange={setGranularity}>
                    <SelectTrigger className="w-[120px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {granularityOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTrends ? (
                <div className="h-[250px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : trends && trends.length > 0 ? (
                <TrendLineChart
                  data={trends}
                  metric={trendMetric}
                  height={250}
                  color={trendMetric.includes('Rate') ? '#10b981' : '#3b82f6'}
                />
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-400">
                  Nessun dato disponibile per il periodo selezionato
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Delivery by Channel */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery per Canale</CardTitle>
                <CardDescription>
                  Distribuzione delle notifiche per canale di delivery
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDelivery ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : deliveryChartData.length > 0 ? (
                  <SimpleBarChart data={deliveryChartData} height={200} />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-400">
                    Nessun dato disponibile
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Channel Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Canali</CardTitle>
                <CardDescription>
                  Delivery rate e tempi medi per canale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {delivery && Object.entries(delivery).map(([channel, data]) => {
                    if (data.total === 0) return null;
                    const config = channelConfig[channel];
                    const Icon = config?.icon || Bell;

                    return (
                      <div key={channel} className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${config?.color || 'bg-gray-500'} bg-opacity-10`}>
                          <Icon className={`w-5 h-5 ${config?.color?.replace('bg-', 'text-') || 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{config?.label || channel}</span>
                            <Badge variant={data.deliveryRate >= 95 ? 'default' : data.deliveryRate >= 80 ? 'secondary' : 'destructive'}>
                              {data.deliveryRate}%
                            </Badge>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${config?.color || 'bg-gray-500'}`}
                              style={{ width: `${data.deliveryRate}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{data.delivered}/{data.total} consegnate</span>
                            {data.avgDeliveryTimeSeconds !== null && (
                              <span>~{Math.round(data.avgDeliveryTimeSeconds)}s avg</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Type */}
            <Card>
              <CardHeader>
                <CardTitle>Per Tipo</CardTitle>
                <CardDescription>
                  Distribuzione delle notifiche per tipo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDistribution ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : typeChartData.length > 0 ? (
                  <SimplePieChart data={typeChartData} size={180} />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-400">
                    Nessun dato disponibile
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Priority */}
            <Card>
              <CardHeader>
                <CardTitle>Per Priorità</CardTitle>
                <CardDescription>
                  Distribuzione delle notifiche per priorità
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDistribution ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : priorityChartData.length > 0 ? (
                  <SimpleBarChart data={priorityChartData} horizontal height={180} />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-400">
                    Nessun dato disponibile
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle>Engagement per Categoria</CardTitle>
              <CardDescription>
                Metriche di engagement suddivise per categoria di notifica
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEngagement ? (
                <div className="h-[300px] flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : engagement && engagement.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-3 px-4 font-medium text-gray-600">Categoria</th>
                        <th className="py-3 px-4 font-medium text-gray-600 text-right">Totale</th>
                        <th className="py-3 px-4 font-medium text-gray-600 text-right">Inviate</th>
                        <th className="py-3 px-4 font-medium text-gray-600 text-right">Open Rate</th>
                        <th className="py-3 px-4 font-medium text-gray-600 text-right">Click Rate</th>
                        <th className="py-3 px-4 font-medium text-gray-600 text-right">Dismiss Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {engagement.map((cat) => (
                        <tr key={cat.category} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{cat.category}</td>
                          <td className="py-3 px-4 text-right">{cat.total.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">{cat.sent.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant={cat.openRate >= 50 ? 'default' : 'secondary'}>
                              {cat.openRate}%
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant={cat.clickRate >= 10 ? 'default' : 'secondary'}>
                              {cat.clickRate}%
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant={cat.dismissRate <= 20 ? 'default' : 'destructive'}>
                              {cat.dismissRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  Nessun dato di engagement disponibile
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
