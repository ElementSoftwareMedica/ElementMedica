import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  ChevronRight,
  Edit,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  User,
  Calendar,
  Briefcase,
  Shield,
  Share2,
  AlertTriangle,
  HardHat,
  Globe,
  Lock,
  Loader2,
  Receipt,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { getLoadingErrorMessage } from '../../utils/errorUtils';
import { apiGet } from '../../services/api';
import CompanySites from '../../components/companies/CompanySites';
import EmployeesSection from '../../components/companies/EmployeesSection';
import CompanyTrainingRequirements from '../../components/companies/CompanyTrainingRequirements';
import CompanyMansioniSection from '../../components/companies/CompanyMansioniSection';
import CompanyProtocolliSanitariSection from '../../components/companies/CompanyProtocolliSanitariSection';
import CompanySorveglianzaSection from '../../components/companies/CompanySorveglianzaSection';
import MDLServicesCard from '../../components/companies/MDLServicesCard';
import CompanyDocumentsSummaryCard from '../../components/companies/CompanyDocumentsSummaryCard';
import Allegato3BCard from '../../components/companies/Allegato3BCard';
import OT23Card from '../../components/companies/OT23Card';
import RisultatiAnonimiCard from '../../components/companies/RisultatiAnonimiCard';
import RiunionePeriodicaCard from '../../components/companies/RiunionePeriodicaCard';
import { QuickActionsIntegrated, QuickActionTariffarioModal } from '../../components/companies/quick-actions';
import { cn } from '../../design-system/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CompanyBillingCard from '../../components/companies/CompanyBillingCard';
import FatturaModal, { FatturabileBillingItem } from '../../components/companies/FatturaModal';
import { useBillingAccess } from '../../hooks/useBillingAccess';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';

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

// P58: Interfaccia per nomine
interface NominaInfo {
  id: string;
  tipoRuolo: 'MEDICO_COMPETENTE' | 'MEDICO_COMPETENTE_COORDINATO' | 'RSPP' | 'ASPP' | 'RLS' | 'PREPOSTO' | 'ADDETTO_PS' | 'ADDETTO_AI' | 'DIRIGENTE_SICUREZZA';
  stato: string;
  dataInizio?: string;
  dataFine?: string;
  dataScadenza?: string;
  persona?: {
    id: string;
    fullName: string;
  };
  site?: {
    id: string;
    siteName?: string;
  } | null;
}

// P59: Interfaccia per DVR
interface DVRInfo {
  id: string;
  siteId: string;
  dataEsecuzione: string;
  dataScadenza: string;
  effettuatoDa: string;
  rischiRilevati?: string;
  note?: string;
  // P59: Documento PDF
  documentoUrl?: string;
  documentoNome?: string;
  site?: {
    id: string;
    siteName: string;
    citta?: string;
    indirizzo?: string;
  };
}

interface CompanyMdlDocumentFile {
  filename: string;
  originalName: string;
  url: string;
  createdAt?: string;
  signedOnline?: boolean;
  note?: string | null;
  documentType?: string;
}

// Giudizio di idoneità mostrato nel tab Documenti
interface GiudizioDocItem {
  id: string;
  tipoGiudizio?: string;
  stato?: string;
  dataEmissione?: string | null;
  person?: { firstName?: string; lastName?: string } | null;
  firmaLavoratore?: { createdAt: string } | null;
}

// Preventivo mostrato nel tab Documenti
interface PreventivoDocItem {
  id: string;
  numero?: string | null;
  numeroProgressivo?: number | null;
  stato?: string;
  tipoServizio?: string;
  dataEmissione?: string | null;
}

// Fattura mostrata nel tab Documenti
interface FatturaDocItem {
  id: string;
  numero?: string | null;
  stato?: string;
  tipoDocumento?: string;
  dataEmissione?: string | null;
}

// Allegato 3B (INAIL) mostrato nel tab Documenti
interface Allegato3BDocItem {
  id: string;
  anno?: number;
  stato?: string;
  dataInvio?: string | null;
}

// P59: Interfaccia per Sopralluogo
interface SopralluogoInfo {
  id: string;
  siteId: string;
  dataEsecuzione: string;
  dataProssimoSopralluogo?: string;
  valutazione?: string;
  esito?: string;
  note?: string;
  // P59: Documento PDF
  documentoUrl?: string;
  documentoNome?: string;
  site?: {
    id: string;
    siteName: string;
    citta?: string;
    indirizzo?: string;
  };
  esecutore?: {
    id: string;
    firstName: string;
    lastName: string;
    gender?: string;
  };
}

// P59 Sprint 11.2: Interfaccia per Voce Tariffario
interface VoceTariffarioInfo {
  id: string;
  tipo: string;
  nome?: string;
  descrizione?: string;
  prezzoBase: number | string;
  frequenza: string;
  unitaCalcolo?: string;
  usaFasceDipendenti?: boolean;
  attivo: boolean;
  ordine: number;
  prestazione?: {
    id: string;
    codice: string;
    nome: string;
  };
  fasceDipendenti?: Array<{
    id: string;
    minDipendenti: number;
    maxDipendenti?: number | null;
    prezzo: number | string;
  }>;
}

// P59 Sprint 11.2: Interfaccia per Tariffario associato (via M2M)
interface TariffarioInfo {
  id: string;
  codice: string;
  nome: string;
  descrizione?: string;
  validoDa?: string;
  validoA?: string | null;
  attivo: boolean;
  vociCount?: number;  // Mapped from voci.length
  _count?: {
    voci?: number;
    companyAssociations?: number;
  };
  voci?: VoceTariffarioInfo[];
  association?: {
    id: string;
    validoDa: string;
    validoA?: string | null;
    attivo: boolean;
    note?: string | null;
  };
}

// P58: Interfaccia per cross-tenant info
interface CrossTenantInfo {
  isOwner: boolean;
  ownerTenant?: {
    id: string;
    name: string;
  } | null;
  sharedWith: Array<{
    tenantId: string;
    tenantName: string;
    status: string;
  }>;
  sharedDataTypes: string[];
  totalShares: number;
}

// Alerts summary (scadenze + movimenti da fatturare)
interface AlertsSummary {
  movimentiDaFatturare: number;
  corsiInScadenza: number;
  nomineInScadenza: number;
  dvrInScadenza: number;
  sopralluoghiInScadenza: number;
}

// P58: Interfaccia tipizzata per i dati dell'azienda
interface CompanyData {
  id: string;
  companyTenantProfileId: string;
  companyId: string;
  ragioneSociale: string;
  piva?: string;
  codiceFiscale?: string;
  codiceAteco?: string;
  sdi?: string;
  pec?: string;
  iban?: string;
  formaGiuridica?: string;
  settore?: string;
  dimensione?: string;
  isPrimary?: boolean;
  // Sede legale
  sedeLegaleIndirizzo?: string;
  sedeLegaleCitta?: string;
  sedeLegaleCap?: string;
  sedeLegaleProvincia?: string;
  // Contatti tenant
  emailGenerale?: string;
  telefonoGenerale?: string;
  // Referente
  referente?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string;
  };
  referenteRuolo?: string;
  // Status
  status?: string;
  isActive?: boolean;
  // Conteggi
  _count?: {
    personProfiles: number;
    courseSchedules: number;
    preventivi: number;
    sites: number;
  };
  // Date
  dataInizioRapporto?: string;
  createdAt?: string;
  updatedAt?: string;
  // Note
  noteCommerciali?: string;
  noteOperative?: string;
  noteInterne?: string;
  // Sedi
  sites?: CompanySite[];
  // Tenant
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
  // P58: Cross-tenant info
  crossTenant?: CrossTenantInfo;
  // P58: Nomine attive
  nomine?: NominaInfo[];
  // P58: Cross-tenant ownership
  ownerTenantId?: string;
  tenantId?: string;
  ownerTenantName?: string;
  consentGrantedAt?: string;
}

// P58: Determina se l'azienda è seguita per MDL (Medicina Del Lavoro)
const hasMDLServices = (company: CompanyData): boolean => {
  // Un'azienda è MDL se ha sedi con DVR, RSPP o Medico Competente, o ha nomine attive
  const hasNomineMDL = company.nomine && company.nomine.some(n => ['MEDICO_COMPETENTE', 'RSPP'].includes(n.tipoRuolo));
  const hasSiteMDL = company.sites?.some(site => site.dvr || site.rsppId || site.medicoCompetenteId);
  return hasNomineMDL || hasSiteMDL || false;
};

// P58: Determina se l'azienda ha corsi programmati
const hasTrainingServices = (company: CompanyData): boolean => {
  return (company._count?.courseSchedules ?? 0) > 0;
};

const CompanyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  // P59: Stati per DVR, Sopralluoghi e Tariffari
  const [dvrs, setDvrs] = useState<DVRInfo[]>([]);
  const [sopralluoghi, setSopralluoghi] = useState<SopralluogoInfo[]>([]);
  const [tariffario, setTariffario] = useState<TariffarioInfo | null>(null);
  const [successoreTariffario, setSuccessoreTariffario] = useState<TariffarioInfo | null>(null);
  const [storicoTariffari, setStoricoTariffari] = useState<TariffarioInfo[]>([]);
  const [mdlDocuments, setMdlDocuments] = useState<CompanyMdlDocumentFile[]>([]);
  const [giudizi, setGiudizi] = useState<GiudizioDocItem[]>([]);
  const [preventivi, setPreventivi] = useState<PreventivoDocItem[]>([]);
  const [fatture, setFatture] = useState<FatturaDocItem[]>([]);
  const [allegati3B, setAllegati3B] = useState<Allegato3BDocItem[]>([]);
  // P59: Trigger per forzare refresh delle sezioni dopo quick actions
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // P59 Sprint 11.2: Stato per modal associazione tariffario
  const [showTariffarioModal, setShowTariffarioModal] = useState(false);
  // Tab attivo: operativo | sicurezza | fatturazione | documenti — persisted in URL (?tab=...)
  type CompanyTab = 'operativo' | 'sicurezza' | 'fatturazione' | 'documenti';
  const activeTab = (searchParams.get('tab') as CompanyTab) || 'operativo';
  const setActiveTab = (tab: CompanyTab) => {
    setSearchParams(prev => { prev.set('tab', tab); return prev; }, { replace: true });
  };
  // Fattura modal
  const [showFatturaModal, setShowFatturaModal] = useState(false);
  const [billingItemsForModal, setBillingItemsForModal] = useState<FatturabileBillingItem[]>([]);
  const [loadingFatturaModal, setLoadingFatturaModal] = useState(false);
  const { hasBillingAccess } = useBillingAccess();
  const { user } = useAuth();
  const userRoles = Array.isArray((user as any)?.roles)
    ? (user as any).roles
    : [(user as any)?.roleType].filter(Boolean);
  const isOnlyMedico = userRoles.length === 1 && userRoles[0] === 'MEDICO';
  const canSeeBillingTab = hasBillingAccess && !isOnlyMedico;

  const { showToast } = useToast();

  useEffect(() => {
    if (!canSeeBillingTab && activeTab === 'fatturazione') {
      setActiveTab('operativo');
    }
    if (isOnlyMedico && activeTab === 'documenti') {
      setActiveTab('operativo');
    }
  }, [activeTab, canSeeBillingTab, isOnlyMedico]);

  // Alerts summary query (scadenze + movimenti da fatturare)
  const { data: alertsSummary, refetch: refetchAlerts } = useQuery<AlertsSummary>({
    queryKey: ['company-alerts', id],
    queryFn: async () => {
      const res = await apiGet<{ success: boolean; data: AlertsSummary }>(`/api/v1/companies/${id}/alerts-summary`);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      // Fetch principale dati azienda
      const companyData = await apiGet<CompanyData>(`/api/v1/companies/${id}`);

      // P59: Prepara header X-Operate-Tenant-Id se la company ha un tenantId diverso dall'utente
      const operateTenantHeaders: Record<string, string> = companyData.tenantId
        ? { 'X-Operate-Tenant-Id': companyData.tenantId }
        : {};

      // P59: Fetch parallelo per DVR, Sopralluoghi, Tariffari e Nomine
      const [dvrsResponse, sopralluoghiResponse, tariffariResponse, nomineResponse, nomineDocsResponse, tariffarioDocsResponse] = await Promise.allSettled([
        apiGet<{ dvrs: DVRInfo[] }>(`/api/v1/dvr/company/${id}`, {}, { headers: operateTenantHeaders }),
        apiGet<{ sopralluoghi: SopralluogoInfo[] }>(`/api/v1/sopralluogo/company/${id}`, {}, { headers: operateTenantHeaders }),
        apiGet<{ success: boolean; data: TariffarioInfo[] }>(`/api/v1/companies/${id}/tariffari`),
        apiGet<NominaInfo[]>(`/api/v1/clinica/nomine-ruolo/by-company/${companyData.companyTenantProfileId}`, {}, { headers: operateTenantHeaders }),
        apiGet<{ success: boolean; data: CompanyMdlDocumentFile[] }>(`/api/v1/companies/${id}/mdl-documents/nomine/files`, {}, { headers: operateTenantHeaders }),
        apiGet<{ success: boolean; data: CompanyMdlDocumentFile[] }>(`/api/v1/companies/${id}/mdl-documents/tariffario/files`, {}, { headers: operateTenantHeaders })
      ]);

      // Gestisci Nomine — API returns `person`, MDLServicesCard expects `persona`
      const mapNomine = (raw: any[]): NominaInfo[] => raw.map(n => ({
        ...n,
        persona: n.persona || n.person ? { ...n.person, fullName: n.person ? `${n.person.lastName} ${n.person.firstName}` : undefined } : undefined
      }));
      if (nomineResponse.status === 'fulfilled' && Array.isArray(nomineResponse.value)) {
        companyData.nomine = mapNomine(nomineResponse.value);
      } else if (nomineResponse.status === 'fulfilled' && (nomineResponse.value as any)?.data) {
        companyData.nomine = mapNomine((nomineResponse.value as any).data);
      }

      // Gestisci DVR
      if (dvrsResponse.status === 'fulfilled' && dvrsResponse.value?.dvrs) {
        setDvrs(dvrsResponse.value.dvrs);
      } else {
        setDvrs([]);
      }

      // Gestisci Sopralluoghi
      if (sopralluoghiResponse.status === 'fulfilled' && sopralluoghiResponse.value?.sopralluoghi) {
        setSopralluoghi(sopralluoghiResponse.value.sopralluoghi);
      } else {
        setSopralluoghi([]);
      }

      const loadedMdlDocs = [
        ...(nomineDocsResponse.status === 'fulfilled' ? (nomineDocsResponse.value?.data || []).map(doc => ({ ...doc, documentType: 'nomine' })) : []),
        ...(tariffarioDocsResponse.status === 'fulfilled' ? (tariffarioDocsResponse.value?.data || []).map(doc => ({ ...doc, documentType: 'tariffario' })) : []),
      ];
      setMdlDocuments(loadedMdlDocs);

      // Giudizi di idoneità collegati all'azienda (per il tab Documenti)
      try {
        const giudiziRes = await apiGet<{ data: GiudizioDocItem[] }>(
          `/api/v1/clinica/giudizi-idoneita?companyTenantProfileId=${companyData.companyTenantProfileId}&limit=200`,
          {}, { headers: operateTenantHeaders }
        );
        setGiudizi(giudiziRes?.data || []);
      } catch {
        setGiudizi([]);
      }

      // Preventivi collegati all'azienda (per il tab Documenti)
      try {
        const prevRes = await apiGet<{ data: PreventivoDocItem[] }>(
          `/api/v1/preventivi?clienteId=${companyData.companyTenantProfileId}&clienteType=azienda&limit=200`,
          {}, { headers: operateTenantHeaders }
        );
        setPreventivi(prevRes?.data || []);
      } catch {
        setPreventivi([]);
      }

      // Fatture collegate all'azienda
      try {
        const fattRes = await apiGet<{ data: FatturaDocItem[] }>(
          `/api/v1/fatturazione-elettronica?clienteAziendaId=${companyData.companyTenantProfileId}&limit=200`,
          {}, { headers: operateTenantHeaders }
        );
        setFatture(fattRes?.data || []);
      } catch {
        setFatture([]);
      }

      // Allegati 3B (INAIL) collegati all'azienda
      try {
        const allRes = await apiGet<{ data: Allegato3BDocItem[] }>(
          `/api/v1/clinica/allegato-3b?companyTenantProfileId=${companyData.companyTenantProfileId}`,
          {}, { headers: operateTenantHeaders }
        );
        setAllegati3B(allRes?.data || []);
      } catch {
        setAllegati3B([]);
      }

      // P59 Sprint 11.2: Gestisci Tariffari - separa attivo da storico
      if (tariffariResponse.status === 'fulfilled' && tariffariResponse.value?.data?.length > 0) {
        const tariffariData = tariffariResponse.value.data as TariffarioInfo[];
        const now = new Date();

        // Separa tariffari: corrente, successore, storico
        // Corrente: validoDa <= now AND (validoA null o >= now) — indipendente da attivo (potrebbe essere false se ha successore)
        // Successore: validoDa > now
        // Storico: validoA < now
        const tariffariCorrenti: TariffarioInfo[] = [];
        const tariffariSuccessori: TariffarioInfo[] = [];
        const tariffariScaduti: TariffarioInfo[] = [];

        for (const t of tariffariData) {
          const validoDa = t.association?.validoDa ? new Date(t.association.validoDa) : null;
          const validoA = t.association?.validoA ? new Date(t.association.validoA) : null;
          const isExpired = validoA && validoA < now;
          const isFuture = validoDa && validoDa > now;

          const item = { ...t, vociCount: t.voci?.length || t._count?.voci || 0 };

          if (isExpired) {
            tariffariScaduti.push(item);
          } else if (isFuture) {
            tariffariSuccessori.push(item);
          } else {
            tariffariCorrenti.push(item);
          }
        }

        // Sort correnti by validoDa desc (più recente prima)
        tariffariCorrenti.sort((a, b) => {
          const dateA = new Date(a.association?.validoDa || a.validoDa || 0);
          const dateB = new Date(b.association?.validoDa || b.validoDa || 0);
          return dateB.getTime() - dateA.getTime();
        });
        // Sort successori by validoDa asc (più prossimo prima)
        tariffariSuccessori.sort((a, b) => {
          const dateA = new Date(a.association?.validoDa || a.validoDa || 0);
          const dateB = new Date(b.association?.validoDa || b.validoDa || 0);
          return dateA.getTime() - dateB.getTime();
        });

        // Attivo corrente = primo della lista correnti
        setTariffario(tariffariCorrenti[0] || null);
        // Successore = primo tariffario futuro
        setSuccessoreTariffario(tariffariSuccessori[0] || null);
        // Se non c'è corrente ma c'è successore, mostra il successore come corrente
        if (!tariffariCorrenti[0] && tariffariSuccessori[0]) {
          setTariffario(tariffariSuccessori[0]);
          setSuccessoreTariffario(tariffariSuccessori[1] || null);
        }

        // Imposta lo storico (ordinato per data scadenza desc)
        tariffariScaduti.sort((a, b) => {
          const dateA = new Date(a.association?.validoA || 0);
          const dateB = new Date(b.association?.validoA || 0);
          return dateB.getTime() - dateA.getTime();
        });
        setStoricoTariffari(tariffariScaduti);
      } else {
        setTariffario(null);
        setSuccessoreTariffario(null);
        setStoricoTariffari([]);
      }
      setCompany({ ...companyData });
    } catch (err) {
      setError(getLoadingErrorMessage('companies', err));
      setCompany(null);
      setMdlDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, [id]);

  // Callback per refresh dopo azioni quick panel
  const handleActionComplete = () => {
    fetchCompanyData();
    // Invalida anche le query correlate
    queryClient.invalidateQueries({ queryKey: ['company', id] });
    // P59: Forza refresh delle sezioni tariffari e altre
    setRefreshTrigger(prev => prev + 1);
    // Refresh alerts summary
    refetchAlerts();
  };

  // Apre FatturaModal caricando i movimenti DA_FATTURARE
  const handleOpenFatturaModal = async () => {
    setLoadingFatturaModal(true);
    try {
      const res = await apiGet<{ success: boolean; data: { items: FatturabileBillingItem[] } }>(
        `/api/v1/companies/${id}/billing-summary?status=DA_FATTURARE`
      );
      setBillingItemsForModal(res.data?.items ?? []);
      setShowFatturaModal(true);
    } catch {
      showToast({ type: 'error', message: 'Errore nel caricamento dei movimenti da fatturare' });
    } finally {
      setLoadingFatturaModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-3">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">Errore nel caricamento</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
          <Link to="/companies" className="mt-4 inline-block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
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
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Azienda non trovata</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">L'azienda che stai cercando non esiste o è stata rimossa.</p>
          <Link to="/companies" className="mt-4 inline-block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            Torna alle Aziende
          </Link>
        </div>
      </div>
    );
  }

  // P59: Verifica se ha tariffari configurati (usa lo stato dal fetch)
  const hasTariffariConfigured = !!tariffario;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/companies"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <span className="transform rotate-180">
            <ChevronRight className="h-4 w-4 mr-1" />
          </span>
          Torna alle Aziende
        </Link>
      </div>

      {/* Header con informazioni principali */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Header bar con avatar e azioni */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center">
              <div className="h-14 w-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center border border-white/30">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-white">{company.ragioneSociale}</h1>
                <div className="flex items-center gap-3 mt-1">
                  {company.status && (
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      company.status === 'ACTIVE' ? "bg-green-100 text-green-800" :
                        company.status === 'PROSPECT' ? "bg-blue-100 text-blue-800" :
                          company.status === 'INACTIVE' ? "bg-gray-100 text-gray-800" :
                            "bg-yellow-100 text-yellow-800"
                    )}>
                      {company.status === 'ACTIVE' ? 'Attiva' :
                        company.status === 'PROSPECT' ? 'Prospect' :
                          company.status === 'INACTIVE' ? 'Inattiva' :
                            company.status}
                    </span>
                  )}
                  {company.settore && (
                    <span className="text-blue-100 text-sm">{company.settore}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                to={`/companies/${company.id}/edit`}
                className="inline-flex items-center px-4 py-2 bg-white text-blue-700 rounded-lg font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors shadow-sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifica
              </Link>
            </div>
          </div>
        </div>

        {/* Conteggi rapidi */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 dark:divide-gray-700 border-b border-gray-100 dark:border-gray-700">
          <div className="px-6 py-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">{company._count?.sites ?? 0}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Sedi</div>
          </div>
          <div className="px-6 py-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">{company._count?.personProfiles ?? 0}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Dipendenti</div>
          </div>
          <div className="px-6 py-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">{company._count?.courseSchedules ?? 0}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Corsi</div>
          </div>
          <div className="px-6 py-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">{company._count?.preventivi ?? 0}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Preventivi</div>
          </div>
        </div>

        {/* Info principali in grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonna 1: Contatti */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contatti</h2>
            <ul className="space-y-3">
              {company.referente && (
                <li className="flex items-start">
                  <User className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="ml-3">
                    <span className="block text-xs text-gray-500 dark:text-gray-400">Referente</span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-50">
                      {company.referente.fullName}
                      {company.referenteRuolo && <span className="text-gray-500 dark:text-gray-400 font-normal"> ({company.referenteRuolo})</span>}
                    </span>
                  </div>
                </li>
              )}
              <li className="flex items-start">
                <Phone className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <span className="block text-xs text-gray-500 dark:text-gray-400">Telefono</span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-50">
                    {company.telefonoGenerale || <span className="text-gray-400">-</span>}
                  </span>
                </div>
              </li>
              <li className="flex items-start">
                <Mail className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <span className="block text-xs text-gray-500 dark:text-gray-400">Email</span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-50">
                    {company.emailGenerale || <span className="text-gray-400">-</span>}
                  </span>
                </div>
              </li>
              <li className="flex items-start">
                <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <span className="block text-xs text-gray-500 dark:text-gray-400">Sede Legale</span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-50">
                    {company.sedeLegaleIndirizzo || '-'}
                  </span>
                  {(company.sedeLegaleCitta || company.sedeLegaleProvincia) && (
                    <span className="block text-sm text-gray-600 dark:text-gray-400">
                      {[company.sedeLegaleCitta, company.sedeLegaleProvincia, company.sedeLegaleCap].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </li>
            </ul>
          </div>

          {/* Colonna 2: Dati Fiscali */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dati Fiscali</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Briefcase className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <span className="block text-xs text-gray-500 dark:text-gray-400">P.IVA</span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-50 font-mono">
                    {company.piva || <span className="text-gray-400">-</span>}
                  </span>
                </div>
              </li>
              <li className="flex items-start">
                <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <span className="block text-xs text-gray-500 dark:text-gray-400">Codice Fiscale</span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-50 font-mono">
                    {company.codiceFiscale || <span className="text-gray-400">-</span>}
                  </span>
                </div>
              </li>
              <li>
                <div className="ml-0">
                  <span className="block text-xs text-gray-500 dark:text-gray-400">Codice ATECO</span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-50">
                    {company.codiceAteco || <span className="text-gray-400">-</span>}
                  </span>
                </div>
              </li>
              <li>
                <div className="ml-0">
                  <span className="block text-xs text-gray-500 dark:text-gray-400">SDI (Fatturazione Elettronica)</span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-50 font-mono">
                    {company.sdi || <span className="text-gray-400">-</span>}
                  </span>
                </div>
              </li>
            </ul>
          </div>

          {/* Colonna 3: Altri dati */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Informazioni Aggiuntive</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Mail className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <span className="block text-xs text-gray-500 dark:text-gray-400">PEC</span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-50">
                    {company.pec || <span className="text-gray-400">-</span>}
                  </span>
                </div>
              </li>
              {company.iban && (
                <li>
                  <div className="ml-0">
                    <span className="block text-xs text-gray-500 dark:text-gray-400">IBAN</span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-50 font-mono">
                      {company.iban}
                    </span>
                  </div>
                </li>
              )}
              {company.formaGiuridica && (
                <li>
                  <div className="ml-0">
                    <span className="block text-xs text-gray-500 dark:text-gray-400">Forma Giuridica</span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-50">{company.formaGiuridica}</span>
                  </div>
                </li>
              )}
              {/* P59: Dimensione calcolata automaticamente dal numero di dipendenti */}
              <li>
                <div className="ml-0">
                  <span className="block text-xs text-gray-500 dark:text-gray-400">Dimensione Aziendale</span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-50">
                    {(() => {
                      const dipendenti = company._count?.personProfiles ?? 0;
                      if (dipendenti < 10) return 'Micro (< 10 dipendenti)';
                      if (dipendenti < 50) return 'Piccola (10-49 dipendenti)';
                      if (dipendenti < 250) return 'Media (50-249 dipendenti)';
                      return 'Grande (250+ dipendenti)';
                    })()}
                  </span>
                </div>
              </li>
              {company.dataInizioRapporto && (
                <li className="flex items-start">
                  <Calendar className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="ml-3">
                    <span className="block text-xs text-gray-500 dark:text-gray-400">Cliente dal</span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-50">
                      {new Date(company.dataInizioRapporto).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Note se presenti */}
        {(company.noteCommerciali || company.noteOperative) && (
          <div className="border-t border-gray-100 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {company.noteCommerciali && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Note Commerciali</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{company.noteCommerciali}</p>
                </div>
              )}
              {company.noteOperative && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Note Operative</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{company.noteOperative}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <nav className="flex" aria-label="Sezioni azienda">
          {/* Tab Operativo */}
          <button
            onClick={() => setActiveTab('operativo')}
            className={cn(
              'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors flex-1 justify-center',
              activeTab === 'operativo'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/10'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            )}
          >
            <Users className="h-4 w-4" />
            Operativo
            {(alertsSummary?.corsiInScadenza ?? 0) > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 flex items-center justify-center px-1">
                {alertsSummary!.corsiInScadenza}
              </span>
            )}
          </button>

          {/* Tab Sicurezza */}
          <button
            onClick={() => setActiveTab('sicurezza')}
            className={cn(
              'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors flex-1 justify-center',
              activeTab === 'sicurezza'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/10'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Sicurezza
            {((alertsSummary?.nomineInScadenza ?? 0) + (alertsSummary?.dvrInScadenza ?? 0) + (alertsSummary?.sopralluoghiInScadenza ?? 0)) > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 flex items-center justify-center px-1">
                {(alertsSummary!.nomineInScadenza ?? 0) + (alertsSummary!.dvrInScadenza ?? 0) + (alertsSummary!.sopralluoghiInScadenza ?? 0)}
              </span>
            )}
          </button>

          {/* Tab Fatturazione */}
          {canSeeBillingTab && (
            <button
              onClick={() => setActiveTab('fatturazione')}
              className={cn(
                'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors flex-1 justify-center',
                activeTab === 'fatturazione'
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/10'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              )}
            >
              <Receipt className="h-4 w-4" />
              Fatturazione
              {(alertsSummary?.movimentiDaFatturare ?? 0) > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full text-xs font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400 flex items-center justify-center px-1">
                  {alertsSummary!.movimentiDaFatturare}
                </span>
              )}
            </button>
          )}

          {!isOnlyMedico && (
            <button
              onClick={() => setActiveTab('documenti')}
              className={cn(
                'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors flex-1 justify-center',
                activeTab === 'documenti'
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/10'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              )}
            >
              <FileText className="h-4 w-4" />
              Documenti
              {(dvrs.length + sopralluoghi.length + (company.nomine?.length ?? 0) + (tariffario ? 1 : 0) + mdlDocuments.length) > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 flex items-center justify-center px-1">
                  {dvrs.length + sopralluoghi.length + (company.nomine?.length ?? 0) + (tariffario ? 1 : 0) + mdlDocuments.length}
                </span>
              )}
            </button>
          )}
        </nav>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}

      {/* Tab 1: Operativo */}
      {activeTab === 'operativo' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className={`${isOnlyMedico ? 'xl:col-span-4' : 'xl:col-span-3'} space-y-6`}>
            {/* Company Sites Section */}
            <CompanySites
              companyId={id!}
              nomine={company.nomine}
              selectedSiteId={selectedSiteId}
              onSiteFilterChange={setSelectedSiteId}
            />
            {/* Dipendenti Section */}
            <EmployeesSection companyId={company.companyTenantProfileId} />
            {!isOnlyMedico && (
              <CompanyTrainingRequirements
                companyId={id!}
                companyName={company.ragioneSociale}
              />
            )}
            {/* P58: Sezione Mansioni e Rischi */}
            <CompanyMansioniSection
              companyId={id!}
              companyName={company.ragioneSociale}
              isCrossTenant={company.crossTenant?.isOwner === false}
            />
            {/* Protocolli Sanitari — Card dedicata */}
            <CompanyProtocolliSanitariSection
              companyId={id!}
              isCrossTenant={company.crossTenant?.isOwner === false}
            />
          </div>
          {/* Quick Actions sidebar */}
          {!isOnlyMedico && (
            <div className="xl:col-span-1">
              <QuickActionsIntegrated
                companyId={id!}
                companyName={company.ragioneSociale}
                nomine={company.nomine}
                sites={company.sites}
                hasTariffari={hasTariffariConfigured}
                hasMDLServices={hasMDLServices(company)}
                employeeCount={company._count?.personProfiles ?? 0}
                courseCount={company._count?.courseSchedules ?? 0}
                siteCount={company._count?.sites ?? 0}
                onActionComplete={handleActionComplete}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sicurezza */}
      {activeTab === 'sicurezza' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className={`${isOnlyMedico ? 'xl:col-span-4' : 'xl:col-span-3'} space-y-6`}>
            {/* P59: Card Unificata Servizi MDL */}
            {!isOnlyMedico && (
              (hasMDLServices(company) || (company.nomine && company.nomine.length > 0) || dvrs.length > 0 || hasTariffariConfigured) ? (
                <MDLServicesCard
                  companyId={id!}
                  companyTenantProfileId={company.companyTenantProfileId}
                  companyName={company.ragioneSociale}
                  tenantId={company.tenantId}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  nomine={company.nomine as any}
                  sites={company.sites}
                  dvrs={dvrs}
                  sopralluoghi={sopralluoghi}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  tariffario={tariffario as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  successoreTariffario={successoreTariffario as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  storicoTariffari={storicoTariffari as any}
                  onActionComplete={handleActionComplete}
                />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-10 text-center">
                  <ShieldCheck className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nessun servizio di sicurezza configurato per questa azienda.
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Aggiungere nomine, DVR o sopralluoghi tramite il pannello Quick Actions.
                  </p>
                </div>
              )
            )}

            {/* Sorveglianza Sanitaria - Art. 41 D.Lgs 81/08 */}
            <CompanySorveglianzaSection
              companyId={company.companyTenantProfileId || id!}
              companySites={company.sites}
              isCrossTenant={company.crossTenant?.isOwner === false}
            />

            {/* P60: Card Allegato 3B */}
            {!isOnlyMedico && hasMDLServices(company) && company.companyTenantProfileId && (
              <Allegato3BCard
                companyTenantProfileId={company.companyTenantProfileId}
                companyName={company.ragioneSociale}
                onActionComplete={handleActionComplete}
              />
            )}

            {/* P44: Card OT23 */}
            {!isOnlyMedico && hasMDLServices(company) && company.companyTenantProfileId && (
              <OT23Card
                companyTenantProfileId={company.companyTenantProfileId}
                companyName={company.ragioneSociale}
                employeeCount={company._count?.personProfiles ?? 0}
                onActionComplete={handleActionComplete}
              />
            )}

            {/* R17: Risultati Anonimi Collettivi — Art. 40 c.1 D.Lgs 81/08 */}
            {!isOnlyMedico && hasMDLServices(company) && company.companyTenantProfileId && (
              <RisultatiAnonimiCard
                companyTenantProfileId={company.companyTenantProfileId}
                companyName={company.ragioneSociale}
                onActionComplete={handleActionComplete}
              />
            )}

            {/* Verbale Riunione Periodica — Art. 35 D.Lgs 81/08 */}
            {!isOnlyMedico && hasMDLServices(company) && company.companyTenantProfileId && (
              <RiunionePeriodicaCard
                companyTenantProfileId={company.companyTenantProfileId}
                companyName={company.ragioneSociale}
                onActionComplete={handleActionComplete}
              />
            )}
          </div>
          {/* Quick Actions sidebar */}
          {!isOnlyMedico && (
            <div className="xl:col-span-1">
              <QuickActionsIntegrated
                companyId={id!}
                companyName={company.ragioneSociale}
                nomine={company.nomine}
                sites={company.sites}
                hasTariffari={hasTariffariConfigured}
                hasMDLServices={hasMDLServices(company)}
                employeeCount={company._count?.personProfiles ?? 0}
                courseCount={company._count?.courseSchedules ?? 0}
                siteCount={company._count?.sites ?? 0}
                onActionComplete={handleActionComplete}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Fatturazione */}
      {canSeeBillingTab && activeTab === 'fatturazione' && (
        <div className="space-y-4">
          {/* Header Fatturazione con azione Emetti Fattura */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Fatturazione</h2>
              {(alertsSummary?.movimentiDaFatturare ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  <AlertTriangle className="h-3 w-3" />
                  {alertsSummary!.movimentiDaFatturare} da fatturare
                </span>
              )}
            </div>
            <button
              onClick={handleOpenFatturaModal}
              disabled={loadingFatturaModal || (alertsSummary?.movimentiDaFatturare ?? 0) === 0}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                (alertsSummary?.movimentiDaFatturare ?? 0) > 0
                  ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              )}
            >
              {loadingFatturaModal
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <FileText className="h-4 w-4" />
              }
              Emetti Fattura
            </button>
          </div>

          {/* Card Fatturazione a piena larghezza */}
          <CompanyBillingCard
            companyId={id!}
            companyName={company.ragioneSociale}
          />
        </div>
      )}

      {!isOnlyMedico && activeTab === 'documenti' && (
        <div className="space-y-4">
          <CompanyDocumentsSummaryCard
            dvrs={dvrs}
            sopralluoghi={sopralluoghi}
            tariffario={tariffario}
            nomine={company.nomine}
            mdlDocuments={mdlDocuments}
            giudizi={giudizi}
            preventivi={preventivi}
            fatture={fatture}
            allegati3B={allegati3B}
            onRefresh={() => fetchCompanyData()}
          />
        </div>
      )}

      {/* P58 Cross-Tenant Card - sempre in fondo */}
      {company.crossTenant && (company.crossTenant.ownerTenant || company.crossTenant.totalShares > 0) && (
        <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-5">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <Share2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              {company.crossTenant.ownerTenant && (
                <>
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">Dati Condivisi</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    Questi dati sono di proprietà del tenant <strong>{company.crossTenant.ownerTenant.name}</strong>.
                    Hai accesso in modalità condivisa tramite consent GDPR.
                  </p>
                  {company.crossTenant.sharedDataTypes && company.crossTenant.sharedDataTypes.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-amber-600 dark:text-amber-500">Dati condivisi: </span>
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        {company.crossTenant.sharedDataTypes.join(', ')}
                      </span>
                    </div>
                  )}
                </>
              )}
              {company.crossTenant.isOwner && company.crossTenant.totalShares > 0 && (
                <>
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">Azienda Condivisa</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    Questa azienda è condivisa con {company.crossTenant.totalShares} tenant.
                  </p>
                  {company.crossTenant.sharedWith && company.crossTenant.sharedWith.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {company.crossTenant.sharedWith.map((share) => (
                        <span
                          key={share.tenantId}
                          className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            share.status === 'ACTIVE' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                              share.status === 'PENDING' ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          )}
                        >
                          <Globe className="h-3 w-3 mr-1" />
                          {share.tenantName}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div className="mt-3 flex items-center space-x-4 text-xs text-amber-600 dark:text-amber-500">
                <span className="flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  Dati protetti GDPR
                </span>
                <span className="flex items-center">
                  <Lock className="h-3 w-3 mr-1" />
                  Accesso controllato
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* P59 Sprint 11.2: Modal Associazione Tariffario */}
      <QuickActionTariffarioModal
        isOpen={showTariffarioModal}
        onClose={() => setShowTariffarioModal(false)}
        onSuccess={handleActionComplete}
        companyId={id!}
        companyName={company?.ragioneSociale || ''}
        currentTariffario={tariffario ? {
          id: tariffario.id,
          nome: tariffario.nome,
          association: tariffario.association
        } : undefined}
      />

      {/* FatturaModal */}
      <FatturaModal
        isOpen={showFatturaModal}
        onClose={() => setShowFatturaModal(false)}
        onSuccess={() => {
          setShowFatturaModal(false);
          refetchAlerts();
          queryClient.invalidateQueries({ queryKey: ['billing-summary', id] });
        }}
        companyId={id!}
        companyName={company.ragioneSociale}
        items={billingItemsForModal}
      />

    </div>
  );
};

export default CompanyDetails;
