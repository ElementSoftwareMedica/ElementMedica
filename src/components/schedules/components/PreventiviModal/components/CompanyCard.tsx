import React from 'react';
import { Building2, Users, Check } from 'lucide-react';
import { getCompanyName } from '../utils/preventivoHelpers';
import type { Company, CompanyConfig, CompanyTotals } from '../types';

interface CompanyCardProps {
  company: Company;
  config?: CompanyConfig;
  totals?: CompanyTotals;
  isSelected: boolean;
  onSelect: () => void;
  onToggleEnabled: () => void;
  onUpdateParticipants: (count: number) => void;
}

/**
 * Company card component with configuration controls
 * 
 * Displays company name, enabled toggle, participants input, and total preview
 */
export function CompanyCard({
  company,
  config,
  totals,
  isSelected,
  onSelect,
  onToggleEnabled,
  onUpdateParticipants
}: CompanyCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        p-3 rounded-lg border-2 cursor-pointer transition-all
        ${isSelected
          ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/30 shadow-sm'
          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-orange-200 dark:hover:border-orange-600 hover:bg-orange-50/30 dark:hover:bg-orange-900/20'
        }
        ${!config?.enabled ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled();
            }}
            className={`
              w-5 h-5 rounded border-2 flex items-center justify-center
              transition-colors
              ${config?.enabled
                ? 'bg-orange-500 border-orange-500'
                : 'bg-white border-gray-300'
              }
            `}
          >
            {config?.enabled && <Check className="w-3 h-3 text-white" />}
          </button>
        </div>

        <div className="flex-1 min-w-0">
          {/* Company Name */}
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
              {getCompanyName(company)}
            </span>
          </div>

          {/* Participants Input */}
          {config?.enabled && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <label className="text-xs text-gray-600 dark:text-gray-400">Partecipanti:</label>
                <input
                  type="number"
                  min="1"
                  value={config.numPartecipanti}
                  onChange={(e) => {
                    e.stopPropagation();
                    onUpdateParticipants(parseInt(e.target.value) || 1);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-20 px-2 py-1 border dark:border-gray-600 rounded text-sm text-center dark:bg-gray-700 dark:text-gray-200"
                />
              </div>

              {/* Preview Total */}
              {totals && (
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded border dark:border-gray-600">
                  Totale: <span className="font-semibold text-orange-600 dark:text-orange-400">
                    €{totals.importoFinale.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
