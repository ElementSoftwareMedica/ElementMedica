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
      <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
        <div className="text-xs text-blue-600 mb-1">Partecipanti</div>
        <div className="text-2xl font-bold text-blue-700">{selectedPersonsCount}</div>
      </div>
      <div className="p-3 border rounded-lg bg-purple-50 border-purple-200">
        <div className="text-xs text-purple-600 mb-1">Aziende</div>
        <div className="text-2xl font-bold text-purple-700">{selectedCompaniesCount}</div>
      </div>
      <div className="p-3 border rounded-lg bg-green-50 border-green-200">
        <div className="text-xs text-green-600 mb-1">Sessioni</div>
        <div className="text-2xl font-bold text-green-700">{datesCount}</div>
      </div>
    </div>
  );
};
