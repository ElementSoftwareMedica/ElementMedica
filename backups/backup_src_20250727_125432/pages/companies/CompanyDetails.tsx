import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getLoadingErrorMessage } from '../../utils/errorUtils';

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
}

interface CompanySitesResponse {
  sites: CompanySite[];
}
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Edit, 
  Users, 
  ClipboardCheck,
  GraduationCap,
  Calendar,
  ChevronRight,
  Clock,
  AlertTriangle,
  BookOpen,
  Stethoscope,
  Shield,
  Building2
} from 'lucide-react';
import { apiGet } from '../../services/api';
import CompanySites from '../../components/companies/CompanySites';
import EmployeesSection from '../../components/companies/EmployeesSection';

const CompanyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [companySites, setCompanySites] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [companyData, sitesResponse] = await Promise.all([
        apiGet(`/api/companies/${id}`),
        apiGet(`/api/company-sites/company/${id}`) as Promise<CompanySitesResponse>
      ]);
      setCompany(companyData);
      setCompanySites(Array.isArray(sitesResponse?.sites) ? sitesResponse.sites : []);
      } catch (err) {
        console.error('Error fetching company data:', err);
        setError(getLoadingErrorMessage('companies', err));
        setCompany(null);
        setCompanySites([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-80">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Errore nel caricamento</h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <Link to="/companies" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Torna alle Aziende
          </Link>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">Azienda non trovata</h2>
          <p className="text-gray-600 mt-2">L'azienda che stai cercando non esiste o è stata rimossa.</p>
          <Link to="/companies" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Torna alle Aziende
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link 
          to="/companies" 
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <span className="transform rotate-180">
            <ChevronRight className="h-4 w-4 mr-1" />
          </span>
          Torna alle Aziende
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-white">{company.ragioneSociale?.substring(0, 2)?.toUpperCase() || 'NA'}</span>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-800">{company.ragioneSociale}</h1>
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <Link to={`/companies/${company.id}/edit`} className="btn-primary flex items-center rounded-full">
              <Edit className="h-4 w-4 mr-1" />
              Modifica Azienda
            </Link>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Informazioni di Contatto</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <User className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Persona di Riferimento</span>
                  <span className="block text-sm text-gray-600">{company.persona_riferimento}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Telefono</span>
                  <span className="block text-sm text-gray-600">{company.telefono}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Mail</span>
                  <span className="block text-sm text-gray-600">{company.mail}</span>
                </div>
              </li>
              <li className="flex items-start">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Sede Azienda</span>
                  <span className="block text-sm text-gray-600">{company.sede_azienda}</span>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Dati Fiscali</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">P.IVA</span>
                  <span className="block text-sm text-gray-600">{company.piva}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">Codice Fiscale</span>
                  <span className="block text-sm text-gray-600">{company.codice_fiscale}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">Codice ATECO</span>
                  <span className="block text-sm text-gray-600">{company.codice_ateco}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">SDI</span>
                  <span className="block text-sm text-gray-600">{company.sdi}</span>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Dati Aggiuntivi</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">PEC</span>
                  <span className="block text-sm text-gray-600">{company.pec}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">IBAN</span>
                  <span className="block text-sm text-gray-600">{company.iban}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">Località</span>
                  <span className="block text-sm text-gray-600">{company.citta}, {company.provincia} {company.cap}</span>
                </div>
              </li>
              {company.note && (
                <li className="flex items-start">
                  <div className="ml-0">
                    <span className="block text-xs font-medium text-gray-800">Note</span>
                    <span className="block text-sm text-gray-600">{company.note}</span>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>

      </div>

      {/* Company Sites Section */}
      <CompanySites 
        companyId={id!} 
        selectedSiteId={selectedSiteId} 
        onSiteFilterChange={setSelectedSiteId}
      />

      {/* Dipendenti Section */}
      <EmployeesSection companyId={id!} />

      {/* Prossime Scadenze e Corsi/Visite - Layout affiancato con altezza doppia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prossime Scadenze Section */}
        <div className="bg-white rounded-lg shadow p-6 h-96">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-orange-600" />
              Prossime Scadenze
            </h2>
            <button className="text-orange-600 hover:text-orange-800 flex items-center">
              Vedi Tutte
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          <div className="space-y-3 overflow-y-auto h-80">
            {/* Scadenza Esempio 1 */}
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Rinnovo Certificazione Sicurezza</p>
                  <p className="text-sm text-gray-600">Sede Principale</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-orange-600">15 giorni</p>
                <p className="text-xs text-gray-500">31/12/2024</p>
              </div>
            </div>

            {/* Scadenza Esempio 2 */}
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Aggiornamento Formazione Antincendio</p>
                  <p className="text-sm text-gray-600">Sede Secondaria</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-yellow-600">30 giorni</p>
                <p className="text-xs text-gray-500">15/01/2025</p>
              </div>
            </div>

            {/* Scadenza Esempio 3 */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Controllo Periodico Attrezzature</p>
                  <p className="text-sm text-gray-600">Tutte le sedi</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">45 giorni</p>
                <p className="text-xs text-gray-500">30/01/2025</p>
              </div>
            </div>

            {/* Scadenza Esempio 4 */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Revisione DVR</p>
                  <p className="text-sm text-gray-600">Sede Principale</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-blue-600">60 giorni</p>
                <p className="text-xs text-gray-500">15/02/2025</p>
              </div>
            </div>
          </div>
        </div>

        {/* Corsi e Visite Programmate Section */}
        <div className="bg-white rounded-lg shadow p-6 h-96">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              Corsi e Visite Programmate
            </h2>
            <button className="text-purple-600 hover:text-purple-800 flex items-center">
              Pianifica Nuovo
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          <div className="space-y-3 overflow-y-auto h-80">
            {/* Corso Esempio 1 */}
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">CORSO</span>
                </div>
                <span className="text-xs text-gray-500">15 Gen 2025</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Formazione Sicurezza sul Lavoro</h3>
              <p className="text-sm text-gray-600 mb-2">Sede Principale - Aula A</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">20 partecipanti</span>
                <span className="text-green-600 font-medium">Confermato</span>
              </div>
            </div>

            {/* Visita Esempio 1 */}
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <Stethoscope className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">VISITA</span>
                </div>
                <span className="text-xs text-gray-500">22 Gen 2025</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Sorveglianza Sanitaria</h3>
              <p className="text-sm text-gray-600 mb-2">Sede Secondaria - Ambulatorio</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">15 dipendenti</span>
                <span className="text-yellow-600 font-medium">In Programma</span>
              </div>
            </div>

            {/* Corso Esempio 2 */}
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">CORSO</span>
                </div>
                <span className="text-xs text-gray-500">28 Gen 2025</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Aggiornamento Antincendio</h3>
              <p className="text-sm text-gray-600 mb-2">Sede Principale - Piazzale</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">12 partecipanti</span>
                <span className="text-blue-600 font-medium">Da Confermare</span>
              </div>
            </div>

            {/* Visita Esempio 2 */}
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <Stethoscope className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">VISITA</span>
                </div>
                <span className="text-xs text-gray-500">05 Feb 2025</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Controlli Periodici</h3>
              <p className="text-sm text-gray-600 mb-2">Tutte le sedi</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">45 dipendenti</span>
                <span className="text-green-600 font-medium">Confermato</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sopralluoghi RSPP e Medico Competente - Card affiancate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sopralluogo RSPP */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Sopralluogo RSPP
            </h2>
            <button className="text-blue-600 hover:text-blue-800 flex items-center">
              Pianifica
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Ultimo Sopralluogo */}
            <div className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Ultimo Sopralluogo</h3>
                <span className="text-sm text-blue-600 font-medium">Completato</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Data: 15 Novembre 2024</p>
              <p className="text-sm text-gray-600 mb-1">Sede: Sede Principale</p>
              <p className="text-sm text-gray-600">RSPP: Dott. Mario Rossi</p>
            </div>

            {/* Prossimo Sopralluogo */}
            <div className="border-l-4 border-orange-400 bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Prossimo Sopralluogo</h3>
                <span className="text-sm text-orange-600 font-medium">Programmato</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Data: 15 Febbraio 2025</p>
              <p className="text-sm text-gray-600 mb-1">Sede: Sede Secondaria</p>
              <p className="text-sm text-gray-600">RSPP: Dott. Mario Rossi</p>
            </div>

            {/* Statistiche */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">4</p>
                <p className="text-sm text-gray-600">Sopralluoghi 2024</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">2</p>
                <p className="text-sm text-gray-600">Programmati 2025</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sopralluogo Medico Competente */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Stethoscope className="h-5 w-5 mr-2 text-green-600" />
              Sopralluogo Medico Competente
            </h2>
            <button className="text-green-600 hover:text-green-800 flex items-center">
              Pianifica
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Ultimo Sopralluogo */}
            <div className="border-l-4 border-green-400 bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Ultimo Sopralluogo</h3>
                <span className="text-sm text-green-600 font-medium">Completato</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Data: 20 Ottobre 2024</p>
              <p className="text-sm text-gray-600 mb-1">Sede: Sede Principale</p>
              <p className="text-sm text-gray-600">Medico: Dott.ssa Anna Bianchi</p>
            </div>

            {/* Prossimo Sopralluogo */}
            <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Prossimo Sopralluogo</h3>
                <span className="text-sm text-yellow-600 font-medium">Da Programmare</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Data: Da definire</p>
              <p className="text-sm text-gray-600 mb-1">Sede: Tutte le sedi</p>
              <p className="text-sm text-gray-600">Medico: Dott.ssa Anna Bianchi</p>
            </div>

            {/* Statistiche */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">3</p>
                <p className="text-sm text-gray-600">Sopralluoghi 2024</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">1</p>
                <p className="text-sm text-gray-600">Da Programmare</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="#" className="bg-white p-4 rounded-full shadow flex items-center transition-all duration-200 hover:shadow-md hover:translate-y-[-2px]">
          <div className="p-3 bg-green-100 rounded-full">
            <ClipboardCheck className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-800">Assessments</h3>
            <p className="text-xs text-gray-500">View health assessments</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
        </Link>
        <Link to="#" className="bg-white p-4 rounded-full shadow flex items-center transition-all duration-200 hover:shadow-md hover:translate-y-[-2px]">
          <div className="p-3 bg-amber-100 rounded-full">
            <GraduationCap className="h-6 w-6 text-amber-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-800">Training History</h3>
            <p className="text-xs text-gray-500">Review past training</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
        </Link>
      </div>

    </div>
  );
};

export default CompanyDetails;