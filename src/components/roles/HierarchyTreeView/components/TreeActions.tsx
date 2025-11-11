import React from 'react';
import { Plus, Edit3, Trash2, Move, Save, X } from 'lucide-react';
import { getButtonClasses, getButtonTooltip } from '../utils';

interface TreeActionsProps {
  isEditing: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  hasChildren: boolean;
  onSave: () => void;
  onCancel: () => void;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Component per i pulsanti di azione sui nodi dell'albero
 * Gestisce sia la modalità editing (Save/Cancel) che la modalità normale (Create/Edit/Delete/Move)
 */
export const TreeActions: React.FC<TreeActionsProps> = ({
  isEditing,
  canCreate,
  canEdit,
  canDelete,
  hasChildren,
  onSave,
  onCancel,
  onCreate,
  onEdit,
  onDelete
}) => {
  if (isEditing) {
    return (
      <div className="flex items-center space-x-0.5 ml-4">
        <button
          onClick={onSave}
          className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
          title="Salva"
        >
          <Save className="w-3 h-3" />
        </button>
        <button
          onClick={onCancel}
          className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Annulla"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  const canDeleteRole = canDelete && !hasChildren;

  return (
    <div className="flex items-center space-x-0.5 ml-4">
      {/* Pulsante Aggiungi sotto-ruolo */}
      <button
        onClick={canCreate ? onCreate : undefined}
        disabled={!canCreate}
        className={getButtonClasses(canCreate, 'green')}
        title={getButtonTooltip('create', canCreate)}
      >
        <Plus className="w-3 h-3" />
      </button>
      
      {/* Pulsante Modifica */}
      <button
        onClick={canEdit ? onEdit : undefined}
        disabled={!canEdit}
        className={getButtonClasses(canEdit, 'blue')}
        title={getButtonTooltip('edit', canEdit)}
      >
        <Edit3 className="w-3 h-3" />
      </button>
      
      {/* Pulsante Elimina */}
      <button
        onClick={canDeleteRole ? onDelete : undefined}
        disabled={!canDeleteRole}
        className={getButtonClasses(canDeleteRole, 'red')}
        title={getButtonTooltip('delete', canDelete, hasChildren)}
      >
        <Trash2 className="w-3 h-3" />
      </button>
      
      {/* Pulsante Trascina */}
      <button 
        disabled={!canEdit}
        className={getButtonClasses(canEdit, 'amber')}
        title={getButtonTooltip('move', canEdit)}
      >
        <Move className="w-3 h-3" />
      </button>
    </div>
  );
};
