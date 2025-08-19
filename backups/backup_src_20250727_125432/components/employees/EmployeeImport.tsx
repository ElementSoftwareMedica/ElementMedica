import React, { useState, useEffect, useCallback } from 'react';
import GenericImport, { defaultProcessFile } from '../shared/GenericImport';
import { applyTitleCaseToFields } from '../../utils/textFormatters';

interface EmployeeImportProps {
  onImport: (employees: any[], overwriteIds?: string[]) => Promise<void>;
  onClose: () => void;
  existingEmployees?: any[];
  existingCompanies?: any[];
}

// Funzione per convertire una stringa in Title Case (prima lettera in maiuscolo)
const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Definizione della mappatura dei campi CSV
const csvHeaderMap: Record<string, string> = {
  'Cognome': 'cognome',
  'Nome': 'nome',
  'Codice Fiscale': 'codice_fiscale',
  'Azienda': 'company_name',
  'Profilo Professionale': 'mansione',
  'Email': 'email',
  'Telefono': 'telefono',
  'Indirizzo': 'indirizzo',
  'Citta': 'citta',
  'Provincia': 'provincia',
  'CAP': 'cap',
  'Data Nascita': 'data_nascita',
  'Luogo Nascita': 'luogo_nascita',
  'Dipartimento ID': 'department_id',
  'Note': 'note',
};

// Campi da formattare in title case
const titleCaseFields = [
  'nome',
  'cognome',
  'mansione',
  'indirizzo',
  'citta',
  'provincia',
  'luogo_nascita'
];

// Definizione della mappatura dei campi per l'invio all'API
const apiFieldMap: Record<string, string> = {
  'nome': 'firstName',
  'cognome': 'lastName',
  'codice_fiscale': 'codiceFiscale',
  'company_name': 'companyId', // Questo verrà sostituito con l'id dell'azienda trovata
  'mansione': 'title',
  'email': 'email',
  'telefono': 'phone',
  'indirizzo': 'address',
  'citta': 'city',
  'provincia': 'province',
  'cap': 'postalCode',
  'data_nascita': 'birthDate',
  'luogo_nascita': 'birthPlace',
  'department_id': 'departmentId',
  'note': 'notes',
};

// Componente select con search integrata
interface SelectOption {
  value: string;
  label: string;
}

// Funzione per estrarre la data di nascita dal codice fiscale italiano
const extractBirthDateFromCodiceFiscale = (cf: string): string | null => {
  if (!cf || cf.length !== 16) return null;
  
  try {
    // Utilizziamo la regex fornita per estrarre le informazioni
    const match = cf.toUpperCase().match(/^.{6}(\d{2})([A-EHLMPRST])([0-7]\d).*$/);
    if (!match) return null;
    
    const [, yearPart, monthLetter, dayPart] = match;
    
    // Converti il mese da lettera a numero (A=1, B=2, ..., T=12)
    const monthMap: {[key: string]: number} = {
      'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'H': 6,
      'L': 7, 'M': 8, 'P': 9, 'R': 10, 'S': 11, 'T': 12
    };
    
    const month = monthMap[monthLetter] || 0;
    if (!month) return null;
    
    // Determina il secolo (1900 o 2000)
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    const previousCentury = currentCentury - 100;
    
    let year = parseInt(yearPart);
    // Se l'anno è superiore all'anno corrente, è del secolo precedente
    year = (year + currentCentury) > currentYear ? year + previousCentury : year + currentCentury;
    
    // Estrai il giorno, tenendo conto che per le donne si aggiunge 40
    let day = parseInt(dayPart);
    if (day > 40) {
      day -= 40; // Sottrai 40 per ottenere il giorno reale per le donne
    }
    
    // Verifica che la data sia valida
    if (day < 1 || day > 31 || month < 1 || month > 12) {
      console.warn(`Data non valida estratta dal codice fiscale: ${day}/${month}/${year}`);
      return null;
    }
    
    // Formatta la data in formato ISO (YYYY-MM-DD)
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error("Errore nell'estrazione della data di nascita dal codice fiscale:", error);
    return null;
  }
};

// Funzione per verificare se due date sono uguali indipendentemente dal formato
const areDatesEqual = (date1: string, date2: string): boolean => {
  if (!date1 || !date2) return false;
  
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  } catch (error) {
    return false;
  }
};

const SearchableSelect: React.FC<{
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({
  options,
  value,
  onChange,
  placeholder = "Seleziona...",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filtra le opzioni in base al termine di ricerca
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Ottiene l'etichetta corrente
  const selectedOption = options.find(option => option.value === value);
  
  return (
    <div className={`relative ${className}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center px-3 py-2 text-sm border border-gray-300 rounded-full bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {!isOpen ? (
          <>
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </>
        ) : (
          <input
            type="text"
            placeholder="Cerca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full outline-none bg-transparent"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsOpen(false);
                setSearchTerm("");
              }
            }}
          />
        )}
      </div>
      
      {isOpen && (
        <div className="absolute z-[999] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-100 ${
                    value === option.value ? "bg-blue-50 text-blue-700" : ""
                  }`}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">Nessun risultato</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Verifica se una data è in formato valido (YYYY-MM-DD)
const isValidDate = (dateStr: string): boolean => {
  if (!dateStr) return true; // Consideriamo valide le date vuote
  
  // Verifica il formato ISO 8601 (YYYY-MM-DD)
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(dateStr)) return false;
  
  // Verifica se la data è valida
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

// Formatta una data nel formato ISO (YYYY-MM-DD)
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // Se la data è già in formato YYYY-MM-DD, restituiscila così com'è
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // Gestisce il formato DD/MM/YYYY o D/M/YYYY
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    // Se il primo elemento è l'anno (maggiore di 1000)
    if (parseInt(parts[0]) > 1000) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    // Altrimenti presumiamo sia nel formato DD/MM/YYYY
    else {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  
  // In caso di formato non riconosciuto, restituisci stringa vuota
  return '';
};

// Validazione personalizzata per i dipendenti
const validateEmployee = (employee: any, existingCompanies: any[] = []): string[] => {
    const errors: string[] = [];
    
    if (!employee.nome) {
      errors.push('Nome obbligatorio');
    }
    
    if (!employee.cognome) {
      errors.push('Cognome obbligatorio');
    }
    
    if (!employee.codice_fiscale) {
      errors.push('Codice Fiscale obbligatorio');
    } else if (employee.codice_fiscale.length !== 16) {
      errors.push('Codice Fiscale deve essere di 16 caratteri');
    }
  
    if (employee.data_nascita && !isValidDate(employee.data_nascita)) {
      errors.push(`La data di nascita "${employee.data_nascita}" non è valida. Usa il formato YYYY-MM-DD`);
    }
  
    if (employee.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
      errors.push('Il formato dell\'email non è valido');
    }
    
    // Rimuoviamo la validazione dell'azienda qui, la sposteremo nel momento dell'importazione
    // per consentire la selezione dell'azienda dal dropdown
    
    return errors;
};

/**
 * Componente per l'importazione di dipendenti da file CSV
 * con la verifica dell'esistenza dell'azienda associata
 */
const EmployeeImport: React.FC<EmployeeImportProps> = ({
  onImport,
  onClose,
  existingEmployees = [],
  existingCompanies = []
}) => {
  // Stato per i dati processati
  const [importData, setImportData] = useState<any[]>([]);
  // Stato per il file caricato
  const [file, setFile] = useState<File | null>(null);
  // Stato per l'azienda selezionata nel dropdown
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  // Stato per le righe selezionate (checkbox) 
  const [selectedOverwrites, setSelectedOverwrites] = useState<string[]>([]);

  // Opzioni di aziende per il dropdown
  const companyOptions = existingCompanies?.map(company => ({
    id: company.id,
    name: company.name || company.ragioneSociale
  })) || [];
  
  // Gestisce il cambio di azienda per i dipendenti selezionati
  const handleCompanyChange = (selectedIds: string[], companyId: string) => {
    console.log(`Cambiando azienda per ${selectedIds.length} dipendenti a: ${companyId}`);
      
      // Trova l'azienda selezionata
    const selectedCompany = existingCompanies?.find(company => company.id === companyId);
    if (!selectedCompany) return;
    
    const companyName = selectedCompany.name || selectedCompany.ragioneSociale;
    
    // Aggiorna i dati di importazione
    setImportData(prevData => {
      const updatedData = prevData.map(employee => {
        // Se questo dipendente è stato selezionato, aggiorna la sua azienda
        if (employee.id && selectedIds.includes(employee.id)) {
          return {
            ...employee,
            company_name: companyName,
        companyId: companyId,
            _assignedCompany: true // Marchiamo questo dipendente come avente un'azienda assegnata manualmente
          };
        }
        return employee;
      });
      
      return updatedData;
    });

    setSelectedCompanyId(companyId);
  };

  // Ottieni il nome dell'azienda dall'ID o dal nome
  const getCompanyName = (companyIdentifier: string): { name: string, id: string | null } => {
    // Prima controlla se è un ID valido di un'azienda esistente
    const companyById = existingCompanies?.find(c => c.id === companyIdentifier);
    if (companyById) {
      return { name: companyById.name || companyById.ragioneSociale, id: companyById.id };
    }
    
    // Poi controlla se corrisponde al nome di un'azienda esistente
    const companyByName = existingCompanies?.find(
      c => (c.name || c.ragioneSociale)?.toLowerCase() === companyIdentifier?.toLowerCase()
    );
    if (companyByName) {
      return { name: companyByName.name || companyByName.ragioneSociale, id: companyByName.id };
    }
    
    // Se non trova corrispondenze, restituisce il nome originale e nessun ID
    return { name: companyIdentifier, id: null };
  };

  // Funzione personalizzata per processare il file CSV
  const customProcessFile = async (inputFile: File): Promise<any[]> => {
    // Salva il file per riferimenti futuri
    setFile(inputFile);
    
    try {
      // Processa il file e ottieni i dati grezzi
      const processedData = await defaultProcessFile(inputFile, csvHeaderMap);
      
      // Applica il Title Case ai campi specificati e risolve i nomi azienda
      const formattedData = processedData.map(employee => {
        const formattedEmployee = applyTitleCaseToFields(employee, titleCaseFields);
        
        // Aggiungi informazioni sull'azienda
        if (formattedEmployee.company_name) {
          const companyInfo = getCompanyName(formattedEmployee.company_name);
          // Se trovata un'azienda esistente, aggiungi l'ID per riferimento futuro
          if (companyInfo.id) {
            formattedEmployee.companyId = companyInfo.id;
            formattedEmployee.company_name = companyInfo.name;
          }
        }
        
        return formattedEmployee;
      });
      
      // Cerca corrispondenze con dipendenti esistenti tramite il codice fiscale (uniqueField)
      const dataWithIds = formattedData.map(employee => {
        if (!employee.codice_fiscale) return employee;
        
        const normalizedCF = employee.codice_fiscale.trim().toUpperCase();
        const existing = existingEmployees.find(e => 
          e.codiceFiscale && e.codiceFiscale.trim().toUpperCase() === normalizedCF
        );
        
        if (existing) {
          // Gestione della data di nascita se manca nel CSV
          if (!employee.data_nascita && existing.birthDate) {
            employee.data_nascita = formatDate(existing.birthDate);
          }
          
          // Gestione dell'azienda
          if (existing.companyId && !employee.companyId) {
            const companyInfo = getCompanyName(existing.companyId);
            employee.company_name = companyInfo.name;
            employee.companyId = existing.companyId;
          }
          
          return { 
            ...employee, 
            id: existing.id,
            _isExisting: true,
            
            // Aggiungiamo altre proprietà dall'esistente se mancano nel CSV
            mansione: employee.mansione || existing.title,
            email: employee.email || existing.email,
            telefono: employee.telefono || existing.phone,
            department_id: employee.department_id || existing.departmentId,
          };
        }
        
        return employee;
      });
      
      // Attiva data di nascita dal Codice Fiscale se disponibile
      const finalData = dataWithIds.map(employee => {
        // Se manca la data di nascita ma c'è il CF, proviamo a estrarla
        if (!employee.data_nascita && employee.codice_fiscale) {
          const birthDateFromCF = extractBirthDateFromCodiceFiscale(employee.codice_fiscale);
          if (birthDateFromCF) {
            employee.data_nascita = birthDateFromCF;
          }
        }
        return employee;
      });
      
      // Aggiorna lo stato per le altre funzioni
      setImportData(finalData);
      
      return finalData;
  } catch (error) {
      console.error('Errore durante il processing del file:', error);
      throw error;
    }
  };

  // Custom validation che utilizza existingCompanies ma non blocca per azienda assente
  const customValidateEmployee = (employee: any, index?: number): string[] => {
    return validateEmployee(employee);
  };

  // Custom import handler che passa i dati aggiornati
  const handleImport = async (data: any[], overwriteIds?: string[]) => {
    console.log("handleImport chiamato con overwriteIds:", overwriteIds);
    
    // Qui ora eseguiamo la validazione delle aziende
    const invalidEmployees = importData.filter(employee => {
      // Se non c'è un'azienda associata, non è un errore (sarà l'utente a scegliere in seguito)
      if (!employee.company_name && !employee.companyId) {
    return false;
      }
      
      // Se c'è un'azienda associata, verifichiamo che esista
      const companyIdentifier = employee.companyId || employee.company_name;
      
      // Verifica se l'azienda esiste nel database
      const companyExists = existingCompanies.some(company => {
        return company.id === companyIdentifier || 
               (company.name && company.name.toLowerCase() === companyIdentifier.toLowerCase()) ||
               (company.ragioneSociale && company.ragioneSociale.toLowerCase() === companyIdentifier.toLowerCase());
      });
      
      // Se l'azienda non esiste e il dipendente non è stato associato a un'azienda via dropdown
      return !companyExists && !employee._assignedCompany;
    });
    
    // Se ci sono dipendenti con aziende non esistenti, mostra un errore e interrompi l'importazione
    if (invalidEmployees.length > 0) {
      const employeeNames = invalidEmployees.map(e => `${e.nome} ${e.cognome} (${e.company_name || e.companyId})`).join(", ");
      
      // Invece di lanciare un errore, mostriamo un messaggio che invita a usare il selettore
      setSelectedCompanyId(''); // Reset della selezione
      
      // Seleziona automaticamente tutte le righe con aziende non valide
      const invalidIds = invalidEmployees.filter(e => e.id).map(e => e.id);
      setSelectedOverwrites(prevSelected => {
        const newSelected = [...prevSelected];
        invalidIds.forEach(id => {
          if (id && !newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        return newSelected;
      });
      
      // Comunica l'errore in modo più utile
      throw new Error(`Impossibile procedere con l'importazione. I seguenti dipendenti hanno aziende non presenti nel database: ${employeeNames}. Utilizza il menu "Cambia azienda" sopra per assegnare un'azienda esistente a questi dipendenti.`);
    }
    
    // Assicurati che ogni record abbia l'ID dell'azienda mappato correttamente
    const finalData = importData.map(employee => {
      // Configuriamo il dato per l'API
      const formattedEmployee: any = {};
      
      // Mappa i campi CSV ai campi dell'API
      for (const [csvKey, apiKey] of Object.entries(apiFieldMap)) {
        if (employee[csvKey] !== undefined) {
      // Gestione speciale per la data di nascita
          if (apiKey === 'birthDate' && employee[csvKey]) {
            try {
              // Converti la data in formato ISO-8601 COMPLETO con orario (importante per Prisma)
              const dateObj = new Date(employee[csvKey]);
              // Verifichiamo che sia una data valida
              if (!isNaN(dateObj.getTime())) {
                // Include l'orario nel formato, non solo la data
                formattedEmployee[apiKey] = dateObj.toISOString();
              }
            } catch (e) {
              console.warn(`Data di nascita non valida: ${employee[csvKey]}`);
              // Non includiamo la data se non è valida
            }
        } else {
            formattedEmployee[apiKey] = employee[csvKey];
          }
        }
      }
      
      // Gestisci l'ID dell'azienda
      if (employee.companyId) {
        formattedEmployee.companyId = employee.companyId;
      } else if (employee.company_name) {
        const companyInfo = getCompanyName(employee.company_name);
        if (companyInfo.id) {
          formattedEmployee.companyId = companyInfo.id;
        }
      }
      
      // Se è un elemento esistente (ha un ID), SEMPRE memorizza l'ID
      // ma NON includerlo nei dati da inviare (sarà usato solo nell'URL)
      let id = null;
      if (employee.id) {
        id = employee.id;
        // Rimuoviamo l'ID dai dati da inviare per evitare problemi
        // con Prisma durante l'aggiornamento
      }
      
      return {
        ...formattedEmployee,
        _id: id // Memorizziamo l'ID in un campo separato per usarlo nella URL
      };
    });
    
    // Filtra per includere solo i nuovi record e gli esistenti selezionati per sovrascrittura
    const dataToImport = finalData.filter(employee => {
      // Includi sempre i record senza ID (nuovi)
      if (!employee._id) return true;
      
      // Includi i record con ID solo se selezionati per sovrascrittura
      return overwriteIds && overwriteIds.includes(employee._id);
    });
    
    // Debug per verificare che l'ID sia incluso per gli aggiornamenti
    console.log("Dati da importare:", dataToImport);
    
    // Usa i dati aggiornati nell'importData state invece di quelli passati
    try {
      await onImport(dataToImport, overwriteIds);
      // Chiudi la finestra solo in caso di successo
      onClose();
        } catch (error) {
      // In caso di errore, l'errore viene propagato e gestito dal componente padre
      // senza chiudere la finestra di importazione
      throw error;
    }
  };

    return (
      <GenericImport
        entityType="dipendenti"
        uniqueField="codice_fiscale"
        onImport={handleImport}
        onClose={onClose}
        existingEntities={existingEmployees}
        csvHeaderMap={csvHeaderMap}
        title="Importa Dipendenti"
        subtitle="Carica un file CSV con i dati dei dipendenti da importare"
        customValidation={customValidateEmployee}
        csvDelimiter=";"
        customProcessFile={customProcessFile}
        onSelectedRowsChange={setSelectedOverwrites}
        availableCompanies={companyOptions}
        onCompanyChange={handleCompanyChange}
      />
  );
};

export default EmployeeImport;