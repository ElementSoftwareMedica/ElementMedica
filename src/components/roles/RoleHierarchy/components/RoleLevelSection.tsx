/**
 * Component: RoleLevelSection
 * 
 * Collapsible section displaying all roles at a specific hierarchy level.
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { RoleCard } from './RoleCard';
import { getLevelColor, getLevelIcon, getLevelName } from '../utils/roleHelpers';
import type { RoleHierarchyLevel } from '../types';

interface RoleLevelSectionProps {
  level: number;
  roles: Array<{ roleType: string; data: RoleHierarchyLevel }>;
  isExpanded: boolean;
  onToggle: () => void;
  selectedRole: string | null;
  onRoleSelect: (roleType: string) => void;
  onRoleEdit: (roleType: string) => void;
  onRoleDelete: (roleType: string) => void;
  onRoleMove: (roleType: string) => void;
  canAssignRole: (roleType: string) => boolean;
  isCurrentUserRole: (roleType: string) => boolean;
  onRoleAssignment?: (roleType: string) => void;
}

export const RoleLevelSection: React.FC<RoleLevelSectionProps> = ({
  level,
  roles,
  isExpanded,
  onToggle,
  selectedRole,
  onRoleSelect,
  onRoleEdit,
  onRoleDelete,
  onRoleMove,
  canAssignRole,
  isCurrentUserRole,
  onRoleAssignment
}) => {
  if (!roles || roles.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full p-3 text-left flex items-center justify-between transition-all duration-300 ${getLevelColor(level)} ${!isExpanded ? 'rounded-lg' : 'rounded-t-lg'}`}
      >
        <div className="flex items-center">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 mr-2" />
          ) : (
            <ChevronRight className="h-4 w-4 mr-2" />
          )}
          <div className="mr-2">
            {React.cloneElement(getLevelIcon(level), { className: "w-4 h-4" })}
          </div>
          <div>
            <span className="font-medium text-sm">
              Livello {level}: {getLevelName(level)}
            </span>
            <div className="text-xs opacity-80 mt-0.5">
              {roles?.length || 0} ruol{(roles?.length || 0) !== 1 ? 'i' : 'o'} disponibil{(roles?.length || 0) !== 1 ? 'i' : 'e'}
            </div>
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {roles.map(({ roleType, data }) => (
              <RoleCard
                key={roleType}
                roleType={roleType}
                data={data}
                isCurrentUserRole={isCurrentUserRole(roleType)}
                canAssign={canAssignRole(roleType)}
                isSelected={selectedRole === roleType}
                onSelect={() => onRoleSelect(selectedRole === roleType ? '' : roleType)}
                onEdit={() => onRoleEdit(roleType)}
                onDelete={() => onRoleDelete(roleType)}
                onMove={() => onRoleMove(roleType)}
                onAssign={onRoleAssignment ? () => onRoleAssignment(roleType) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
