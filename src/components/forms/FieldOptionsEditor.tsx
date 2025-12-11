import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { Input } from '../../design-system/atoms/Input';

interface FieldOption {
  value: string;
  label: string;
  maxCapacity?: number; // Limite posti disponibili (es. 10 iscrizioni per giorno)
  currentCount?: number; // Conteggio attuale submissions con questa opzione
  isCorrect?: boolean; // Per quiz: indica se è la risposta corretta
  points?: number; // Punti assegnati se selezionata (per scoring)
}

interface FieldOptionsEditorProps {
  options: FieldOption[];
  onChange: (options: FieldOption[]) => void;
  fieldType: 'select' | 'radio' | 'checkbox' | 'multiple_choice'; // Aggiunto multiple_choice per quiz
  enableCapacityLimit?: boolean; // Abilita limiti di capacità per opzione
  enableCorrectAnswer?: boolean; // Abilita marcatura risposta corretta (quiz)
  enableScoring?: boolean; // Abilita sistema punti
}

/**
 * Componente per editare le opzioni di campi select, radio, checkbox
 * Supporta drag & drop per riordinare (TODO: implementare drag & drop)
 */
export const FieldOptionsEditor: React.FC<FieldOptionsEditorProps> = ({
  options = [],
  onChange,
  fieldType,
  enableCapacityLimit = false,
  enableCorrectAnswer = false,
  enableScoring = false
}) => {
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionCapacity, setNewOptionCapacity] = useState<number>(0);

  const addOption = () => {
    if (!newOptionLabel.trim()) return;
    
    const newOption: FieldOption = {
      value: newOptionLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      label: newOptionLabel.trim(),
      ...(enableCapacityLimit && newOptionCapacity > 0 && { 
        maxCapacity: newOptionCapacity,
        currentCount: 0 
      }),
      ...(enableCorrectAnswer && { isCorrect: false }),
      ...(enableScoring && { points: 0 })
    };
    
    onChange([...options, newOption]);
    setNewOptionLabel('');
    setNewOptionCapacity(0);
  };

  const updateOption = (index: number, field: keyof FieldOption, value: string | number | boolean) => {
    const updated = options.map((opt, i) => {
      if (i === index) {
        return { ...opt, [field]: value };
      }
      return opt;
    });
    onChange(updated);
  };

  const toggleCorrectAnswer = (index: number) => {
    // Per radio/multiple_choice, solo una risposta può essere corretta
    const isSingleCorrect = fieldType === 'radio' || fieldType === 'multiple_choice';
    
    const updated = options.map((opt, i) => {
      if (isSingleCorrect) {
        // Deseleziona tutte le altre
        return { ...opt, isCorrect: i === index };
      } else {
        // Per checkbox, multiple corrette possibili
        if (i === index) {
          return { ...opt, isCorrect: !opt.isCorrect };
        }
        return opt;
      }
    });
    onChange(updated);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  const getFieldTypeLabel = () => {
    switch (fieldType) {
      case 'select':
        return 'opzioni del menu a tendina';
      case 'radio':
        return 'opzioni radio';
      case 'checkbox':
        return 'opzioni checkbox';
      default:
        return 'opzioni';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Opzioni disponibili
          <span className="ml-1 text-xs text-gray-500">
            (configura le {getFieldTypeLabel()})
          </span>
        </label>

        {/* Lista opzioni esistenti */}
        {options.length > 0 && (
          <div className="space-y-2 mb-3">
            {options.map((option, index) => (
              <div 
                key={index} 
                className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <GripVertical className="h-4 w-4 text-gray-400 cursor-move mt-2" />
                
                <div className="flex-1 space-y-2">
                  {/* Riga 1: Value e Label */}
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={option.value}
                      onChange={(e) => updateOption(index, 'value', e.target.value)}
                      placeholder="valore"
                      size="sm"
                      className="text-xs font-mono"
                    />
                    <Input
                      value={option.label}
                      onChange={(e) => updateOption(index, 'label', e.target.value)}
                      placeholder="Etichetta visibile"
                      size="sm"
                    />
                  </div>

                  {/* Riga 2: Campi opzionali */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Capacity Limit */}
                    {enableCapacityLimit && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">Max posti:</label>
                        <Input
                          type="number"
                          value={option.maxCapacity || 0}
                          onChange={(e) => updateOption(index, 'maxCapacity', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          size="sm"
                          min={0}
                          className="w-20 text-xs"
                        />
                        {option.maxCapacity && option.maxCapacity > 0 && (
                          <span className="text-xs text-gray-500">
                            ({option.currentCount || 0}/{option.maxCapacity} occupati)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Correct Answer */}
                    {enableCorrectAnswer && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={option.isCorrect || false}
                          onChange={() => toggleCorrectAnswer(index)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-xs text-gray-600">
                          {option.isCorrect ? '✓ Risposta corretta' : 'Marca come corretta'}
                        </span>
                      </label>
                    )}

                    {/* Scoring Points */}
                    {enableScoring && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">Punti:</label>
                        <Input
                          type="number"
                          value={option.points || 0}
                          onChange={(e) => updateOption(index, 'points', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          size="sm"
                          min={0}
                          className="w-16 text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Aggiungi nuova opzione */}
        <div className="space-y-2 p-3 bg-white rounded-lg border border-gray-300">
          <div className="flex items-center gap-2">
            <Input
              value={newOptionLabel}
              onChange={(e) => setNewOptionLabel(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !enableCapacityLimit) {
                  e.preventDefault();
                  addOption();
                }
              }}
              placeholder="Nuova opzione..."
              className="flex-1"
              size="sm"
            />
            
            {/* Capacity field per nuova opzione */}
            {enableCapacityLimit && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 whitespace-nowrap">Max posti:</label>
                <Input
                  type="number"
                  value={newOptionCapacity || ''}
                  onChange={(e) => setNewOptionCapacity(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  size="sm"
                  min={0}
                  className="w-20 text-xs"
                />
              </div>
            )}
            
            <Button
              type="button"
              onClick={addOption}
              size="sm"
              variant="outline"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Aggiungi
            </Button>
          </div>

          {/* Helper text */}
          {(enableCapacityLimit || enableCorrectAnswer || enableScoring) && (
            <div className="text-xs text-gray-500 space-y-1">
              {enableCapacityLimit && (
                <p>💡 <strong>Limite capacità:</strong> Imposta max iscrizioni per opzione (es. 10 posti per giornata)</p>
              )}
              {enableCorrectAnswer && (
                <p>✓ <strong>Quiz:</strong> Marca le risposte corrette dopo averle aggiunte</p>
              )}
              {enableScoring && (
                <p>🎯 <strong>Punteggio:</strong> Assegna punti per risposta selezionata</p>
              )}
            </div>
          )}
        </div>

        {options.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ Aggiungi almeno un'opzione per questo tipo di campo
          </p>
        )}
      </div>
    </div>
  );
};

export default FieldOptionsEditor;
