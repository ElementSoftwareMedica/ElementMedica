import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Edit,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Shield,
  Stethoscope,
  User
} from 'lucide-react';
import { getLoadingErrorMessage } from '../../utils/errorUtils';
import { apiGet } from '../../services/api';
import CompanySites from '../../components/companies/CompanySites';
import EmployeesSection from '../../components/companies/EmployeesSection';
import TariffariAziendaSection from '../../components/companies/TariffariAziendaSection';
import EntitySchedulesSection from '../../components/shared/EntitySchedulesSection';

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

const CompanyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  // const [companySites, setCompanySites] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const companyData = await apiGet(`/api/v1/companies/${id}`);
        setCompany(companyData);
        // setCompanySites([...]) // Removed: CompanySites handles its own fetch
      } catch (err) {
        console.error('Error fetching company data:', err);
        setError(getLoadingErrorMessage('companies', err));
        setCompany(null);
        // setCompanySites([]); // Removed: CompanySites handles its own state
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
                  <span className="block text-sm text-gray-600">{company.personaRiferimento || '-'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Telefono</span>
                  <span className="block text-sm text-gray-600">{company.telefono || '-'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Mail</span>
                  <span className="block text-sm text-gray-600">{company.mail || '-'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-2">
                  <span className="block text-xs font-medium text-gray-800">Sede Azienda</span>
                  <span className="block text-sm text-gray-600">{company.sedeAzienda || '-'}</span>
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
                  <span className="block text-sm text-gray-600">{company.piva || '-'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">Codice Fiscale</span>
                  <span className="block text-sm text-gray-600">{company.codiceFiscale || '-'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">Codice ATECO</span>
                  <span className="block text-sm text-gray-600">{company.codiceAteco || '-'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div className="ml-0">
                  <span className="block text-xs font-medium text-gray-800">SDI</span>
                  <span className="block text-sm text-gray-600">{company.sdi || '-'}</span>
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

      {/* Tariffari Medicina Lavoro Section */}
      <TariffariAziendaSection
        companyId={id!}
        companyName={company.ragioneSociale}
      />

      {/* Corsi Programmati Section */}
      <EntitySchedulesSection
        entityType="company"
        entityId={id!}
        title="Corsi Programmati"
        showDocuments={true}
        maxItems={5}
        showQuickDownloads={true}
      />

      {/* Prossime Scadenze Section - Full Width */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-orange-600" />
            Prossime Scadenze
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500">Nessuna scadenza registrata per questa azienda.</p>
          <p className="text-sm text-gray-400 mt-1">Le scadenze verranno mostrate qui quando disponibili.</p>
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
          </div>

          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Shield className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Nessun sopralluogo RSPP registrato.</p>
            <p className="text-sm text-gray-400 mt-1">I sopralluoghi verranno mostrati qui quando programmati.</p>
          </div>
        </div>

        {/* Sopralluogo Medico Competente */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Stethoscope className="h-5 w-5 mr-2 text-green-600" />
              Sopralluogo Medico Competente
            </h2>
          </div>

          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Stethoscope className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Nessun sopralluogo medico registrato.</p>
            <p className="text-sm text-gray-400 mt-1">I sopralluoghi verranno mostrati qui quando programmati.</p>
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