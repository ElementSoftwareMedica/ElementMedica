import React from 'react';
import TabPills from '../ui/TabPills';
import { Building2 } from 'lucide-react';

interface CompanySite {
  id: string;
  siteName: string;
  indirizzo: string;
  citta: string;
  provincia: string;
}

interface SiteTabsFilterProps {
  sites: CompanySite[];
  selectedSiteId: string | null;
  onSiteChange: (siteId: string | null) => void;
  className?: string;
}

const SiteTabsFilter: React.FC<SiteTabsFilterProps> = ({
  sites,
  selectedSiteId,
  onSiteChange,
  className = ''
}) => {
  // Se c'è solo una sede o nessuna sede, non mostrare i tab
  if (sites.length <= 1) {
    return null;
  }

  // Prepara i tab: "Tutte le sedi" + una tab per ogni sede
  const tabs = [
    {
      id: 'all',
      label: 'Tutte le sedi',
      count: sites.length
    },
    ...sites.map(site => ({
      id: site.id,
      label: site.siteName,
      count: undefined
    }))
  ];

  const activeTab = selectedSiteId || 'all';

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="px-6 py-4">
        <div className="flex items-center mb-4">
          <Building2 className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Filtra per sede</h3>
        </div>
        <TabPills
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => onSiteChange(tabId === 'all' ? null : tabId)}
          className="flex-wrap"
        />
      </div>
    </div>
  );
};

export default SiteTabsFilter;