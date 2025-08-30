import React, { useState } from 'react';
import GenericImport, { defaultProcessFile } from '../../shared/GenericImport';
import { useToast } from '../../../hooks/useToast';
import CompanyImportConflictModal from './CompanyImportConflictModal';
import { CompanyImportProps, CompanyData } from './types';
import { csvHeaderMap, columnOrder } from './constants';
import { validateCompany, formatCompanyData, detectConflicts, convertToApiFormat } from './utils';

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

  // Funzione personalizzata per processare il file CSV
  const customProcessFile = async (file: File): Promise<CompanyData[]> => {
    try {
      console.log('Aziende esistenti ricevute:', existingCompanies?.length || 0, existingCompanies?.[0]);
      
      // Processa il file e ottieni i dati grezzi
      const processedData = await defaultProcessFile(file, csvHeaderMap);
      
      // Applica formattazione e validazione
      const formattedData = processedData.map(company => {
        // Prima mappa i campi alias ai campi originali
        const mappedCompany = { ...company };
        
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
          if (mappedCompany[alias] !== undefined && mappedCompany[original] === undefined) {
            mappedCompany[original] = mappedCompany[alias];
            delete mappedCompany[alias];
          }
        });
        
        // Se manca "Nome Sede", usa "Città Sede"
        if (!mappedCompany.siteName && mappedCompany.siteCitta) {
          mappedCompany.siteName = mappedCompany.siteCitta;
        }
        
        // Rileva se ci sono campi sede specifici
        const hasSiteSpecificFields = !!(
          mappedCompany.siteName || 
          mappedCompany.siteIndirizzo || 
          mappedCompany.siteCitta || 
          mappedCompany.siteProvincia || 
          mappedCompany.siteCap || 
          mappedCompany.sitePersonaRiferimento || 
          mappedCompany.siteTelefono || 
          mappedCompany.siteMail
        );
        
        if (hasSiteSpecificFields) {
          mappedCompany._hasSiteData = true;
        }
        
        return formatCompanyData(mappedCompany);
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
      const dataWithConflicts = detectConflicts(formattedData, existingCompanies);
      
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
      const dataToImport = selectedData.filter(company => !company._isDuplicateSite);
      
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
        const errors = validateCompany(company);
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
      
      // Chiama la funzione di importazione
      await onImport(apiData, overwriteIds);
      
      showToast({
        message: `${dataToImport.length} aziende importate con successo`,
        type: 'success'
      });
      
      onClose();
    } catch (error) {
      console.error('Errore durante l\'importazione:', error);
      showToast({
        message: `Errore durante l'importazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        type: 'error'
      });
    }
  };

  // Gestione dei conflitti
  const handleConflictResolution = (resolutions: Array<{ action: string; companyId?: string }>) => {
    const overwriteIds = resolutions
      .filter(r => r.action === 'overwrite' && r.companyId)
      .map(r => r.companyId as string);
    
    setShowConflictModal(false);
    handleImport(importData, overwriteIds);
  };

  return (
    <>
      <GenericImport
        entityType="aziende"
        uniqueField="piva"
        title="Importa Aziende"
        subtitle="Carica un file CSV con i dati delle aziende da importare"
        columnOrder={columnOrder}
        customProcessFile={customProcessFile}
        onImport={handleImport}
        onClose={onClose}
        customValidation={validateCompany}
        initialPreviewData={importData}
        existingEntities={existingCompanies}
      />
      
      <CompanyImportConflictModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        conflicts={[]}
        onResolve={handleConflictResolution}
      />
    </>
  );
};

export default CompanyImportRefactored;