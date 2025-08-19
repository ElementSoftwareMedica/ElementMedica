import React from 'react';
import { 
  Database,
  Lock,
  Settings,
  Shield
} from 'lucide-react';
import { Role } from '../../../hooks/useRoles';
import { EntityDefinition } from '../../../services/advancedPermissions';

interface PermissionManagerHeaderProps {
  role: Role;
  filteredEntitiesCount: number;
  selectedEntity: EntityDefinition | null;
  bulkMode: boolean;
  onBulkModeToggle: () => void;
}

const PermissionManagerHeader: React.FC<PermissionManagerHeaderProps> = ({
  role,
  filteredEntitiesCount,
  selectedEntity,
  bulkMode,
  onBulkModeToggle
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
      <div className="grid grid-cols-4 h-16">
        {/* Header Ruolo */}
        <div className="flex items-center px-4 border-r border-gray-200">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Ruolo Selezionato</h3>
              <p className="text-xs text-gray-600">{role.name}</p>
            </div>
          </div>
        </div>
        
        {/* Header Entità */}
        <div className="flex items-center px-4 border-r border-gray-200">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Entità del Sistema</h3>
              <p className="text-xs text-gray-600">{filteredEntitiesCount} entità</p>
            </div>
          </div>
        </div>
        
        {/* Header Permessi */}
        <div className="flex items-center justify-between px-4 border-r border-gray-200">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Permessi</h3>
              <p className="text-xs text-gray-600">
                {selectedEntity ? 'CRUD + Scope' : 'Seleziona entità'}
              </p>
            </div>
          </div>
          {selectedEntity && (
            <button
              type="button"
              onClick={onBulkModeToggle}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                bulkMode 
                  ? 'bg-orange-100 text-orange-700 border border-orange-300' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {bulkMode ? 'Singolo' : 'Multiplo'}
            </button>
          )}
        </div>
        
        {/* Header Campi */}
        <div className="flex items-center px-4">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Campi Specifici</h3>
              <p className="text-xs text-gray-600">
                {selectedEntity ? `${selectedEntity.fields.length} campi` : 'Seleziona azione'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionManagerHeader;