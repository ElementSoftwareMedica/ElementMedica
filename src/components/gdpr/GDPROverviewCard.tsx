/**
 * GDPR Overview Card Component
 * Displays overview statistics for GDPR dashboard
 * 
 * Redesigned with Tailwind CSS for consistency
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface GDPROverviewCardProps {
  title: string;
  icon: React.ReactNode;
  stats: {
    total: number;
    granted?: number;
    pending?: number;
    completed?: number;
    active?: number;
  };
  loading?: boolean;
  error?: string | null;
}

export const GDPROverviewCard: React.FC<GDPROverviewCardProps> = ({
  title,
  icon,
  stats,
  loading = false,
  error = null
}) => {
  const getMainValue = () => {
    if (stats.granted !== undefined) return stats.granted;
    if (stats.completed !== undefined) return stats.completed;
    if (stats.active !== undefined) return stats.active;
    return stats.total;
  };

  const getSecondaryValue = () => {
    if (stats.pending !== undefined) return stats.pending;
    return null;
  };

  const getPercentage = () => {
    const main = getMainValue();
    return stats.total > 0 ? Math.round((main / stats.total) * 100) : 0;
  };

  const getPercentageColor = () => {
    const pct = getPercentage();
    if (pct >= 80) return 'bg-emerald-100 text-emerald-700';
    if (pct >= 60) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
        <div className="flex items-center justify-center min-h-[120px]">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 h-full">
        <div className="bg-red-50 text-red-700 rounded-xl p-4">
          <p className="text-sm font-medium">Errore</p>
          <p className="text-xs mt-1 opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
          {icon}
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">
          {title}
        </h3>
      </div>

      {/* Main Stats */}
      <div className="mb-4">
        <p className="text-3xl font-bold text-gray-900">
          {getMainValue()}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">
          su {stats.total} totali
        </p>
      </div>

      {/* Secondary Stats */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${getPercentageColor()}`}>
          {getPercentage()}%
        </span>
        {getSecondaryValue() !== null && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
            {getSecondaryValue()} in attesa
          </span>
        )}
      </div>
    </div>
  );
};

export default GDPROverviewCard;