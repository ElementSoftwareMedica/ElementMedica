/**
 * DocumentStatusSelector Component
 * 
 * Dropdown selector for document status with custom styling.
 */

import React from 'react';
import { Label } from '../../../../../design-system/atoms/Label';

export interface DocumentStatusSelectorProps {
  status: string;
  statusOptions: string[];
  showMenu: boolean;
  onStatusChange: (status: string) => void;
  onShowMenuChange: (show: boolean) => void;
}

export const DocumentStatusSelector: React.FC<DocumentStatusSelectorProps> = ({
  status,
  statusOptions,
  showMenu,
  onStatusChange,
  onShowMenuChange
}) => {
  return (
    <div>
      <Label>Stato Documentazione</Label>
      <div className="relative mt-1">
        <button
          type="button"
          className="w-full p-2.5 border dark:border-gray-600 rounded-lg flex justify-between items-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={() => onShowMenuChange(!showMenu)}
        >
          <span className="font-medium dark:text-gray-200">{status}</span>
          <span className="text-gray-400">▼</span>
        </button>

        {showMenu && (
          <div className="absolute left-0 right-0 mt-1 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-xl z-10">
            {statusOptions.map(s => (
              <div
                key={s}
                className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer first:rounded-t-lg last:rounded-b-lg transition-colors dark:text-gray-200"
                onClick={() => {
                  onStatusChange(s);
                  onShowMenuChange(false);
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
