import React, { useState, useMemo } from 'react';
import { Check, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react';
import { EntityDefinition, EntityPermission } from '../../../services/advanced-permissions';
import { getPermission } from './utils';
import DeniedFieldsSelector from './DeniedFieldsSelector';

interface FieldsSectionProps {
  entity: EntityDefinition;
  selectedAction: string | null;
  permissions: EntityPermission[];
  bulkMode: boolean;
  selectedActions: Set<string>;
  onFieldToggle: (entity: string, action: string, fieldId: string, add: boolean) => void;
  onBulkFieldsApply: (fieldIds: string[], add: boolean) => void;
  onDeniedFieldsChange?: (entity: string, action: string, deniedFields: string[]) => void;
  onAllowedFieldsChange?: (entity: string, action: string, allowedFields: string[]) => void;
}

const FieldsSection: React.FC<FieldsSectionProps> = ({
  entity,
  selectedAction,
  permissions,
  bulkMode,
  selectedActions,
  onFieldToggle,
  onBulkFieldsApply,
  onDeniedFieldsChange,
  onAllowedFieldsChange
}) => {
  // Modalità avanzata per gestione campi negati
  const [advancedMode, setAdvancedMode] = useState(false);

  // Mostra sempre i campi quando un'entità è selezionata
  const showAllFields = !selectedAction && !bulkMode;

  // Ottieni i campi attuali del permesso selezionato
  const currentPermission = useMemo(() => {
    if (selectedAction) {
      return getPermission(permissions, entity.name, selectedAction);
    }
    return null;
  }, [permissions, entity.name, selectedAction]);

  const allowedFields = currentPermission?.fields || [];
  const deniedFields = currentPermission?.deniedFields || [];

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
    <div className="bg-white dark:bg-gray-800 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-50">
              {bulkMode
                ? 'Campi per Azioni Multiple'
                : selectedAction
                  ? `Campi per ${selectedAction}`
                  : 'Gestione Campi'
              }
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              {entity.fields.length} campi disponibili per {entity.displayName}
              {!selectedAction && !bulkMode && (
                <span className="text-orange-600 ml-1">• Seleziona un'azione nella colonna 2</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle modalità avanzata */}
            {selectedAction && !bulkMode && onDeniedFieldsChange && (
              <button
                type="button"
                onClick={() => setAdvancedMode(!advancedMode)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${advancedMode
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                title={advancedMode ? 'Modalità semplice' : 'Modalità avanzata (permetti/nega)'}
              >
                {advancedMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                <span>{advancedMode ? 'Avanzata' : 'Semplice'}</span>
              </button>
            )}

            {bulkMode && selectedActions.size > 0 && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contenuto: Lista campi o DeniedFieldsSelector */}
      {advancedMode && selectedAction && !bulkMode && onDeniedFieldsChange && onAllowedFieldsChange ? (
        <div className="flex-1 overflow-y-auto p-4">
          <DeniedFieldsSelector
            entity={entity}
            allowedFields={allowedFields}
            deniedFields={deniedFields}
            onAllowedFieldsChange={(fields: string[] | null) => onAllowedFieldsChange(entity.name, selectedAction, fields ?? [])}
            onDeniedFieldsChange={(fields: string[] | null) => onDeniedFieldsChange(entity.name, selectedAction, fields ?? [])}
          />
        </div>
      ) : (
        /* Lista campi standard */
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
                  className={`border rounded-lg p-3 transition-colors ${isSelected
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
                          className={`p-1 rounded transition-colors ${isSelected
                            ? 'text-blue-600 hover:bg-blue-100'
                            : isPartiallySelected
                              ? 'text-yellow-600 hover:bg-yellow-100'
                              : 'text-gray-400 hover:bg-gray-100'
                            }`}
                        >
                          {isSelected ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      ) : selectedAction ? (
                        <button
                          type="button"
                          onClick={() => onFieldToggle(entity.name, selectedAction, field.name, !isSelected)}
                          className={`p-1 rounded transition-colors ${isSelected
                            ? 'text-blue-600 hover:bg-blue-100'
                            : 'text-gray-400 hover:bg-gray-100'
                            }`}
                        >
                          {isSelected ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      ) : (
                        <span className="p-1 text-gray-300" title="Seleziona un'azione per modificare">
                          <Eye className="w-4 h-4" />
                        </span>
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
                              className={`text-xs px-2 py-1 rounded ${hasField
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
                              className={`text-xs px-2 py-1 rounded ${hasField
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
      )}
    </div>
  );
};

export default FieldsSection;