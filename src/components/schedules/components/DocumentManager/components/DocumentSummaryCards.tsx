/**
 * DocumentSummaryCards Component
 * 
 * Displays summary statistics in a 3-card grid layout.
 */

import React from 'react';

export interface DocumentSummaryCardsProps {
  selectedPersonsCount: number;
  selectedCompaniesCount: number;
  datesCount: number;
}

export const DocumentSummaryCards: React.FC<DocumentSummaryCardsProps> = ({
  selectedPersonsCount,
  selectedCompaniesCount,
  datesCount
}) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
        <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Partecipanti</div>
        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{selectedPersonsCount}</div>
      </div>
      <div className="p-3 border rounded-lg bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800">
        <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Aziende</div>
        <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{selectedCompaniesCount}</div>
      </div>
      <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
        <div className="text-xs text-green-600 dark:text-green-400 mb-1">Sessioni</div>
        <div className="text-2xl font-bold text-green-700 dark:text-green-300">{datesCount}</div>
      </div>
    </div>
  );
};
