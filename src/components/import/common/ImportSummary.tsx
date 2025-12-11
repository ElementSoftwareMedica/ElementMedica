/**
 * @file ImportSummary.tsx
 * @description Componente per mostrare summary import con statistiche
 */

import React from 'react';
import { CheckCircle, AlertCircle, XCircle, FileText } from 'lucide-react';

export interface ImportSummaryData {
  total: number;
  selected: number;
  valid: number;
  withErrors: number;
  duplicates: number;
  conflicts: number;
}

interface ImportSummaryProps {
  summary: ImportSummaryData;
  entityType: string;
}

const ImportSummary: React.FC<ImportSummaryProps> = ({ summary, entityType }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-blue-800">Riepilogo Import {entityType}</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Total */}
        <div className="bg-white rounded p-3 border border-blue-100">
          <div className="text-xs text-gray-500 mb-1">Totale righe</div>
          <div className="text-2xl font-bold text-gray-800">{summary.total}</div>
        </div>

        {/* Selected */}
        <div className="bg-white rounded p-3 border border-blue-100">
          <div className="text-xs text-gray-500 mb-1">Selezionate</div>
          <div className="text-2xl font-bold text-blue-600">{summary.selected}</div>
        </div>

        {/* Valid */}
        <div className="bg-white rounded p-3 border border-green-100">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Valide
          </div>
          <div className="text-2xl font-bold text-green-600">{summary.valid}</div>
        </div>

        {/* With Errors */}
        <div className="bg-white rounded p-3 border border-red-100">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <XCircle className="w-3 h-3 text-red-500" />
            Con errori
          </div>
          <div className="text-2xl font-bold text-red-600">{summary.withErrors}</div>
        </div>

        {/* Duplicates */}
        {summary.duplicates > 0 && (
          <div className="bg-white rounded p-3 border border-yellow-100">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <AlertCircle className="w-3 h-3 text-yellow-500" />
              Duplicati CSV
            </div>
            <div className="text-2xl font-bold text-yellow-600">{summary.duplicates}</div>
          </div>
        )}

        {/* Conflicts */}
        {summary.conflicts > 0 && (
          <div className="bg-white rounded p-3 border border-orange-100">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <AlertCircle className="w-3 h-3 text-orange-500" />
              Conflitti DB
            </div>
            <div className="text-2xl font-bold text-orange-600">{summary.conflicts}</div>
          </div>
        )}
      </div>

      {/* Warning messages */}
      {(summary.withErrors > 0 || summary.duplicates > 0 || summary.conflicts > 0) && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="text-xs text-gray-600 space-y-1">
            {summary.withErrors > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <XCircle className="w-3 h-3" />
                {summary.withErrors} {summary.withErrors === 1 ? 'riga contiene' : 'righe contengono'} errori di validazione
              </div>
            )}
            {summary.duplicates > 0 && (
              <div className="flex items-center gap-1 text-yellow-600">
                <AlertCircle className="w-3 h-3" />
                {summary.duplicates} {summary.duplicates === 1 ? 'duplicato rilevato' : 'duplicati rilevati'} nel CSV
              </div>
            )}
            {summary.conflicts > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <AlertCircle className="w-3 h-3" />
                {summary.conflicts} {summary.conflicts === 1 ? 'conflitto' : 'conflitti'} con database esistente
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportSummary;
