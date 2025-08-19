import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../../services/api';
import { useToast } from '../../hooks/useToast';

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
  // Nuovi campi per sopralluoghi separati
  ultimoSopralluogoRSPP?: string;
  prossimoSopralluogoRSPP?: string;
  noteSopralluogoRSPP?: string;
  ultimoSopralluogoMedico?: string;
  prossimoSopralluogoMedico?: string;
  noteSopralluogoMedico?: string;
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

interface CompanySiteFormProps {
  companyId: string;
  site?: CompanySite | null;
  onSuccess: () => void;
  onClose: () => void;
}

const CompanySiteForm: React.FC<CompanySiteFormProps> = ({ companyId, site, onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    siteName: site?.siteName || '',
    citta: site?.citta || '',
    indirizzo: site?.indirizzo || '',
    cap: site?.cap || '',
    provincia: site?.provincia || '',
    personaRiferimento: site?.personaRiferimento || '',
    telefono: site?.telefono || '',
    mail: site?.mail || '',
    dvr: site?.dvr || '',
    rsppId: site?.rsppId || '',
    medicoCompetenteId: site?.medicoCompetenteId || '',
    ultimoSopralluogo: site?.ultimoSopralluogo || '',
    prossimoSopralluogo: site?.prossimoSopralluogo || '',
    valutazioneSopralluogo: site?.valutazioneSopralluogo || '',
    sopralluogoEseguitoDa: site?.sopralluogoEseguitoDa || '',
    // Nuovi campi per sopralluoghi separati
    ultimoSopralluogoRSPP: site?.ultimoSopralluogoRSPP || '',
    prossimoSopralluogoRSPP: site?.prossimoSopralluogoRSPP || '',
    noteSopralluogoRSPP: site?.noteSopralluogoRSPP || '',
    ultimoSopralluogoMedico: site?.ultimoSopralluogoMedico || '',
    prossimoSopralluogoMedico: site?.prossimoSopralluogoMedico || '',
    noteSopralluogoMedico: site?.noteSopralluogoMedico || ''
  });
  const [loading, setLoading] = useState(false);
  const [persons, setPersons] = useState<any[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      const response = await apiGet('/api/v1/persons') as { persons?: any[] };
      setPersons(response.persons || []);
    } catch (error) {
      console.error('Error fetching persons:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        companyId
      };

      if (site) {
        await apiPut(`/api/company-sites/${site.id}`, payload);
      } else {
        await apiPost('/api/company-sites', payload);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving site:', error);
      showToast({ message: 'Errore nel salvataggio della sede', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {site ? 'Modifica Sede' : 'Nuova Sede'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200"
          >
            <span className="sr-only">Chiudi</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Informazioni di base */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <h4 className="text-lg font-semibold text-blue-900 mb-6 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              Informazioni di Base
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Sede *
                </label>
                <input
                  type="text"
                  name="siteName"
                  value={formData.siteName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Città *
                </label>
                <input
                  type="text"
                  name="citta"
                  value={formData.citta}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Indirizzo *
                </label>
                <input
                  type="text"
                  name="indirizzo"
                  value={formData.indirizzo}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CAP *
                </label>
                <input
                  type="text"
                  name="cap"
                  value={formData.cap}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provincia *
                </label>
                <input
                  type="text"
                  name="provincia"
                  value={formData.provincia}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Contatti */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
            <h4 className="text-lg font-semibold text-green-900 mb-6 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              Contatti
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Persona di Riferimento
                </label>
                <input
                  type="text"
                  name="personaRiferimento"
                  value={formData.personaRiferimento}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefono
                </label>
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="mail"
                  value={formData.mail}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Sicurezza sul lavoro */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
            <h4 className="text-lg font-semibold text-orange-900 mb-6 flex items-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
              Sicurezza sul Lavoro
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DVR
                </label>
                <input
                  type="text"
                  name="dvr"
                  value={formData.dvr}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RSPP
                </label>
                <select
                  name="rsppId"
                  value={formData.rsppId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Seleziona RSPP</option>
                  {persons.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medico Competente
                </label>
                <select
                  name="medicoCompetenteId"
                  value={formData.medicoCompetenteId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Seleziona Medico Competente</option>
                  {persons.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sopralluoghi */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
            <h4 className="text-lg font-semibold text-purple-900 mb-6 flex items-center">
              <Calendar className="h-6 w-6 mr-3 text-purple-600" />
              Gestione Sopralluoghi
            </h4>
            
            {/* Card affiancate per sopralluoghi */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sopralluogo RSPP */}
              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200">
                <h5 className="text-md font-bold text-blue-800 mb-4 flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  Sopralluogo RSPP
                </h5>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Ultimo Sopralluogo RSPP
                    </label>
                    <input
                      type="date"
                      name="ultimoSopralluogoRSPP"
                      value={formData.ultimoSopralluogoRSPP}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Prossimo Sopralluogo RSPP
                    </label>
                    <input
                      type="date"
                      name="prossimoSopralluogoRSPP"
                      value={formData.prossimoSopralluogoRSPP}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Note Sopralluogo RSPP
                    </label>
                    <textarea
                      name="noteSopralluogoRSPP"
                      value={formData.noteSopralluogoRSPP}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Inserisci note e valutazioni del sopralluogo RSPP..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sopralluogo Medico Competente */}
              <div className="p-6 bg-green-50 rounded-2xl border border-green-200">
                <h5 className="text-md font-bold text-green-800 mb-4 flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  Sopralluogo Medico Competente
                </h5>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Ultimo Sopralluogo Medico
                    </label>
                    <input
                      type="date"
                      name="ultimoSopralluogoMedico"
                      value={formData.ultimoSopralluogoMedico}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Prossimo Sopralluogo Medico
                    </label>
                    <input
                      type="date"
                      name="prossimoSopralluogoMedico"
                      value={formData.prossimoSopralluogoMedico}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Note Sopralluogo Medico
                    </label>
                    <textarea
                      name="noteSopralluogoMedico"
                      value={formData.noteSopralluogoMedico}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Inserisci note e valutazioni del sopralluogo del Medico Competente..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pulsanti */}
          <div className="flex justify-end space-x-4 pt-8 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 border border-transparent rounded-full hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? 'Salvataggio...' : (site ? 'Aggiorna Sede' : 'Crea Sede')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanySiteForm;