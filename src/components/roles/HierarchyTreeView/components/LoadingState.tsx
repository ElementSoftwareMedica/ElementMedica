import React from 'react';

/**
 * Component per mostrare lo stato di caricamento
 */
export const LoadingState: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      <span className="ml-3 text-gray-600">Caricamento gerarchia...</span>
    </div>
  );
};
