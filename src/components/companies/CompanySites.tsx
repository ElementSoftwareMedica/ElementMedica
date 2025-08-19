import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2,
  Calendar,
  Edit,
  Eye,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  Shield,
  Stethoscope,
  Trash2,
  User,
  Users
} from 'lucide-react';
import { apiGet, apiDelete } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { DVRManager } from '../managers/DVRManager';
import SopralluogoManager from '../managers/SopralluogoManager';
import RepartoManager from '../managers/RepartoManager';
import CompanySiteForm from './CompanySiteForm';

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
  // Campi sopralluogo corretti secondo lo schema
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

interface CompanySitesProps {
  companyId: string;
  selectedSiteId?: string | null;
  onSiteFilterChange?: (siteId: string | null) => void;
}

const CompanySites: React.FC<CompanySitesProps> = ({ companyId, selectedSiteId, onSiteFilterChange }) => {
  const [sites, setSites] = useState<CompanySite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState<CompanySite | null>(null);
  const [activeManager, setActiveManager] = useState<{
    type: 'dvr' | 'sopralluogo' | 'reparto' | null;
    siteId: string;
    siteName: string;
  }>({ type: null, siteId: '', siteName: '' });
  const { showToast } = useToast();

  // Filtra le sedi in base alla selezione
  const filteredSites = selectedSiteId 
    ? sites.filter(site => site.id === selectedSiteId)
    : sites;

  const fetchSites = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/api/v1/company-sites/company/${companyId}`) as { sites: CompanySite[] };
      setSites(response.sites || []);
    } catch (error) {
      console.error('Error fetching company sites:', error);
      showToast({ message: 'Errore nel caricamento delle sedi', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const handleEdit = (site: CompanySite) => {
    setEditingSite(site);
    setShowForm(true);
  };

  const handleDelete = async (siteId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa sede?')) return;

    try {
      await apiDelete(`/api/v1/company-sites/${siteId}`);
      await fetchSites();
      showToast({ message: 'Sede eliminata con successo', type: 'success' });
    } catch (error) {
      console.error('Error deleting site:', error);
      showToast({ message: 'Errore nell\'eliminazione della sede', type: 'error' });
    }
  };

  const resetForm = () => {
    setEditingSite(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    resetForm();
  };

  const handleFormSuccess = () => {
    fetchSites();
    handleFormClose();
    showToast({ 
      message: editingSite ? 'Sede aggiornata con successo' : 'Sede creata con successo', 
      type: 'success' 
    });
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
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center flex-shrink-0">
            <Building2 className="h-5 w-5 mr-2" />
            Sedi Aziendali
          </h2>
          
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors flex items-center shadow-md hover:shadow-lg flex-shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Aggiungi Sede
          </button>
        </div>
        
        {/* Filtro sedi centrato - Solo se ci sono più sedi */}
        {sites.length > 1 && onSiteFilterChange && (
          <div className="flex justify-center">
            <div className="flex bg-gray-100 rounded-full shadow-sm border border-gray-200 overflow-x-auto px-1.5 py-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => onSiteFilterChange(null)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-blue-300 whitespace-nowrap ${
                  selectedSiteId === null
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-transparent text-gray-700 hover:bg-blue-100'
                }`}
              >
                Tutte ({sites.length})
              </button>
              {sites.map(site => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => onSiteFilterChange(site.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-blue-300 whitespace-nowrap ${
                    selectedSiteId === site.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-transparent text-gray-700 hover:bg-blue-100'
                  }`}
                >
                  {site.siteName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {sites.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna sede trovata</h3>
          <p className="text-gray-500 mb-4">Aggiungi la prima sede per questa azienda.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors flex items-center shadow-md hover:shadow-lg mx-auto"
          >
            <Plus className="h-4 w-4 mr-1" />
            Aggiungi Prima Sede
          </button>
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna sede corrispondente</h3>
          <p className="text-gray-500 mb-4">La sede selezionata non è stata trovata.</p>
        </div>
      ) : (
        <div className="p-6">
          {filteredSites.length === 1 ? (
            // Visualizzazione diretta per sede singola
            <div className="space-y-6">
              {filteredSites.map((site) => (
                <div key={site.id}>
                  {/* Header con nome sede e azioni */}
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                      <Building2 className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">{site.siteName}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveManager({ type: 'dvr', siteId: site.id, siteName: site.siteName })}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors flex items-center"
                        title="Gestisci DVR"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        DVR
                      </button>
                      <button
                        onClick={() => setActiveManager({ type: 'sopralluogo', siteId: site.id, siteName: site.siteName })}
                        className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-full transition-colors flex items-center"
                        title="Gestisci Sopralluoghi"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Sopralluoghi
                      </button>
                      <button
                        onClick={() => setActiveManager({ type: 'reparto', siteId: site.id, siteName: site.siteName })}
                        className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors flex items-center"
                        title="Gestisci Reparti"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Reparti
                      </button>
                      <button
                        onClick={() => handleEdit(site)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors flex items-center"
                        title="Modifica sede"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Modifica
                      </button>
                    </div>
                  </div>

                  {/* Griglia informazioni dirette */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Indirizzo */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Indirizzo</h4>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                          {site.indirizzo}
                        </div>
                        <div className="text-sm text-gray-600 ml-6">
                          {site.citta}, {site.cap} ({site.provincia})
                        </div>
                      </div>
                    </div>

                    {/* Contatti */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Contatti</h4>
                      <div className="space-y-2">
                        {site.personaRiferimento && (
                          <div className="flex items-start text-sm text-gray-600">
                            <User className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-green-500" />
                            <span className="break-words">{site.personaRiferimento}</span>
                          </div>
                        )}
                        {site.telefono && (
                          <div className="flex items-start text-sm text-gray-600">
                            <Phone className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-green-500" />
                            <span className="break-all">{site.telefono}</span>
                          </div>
                        )}
                        {site.mail && (
                          <div className="flex items-start text-sm text-gray-600">
                            <Mail className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-green-500" />
                            <span className="break-all">{site.mail}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sicurezza */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Sicurezza</h4>
                      <div className="space-y-2">
                        {site.rspp && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Shield className="h-4 w-4 mr-2 text-orange-500" />
                            <span className="font-medium">RSPP:</span> {site.rspp.firstName} {site.rspp.lastName}
                          </div>
                        )}
                        {site.medicoCompetente && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Stethoscope className="h-4 w-4 mr-2 text-red-500" />
                            <span className="font-medium">MC:</span> {site.medicoCompetente.firstName} {site.medicoCompetente.lastName}
                          </div>
                        )}
                        {site.dvr && (
                          <div className="flex items-center text-sm text-gray-600">
                            <FileText className="h-4 w-4 mr-2 text-purple-500" />
                            <span className="font-medium">DVR:</span> {site.dvr}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sopralluoghi */}
                  {(site.ultimoSopralluogo || site.prossimoSopralluogo || site.valutazioneSopralluogo) && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center uppercase tracking-wide">
                        <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                        Sopralluoghi
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        {site.ultimoSopralluogo && (
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700">Ultimo:</span>
                            <span className="ml-2">{new Date(site.ultimoSopralluogo).toLocaleDateString()}</span>
                          </div>
                        )}
                        {site.prossimoSopralluogo && (
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700">Prossimo:</span>
                            <span className="ml-2">{new Date(site.prossimoSopralluogo).toLocaleDateString()}</span>
                          </div>
                        )}
                        {site.valutazioneSopralluogo && (
                          <div className="md:col-span-3">
                            <span className="font-medium text-gray-700">Valutazione:</span>
                            <span className="ml-2">{site.valutazioneSopralluogo}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Visualizzazione a card per sedi multiple
            <div className="space-y-4">
              {filteredSites.map((site) => (
                 <div key={site.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                   <div className="p-6 flex justify-between items-start">
                     <div className="flex-1">
                       <div className="flex items-center mb-4">
                         <Building2 className="h-5 w-5 text-blue-600 mr-2" />
                         <h3 className="text-lg font-semibold text-gray-900">{site.siteName}</h3>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         {/* Indirizzo */}
                         <div className="space-y-2">
                           <h4 className="text-sm font-medium text-gray-700">Indirizzo</h4>
                           <div className="space-y-1">
                             <div className="flex items-center text-sm text-gray-600">
                               <MapPin className="h-4 w-4 mr-2" />
                               {site.indirizzo}
                             </div>
                             <div className="text-sm text-gray-600">
                               {site.citta}, {site.cap} ({site.provincia})
                             </div>
                           </div>
                         </div>

                         {/* Contatti */}
                         <div className="space-y-2">
                           <h4 className="text-sm font-medium text-gray-700">Contatti</h4>
                           <div className="space-y-1">
                             {site.personaRiferimento && (
                               <div className="flex items-start text-sm text-gray-600">
                                 <User className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                 <span className="break-words">{site.personaRiferimento}</span>
                               </div>
                             )}
                             {site.telefono && (
                               <div className="flex items-start text-sm text-gray-600">
                                 <Phone className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                 <span className="break-all">{site.telefono}</span>
                               </div>
                             )}
                             {site.mail && (
                               <div className="flex items-start text-sm text-gray-600">
                                 <Mail className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                 <span className="break-all">{site.mail}</span>
                               </div>
                             )}
                           </div>
                         </div>

                         {/* Sicurezza */}
                         <div className="space-y-2">
                           <h4 className="text-sm font-medium text-gray-700">Sicurezza</h4>
                           <div className="space-y-1">
                             {site.rspp && (
                               <div className="flex items-center text-sm text-gray-600">
                                 <Shield className="h-4 w-4 mr-2" />
                                 RSPP: {site.rspp.firstName} {site.rspp.lastName}
                               </div>
                             )}
                             {site.medicoCompetente && (
                               <div className="flex items-center text-sm text-gray-600">
                                 <Stethoscope className="h-4 w-4 mr-2" />
                                 MC: {site.medicoCompetente.firstName} {site.medicoCompetente.lastName}
                               </div>
                             )}
                             {site.dvr && (
                               <div className="flex items-center text-sm text-gray-600">
                                 <FileText className="h-4 w-4 mr-2" />
                                 DVR: {site.dvr}
                               </div>
                             )}
                           </div>
                         </div>
                       </div>

                       {/* Sopralluogo */}
                       {(site.ultimoSopralluogo || site.prossimoSopralluogo || site.valutazioneSopralluogo) && (
                         <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                           <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                             <Calendar className="h-4 w-4 mr-2" />
                             Sopralluogo
                           </h4>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                             {site.ultimoSopralluogo && (
                               <div>
                                 <span className="font-medium">Ultimo:</span> {new Date(site.ultimoSopralluogo).toLocaleDateString()}
                               </div>
                             )}
                             {site.prossimoSopralluogo && (
                               <div>
                                 <span className="font-medium">Prossimo:</span> {new Date(site.prossimoSopralluogo).toLocaleDateString()}
                               </div>
                             )}
                             {site.valutazioneSopralluogo && (
                               <div>
                                 <span className="font-medium">Valutazione:</span> {site.valutazioneSopralluogo}
                               </div>
                             )}
                           </div>
                         </div>
                       )}
                     </div>

                     <div className="flex flex-wrap gap-2 ml-4">
                       {/* Pulsanti a forma di pillola per gestire DVR, Sopralluoghi e Reparti */}
                       <button
                         onClick={() => setActiveManager({ type: 'dvr', siteId: site.id, siteName: site.siteName })}
                         className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors flex items-center"
                         title="Gestisci DVR"
                       >
                         <FileText className="h-3 w-3 mr-1" />
                         DVR
                       </button>
                       <button
                         onClick={() => setActiveManager({ type: 'sopralluogo', siteId: site.id, siteName: site.siteName })}
                         className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-full transition-colors flex items-center"
                         title="Gestisci Sopralluoghi"
                       >
                         <Eye className="h-3 w-3 mr-1" />
                         Sopralluoghi
                       </button>
                       <button
                         onClick={() => setActiveManager({ type: 'reparto', siteId: site.id, siteName: site.siteName })}
                         className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors flex items-center"
                         title="Gestisci Reparti"
                       >
                         <Users className="h-3 w-3 mr-1" />
                         Reparti
                       </button>
                       <button
                         onClick={() => handleEdit(site)}
                         className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors flex items-center"
                         title="Modifica sede"
                       >
                         <Edit className="h-3 w-3 mr-1" />
                         Modifica
                       </button>
                       <button
                         onClick={() => handleDelete(site.id)}
                         className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-full transition-colors flex items-center"
                         title="Elimina sede"
                       >
                         <Trash2 className="h-3 w-3 mr-1" />
                         Elimina
                       </button>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}

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

export default CompanySites;