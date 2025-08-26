import logger from '../../../utils/logger.js';
import prisma from '../../../config/prisma-optimization.js';
import PersonCore from '../core/PersonCore.js';
import PersonUtils from '../utils/PersonUtils.js';
import PersonRoleMapping from '../utils/PersonRoleMapping.js';
import PersonImportService from '../PersonImportService.js';

/**
 * Gestisce l'importazione di persone da vari formati
 */
class PersonImport {
  /**
   * Importa persone da dati JSON
   * @param {Array} personsData - Array di dati delle persone
   * @param {Object} options - Opzioni di importazione
   * @returns {Promise<Object>} Risultato dell'importazione
   */
  static async importFromJSON(personsData, options = {}) {
    const {
      skipDuplicates = true,
      updateExisting = false,
      defaultRole = 'EMPLOYEE',
      defaultCompanyId = null,
      defaultTenantId = null,
      validateData = true,
      overwriteIds = []
    } = options;

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    try {
      for (const personData of personsData) {
        try {
          // Validazione dei dati se richiesta
          if (validateData) {
            const validation = this.validatePersonData(personData);
            if (!validation.isValid) {
              results.errors.push({
                data: personData,
                error: `Validation failed: ${validation.errors.join(', ')}`
              });
              continue;
            }
          }

          // Normalizza i dati
          const normalizedData = await this.normalizePersonData(personData, {
            defaultRole,
            defaultCompanyId,
            defaultTenantId
          });

          // Verifica se la persona esiste già (incluse quelle soft-deleted)
          const existingPersonResult = await this.findExistingPerson(normalizedData);

          if (existingPersonResult) {
            const { person: existingPerson, isSoftDeleted } = existingPersonResult;
            
            // Controlla se l'ID è nella lista degli overwrite
            const shouldOverwrite = overwriteIds.includes(existingPerson.id);
            
            if (isSoftDeleted) {
              // Persona soft-deleted: riattiva e aggiorna
              // Prima riattiva la persona
              await PersonCore.restorePerson(existingPerson.id);
              
              // Poi aggiorna i dati se necessario
              const { role, roleType, companyId, tenantId, _companyId, _id, fiscalCode, ...personDataOnly } = normalizedData;
              if (Object.keys(personDataOnly).length > 0) {
                await PersonCore.updatePerson(existingPerson.id, personDataOnly);
              }
              
              results.updated++;
            } else if (shouldOverwrite || updateExisting) {
              // Persona attiva: aggiorna se richiesto
              // Rimuovi i campi che non dovrebbero essere aggiornati direttamente
              const { role, roleType, companyId, tenantId, _companyId, _id, fiscalCode, ...personDataOnly } = normalizedData;
              await PersonCore.updatePerson(existingPerson.id, personDataOnly);
              results.updated++;
            } else if (skipDuplicates) {
              results.skipped++;
            } else {
              results.errors.push({
                data: personData,
                error: `Person already exists: ${existingPerson.firstName} ${existingPerson.lastName} (${existingPerson.taxCode || existingPerson.email})`
              });
              continue;  // Salta alla prossima persona senza tentare di crearla
            }
          } else {
            // Estrai i parametri separati dai dati della persona
            const { role, roleType, companyId, tenantId, _companyId, _id, fiscalCode, ...personDataOnly } = normalizedData;
            
            // Usa role o roleType come fallback
            const finalRole = role || roleType || defaultRole;
            
            // Usa _companyId se presente (UUID corretto), altrimenti companyId
            const finalCompanyId = _companyId || companyId || defaultCompanyId;
            
            // Assicurati che tenantId non sia null
            const finalTenantId = tenantId || defaultTenantId;
            if (!finalTenantId) {
              results.errors.push({
                data: personData,
                error: 'tenantId is required but not provided'
              });
              continue;
            }
            
            await PersonCore.createPerson(personDataOnly, finalRole, finalCompanyId, finalTenantId);
            results.imported++;
          }
        } catch (error) {
          results.errors.push({
            data: personData,
            error: error.message
          });
        }
      }

      logger.info('JSON import completed:', results);
      return results;
    } catch (error) {
      logger.error('Error in JSON import:', error);
      throw error;
    }
  }

  /**
   * Importa persone da CSV
   * @param {string} csvContent - Contenuto CSV
   * @param {Object} options - Opzioni di importazione
   * @returns {Promise<Object>} Risultato dell'importazione
   */
  static async importFromCSV(csvContent, options = {}) {
    try {
      const parsedData = this.parseCSV(csvContent, options);
      return await this.importFromJSON(parsedData, options);
    } catch (error) {
      logger.error('Error in CSV import:', error);
      throw error;
    }
  }

  /**
   * Parsa il contenuto CSV
   * @param {string} csvContent - Contenuto CSV
   * @param {Object} options - Opzioni di parsing
   * @returns {Array} Array di oggetti persona
   */
  static parseCSV(csvContent, options = {}) {
    const {
      delimiter = ',',
      hasHeader = true,
      encoding = 'utf-8'
    } = options;

    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      let headers = [];
      let dataLines = lines;

      if (hasHeader) {
        headers = this.parseCSVLine(lines[0], delimiter);
        dataLines = lines.slice(1);
      } else {
        // Headers di default se non presenti
        headers = [
          'firstName', 'lastName', 'email', 'username', 
          'phone', 'dateOfBirth', 'fiscalCode', 'role'
        ];
      }

      const parsedData = [];

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;

        try {
          const values = this.parseCSVLine(line, delimiter);
          const personData = {};

          headers.forEach((header, index) => {
            if (values[index] !== undefined) {
              personData[header.trim()] = values[index].trim();
            }
          });

          // Converti i campi data se presenti
          if (personData.dateOfBirth) {
            personData.dateOfBirth = PersonUtils.parseDate(personData.dateOfBirth);
          }

          parsedData.push(personData);
        } catch (error) {
          logger.warn(`Error parsing CSV line ${i + 1}:`, error.message);
        }
      }

      return parsedData;
    } catch (error) {
      logger.error('Error parsing CSV:', error);
      throw error;
    }
  }

  /**
   * Parsa una singola riga CSV
   * @param {string} line - Riga CSV
   * @param {string} delimiter - Delimitatore
   * @returns {Array} Array di valori
   */
  static parseCSVLine(line, delimiter = ',') {
    const values = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Doppio quote = quote escaped
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    values.push(current);
    return values;
  }

  /**
   * Normalizza i dati di una persona per l'importazione
   * @param {Object} personData - Dati della persona
   * @param {Object} defaults - Valori di default
   * @returns {Promise<Object>} Dati normalizzati
   */
  static async normalizePersonData(personData, defaults = {}) {
    const normalized = { ...personData };

    // Normalizza i nomi
    if (normalized.firstName) {
      normalized.firstName = PersonUtils.toTitleCase(normalized.firstName);
    }
    if (normalized.lastName) {
      normalized.lastName = PersonUtils.toTitleCase(normalized.lastName);
    }

    // Normalizza email
    if (normalized.email) {
      normalized.email = normalized.email.toLowerCase().trim();
    }

    // Normalizza telefono
    if (normalized.phone) {
      normalized.phone = PersonUtils.cleanPhoneNumber(normalized.phone);
    }

    // Normalizza codice fiscale
    if (normalized.taxCode) {
      normalized.taxCode = normalized.taxCode.toUpperCase().trim();
    } else if (normalized.fiscalCode) {
      // Mappa fiscalCode su taxCode per compatibilità con CSV legacy
      normalized.taxCode = normalized.fiscalCode.toUpperCase().trim();
      // Rimuovi fiscalCode dai dati normalizzati
      delete normalized.fiscalCode;
    }

    // Mappa il ruolo - gestisce sia 'role' che 'roleType'
    let roleValue = normalized.role || normalized.roleType;
    if (roleValue) {
      normalized.role = PersonRoleMapping.mapRoleType(roleValue);
    } else if (defaults.defaultRole) {
      normalized.role = defaults.defaultRole;
    }
    
    // Rimuovi roleType dai dati normalizzati se presente
    if (normalized.roleType) {
      delete normalized.roleType;
    }

    // Aggiungi valori di default
    if (defaults.defaultCompanyId && !normalized.companyId) {
      normalized.companyId = defaults.defaultCompanyId;
    }
    if (defaults.defaultTenantId && !normalized.tenantId) {
      normalized.tenantId = defaults.defaultTenantId;
    }

    // Gestione della data di nascita - converte in formato ISO-8601 completo
    if (normalized.birthDate || normalized.dateOfBirth) {
      const dateField = normalized.birthDate || normalized.dateOfBirth;
      const parsedDate = PersonUtils.parseDate(dateField);
      if (parsedDate) {
        // Imposta l'ora a mezzanotte nel timezone locale per evitare problemi di conversione
        parsedDate.setHours(12, 0, 0, 0); // Usa mezzogiorno per evitare problemi di timezone
        normalized.birthDate = parsedDate.toISOString(); // Formato ISO-8601 completo
        // Rimuovi il campo alternativo se presente
        if (normalized.dateOfBirth) {
          delete normalized.dateOfBirth;
        }
      } else {
        // Data di nascita non valida, rimossa
        delete normalized.birthDate;
        delete normalized.dateOfBirth;
      }
    } else if (normalized.taxCode) {
      // Estrai data di nascita dal codice fiscale se non fornita
      try {
        const taxCode = normalized.taxCode;
        const extractedDate = PersonUtils.extractBirthDateFromTaxCode(taxCode);
        if (extractedDate) {
          // Imposta l'ora a mezzogiorno nel timezone locale per evitare problemi di conversione
          extractedDate.setHours(12, 0, 0, 0);
          normalized.birthDate = extractedDate.toISOString(); // Formato ISO-8601 completo
        }
      } catch (error) {
        // Ignora errori di estrazione data
        // Errore nell'estrazione data dal codice fiscale
      }
    }

    // Gestione di altri campi data (hiredDate, createdAt, etc.)
    const dateFields = ['hiredDate', 'startDate', 'endDate', 'contractDate', 'createdAt'];
    dateFields.forEach(field => {
      if (normalized[field] !== undefined) {
        if (normalized[field] === '' || normalized[field] === null) {
          // Rimuovi campi data vuoti per evitare errori Prisma
          delete normalized[field];
        } else {
          // Prova a parsare la data
          const parsedDate = PersonUtils.parseDate(normalized[field]);
          if (parsedDate) {
            parsedDate.setHours(12, 0, 0, 0); // Usa mezzogiorno per evitare problemi di timezone
            normalized[field] = parsedDate.toISOString();
          } else {
            // Data non valida, rimossa
            delete normalized[field];
          }
        }
      }
    });

    // Pulisci campi stringa vuoti che potrebbero causare problemi
    const stringFields = ['email', 'phone', 'residenceAddress', 'province', 'postalCode', 'notes', 'title'];
    stringFields.forEach(field => {
      if (normalized[field] === '') {
        normalized[field] = null;
      }
    });

    // Genera username se non presente
    if (!normalized.username && normalized.firstName && normalized.lastName) {
      // Crea una funzione che inverte il risultato di checkUsernameAvailability
      // perché generateUniqueUsername si aspetta una funzione che restituisce true se l'username ESISTE
      const checkExistence = async (username) => {
        const isAvailable = await PersonCore.checkUsernameAvailability(username);
        return !isAvailable; // Inverti il risultato
      };
      
      normalized.username = await PersonUtils.generateUniqueUsername(
        normalized.firstName, 
        normalized.lastName,
        checkExistence
      );
    }

    // Risolvi companyId se presente e non è già un UUID
    if (normalized.companyId && !normalized._companyId) {
      const importService = new PersonImportService();
      const resolvedCompanyId = await importService.resolveCompanyId(normalized.companyId, defaults.defaultCompanyId);
      if (resolvedCompanyId) {
        normalized._companyId = resolvedCompanyId;
      }
    }

    // Gestisci company_name convertendolo in companyId
    if (normalized.company_name && !normalized._companyId) {
      const importService = new PersonImportService();
      const resolvedCompanyId = await importService.resolveCompanyId(normalized.company_name, defaults.defaultCompanyId);
      if (resolvedCompanyId) {
        normalized._companyId = resolvedCompanyId;
      }
    }

    // Rimuovi campi che non devono essere inviati direttamente a Prisma
    const fieldsToRemove = ['companyId', 'company_name', 'roleType', '_id'];
    fieldsToRemove.forEach(field => {
      if (normalized[field] !== undefined) {
        delete normalized[field];
      }
    });

    return normalized;
  }

  /**
   * Valida i dati di una persona
   * @param {Object} personData - Dati da validare
   * @returns {Object} Risultato della validazione
   */
  static validatePersonData(personData) {
    const errors = [];

    // Campi obbligatori
    if (!personData.firstName) {
      errors.push('firstName is required');
    }
    if (!personData.lastName) {
      errors.push('lastName is required');
    }

    // Validazione email
    if (personData.email && !PersonUtils.isValidEmail(personData.email)) {
      errors.push('Invalid email format');
    }

    // Validazione telefono
    if (personData.phone && !PersonUtils.isValidPhoneNumber(personData.phone)) {
      errors.push('Invalid phone number format');
    }

    // Validazione ruolo
    if (personData.role && !PersonRoleMapping.isValidRole(personData.role)) {
      errors.push(`Invalid role: ${personData.role}`);
    }

    // Validazione data di nascita
    if (personData.dateOfBirth) {
      try {
        const date = PersonUtils.parseDate(personData.dateOfBirth);
        if (!date || date > new Date()) {
          errors.push('Invalid date of birth');
        }
      } catch (error) {
        errors.push('Invalid date of birth format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Trova una persona esistente basata sui dati forniti
   * @param {Object} personData - Dati della persona
   * @param {Object} options - Opzioni di ricerca
   * @returns {Promise<Object|null>} Persona esistente o null con info su soft-delete
   */
  static async findExistingPerson(personData, options = {}) {
    try {
      const { includeSoftDeleted = true } = options;
      const conditions = [];

      // Cerca per email
      if (personData.email) {
        conditions.push({ email: personData.email });
      }

      // Cerca per username
      if (personData.username) {
        conditions.push({ username: personData.username });
      }

      // Cerca per codice fiscale (taxCode)
      if (personData.taxCode) {
        conditions.push({ taxCode: personData.taxCode });
      }

      if (conditions.length === 0) {
        return null;
      }

      // Prima cerca persone attive
      const activeResult = await prisma.person.findFirst({
        where: {
          OR: conditions,
          deletedAt: null
        }
      });

      if (activeResult) {
        return { person: activeResult, isSoftDeleted: false };
      }

      // Se includeSoftDeleted è true, cerca anche persone soft-deleted
      if (includeSoftDeleted) {
        const softDeletedResult = await prisma.person.findFirst({
          where: {
            OR: conditions,
            deletedAt: { not: null }
          }
        });

        if (softDeletedResult) {
          return { person: softDeletedResult, isSoftDeleted: true };
        }
      }

      return null;
    } catch (error) {
      logger.error('Error finding existing person:', error);
      return null;
    }
  }

  /**
   * Genera un template CSV per l'importazione
   * @param {Object} options - Opzioni del template
   * @returns {string} Contenuto CSV del template
   */
  static generateCSVTemplate(options = {}) {
    const {
      includeExamples = true,
      includeOptionalFields = true
    } = options;

    const headers = [
      'firstName',
      'lastName',
      'email',
      'username',
      'phone',
      'dateOfBirth',
      'taxCode',
      'role'
    ];

    if (includeOptionalFields) {
      headers.push('companyId', 'tenantId', 'notes');
    }

    let csv = headers.join(',') + '\n';

    if (includeExamples) {
      const examples = [
        [
          'Mario',
          'Rossi',
          'mario.rossi@example.com',
          'mario.rossi',
          '+39 123 456 7890',
          '1990-01-15',
          'RSSMRA90A15H501X',
          'EMPLOYEE'
        ]
      ];

      if (includeOptionalFields) {
        examples[0].push('', '', 'Note di esempio');
      }

      examples.forEach(example => {
        csv += example.map(field => `"${field}"`).join(',') + '\n';
      });
    }

    return csv;
  }

  /**
   * Ottiene le statistiche di un'importazione
   * @param {Object} importResult - Risultato dell'importazione
   * @returns {Object} Statistiche dettagliate
   */
  static getImportStats(importResult) {
    const total = importResult.imported + importResult.updated + 
                  importResult.skipped + importResult.errors.length;

    return {
      total,
      imported: importResult.imported,
      updated: importResult.updated,
      skipped: importResult.skipped,
      errors: importResult.errors.length,
      successRate: total > 0 ? ((importResult.imported + importResult.updated) / total * 100).toFixed(2) : 0,
      errorDetails: importResult.errors
    };
  }

  /**
   * Valida un file CSV prima dell'importazione
   * @param {string} csvContent - Contenuto CSV
   * @param {Object} options - Opzioni di validazione
   * @returns {Object} Risultato della validazione
   */
  static validateCSV(csvContent, options = {}) {
    try {
      const parsedData = this.parseCSV(csvContent, options);
      const validationResults = {
        isValid: true,
        totalRows: parsedData.length,
        validRows: 0,
        invalidRows: 0,
        errors: []
      };

      parsedData.forEach((row, index) => {
        const validation = this.validatePersonData(row);
        if (validation.isValid) {
          validationResults.validRows++;
        } else {
          validationResults.invalidRows++;
          validationResults.errors.push({
            row: index + 1,
            errors: validation.errors
          });
        }
      });

      validationResults.isValid = validationResults.invalidRows === 0;

      return validationResults;
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

export default PersonImport;