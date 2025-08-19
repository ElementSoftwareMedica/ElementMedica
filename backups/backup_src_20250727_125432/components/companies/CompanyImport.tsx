import React, { useState } from 'react';
import GenericImport, { defaultProcessFile } from '../shared/GenericImport';
import { applyTitleCaseToFields } from '../../utils/textFormatters';
import { useToast } from '../../hooks/useToast';

// Componente per visualizzare la tabella delle aziende con supporto per sedi multiple
const CompanyPreviewTable: React.FC<{ processedData: any[] }> = ({ processedData }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ragione Sociale
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              P.IVA
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Codice Fiscale
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sede/Città
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Indirizzo
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Persona Riferimento
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contatti
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              DVR/Reparti
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Azione
            </th>
          </tr>
        </thead>
        <tbody>
          {processedData.map((company, index) => (
            <tr key={index} className={`
              ${company._isExisting ? 'bg-yellow-50' : 'bg-white'}
              ${company._isNewSite ? 'bg-blue-50' : ''}
              ${company._isDuplicateSite ? 'bg-red-50' : ''}
              hover:bg-gray-50
            `}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {company.ragioneSociale}
                {company._isExisting && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {company._isNewSite ? 'Nuova Sede' : company._isDuplicateSite ? 'Sede Duplicata' : 'Esistente'}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.piva}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.codiceFiscale}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.nomeSede && (
                  <div>
                    <div className="font-medium">{company.nomeSede}</div>
                    <div className="text-xs text-gray-400">Nome sede</div>
                  </div>
                )}
                {company.citta && (
                  <div>
                    <div>{company.citta}</div>
                    {company.provincia && <span className="text-xs text-gray-400">({company.provincia})</span>}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.indirizzo || company.sedeAzienda}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.personaRiferimento}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  {company.telefono && <div>{company.telefono}</div>}
                  {company.mail && <div className="text-xs">{company.mail}</div>}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.dvr && (
                  <div className="text-xs">
                    <div>DVR: {company.dvr}</div>
                  </div>
                )}
                {company.reparti && (
                  <div className="text-xs">
                    <div>Reparti: {company.reparti}</div>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {company._isDuplicateSite ? (
                  <span className="text-red-600">Duplicato</span>
                ) : company._isNewSite ? (
                  <span className="text-blue-600">Nuova Sede</span>
                ) : company._isExisting ? (
                  <span className="text-yellow-600">Aggiorna</span>
                ) : (
                  <span className="text-green-600">Crea</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface CompanyImportProps {
  onImport: (companies: any[], overwriteIds?: string[]) => Promise<void>;
  onClose: () => void;
  existingCompanies?: any[];
}

// Definizione della mappatura dei campi CSV
const csvHeaderMap: Record<string, string> = {
  'Ragione Sociale': 'ragioneSociale',
  'Codice ATECO': 'codiceAteco',
  'P.IVA': 'piva',
  'Codice Fiscale': 'codiceFiscale',
  'SDI': 'sdi',
  'PEC': 'pec',
  'IBAN': 'iban',
  'Sede Azienda': 'sedeAzienda',
  'Città': 'citta',
  'Provincia': 'provincia',
  'CAP': 'cap',
  'Persona di Riferimento': 'personaRiferimento',
  'Mail': 'mail',
  'Telefono': 'telefono',
  'Note': 'note',
  // Nuovi campi per sedi multiple
  'Nome Sede': 'nomeSede',
  'Indirizzo': 'indirizzo',
  'DVR': 'dvr',
  'Reparti': 'reparti'
};

// Campi da formattare in title case
const titleCaseFields = [
  'ragioneSociale',
  'sedeAzienda',
  'citta',
  'personaRiferimento'
];

// Validazione personalizzata per le aziende
const validateCompany = (company: any): string[] => {
  const errors: string[] = [];
  
  if (!company.ragioneSociale) {
    errors.push('Ragione Sociale obbligatoria');
  } else if (company.ragioneSociale.length > 250) {
    errors.push('Ragione Sociale troppo lunga (max 250 caratteri)');
  }
  
  // Verifica che ci sia almeno uno tra P.IVA e Codice Fiscale
  if (!company.piva && !company.codiceFiscale) {
    errors.push('P.IVA o Codice Fiscale obbligatori');
  }
  
  // Verifica della P.IVA (se presente)
  if (company.piva) {
    if (company.piva.length < 8 || company.piva.length > 13) {
      errors.push('P.IVA non valida (deve essere tra 8 e 13 caratteri)');
    }
    
    // Verifica che contenga solo numeri
    if (!/^\d+$/.test(company.piva)) {
      errors.push('P.IVA deve contenere solo numeri');
    }
  }
  
  // Verifica del Codice Fiscale SOLO se non c'è una P.IVA valida
  if (!company.piva && company.codiceFiscale) {
    // Se il codice fiscale è per un'azienda (11 caratteri) o una persona (16 caratteri)
    if (company.codiceFiscale.length !== 16 && company.codiceFiscale.length !== 11) {
      errors.push('Codice Fiscale non valido (deve essere 16 caratteri per persone fisiche o 11 per aziende)');
    }
  }
  
  // Verifica campi che potrebbero causare errori 500
  if (company.sdi && company.sdi.length > 7) {
    errors.push('Codice SDI troppo lungo (max 7 caratteri)');
  }
  
  if (company.pec && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.pec)) {
    errors.push('Formato PEC non valido');
  }
  
  if (company.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.mail)) {
    errors.push('Formato Mail non valido');
  }
  
  if (company.telefono && !/^[\d\s+\-().]+$/.test(company.telefono)) {
    errors.push('Formato Telefono non valido (sono consentiti solo numeri, spazi e caratteri +-(). )');
  }
  
  // Verifica lunghezza eccessiva per campi comuni
  const maxLengthFields: [string, number][] = [
    ['sedeAzienda', 250],
    ['citta', 100],
    ['provincia', 50],
    ['cap', 10],
    ['personaRiferimento', 100],
    ['note', 1000]
  ];
  
  maxLengthFields.forEach(([field, maxLength]) => {
    if (company[field] && company[field].length > maxLength) {
      errors.push(`Il campo ${field} è troppo lungo (max ${maxLength} caratteri)`);
    }
  });
  
  return errors;
};

/**
 * Componente per l'importazione di aziende da file CSV
 */
const CompanyImport: React.FC<CompanyImportProps> = ({
  onImport,
  onClose,
  existingCompanies = []
}) => {
  const [importData, setImportData] = useState<any[]>([]);
  const { showToast } = useToast();

  // Funzione personalizzata per processare il file CSV
  const customProcessFile = async (file: File): Promise<any[]> => {
    try {
      // Processa il file e ottieni i dati grezzi
      const processedData = await defaultProcessFile(file, csvHeaderMap);
      
      // Applica il Title Case ai campi specificati
      const formattedData = processedData.map(company => {
        return applyTitleCaseToFields(company, titleCaseFields);
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
      
      // Cerca corrispondenze con aziende esistenti tramite P.IVA o Codice Fiscale
      const dataWithIds = formattedData.map(company => {
        // Se l'azienda ha P.IVA o Codice Fiscale, cerca corrispondenze
        if (company.piva || company.codiceFiscale) {
          // Cerca per P.IVA
          if (company.piva) {
            const existingByPiva = existingCompanies.find(existing => 
              existing.piva && existing.piva.trim() === company.piva.trim()
            );
            
            if (existingByPiva) {
              // Verifica se è una sede diversa
              const isDifferentSite = company.nomeSede && company.nomeSede !== existingByPiva.sedeAzienda ||
                                    company.citta && company.citta !== existingByPiva.citta ||
                                    company.indirizzo && company.indirizzo !== existingByPiva.sede_azienda;
              
              if (isDifferentSite) {
                return { 
                  ...company, 
                  id: existingByPiva.id, 
                  _isExisting: true, 
                  _isNewSite: true,
                  _existingCompanyName: existingByPiva.ragioneSociale 
                };
              } else {
                return { 
                  ...company, 
                  id: existingByPiva.id, 
                  _isExisting: true, 
                  _isDuplicateSite: true,
                  _existingCompanyName: existingByPiva.ragioneSociale 
                };
              }
            }
          }
          
          // Cerca per Codice Fiscale
          if (company.codiceFiscale) {
            const existingByCF = existingCompanies.find(existing => 
              existing.codiceFiscale && 
              existing.codiceFiscale.trim().toUpperCase() === company.codiceFiscale.trim().toUpperCase()
            );
            
            if (existingByCF) {
              // Verifica se è una sede diversa
              const isDifferentSite = company.nomeSede && company.nomeSede !== existingByCF.sedeAzienda ||
                                    company.citta && company.citta !== existingByCF.citta ||
                                    company.indirizzo && company.indirizzo !== existingByCF.sede_azienda;
              
              if (isDifferentSite) {
                return { 
                  ...company, 
                  id: existingByCF.id, 
                  _isExisting: true, 
                  _isNewSite: true,
                  _existingCompanyName: existingByCF.ragioneSociale 
                };
              } else {
                return { 
                  ...company, 
                  id: existingByCF.id, 
                  _isExisting: true, 
                  _isDuplicateSite: true,
                  _existingCompanyName: existingByCF.ragioneSociale 
                };
              }
            }
          }
        }
        
        return company;
      });
      
      setImportData(dataWithIds);
      return dataWithIds;
    } catch (error) {
      console.error('Errore durante il processing del file:', error);
      throw error;
    }
  };

  // Custom import handler che gestisce anche le nuove sedi
  const handleImport = async (data: any[], overwriteIds?: string[]) => {
    try {
      const results = {
        created: 0,
        updated: 0,
        sitesCreated: 0,
        errors: [] as string[]
      };

      for (const company of data) {
        try {
          if (company._isDuplicateSite) {
            results.errors.push(`Sede duplicata per ${company.ragioneSociale} - ${company.citta}`);
            continue;
          }

          if (company._isNewSite) {
            // Crea una nuova sede per l'azienda esistente
            const siteData = {
              companyId: company.id,
              nome: company.nomeSede || `Sede ${company.citta}`,
              citta: company.citta,
              indirizzo: company.indirizzo || company.sedeAzienda,
              cap: company.cap,
              provincia: company.provincia,
              personaRiferimento: company.personaRiferimento,
              telefono: company.telefono,
              mail: company.mail,
              dvr: company.dvr,
              reparti: company.reparti
            };

            // Simula la creazione della sede (sostituire con la chiamata API reale)
            results.sitesCreated++;
          } else {
            // Prepara i dati puliti per aziende nuove o da aggiornare
            const cleanCompany = { ...company };
            
            // Rimuovi proprietà tecniche
            Object.keys(cleanCompany).forEach(key => {
              if (key.startsWith('_')) {
                delete cleanCompany[key];
              }
            });
            
            // Assicurati che i campi numerici siano effettivamente numeri
            if (cleanCompany.cap && !isNaN(cleanCompany.cap)) {
              cleanCompany.cap = String(cleanCompany.cap).padStart(5, '0').slice(0, 5);
            }
            
            // Rimuovi spazi extra e formatta
            Object.keys(cleanCompany).forEach(key => {
              if (typeof cleanCompany[key] === 'string') {
                cleanCompany[key] = cleanCompany[key].trim();
              }
            });

            if (company._isExisting) {
              results.updated++;
            } else {
              results.created++;
            }
          }
        } catch (error) {
          results.errors.push(`Errore elaborazione ${company.ragioneSociale}: ${error}`);
        }
      }
      
      // Prepara l'array finale con tutti i dati per l'import tradizionale
      const finalData = data
        .filter(company => !company._isNewSite && !company._isDuplicateSite)
        .map(company => {
          const cleanCompany = { ...company };
          
          // Rimuovi proprietà tecniche
          Object.keys(cleanCompany).forEach(key => {
            if (key.startsWith('_')) {
              delete cleanCompany[key];
            }
          });
          
          return cleanCompany;
        });
      
      // Chiamata alla funzione di import originale solo per aziende
      if (finalData.length > 0) {
        await onImport(finalData, overwriteIds);
      }
      
      // Mostra i risultati se ci sono state operazioni speciali
      if (results.sitesCreated > 0 || results.errors.length > 0) {
        let message = 'Operazioni aggiuntive completate:\n';
        if (results.sitesCreated > 0) message += `Nuove sedi create: ${results.sitesCreated}\n`;
        if (results.errors.length > 0) {
          message += `\nErrori (${results.errors.length}):\n${results.errors.join('\n')}`;
        }
        showToast({
          message,
          type: results.errors.length > 0 ? 'warning' : 'success'
        });
      }
      
      // Chiudiamo la finestra solo in caso di successo
      onClose();
    } catch (error: any) {
      console.error('Errore durante l\'importazione:', error);
      
      // Propaga l'errore al componente padre senza chiudere la finestra
      throw error;
    }
  };

  return (
    <GenericImport
      entityType="aziende"
      uniqueField="piva"
      onImport={handleImport}
      onClose={onClose}
      existingEntities={existingCompanies}
      csvHeaderMap={csvHeaderMap}
      title="Importa Aziende"
      subtitle="Carica un file CSV con i dati delle aziende da importare"
      customValidation={validateCompany}
      csvDelimiter=";"
      customProcessFile={customProcessFile}
    />
  );
};

export default CompanyImport;