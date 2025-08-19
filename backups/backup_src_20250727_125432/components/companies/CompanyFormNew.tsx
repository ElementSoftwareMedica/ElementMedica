import React, { useState, useEffect, useRef } from 'react';
import { Building2, Mail, Phone, Map, Hash, FileText, CreditCard, User } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { apiPost, apiPut } from '../../services/api';
import { getSavingErrorMessage } from '../../utils/errorUtils';

import EntityFormLayout from '../shared/form/EntityFormLayout';
import EntityFormField from '../shared/form/EntityFormField';
import EntityFormGrid, { EntityFormSection, EntityFormFullWidthField } from '../shared/form/EntityFormGrid';

interface CompanyFormNewProps {
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
    sedeAzienda?: string;
    citta?: string;
    provincia?: string;
    cap?: string;
    personaRiferimento?: string;
    mail?: string;
    telefono?: string;
    note?: string;
  };
  /** Callback chiamata al completamento del salvataggio */
  onSuccess: () => void;
  /** Callback chiamata alla chiusura del form */
  onClose: () => void;
}

/**
 * Form moderno ed elegante per la creazione e modifica di un'azienda
 */
const CompanyFormNew: React.FC<CompanyFormNewProps> = ({
  company,
  onSuccess,
  onClose,
}) => {
  // Stato per i dati del form
  const [formData, setFormData] = useState({
    ragioneSociale: '',
    codiceAteco: '',
    piva: '',
    codiceFiscale: '',
    sdi: '',
    pec: '',
    iban: '',
    sedeAzienda: '',
    citta: '',
    provincia: '',
    cap: '',
    personaRiferimento: '',
    mail: '',
    telefono: '',
    note: '',
  });
  
  // Stato per gli errori
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Stato per il salvataggio
  const [isSaving, setIsSaving] = useState(false);
  
  // Stato per errori generali
  const [generalError, setGeneralError] = useState('');
  
  // Hook per le notifiche toast
  const { showToast } = useToast();
  
  // Inizializza i dati del form se stiamo modificando un'azienda esistente
  // Using a ref to track if we've already initialized the form
  const initializedRef = useRef(false);
  
  useEffect(() => {
    // Only initialize data if we have company data AND we haven't initialized yet
    if (company && !initializedRef.current) {
      console.log("Setting company data:", company);
      setFormData({
        ragioneSociale: company.ragioneSociale || '',
        codiceAteco: company.codiceAteco || '',
        piva: company.piva || '',
        codiceFiscale: company.codiceFiscale || '',
        sdi: company.sdi || '',
        pec: company.pec || '',
        iban: company.iban || '',
        sedeAzienda: company.sedeAzienda || '',
        citta: company.citta || '',
        provincia: company.provincia || '',
        cap: company.cap || '',
        personaRiferimento: company.personaRiferimento || '',
        mail: company.mail || '',
        telefono: company.telefono || '',
        note: company.note || '',
      });
      initializedRef.current = true;
    }
  }, [company]);
  
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
    
    // Validazione sede aziendale
    if (!formData.sedeAzienda.trim()) {
      newErrors.sedeAzienda = 'La Sede Aziendale è obbligatoria';
    }
    
    // Validazione persona di riferimento
    if (!formData.personaRiferimento.trim()) {
      newErrors.personaRiferimento = 'La Persona di Riferimento è obbligatoria';
    }
    
    // Validazione email
    if (formData.mail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.mail)) {
        newErrors.mail = 'Formato email non valido';
      }
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
      };
      
      console.log("Payload being sent to API:", payload);
      
      // Invia la richiesta usando il servizio API centralizzato
      if (company) {
        // Modifica azienda esistente
        await apiPut(`/api/companies/${company.id}`, payload);
      } else {
        // Crea nuova azienda
        await apiPost('/api/companies', payload);
      }
      
      // Mostra notifica di successo
      showToast({
        message: company ? 'Azienda aggiornata con successo' : 'Azienda creata con successo',
        type: 'success'
      });
      
      // Chiama il callback di successo
      onSuccess();
    } catch (error) {
      console.error('Error saving company:', error);
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
            error={errors.piva}
            icon={<FileText className="h-5 w-5 text-gray-400" />}
          />
          
          <EntityFormField
            label="Codice Fiscale"
            name="codiceFiscale"
            value={formData.codiceFiscale}
            onChange={handleChange}
            error={errors.codiceFiscale}
            icon={<FileText className="h-5 w-5 text-gray-400" />}
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
        </EntityFormGrid>
      </EntityFormSection>
      
      <EntityFormSection title="Sede e Contatti" description="Informazioni sulla sede e i contatti dell'azienda">
        <EntityFormGrid>
          <EntityFormField
            label="Sede Aziendale"
            name="sedeAzienda"
            value={formData.sedeAzienda}
            onChange={handleChange}
            error={errors.sedeAzienda}
            required
            icon={<Building2 className="h-5 w-5 text-gray-400" />}
          />
          
          <EntityFormField
            label="Città"
            name="citta"
            value={formData.citta}
            onChange={handleChange}
            error={errors.citta}
            icon={<Map className="h-5 w-5 text-gray-400" />}
          />
          
          <EntityFormField
            label="Provincia"
            name="provincia"
            value={formData.provincia}
            onChange={handleChange}
            error={errors.provincia}
            icon={<Map className="h-5 w-5 text-gray-400" />}
          />
          
          <EntityFormField
            label="CAP"
            name="cap"
            value={formData.cap}
            onChange={handleChange}
            error={errors.cap}
            icon={<Hash className="h-5 w-5 text-gray-400" />}
          />
          
          <EntityFormField
            label="Persona di Riferimento"
            name="personaRiferimento"
            value={formData.personaRiferimento}
            onChange={handleChange}
            error={errors.personaRiferimento}
            required
            icon={<User className="h-5 w-5 text-gray-400" />}
          />
          
          <EntityFormField
            label="Email"
            name="mail"
            value={formData.mail}
            onChange={handleChange}
            error={errors.mail}
            icon={<Mail className="h-5 w-5 text-gray-400" />}
          />
          
          <EntityFormField
            label="Telefono"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            error={errors.telefono}
            icon={<Phone className="h-5 w-5 text-gray-400" />}
          />
        </EntityFormGrid>
      </EntityFormSection>
      
      <EntityFormSection title="Note Aggiuntive" description="Informazioni aggiuntive sull'azienda">
        <EntityFormFullWidthField>
          <EntityFormField 
            label="Note"
            name="note"
            value={formData.note}
            onChange={handleChange}
            error={errors.note}
            multiline
            rows={4}
          />
        </EntityFormFullWidthField>
      </EntityFormSection>
    </EntityFormLayout>
  );
};

export default CompanyFormNew;