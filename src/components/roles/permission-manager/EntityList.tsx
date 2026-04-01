import React from 'react';
import { Search } from 'lucide-react';
import { EntityDefinition } from '../../../services/advanced-permissions';
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
    <div className="bg-white dark:bg-gray-800 h-full flex flex-col">
      {/* Barra di ricerca */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cerca entità..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Lista entità - scroll interno */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {entities.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <p>Nessuna entità trovata</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {entities.map((entity) => (
              <button
                key={entity.name}
                type="button"
                onClick={() => onEntitySelect(entity)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${selectedEntity?.name === entity.name
                  ? 'bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 text-violet-900 dark:text-violet-100'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 ${selectedEntity?.name === entity.name ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                    {getEntityIcon(entity.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-gray-900 dark:text-gray-50">
                      {entity.displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
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