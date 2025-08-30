import React, { useState } from 'react';
import { 
  FileText,
  MessageSquare
} from 'lucide-react';
import { cn } from '../../design-system/utils';
import FormTemplatesPage from './FormTemplatesPage';
import FormSubmissionsPage from './FormSubmissionsPage';

type TabType = 'templates' | 'submissions';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const UnifiedFormsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('templates');

  const tabs: TabConfig[] = [
    {
      id: 'templates',
      label: 'Form Templates',
      icon: <FileText className="h-4 w-4" />,
      component: <FormTemplatesPage />
    },
    {
      id: 'submissions',
      label: 'Form Submissions',
      icon: <MessageSquare className="h-4 w-4" />,
      component: <FormSubmissionsPage />
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Gestione Forms
        </h1>
        
        {/* Tab Navigation - Design a Pillola */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-full w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all duration-300',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'transform hover:scale-105',
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-lg shadow-blue-100 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>
  );
};

export default UnifiedFormsPage;