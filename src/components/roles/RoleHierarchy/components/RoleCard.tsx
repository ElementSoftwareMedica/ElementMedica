/**
 * Component: RoleCard
 * 
 * Individual role card displaying role details, permissions, and actions.
 */

import React from 'react';
import { Edit, Trash2, Move } from 'lucide-react';
import { getRoleIcon } from '../utils/roleHelpers';
import type { RoleHierarchyLevel } from '../types';

interface RoleCardProps {
  roleType: string;
  data: RoleHierarchyLevel;
  isCurrentUserRole: boolean;
  canAssign: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: () => void;
  onAssign?: () => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  roleType,
  data,
  isCurrentUserRole,
  canAssign,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onMove,
  onAssign
}) => {
  return (
    <div
      className={`p-3 border-2 rounded-lg transition-all duration-300 cursor-pointer hover:shadow-md transform hover:scale-101 ${
        isCurrentUserRole
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : canAssign
          ? 'border-green-400 bg-green-50 hover:border-green-500'
          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
      } ${isSelected ? 'ring-2 ring-blue-300' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          {React.cloneElement(getRoleIcon(roleType), { className: "w-3.5 h-3.5" })}
          <h4 className="font-medium text-sm text-gray-900 ml-1.5">{data.name}</h4>
        </div>
        <div className="flex items-center space-x-1">
          {isCurrentUserRole && (
            <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-medium">
              TUO
            </span>
          )}
          
          {/* Pulsanti azioni CRUD */}
          <div className="flex space-x-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
              title="Modifica ruolo"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMove();
              }}
              className="p-1 text-amber-600 hover:bg-amber-100 rounded transition-colors"
              title="Sposta ruolo"
            >
              <Move className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
              title="Elimina ruolo"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{data.description}</p>
      
      <div className="space-y-2">
        <div>
          <span className="text-xs font-medium text-gray-700 block mb-1">Ruoli assegnabili:</span>
          <div className="text-xs text-gray-600">
            {data.assignableRoles && data.assignableRoles.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {data.assignableRoles.slice(0, 2).map((role: string) => (
                  <span key={role} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                    {role}
                  </span>
                ))}
                {data.assignableRoles.length > 2 && (
                  <span className="text-gray-500 px-1.5 py-0.5 text-xs">
                    +{data.assignableRoles.length - 2}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-gray-400 italic text-xs">Nessuno</span>
            )}
          </div>
        </div>
        
        <div>
          <span className="text-xs font-medium text-gray-700 block mb-1">Permessi:</span>
          <div className="text-xs text-gray-600">
            {data.permissions?.length > 0 ? (
              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs">
                {data.permissions.length} permess{data.permissions.length !== 1 ? 'i' : 'o'}
              </span>
            ) : (
              <span className="text-gray-400 italic text-xs">Nessuno</span>
            )}
          </div>
        </div>
      </div>
      
      {canAssign && onAssign && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAssign();
          }}
          className="mt-3 w-full text-xs bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1.5 rounded hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-medium shadow-sm hover:shadow-md transform hover:scale-105"
        >
          Assegna Ruolo
        </button>
      )}
    </div>
  );
};
