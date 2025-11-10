/**
 * PermissionHeader Component
 * 
 * Header for permissions section with bulk action buttons.
 */

import React from 'react';
import { Shield } from 'lucide-react';
import { Label } from '../../../../design-system/atoms/Label';

interface PermissionHeaderProps {
  totalSelectedPermissions: number;
  onSelectAll: () => void;
  onSelectNone: () => void;
}

export const PermissionHeader: React.FC<PermissionHeaderProps> = ({
  totalSelectedPermissions,
  onSelectAll,
  onSelectNone
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Shield className="h-5 w-5 text-blue-600" />
        <Label className="text-base font-medium">Permessi</Label>
      </div>
      <div className="flex items-center space-x-2">
        {totalSelectedPermissions > 0 && (
          <span className="text-sm text-gray-600">
            {totalSelectedPermissions} permessi selezionati
          </span>
        )}
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="px-4 py-2 bg-blue-500 text-white rounded-full text-xs font-medium hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Seleziona Tutti
          </button>
          <button
            type="button"
            onClick={onSelectNone}
            className="px-4 py-2 bg-gray-500 text-white rounded-full text-xs font-medium hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Deseleziona Tutti
          </button>
        </div>
      </div>
    </div>
  );
};
