/**
 * GDPR Page Header
 *
 * Header condiviso e coerente per le pagine GDPR (Consensi / Export / Audit).
 * Stile design-system (Tailwind) allineato al resto dell'app.
 */

import React from 'react';
import { RefreshCw, LucideIcon } from 'lucide-react';

interface GDPRPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Mostra il pulsante "Aggiorna" */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Contenuto extra a destra (badge, azioni) */
  rightSlot?: React.ReactNode;
}

export const GDPRPageHeader: React.FC<GDPRPageHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  onRefresh,
  refreshing = false,
  rightSlot
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-black/30 border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Icon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">{title}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {rightSlot}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Aggiorna
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GDPRPageHeader;
