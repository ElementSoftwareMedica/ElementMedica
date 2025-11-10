/**
 * RoleFormFields Component
 * 
 * Form fields for role creation: name, description, level selector.
 */

import React from 'react';
import { FormField } from '../../../../design-system/molecules/FormField';
import { Label } from '../../../../design-system/atoms/Label';

interface RoleFormFieldsProps {
  name: string;
  description: string;
  level: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  mode: 'create' | 'edit';
  loading: boolean;
}

export const RoleFormFields: React.FC<RoleFormFieldsProps> = ({
  name,
  description,
  level,
  onNameChange,
  onDescriptionChange,
  onLevelChange,
  mode,
  loading
}) => {
  return (
    <div className="space-y-4">
      <FormField
        label="Nome Ruolo *"
        name="name"
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Es. Manager Vendite"
        disabled={loading}
        required
      />

      <FormField
        label="Descrizione *"
        name="description"
        type="textarea"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Descrizione del ruolo e delle sue responsabilità"
        rows={3}
        disabled={loading}
        required
      />

      {mode === 'create' && (
        <div className="space-y-3">
          <Label htmlFor="level" className="text-sm font-medium text-gray-700">
            Livello Gerarchico *
          </Label>
          <div className="grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((levelNum) => (
              <button
                key={levelNum}
                type="button"
                onClick={() => onLevelChange(levelNum.toString())}
                className={`
                  relative p-3 rounded-lg border-2 transition-all duration-200 text-center
                  ${parseInt(level) === levelNum
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
                disabled={loading}
              >
                <div className="text-lg font-bold">{levelNum}</div>
                <div className="text-xs mt-1">
                  {levelNum === 1 ? 'CEO' : 
                   levelNum === 2 ? 'Dir.' : 
                   levelNum === 3 ? 'Mgr' : 
                   levelNum === 4 ? 'Lead' : 
                   levelNum === 5 ? 'Sr.' : 'Jr.'}
                </div>
                {parseInt(level) === levelNum && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Seleziona il livello gerarchico (1 = più alto, 6 = più basso)
          </p>
        </div>
      )}
    </div>
  );
};
