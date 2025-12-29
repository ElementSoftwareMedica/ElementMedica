import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Building2,
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
  Loader2
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { getSavingErrorMessage } from '../../utils/errorUtils';
import { apiPost, apiPut, apiGet, apiDelete } from '../../services/api';

import EntityFormLayout from '../shared/form/EntityFormLayout';
import EntityFormField from '../shared/form/EntityFormField';
import EntityFormGrid, { EntityFormSection, EntityFormFullWidthField } from '../shared/form/EntityFormGrid';

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
      console.error('Error fetching company sites:', error);
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
        await apiPut(`/api/v1/companies/${company.id}`, payload);

        // Gestione sedi in modalità edit
        const activeSites = sites.filter(s => !s.isDeleted);
        const deletedSites = sites.filter(s => s.isDeleted && s.isExisting);
        const newSites = activeSites.filter(s => !s.isExisting);
        const updatedSites = activeSites.filter(s => s.isExisting);

        let sitesModified = 0;

        // Elimina le sedi marcate per eliminazione
        for (const site of deletedSites) {
          try {
            await apiDelete(`/api/v1/company-sites/${site.id}`);
            sitesModified++;
          } catch (siteError) {
            console.error('Error deleting site:', site.siteName, siteError);
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
            });
            sitesModified++;
          } catch (siteError) {
            console.error('Error updating site:', site.siteName, siteError);
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
            });
            sitesModified++;
          } catch (siteError) {
            console.error('Error creating site:', site.siteName, siteError);
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
        const response = await apiPost('/api/v1/companies', payload) as { company?: { id: string } };
        const companyId = response.company?.id;

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
              });
              sitesCreated++;
            } catch (siteError) {
              console.error('Error creating site:', site.siteName, siteError);
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