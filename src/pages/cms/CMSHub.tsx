/**
 * CMS Hub - Dashboard principale per la gestione CMS
 * 
 * Features:
 * - Toggle switch per navigare tra Analytics e Pagine
 * - Dashboard analytics con grafici e statistiche dettagliate
 * - Selezione periodo temporale
 * - Grafici di visualizzazione con trend
 */

import React, { useState, useEffect, useMemo, Fragment } from 'react';
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
  FileText,
  Globe,
  Activity,
  Zap,
  MousePointer,
  ExternalLink,
  MapPin,
  ChevronDown,
  ChevronRight,
  Layers
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
import CMSFormSubmissions from './CMSFormSubmissions';
import CMSFormTemplates from './CMSFormTemplates';
import { useNewPublicSubmissionsCount } from '../../hooks/useNewPublicSubmissionsCount';
import { useAuth } from '../../hooks/auth/useAuth';
import { useTenantAccess } from '../../hooks/useTenantAccess';

type CMSView = 'analytics' | 'form-responses' | 'form-templates';
type PeriodOption = '7d' | '30d' | '90d' | '1y';

const periodLabels: Record<PeriodOption, string> = {
  '7d': 'Ultimi 7 giorni',
  '30d': 'Ultimi 30 giorni',
  '90d': 'Ultimi 90 giorni',
  '1y': 'Ultimo anno'
};

// Registro delle pagine pubbliche reali del frontend (hardcoded React pages)
// Aggiornare quando si aggiungono nuove route in App.tsx
const PUBLIC_FRONTEND_PAGES: { slug: string; title: string; brand: 'both' | 'medica' | 'sicurezza' }[] = [
  // Pagine comuni a entrambi i brand
  { slug: '/', title: 'Homepage', brand: 'both' },
  { slug: '/chi-siamo', title: 'Chi Siamo', brand: 'both' },
  { slug: '/medicina-del-lavoro', title: 'Medicina del Lavoro', brand: 'both' },
  { slug: '/contatti', title: 'Contatti', brand: 'both' },
  { slug: '/gruppo-servizi', title: 'Gruppo Servizi', brand: 'both' },
  { slug: '/lavora-con-noi', title: 'Lavora Con Noi', brand: 'both' },
  { slug: '/carriere', title: 'Carriere', brand: 'both' },
  { slug: '/servizi', title: 'Servizi', brand: 'both' },
  { slug: '/medici', title: 'Medici', brand: 'both' },
  { slug: '/privacy-policy', title: 'Privacy Policy', brand: 'both' },
  { slug: '/cookie-policy', title: 'Cookie Policy', brand: 'both' },
  { slug: '/termini', title: 'Termini di Servizio', brand: 'both' },
  // Pagine solo ElementMedica
  { slug: '/diagnostica', title: 'Diagnostica', brand: 'medica' },
  { slug: '/visite-specialistiche', title: 'Visite Specialistiche', brand: 'medica' },
  { slug: '/prenota', title: 'Prenota', brand: 'medica' },
  // Pagine solo ElementSicurezza
  { slug: '/rspp', title: 'RSPP', brand: 'sicurezza' },
  { slug: '/corsi', title: 'Corsi', brand: 'sicurezza' },
];

interface CMSHubProps {
  className?: string;
  initialView?: CMSView;
}

// Componente grafico a barre semplice con asse Y
const SimpleBarChart: React.FC<{
  data: ViewsOverTime[];
  height?: number;
  color?: string;
}> = ({ data, height = 200, color = 'blue' }) => {
  const maxValue = Math.max(...data.map(d => d.views), 1);

  // Calcola tick Y "netti" (arrotondati)
  const rawStep = maxValue / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const step = Math.ceil(rawStep / magnitude) * magnitude || 1;
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round(step * (4 - i)));

  const formatTick = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(n);

  const colorFrom = color === 'teal' ? 'from-teal-500 to-teal-400 hover:from-teal-600 hover:to-teal-500'
    : color === 'purple' ? 'from-purple-500 to-purple-400 hover:from-purple-600 hover:to-purple-500'
      : 'from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500';

  return (
    <div className="flex gap-2">
      {/* Y-axis */}
      <div className="flex flex-col justify-between items-end flex-shrink-0 pb-5" style={{ width: '36px', height: `${height}px` }}>
        {yTicks.map(tick => (
          <span key={tick} className="text-[10px] text-gray-400 leading-none">{formatTick(tick)}</span>
        ))}
      </div>

      {/* Chart area */}
      <div className="flex-1 flex flex-col">
        {/* Bars with gridlines */}
        <div className="relative flex items-end gap-0.5" style={{ height: `${height}px` }}>
          {/* Horizontal gridlines */}
          {yTicks.map((tick, i) => (
            <div
              key={tick}
              className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-700 pointer-events-none"
              style={{ bottom: `${(tick / (yTicks[0] || 1)) * 100}%`, opacity: i === yTicks.length - 1 ? 0 : 1 }}
            />
          ))}
          {/* Zero baseline */}
          <div className="absolute left-0 right-0 bottom-0 border-t border-gray-200 dark:border-gray-600" />

          {data.map((item, idx) => {
            const barHeightPercent = yTicks[0] > 0 ? Math.max((item.views / yTicks[0]) * 100, item.views > 0 ? 2 : 0) : 0;
            const date = new Date(item.date);
            const label = date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end group relative h-full">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex z-10 pointer-events-none">
                  <div className="bg-gray-900 text-white text-xs rounded-lg py-1.5 px-2.5 whitespace-nowrap shadow-lg">
                    <span className="font-semibold">{item.views}</span>
                    <span className="text-gray-300 ml-1">visite</span>
                    <br />
                    <span className="text-gray-400 text-[10px]">{label}</span>
                  </div>
                </div>
                <div
                  className={`w-full bg-gradient-to-t ${colorFrom} rounded-t-sm transition-all duration-200`}
                  style={{ height: `${barHeightPercent}%` }}
                />
              </div>
            );
          })}
        </div>
        {/* X-axis date labels */}
        <div className="flex items-center gap-0.5 mt-1" style={{ height: '16px' }}>
          {data.map((item, idx) => {
            const date = new Date(item.date);
            const showLabel = data.length <= 14
              ? true
              : idx === 0 || idx === data.length - 1 || idx % Math.ceil(data.length / 8) === 0;
            return (
              <div key={idx} className="flex-1 text-center overflow-hidden">
                {showLabel && (
                  <span className="text-[9px] text-gray-400 leading-none">{date.getDate()}/{date.getMonth() + 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
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

// Converte codice paese ISO in emoji bandiera
const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const CMSHub: React.FC<CMSHubProps> = ({ className = '', initialView = 'analytics' }) => {
  const { user } = useAuth();
  const { hasFeature } = useTenantAccess();

  // Global admin = ADMIN or SUPER_ADMIN only
  const isGlobalAdmin = user?.role === 'Admin' ||
    user?.globalRole === 'ADMIN' ||
    user?.globalRole === 'SUPER_ADMIN' ||
    user?.roles?.includes('ADMIN') ||
    user?.roles?.includes('SUPER_ADMIN');

  // For non-global-admins, only allow form-related views
  const allowedViews: CMSView[] = isGlobalAdmin
    ? ['analytics', 'form-responses', 'form-templates']
    : ['form-responses', 'form-templates'];

  const defaultView: CMSView = isGlobalAdmin ? (['form-responses', 'form-templates'].includes(initialView) ? initialView as CMSView : 'analytics') : 'form-responses';

  const [activeView, setActiveView] = useState<CMSView>(
    allowedViews.includes(initialView) ? initialView : defaultView
  );
  const [period, setPeriod] = useState<PeriodOption>('30d');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [pageAnalytics, setPageAnalytics] = useState<PageAnalyticsResponse | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pageDetail, setPageDetail] = useState<PageDetailedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comuniExpanded, setComuniExpanded] = useState(false);
  const [topComuniExpanded, setTopComuniExpanded] = useState(false);

  // Badge per risposte ai form pubblici
  const { count: newPublicSubmissionsCount } = useNewPublicSubmissionsCount();

  // Redirect non-global-admins away from analytics view
  useEffect(() => {
    if (!isGlobalAdmin && activeView === 'analytics') {
      setActiveView('form-responses');
    }
  }, [activeView, isGlobalAdmin]);

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
              {isGlobalAdmin && (
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
              )}
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
              {isGlobalAdmin && (
                <button type="button" onClick={() => setActiveView('analytics')}
                  className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${'analytics' === (activeView as CMSView) ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-700 hover:bg-blue-100'}`}>
                  Analytics
                </button>
              )}
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
                <SimpleBarChart data={summary.viewsOverTime} height={200} color="blue" />
              ) : pageDetail?.viewsOverTime && pageDetail.viewsOverTime.length > 0 ? (
                <SimpleBarChart data={pageDetail.viewsOverTime} height={200} color="blue" />
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nessun dato disponibile per il periodo selezionato</p>
                  </div>
                </div>
              )}
              {/* Flusso orario */}
              {(summary.peakHours ?? []).length > 0 && (() => {
                const maxViews = Math.max(...(summary.peakHours ?? []).map(ph => ph.views), 1);
                return (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1 mb-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Flusso orario</span>
                    </div>
                    <div className="flex items-end gap-0.5" style={{ height: 48 }}>
                      {Array.from({ length: 24 }, (_, h) => {
                        const found = (summary.peakHours ?? []).find(ph => ph.hour === h);
                        const v = found?.views ?? 0;
                        const pct = Math.round((v / maxViews) * 100);
                        return (
                          <div key={h} className="flex-1 flex flex-col items-center justify-end group relative h-full">
                            <div className="absolute bottom-full mb-1 hidden group-hover:flex z-10 pointer-events-none">
                              <div className="bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap">
                                {String(h).padStart(2, '0')}:00 — {v} visite
                              </div>
                            </div>
                            <div
                              className="w-full bg-blue-300 rounded-t-sm"
                              style={{ height: `${Math.max(pct, v > 0 ? 4 : 0)}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                      <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right column: Devices + Top Comuni */}
            <div className="flex flex-col gap-4">
              {/* Devices Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900">Dispositivi</h2>
                  <Monitor className="w-4 h-4 text-gray-400" />
                </div>
                <DeviceDonutChart devices={summary.devices} />
              </div>

              {/* Top Comuni */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex-1 min-h-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-gray-900">Top Comuni</h2>
                  <MapPin className="w-4 h-4 text-gray-400" />
                </div>
                {(summary.topCities ?? []).length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <MapPin className="w-8 h-8 mx-auto mb-1 opacity-40" />
                    <p className="text-xs">Nessun dato geografico</p>
                    <p className="text-xs text-gray-300 mt-0.5">I dati appariranno con le prossime visite</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {(topComuniExpanded ? summary.topCities ?? [] : (summary.topCities ?? []).slice(0, 5)).map((c, i) => {
                        const maxCount = (summary.topCities ?? [])[0]?.count ?? 1;
                        const pct = Math.round((c.count / maxCount) * 100);
                        return (
                          <div key={c.city} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-medium text-gray-700 truncate">{c.city}</span>
                                <span className="text-xs text-gray-500 ml-1 shrink-0">{c.count}</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {(summary.topCities ?? []).length > 5 && (
                      <button
                        onClick={() => setTopComuniExpanded(v => !v)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {topComuniExpanded ? '▲ Mostra meno' : `▼ +${(summary.topCities ?? []).length - 5} altri comuni`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Pages Overview + Top Pages */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Pagine pubbliche del sito</h2>
                <button
                  onClick={() => setPeriod(period)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Aggiorna dati <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tutte le pagine pubbliche del frontend · le pagine con tracciamento attivo mostrano i dati di visita
              </p>
            </div>

            {/* Registry of known frontend pages — chip bar with brand color */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex flex-wrap gap-2">
                {PUBLIC_FRONTEND_PAGES.map(page => {
                  const tracked = summary?.topPages?.find(p => `/${p.slug}` === page.slug || p.slug === page.slug.replace(/^\//, ''));
                  const brandColor = page.brand === 'medica'
                    ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                    : page.brand === 'sicurezza'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100';
                  const trackDot = tracked ? 'bg-green-500' : 'bg-gray-300';
                  return (
                    <a
                      key={page.slug}
                      href={page.slug}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${page.title} · ${page.brand === 'both' ? 'Entrambi i brand' : page.brand === 'medica' ? 'ElementMedica' : 'ElementSicurezza'}${tracked ? ` · ${tracked.views} visite` : ''}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${brandColor}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${trackDot} flex-shrink-0`} />
                      {page.title}
                      {tracked && <span className="font-bold ml-0.5">{tracked.views}</span>}
                    </a>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Tracciata</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Senza dati</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400 inline-block" /> Medica</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Sicurezza</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Entrambi</span>
              </div>
            </div>

            {/* Tracked pages table with inline accordion detail */}
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8"></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagina</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Visite</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">% Totale</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {summary.topPages.map((page, idx) => {
                      const percentage = summary.summary.totalViews > 0
                        ? ((page.views / summary.summary.totalViews) * 100).toFixed(1)
                        : '0';
                      const isSelected = selectedPageId === page.id;

                      return (
                        <Fragment key={page.id}>
                          {/* Main row */}
                          <tr
                            className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                            onClick={() => setSelectedPageId(isSelected ? null : page.id)}
                          >
                            <td className="px-4 py-3 text-center">
                              {isSelected
                                ? <ChevronDown className="w-4 h-4 text-blue-600 mx-auto" />
                                : <ChevronRight className="w-4 h-4 text-gray-400 mx-auto" />
                              }
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                                  <FileText className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 truncate">{page.title}</div>
                                  <div className="text-sm text-gray-500 truncate">/{page.slug}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <span className="text-lg font-semibold text-gray-900">
                                {formatNumber(page.views)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }} />
                                </div>
                                <span className="text-sm text-gray-600 w-12">{percentage}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
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

                          {/* Accordion detail row — rendered inline below the selected row */}
                          {isSelected && pageDetail && (
                            <tr>
                              <td colSpan={6} className="p-0 bg-blue-50/30 border-b-2 border-blue-200">
                                <div className="px-6 py-5">
                                  {/* Detail header */}
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-800">{pageDetail.page.title}</span>
                                      <span className="text-sm text-gray-500">/{pageDetail.page.slug}</span>
                                    </div>
                                    <button
                                      onClick={() => setSelectedPageId(null)}
                                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                                    >
                                      Chiudi ✕
                                    </button>
                                  </div>

                                  {/* Mini Stats */}
                                  <div className="grid grid-cols-3 gap-3 mb-5">
                                    <div className="text-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                      <div className="text-2xl font-bold text-gray-900">{pageDetail.summary.totalViews}</div>
                                      <div className="text-xs text-gray-500 mt-1">Visite totali</div>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                      <div className="text-2xl font-bold text-gray-900">{pageDetail.summary.uniqueVisitors}</div>
                                      <div className="text-xs text-gray-500 mt-1">Visitatori unici</div>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                      <div className="text-2xl font-bold text-gray-900">{formatDuration(pageDetail.summary.avgDuration)}</div>
                                      <div className="text-xs text-gray-500 mt-1">Tempo medio</div>
                                    </div>
                                  </div>

                                  {/* Views Over Time mini chart */}
                                  {pageDetail.viewsOverTime && pageDetail.viewsOverTime.length > 0 && (
                                    <div className="mb-5 bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                                      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Visite nel tempo</h3>
                                      <SimpleBarChart data={pageDetail.viewsOverTime} height={120} color="teal" />
                                    </div>
                                  )}

                                  {/* Breakdowns grid */}
                                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                                    {/* Dispositivi */}
                                    <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <Monitor className="w-3.5 h-3.5" /> Dispositivi
                                      </h3>
                                      <div className="space-y-1.5">
                                        {pageDetail.devices.length === 0 ? (
                                          <span className="text-xs text-gray-400">—</span>
                                        ) : pageDetail.devices.map((d) => (
                                          <div key={d.device} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-1.5">
                                              {getDeviceIcon(d.device)}
                                              <span className="capitalize text-gray-700">{d.device}</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{d.count}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* OS */}
                                    <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <Layers className="w-3.5 h-3.5" /> Sistema Operativo
                                      </h3>
                                      <div className="space-y-1.5">
                                        {(pageDetail.os ?? []).length === 0 ? (
                                          <span className="text-xs text-gray-400">—</span>
                                        ) : (pageDetail.os ?? []).slice(0, 5).map((o) => (
                                          <div key={o.os} className="flex items-center justify-between text-sm">
                                            <span className="truncate text-gray-700 max-w-[90px]" title={o.os}>{o.os}</span>
                                            <span className="font-semibold text-gray-900 ml-1">{o.count}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Browser */}
                                    <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <Globe className="w-3.5 h-3.5" /> Browser
                                      </h3>
                                      <div className="space-y-1.5">
                                        {pageDetail.browsers.length === 0 ? (
                                          <span className="text-xs text-gray-400">—</span>
                                        ) : pageDetail.browsers.slice(0, 5).map((b) => (
                                          <div key={b.browser} className="flex items-center justify-between text-sm">
                                            <span className="truncate text-gray-700 max-w-[90px]" title={b.browser}>{b.browser}</span>
                                            <span className="font-semibold text-gray-900 ml-1">{b.count}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Sorgenti */}
                                    <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <MousePointer className="w-3.5 h-3.5" /> Sorgenti
                                      </h3>
                                      <div className="space-y-1.5">
                                        {pageDetail.referers.length === 0 ? (
                                          <span className="text-xs text-gray-400">Traffico diretto</span>
                                        ) : pageDetail.referers.slice(0, 5).map((r, idx2) => {
                                          let label = r.referer || 'Diretto';
                                          try {
                                            const u = new URL(r.referer);
                                            label = u.hostname;
                                          } catch { /* non è un URL valido */ }
                                          return (
                                            <div key={idx2} className="flex items-center justify-between text-sm gap-1">
                                              <a
                                                href={r.referer.startsWith('http') ? r.referer : undefined}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={r.referer}
                                                className="truncate text-blue-600 hover:text-blue-800 hover:underline max-w-[100px]"
                                              >
                                                {label}
                                              </a>
                                              <span className="font-semibold text-gray-900 flex-shrink-0">{r.count}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Geolocalizzazione */}
                                    <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                                      <button
                                        className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
                                        onClick={() => setComuniExpanded(v => !v)}
                                      >
                                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Provenienza</span>
                                        {comuniExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                      </button>
                                      {(pageDetail.countries ?? []).length === 0 && (pageDetail.cities ?? []).length === 0 ? (
                                        <span className="text-xs text-gray-400">Dati non disponibili</span>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {(pageDetail.countries ?? []).slice(0, comuniExpanded ? undefined : 2).map((c) => (
                                            <div key={c.country} className="flex items-center justify-between text-sm">
                                              <span className="text-gray-700 flex items-center gap-1">
                                                <span className="text-base">{getFlagEmoji(c.country)}</span>
                                                <span className="text-xs">{c.country}</span>
                                              </span>
                                              <span className="font-semibold text-gray-900">{c.count}</span>
                                            </div>
                                          ))}
                                          {(pageDetail.cities ?? []).slice(0, comuniExpanded ? 10 : 3).map((c) => (
                                            <div key={c.city} className="flex items-center justify-between text-sm">
                                              <span className="truncate text-gray-600 text-xs max-w-[90px]" title={c.city}>{c.city}</span>
                                              <span className="font-semibold text-gray-900">{c.count}</span>
                                            </div>
                                          ))}
                                          {!comuniExpanded && (pageDetail.cities ?? []).length > 3 && (
                                            <button
                                              onClick={() => setComuniExpanded(true)}
                                              className="text-xs text-blue-500 hover:text-blue-700 mt-0.5"
                                            >
                                              +{(pageDetail.cities ?? []).length - 3} altri comuni
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Peak Hours mini bar */}
                                  {(pageDetail.peakHours ?? []).length > 0 && (
                                    <div className="mt-4 bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" /> Ore di punta (visite per ora del giorno)
                                      </h3>
                                      {(() => {
                                        const maxViews = Math.max(...pageDetail.peakHours.map(ph => ph.views), 1);
                                        const yMax = Math.ceil(maxViews / 5) * 5 || 1;
                                        return (
                                          <div className="flex gap-2">
                                            {/* Y-axis */}
                                            <div className="flex flex-col justify-between items-end flex-shrink-0 pb-4" style={{ width: '24px', height: '64px' }}>
                                              {[yMax, Math.round(yMax / 2), 0].map(v => (
                                                <span key={v} className="text-[9px] text-gray-400 leading-none">{v}</span>
                                              ))}
                                            </div>
                                            <div className="flex-1 flex flex-col">
                                              <div className="relative flex items-end gap-0.5" style={{ height: '48px' }}>
                                                {/* Gridlines */}
                                                <div className="absolute left-0 right-0 bottom-1/2 border-t border-gray-100 pointer-events-none" />
                                                <div className="absolute left-0 right-0 bottom-0 border-t border-gray-200 pointer-events-none" />
                                                {Array.from({ length: 24 }, (_, h) => {
                                                  const hourData = pageDetail.peakHours.find(ph => ph.hour === h);
                                                  const heightPct = hourData ? (hourData.views / yMax) * 100 : 0;
                                                  return (
                                                    <div
                                                      key={h}
                                                      className="flex-1 flex flex-col items-center justify-end group relative h-full"
                                                      title={`${h}:00 — ${hourData?.views ?? 0} visite`}
                                                    >
                                                      {hourData && hourData.views > 0 && (
                                                        <div className="absolute bottom-full mb-1 hidden group-hover:flex z-10 pointer-events-none">
                                                          <div className="bg-gray-900 text-white text-[9px] rounded py-0.5 px-1.5 whitespace-nowrap shadow">
                                                            {h}:00 · {hourData.views}
                                                          </div>
                                                        </div>
                                                      )}
                                                      <div
                                                        className="w-full bg-blue-400 hover:bg-blue-600 rounded-t-sm transition-colors cursor-default"
                                                        style={{ height: `${Math.max(heightPct, heightPct > 0 ? 4 : 0)}%` }}
                                                      />
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                              {/* X-axis hour labels */}
                                              <div className="flex items-center gap-0.5 mt-0.5" style={{ height: '12px' }}>
                                                {Array.from({ length: 24 }, (_, h) => (
                                                  <div key={h} className="flex-1 text-center">
                                                    {h % 6 === 0 && (
                                                      <span className="text-[9px] text-gray-400 leading-none">{h}h</span>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Loading row while detail is being fetched */}
                          {isSelected && !pageDetail && (
                            <tr>
                              <td colSpan={6} className="py-4 text-center text-sm text-gray-500 bg-blue-50/30">
                                <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                                Caricamento dettagli...
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CMSHub;
