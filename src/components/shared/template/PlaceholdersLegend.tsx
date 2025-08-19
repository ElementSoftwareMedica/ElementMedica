import React, { useState } from 'react';
// Definire i tipi di entità
type EntityType = 'scheduled-courses' | 'courses' | 'trainers' | 'employees' | 'companies';

interface FieldDescription {
  desc: string;
  placeholder: string;
}

interface PlaceholderItem {
  key: string;
  label: string;
}

interface PlaceholdersLegendProps {
  entityFields: Record<EntityType, FieldDescription[]>;
  entityLabels: Record<EntityType, string>;
  attestatoPlaceholders: PlaceholderItem[];
  letteraPlaceholders: PlaceholderItem[];
}

export const PlaceholdersLegend: React.FC<PlaceholdersLegendProps> = ({
  entityFields,
  entityLabels,
  attestatoPlaceholders,
  letteraPlaceholders
}) => {
  const [activeEntityTab, setActiveEntityTab] = useState<EntityType>('scheduled-courses');

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium mb-3">Legenda Placeholders</h3>
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-600 mb-4">
          I placeholder sono variabili che vengono sostituite con i dati reali quando il template viene utilizzato.
          Usare i placeholder nel formato: <code className="bg-gray-100 px-1 py-0.5 rounded">{'{{placeholder}}'}</code>
        </p>
        
        {/* Pills styled to match the design but with width auto */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-gray-100 rounded-full shadow-sm border border-gray-200 overflow-x-auto px-2 py-1">
            {Object.keys(entityLabels).map(tabKey => (
              <button
                key={tabKey}
                className={`px-4 py-1 mx-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300
                  ${activeEntityTab === tabKey as EntityType 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'bg-transparent text-gray-700 hover:bg-blue-100'}`}
                onClick={() => setActiveEntityTab(tabKey as EntityType)}
              >
                {entityLabels[tabKey as EntityType]}
              </button>
            ))}
          </div>
        </div>
        
        {/* Placeholder content for selected entity */}
        <div className="mt-4 border rounded-lg p-4">
          <h4 className="font-medium mb-3">Placeholders disponibili per {entityLabels[activeEntityTab]}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {entityFields[activeEntityTab].map((field, index) => (
              <div key={index} className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-gray-700 font-medium text-sm mb-1">{field.desc}</span>
                <code className="bg-white px-2 py-1 rounded border border-gray-300 text-sm">{'{{' + field.placeholder + '}}'}</code>
              </div>
            ))}
          </div>
        </div>
        
        {activeEntityTab === 'scheduled-courses' && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium mb-3 text-yellow-800">Placeholders specifici per attestati</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {attestatoPlaceholders.map((placeholder, index) => (
                <div key={index} className="flex flex-col p-3 bg-yellow-100 rounded-lg border border-yellow-300">
                  <span className="text-yellow-800 font-medium text-sm mb-1">{placeholder.label}</span>
                  <code className="bg-white px-2 py-1 rounded border border-yellow-300 text-sm">{placeholder.key}</code>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeEntityTab === 'trainers' && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium mb-3 text-blue-800">Placeholders specifici per lettere di incarico</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {letteraPlaceholders.map((placeholder, index) => (
                <div key={index} className="flex flex-col p-3 bg-blue-100 rounded-lg border border-blue-300">
                  <span className="text-blue-800 font-medium text-sm mb-1">{placeholder.label}</span>
                  <code className="bg-white px-2 py-1 rounded border border-blue-300 text-sm">{placeholder.key}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 