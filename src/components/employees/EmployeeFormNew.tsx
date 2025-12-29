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
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import EntityFormLayout from '../shared/form/EntityFormLayout';
import EntityFormField from '../shared/form/EntityFormField';
import EntityFormGrid, { EntityFormSection } from '../shared/form/EntityFormGrid';
import { apiUpload, apiPost, apiPut } from '../../services/api';
import { Company } from '../../types';
import { isValidCodiceFiscale } from '../../lib/utils';
import { useAsyncValidation } from '../../hooks/useAsyncValidation';
import { checkEmailAvailability, checkTaxCodeAvailability } from '../../services/validation';

interface ExistingPersonInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  taxCode: string;
  status: 'active' | 'deleted';
  currentRoles: string[];
  message: string;
  action: string;
  newRoleType: string;
}

interface PersonFormNewProps {
  /** Dati della persona in caso di modifica */
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    codiceFiscale: string;
    birthDate?: string;
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
  };
  /** Lista delle aziende disponibili */
  companies: Company[];
  /** Callback chiamata al completamento del salvataggio */
  onSuccess: () => void;
  /** Callback chiamata alla chiusura del form */
  onClose: () => void;
  /** RoleType per controllare visibilità sezioni */
  roleType?: string;
}

/**
 * Estrae la data di nascita dal codice fiscale
 */
const extractBirthDateFromCF = (cf: string): string | null => {
  if (!cf || cf.length < 11) return null;
  const months = ['A','B','C','D','E','H','L','M','P','R','S','T'];
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
const EmployeeFormNew: React.FC<PersonFormNewProps> = ({
  person,
  companies,
  onSuccess,
  onClose,
  roleType = 'EMPLOYEE',
}) => {
  // Stato per i dati del form
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    codiceFiscale: '',
    birthDate: '',
    residenceAddress: '',
    residenceCity: '',
    province: '',
    postalCode: '',
    companyId: '',
    title: '',
    email: '',
    phone: '',
    notes: '',
    status: 'ACTIVE',
    hiredDate: '',
    photoUrl: '',
  });
  
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
    value: formData.codiceFiscale || '',
    validator: checkTaxCodeAvailability,
    errorMessage: 'Questo codice fiscale è già utilizzato',
    skip: !!person?.id, // Skip in edit mode
    debounceMs: 800
  });
  
  // Inizializza i dati del form se stiamo modificando una persona esistente
  useEffect(() => {
    // Only initialize data if we have person data AND we haven't initialized yet
    if (person && !initializedRef.current) {
      setFormData({
        firstName: person.firstName || '',
        lastName: person.lastName || '',
        codiceFiscale: person.codiceFiscale || '',
        birthDate: person.birthDate ? person.birthDate.substring(0, 10) : '', // Ensure date format is YYYY-MM-DD
        residenceAddress: person.residenceAddress || '',
        residenceCity: person.residenceCity || '',
        province: person.province || '',
        postalCode: person.postalCode || '',
        companyId: person.companyId || '',
        title: person.title || '',
        email: person.email || '',
        phone: person.phone || '',
        notes: person.notes || '',
        status: person.status || 'Active',
        hiredDate: person.hiredDate ? person.hiredDate.substring(0, 10) : '', // Ensure date format is YYYY-MM-DD
        photoUrl: person.photoUrl || '',
      });
      initializedRef.current = true;
    }
  }, [person]);
  
  // Estrai la data di nascita dal codice fiscale quando questo cambia
  useEffect(() => {
    if (formData.codiceFiscale && formData.codiceFiscale.length >= 11) {
      const extracted = extractBirthDateFromCF(formData.codiceFiscale);
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
  }, [formData.codiceFiscale, errors.birthDate]);
  
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
      uploadFormData.append('photo', file);
      
      const data = await apiUpload('/api/upload', uploadFormData) as { url: string };
      
      if (data.url) {
        setFormData(prev => ({ ...prev, photoUrl: data.url }));
      }
    } catch (error) {
      showToast({ 
        message: `Errore: ${error instanceof Error ? error.message : 'Errore durante il caricamento dell\'immagine'}`, 
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
    
    if (!formData.codiceFiscale.trim()) {
      newErrors.codiceFiscale = 'Il Codice Fiscale è obbligatorio';
    } else if (!isValidCodiceFiscale(formData.codiceFiscale)) {
      newErrors.codiceFiscale = 'Formato Codice Fiscale non valido';
    } else if (taxCodeValidation.error) {
      newErrors.codiceFiscale = taxCodeValidation.error;
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
      // Prepara i dati da inviare
      const payload = {
        ...formData,
        roleType,
        birthDate: formatDateForPrisma(formData.birthDate),
        hiredDate: formatDateForPrisma(formData.hiredDate),
      };
      
      // Determina il metodo in base a se stiamo creando o modificando
      
      // Invia la richiesta usando il servizio API centralizzato
      if (person) {
        await apiPut(`/api/v1/persons/${person.id}`, payload);
      } else {
        await apiPost('/api/v1/persons', payload);
      }
      
      // Mostra notifica di successo
      showToast({ 
        message: person ? 'Persona aggiornata con successo' : 'Persona creata con successo', 
        type: 'success' 
      });
      
      // Chiama il callback di successo
      onSuccess();
    } catch (error: any) {
      const responseData = error?.response?.data;
      
      // Check se è una richiesta di conferma per persona esistente
      if (error?.response?.status === 409 && responseData?.code === 'PERSON_EXISTS') {
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
      
      setGeneralError(error instanceof Error ? error.message : 'Errore durante il salvataggio');
      
      // Mostra notifica di errore
      showToast({ 
        message: `Errore: ${error instanceof Error ? error.message : 'Errore durante il salvataggio'}`, 
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
      await apiPost('/api/v1/persons', dataWithForce);
      
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
    } catch (error: any) {
      setGeneralError(error instanceof Error ? error.message : 'Errore durante la riattivazione');
      showToast({ 
        message: `Errore: ${error instanceof Error ? error.message : 'Errore durante la riattivazione'}`, 
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
      {showConfirmDialog && existingPersonInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            <div className={`p-4 ${existingPersonInfo.status === 'deleted' ? 'bg-amber-50 border-b border-amber-100' : 'bg-blue-50 border-b border-blue-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${existingPersonInfo.status === 'deleted' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                  {existingPersonInfo.status === 'deleted' ? (
                    <RefreshCw className="w-5 h-5 text-amber-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {existingPersonInfo.status === 'deleted' 
                    ? 'Riattivare persona eliminata?' 
                    : 'Persona già esistente'}
                </h3>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 mb-4">{existingPersonInfo.message}</p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700">Dati esistenti:</p>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
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
            
            <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t">
              <button
                onClick={handleCancelReactivation}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isReactivating}
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmReactivation}
                disabled={isReactivating}
                className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                  existingPersonInfo.status === 'deleted' 
                    ? 'bg-amber-600 hover:bg-amber-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {isReactivating && <RefreshCw className="w-4 h-4 animate-spin" />}
                {existingPersonInfo.status === 'deleted' 
                  ? 'Riattiva e Aggiorna' 
                  : 'Conferma Aggiornamento'}
              </button>
            </div>
          </div>
        </div>
      )}
      
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
            name="codiceFiscale"
            label="Codice Fiscale"
            value={formData.codiceFiscale}
            onChange={handleChange}
            required
            leftIcon={<FileText size={18} />}
            error={errors.codiceFiscale || taxCodeValidation.error}
            helpText={taxCodeValidation.isValidating ? 'Verifica disponibilità...' : undefined}
          />
          
          <EntityFormField
            name="birthDate"
            label="Data di Nascita"
            type="date"
            value={formData.birthDate}
            onChange={handleChange}
            leftIcon={<Calendar size={18} />}
            error={errors.birthDate}
                helpText="Estratta automaticamente dal codice fiscale"
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
                  options={companies.map(company => ({
                    value: company.id,
                    label: company.ragioneSociale
                  }))}
                />
                
                <EntityFormField
                  name="title"
                  label="Ruolo / Mansione"
                  value={formData.title}
                  onChange={handleChange}
                  leftIcon={<Briefcase size={18} />}
                  error={errors.title}
                />
                
                <EntityFormField
                  name="hiredDate"
                  label="Data Assunzione"
                  type="date"
                  value={formData.hiredDate}
                  onChange={handleChange}
                  leftIcon={<Calendar size={18} />}
                  error={errors.hiredDate}
                />
                
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
                <div className="w-48 h-48 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
                  <User size={64} className="text-gray-400" />
          </div>
        )}
        
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Carica Foto</label>
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

export default EmployeeFormNew;