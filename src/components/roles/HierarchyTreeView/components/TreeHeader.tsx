import React from 'react';
import { Shield, Plus, Settings } from 'lucide-react';

interface TreeHeaderProps {
  hasCreatePermission: boolean;
  onCreateRoot: () => void;
  onRefresh: () => void;
}

/**
 * Component per l'header della vista ad albero
 * Include titolo e azioni globali (crea ruolo radice, aggiorna)
 */
export const TreeHeader: React.FC<TreeHeaderProps> = ({ 
  hasCreatePermission, 
  onCreateRoot, 
  onRefresh 
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <Shield className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Vista ad Albero della Gerarchia</h3>
      </div>
      <div className="flex items-center space-x-2">
        {hasCreatePermission && (
          <button
            onClick={onCreateRoot}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 flex items-center space-x-1.5 transition-colors text-sm"
          >
            <Plus className="w-3 h-3" />
            <span>Nuovo Ruolo Radice</span>
          </button>
        )}
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 flex items-center space-x-1.5 transition-colors text-sm"
        >
          <Settings className="w-3 h-3" />
          <span>Aggiorna</span>
        </button>
      </div>
    </div>
  );
};
