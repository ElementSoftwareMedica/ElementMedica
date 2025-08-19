import { ConflictInfo, PersonData, CompanyOption } from '../../types/import/personImportTypes';

/**
 * Servizio per la rilevazione e gestione dei conflitti durante l'importazione
 */

/**
 * Rileva duplicati basati sul codice fiscale
 */
export const detectDuplicates = (
  persons: PersonData[],
  existingPersons: any[] = []
): ConflictInfo[] => {
  const conflicts: ConflictInfo[] = [];
  const fiscalCodes = new Set();

  // Controlla duplicati negli esistenti
  existingPersons.forEach(existing => {
    if (existing.fiscalCode) {
      fiscalCodes.add(existing.fiscalCode.toLowerCase());
    }
  });

  persons.forEach((person, index) => {
    if (person.taxCode) {
      const fiscalCode = person.taxCode.toLowerCase();
      
      if (fiscalCodes.has(fiscalCode)) {
        const existingPerson = existingPersons.find(
          p => p.fiscalCode?.toLowerCase() === fiscalCode
        );
        
        conflicts.push({
          type: 'duplicate',
          rowIndex: index,
          personData: person,
          message: `Persona con codice fiscale ${person.taxCode} già esistente nel sistema`,
          existingPerson,
          resolution: 'skip' // Default: salta i duplicati
        });
      } else {
        fiscalCodes.add(fiscalCode);
      }
    }
  });

  return conflicts;
};

/**
 * Rileva aziende non valide e suggerisce alternative
 */
export const detectInvalidCompanies = (
  persons: PersonData[],
  companies: CompanyOption[]
): ConflictInfo[] => {
  const conflicts: ConflictInfo[] = [];
  const companyNames = new Set(companies.map(c => c.label.toLowerCase()));

  persons.forEach((person, index) => {
    if (person.companyName && !companyNames.has(person.companyName.toLowerCase())) {
      // Trova aziende simili
      const suggestedCompanies = findSimilarCompanies(person.companyName, companies);
      
      conflicts.push({
        type: 'invalid_company',
        rowIndex: index,
        personData: person,
        message: `Azienda "${person.companyName}" non trovata nel sistema`,
        suggestedCompanies: suggestedCompanies.map(c => ({ id: c.value, name: c.label })),
        suggestedCompanyId: suggestedCompanies.length > 0 ? suggestedCompanies[0].value : undefined,
        resolution: suggestedCompanies.length > 0 ? 'company' : 'skip'
      });
    }
  });

  return conflicts;
};

/**
 * Trova aziende simili basate sul nome
 */
export const findSimilarCompanies = (
  companyName: string,
  companies: CompanyOption[]
): CompanyOption[] => {
  const searchTerm = companyName.toLowerCase();
  
  return companies
    .filter(company => {
      const companyNameLower = company.label.toLowerCase();
      return companyNameLower.includes(searchTerm) || 
             searchTerm.includes(companyNameLower) ||
             calculateSimilarity(searchTerm, companyNameLower) > 0.6;
    })
    .sort((a, b) => {
      const similarityA = calculateSimilarity(searchTerm, a.label.toLowerCase());
      const similarityB = calculateSimilarity(searchTerm, b.label.toLowerCase());
      return similarityB - similarityA;
    })
    .slice(0, 5);
};

/**
 * Calcola la similarità tra due stringhe (algoritmo semplificato)
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

/**
 * Calcola la distanza di Levenshtein tra due stringhe
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * Aggiorna la risoluzione di un conflitto
 */
export const updateConflictResolution = (
  conflicts: ConflictInfo[],
  index: number,
  resolution: 'skip' | 'overwrite' | 'company',
  companyId?: string
): ConflictInfo[] => {
  return conflicts.map((conflict, i) => {
    if (i === index) {
      return {
        ...conflict,
        resolution,
        resolvedCompanyId: resolution === 'company' ? companyId : undefined
      };
    }
    return conflict;
  });
};

/**
 * Risolve i conflitti preparando i dati per l'importazione
 */
export const resolveConflicts = (
  persons: PersonData[],
  conflicts: ConflictInfo[]
): PersonData[] => {
  const resolvedPersons: PersonData[] = [];
  
  persons.forEach((person, index) => {
    const conflict = conflicts.find(c => c.rowIndex === index);
    
    if (!conflict) {
      // Nessun conflitto, aggiungi la persona
      resolvedPersons.push(person);
    } else if (conflict.resolution === 'overwrite') {
      // Sovrascrivi la persona esistente
      resolvedPersons.push(person);
    } else if (conflict.resolution === 'company' && conflict.resolvedCompanyId) {
      // Assegna l'azienda risolta
      resolvedPersons.push({
        ...person,
        companyId: conflict.resolvedCompanyId
      });
    }
    // Se resolution è 'skip', non aggiungere la persona
  });
  
  return resolvedPersons;
};

/**
 * Ottiene un riassunto dei conflitti
 */
export const getConflictSummary = (conflicts: ConflictInfo[]) => {
  const duplicates = conflicts.filter(c => c.type === 'duplicate').length;
  const invalidCompanies = conflicts.filter(c => c.type === 'invalid_company').length;
  const resolved = conflicts.filter(c => c.resolution).length;
  
  return {
    total: conflicts.length,
    duplicates,
    invalidCompanies,
    resolved,
    unresolved: conflicts.length - resolved
  };
};

/**
 * Verifica se tutti i conflitti sono stati risolti
 */
export const areAllConflictsResolved = (conflicts: ConflictInfo[]): boolean => {
  return conflicts.every(conflict => conflict.resolution !== undefined);
};

/**
 * Ottiene gli indici delle righe con conflitti non risolti
 */
export const getUnresolvedConflictIndices = (conflicts: ConflictInfo[]): number[] => {
  return conflicts
    .filter(conflict => !conflict.resolution)
    .map(conflict => conflict.rowIndex);
};

/**
 * Deseleziona automaticamente le righe con conflitti di duplicato
 */
export const autoDeselectDuplicateConflicts = (
  selectedRows: boolean[],
  conflicts: ConflictInfo[]
): boolean[] => {
  const newSelectedRows = [...selectedRows];
  
  conflicts.forEach(conflict => {
    if (conflict.type === 'duplicate' && conflict.resolution === 'skip') {
      newSelectedRows[conflict.rowIndex] = false;
    }
  });
  
  return newSelectedRows;
};