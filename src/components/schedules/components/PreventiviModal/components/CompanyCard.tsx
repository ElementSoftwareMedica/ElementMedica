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
          ? 'border-orange-400 bg-orange-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/30'
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
            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-sm text-gray-800 truncate">
              {getCompanyName(company)}
            </span>
          </div>

          {/* Participants Input */}
          {config?.enabled && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <label className="text-xs text-gray-600">Partecipanti:</label>
                <input
                  type="number"
                  min="1"
                  value={config.numPartecipanti}
                  onChange={(e) => {
                    e.stopPropagation();
                    onUpdateParticipants(parseInt(e.target.value) || 1);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-20 px-2 py-1 border rounded text-sm text-center"
                />
              </div>

              {/* Preview Total */}
              {totals && (
                <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                  Totale: <span className="font-semibold text-orange-600">
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
