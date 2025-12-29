import React, { useState } from 'react';
import TabNavigation from '../components/shared/TabNavigation';
import PreventiviPage from './finance/PreventiviPage';

/**
 * QuotesAndInvoices - Contenitore per Preventivi e Fatture
 * 
 * Mostra tab navigation per switchare tra:
 * - Preventivi: usa PreventiviPage con layout moderno
 * - Fatture: in sviluppo
 */
const QuotesAndInvoices: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quotes' | 'invoices'>('quotes');

  const tabItems = [
    { id: 'quotes', label: 'Preventivi' },
    { id: 'invoices', label: 'Fatture' }
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex justify-center">
        <TabNavigation
          tabs={tabItems}
          activeTabId={activeTab}
          onTabChange={(id: string) => {
            setActiveTab(id as 'quotes' | 'invoices');
          }}
        />
      </div>

      {/* Content */}
      {activeTab === 'quotes' && (
        <PreventiviPage />
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-lg shadow-sm p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-6">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Fatture</h2>
            <p className="text-gray-500 text-lg">Funzionalità in fase di sviluppo</p>
            <p className="text-gray-400 text-sm mt-2">Questa sezione sarà disponibile a breve</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotesAndInvoices;