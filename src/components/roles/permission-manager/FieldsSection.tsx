import React from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { EntityDefinition, EntityPermission } from '../../../services/advancedPermissions';
import { getPermission } from './utils';

interface FieldsSectionProps {
  entity: EntityDefinition;
  selectedAction: string | null;
  permissions: EntityPermission[];
  bulkMode: boolean;
  selectedActions: Set<string>;
  onFieldToggle: (entity: string, action: string, fieldId: string, add: boolean) => void;
  onBulkFieldsApply: (fieldIds: string[], add: boolean) => void;
}

const FieldsSection: React.FC<FieldsSectionProps> = ({
  entity,
  selectedAction,
  permissions,
  bulkMode,
  selectedActions,
  onFieldToggle,
  onBulkFieldsApply
}) => {
  // Mostra sempre i campi quando un'entità è selezionata
  const showAllFields = !selectedAction && !bulkMode;

  const getFieldPermissions = (fieldId: string): { [action: string]: boolean } => {
    const result: { [action: string]: boolean } = {};
    
    if (bulkMode) {
      selectedActions.forEach(action => {
        const permission = getPermission(permissions, entity.name, action);
        result[action] = permission?.fields?.includes(fieldId) || false;
      });
    } else if (selectedAction) {
      const permission = getPermission(permissions, entity.name, selectedAction);
      result[selectedAction] = permission?.fields?.includes(fieldId) || false;
    } else if (showAllFields) {
      // Quando nessuna azione è selezionata, mostra lo stato per tutte le azioni CRUD
      ['create', 'read', 'update', 'delete'].forEach(action => {
        const permission = getPermission(permissions, entity.name, action);
        result[action] = permission?.fields?.includes(fieldId) || false;
      });
    }
    
    return result;
  };

  const isFieldSelectedInAllActions = (fieldId: string): boolean => {
    if (!bulkMode || selectedActions.size === 0) return false;
    
    return Array.from(selectedActions).every(action => {
      const permission = getPermission(permissions, entity.name, action);
      return permission?.fields?.includes(fieldId) || false;
    });
  };

  const isFieldSelectedInSomeActions = (fieldId: string): boolean => {
    if (!bulkMode || selectedActions.size === 0) return false;
    
    return Array.from(selectedActions).some(action => {
      const permission = getPermission(permissions, entity.name, action);
      return permission?.fields?.includes(fieldId) || false;
    });
  };

  return (
    <div className="bg-white h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">
              {bulkMode 
                ? 'Campi per Azioni Multiple' 
                : selectedAction 
                  ? `Campi per ${selectedAction}` 
                  : 'Campi Disponibili'
              }
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              {entity.fields.length} campi disponibili per {entity.displayName}
              {showAllFields && ' (tutte le azioni)'}
            </p>
          </div>
          
          {bulkMode && selectedActions.size > 0 && (
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => onBulkFieldsApply(entity.fields.map(f => f.name), true)}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Aggiungi Tutti
              </button>
              <button
                type="button"
                onClick={() => onBulkFieldsApply(entity.fields.map(f => f.name), false)}
                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Rimuovi Tutti
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Lista campi */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {entity.fields.map((field) => {
            const fieldPermissions = getFieldPermissions(field.name);
            const isSelected = bulkMode 
              ? isFieldSelectedInAllActions(field.name)
              : fieldPermissions[selectedAction!] || false;
            const isPartiallySelected = bulkMode && isFieldSelectedInSomeActions(field.name) && !isFieldSelectedInAllActions(field.name);
            
            return (
              <div
                key={field.name}
                className={`border rounded-lg p-3 transition-colors ${
                  isSelected 
                    ? 'border-blue-300 bg-blue-50' 
                    : isPartiallySelected
                    ? 'border-yellow-300 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        ) : isPartiallySelected ? (
                          <div className="w-5 h-5 bg-yellow-500 rounded flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {field.displayName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {field.name} • {field.type || 'string'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 ml-3">
                    {bulkMode ? (
                      <button
                        type="button"
                        onClick={() => {
                          const shouldAdd = !isFieldSelectedInAllActions(field.name);
                          onBulkFieldsApply([field.name], shouldAdd);
                        }}
                        className={`p-1 rounded transition-colors ${
                          isSelected 
                            ? 'text-blue-600 hover:bg-blue-100' 
                            : isPartiallySelected
                            ? 'text-yellow-600 hover:bg-yellow-100'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {isSelected ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onFieldToggle(entity.name, selectedAction!, field.name, !isSelected)}
                        className={`p-1 rounded transition-colors ${
                          isSelected 
                            ? 'text-blue-600 hover:bg-blue-100' 
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {isSelected ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Dettagli per modalità bulk */}
                {bulkMode && selectedActions.size > 1 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex flex-wrap gap-1">
                      {Array.from(selectedActions).map(action => {
                        const hasField = fieldPermissions[action];
                        return (
                          <span
                            key={action}
                            className={`text-xs px-2 py-1 rounded ${
                              hasField 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {action}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Dettagli per visualizzazione di tutti i campi */}
                {showAllFields && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex flex-wrap gap-1">
                      {['create', 'read', 'update', 'delete'].map(action => {
                        const hasField = fieldPermissions[action];
                        return (
                          <span
                            key={action}
                            className={`text-xs px-2 py-1 rounded ${
                              hasField 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {action}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FieldsSection;