import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Hash,
  Mail,
  Map,
  MapPin,
  Phone,
  Plus,
  Trash2,
  User,
  Edit3,
  Loader2,
  AlertTriangle,
  Briefcase,
  Scale,
  Users,
  Receipt,
  FileSignature,
  Stethoscope,
  Shield,
  ClipboardCheck,
  DollarSign,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useTenantMode } from '../../contexts/TenantModeContext';
import { getSavingErrorMessage } from '../../utils/errorUtils';
import { apiPost, apiPut, apiGet, apiDelete } from '../../services/api';
import { useCheckCrossTenant, CompanyCheckResult } from '../../hooks/import/useCheckCrossTenant';
import { ImportCrossTenantModal } from '../shared/modals/ImportCrossTenantModal';

import EntityFormLayout from '../shared/form/EntityFormLayout';
import EntityFormField from '../shared/form/EntityFormField';
import EntityFormGrid, { EntityFormSection, EntityFormFullWidthField } from '../shared/form/EntityFormGrid';
import { DatePickerElegante } from '../ui/DatePickerElegante';

// P58: Quick Action Modals per MDL
import { QuickActionNominaModal } from './quick-actions/QuickActionNominaModal';
import { QuickActionSopralluogoModal } from './quick-actions/QuickActionSopralluogoModal';
import { QuickActionDVRModal } from './quick-actions/QuickActionDVRModal';
import { QuickActionTariffarioModal } from './quick-actions/QuickActionTariffarioModal';

// Interfaccia per una sede aziendale (dati base per la creazione)
interface SiteData {
  tempId: string; // ID temporaneo per gestire la lista
  id?: string; // ID reale della sede (solo per sedi esistenti)
  siteName: string;
  citta: string;
  indirizzo: string;
  cap: string;
  provincia: string;
  personaRiferimento?: string;
  telefono?: string;
  mail?: string;
  isExisting?: boolean; // true se la sede esiste già nel DB
  isDeleted?: boolean; // true se la sede deve essere eliminata
}

interface CompanyFormProps {
  /** Dati dell'azienda in caso di modifica */
  company?: {
    id: string;
    ragioneSociale: string;
    codiceAteco?: string;
    piva?: string;
    codiceFiscale?: string;
    sdi?: string;
    pec?: string;
    iban?: string;
    // Sede Legale (globale Company)
    sedeLegaleIndirizzo?: string;
    sedeLegaleCitta?: string;
    sedeLegaleCap?: string;
    sedeLegaleProvincia?: string;
    // Classificazione (globale Company)
    formaGiuridica?: string;
    settore?: string;
    dimensione?: 'MICRO' | 'PICCOLA' | 'MEDIA' | 'GRANDE';
    // Dati Contrattuali (CompanyTenantProfile)
    dataInizioRapporto?: string;
    dataFineRapporto?: string;
    tipoContratto?: string;
    referenteId?: string;
    referenteRuolo?: string;
    // Condizioni Commerciali (CompanyTenantProfile)
    scontoPercentuale?: number;
    terminiPagamento?: string;
    modalitaPagamento?: string;
    // Note (CompanyTenantProfile)
    noteCommerciali?: string;
    noteOperative?: string;
    noteInterne?: string;
  };
  /** Callback chiamata al completamento del salvataggio */
  onSuccess: () => void;
  /** Callback chiamata alla chiusura del form */
  onClose: () => void;
}

// Opzioni per i select
// NOTA: NON includere { value: '', label: 'Seleziona...' } perché EntityFormField lo aggiunge già
const FORMA_GIURIDICA_OPTIONS = [
  { value: 'SRL', label: 'S.R.L. - Società a Responsabilità Limitata' },
  { value: 'SRLS', label: 'S.R.L.S. - Società a Responsabilità Limitata Semplificata' },
  { value: 'SPA', label: 'S.p.A. - Società per Azioni' },
  { value: 'SAPA', label: 'S.A.p.A. - Società in Accomandita per Azioni' },
  { value: 'SNC', label: 'S.N.C. - Società in Nome Collettivo' },
  { value: 'SAS', label: 'S.A.S. - Società in Accomandita Semplice' },
  { value: 'SS', label: 'S.S. - Società Semplice' },
  { value: 'COOP', label: 'Cooperativa' },
  { value: 'CONS', label: 'Consorzio' },
  { value: 'DI', label: 'Ditta Individuale' },
  { value: 'ASS', label: 'Associazione' },
  { value: 'FOND', label: 'Fondazione' },
  { value: 'PA', label: 'Pubblica Amministrazione' },
  { value: 'ALTRO', label: 'Altro' },
];

// NOTA: NON includere { value: '', label: 'Seleziona...' } perché EntityFormField lo aggiunge già
const DIMENSIONE_OPTIONS = [
  { value: 'MICRO', label: 'Micro (< 10 dipendenti)' },
  { value: 'PICCOLA', label: 'Piccola (10-49 dipendenti)' },
  { value: 'MEDIA', label: 'Media (50-249 dipendenti)' },
  { value: 'GRANDE', label: 'Grande (250+ dipendenti)' },
];

// NOTA: NON includere { value: '', label: 'Seleziona...' } perché EntityFormField lo aggiunge già
const TERMINI_PAGAMENTO_OPTIONS = [
  { value: '30GG_DF', label: '30 giorni data fattura' },
  { value: '30GG_FM', label: '30 giorni fine mese' },
  { value: '60GG_DF', label: '60 giorni data fattura' },
  { value: '60GG_FM', label: '60 giorni fine mese' },
  { value: '90GG_DF', label: '90 giorni data fattura' },
  { value: '90GG_FM', label: '90 giorni fine mese' },
  { value: 'RIMESSA_DIRETTA', label: 'Rimessa diretta' },
  { value: 'ANTICIPATO', label: 'Pagamento anticipato' },
  { value: 'CUSTOM', label: 'Personalizzato' },
];

// NOTA: NON includere { value: '', label: 'Seleziona...' } perché EntityFormField lo aggiunge già
const MODALITA_PAGAMENTO_OPTIONS = [
  { value: 'BONIFICO', label: 'Bonifico bancario' },
  { value: 'RIBA', label: 'RI.BA. - Ricevuta Bancaria' },
  { value: 'RID', label: 'RID - Rapporti Interbancari Diretti' },
  { value: 'SEPA', label: 'SEPA Direct Debit' },
  { value: 'CONTANTI', label: 'Contanti' },
  { value: 'ASSEGNO', label: 'Assegno' },
  { value: 'CARTA', label: 'Carta di credito' },
  { value: 'MAV', label: 'MAV - Pagamento mediante avviso' },
  { value: 'ALTRO', label: 'Altro' },
];

/**
 * Form moderno ed elegante per la creazione e modifica di un'azienda
 */
const CompanyForm: React.FC<CompanyFormProps> = ({
  company,
  onSuccess,
  onClose,
}) => {
  // Stato per i dati del form
  const [formData, setFormData] = useState({
    // Dati identificativi (Company)
    ragioneSociale: '',
    codiceAteco: '',
    piva: '',
    codiceFiscale: '',
    sdi: '',
    pec: '',
    iban: '',
    // Sede Legale (Company)
    sedeLegaleIndirizzo: '',
    sedeLegaleCitta: '',
    sedeLegaleCap: '',
    sedeLegaleProvincia: '',
    // Classificazione (Company)
    formaGiuridica: '',
    settore: '',
    dimensione: '',
    // Dati Contrattuali (CompanyTenantProfile)
    dataInizioRapporto: '',
    dataFineRapporto: '',
    tipoContratto: '',
    referenteId: '',
    referenteRuolo: '',
    // Condizioni Commerciali (CompanyTenantProfile)
    scontoPercentuale: '',
    terminiPagamento: '',
    modalitaPagamento: '',
    // Note (CompanyTenantProfile)
    noteCommerciali: '',
    noteOperative: '',
    noteInterne: '',
  });

  // Stato per le sedi aggiuntive
  // Per nuove aziende, inizializza con una sede vuota obbligatoria
  const [sites, setSites] = useState<SiteData[]>(() => {
    // Solo per nuove aziende (company non definito), crea una sede iniziale
    if (!company) {
      return [{
        tempId: crypto.randomUUID(),
        siteName: '',
        citta: '',
        indirizzo: '',
        cap: '',
        provincia: '',
        personaRiferimento: '',
        telefono: '',
        mail: '',
        isExisting: false,
        isDeleted: false,
      }];
    }
    return [];
  });

  // Stato per il caricamento delle sedi
  const [loadingSites, setLoadingSites] = useState(false);

  // Stato per gli errori
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Stato per il salvataggio
  const [isSaving, setIsSaving] = useState(false);

  // Stato per errori generali
  const [generalError, setGeneralError] = useState('');

  // Hook per le notifiche toast
  const { showToast } = useToast();

  // P57: Tenant mode per cross-tenant operations
  const { operateTenantId, getOperateHeaders } = useTenantMode();
  const operateHeaders = getOperateHeaders();

  // Hook per cross-tenant check (P57)
  const { checkExisting, checkResult, isChecking, reset: resetCrossTenantCheck } = useCheckCrossTenant();
  const [showCrossTenantModal, setShowCrossTenantModal] = useState(false);
  const lastCheckedPiva = useRef<string>('');
  const lastCheckedCF = useRef<string>('');

  // P58: State per Quick Action Modals MDL (solo in edit mode)
  const [mdlSectionExpanded, setMdlSectionExpanded] = useState(false);
  const [mdlModals, setMdlModals] = useState({
    nominaMC: false,
    nominaRSPP: false,
    sopralluogo: false,
    dvr: false,
    tariffario: false
  });

  const openMdlModal = (modal: keyof typeof mdlModals) => {
    setMdlModals(prev => ({ ...prev, [modal]: true }));
  };

  const closeMdlModal = (modal: keyof typeof mdlModals) => {
    setMdlModals(prev => ({ ...prev, [modal]: false }));
  };

  // Inizializza i dati del form se stiamo modificando un'azienda esistente
  // Using a ref to track if we've already initialized the form
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only initialize data if we have company data AND we haven't initialized yet
    if (company && !initializedRef.current) {
      setFormData({
        // Dati identificativi
        ragioneSociale: company.ragioneSociale || '',
        codiceAteco: company.codiceAteco || '',
        piva: company.piva || '',
        codiceFiscale: company.codiceFiscale || '',
        sdi: company.sdi || '',
        pec: company.pec || '',
        iban: company.iban || '',
        // Sede Legale
        sedeLegaleIndirizzo: company.sedeLegaleIndirizzo || '',
        sedeLegaleCitta: company.sedeLegaleCitta || '',
        sedeLegaleCap: company.sedeLegaleCap || '',
        sedeLegaleProvincia: company.sedeLegaleProvincia || '',
        // Classificazione
        formaGiuridica: company.formaGiuridica || '',
        settore: company.settore || '',
        dimensione: company.dimensione || '',
        // Dati Contrattuali
        dataInizioRapporto: company.dataInizioRapporto?.split('T')[0] || '',
        dataFineRapporto: company.dataFineRapporto?.split('T')[0] || '',
        tipoContratto: company.tipoContratto || '',
        referenteId: company.referenteId || '',
        referenteRuolo: company.referenteRuolo || '',
        // Condizioni Commerciali
        scontoPercentuale: company.scontoPercentuale?.toString() || '',
        terminiPagamento: company.terminiPagamento || '',
        modalitaPagamento: company.modalitaPagamento || '',
        // Note
        noteCommerciali: company.noteCommerciali || '',
        noteOperative: company.noteOperative || '',
        noteInterne: company.noteInterne || '',
      });
      initializedRef.current = true;
    }
  }, [company]);

  // Carica le sedi esistenti in modalità edit
  const fetchExistingSites = useCallback(async () => {
    if (!company?.id) return;

    setLoadingSites(true);
    try {
      const response = await apiGet(`/api/v1/company-sites/company/${company.id}`) as { sites: any[] };
      const existingSites = (response.sites || []).map((site: any) => ({
        tempId: site.id, // Usa l'ID reale come tempId per le sedi esistenti
        id: site.id,
        siteName: site.siteName || '',
        citta: site.citta || '',
        indirizzo: site.indirizzo || '',
        cap: site.cap || '',
        provincia: site.provincia || '',
        personaRiferimento: site.personaRiferimento || '',
        telefono: site.telefono || '',
        mail: site.mail || '',
        isExisting: true,
        isDeleted: false,
      }));
      setSites(existingSites);
    } catch (error) {
      // Non mostriamo errore all'utente, semplicemente non ci sono sedi
    } finally {
      setLoadingSites(false);
    }
  }, [company?.id]);

  useEffect(() => {
    if (company?.id) {
      fetchExistingSites();
    }
  }, [company?.id, fetchExistingSites]);

  // P57: Verifica esistenza cross-tenant quando l'utente perde focus da piva/codiceFiscale
  const handleCrossTenantCheck = useCallback(async (field: 'piva' | 'codiceFiscale') => {
    // Solo per creazione nuova azienda (non in modifica)
    if (company) return;

    const value = formData[field]?.trim();
    if (!value) return;

    // Evita check duplicati
    if (field === 'piva' && value === lastCheckedPiva.current) return;
    if (field === 'codiceFiscale' && value === lastCheckedCF.current) return;

    // Aggiorna ref
    if (field === 'piva') lastCheckedPiva.current = value;
    if (field === 'codiceFiscale') lastCheckedCF.current = value;

    // P57: Passa targetTenantId per verificare esistenza nel tenant DESTINAZIONE
    // Questo è critico per admin cross-tenant che operano su tenant diverso dal loro JWT
    const result = await checkExisting({
      entityType: 'company',
      [field]: value,
      targetTenantId: operateTenantId || undefined
    });

    // Se esiste e può essere importata, mostra il modal
    if (result?.exists && result?.canImport) {
      setShowCrossTenantModal(true);
    }
    // Se esiste già nel tenant corrente, mostra errore inline
    else if (result?.existsInCurrentTenant) {
      setErrors(prev => ({
        ...prev,
        [field]: `Un'azienda con questo ${field === 'piva' ? 'P.IVA' : 'Codice Fiscale'} esiste già nel tenant`
      }));
    }
  }, [company, formData.piva, formData.codiceFiscale, checkExisting, operateTenantId]);

  // Handler per successo import cross-tenant
  const handleCrossTenantImportSuccess = useCallback((profileId: string) => {
    setShowCrossTenantModal(false);
    resetCrossTenantCheck();
    showToast({
      type: 'success',
      message: 'Azienda importata con successo! Puoi ora completare i dati specifici.'
    });
    // Chiama onSuccess per chiudere il form e aggiornare la lista
    onSuccess();
  }, [onSuccess, resetCrossTenantCheck, showToast]);

  // Handler per chiusura modal (prosegui senza import)
  const handleCloseCrossTenantModal = useCallback(() => {
    setShowCrossTenantModal(false);
    // L'utente vuole creare un nuovo record, procedi normalmente
  }, []);

  // Gestisce il cambio dei valori nei campi
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Rimuovi l'errore per questo campo se presente
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Valida i dati del form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validazione campi obbligatori
    if (!formData.ragioneSociale.trim()) {
      newErrors.ragioneSociale = 'La Ragione Sociale è obbligatoria';
    }

    // Almeno uno tra P.IVA e Codice Fiscale deve essere presente
    if (!formData.piva.trim() && !formData.codiceFiscale.trim()) {
      newErrors.piva = 'Almeno uno tra P.IVA e Codice Fiscale deve essere inserito';
      newErrors.codiceFiscale = 'Almeno uno tra P.IVA e Codice Fiscale deve essere inserito';
    }

    // Validazione P.IVA (se presente)
    if (formData.piva.trim() && (formData.piva.length < 8 || formData.piva.length > 13)) {
      newErrors.piva = 'La P.IVA deve essere compresa tra 8 e 13 caratteri';
    }

    // Per nuove aziende, richiedi almeno una sede con nome e indirizzo compilati
    if (!company) {
      const activeSitesForValidation = sites.filter(s => !s.isDeleted);
      const validSites = activeSitesForValidation.filter(
        s => s.siteName.trim() && s.citta.trim()
      );
      if (validSites.length === 0) {
        newErrors.sites = 'È richiesta almeno una sede con Nome e Città compilati';
      }
    }

    // P57: Preserva errori cross-tenant (esistenza in altro/stesso tenant)
    if (checkResult?.existsInCurrentTenant) {
      if (formData.piva.trim()) {
        newErrors.piva = `Un'azienda con questo P.IVA esiste già nel tenant`;
      }
      if (formData.codiceFiscale.trim() && !formData.piva.trim()) {
        newErrors.codiceFiscale = `Un'azienda con questo Codice Fiscale esiste già nel tenant`;
      }
    }
    // Blocca submit se azienda può essere importata (utente deve decidere)
    if (checkResult?.exists && checkResult?.canImport) {
      newErrors.piva = 'Questa azienda esiste in un altro tenant. Scegli se importarla o creare una nuova.';
      setShowCrossTenantModal(true);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Gestisce l'invio del form
  const handleSubmit = async () => {
    setGeneralError('');

    // Valida il form
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Prepara i dati da inviare - separando Company (globali) da Profile (tenant)
      // P59: dimensione rimossa dal payload - viene calcolata automaticamente dal numero dipendenti
      const payload = {
        // Dati Company (globali)
        ragioneSociale: formData.ragioneSociale,
        piva: formData.piva || null,
        codiceFiscale: formData.codiceFiscale || null,
        codiceAteco: formData.codiceAteco || null,
        sdi: formData.sdi || null,
        formaGiuridica: formData.formaGiuridica || null,
        settore: formData.settore || null,
        // Sede Legale (globale)
        sedeLegaleIndirizzo: formData.sedeLegaleIndirizzo || null,
        sedeLegaleCitta: formData.sedeLegaleCitta || null,
        sedeLegaleCap: formData.sedeLegaleCap || null,
        sedeLegaleProvincia: formData.sedeLegaleProvincia || null,
        // Dati CompanyTenantProfile (per-tenant)
        pec: formData.pec || null,
        iban: formData.iban || null,
        dataInizioRapporto: formData.dataInizioRapporto || null,
        dataFineRapporto: formData.dataFineRapporto || null,
        tipoContratto: formData.tipoContratto || null,
        referenteId: formData.referenteId || null,
        referenteRuolo: formData.referenteRuolo || null,
        scontoPercentuale: formData.scontoPercentuale ? parseFloat(formData.scontoPercentuale) : null,
        terminiPagamento: formData.terminiPagamento || null,
        modalitaPagamento: formData.modalitaPagamento || null,
        noteCommerciali: formData.noteCommerciali || null,
        noteOperative: formData.noteOperative || null,
        noteInterne: formData.noteInterne || null,
      };


      // Invia la richiesta usando il servizio API centralizzato (con headers multi-tenant)
      if (company) {
        // Modifica azienda esistente
        await apiPut(`/api/v1/companies/${company.id}`, payload, { headers: operateHeaders });

        // Gestione sedi in modalità edit
        const activeSites = sites.filter(s => !s.isDeleted);
        const deletedSites = sites.filter(s => s.isDeleted && s.isExisting);
        const newSites = activeSites.filter(s => !s.isExisting);
        const updatedSites = activeSites.filter(s => s.isExisting);

        let sitesModified = 0;

        // Elimina le sedi marcate per eliminazione
        for (const site of deletedSites) {
          try {
            await apiDelete(`/api/v1/company-sites/${site.id}`, { headers: operateHeaders });
            sitesModified++;
          } catch (siteError) {
          }
        }

        // Aggiorna le sedi esistenti
        for (const site of updatedSites) {
          try {
            await apiPut(`/api/v1/company-sites/${site.id}`, {
              siteName: site.siteName,
              citta: site.citta,
              indirizzo: site.indirizzo,
              cap: site.cap,
              provincia: site.provincia,
              personaRiferimento: site.personaRiferimento,
              telefono: site.telefono,
              mail: site.mail,
            }, { headers: operateHeaders });
            sitesModified++;
          } catch (siteError) {
          }
        }

        // Crea le nuove sedi
        for (const site of newSites) {
          try {
            await apiPost('/api/v1/company-sites', {
              companyId: company.id,
              siteName: site.siteName,
              citta: site.citta,
              indirizzo: site.indirizzo,
              cap: site.cap,
              provincia: site.provincia,
              personaRiferimento: site.personaRiferimento,
              telefono: site.telefono,
              mail: site.mail,
            }, { headers: operateHeaders });
            sitesModified++;
          } catch (siteError) {
          }
        }

        // Mostra notifica di successo
        showToast({
          message: sitesModified > 0
            ? `Azienda e ${sitesModified} sed${sitesModified === 1 ? 'e' : 'i'} aggiornate con successo`
            : 'Azienda aggiornata con successo',
          type: 'success'
        });
      } else {
        // Crea nuova azienda
        // P49: La risposta è l'oggetto company flattened con id = companyTenantProfileId
        const response = await apiPost('/api/v1/companies', payload, { headers: operateHeaders }) as { id?: string; companyTenantProfileId?: string };
        // Usa l'ID del CompanyTenantProfile per creare le sedi (non l'ID della Company globale)
        const companyId = response.id || response.companyTenantProfileId;

        // Se ci sono sedi da creare, le creo in sequenza
        const activeSites = sites.filter(s => !s.isDeleted);
        if (companyId && activeSites.length > 0) {
          let sitesCreated = 0;
          for (const site of activeSites) {
            try {
              await apiPost('/api/v1/company-sites', {
                companyId,
                siteName: site.siteName,
                citta: site.citta,
                indirizzo: site.indirizzo,
                cap: site.cap,
                provincia: site.provincia,
                personaRiferimento: site.personaRiferimento,
                telefono: site.telefono,
                mail: site.mail,
              }, { headers: operateHeaders });
              sitesCreated++;
            } catch (siteError) {
            }
          }

          // Mostra notifica di successo con dettaglio sedi
          showToast({
            message: `Azienda creata con successo${sitesCreated > 0 ? ` con ${sitesCreated} sed${sitesCreated === 1 ? 'e' : 'i'}` : ''}`,
            type: 'success'
          });
        } else {
          // Mostra notifica di successo semplice
          showToast({
            message: 'Azienda creata con successo',
            type: 'success'
          });
        }
      }

      // Chiama il callback di successo
      onSuccess();
    } catch (error) {
      const sanitizedError = getSavingErrorMessage('companies', error);
      setGeneralError(sanitizedError);
      showToast({
        message: `Errore: ${sanitizedError}`,
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Funzioni per gestire le sedi
  const addSite = () => {
    setSites(prev => [...prev, {
      tempId: crypto.randomUUID(),
      siteName: '',
      citta: '',
      indirizzo: '',
      cap: '',
      provincia: '',
      personaRiferimento: '',
      telefono: '',
      mail: '',
      isExisting: false,
      isDeleted: false,
    }]);
  };

  const removeSite = (tempId: string) => {
    setSites(prev => {
      const site = prev.find(s => s.tempId === tempId);
      if (site?.isExisting) {
        // Per sedi esistenti, marca per eliminazione invece di rimuovere
        return prev.map(s => s.tempId === tempId ? { ...s, isDeleted: true } : s);
      }
      // Per nuove sedi, rimuovi direttamente
      return prev.filter(s => s.tempId !== tempId);
    });
  };

  const restoreSite = (tempId: string) => {
    setSites(prev => prev.map(s =>
      s.tempId === tempId ? { ...s, isDeleted: false } : s
    ));
  };

  const updateSite = (tempId: string, field: keyof SiteData, value: string) => {
    setSites(prev => prev.map(site =>
      site.tempId === tempId ? { ...site, [field]: value } : site
    ));
  };

  // Filtra le sedi attive (non eliminate) per la visualizzazione
  const activeSites = sites.filter(s => !s.isDeleted);
  const deletedSites = sites.filter(s => s.isDeleted);

  return (
    <EntityFormLayout
      title={company ? 'Modifica Azienda' : 'Nuova Azienda'}
      subtitle={company ? `Modifica i dati dell'azienda ${company.ragioneSociale}` : 'Inserisci i dati della nuova azienda'}
      onSubmit={handleSubmit}
      onClose={onClose}
      isSaving={isSaving}
      error={generalError}
      submitLabel={company ? 'Salva Modifiche' : 'Aggiungi Azienda'}
      cancelLabel="Annulla"
    >
      <EntityFormSection title="Informazioni Generali" description="Dati principali dell'azienda">
        <EntityFormGrid>
          <EntityFormField
            label="Ragione Sociale"
            name="ragioneSociale"
            value={formData.ragioneSociale}
            onChange={handleChange}
            error={errors.ragioneSociale}
            required
            icon={<Building2 className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="Codice Ateco"
            name="codiceAteco"
            value={formData.codiceAteco}
            onChange={handleChange}
            error={errors.codiceAteco}
            icon={<Hash className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="Partita IVA"
            name="piva"
            value={formData.piva}
            onChange={handleChange}
            onBlur={() => handleCrossTenantCheck('piva')}
            error={errors.piva}
            icon={<FileText className="h-5 w-5 text-gray-400" />}
            disabled={isChecking}
            helpText={isChecking ? 'Verifica in corso...' : undefined}
          />

          <EntityFormField
            label="Codice Fiscale"
            name="codiceFiscale"
            value={formData.codiceFiscale}
            onChange={handleChange}
            onBlur={() => handleCrossTenantCheck('codiceFiscale')}
            error={errors.codiceFiscale}
            icon={<FileText className="h-5 w-5 text-gray-400" />}
            disabled={isChecking}
          />

          <EntityFormField
            label="Codice SDI"
            name="sdi"
            value={formData.sdi}
            onChange={handleChange}
            error={errors.sdi}
            icon={<Hash className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="PEC"
            name="pec"
            value={formData.pec}
            onChange={handleChange}
            error={errors.pec}
            icon={<Mail className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="IBAN"
            name="iban"
            value={formData.iban}
            onChange={handleChange}
            error={errors.iban}
            icon={<CreditCard className="h-5 w-5 text-gray-400" />}
          />

          <EntityFormField
            label="Forma Giuridica"
            name="formaGiuridica"
            value={formData.formaGiuridica}
            onChange={handleChange}
            error={errors.formaGiuridica}
            icon={<Scale className="h-5 w-5 text-gray-400" />}
            type="select"
            options={FORMA_GIURIDICA_OPTIONS}
          />

          <EntityFormField
            label="Settore"
            name="settore"
            value={formData.settore}
            onChange={handleChange}
            error={errors.settore}
            icon={<Briefcase className="h-5 w-5 text-gray-400" />}
            placeholder="es. Metalmeccanico, Chimico, Edile..."
          />

          {/* P59: Dimensione Aziendale rimossa dal form - viene calcolata automaticamente
              dal numero di dipendenti e mostrata solo nella vista dettaglio */}
        </EntityFormGrid>
      </EntityFormSection>

      {/* Sezione Sede Legale */}
      <EntityFormSection title="Sede Legale" description="Indirizzo della sede legale registrata alla Camera di Commercio">
        <EntityFormGrid>
          <EntityFormField
            label="Indirizzo"
            name="sedeLegaleIndirizzo"
            value={formData.sedeLegaleIndirizzo}
            onChange={handleChange}
            error={errors.sedeLegaleIndirizzo}
            icon={<MapPin className="h-5 w-5 text-gray-400" />}
            placeholder="es. Via Roma 123"
          />

          <EntityFormField
            label="Città"
            name="sedeLegaleCitta"
            value={formData.sedeLegaleCitta}
            onChange={handleChange}
            error={errors.sedeLegaleCitta}
            icon={<Map className="h-5 w-5 text-gray-400" />}
            placeholder="es. Milano"
          />

          <EntityFormField
            label="CAP"
            name="sedeLegaleCap"
            value={formData.sedeLegaleCap}
            onChange={handleChange}
            error={errors.sedeLegaleCap}
            icon={<Hash className="h-5 w-5 text-gray-400" />}
            placeholder="es. 20100"
          />

          <EntityFormField
            label="Provincia"
            name="sedeLegaleProvincia"
            value={formData.sedeLegaleProvincia}
            onChange={handleChange}
            error={errors.sedeLegaleProvincia}
            icon={<Map className="h-5 w-5 text-gray-400" />}
            placeholder="es. MI"
            maxLength={2}
          />
        </EntityFormGrid>
      </EntityFormSection>

      {/* Sezione Dati Contrattuali - solo in modifica */}
      {company && (
        <EntityFormSection title="Dati Contrattuali" description="Informazioni sul rapporto contrattuale con l'azienda">
          <EntityFormGrid>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio Rapporto</label>
              <DatePickerElegante
                value={formData.dataInizioRapporto}
                onChange={(date) => handleChange({ target: { name: 'dataInizioRapporto', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
                theme="teal"
              />
              {errors.dataInizioRapporto && <p className="mt-1 text-xs text-red-500">{errors.dataInizioRapporto}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine Rapporto</label>
              <DatePickerElegante
                value={formData.dataFineRapporto}
                onChange={(date) => handleChange({ target: { name: 'dataFineRapporto', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
                theme="teal"
              />
              {errors.dataFineRapporto && <p className="mt-1 text-xs text-red-500">{errors.dataFineRapporto}</p>}
            </div>

            <EntityFormField
              label="Tipo Contratto"
              name="tipoContratto"
              value={formData.tipoContratto}
              onChange={handleChange}
              error={errors.tipoContratto}
              icon={<FileSignature className="h-5 w-5 text-gray-400" />}
              placeholder="es. Convenzione annuale, Contratto quadro..."
            />

            <EntityFormField
              label="Ruolo Referente"
              name="referenteRuolo"
              value={formData.referenteRuolo}
              onChange={handleChange}
              error={errors.referenteRuolo}
              icon={<User className="h-5 w-5 text-gray-400" />}
              placeholder="es. Responsabile HR, RSPP interno..."
            />
          </EntityFormGrid>
        </EntityFormSection>
      )}

      {/* Sezione Condizioni Commerciali - solo in modifica */}
      {company && (
        <EntityFormSection title="Condizioni Commerciali" description="Termini e condizioni commerciali concordate">
          <EntityFormGrid>
            <EntityFormField
              label="Sconto %"
              name="scontoPercentuale"
              value={formData.scontoPercentuale}
              onChange={handleChange}
              error={errors.scontoPercentuale}
              icon={<Receipt className="h-5 w-5 text-gray-400" />}
              type="number"
              placeholder="es. 10"
            />

            <EntityFormField
              label="Termini di Pagamento"
              name="terminiPagamento"
              value={formData.terminiPagamento}
              onChange={handleChange}
              error={errors.terminiPagamento}
              icon={<Calendar className="h-5 w-5 text-gray-400" />}
              type="select"
              options={TERMINI_PAGAMENTO_OPTIONS}
            />

            <EntityFormField
              label="Modalità di Pagamento"
              name="modalitaPagamento"
              value={formData.modalitaPagamento}
              onChange={handleChange}
              error={errors.modalitaPagamento}
              icon={<CreditCard className="h-5 w-5 text-gray-400" />}
              type="select"
              options={MODALITA_PAGAMENTO_OPTIONS}
            />
          </EntityFormGrid>
        </EntityFormSection>
      )}

      {/* Sezione Sedi Aziendali - Unificata per creazione e modifica */}
      <EntityFormSection
        title="Sedi Aziendali"
        description={company
          ? "Gestisci le sedi operative dell'azienda. Ogni sede può avere i propri contatti."
          : "Inserisci almeno una sede per la nuova azienda. Ogni sede può avere i propri contatti."
        }
      >
        <div className="space-y-4">
          {/* Errore validazione sedi */}
          {errors.sites && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errors.sites}
            </div>
          )}

          {/* Loading indicator per il caricamento sedi */}
          {loadingSites && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
              <span className="text-gray-600">Caricamento sedi...</span>
            </div>
          )}

          {/* Lista delle sedi attive */}
          {!loadingSites && activeSites.map((site, index) => (
            <div
              key={site.tempId}
              className={`p-6 rounded-xl border relative ${site.isExisting
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                : 'bg-gradient-to-r from-gray-50 to-green-50 border-green-200'
                }`}
            >
              {/* Bottone rimuovi sede - nascosto se è l'unica sede per nuove aziende */}
              {(company || activeSites.length > 1) && (
                <div className="absolute top-4 right-4">
                  <button
                    type="button"
                    onClick={() => removeSite(site.tempId)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Rimuovi sede"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )}

              <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                {site.isExisting ? (
                  <>
                    <Edit3 className="h-4 w-4 mr-2 text-blue-500" />
                    Sede Esistente {index + 1}
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2 text-green-500" />
                    {company ? `Nuova Sede ${index + 1}` : `Sede ${index + 1}`}
                  </>
                )}
              </h4>

              <EntityFormGrid>
                <EntityFormField
                  label="Nome Sede"
                  name={`site-${site.tempId}-siteName`}
                  value={site.siteName}
                  onChange={(e) => updateSite(site.tempId, 'siteName', e.target.value)}
                  required
                  icon={<Building2 className="h-5 w-5 text-gray-400" />}
                  placeholder="es. Sede Operativa Milano"
                />

                <EntityFormField
                  label="Indirizzo"
                  name={`site-${site.tempId}-indirizzo`}
                  value={site.indirizzo}
                  onChange={(e) => updateSite(site.tempId, 'indirizzo', e.target.value)}
                  required
                  icon={<MapPin className="h-5 w-5 text-gray-400" />}
                  placeholder="es. Via Roma 123"
                />

                <EntityFormField
                  label="Città"
                  name={`site-${site.tempId}-citta`}
                  value={site.citta}
                  onChange={(e) => updateSite(site.tempId, 'citta', e.target.value)}
                  required
                  icon={<Map className="h-5 w-5 text-gray-400" />}
                  placeholder="es. Milano"
                />

                <EntityFormField
                  label="Provincia"
                  name={`site-${site.tempId}-provincia`}
                  value={site.provincia}
                  onChange={(e) => updateSite(site.tempId, 'provincia', e.target.value)}
                  icon={<Map className="h-5 w-5 text-gray-400" />}
                  placeholder="es. MI"
                />

                <EntityFormField
                  label="CAP"
                  name={`site-${site.tempId}-cap`}
                  value={site.cap}
                  onChange={(e) => updateSite(site.tempId, 'cap', e.target.value)}
                  icon={<Hash className="h-5 w-5 text-gray-400" />}
                  placeholder="es. 20100"
                />

                <EntityFormField
                  label="Persona di Riferimento"
                  name={`site-${site.tempId}-personaRiferimento`}
                  value={site.personaRiferimento || ''}
                  onChange={(e) => updateSite(site.tempId, 'personaRiferimento', e.target.value)}
                  icon={<User className="h-5 w-5 text-gray-400" />}
                  placeholder="es. Mario Rossi"
                />

                <EntityFormField
                  label="Telefono"
                  name={`site-${site.tempId}-telefono`}
                  value={site.telefono || ''}
                  onChange={(e) => updateSite(site.tempId, 'telefono', e.target.value)}
                  icon={<Phone className="h-5 w-5 text-gray-400" />}
                  placeholder="es. +39 02 1234567"
                />

                <EntityFormField
                  label="Email"
                  name={`site-${site.tempId}-mail`}
                  value={site.mail || ''}
                  onChange={(e) => updateSite(site.tempId, 'mail', e.target.value)}
                  icon={<Mail className="h-5 w-5 text-gray-400" />}
                  placeholder="es. sede@azienda.it"
                />
              </EntityFormGrid>
            </div>
          ))}

          {/* Lista delle sedi eliminate (con possibilità di ripristino) */}
          {!loadingSites && deletedSites.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <h5 className="text-sm font-medium text-red-700 mb-2">Sedi da eliminare al salvataggio:</h5>
              <div className="space-y-2">
                {deletedSites.map((site) => (
                  <div key={site.tempId} className="flex items-center justify-between bg-white p-2 rounded border border-red-100">
                    <span className="text-sm text-red-600 line-through">{site.siteName || 'Sede senza nome'}</span>
                    <button
                      type="button"
                      onClick={() => restoreSite(site.tempId)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Ripristina
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pulsante per aggiungere una nuova sede */}
          {!loadingSites && (
            <button
              type="button"
              onClick={addSite}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Aggiungi Sede</span>
            </button>
          )}

          {!loadingSites && activeSites.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">
              Nessuna sede {company ? 'presente' : 'aggiuntiva'}. Clicca il pulsante sopra per aggiungerne una.
            </p>
          )}
        </div>
      </EntityFormSection>

      {/* P58: Sezione Medicina del Lavoro (visibile sia in create che edit mode) */}
      <div className="border border-blue-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setMdlSectionExpanded(!mdlSectionExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Stethoscope className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Medicina del Lavoro</h3>
              <p className="text-sm text-gray-500">
                {company
                  ? 'Nomine, sopralluoghi, DVR e tariffari (opzionale)'
                  : 'Configurabile dopo il salvataggio dell\'azienda'
                }
              </p>
            </div>
          </div>
          {mdlSectionExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {mdlSectionExpanded && (
          <div className="p-6 bg-white border-t border-blue-200">
            {company ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Nomina MC */}
                  <button
                    type="button"
                    onClick={() => openMdlModal('nominaMC')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="p-3 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                      <Stethoscope className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center">Nomina MC</span>
                  </button>

                  {/* Nomina RSPP */}
                  <button
                    type="button"
                    onClick={() => openMdlModal('nominaRSPP')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                  >
                    <div className="p-3 rounded-full bg-indigo-100 group-hover:bg-indigo-200 transition-colors">
                      <Shield className="h-6 w-6 text-indigo-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center">Nomina RSPP</span>
                  </button>

                  {/* Sopralluogo */}
                  <button
                    type="button"
                    onClick={() => openMdlModal('sopralluogo')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 transition-all group"
                  >
                    <div className="p-3 rounded-full bg-green-100 group-hover:bg-green-200 transition-colors">
                      <ClipboardCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center">Sopralluogo</span>
                  </button>

                  {/* DVR */}
                  <button
                    type="button"
                    onClick={() => openMdlModal('dvr')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-50 transition-all group"
                  >
                    <div className="p-3 rounded-full bg-amber-100 group-hover:bg-amber-200 transition-colors">
                      <FileText className="h-6 w-6 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center">DVR</span>
                  </button>

                  {/* Tariffario */}
                  <button
                    type="button"
                    onClick={() => openMdlModal('tariffario')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 transition-all group"
                  >
                    <div className="p-3 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center">Tariffario</span>
                  </button>
                </div>

                <p className="mt-4 text-sm text-gray-500 text-center">
                  Clicca su un&apos;azione per configurare i servizi MDL per questa azienda
                </p>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 opacity-50">
                  {/* Preview disabled buttons */}
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="p-3 rounded-full bg-gray-100">
                      <Stethoscope className="h-6 w-6 text-gray-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-400 text-center">Nomina MC</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="p-3 rounded-full bg-gray-100">
                      <Shield className="h-6 w-6 text-gray-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-400 text-center">Nomina RSPP</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="p-3 rounded-full bg-gray-100">
                      <ClipboardCheck className="h-6 w-6 text-gray-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-400 text-center">Sopralluogo</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="p-3 rounded-full bg-gray-100">
                      <FileText className="h-6 w-6 text-gray-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-400 text-center">DVR</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="p-3 rounded-full bg-gray-100">
                      <DollarSign className="h-6 w-6 text-gray-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-400 text-center">Tariffario</span>
                  </div>
                </div>
                <p className="mt-6 text-sm text-amber-600 flex items-center justify-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Salva prima l&apos;azienda per configurare i servizi di Medicina del Lavoro
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <EntityFormSection title="Note" description="Informazioni aggiuntive sull'azienda">
        <EntityFormFullWidthField>
          <EntityFormField
            label="Note Commerciali"
            name="noteCommerciali"
            value={formData.noteCommerciali}
            onChange={handleChange}
            error={errors.noteCommerciali}
            multiline
            rows={3}
            placeholder="Condizioni particolari, sconti speciali, accordi commerciali..."
          />
        </EntityFormFullWidthField>
        <EntityFormFullWidthField>
          <EntityFormField
            label="Note Operative"
            name="noteOperative"
            value={formData.noteOperative}
            onChange={handleChange}
            error={errors.noteOperative}
            multiline
            rows={3}
            placeholder="Modalità di contatto preferite, orari disponibilità, referenti specifici..."
          />
        </EntityFormFullWidthField>
        <EntityFormFullWidthField>
          <EntityFormField
            label="Note Interne"
            name="noteInterne"
            value={formData.noteInterne}
            onChange={handleChange}
            error={errors.noteInterne}
            multiline
            rows={3}
            placeholder="Annotazioni ad uso interno, non visibili all'azienda..."
          />
        </EntityFormFullWidthField>
      </EntityFormSection>

      {/* P57: Modal Import Cross-Tenant */}
      {showCrossTenantModal && checkResult && checkResult.exists && checkResult.canImport && (
        <ImportCrossTenantModal
          entityType="company"
          checkResult={checkResult as CompanyCheckResult}
          onImportSuccess={handleCrossTenantImportSuccess}
          onClose={handleCloseCrossTenantModal}
          isOpen={showCrossTenantModal}
        />
      )}

      {/* P58: Quick Action Modals per MDL (solo in edit mode) */}
      {company && (
        <>
          <QuickActionNominaModal
            isOpen={mdlModals.nominaMC}
            onClose={() => closeMdlModal('nominaMC')}
            onSuccess={() => closeMdlModal('nominaMC')}
            companyId={company.id}
            companyName={formData.ragioneSociale || company.ragioneSociale}
            tipo="MC"
          />
          <QuickActionNominaModal
            isOpen={mdlModals.nominaRSPP}
            onClose={() => closeMdlModal('nominaRSPP')}
            onSuccess={() => closeMdlModal('nominaRSPP')}
            companyId={company.id}
            companyName={formData.ragioneSociale || company.ragioneSociale}
            tipo="RSPP"
          />
          <QuickActionSopralluogoModal
            isOpen={mdlModals.sopralluogo}
            onClose={() => closeMdlModal('sopralluogo')}
            onSuccess={() => closeMdlModal('sopralluogo')}
            companyId={company.id}
            companyName={formData.ragioneSociale || company.ragioneSociale}
          />
          <QuickActionDVRModal
            isOpen={mdlModals.dvr}
            onClose={() => closeMdlModal('dvr')}
            onSuccess={() => closeMdlModal('dvr')}
            companyId={company.id}
            companyName={formData.ragioneSociale || company.ragioneSociale}
          />
          <QuickActionTariffarioModal
            isOpen={mdlModals.tariffario}
            onClose={() => closeMdlModal('tariffario')}
            onSuccess={() => closeMdlModal('tariffario')}
            companyId={company.id}
            companyName={formData.ragioneSociale || company.ragioneSociale}
          />
        </>
      )}
    </EntityFormLayout>
  );
};

export default CompanyForm;