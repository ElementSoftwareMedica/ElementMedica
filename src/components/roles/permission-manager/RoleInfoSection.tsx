import React from 'react';
import { ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { Role } from '../../../hooks/useRoles';

interface RoleInfoSectionProps {
  role: Role;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  onReload: () => void;
}

const RoleInfoSection: React.FC<RoleInfoSectionProps> = ({
  role,
  saving,
  onBack,
  onSave,
  onReload
}) => {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Indietro</span>
          </button>
          
          <div className="border-l border-gray-300 pl-4">
            <h2 className="text-xl font-bold text-gray-900">{role.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {role.description || 'Nessuna descrizione disponibile'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onReload}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Ricarica permessi"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Ricarica</span>
          </button>
          
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvataggio...' : 'Salva Modifiche'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleInfoSection;