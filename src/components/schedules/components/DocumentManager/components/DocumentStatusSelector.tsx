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
          className="w-full p-2.5 border rounded-lg flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
          onClick={() => onShowMenuChange(!showMenu)}
        >
          <span className="font-medium">{status}</span>
          <span className="text-gray-400">▼</span>
        </button>

        {showMenu && (
          <div className="absolute left-0 right-0 mt-1 border rounded-lg bg-white shadow-xl z-10">
            {statusOptions.map(s => (
              <div
                key={s}
                className="p-2.5 hover:bg-blue-50 cursor-pointer first:rounded-t-lg last:rounded-b-lg transition-colors"
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
