import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, MapPin, Building, Calendar, Briefcase, FileText } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import EntityFormLayout from '../shared/form/EntityFormLayout';
import EntityFormField from '../shared/form/EntityFormField';
import EntityFormGrid, { EntityFormSection, EntityFormFullWidthField } from '../shared/form/EntityFormGrid';
import { apiPost, apiPut, apiUpload } from '../../services/api';
import { Company } from '../../types';

interface EmployeeFormNewProps {
  /** Dati del dipendente in caso di modifica */
  employee?: {
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
}

const TAX_CODE_REGEX = /^[a-zA-Z]{6}[0-9]{2}[abcdehlmprstABCDEHLMPRST]{1}[0-9]{2}([a-zA-Z]{1}[0-9]{3})[a-zA-Z]{1}$/;

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
 * Form moderno ed elegante per la creazione e modifica di un dipendente
 */
const EmployeeFormNew: React.FC<EmployeeFormNewProps> = ({
  employee,
  companies,
  onSuccess,
  onClose,
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
    status: 'Active',
    hiredDate: '',
    photoUrl: '',
  });
  
  // Stato per gli errori
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Stato per il salvataggio
  const [isSaving, setIsSaving] = useState(false);
  
  // Stato per errori generali
  const [generalError, setGeneralError] = useState('');
  
  // Hook per le notifiche toast
  const { showToast } = useToast();
  
  // Using a ref to track if we've already initialized the form
  const initializedRef = useRef(false);
  
  // Inizializza i dati del form se stiamo modificando un dipendente esistente
  useEffect(() => {
    // Only initialize data if we have employee data AND we haven't initialized yet
    if (employee && !initializedRef.current) {
      console.log("Setting employee data:", employee);
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        codiceFiscale: employee.codiceFiscale || '',
        birthDate: employee.birthDate ? employee.birthDate.substring(0, 10) : '', // Ensure date format is YYYY-MM-DD
        residenceAddress: employee.residenceAddress || '',
        residenceCity: employee.residenceCity || '',
        province: employee.province || '',
        postalCode: employee.postalCode || '',
        companyId: employee.companyId || '',
        title: employee.title || '',
        email: employee.email || '',
        phone: employee.phone || '',
        notes: employee.notes || '',
        status: employee.status || 'Active',
        hiredDate: employee.hiredDate ? employee.hiredDate.substring(0, 10) : '', // Ensure date format is YYYY-MM-DD
        photoUrl: employee.photoUrl || '',
      });
      initializedRef.current = true;
    }
  }, [employee]);
  
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
    console.log(`Field changed: ${name} = ${value}`); // Add logging for debugging
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
    } else if (!TAX_CODE_REGEX.test(formData.codiceFiscale)) {
      newErrors.codiceFiscale = 'Formato Codice Fiscale non valido';
    }
    
    if (!formData.companyId) {
      newErrors.companyId = 'L\'Azienda è obbligatoria';
    }
    
    // Validazione email
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato email non valido';
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
    console.log("Form data being submitted:", formData);
    
    try {
      // Prepara i dati da inviare
      const payload = {
        ...formData,
        birthDate: formatDateForPrisma(formData.birthDate),
        hiredDate: formatDateForPrisma(formData.hiredDate),
      };
      
      console.log("Payload being sent to API:", payload);
      
      // Determina l'URL e il metodo in base a se stiamo creando o modificando
      const endpoint = employee
        ? `/api/v1/persons/${employee.id}`
        : '/api/v1/persons';
      const method = employee ? 'PUT' : 'POST';
      
      // Invia la richiesta usando il servizio API centralizzato
      if (employee) {
        await apiPut(`/api/v1/persons/${employee.id}`, payload);
      } else {
        await apiPost('/api/v1/persons', payload);
      }
      
      // Mostra notifica di successo
      showToast({ 
        message: employee ? 'Dipendente aggiornato con successo' : 'Dipendente creato con successo', 
        type: 'success' 
      });
      
      // Chiama il callback di successo
      onSuccess();
    } catch (error) {
      console.error('Error saving employee:', error);
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
  
  // Gestisce la rimozione della foto
  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photoUrl: '' }));
  };
  
  return (
    <EntityFormLayout
      title={employee ? 'Modifica Dipendente' : 'Nuovo Dipendente'}
      subtitle={employee ? `Modifica i dati di ${formData.firstName} ${formData.lastName}` : 'Inserisci i dati del nuovo dipendente'}
      onSubmit={handleSubmit}
      onClose={onClose}
      isSaving={isSaving}
      error={generalError}
      submitLabel={employee ? 'Aggiorna' : 'Crea'}
    >
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-3/4">
          <EntityFormSection title="Dati Anagrafici" description="Informazioni personali del dipendente">
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
            error={errors.codiceFiscale}
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
      
      <EntityFormSection title="Residenza" description="Indirizzo di residenza del dipendente">
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
      
          <EntityFormSection title="Lavoro" description="Informazioni lavorative del dipendente">
        <EntityFormGrid columns={2}>
          <EntityFormField
            name="companyId"
            label="Azienda"
            type="select"
            value={formData.companyId}
            onChange={handleChange}
            required
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
              { value: 'Active', label: 'Attivo' },
              { value: 'Inactive', label: 'Inattivo' },
                  { value: 'OnLeave', label: 'In Aspettativa' },
                  { value: 'Terminated', label: 'Cessato' }
            ]}
          />
        </EntityFormGrid>
      </EntityFormSection>
      
          <EntityFormSection title="Contatti" description="Informazioni di contatto del dipendente">
        <EntityFormGrid columns={2}>
          <EntityFormField
            name="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            leftIcon={<Mail size={18} />}
            error={errors.email}
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
          <EntityFormSection title="Foto" description="Foto del dipendente">
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
  );
};

export default EmployeeFormNew;