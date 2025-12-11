import React, { useState } from 'react';
import { Button } from '../../design-system/atoms/Button';
import { AlertCircle, Check, X } from 'lucide-react';

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  patternMessage?: string;
  minSelections?: number;
  maxSelections?: number;
  customValidation?: {
    rule: string;
    message: string;
  };
}

interface ValidationEditorProps {
  fieldType: string;
  validation?: FieldValidation;
  onChange: (validation: FieldValidation) => void;
}

export const ValidationEditor: React.FC<ValidationEditorProps> = ({
  fieldType,
  validation = {},
  onChange
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateValidation = (key: keyof FieldValidation, value: any) => {
    onChange({
      ...validation,
      [key]: value
    });
  };

  const clearValidation = (key: keyof FieldValidation) => {
    const newValidation = { ...validation };
    delete newValidation[key];
    onChange(newValidation);
  };

  // Determine which validation rules apply to this field type
  const supportsLength = ['text', 'textarea', 'email'].includes(fieldType);
  const supportsValue = ['number'].includes(fieldType);
  const supportsPattern = ['text', 'email', 'tel'].includes(fieldType);
  const supportsSelections = ['checkbox', 'multiple_choice'].includes(fieldType);

  return (
    <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <AlertCircle size={18} className="text-blue-600" />
          Regole di Validazione
        </h4>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {showAdvanced ? 'Nascondi' : 'Avanzate'}
        </button>
      </div>

      {/* Required Field */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="validation-required"
          checked={validation.required || false}
          onChange={(e) => updateValidation('required', e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="validation-required" className="text-sm text-gray-700">
          Campo obbligatorio
        </label>
      </div>

      {/* Length Validation (text, textarea, email) */}
      {supportsLength && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Lunghezza minima
            </label>
            <input
              type="number"
              min="0"
              value={validation.minLength || ''}
              onChange={(e) => updateValidation('minLength', parseInt(e.target.value) || undefined)}
              placeholder="0"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Lunghezza massima
            </label>
            <input
              type="number"
              min="0"
              value={validation.maxLength || ''}
              onChange={(e) => updateValidation('maxLength', parseInt(e.target.value) || undefined)}
              placeholder="∞"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>
      )}

      {/* Value Validation (number) */}
      {supportsValue && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Valore minimo
            </label>
            <input
              type="number"
              value={validation.minValue || ''}
              onChange={(e) => updateValidation('minValue', parseFloat(e.target.value) || undefined)}
              placeholder="-∞"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Valore massimo
            </label>
            <input
              type="number"
              value={validation.maxValue || ''}
              onChange={(e) => updateValidation('maxValue', parseFloat(e.target.value) || undefined)}
              placeholder="∞"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>
      )}

      {/* Selection Validation (checkbox, multiple_choice) */}
      {supportsSelections && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Selezioni minime
            </label>
            <input
              type="number"
              min="0"
              value={validation.minSelections || ''}
              onChange={(e) => updateValidation('minSelections', parseInt(e.target.value) || undefined)}
              placeholder="0"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Selezioni massime
            </label>
            <input
              type="number"
              min="0"
              value={validation.maxSelections || ''}
              onChange={(e) => updateValidation('maxSelections', parseInt(e.target.value) || undefined)}
              placeholder="∞"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>
      )}

      {/* Pattern Validation (text, email, tel) */}
      {supportsPattern && showAdvanced && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Pattern Regex
            </label>
            <input
              type="text"
              value={validation.pattern || ''}
              onChange={(e) => updateValidation('pattern', e.target.value || undefined)}
              placeholder="^[A-Z][a-z]+$"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Messaggio errore pattern
            </label>
            <input
              type="text"
              value={validation.patternMessage || ''}
              onChange={(e) => updateValidation('patternMessage', e.target.value || undefined)}
              placeholder="Formato non valido"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>
      )}

      {/* Validation Summary */}
      {Object.keys(validation).length > 0 && (
        <div className="bg-white border border-gray-200 rounded p-3 space-y-2">
          <p className="text-xs font-medium text-gray-700">Regole attive:</p>
          <div className="flex flex-wrap gap-2">
            {validation.required && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                <Check size={12} />
                Obbligatorio
              </span>
            )}
            {validation.minLength && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                Min: {validation.minLength} caratteri
              </span>
            )}
            {validation.maxLength && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                Max: {validation.maxLength} caratteri
              </span>
            )}
            {validation.minValue !== undefined && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                Min: {validation.minValue}
              </span>
            )}
            {validation.maxValue !== undefined && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                Max: {validation.maxValue}
              </span>
            )}
            {validation.minSelections && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                Min selezioni: {validation.minSelections}
              </span>
            )}
            {validation.maxSelections && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                Max selezioni: {validation.maxSelections}
              </span>
            )}
            {validation.pattern && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                Pattern custom
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick Presets */}
      {supportsPattern && showAdvanced && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Pattern comuni:</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                updateValidation('pattern', '^[A-Z][a-z]+ [A-Z][a-z]+$');
                updateValidation('patternMessage', 'Inserisci nome e cognome con iniziali maiuscole');
              }}
            >
              Nome Cognome
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                updateValidation('pattern', '^[0-9]{5}$');
                updateValidation('patternMessage', 'Inserisci un CAP valido (5 cifre)');
              }}
            >
              CAP Italiano
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                updateValidation('pattern', '^[0-9]{16}$');
                updateValidation('patternMessage', 'Codice fiscale non valido (16 caratteri)');
              }}
            >
              Codice Fiscale
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                updateValidation('pattern', '^[0-9]{10,11}$');
                updateValidation('patternMessage', 'Partita IVA non valida (10-11 cifre)');
              }}
            >
              Partita IVA
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
