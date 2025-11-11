import React from 'react';
import { Shield } from 'lucide-react';

interface EmptyStateProps {
  hasCreatePermission: boolean;
  onCreateRoot: () => void;
}

/**
 * Component per mostrare lo stato vuoto quando non ci sono ruoli
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ 
  hasCreatePermission, 
  onCreateRoot 
}) => {
  return (
    <div className="text-center py-8 text-gray-500">
      <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <p>Nessun ruolo trovato nella gerarchia.</p>
      {hasCreatePermission && (
        <button
          onClick={onCreateRoot}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Crea il primo ruolo
        </button>
      )}
    </div>
  );
};
