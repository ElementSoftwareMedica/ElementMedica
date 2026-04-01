/**
 * @file ImportConflictResolutionPanel.tsx
 * @description Pannello generico per risoluzione conflitti import
 * Usato da Company/Employee/Trainer import per gestire duplicati
 */

import React from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';

export interface ConflictItem {
  index: number;
  existingItem: any;
  newItem: any;
  conflictKey: string;
  conflictValue: string;
}

export interface ConflictResolution {
  action: 'skip' | 'overwrite';
  itemId?: string;
}

interface ImportConflictResolutionPanelProps {
  conflicts: Map<number, ConflictItem>;
  resolutions: Map<number, ConflictResolution>;
  onResolutionChange: (index: number, resolution: ConflictResolution) => void;
  entityType: string;
  displayFields: string[];
  getFieldLabel: (field: string) => string;
  getFieldValue: (item: any, field: string) => string;
}

const ImportConflictResolutionPanel: React.FC<ImportConflictResolutionPanelProps> = ({
  conflicts,
  resolutions,
  onResolutionChange,
  entityType,
  displayFields,
  getFieldLabel,
  getFieldValue
}) => {
  if (conflicts.size === 0) return null;

  return (
    <div className="mt-4 border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
          Conflitti rilevati ({conflicts.size})
        </h3>
      </div>

      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
        Alcuni {entityType} nel CSV corrispondono a {entityType} già presenti nel database.
        Scegli l'azione per ciascun conflitto:
      </p>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {Array.from(conflicts.entries()).map(([index, conflict]) => {
          const resolution = resolutions.get(index);

          return (
            <div key={index} className="bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
              {/* Header conflitto */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Riga {index + 1}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded">
                    {conflict.conflictKey}: {conflict.conflictValue}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onResolutionChange(index, { action: 'skip' })}
                    className={`px-3 py-1 text-xs rounded ${resolution?.action === 'skip'
                        ? 'bg-gray-600 dark:bg-gray-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    <X className="w-3 h-3 inline mr-1" />
                    Salta
                  </button>
                  <button
                    onClick={() =>
                      onResolutionChange(index, {
                        action: 'overwrite',
                        itemId: conflict.existingItem.id
                      })
                    }
                    className={`px-3 py-1 text-xs rounded ${resolution?.action === 'overwrite'
                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                        : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                      }`}
                  >
                    <ArrowRight className="w-3 h-3 inline mr-1" />
                    Sovrascrivi
                  </button>
                </div>
              </div>

              {/* Data comparison */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Existing item */}
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded p-2">
                  <div className="font-semibold text-red-800 dark:text-red-200 mb-2">Database</div>
                  {displayFields.map(field => {
                    const existingValue = getFieldValue(conflict.existingItem, field);
                    const newValue = getFieldValue(conflict.newItem, field);
                    const isDifferent = existingValue !== newValue;

                    return (
                      <div key={field} className="mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{getFieldLabel(field)}:</span>{' '}
                        <span className={isDifferent ? 'font-medium text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}>
                          {existingValue || '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* New item */}
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded p-2">
                  <div className="font-semibold text-green-800 dark:text-green-200 mb-2">CSV</div>
                  {displayFields.map(field => {
                    const existingValue = getFieldValue(conflict.existingItem, field);
                    const newValue = getFieldValue(conflict.newItem, field);
                    const isDifferent = existingValue !== newValue;

                    return (
                      <div key={field} className="mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{getFieldLabel(field)}:</span>{' '}
                        <span className={isDifferent ? 'font-medium text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}>
                          {newValue || '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ImportConflictResolutionPanel;
