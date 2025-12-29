import React, { useState } from 'react';
import TabNavigation from '../../components/shared/TabNavigation';
import FormTemplatesPage from './FormTemplatesPage';
import FormSubmissionsPage from './FormSubmissionsPage';

type TabType = 'templates' | 'submissions';

const UnifiedFormsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('templates');

  const tabItems = [
    { id: 'templates', label: 'Form Templates' },
    { id: 'submissions', label: 'Risposte' }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestione Forms</h1>
          <p className="text-gray-500">
            Gestisci form
          </p>
        </div>

        {/* Toggle Switch */}
        <TabNavigation
          tabs={tabItems}
          activeTabId={activeTab}
          onTabChange={(id: string) => setActiveTab(id as TabType)}
        />
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'templates' ? (
          <FormTemplatesPage hideHeader />
        ) : (
          <FormSubmissionsPage hideHeader />
        )}
      </div>
    </div>
  );
};

export default UnifiedFormsPage;