/**
 * CMS Hub - Dashboard principale per la gestione CMS
 * 
 * Features:
 * - Toggle switch per navigare tra Analytics e Pagine
 * - Dashboard analytics con grafici e statistiche dettagliate
 * - Selezione periodo temporale
 * - Grafici di visualizzazione con trend
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Eye,
  Users,
  TrendingUp,
  TrendingDown,
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  RefreshCw,
  Calendar,
  ArrowRight,
  FileText,
  Globe,
  Activity,
  Zap,
  MousePointer,
  ExternalLink
} from 'lucide-react';
import {
  getAnalyticsSummary,
  getPageAnalytics,
  getPageDetailedAnalytics,
  type AnalyticsSummary,
  type PageAnalyticsResponse,
  type PageDetailedAnalytics,
  type ViewsOverTime
} from '../../services/cmsAnalyticsService';
import CMSManager from './CMSManager';
import CMSFormSubmissions from './CMSFormSubmissions';
import CMSFormTemplates from './CMSFormTemplates';
import { useNewPublicSubmissionsCount } from '../../hooks/useNewPublicSubmissionsCount';

type CMSView = 'analytics' | 'pages' | 'form-responses' | 'form-templates';
type PeriodOption = '7d' | '30d' | '90d' | '1y';

const periodLabels: Record<PeriodOption, string> = {
  '7d': 'Ultimi 7 giorni',
  '30d': 'Ultimi 30 giorni',
  '90d': 'Ultimi 90 giorni',
  '1y': 'Ultimo anno'
};

interface CMSHubProps {
  className?: string;
  initialView?: CMSView;
}

// Componente grafico a barre semplice
const SimpleBarChart: React.FC<{
  data: ViewsOverTime[];
  height?: number;
}> = ({ data, height = 200 }) => {
  const maxValue = Math.max(...data.map(d => d.views), 1);

  return (
    <div className="flex items-end gap-1" style={{ height: `${height}px` }}>
      {data.map((item, idx) => {
        // Calcola l'altezza come percentuale del massimo, con minimo 5% per visibilità
        const barHeightPercent = maxValue > 0 ? Math.max((item.views / maxValue) * 100, item.views > 0 ? 5 : 2) : 2;
        // Converti in pixel per precisione
        const barHeightPx = Math.max((barHeightPercent / 100) * height, 4);
        const date = new Date(item.date);
        const label = date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

        return (
          <div
            key={idx}
            className="flex-1 flex flex-col items-center justify-end group relative h-full"
          >
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                {item.views} visite - {label}
              </div>
            </div>
            {/* Bar - usando pixel per altezza precisa */}
            <div
              className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
              style={{ height: `${barHeightPx}px` }}
            />
            {/* Label */}
            {data.length <= 14 && (
              <span className="text-[10px] text-gray-400 mt-1 rotate-45 origin-left">
                {date.getDate()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Componente grafico a linea
const SimpleLineChart: React.FC<{
  data: ViewsOverTime[];
  height?: number;
  color?: string;
}> = ({ data, height = 120, color = '#3b82f6' }) => {
  const maxValue = Math.max(...data.map(d => d.views), 1);
  const points = data.map((item, idx) => ({
    x: (idx / (data.length - 1 || 1)) * 100,
    y: 100 - (item.views / maxValue) * 100
  }));

  const pathD = points.length > 0
    ? `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`
    : '';

  const areaD = points.length > 0
    ? `M 0 100 L ${points.map(p => `${p.x} ${p.y}`).join(' L ')} L 100 100 Z`
    : '';

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} className="w-full">
      {/* Area fill */}
      <path d={areaD} fill={`${color}20`} />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {/* Points */}
      {points.map((p, idx) => (
        <circle
          key={idx}
          cx={p.x}
          cy={p.y}
          r="3"
          fill={color}
          className="opacity-0 hover:opacity-100 transition-opacity"
        />
      ))}
    </svg>
  );
};

// Componente donut chart per dispositivi
const DeviceDonutChart: React.FC<{
  devices: Record<string, number>;
}> = ({ devices }) => {
  const total = Object.values(devices).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Nessun dato
      </div>
    );
  }

  const colors = {
    desktop: '#3b82f6',
    mobile: '#10b981',
    tablet: '#f59e0b',
    unknown: '#6b7280'
  };

  let currentAngle = 0;
  const segments = Object.entries(devices).map(([device, count]) => {
    const percentage = count / total;
    const startAngle = currentAngle;
    const endAngle = currentAngle + percentage * 360;
    currentAngle = endAngle;

    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;

    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);

    const largeArc = percentage > 0.5 ? 1 : 0;

    return {
      device,
      count,
      percentage,
      color: colors[device as keyof typeof colors] || colors.unknown,
      path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`
    };
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        {segments.map((seg, idx) => (
          <path
            key={idx}
            d={seg.path}
            fill={seg.color}
            className="hover:opacity-80 transition-opacity"
          />
        ))}
        <circle cx="50" cy="50" r="20" fill="white" />
      </svg>
      <div className="flex flex-col gap-1">
        {segments.map((seg) => (
          <div key={seg.device} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="capitalize text-gray-600">{seg.device}</span>
            <span className="font-medium">{(seg.percentage * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CMSHub: React.FC<CMSHubProps> = ({ className = '', initialView = 'analytics' }) => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<CMSView>(initialView);
  const [period, setPeriod] = useState<PeriodOption>('30d');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [pageAnalytics, setPageAnalytics] = useState<PageAnalyticsResponse | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pageDetail, setPageDetail] = useState<PageDetailedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Badge per risposte ai form pubblici
  const { count: newPublicSubmissionsCount } = useNewPublicSubmissionsCount();

  // Carica dati analytics
  useEffect(() => {
    if (activeView !== 'analytics') return;

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const [summaryData, pagesData] = await Promise.all([
          getAnalyticsSummary(period),
          getPageAnalytics({ limit: 10 })
        ]);
        setSummary(summaryData);
        setPageAnalytics(pagesData);
      } catch (err) {
        if (import.meta.env.DEV) console.error('[CMSHub] ❌ Failed to load analytics:', err);
        setError('Errore nel caricamento delle statistiche');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [activeView, period]);

  // Carica dettagli pagina selezionata
  useEffect(() => {
    if (!selectedPageId) {
      setPageDetail(null);
      return;
    }

    const loadPageDetail = async () => {
      try {
        const data = await getPageDetailedAnalytics(selectedPageId, {
          groupBy: period === '7d' ? 'day' : 'day'
        });
        setPageDetail(data);
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load page analytics:', err);
      }
    };
    loadPageDetail();
  }, [selectedPageId, period]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  // Se è selezionata la vista Pages, mostra CMSManager
  if (activeView === 'pages') {
    return (
      <div className={`cms-hub ${className}`}>
        {/* Header con Toggle */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="w-7 h-7 text-blue-600" />
                Content Management System
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Gestione contenuti e pagine pubbliche
              </p>
            </div>

            {/* Toggle Switch */}
            <div
              className="flex bg-gray-100 rounded-full shadow-sm border border-gray-200 overflow-x-auto px-2 py-1 gap-1"
              style={{ minHeight: '40px' }}
            >
              <button
                type="button"
                onClick={() => setActiveView('analytics')}
                className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${(activeView as CMSView) === 'analytics'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-transparent text-gray-700 hover:bg-blue-100'
                  }`}
              >
                Analytics
              </button>
              <button
                type="button"
                onClick={() => setActiveView('pages')}
                className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${(activeView as CMSView) === 'pages'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-transparent text-gray-700 hover:bg-blue-100'
                  }`}
              >
                Pagine
              </button>
              <button
                type="button"
                onClick={() => setActiveView('form-responses')}
                className={`relative px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${(activeView as CMSView) === 'form-responses'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-transparent text-gray-700 hover:bg-blue-100'
                  }`}
              >
                Risposte Form
                {newPublicSubmissionsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {newPublicSubmissionsCount > 99 ? '99+' : newPublicSubmissionsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('form-templates')}
                className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${(activeView as CMSView) === 'form-templates'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-transparent text-gray-700 hover:bg-blue-100'
                  }`}
              >
                Form Pubblici
              </button>
            </div>
          </div>
        </div>

        {/* CMSManager Component */}
        <CMSManager />
      </div>
    );
  }

  // Vista Risposte Form
  if (activeView === 'form-responses') {
    return (
      <div className={`cms-hub ${className}`}>
        {/* Header con Toggle */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="w-7 h-7 text-blue-600" />
                Content Management System
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Risposte dai form pubblici del sito
              </p>
            </div>

            {/* Toggle Switch */}
            <div
              className="flex bg-gray-100 rounded-full shadow-sm border border-gray-200 overflow-x-auto px-2 py-1 gap-1"
              style={{ minHeight: '40px' }}
            >
              <button
                type="button"
                onClick={() => setActiveView('analytics')}
                className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${'analytics' === (activeView as CMSView)
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-transparent text-gray-700 hover:bg-blue-100'
                  }`}
              >
                Analytics
              </button>
              <button
                type="button"
                onClick={() => setActiveView('pages')}
                className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${'pages' === (activeView as CMSView)
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-transparent text-gray-700 hover:bg-blue-100'
                  }`}
              >
                Pagine
              </button>
              <button
                type="button"
                onClick={() => setActiveView('form-responses')}
                className={`relative px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${'form-responses' === activeView
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-transparent text-gray-700 hover:bg-blue-100'
                  }`}
              >
                Risposte Form
                {newPublicSubmissionsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {newPublicSubmissionsCount > 99 ? '99+' : newPublicSubmissionsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('form-templates')}
                className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${'form-templates' === (activeView as CMSView)
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-transparent text-gray-700 hover:bg-blue-100'
                  }`}
              >
                Form Pubblici
              </button>
            </div>
          </div>
        </div>

        {/* CMSFormSubmissions Component */}
        <CMSFormSubmissions />
      </div>
    );
  }

  // Vista Form Templates pubblici
  if (activeView === 'form-templates') {
    return (
      <div className={`cms-hub ${className}`}>
        {/* Header con Toggle */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="w-7 h-7 text-blue-600" />
                Content Management System
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Form pubblici visibili sul sito
              </p>
            </div>
            {/* Toggle Switch */}
            <div
              className="flex bg-gray-100 rounded-full shadow-sm border border-gray-200 overflow-x-auto px-2 py-1 gap-1"
              style={{ minHeight: '40px' }}
            >
              <button type="button" onClick={() => setActiveView('analytics')}
                className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${'analytics' === (activeView as CMSView) ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-700 hover:bg-blue-100'}`}>
                Analytics
              </button>
              <button type="button" onClick={() => setActiveView('pages')}
                className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${'pages' === (activeView as CMSView) ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-700 hover:bg-blue-100'}`}>
                Pagine
              </button>
              <button type="button" onClick={() => setActiveView('form-responses')}
                className={`relative px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${'form-responses' === (activeView as CMSView) ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-700 hover:bg-blue-100'}`}>
                Risposte Form
                {newPublicSubmissionsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {newPublicSubmissionsCount > 99 ? '99+' : newPublicSubmissionsCount}
                  </span>
                )}
              </button>
              <button type="button" onClick={() => setActiveView('form-templates')}
                className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${'form-templates' === activeView ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-700 hover:bg-blue-100'}`}>
                Form Pubblici
              </button>
            </div>
          </div>
        </div>
        {/* CMSFormTemplates Component */}
        <CMSFormTemplates />
      </div>
    );
  }

  // Vista Analytics
  return (
    <div className={`cms-hub ${className}`}>
      {/* Header con Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="w-7 h-7 text-blue-600" />
              Content Management System
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Statistiche e insights sulle pagine pubbliche
            </p>
          </div>

          {/* Toggle Switch */}
          <div
            className="flex bg-gray-100 rounded-full shadow-sm border border-gray-200 overflow-x-auto px-2 py-1 gap-1"
            style={{ minHeight: '40px' }}
          >
            <button
              type="button"
              onClick={() => setActiveView('analytics')}
              className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${(activeView as CMSView) === 'analytics'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-transparent text-gray-700 hover:bg-blue-100'
                }`}
            >
              Analytics
            </button>
            <button
              type="button"
              onClick={() => setActiveView('pages')}
              className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${(activeView as CMSView) === 'pages'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-transparent text-gray-700 hover:bg-blue-100'
                }`}
            >
              Pagine
            </button>
            <button
              type="button"
              onClick={() => setActiveView('form-responses')}
              className={`relative px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${(activeView as CMSView) === 'form-responses'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-transparent text-gray-700 hover:bg-blue-100'
                }`}
            >
              Risposte Form
              {newPublicSubmissionsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {newPublicSubmissionsCount > 99 ? '99+' : newPublicSubmissionsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveView('form-templates')}
              className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${(activeView as CMSView) === 'form-templates'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-transparent text-gray-700 hover:bg-blue-100'
                }`}
            >
              Form Pubblici
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Periodo:</span>
          </div>
          <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden">
            {(Object.entries(periodLabels) as [PeriodOption, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${period === key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {key === '7d' ? '7G' : key === '30d' ? '30G' : key === '90d' ? '90G' : '1A'}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-500">{periodLabels[period]}</span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
          {error}
        </div>
      )}

      {/* Analytics Content */}
      {!loading && !error && summary && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Views */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${summary.summary.viewsTrend >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {summary.summary.viewsTrend >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(summary.summary.viewsTrend).toFixed(1)}%
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(summary.summary.totalViews)}
              </div>
              <div className="text-sm text-gray-500">Visualizzazioni totali</div>
            </div>

            {/* Unique Visitors */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(summary.summary.uniqueVisitors)}
              </div>
              <div className="text-sm text-gray-500">Visitatori unici</div>
            </div>

            {/* Average Daily Views */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {summary.summary.avgViewsPerDay}
              </div>
              <div className="text-sm text-gray-500">Media giornaliera</div>
            </div>

            {/* Total Pages */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {pageAnalytics?.summary.totalPages || 0}
              </div>
              <div className="text-sm text-gray-500">Pagine pubblicate</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Views Chart - 2 columns */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Andamento Visite</h2>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              {summary.viewsOverTime && summary.viewsOverTime.length > 0 ? (
                <SimpleBarChart data={summary.viewsOverTime} height={200} />
              ) : pageDetail?.viewsOverTime && pageDetail.viewsOverTime.length > 0 ? (
                <SimpleBarChart data={pageDetail.viewsOverTime} height={200} />
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nessun dato disponibile per il periodo selezionato</p>
                  </div>
                </div>
              )}
            </div>

            {/* Devices Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Dispositivi</h2>
                <Monitor className="w-5 h-5 text-gray-400" />
              </div>
              <DeviceDonutChart devices={summary.devices} />
            </div>
          </div>

          {/* Top Pages Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Pagine più visitate</h2>
                <button
                  onClick={() => setActiveView('pages')}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Vedi tutte <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {summary.topPages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium mb-1">Nessuna visita registrata</p>
                <p className="text-sm">Le statistiche appariranno quando le pagine pubbliche riceveranno visite</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Pagina
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Visite
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        % Totale
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {summary.topPages.map((page, idx) => {
                      const percentage = summary.summary.totalViews > 0
                        ? ((page.views / summary.summary.totalViews) * 100).toFixed(1)
                        : '0';

                      return (
                        <tr
                          key={page.id}
                          className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${selectedPageId === page.id ? 'bg-blue-50' : ''
                            }`}
                          onClick={() => setSelectedPageId(page.id === selectedPageId ? null : page.id)}
                        >
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                              idx === 1 ? 'bg-gray-200 text-gray-700' :
                                idx === 2 ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-500'
                              }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 rounded-lg">
                                <FileText className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{page.title}</div>
                                <div className="text-sm text-gray-500">/{page.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <span className="text-lg font-semibold text-gray-900">
                              {formatNumber(page.views)}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 w-12">{percentage}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <a
                              href={`/${page.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Page Detail Panel */}
          {selectedPageId && pageDetail && (
            <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{pageDetail.page.title}</h2>
                    <p className="text-sm text-gray-500">/{pageDetail.page.slug}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPageId(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-5">
                {/* Mini Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{pageDetail.summary.totalViews}</div>
                    <div className="text-sm text-gray-500">Visite</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{pageDetail.summary.uniqueVisitors}</div>
                    <div className="text-sm text-gray-500">Visitatori</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{formatDuration(pageDetail.summary.avgDuration)}</div>
                    <div className="text-sm text-gray-500">Tempo medio</div>
                  </div>
                </div>

                {/* Views Over Time Chart */}
                {pageDetail.viewsOverTime && pageDetail.viewsOverTime.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Visite nel tempo</h3>
                    <SimpleBarChart data={pageDetail.viewsOverTime} height={150} />
                  </div>
                )}

                {/* Breakdowns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Devices */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Dispositivi</h3>
                    <div className="space-y-2">
                      {pageDetail.devices.map((d) => (
                        <div key={d.device} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(d.device)}
                            <span className="capitalize">{d.device}</span>
                          </div>
                          <span className="font-medium">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Browsers */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Browser</h3>
                    <div className="space-y-2">
                      {pageDetail.browsers.slice(0, 5).map((b) => (
                        <div key={b.browser} className="flex items-center justify-between text-sm">
                          <span className="truncate">{b.browser}</span>
                          <span className="font-medium">{b.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Referers */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Sorgenti</h3>
                    <div className="space-y-2">
                      {pageDetail.referers.length === 0 ? (
                        <p className="text-sm text-gray-400">Nessun referrer</p>
                      ) : (
                        pageDetail.referers.slice(0, 5).map((r, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="truncate max-w-[120px]">{r.referer || 'Diretto'}</span>
                            <span className="font-medium">{r.count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CMSHub;
