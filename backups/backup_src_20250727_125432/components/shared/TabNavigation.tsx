import React from 'react';

interface TabItem {
  id: string;
  label: string;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * A reusable pill-style tab navigation component
 */
const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  className = ''
}) => {
  return (
    <div className={`flex w-full justify-center ${className}`}>
      <div className="flex bg-gray-100 rounded-full shadow-sm border border-gray-200 overflow-x-auto px-2 py-1 gap-1" style={{ minHeight: 40 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`px-4 py-1 text-base font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300
              ${activeTabId === tab.id ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-700 hover:bg-blue-100'}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TabNavigation; 