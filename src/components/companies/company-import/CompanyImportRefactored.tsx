import React, { useState } from 'react';
import GenericImport, { defaultProcessFile } from '../../shared/GenericImport';
import { useToast } from '../../../hooks/useToast';
import CompanyImportConflictModal, { CompanyConflict, ConflictResolution } from './CompanyImportConflictModal';
import type { CompanyImportProps, CompanyData } from './types';
import { csvHeaderMap, columnOrder } from './constants';
import { validateCompany, formatCompanyData, detectConflicts, convertToApiFormat } from './utils';

// Normalizzatore per P.IVA: rimuove spazi, prefisso IT ed ogni carattere non numerico
const normalizePiva = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return '';
  let s = String(value).toUpperCase().replace(/\s+/g, '');
  // Rimuovi prefisso paese (es. IT)
  s = s.replace(/^IT/, '');
  // Tieni solo cifre
  s = s.replace(/\D+/g, '');
  return s;
};

/**
 * Componente per l'importazione di aziende da file CSV - Versione Refactorizzata
 */
const CompanyImportRefactored: React.FC<CompanyImportProps> = ({
  onImport,
  onClose,
  existingCompanies = []
}) => {
  const [importData, setImportData] = useState<CompanyData[]>([]);
  const { showToast } = useToast();
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflicts, setConflicts] = useState<CompanyConflict[]>([]);

  // Funzione personalizzata per processare il file CSV
  const customProcessFile = async (file: File): Promise<CompanyData[]> => {
    try {
      console.log('Aziende esistenti ricevute:', existingCompanies?.length || 0, existingCompanies?.[0]);
      
      // Processa il file e ottieni i dati grezzi (delimitatore ; per formato italiano)
      const processedData = await defaultProcessFile(file, csvHeaderMap, ';');
      
      // Applica formattazione e validazione
      const formattedData = processedData.map(company => {
        // Prima mappa i campi alias ai campi originali
        const mappedCompany = { ...company } as CompanyData;
        
        // Mappatura campi alias inglesi ai campi originali
        const aliasMapping: Record<string, string> = {
          companyName: 'ragioneSociale',
          atecoCode: 'codiceAteco',
          vatNumber: 'piva',
          taxCode: 'codiceFiscale',
          email: 'mail',
          phone: 'telefono',
          city: 'citta',
          province: 'provincia',
          zip: 'cap',
          address: 'sedeAzienda',
          contactPerson: 'personaRiferimento',
          notes: 'note',
          active: 'isActive',
          siteName2: 'siteName',
          siteAddress: 'siteIndirizzo',
          siteCity2: 'siteCitta',
          siteProvince2: 'siteProvincia',
          siteZip: 'siteCap',
          siteContact: 'sitePersonaRiferimento',
          sitePhone2: 'siteTelefono',
          siteEmail2: 'siteMail'
        };
        
        // Applica la mappatura degli alias
        Object.entries(aliasMapping).forEach(([alias, original]) => {
          if ((mappedCompany as any)[alias] !== undefined && (mappedCompany as any)[original] === undefined) {
            (mappedCompany as any)[original] = (mappedCompany as any)[alias];
            delete (mappedCompany as any)[alias];
          }
        });
        
        // Se manca "Nome Sede", usa "Città Sede"
        if (!(mappedCompany as any).siteName && (mappedCompany as any).siteCitta) {
          (mappedCompany as any).siteName = (mappedCompany as any).siteCitta;
        }
        
        // Rileva se ci sono campi sede specifici
        const hasSiteSpecificFields = !!(
          (mappedCompany as any).siteName || 
          (mappedCompany as any).siteIndirizzo || 
          (mappedCompany as any).siteCitta || 
          (mappedCompany as any).siteProvincia || 
          (mappedCompany as any).siteCap || 
          (mappedCompany as any).sitePersonaRiferimento || 
          (mappedCompany as any).siteTelefono || 
          (mappedCompany as any).siteMail
        );
        
        if (hasSiteSpecificFields) {
          (mappedCompany as any)._hasSiteData = true;
        }
        
        return formatCompanyData(mappedCompany) as CompanyData;
      });
      
      // Verifica la presenza di dati basilari
      if (formattedData.length === 0) {
        throw new Error('Il file non contiene dati validi');
      }
      
      // Conta quante righe hanno la ragione sociale
      const validRowsCount = formattedData.filter(c => c.ragioneSociale).length;
      if (validRowsCount === 0) {
        throw new Error('Nessuna riga contiene la Ragione Sociale, che è un campo obbligatorio');
      }
      
      // Verifica che almeno il 50% delle righe contenga la ragione sociale
      if (validRowsCount < formattedData.length / 2) {
        showToast({
          message: `Attenzione: solo ${validRowsCount} su ${formattedData.length} righe contengono la Ragione Sociale`,
          type: 'warning'
        });
      }
      
      // Rileva conflitti e duplicati
      const dataWithConflicts = detectConflicts(formattedData, existingCompanies) as CompanyData[];
      
      // Salva i dati processati
      setImportData(dataWithConflicts);
      
      return dataWithConflicts;
    } catch (error) {
      console.error('Errore durante il processamento del file:', error);
      throw error;
    }
  };

  // Gestione dell'importazione
  const handleImport = async (selectedData: CompanyData[], overwriteIds?: string[]) => {
    try {
      // Filtra solo i dati selezionati che non sono duplicati
      const dataToImport = selectedData.filter(company => !(company as any)._isDuplicateSite);
      
      if (dataToImport.length === 0) {
        showToast({
          message: 'Nessuna azienda valida da importare',
          type: 'warning'
        });
        return;
      }

      // Valida tutti i dati prima dell'importazione
      const validationErrors: string[] = [];
      dataToImport.forEach((company, index) => {
        const errors = validateCompany(company as any);
        if (errors.length > 0) {
          validationErrors.push(`Riga ${index + 1}: ${errors.join(', ')}`);
        }
      });

      if (validationErrors.length > 0) {
        showToast({
          message: `Errori di validazione:\n${validationErrors.join('\n')}`,
          type: 'error'
        });
        return;
      }

      // Converti i dati nel formato API
      const apiData = dataToImport.map(convertToApiFormat);
      
      // Chiama la funzione di importazione e usa i conteggi reali
      const res = await onImport(apiData as any, overwriteIds);
      const payload: any = (res as any)?.results ?? res;
      const created = Array.isArray(payload?.created) ? payload.created.length : (typeof payload?.created === 'number' ? payload.created : 0);
      const updated = Array.isArray(payload?.updated) ? payload.updated.length : (typeof payload?.updated === 'number' ? payload.updated : 0);
      const sites = Array.isArray(payload?.sitesCreated) ? payload.sitesCreated.length : (typeof payload?.sitesCreated === 'number' ? payload.sitesCreated : 0);
      const errorsCount = Array.isArray(payload?.errors) ? payload.errors.length : (typeof payload?.errors === 'number' ? payload.errors : 0);
      
      if (created + updated > 0) {
        const sitePart = sites ? `, ${sites} sedi create` : '';
        showToast({
          message: `Import completato: ${created} create, ${updated} aggiornate${sitePart}`,
          type: 'success'
        });
        onClose();
      } else {
        const msg = errorsCount > 0 
          ? `Import terminato senza modifiche. Errori: ${errorsCount}.`
          : 'Import terminato: nessuna azienda creata o aggiornata.';
        showToast({
          message: msg,
          type: errorsCount > 0 ? 'warning' : 'info'
        });
        // Lasciamo il modal aperto per consentire ulteriori azioni
      }
    } catch (error) {
      console.error('Errore durante l\'importazione:', error);
      // Gestione specifica degli errori API: 409 (conflitti) e 400 (bad request)
      const status = (error as any)?.response?.status as number | undefined;
      const apiData = (error as any)?.response?.data;

      if (status === 409) {
        const backendResults = apiData?.results;
        const rawErrors: any[] = Array.isArray(backendResults?.errors) ? backendResults.errors : [];
        const conflictErrors: CompanyConflict[] = rawErrors
          .filter((e: any) => e && e.existingCompany)
          .map((e: any) => ({
            index: e.index ?? 0,
            error: e.error ?? 'Conflitto rilevato',
            data: (e.data || {}) as CompanyData,
            existingCompany: e.existingCompany ? {
              id: String(e.existingCompany.id),
              ragioneSociale: e.existingCompany.ragioneSociale,
              piva: e.existingCompany.piva,
              codiceFiscale: e.existingCompany.codiceFiscale,
              sites: e.existingCompany.sites || []
            } : undefined
          }));
        if (conflictErrors.length > 0) {
          setConflicts(conflictErrors);
          setShowConflictModal(true);
          showToast({
            message: `${conflictErrors.length} conflitti rilevati. Scegli come procedere.`,
            type: 'warning'
          });
          return; // Evita toast di errore generico
        }
      } else if (status === 400) {
        const msg = apiData?.message || 'Richiesta non valida';
        const detailsArr: string[] = Array.isArray(apiData?.results?.errors)
          ? apiData.results.errors.slice(0, 3).map((e: any) => e?.error).filter(Boolean)
          : [];
        const details = detailsArr.length ? ` - Dettagli: ${detailsArr.join(' | ')}` : '';
        showToast({
          message: `Import fallito: ${msg}${details}`,
          type: 'error'
        });
        return; // Evita toast generico
      }

      showToast({
        message: `Errore durante l'importazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        type: 'error'
      });
    }
  };

  // Gestione dei conflitti
  const handleConflictResolution = async (resolutions: ConflictResolution[]) => {
    try {
      // Handle "addAsSite" actions first
      const sitesToCreate = resolutions.filter(r => r.action === 'addAsSite');
      
      if (sitesToCreate.length > 0) {
        for (const resolution of sitesToCreate) {
          if (!resolution.companyId || !resolution.siteData) continue;
          
          try {
            const response = await fetch(`/api/v1/import/companies/${resolution.companyId}/sites`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify(resolution.siteData)
            });
            
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message || 'Errore creazione sede');
            }
            
            const result = await response.json();
            console.log('Site created:', result.site);
          } catch (error) {
            console.error('Error creating site:', error);
            showToast({
              title: 'Errore creazione sede',
              description: error instanceof Error ? error.message : 'Errore sconosciuto',
              type: 'error'
            });
          }
        }
      }
      
      // Handle "overwrite" actions
      const overwriteIds = resolutions
        .filter(r => r.action === 'overwrite' && r.companyId)
        .map(r => r.companyId as string);
      
      setShowConflictModal(false);
      
      if (overwriteIds.length > 0) {
        handleImport(importData, overwriteIds);
      } else if (sitesToCreate.length > 0) {
        // Just close and refresh if only sites were created
        showToast({
          title: 'Operazione completata',
          description: `${sitesToCreate.length} sedi create con successo`,
          type: 'success'
        });
        onClose();
      }
    } catch (error) {
      console.error('Error in conflict resolution:', error);
      showToast({
        title: 'Errore',
        description: 'Errore durante la risoluzione dei conflitti',
        type: 'error'
      });
    }
  };

  return (
    <>
      <GenericImport
        entityType="aziende"
        uniqueField="piva"
        title="Importa Aziende"
        subtitle="Carica un file CSV con i dati delle aziende da importare"
        columnOrder={columnOrder}
        csvHeaderMap={csvHeaderMap}
        customProcessFile={customProcessFile}
        onImport={handleImport}
        onClose={onClose}
        customValidation={validateCompany as any}
        initialPreviewData={importData}
        existingEntities={existingCompanies as any}
        // Normalizzazione specifica per P.IVA per confronti coerenti (IT, punti, spazi)
        normalizeKey={normalizePiva}
      />
      
      <CompanyImportConflictModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        conflicts={conflicts}
        onResolve={handleConflictResolution}
      />
    </>
  );
};

export default CompanyImportRefactored;