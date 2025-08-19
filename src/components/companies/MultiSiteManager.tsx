import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2,
  Plus,
  Users
} from 'lucide-react';
import { apiGet } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import TabPills from '../ui/TabPills';
import SiteCard from './SiteCard';
import CompanySiteForm from './CompanySiteForm';
import { DVRManager, RepartoManager, SopralluogoManager } from '../managers';

interface CompanySite {
  id: string;
  siteName: string;
  citta: string;
  indirizzo: string;
  cap: string;
  provincia: string;
  personaRiferimento?: string;
  telefono?: string;
  mail?: string;
  dvr?: string;
  rsppId?: string;
  medicoCompetenteId?: string;
  ultimoSopralluogo?: string;
  prossimoSopralluogo?: string;
  valutazioneSopralluogo?: string;
  sopralluogoEseguitoDa?: string;
  rspp?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  medicoCompetente?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title?: string;
  siteId?: string;
}

interface MultiSiteManagerProps {
  companyId: string;
  companyName: string;
}

const MultiSiteManager: React.FC<MultiSiteManagerProps> = ({ companyId }) => {
  const [sites, setSites] = useState<CompanySite[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('company');
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState<CompanySite | null>(null);
  const [activeManager, setActiveManager] = useState<{
    type: 'dvr' | 'sopralluogo' | 'reparto' | null;
    siteId: string;
    siteName: string;
  }>({ type: null, siteId: '', siteName: '' });
  const { showToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch sites
      const sitesResponse = await apiGet(`/api/v1/company-sites/company/${companyId}`) as { sites: CompanySite[] };
      const sitesData = sitesResponse.sites || [];
      setSites(sitesData);
      
      // Fetch employees
      const employeesResponse = await apiGet(`/api/v1/persons?companyId=${companyId}&roleType=EMPLOYEE`) as { persons?: Employee[] };
      setEmployees(employeesResponse.persons || []);
      
      // Set default tab (company if no sites, first site if sites exist)
      if (sitesData.length > 0 && activeTab === 'company') {
        setActiveTab('company');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast({ message: 'Errore nel caricamento dei dati', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [companyId, activeTab, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (site: CompanySite) => {
    setEditingSite(site);
    setShowForm(true);
  };

  const handleDelete = async (siteId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa sede?')) return;

    try {
      await apiGet(`/api/company-sites/${siteId}`, { method: 'DELETE' });
      await fetchData();
      showToast({ message: 'Sede eliminata con successo', type: 'success' });
      
      // Reset active tab if deleted site was selected
      if (activeTab === siteId) {
        setActiveTab('company');
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      showToast({ message: 'Errore nell\'eliminazione della sede', type: 'error' });
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSite(null);
  };

  const handleFormSuccess = () => {
    fetchData();
    handleFormClose();
    showToast({ 
      message: editingSite ? 'Sede aggiornata con successo' : 'Sede creata con successo', 
      type: 'success' 
    });
  };

  // Prepare tabs
  const tabs = [
    {
      id: 'company',
      label: 'Azienda',
      count: employees.length
    },
    ...sites.map((site, index) => ({
      id: site.id,
      label: `Sede ${index + 1}`,
      count: employees.filter(emp => emp.siteId === site.id).length
    }))
  ];

  // Filter data based on active tab
  const getFilteredEmployees = () => {
    if (activeTab === 'company') {
      return employees;
    }
    return employees.filter(emp => emp.siteId === activeTab);
  };

  const getActiveSite = () => {
    if (activeTab === 'company') return null;
    return sites.find(site => site.id === activeTab);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Gestione Sedi Aziendali
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Aggiungi Sede
          </button>
        </div>

        {/* Tab Pills - Show only if there are multiple sites */}
        {sites.length > 0 && (
          <div className="mb-6">
            <TabPills
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              className="mb-4"
            />
          </div>
        )}
      </div>

      {/* Sites Grid */}
      {sites.length === 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Sedi Aziendali
            </h2>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Aggiungi Sede
            </button>
          </div>
          <div className="px-6 py-8 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna sede trovata</h3>
            <p className="text-gray-500 mb-4">Aggiungi la prima sede per questa azienda.</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors flex items-center mx-auto"
            >
              <Plus className="h-4 w-4 mr-1" />
              Aggiungi Prima Sede
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Show sites when company tab is active or when specific site is selected */}
          {activeTab === 'company' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sites.map((site, index) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  isDefault={index === 0}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onManageDVR={(siteId, siteName) => setActiveManager({ type: 'dvr', siteId, siteName })}
                  onManageSopralluogo={(siteId, siteName) => setActiveManager({ type: 'sopralluogo', siteId, siteName })}
                  onManageReparto={(siteId, siteName) => setActiveManager({ type: 'reparto', siteId, siteName })}
                />
              ))}
            </div>
          )}

          {/* Show single site when specific site tab is active */}
          {activeTab !== 'company' && getActiveSite() && (
            <div className="grid grid-cols-1 gap-6">
              <SiteCard
                site={getActiveSite()!}
                isDefault={sites.findIndex(s => s.id === activeTab) === 0}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onManageDVR={(siteId, siteName) => setActiveManager({ type: 'dvr', siteId, siteName })}
                onManageSopralluogo={(siteId, siteName) => setActiveManager({ type: 'sopralluogo', siteId, siteName })}
                onManageReparto={(siteId, siteName) => setActiveManager({ type: 'reparto', siteId, siteName })}
              />
            </div>
          )}
        </>
      )}

      {/* Employees Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Dipendenti {activeTab === 'company' ? 'Azienda' : `- ${getActiveSite()?.siteName}`}
          </h2>
          <span className="text-sm text-gray-500">
            {getFilteredEmployees().length} dipendenti
          </span>
        </div>
        <div className="divide-y divide-gray-200">
          {getFilteredEmployees().length === 0 ? (
            <div className="px-6 py-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessun dipendente trovato
              </h3>
              <p className="text-gray-500">
                {activeTab === 'company' 
                  ? 'Non ci sono dipendenti in questa azienda.'
                  : 'Non ci sono dipendenti assegnati a questa sede.'
                }
              </p>
            </div>
          ) : (
            getFilteredEmployees().map((employee) => (
              <div key={employee.id} className="px-6 py-4 flex items-center hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                  </span>
                </div>
                <div className="ml-3 flex-grow">
                  <p className="text-sm font-medium text-gray-800">
                    {employee.firstName} {employee.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{employee.title || 'Dipendente'}</p>
                </div>
                {employee.siteId && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {sites.find(s => s.id === employee.siteId)?.siteName || 'Sede'}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <CompanySiteForm
          companyId={companyId}
          site={editingSite}
          onSuccess={handleFormSuccess}
          onClose={handleFormClose}
        />
      )}

      {/* Manager Modals */}
      {activeManager.type === 'dvr' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Gestione DVR - {activeManager.siteName}
              </h3>
              <button
                onClick={() => setActiveManager({ type: null, siteId: '', siteName: '' })}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                <span className="sr-only">Chiudi</span>
                ✕
              </button>
            </div>
            <div className="p-6">
              <DVRManager siteId={activeManager.siteId} siteName={activeManager.siteName} />
            </div>
          </div>
        </div>
      )}

      {activeManager.type === 'sopralluogo' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Gestione Sopralluoghi - {activeManager.siteName}
              </h3>
              <button
                onClick={() => setActiveManager({ type: null, siteId: '', siteName: '' })}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                <span className="sr-only">Chiudi</span>
                ✕
              </button>
            </div>
            <div className="p-6">
              <SopralluogoManager siteId={activeManager.siteId} siteName={activeManager.siteName} />
            </div>
          </div>
        </div>
      )}

      {activeManager.type === 'reparto' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Gestione Reparti - {activeManager.siteName}
              </h3>
              <button
                onClick={() => setActiveManager({ type: null, siteId: '', siteName: '' })}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                <span className="sr-only">Chiudi</span>
                ✕
              </button>
            </div>
            <div className="p-6">
              <RepartoManager siteId={activeManager.siteId} siteName={activeManager.siteName} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSiteManager;