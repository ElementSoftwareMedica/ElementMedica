import React, { useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { Select } from '../../design-system/atoms/Select';
import { Input } from '../../design-system/atoms/Input';
import { Card } from '../../design-system/molecules/Card';

interface ConditionalRule {
  id: string;
  sourceFieldId: string; // Campo che triggera la condizione
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: string; // Valore da confrontare
  targetFieldIds: string[]; // Campi da mostrare/nascondere
  action: 'show' | 'hide' | 'require' | 'disable';
}

interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
}

interface ConditionalFieldsEditorProps {
  fields: FormField[];
  conditionalRules: ConditionalRule[];
  onChange: (rules: ConditionalRule[]) => void;
}

const operatorOptions = [
  { value: 'equals', label: 'è uguale a' },
  { value: 'not_equals', label: 'è diverso da' },
  { value: 'contains', label: 'contiene' },
  { value: 'greater_than', label: 'è maggiore di' },
  { value: 'less_than', label: 'è minore di' },
  { value: 'is_empty', label: 'è vuoto' },
  { value: 'is_not_empty', label: 'non è vuoto' }
];

const actionOptions = [
  { value: 'show', label: 'Mostra campi' },
  { value: 'hide', label: 'Nascondi campi' },
  { value: 'require', label: 'Rendi obbligatori' },
  { value: 'disable', label: 'Disabilita campi' }
];

/**
 * Editor per configurare logica condizionale nei form
 * Esempio: "Se Servizio = RSPP, mostra campo Numero Dipendenti"
 */
export const ConditionalFieldsEditor: React.FC<ConditionalFieldsEditorProps> = ({
  fields,
  conditionalRules = [],
  onChange
}) => {
  const [editingRule, setEditingRule] = useState<ConditionalRule | null>(null);

  const createNewRule = () => {
    const newRule: ConditionalRule = {
      id: `rule_${Date.now()}`,
      sourceFieldId: '',
      operator: 'equals',
      value: '',
      targetFieldIds: [],
      action: 'show'
    };
    setEditingRule(newRule);
  };

  const saveRule = () => {
    if (!editingRule || !editingRule.sourceFieldId || editingRule.targetFieldIds.length === 0) {
      return;
    }

    const existingIndex = conditionalRules.findIndex(r => r.id === editingRule.id);
    if (existingIndex >= 0) {
      const updated = [...conditionalRules];
      updated[existingIndex] = editingRule;
      onChange(updated);
    } else {
      onChange([...conditionalRules, editingRule]);
    }
    setEditingRule(null);
  };

  const deleteRule = (ruleId: string) => {
    onChange(conditionalRules.filter(r => r.id !== ruleId));
  };

  const updateEditingRule = (updates: Partial<ConditionalRule>) => {
    if (editingRule) {
      setEditingRule({ ...editingRule, ...updates });
    }
  };

  const getFieldLabel = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    return field ? field.label || field.name : fieldId;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Logica Condizionale
            <span className="ml-2 text-xs text-gray-500">
              (mostra/nascondi campi in base alle risposte)
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Esempio: mostra "Numero Dipendenti" solo se l'utente seleziona "Richiesta RSPP"
          </p>
        </div>
        
        {!editingRule && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={createNewRule}
            leftIcon={<Plus className="h-4 w-4" />}
            disabled={fields.length < 2}
          >
            Aggiungi Regola
          </Button>
        )}
      </div>

      {fields.length < 2 && (
        <p className="text-sm text-amber-600">
          ⚠️ Aggiungi almeno 2 campi per creare regole condizionali
        </p>
      )}

      {/* Regole esistenti */}
      {conditionalRules.length > 0 && !editingRule && (
        <div className="space-y-2">
          {conditionalRules.map((rule) => {
            const sourceField = getFieldLabel(rule.sourceFieldId);
            const targetFields = rule.targetFieldIds.map(getFieldLabel).join(', ');
            const operator = operatorOptions.find(o => o.value === rule.operator)?.label || rule.operator;
            const action = actionOptions.find(a => a.value === rule.action)?.label || rule.action;

            return (
              <Card key={rule.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium">Se</span>
                      {' '}<span className="text-blue-600">{sourceField}</span>
                      {' '}<span className="text-gray-600">{operator}</span>
                      {rule.operator !== 'is_empty' && rule.operator !== 'is_not_empty' && (
                        <> {' '}<span className="font-mono text-sm bg-gray-100 px-1 rounded">"{rule.value}"</span></>
                      )}
                      <br />
                      <span className="font-medium">{action}:</span>
                      {' '}<span className="text-green-600">{targetFields}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingRule(rule)}
                    >
                      Modifica
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Editor regola */}
      {editingRule && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Configura Regola Condizionale
            </h4>

            {/* Campo sorgente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Se il campo
              </label>
              <Select
                value={editingRule.sourceFieldId}
                onChange={(e) => updateEditingRule({ sourceFieldId: e.target.value })}
                options={fields.map(f => ({ value: f.id, label: f.label || f.name }))}
                placeholder="Seleziona campo..."
              />
            </div>

            {/* Operatore */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operatore
              </label>
              <Select
                value={editingRule.operator}
                onChange={(e) => updateEditingRule({ operator: e.target.value as any })}
                options={operatorOptions}
              />
            </div>

            {/* Valore (solo per operatori che lo richiedono) */}
            {editingRule.operator !== 'is_empty' && editingRule.operator !== 'is_not_empty' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valore
                </label>
                <Input
                  value={editingRule.value}
                  onChange={(e) => updateEditingRule({ value: e.target.value })}
                  placeholder="Valore da confrontare..."
                />
              </div>
            )}

            {/* Azione */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Azione
              </label>
              <Select
                value={editingRule.action}
                onChange={(e) => updateEditingRule({ action: e.target.value as any })}
                options={actionOptions}
              />
            </div>

            {/* Campi target (multiselect simulato) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campi da {editingRule.action === 'show' ? 'mostrare' : 
                          editingRule.action === 'hide' ? 'nascondere' : 
                          editingRule.action === 'require' ? 'rendere obbligatori' : 'disabilitare'}
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                {fields
                  .filter(f => f.id !== editingRule.sourceFieldId)
                  .map(field => (
                    <label key={field.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRule.targetFieldIds.includes(field.id)}
                        onChange={(e) => {
                          const targetIds = e.target.checked
                            ? [...editingRule.targetFieldIds, field.id]
                            : editingRule.targetFieldIds.filter(id => id !== field.id);
                          updateEditingRule({ targetFieldIds: targetIds });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{field.label || field.name}</span>
                    </label>
                  ))}
              </div>
              {editingRule.targetFieldIds.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Seleziona almeno un campo target
                </p>
              )}
            </div>

            {/* Azioni */}
            <div className="flex justify-end gap-2 pt-2 border-t border-blue-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingRule(null)}
              >
                Annulla
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveRule}
                disabled={!editingRule.sourceFieldId || editingRule.targetFieldIds.length === 0}
              >
                Salva Regola
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ConditionalFieldsEditor;
