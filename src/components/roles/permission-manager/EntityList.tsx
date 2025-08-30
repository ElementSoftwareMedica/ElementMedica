import React from 'react';
import { Search } from 'lucide-react';
import { EntityDefinition } from '../../../services/advancedPermissions';
import { ENTITY_ICON_MAP } from './constants';

interface EntityListProps {
  entities: EntityDefinition[];
  selectedEntity: EntityDefinition | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onEntitySelect: (entity: EntityDefinition) => void;
}

const EntityList: React.FC<EntityListProps> = ({
  entities,
  selectedEntity,
  searchTerm,
  onSearchChange,
  onEntitySelect
}) => {
  const getEntityIcon = (entityName: string) => {
    const IconComponent = ENTITY_ICON_MAP[entityName];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
  };

  return (
    <div className="bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Barra di ricerca */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cerca entità..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Lista entità */}
      <div className="flex-1 overflow-y-auto">
        {entities.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>Nessuna entità trovata</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {entities.map((entity) => (
              <button
                key={entity.name}
                type="button"
                onClick={() => onEntitySelect(entity)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedEntity?.name === entity.name
                    ? 'bg-blue-50 border border-blue-200 text-blue-900'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 ${
                    selectedEntity?.name === entity.name ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {getEntityIcon(entity.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {entity.displayName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {entity.fields.length} campi
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EntityList;