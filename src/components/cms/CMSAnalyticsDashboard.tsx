/**
 * CMS Analytics Dashboard Component
 * Mostra statistiche e insights sulle visite alle pagine CMS pubbliche
 */

import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  RefreshCw,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import {
  getAnalyticsSummary,
  getPageDetailedAnalytics,
  type AnalyticsSummary,
  type PageDetailedAnalytics
} from '../../services/cmsAnalyticsService';

interface CMSAnalyticsDashboardProps {
  onBack?: () => void;
  className?: string;
}

type PeriodOption = '7d' | '30d' | '90d' | '1y';

const periodLabels: Record<PeriodOption, string> = {
  '7d': 'Ultimi 7 giorni',
  '30d': 'Ultimi 30 giorni',
  '90d': 'Ultimi 90 giorni',
  '1y': 'Ultimo anno'
};

const CMSAnalyticsDashboard: React.FC<CMSAnalyticsDashboardProps> = ({
  onBack,
  className = ''
}) => {
  const [period, setPeriod] = useState<PeriodOption>('30d');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [pageDetail, setPageDetail] = useState<PageDetailedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carica dati summary
  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAnalyticsSummary(period);
        setSummary(data);
      } catch (err) {
        console.error('Failed to load analytics summary:', err);
        setError('Errore nel caricamento delle statistiche');
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, [period]);

  // Carica dettagli pagina selezionata
  useEffect(() => {
    if (!selectedPage) {
      setPageDetail(null);
      return;
    }

    const loadPageDetail = async () => {
      try {
        const data = await getPageDetailedAnalytics(selectedPage, {
          groupBy: period === '7d' ? 'day' : period === '30d' ? 'day' : 'week'
        });
        setPageDetail(data);
      } catch (err) {
        console.error('Failed to load page analytics:', err);
      }
    };
    loadPageDetail();
  }, [selectedPage, period]);

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

  if (loading && !summary) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  // Vista dettaglio pagina
  if (selectedPage && pageDetail) {
    return (
      <div className={`p-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedPage(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {pageDetail.page.title}
              </h2>
              <p className="text-sm text-gray-500">/{pageDetail.page.slug}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Eye className="w-4 h-4" />
              <span className="text-sm">Visualizzazioni</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(pageDetail.summary.totalViews)}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">Visitatori Unici</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(pageDetail.summary.uniqueVisitors)}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Tempo Medio</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatDuration(pageDetail.summary.avgDuration)}
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Devices */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-medium text-gray-900 mb-4">Dispositivi</h3>
            <div className="space-y-3">
              {pageDetail.devices.map((d) => {
                const total = pageDetail.devices.reduce((acc, x) => acc + x.count, 0);
                const percentage = total > 0 ? (d.count / total * 100).toFixed(1) : 0;
                return (
                  <div key={d.device} className="flex items-center gap-3">
                    {getDeviceIcon(d.device)}
                    <span className="text-sm text-gray-600 capitalize w-20">{d.device}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-16 text-right">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Browsers */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-medium text-gray-900 mb-4">Browser</h3>
            <div className="space-y-2">
              {pageDetail.browsers.slice(0, 5).map((b) => (
                <div key={b.browser} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{b.browser}</span>
                  <span className="text-sm font-medium text-gray-900">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Referers */}
          <div className="bg-white rounded-xl border p-4 lg:col-span-2">
            <h3 className="font-medium text-gray-900 mb-4">Sorgenti di Traffico</h3>
            <div className="space-y-2">
              {pageDetail.referers.length === 0 ? (
                <p className="text-sm text-gray-500">Nessun referrer tracciato</p>
              ) : (
                pageDetail.referers.slice(0, 5).map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate max-w-[300px]">
                      {r.referer || 'Accesso diretto'}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{r.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista principale
  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics CMS</h1>
            <p className="text-sm text-gray-500">Statistiche e insights sulle pagine pubbliche</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodOption)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {summary && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Visualizzazioni</span>
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {formatNumber(summary.summary.totalViews)}
              </div>
              <div className={`mt-1 text-sm flex items-center gap-1 ${
                summary.summary.viewsTrend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary.summary.viewsTrend >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(summary.summary.viewsTrend).toFixed(1)}% vs periodo precedente
              </div>
            </div>

            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Users className="w-4 h-4" />
                <span className="text-sm">Visitatori Unici</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {formatNumber(summary.summary.uniqueVisitors)}
              </div>
            </div>

            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm">Media Giornaliera</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {summary.summary.avgViewsPerDay}
              </div>
            </div>

            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Monitor className="w-4 h-4" />
                <span className="text-sm">Dispositivi</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {Object.entries(summary.devices).map(([device, count]) => (
                  <div key={device} className="flex items-center gap-1 text-sm">
                    {getDeviceIcon(device)}
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Pages */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Pagine più visitate</h2>
            </div>
            <div className="divide-y">
              {summary.topPages.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nessun dato disponibile per il periodo selezionato</p>
                </div>
              ) : (
                summary.topPages.map((page, idx) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedPage(page.id)}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-gray-200 text-gray-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">{page.title}</div>
                        <div className="text-sm text-gray-500">/{page.slug}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">{formatNumber(page.views)}</div>
                        <div className="text-sm text-gray-500">visualizzazioni</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CMSAnalyticsDashboard;
