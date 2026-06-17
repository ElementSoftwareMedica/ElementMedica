import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  Building,
  Calendar,
  FileText,
  Mail,
  MapPin,
  Phone,
  User,
  RefreshCw,
  Shield,
  Check,
  Edit2,
  Trash2,
  X,
  UserPlus,
  Building2
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import EntityFormLayout from '../shared/form/EntityFormLayout';
import EntityFormField from '../shared/form/EntityFormField';
import EntityFormGrid, { EntityFormSection } from '../shared/form/EntityFormGrid';
import { apiUpload, apiGet, apiPost, apiPut, apiDelete } from '../../services/api';
import { useTenantMode } from '../../contexts/TenantModeContext';
import { Company } from '../../types';
import { validateCodiceFiscale } from '../../lib/utils';
import { useAsyncValidation } from '../../hooks/useAsyncValidation';
import { DatePickerElegante } from '../ui/DatePickerElegante';
import { ElegantSelect } from '../ui/ElegantSelect';
import { checkEmailAvailability, checkTaxCodeAvailability } from '../../services/validation';
import { extractBirthPlaceFromTaxCode, extractGenderFromTaxCode, generateTaxCode } from '../../utils/codiceFiscale';
import { DEFAULT_ETHNICITY, ETHNICITY_OPTIONS } from '../../constants/ethnicityOptions';

interface ExistingPersonInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  taxCode: string;
  status: 'active' | 'deleted';
  currentRoles: string[];
  message: string;
  action: 'REACTIVATE_AND_UPDATE' | 'ADD_ROLE_SAME_TENANT' | 'ADD_ROLE_NEW_TENANT' | 'ROLE_EXISTS_IN_TENANT' | string;
  isSameTenant: boolean;
  newRoleType: string;
}

interface PersonFormNewProps {
  /** Dati della persona in caso di modifica */
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    taxCode: string;
    birthDate?: string;
    birthPlace?: string;
    birthProvince?: string;
    gender?: string;
    etnia?: string;
    vatNumber?: string;
    residenceAddress?: string;
    residenceCity?: string;
    province?: string;
    postalCode?: string;
    companyId?: string;
    title?: string;
    email?: string;
    phone?: string;
    notes?: string;
    status?: string;
    hiredDate?: string;
    photoUrl?: string;
    // MDL: Sede, reparto e mansione lavorativa
    siteId?: string | null;
    repartoId?: string | null;
    protocolloSanitarioId?: string | null;
    mansioni?: Array<{
      id?: string;
      mansioneId: string;
      isPrimaria?: boolean;
      mansione?: { id: string; denominazione: string; codice?: string };
    }>;
  };
  /** Lista delle aziende disponibili */
  companies: Company[];
  /** Callback chiamata al completamento del salvataggio */
  onSuccess: () => void;
  /** Callback chiamata alla chiusura del form */
  onClose: () => void;
  /** RoleType per controllare visibilità sezioni */
  roleType?: string;
  /** Valori iniziali quando il form viene aperto da un flusso contestuale */
  initialValues?: Partial<{
    companyId: string;
    roleType: string;
    status: string;
  }>;
  /** Headers multi-tenant per le operazioni CRUD */
  operateHeaders?: Record<string, string>;
}

/**
 * Estrae la data di nascita dal codice fiscale
 */
const extractBirthDateFromCF = (cf: string): string | null => {
  if (!cf || cf.length < 11) return null;
  const months = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M', 'P', 'R', 'S', 'T'];
  const year = parseInt(cf.substr(6, 2), 10);
  const currentYear = new Date().getFullYear() % 100;
  const fullYear = year > currentYear ? 1900 + year : 2000 + year;
  const monthCode = cf.substr(8, 1).toUpperCase();
  const month = months.indexOf(monthCode) + 1;
  let day = parseInt(cf.substr(9, 2), 10);
  if (day > 40) day -= 40;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Fix the date format for Prisma compatibility
const formatDateForPrisma = (dateString?: string): string | undefined => {
  if (!dateString) return undefined;
  // Check if the date already has time information
  if (dateString.includes('T')) return dateString;
  // Add time part to convert YYYY-MM-DD to YYYY-MM-DDT00:00:00Z (ISO-8601)
  return `${dateString}T00:00:00Z`;
};

/**
 * Form moderno ed elegante per la creazione e modifica di una persona
 */
const EmployeeForm: React.FC<PersonFormNewProps> = ({
  person,
  companies,
  onSuccess,
  onClose,
  roleType = 'EMPLOYEE',
  initialValues,
  operateHeaders,
}) => {
  const { getOperateHeaders } = useTenantMode();
  const effectiveHeaders = operateHeaders || getOperateHeaders();
  // Stato per i dati del form
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    taxCode: '',
    birthDate: '',
    birthPlace: '',
    birthProvince: '',
    gender: '',
    etnia: DEFAULT_ETHNICITY,
    vatNumber: '',
    residenceAddress: '',
    residenceCity: '',
    province: '',
    postalCode: '',
    companyId: initialValues?.companyId || '',
    siteId: '',
    repartoId: '',
    protocolloSanitarioId: '',
    title: '',
    email: '',
    phone: '',
    notes: '',
    status: initialValues?.status || 'ACTIVE',
    hiredDate: '',
    photoUrl: '',
  });

  // Sede, reparti, mansioni MDL
  const [companySites, setCompanySites] = useState<Array<{ id: string; siteName: string }>>([]);
  const [reparti, setReparti] = useState<Array<{ id: string; nome: string }>>([]);
  const [mansioni, setMansioni] = useState<Array<{ id: string; denominazione: string; codice?: string }>>([]);
  const [assigningMansione, setAssigningMansione] = useState(false);
  const [removingMansione, setRemovingMansione] = useState<string | null>(null);
  const [selectedMansioneId, setSelectedMansioneId] = useState('');
  const [currentMansioni, setCurrentMansioni] = useState<Array<{ id?: string; mansioneId: string; isPrimaria?: boolean; mansione?: { id: string; denominazione: string; codice?: string } }>>([]);

  // Stato per gestione inline del protocollo sanitario
  const [isEditingProtocollo, setIsEditingProtocollo] = useState(false);
  const [savingProtocollo, setSavingProtocollo] = useState(false);
  const [pendingProtocolloId, setPendingProtocolloId] = useState<string>('');
  const originalProtocolloRef = useRef<string>('');

  // Stato per gli errori
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Stato per il salvataggio
  const [isSaving, setIsSaving] = useState(false);

  // Stato per errori generali
  const [generalError, setGeneralError] = useState('');

  // Stato per dialog conferma persona esistente
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [existingPersonInfo, setExistingPersonInfo] = useState<ExistingPersonInfo | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  // Hook per le notifiche toast
  const { showToast } = useToast();

  // Using a ref to track if we've already initialized the form
  const initializedRef = useRef(false);

  // Validazione async per email (skip se in edit mode)
  const emailValidation = useAsyncValidation({
    value: formData.email || '',
    validator: checkEmailAvailability,
    errorMessage: 'Questa email è già utilizzata',
    skip: !!person?.id, // Skip in edit mode
    debounceMs: 800
  });

  // Validazione async per codice fiscale (skip se in edit mode)
  const taxCodeValidation = useAsyncValidation({
    value: formData.taxCode || '',
    validator: checkTaxCodeAvailability,
    errorMessage: 'Questo codice fiscale è già utilizzato',
    skip: !!person?.id, // Skip in edit mode
    debounceMs: 800
  });

  // Inizializza i dati del form se stiamo modificando una persona esistente
  useEffect(() => {
    // Only initialize data if we have person data AND we haven't initialized yet
    if (person && !initializedRef.current) {
      // Deriva il sesso dal codice fiscale se non è stato salvato
      const taxCodeStr = person.taxCode || '';
      const derivedGender =
        person.gender ||
        (taxCodeStr.length === 16 ? (extractGenderFromTaxCode(taxCodeStr) || '') : '');

      // P49: Il Person API restituisce companyId = CompanyTenantProfile.id.
      // Il dropdown usa company.companyTenantProfileId come valore, quindi usiamo direttamente.
      const resolvedCompanyId = person.companyId || '';

      setFormData({
        firstName: person.firstName || '',
        lastName: person.lastName || '',
        taxCode: taxCodeStr,
        birthDate: person.birthDate ? person.birthDate.substring(0, 10) : '',
        birthPlace: person.birthPlace || '',
        birthProvince: person.birthProvince || '',
        gender: derivedGender,
        etnia: person.etnia || DEFAULT_ETHNICITY,
        vatNumber: person.vatNumber || '',
        residenceAddress: person.residenceAddress || '',
        residenceCity: person.residenceCity || '',
        province: person.province || '',
        postalCode: person.postalCode || '',
        companyId: resolvedCompanyId,
        siteId: person.siteId || '',
        repartoId: person.repartoId || '',
        protocolloSanitarioId: person.protocolloSanitarioId || '',
        title: person.title || '',
        email: person.email || '',
        phone: person.phone || '',
        notes: person.notes || '',
        status: person.status || 'ACTIVE',
        hiredDate: person.hiredDate ? person.hiredDate.substring(0, 10) : '',
        photoUrl: person.photoUrl || '',
      });
      setCurrentMansioni(person.mansioni || []);
      initializedRef.current = true;
    }
  }, [person, companies]);

  // Estrai la data di nascita dal codice fiscale quando questo cambia
  useEffect(() => {
    if (formData.taxCode && formData.taxCode.length >= 11) {
      const extracted = extractBirthDateFromCF(formData.taxCode);
      if (extracted) {
        setFormData(prev => ({ ...prev, birthDate: extracted }));

        // Rimuovi eventuali errori sulla data di nascita
        if (errors.birthDate) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.birthDate;
            return newErrors;
          });
        }
      }
    }
    // Estrai anche comune e provincia di nascita se i campi sono vuoti
    if (formData.taxCode && formData.taxCode.length === 16) {
      const birthPlaceInfo = extractBirthPlaceFromTaxCode(formData.taxCode);
      if (birthPlaceInfo) {
        setFormData(prev => ({
          ...prev,
          birthPlace: prev.birthPlace || birthPlaceInfo.comune,
          birthProvince: prev.birthProvince || birthPlaceInfo.provincia
        }));
      }
      // Auto-fill sesso da codice fiscale se campo vuoto
      const gender = extractGenderFromTaxCode(formData.taxCode);
      if (gender) {
        setFormData(prev => ({ ...prev, gender: prev.gender || gender }));
      }
    }
  }, [formData.taxCode, errors.birthDate]);

  // Auto-genera il codice fiscale quando tutti i dati anagrafici sono presenti e il CF è vuoto
  useEffect(() => {
    if (
      !formData.firstName?.trim() ||
      !formData.lastName?.trim() ||
      !formData.birthDate ||
      !formData.birthPlace?.trim() ||
      !formData.gender ||
      formData.gender === 'OTHER' ||
      formData.taxCode?.trim()
    ) {
      return;
    }

    const generated = generateTaxCode(
      formData.lastName,
      formData.firstName,
      formData.birthDate,
      formData.gender as 'MALE' | 'FEMALE',
      formData.birthPlace
    );
    if (generated) {
      setFormData(prev => ({ ...prev, taxCode: generated }));
    }
  }, [formData.firstName, formData.lastName, formData.birthDate, formData.birthPlace, formData.gender]);

  // Carica le sedi operative quando cambia l'azienda
  useEffect(() => {
    if (!formData.companyId) {
      setCompanySites([]);
      return;
    }
    // P49: formData.companyId = CompanyTenantProfile.id; l'API sedi richiede Company.id (globale)
    const selectedCompany = companies.find(
      c => c.companyTenantProfileId === formData.companyId
    );
    if (!selectedCompany && companies.length > 0) {
      setCompanySites([]);
      return;
    }
    if (!selectedCompany) return;
    const globalCompanyId = selectedCompany.id;
    apiGet<{ sites?: Array<{ id: string; siteName: string }> }>(`/api/v1/company-sites/company/${globalCompanyId}`)
      .then(data => setCompanySites(data?.sites || (Array.isArray(data) ? data as any : [])))
      .catch(() => setCompanySites([]));
  }, [formData.companyId, companies]);

  // Carica i reparti quando cambia la sede
  useEffect(() => {
    if (!formData.siteId) {
      setReparti([]);
      return;
    }
    apiGet<{ reparti?: Array<{ id: string; nome: string }> }>(`/api/v1/reparto/site/${formData.siteId}`)
      .then(data => setReparti(data?.reparti || (Array.isArray(data) ? (data as any) : [])))
      .catch(() => setReparti([]));
  }, [formData.siteId]);

  // Carica le mansioni MDL disponibili (una volta per forma)
  useEffect(() => {
    apiGet<{ data?: Array<{ id: string; denominazione: string; codice?: string }> }>('/api/v1/clinica/mansioni?limit=200')
      .then(data => setMansioni(data?.data || (Array.isArray(data) ? (data as any) : [])))
      .catch(() => setMansioni([]));
  }, []);

  // Carica tutti i protocolli sanitari attivi per il dropdown di assegnazione diretta
  const [allProtocolli, setAllProtocolli] = useState<Array<{ id: string; codice: string; denominazione: string }>>([]);
  useEffect(() => {
    apiGet<{ data?: Array<{ id: string; codice: string; denominazione: string }> }>('/api/v1/clinica/protocolli-sanitari?isAttivo=true&limit=200')
      .then(data => setAllProtocolli(data?.data || (Array.isArray(data) ? (data as any) : [])))
      .catch(() => setAllProtocolli([]));
  }, []);

  // Carica i protocolli sanitari associati alle mansioni del lavoratore
  const [protocolliSanitari, setProtocolliSanitari] = useState<Array<{
    id: string; codice: string; denominazione: string; mansioneName?: string;
  }>>([]);
  useEffect(() => {
    if (currentMansioni.length === 0) {
      setProtocolliSanitari([]);
      return;
    }
    const fetchProtocolli = async () => {
      const allProtocolli: Array<{ id: string; codice: string; denominazione: string; mansioneName?: string }> = [];
      const seen = new Set<string>();
      for (const lm of currentMansioni) {
        try {
          const res = await apiGet<{ success?: boolean; data?: Array<{ id: string; codice: string; denominazione: string }> }>(
            `/api/v1/clinica/protocolli-sanitari/by-mansione/${lm.mansioneId}`
          );
          const items = res?.data || (Array.isArray(res) ? res : []);
          for (const p of items) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              allProtocolli.push({ ...p, mansioneName: lm.mansione?.denominazione });
            }
          }
        } catch { /* mansione might not have protocolli */ }
      }
      setProtocolliSanitari(allProtocolli);
    };
    fetchProtocolli();
  }, [currentMansioni]);

  // Assegna mansione MDL a questo lavoratore
  const handleAssignMansione = async () => {
    if (!selectedMansioneId || !person?.id) return;
    setAssigningMansione(true);
    try {
      const res = await apiPost(`/api/v1/clinica/mansioni/${selectedMansioneId}/assign`, {
        personId: person.id,
        isPrimaria: currentMansioni.length === 0, // prima mansione → primaria
        dataInizio: new Date().toISOString().split('T')[0],
      }, { headers: effectiveHeaders }) as any;
      setCurrentMansioni(prev => [...prev, {
        id: res?.id,
        mansioneId: selectedMansioneId,
        isPrimaria: currentMansioni.length === 0,
        mansione: mansioni.find(m => m.id === selectedMansioneId)
          ? { ...mansioni.find(m => m.id === selectedMansioneId)! }
          : undefined,
      }]);
      setSelectedMansioneId('');
      showToast({ message: 'Mansione MDL assegnata', type: 'success' });
    } catch {
      showToast({ message: 'Errore assegnazione mansione', type: 'error' });
    } finally {
      setAssigningMansione(false);
    }
  };

  const handleRemoveMansione = async (assignmentId: string) => {
    if (!assignmentId) return;
    setRemovingMansione(assignmentId);
    try {
      await apiDelete(`/api/v1/clinica/mansioni/assignment/${assignmentId}`, { headers: effectiveHeaders });
      setCurrentMansioni(prev => prev.filter(lm => lm.id !== assignmentId));
      showToast({ message: 'Mansione rimossa', type: 'success' });
    } catch {
      showToast({ message: 'Errore nella rimozione della mansione', type: 'error' });
    } finally {
      setRemovingMansione(null);
    }
  };

  // Salva inline il protocollo sanitario senza dover salvare l'intero form
  const handleSaveProtocolloInline = async () => {
    if (!person?.id) return;
    setSavingProtocollo(true);
    try {
      await apiPut(`/api/v1/persons/${person.id}`, {
        protocolloSanitarioId: pendingProtocolloId || null,
      }, { headers: effectiveHeaders });

      // Aggiorna formData con il nuovo valore
      setFormData(prev => ({ ...prev, protocolloSanitarioId: pendingProtocolloId }));
      originalProtocolloRef.current = pendingProtocolloId;
      setIsEditingProtocollo(false);
      showToast({
        message: pendingProtocolloId
          ? 'Protocollo sanitario aggiornato'
          : 'Protocollo sanitario rimosso',
        type: 'success',
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr?.response?.data?.error || 'Errore durante l\'aggiornamento del protocollo';
      showToast({ message: msg, type: 'error' });
    } finally {
      setSavingProtocollo(false);
    }
  };

  const handleStartEditProtocollo = () => {
    setPendingProtocolloId(formData.protocolloSanitarioId);
    originalProtocolloRef.current = formData.protocolloSanitarioId;
    setIsEditingProtocollo(true);
  };

  const handleCancelEditProtocollo = () => {
    setPendingProtocolloId(originalProtocolloRef.current);
    setIsEditingProtocollo(false);
  };

  const handleRemoveProtocollo = async () => {
    if (!person?.id) return;
    setPendingProtocolloId('');
    setSavingProtocollo(true);
    try {
      await apiPut(`/api/v1/persons/${person.id}`, {
        protocolloSanitarioId: null,
      }, { headers: effectiveHeaders });
      setFormData(prev => ({ ...prev, protocolloSanitarioId: '' }));
      originalProtocolloRef.current = '';
      setIsEditingProtocollo(false);
      showToast({ message: 'Protocollo sanitario rimosso', type: 'success' });
    } catch {
      showToast({ message: 'Errore durante la rimozione del protocollo', type: 'error' });
    } finally {
      setSavingProtocollo(false);
    }
  };

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

  // Gestisce il caricamento di una foto
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('files', file);

      const data = await apiUpload('/api/v1/cms/media/upload', uploadFormData) as { data?: { url: string }[]; url?: string };

      const photoUrl = data?.data?.[0]?.url || data?.url;
      if (photoUrl) {
        setFormData(prev => ({ ...prev, photoUrl }));
      }
    } catch (error) {
      showToast({
        message: `Errore: ${'Errore durante il caricamento dell\'immagine'}`,
        type: 'error'
      });
    }
  };

  // Valida i dati del form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validazione campi obbligatori
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Il Nome è obbligatorio';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Il Cognome è obbligatorio';
    }

    // P48 Fix: Usa validateCodiceFiscale per messaggi di errore più specifici
    if (!formData.taxCode.trim()) {
      newErrors.taxCode = 'Il Codice Fiscale è obbligatorio';
    } else {
      const cfValidation = validateCodiceFiscale(formData.taxCode);
      if (!cfValidation.isValid) {
        newErrors.taxCode = cfValidation.error || 'Codice Fiscale non valido';
      } else if (taxCodeValidation.error) {
        newErrors.taxCode = taxCodeValidation.error;
      }
    }

    // L'azienda è obbligatoria solo per EMPLOYEE
    if (roleType === 'EMPLOYEE' && !formData.companyId) {
      newErrors.companyId = "L'Azienda è obbligatoria";
    }

    // Validazione email
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato email non valido';
    } else if (emailValidation.error) {
      newErrors.email = emailValidation.error;
    }

    // Blocca submit se validazione async in corso
    if (emailValidation.isValidating || taxCodeValidation.isValidating) {
      newErrors._async = 'Validazione in corso...';
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
      // Prepara i dati da inviare — ometti campi vuoti per non triggerare
      // validazione backend su campi opzionali (es. firstName: '' fallisce isLength min:1)
      const rawPayload: Record<string, unknown> = {
        ...formData,
        roleType,
        birthDate: formatDateForPrisma(formData.birthDate),
        hiredDate: formatDateForPrisma(formData.hiredDate),
      };

      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rawPayload)) {
        if (value !== '' && value !== undefined) {
          payload[key] = value;
        }
      }

      // Determina il metodo in base a se stiamo creando o modificando

      // Invia la richiesta usando il servizio API centralizzato
      if (person) {
        await apiPut(`/api/v1/persons/${person.id}`, payload, { headers: effectiveHeaders });
      } else {
        await apiPost('/api/v1/persons', payload, { headers: effectiveHeaders });
      }

      // Mostra notifica di successo
      showToast({
        message: person ? 'Persona aggiornata con successo' : 'Persona creata con successo',
        type: 'success'
      });

      // Chiama il callback di successo
      onSuccess();
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: any } };
      const responseData = axiosError?.response?.data;

      // Check se è una richiesta di conferma per persona esistente
      if (axiosError?.response?.status === 409 && responseData?.code === 'PERSON_EXISTS') {
        setExistingPersonInfo({
          id: responseData.existingPerson.id,
          firstName: responseData.existingPerson.firstName,
          lastName: responseData.existingPerson.lastName,
          email: responseData.existingPerson.email,
          taxCode: responseData.existingPerson.taxCode,
          status: responseData.existingPerson.status,
          currentRoles: responseData.existingPerson.currentRoles || [],
          message: responseData.message,
          action: responseData.action,
          isSameTenant: responseData.isSameTenant ?? true,
          newRoleType: responseData.newRoleType
        });
        setPendingPayload({
          ...formData,
          roleType,
          birthDate: formatDateForPrisma(formData.birthDate),
          hiredDate: formatDateForPrisma(formData.hiredDate),
        });
        setShowConfirmDialog(true);
        setIsSaving(false);
        return;
      }

      // Mostra dettagli errore di validazione backend se disponibili
      let errorMsg = 'Errore durante il salvataggio';
      if (axiosError?.response?.status === 400) {
        if (responseData?.errors) {
          const fields = (responseData.errors as Array<{ path?: string; msg?: string }>)
            .map(e => e.msg || e.path)
            .filter(Boolean)
            .join(', ');
          if (fields) errorMsg = `Dati non validi: ${fields}`;
        } else if (responseData?.error) {
          errorMsg = responseData.error;
        }
      }

      setGeneralError(errorMsg);

      showToast({
        message: errorMsg,
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Gestisce la conferma riattivazione
  const handleConfirmReactivation = async () => {
    if (!pendingPayload) return;

    setIsReactivating(true);
    try {
      const dataWithForce = { ...pendingPayload, forceReactivate: true };
      await apiPost('/api/v1/persons', dataWithForce, { headers: effectiveHeaders });

      setShowConfirmDialog(false);
      setExistingPersonInfo(null);
      setPendingPayload(null);

      showToast({
        message: existingPersonInfo?.status === 'deleted'
          ? 'Persona riattivata con successo'
          : 'Dati persona aggiornati con successo',
        type: 'success'
      });

      onSuccess();
    } catch (error: unknown) {
      setGeneralError('Errore durante la riattivazione');
      showToast({
        message: `Errore: ${'Errore durante la riattivazione'}`,
        type: 'error'
      });
    } finally {
      setIsReactivating(false);
    }
  };

  // Annulla riattivazione
  const handleCancelReactivation = () => {
    setShowConfirmDialog(false);
    setExistingPersonInfo(null);
    setPendingPayload(null);
  };

  // Gestisce la rimozione della foto
  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photoUrl: '' }));
  };

  return (
    <>
      {/* Dialog conferma persona esistente */}
      {showConfirmDialog && existingPersonInfo && (() => {
        const isDeleted = existingPersonInfo.action === 'REACTIVATE_AND_UPDATE';
        const isCrossTenant = existingPersonInfo.action === 'ADD_ROLE_NEW_TENANT';
        const headerBg = isDeleted
          ? 'bg-amber-50 dark:bg-amber-900/30 border-b border-amber-100 dark:border-amber-800'
          : isCrossTenant
            ? 'bg-teal-50 dark:bg-teal-900/30 border-b border-teal-100 dark:border-teal-800'
            : 'bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800';
        const iconBg = isDeleted ? 'bg-amber-100' : isCrossTenant ? 'bg-teal-100' : 'bg-blue-100';
        const btnClass = isDeleted
          ? 'bg-amber-600 hover:bg-amber-700'
          : isCrossTenant
            ? 'bg-teal-600 hover:bg-teal-700'
            : 'bg-blue-600 hover:bg-blue-700';
        const title = isDeleted
          ? 'Riattivare persona eliminata?'
          : isCrossTenant
            ? 'Crea accesso in questa organizzazione'
            : 'Aggiungi ruolo alla persona';
        const btnLabel = isDeleted ? 'Riattiva e Aggiorna' : isCrossTenant ? 'Crea Accesso' : 'Aggiungi Ruolo';
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-black/50 max-w-lg w-full mx-4 overflow-hidden">
              <div className={`p-4 ${headerBg}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${iconBg}`}>
                    {isDeleted ? (
                      <RefreshCw className="w-5 h-5 text-amber-600" />
                    ) : isCrossTenant ? (
                      <Building2 className="w-5 h-5 text-teal-600" />
                    ) : (
                      <UserPlus className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                    {title}
                  </h3>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">{existingPersonInfo.message}</p>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dati esistenti:</p>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p><span className="font-medium">Nome:</span> {existingPersonInfo.firstName} {existingPersonInfo.lastName}</p>
                    {existingPersonInfo.email && <p><span className="font-medium">Email:</span> {existingPersonInfo.email}</p>}
                    {existingPersonInfo.taxCode && <p><span className="font-medium">Codice Fiscale:</span> {existingPersonInfo.taxCode}</p>}
                    <p><span className="font-medium">Ruoli attuali:</span> {existingPersonInfo.currentRoles.join(', ') || 'Nessuno'}</p>
                    <p><span className="font-medium">Stato:</span>
                      <span className={`ml-1 px-2 py-0.5 rounded text-xs ${existingPersonInfo.status === 'deleted' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {existingPersonInfo.status === 'deleted' ? 'Eliminato' : 'Attivo'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCancelReactivation}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={isReactivating}
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirmReactivation}
                  disabled={isReactivating}
                  className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${btnClass} disabled:opacity-50`}
                >
                  {isReactivating && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {btnLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <EntityFormLayout
        title={person ? 'Modifica Persona' : 'Nuova Persona'}
        subtitle={person ? `Modifica i dati di ${formData.firstName} ${formData.lastName}` : 'Inserisci i dati della nuova persona'}
        onSubmit={handleSubmit}
        onClose={onClose}
        isSaving={isSaving}
        error={generalError}
        submitLabel={person ? 'Aggiorna' : 'Crea'}
      >
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-3/4">
            <EntityFormSection title="Dati Anagrafici" description="Informazioni personali della persona">
              <EntityFormGrid columns={2}>
                <EntityFormField
                  name="firstName"
                  label="Nome"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  leftIcon={<User size={18} />}
                  error={errors.firstName}
                />

                <EntityFormField
                  name="lastName"
                  label="Cognome"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  leftIcon={<User size={18} />}
                  error={errors.lastName}
                />

                <EntityFormField
                  name="taxCode"
                  label="Codice Fiscale"
                  value={formData.taxCode}
                  onChange={handleChange}
                  required
                  leftIcon={<FileText size={18} />}
                  error={errors.taxCode || taxCodeValidation.error}
                  helpText={taxCodeValidation.isValidating ? 'Verifica disponibilità...' : undefined}
                />

                <EntityFormField
                  name="vatNumber"
                  label="Partita IVA"
                  value={formData.vatNumber}
                  onChange={handleChange}
                  leftIcon={<FileText size={18} />}
                  error={errors.vatNumber}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data di Nascita</label>
                  <DatePickerElegante
                    value={formData.birthDate}
                    onChange={(date) => handleChange({ target: { name: 'birthDate', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
                    theme="teal"
                  />
                  {errors.birthDate && <p className="mt-1 text-xs text-red-500">{errors.birthDate}</p>}
                  <p className="mt-1 text-xs text-gray-500">Estratta automaticamente dal codice fiscale</p>
                </div>

                <EntityFormField
                  name="gender"
                  label="Sesso"
                  type="select"
                  value={formData.gender}
                  onChange={handleChange}
                  leftIcon={<User size={18} />}
                  error={errors.gender}
                  options={[
                    { value: '', label: 'Non specificato' },
                    { value: 'MALE', label: 'Maschio' },
                    { value: 'FEMALE', label: 'Femmina' },
                    { value: 'OTHER', label: 'Altro' }
                  ]}
                />

                <EntityFormField
                  name="etnia"
                  label="Etnia"
                  type="select"
                  value={formData.etnia}
                  onChange={handleChange}
                  leftIcon={<User size={18} />}
                  options={ETHNICITY_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
                />

                <EntityFormField
                  name="birthPlace"
                  label="Comune di Nascita"
                  value={formData.birthPlace}
                  onChange={handleChange}
                  leftIcon={<MapPin size={18} />}
                  error={errors.birthPlace}
                />

                <EntityFormField
                  name="birthProvince"
                  label="Prov. di Nascita"
                  value={formData.birthProvince}
                  onChange={handleChange}
                  placeholder="Es. MI"
                  leftIcon={<MapPin size={18} />}
                  error={errors.birthProvince}
                />
              </EntityFormGrid>
            </EntityFormSection>

            <EntityFormSection title="Residenza" description="Indirizzo di residenza della persona">
              <EntityFormGrid columns={2}>
                <EntityFormField
                  name="residenceAddress"
                  label="Indirizzo"
                  value={formData.residenceAddress}
                  onChange={handleChange}
                  leftIcon={<MapPin size={18} />}
                  error={errors.residenceAddress}
                />

                <EntityFormField
                  name="residenceCity"
                  label="Città"
                  value={formData.residenceCity}
                  onChange={handleChange}
                  leftIcon={<MapPin size={18} />}
                  error={errors.residenceCity}
                />

                <EntityFormField
                  name="province"
                  label="Provincia"
                  value={formData.province}
                  onChange={handleChange}
                  leftIcon={<MapPin size={18} />}
                  error={errors.province}
                />

                <EntityFormField
                  name="postalCode"
                  label="CAP"
                  value={formData.postalCode}
                  onChange={handleChange}
                  leftIcon={<MapPin size={18} />}
                  error={errors.postalCode}
                />
              </EntityFormGrid>
            </EntityFormSection>

            {roleType === 'EMPLOYEE' && (
              <EntityFormSection title="Lavoro" description="Informazioni lavorative della persona">
                <EntityFormGrid columns={2}>
                  <EntityFormField
                    name="companyId"
                    label="Azienda"
                    type="select"
                    value={formData.companyId}
                    onChange={handleChange}
                    required={roleType === 'EMPLOYEE'}
                    leftIcon={<Building size={18} />}
                    error={errors.companyId}
                    searchable
                    options={[...companies]
                      .filter(company => company.companyTenantProfileId)
                      .sort((a, b) => (a.ragioneSociale || '').localeCompare(b.ragioneSociale || ''))
                      .map(company => ({
                        value: company.companyTenantProfileId!,
                        label: company.ragioneSociale
                      }))}
                  />

                  <EntityFormField
                    name="title"
                    label="Qualifica / Ruolo"
                    value={formData.title}
                    onChange={handleChange}
                    leftIcon={<Briefcase size={18} />}
                    error={errors.title}
                    helpText="Qualifica professionale (es. Operaio, Impiegato)"
                  />

                  <EntityFormField
                    name="siteId"
                    label="Sede Operativa"
                    type="select"
                    value={formData.siteId}
                    onChange={handleChange}
                    leftIcon={<MapPin size={18} />}
                    error={errors.siteId}
                    options={[
                      { value: '', label: '– Nessuna sede –' },
                      ...companySites.map(s => ({ value: s.id, label: s.siteName }))
                    ]}
                  />

                  <EntityFormField
                    name="repartoId"
                    label="Reparto"
                    type="select"
                    value={formData.repartoId}
                    onChange={handleChange}
                    leftIcon={<Building size={18} />}
                    error={errors.repartoId}
                    options={[
                      { value: '', label: '– Nessun reparto –' },
                      ...reparti.map(r => ({ value: r.id, label: r.nome }))
                    ]}
                  />

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mansioni MDL</label>

                    {/* Mansioni attuali */}
                    {currentMansioni.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {currentMansioni.map((lm) => (
                          <span key={lm.id || lm.mansioneId} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${lm.isPrimaria ? 'bg-teal-100 text-teal-800 dark:bg-teal-800 dark:text-teal-100' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                            {lm.mansione?.denominazione || lm.mansioneId}
                            {lm.isPrimaria && <span className="text-xs opacity-75">&nbsp;(primaria)</span>}
                            {person?.id && lm.id && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMansione(lm.id!)}
                                disabled={removingMansione === lm.id}
                                className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                                title="Rimuovi mansione"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Aggiungi mansione (solo edit) */}
                    {person?.id && mansioni.length > 0 && (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <ElegantSelect
                            value={selectedMansioneId}
                            onChange={setSelectedMansioneId}
                            placeholder="– Seleziona mansione MDL –"
                            options={[
                              { value: '', label: '– Seleziona mansione MDL –' },
                              ...mansioni
                                .filter(m => !currentMansioni.some(lm => lm.mansioneId === m.id))
                                .map(m => ({ value: m.id, label: `${m.denominazione}${m.codice ? ` (${m.codice})` : ''}` }))
                            ]}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAssignMansione}
                          disabled={!selectedMansioneId || assigningMansione}
                          className="px-3 py-1.5 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-md disabled:opacity-50"
                        >
                          {assigningMansione ? '...' : '+ Assegna'}
                        </button>
                      </div>
                    )}
                    {currentMansioni.length === 0 && !person?.id && (
                      <p className="text-xs text-gray-500">Le mansioni MDL possono essere assegnate dopo il salvataggio.</p>
                    )}
                  </div>

                  {/* Protocollo Sanitario assegnato al dipendente */}
                  {person?.id && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Shield size={14} className="inline mr-1.5 -mt-0.5 text-teal-600" />
                        Protocollo Sanitario
                      </label>

                      {/* Stato: Nessun protocollo e non in editing */}
                      {!formData.protocolloSanitarioId && !isEditingProtocollo && (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Nessun protocollo assegnato</span>
                          <button
                            type="button"
                            onClick={handleStartEditProtocollo}
                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 hover:bg-teal-700 text-white transition-colors"
                          >
                            <Shield size={12} />
                            Assegna Protocollo
                          </button>
                        </div>
                      )}

                      {/* Stato: Protocollo assegnato e non in editing */}
                      {formData.protocolloSanitarioId && !isEditingProtocollo && (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/20">
                          <Shield size={16} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-teal-800 dark:text-teal-200 flex-1">
                            {allProtocolli.find(p => p.id === formData.protocolloSanitarioId)?.denominazione || 'Protocollo assegnato'}
                            {(() => {
                              const p = allProtocolli.find(p => p.id === formData.protocolloSanitarioId);
                              return p?.codice ? ` (${p.codice})` : '';
                            })()}
                          </span>
                          <button
                            type="button"
                            onClick={handleStartEditProtocollo}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-teal-300 dark:border-teal-600 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-800 transition-colors"
                          >
                            <Edit2 size={11} />
                            Cambia
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveProtocollo}
                            disabled={savingProtocollo}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={11} />
                            {savingProtocollo ? '...' : 'Rimuovi'}
                          </button>
                        </div>
                      )}

                      {/* Stato: Editing mode - dropdown + conferma/annulla */}
                      {isEditingProtocollo && (
                        <div className="space-y-2">
                          <ElegantSelect
                            value={pendingProtocolloId}
                            onChange={setPendingProtocolloId}
                            placeholder="— Nessun protocollo —"
                            options={[
                              { value: '', label: '— Nessun protocollo —' },
                              ...allProtocolli.map(p => ({ value: p.id, label: `${p.denominazione}${p.codice ? ` (${p.codice})` : ''}` }))
                            ]}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSaveProtocolloInline}
                              disabled={savingProtocollo || pendingProtocolloId === originalProtocolloRef.current}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50"
                            >
                              <Check size={12} />
                              {savingProtocollo ? 'Salvataggio...' : 'Conferma'}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditProtocollo}
                              disabled={savingProtocollo}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              <X size={12} />
                              Annulla
                            </button>
                          </div>
                        </div>
                      )}

                      {protocolliSanitari.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Protocolli derivati dalle mansioni:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {protocolliSanitari.map(p => (
                              <span
                                key={p.id}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${formData.protocolloSanitarioId === p.id
                                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-300 dark:border-teal-600'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                                  }`}
                                title={p.mansioneName ? `Dalla mansione: ${p.mansioneName}` : undefined}
                              >
                                <Shield size={10} className="opacity-60" />
                                {p.denominazione}
                                {formData.protocolloSanitarioId === p.id && (
                                  <Check size={10} className="text-teal-600" />
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Assunzione</label>
                    <DatePickerElegante
                      value={formData.hiredDate}
                      onChange={(date) => handleChange({ target: { name: 'hiredDate', value: date ? date.toISOString().split('T')[0] : '' } } as any)}
                      theme="teal"
                    />
                    {errors.hiredDate && <p className="mt-1 text-xs text-red-500">{errors.hiredDate}</p>}
                  </div>

                  <EntityFormField
                    name="status"
                    label="Stato"
                    type="select"
                    value={formData.status}
                    onChange={handleChange}
                    leftIcon={<User size={18} />}
                    error={errors.status}
                    options={[
                      { value: 'ACTIVE', label: 'Attivo' },
                      { value: 'INACTIVE', label: 'Inattivo' },
                      { value: 'SUSPENDED', label: 'In Aspettativa' },
                      { value: 'TERMINATED', label: 'Cessato' }
                    ]}
                  />
                </EntityFormGrid>
              </EntityFormSection>
            )}

            <EntityFormSection title="Contatti" description="Informazioni di contatto della persona">
              <EntityFormGrid columns={2}>
                <EntityFormField
                  name="email"
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  leftIcon={<Mail size={18} />}
                  error={errors.email || emailValidation.error}
                  helpText={emailValidation.isValidating ? 'Verifica disponibilità...' : undefined}
                />

                <EntityFormField
                  name="phone"
                  label="Telefono"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  leftIcon={<Phone size={18} />}
                  error={errors.phone}
                />
              </EntityFormGrid>
            </EntityFormSection>

            <EntityFormSection title="Note Aggiuntive">
              <EntityFormGrid columns={1}>
                <EntityFormField
                  name="notes"
                  label="Note"
                  type="textarea"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  error={errors.notes}
                />
              </EntityFormGrid>
            </EntityFormSection>
          </div>

          <div className="w-full md:w-1/4">
            <EntityFormSection title="Foto" description="Foto della persona">
              <div className="flex flex-col items-center space-y-4">
                {formData.photoUrl ? (
                  <div className="relative">
                    <img
                      src={formData.photoUrl}
                      alt={`${formData.firstName} ${formData.lastName}`}
                      className="w-48 h-48 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      title="Rimuovi foto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    <User size={64} className="text-gray-400 dark:text-gray-500" />
                  </div>
                )}

                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Carica Foto</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
            </EntityFormSection>
          </div>
        </div>
      </EntityFormLayout>
    </>
  );
};

export default EmployeeForm;
