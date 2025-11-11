import React from 'react';
import type { RoleFormData } from '../types';

interface RoleFormProps {
  formData: RoleFormData;
  onFormChange: (data: RoleFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  mode: 'create' | 'edit' | 'createRoot';
  depth?: number;
}

/**
 * Component per il form di creazione/modifica ruolo
 * Supporta tre modalità: edit (modifica inline), create (sotto-ruolo), createRoot (ruolo radice)
 */
export const RoleForm: React.FC<RoleFormProps> = ({ 
  formData, 
  onFormChange, 
  onSave, 
  onCancel, 
  mode,
  depth = 0
}) => {
  const isEdit = mode === 'edit';
  const isCreateRoot = mode === 'createRoot';
  const isCreate = mode === 'create';

  const containerClasses = isEdit 
    ? 'space-y-2' 
    : isCreateRoot
    ? 'bg-green-50 border border-green-200 rounded-lg p-3 mb-4'
    : 'bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2';

  const saveButtonClasses = isEdit
    ? 'px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700'
    : isCreateRoot
    ? 'px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700'
    : 'px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700';

  const saveButtonText = isCreateRoot ? 'Crea Ruolo Radice' : 'Crea';

  const style = !isEdit && isCreate ? { marginLeft: `${(depth + 1) * 24}px` } : undefined;

  return (
    <div className={containerClasses} style={style}>
      <div className="space-y-2">
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          placeholder={isEdit ? 'Nome ruolo' : isCreateRoot ? 'Nome nuovo ruolo radice' : 'Nome nuovo ruolo'}
        />
        <input
          type="text"
          value={formData.description}
          onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          placeholder="Descrizione"
        />
        {!isEdit && (
          <input
            type="text"
            value={formData.roleType}
            onChange={(e) => onFormChange({ ...formData, roleType: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            placeholder="Tipo ruolo (es: ADMIN_LAVORO_FORMAZIONE)"
          />
        )}
        <div className="flex space-x-2">
          <button
            onClick={onSave}
            className={saveButtonClasses}
          >
            {isEdit ? 'Salva' : saveButtonText}
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
