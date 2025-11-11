import React from 'react';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

/**
 * Component per mostrare lo stato di errore
 */
export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div className="text-center py-12">
      <div className="text-red-600 mb-4">⚠️</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Errore</h3>
      <p className="text-gray-600 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Riprova
      </button>
    </div>
  );
};
