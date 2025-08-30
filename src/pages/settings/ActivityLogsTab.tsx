import React from 'react';

const ActivityLogsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium text-gray-900">Log delle Attività</h2>
      </div>
      
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <p>Componente ActivityLogsTab semplificato per test.</p>
        <p>Se vedi questo messaggio, la pagina settings funziona correttamente.</p>
      </div>
    </div>
  );
};

export default ActivityLogsTab;