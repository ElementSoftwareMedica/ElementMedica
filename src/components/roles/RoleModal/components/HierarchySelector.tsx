/**
 * HierarchySelector Component
 * 
 * Parent role selector with radio buttons and hierarchy information.
 */

import React from 'react';
import { Label } from '../../../../design-system/atoms/Label';
import type { HierarchyLevel } from '../types';

interface HierarchySelectorProps {
  currentLevel: number;
  parentRoleType: string;
  availableParentRoles: [string, HierarchyLevel][];
  canHaveParent: boolean;
  onParentChange: (roleType: string) => void;
  loading: boolean;
}

export const HierarchySelector: React.FC<HierarchySelectorProps> = ({
  currentLevel,
  parentRoleType,
  availableParentRoles,
  canHaveParent,
  onParentChange,
  loading
}) => {
  return (
    <div className="space-y-3">
      <Label htmlFor="parentRoleType" className="text-sm font-medium text-gray-700">
        Ruolo Genitore
      </Label>
      
      {canHaveParent ? (
        <div className="space-y-3 max-h-48 overflow-y-auto border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <input
              type="radio"
              name="parentRole"
              value=""
              checked={!parentRoleType}
              onChange={() => onParentChange('')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              disabled={loading}
            />
            <Label className="text-sm text-gray-600 cursor-pointer">
              Nessun genitore specifico
            </Label>
          </div>
          
          {availableParentRoles.map(([roleType, roleData]) => (
            <div key={roleType} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="parentRole"
                value={roleType}
                checked={parentRoleType === roleType}
                onChange={() => onParentChange(roleType)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-1"
                disabled={loading}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Label className="font-medium text-gray-900 cursor-pointer">
                    {roleData?.name || roleType}
                  </Label>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Livello {roleData?.level}
                  </span>
                </div>
                {roleData?.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {roleData.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-sm text-gray-600">
            I ruoli di livello 1 non possono avere un genitore
          </p>
        </div>
      )}
      
      <p className="text-xs text-gray-500">
        {canHaveParent 
          ? `Seleziona un ruolo genitore dal livello ${currentLevel - 1} (opzionale)`
          : 'I ruoli di livello 1 sono ruoli radice'
        }
      </p>
    </div>
  );
};
