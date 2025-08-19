import logger from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';

/**
 * Servizio dedicato per l'importazione di persone
 * Gestisce import da CSV e JSON con logica semplificata e chiara
 */
class PersonImportService {
  constructor(personService) {
    this.personService = personService;
  }

  /**
   * Importa persone da CSV
   */
  async importFromCSV(file, companyId = null, tenantId = null) {
    try {
      const csvContent = file.buffer.toString('utf-8');
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      let imported = 0;
      const errors = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        try {
          const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
          const personData = {};
          
          headers.forEach((header, index) => {
            if (values[index]) {
              const headerLower = header.toLowerCase().replace(/[_\s]/g, '');
              switch (headerLower) {
                case 'nome':
                case 'firstname':
                  personData.firstName = this.toTitleCase(values[index]);
                  break;
                case 'cognome':
                case 'lastname':
                  personData.lastName = this.toTitleCase(values[index]);
                  break;
                case 'email':
                  personData.email = values[index].toLowerCase();
                  break;
                case 'telefono':
                case 'phone':
                  personData.phone = values[index];
                  break;
                case 'codicefiscale':
                case 'taxcode':
                  personData.taxCode = values[index].toUpperCase();
                  break;
                case 'datanascita':
                case 'birthdate':
                  personData.birthDate = this.parseDate(values[index]);
                  break;
                case 'indirizzo':
                case 'address':
                  personData.residenceAddress = this.toTitleCase(values[index]);
                  break;
                case 'citta':
                case 'city':
                  personData.residenceCity = this.toTitleCase(values[index]);
                  break;
                case 'provincia':
                case 'province':
                  personData.province = values[index].toUpperCase();
                  break;
                case 'cap':
                case 'postalcode':
                  personData.postalCode = values[index];
                  break;
                case 'ruolo':
                case 'role':
                case 'roletype':
                  personData.roleType = values[index];
                  break;
                case 'azienda':
                case 'company':
                case 'companyname':
                  personData.companyName = values[index];
                  break;
                case 'username':
                  personData.username = values[index].toLowerCase();
                  break;
                case 'note':
                case 'notes':
                  personData.notes = values[index];
                  break;
              }
            }
          });
          
          // Validazione campi obbligatori
          if (!personData.firstName || !personData.lastName) {
            errors.push({ row: i + 1, error: 'Dati obbligatori mancanti (nome, cognome)' });
            continue;
          }
          
          // Controlla duplicati
          const duplicateInfo = await this.checkDuplicates(personData, tenantId);
          if (duplicateInfo.length > 0) {
            errors.push({ row: i + 1, error: `Persona già esistente con ${duplicateInfo.join(' o ')}` });
            continue;
          }
          
          // Risolvi azienda se specificata
          let resolvedCompanyId = companyId;
          if (personData.companyName && !companyId) {
            resolvedCompanyId = await this.resolveCompanyId(personData.companyName, null, tenantId);
          }
          
          // Prepara i dati per la creazione
          const preparedData = await this.preparePersonData(personData);
          
          // Mappa il ruolo
          const roleType = this.personService.constructor.mapRoleType(personData.roleType);
          
          // Rimuovi campi non necessari per la creazione
          delete preparedData.companyName;
          delete preparedData.roleType;
          
          // Crea la persona con account
          // Importa PersonCore per chiamare direttamente il metodo con tutti i parametri
          const { default: PersonCore } = await import('./core/PersonCore.js');
          await PersonCore.createPerson(preparedData, roleType, resolvedCompanyId, tenantId);
          imported++;
          
        } catch (error) {
          errors.push({ row: i + 1, error: error.message });
        }
      }
      
      return { imported, errors };
    } catch (error) {
      logger.error('Error importing persons from CSV:', { error: error.message });
      throw error;
    }
  }

  /**
   * Importa persone da dati JSON (già processati dal frontend)
   */
  async importFromJSON(persons, overwriteIds = [], companyId = null, tenantId = null) {
    const results = {
      imported: 0,
      errors: [],
      warnings: []
    };

    logger.info('Starting JSON import:', { 
      personsCount: persons.length, 
      overwriteIdsCount: overwriteIds.length 
    });

    for (let i = 0; i < persons.length; i++) {
      try {
        const result = await this.processPersonImport(
          persons[i], 
          overwriteIds, 
          companyId, 
          tenantId, 
          i + 1
        );
        
        if (result.success) {
          results.imported++;
          if (result.warning) {
            results.warnings.push(result.warning);
          }
        } else {
          results.errors.push(result.error);
        }
        
      } catch (error) {
        logger.error('Unexpected error in import:', { row: i + 1, error: error.message });
        results.errors.push({ 
          row: i + 1, 
          error: `Errore imprevisto: ${error.message}` 
        });
      }
    }

    logger.info('JSON import completed:', results);
    return results;
  }

  /**
   * Processa l'importazione di una singola persona
   */
  async processPersonImport(personData, overwriteIds, companyId, tenantId, rowNumber) {
    // 1. Validazione base
    const validation = this.validatePersonData(personData);
    if (!validation.valid) {
      return { 
        success: false, 
        error: { row: rowNumber, error: validation.error } 
      };
    }

    // 2. Validazione tenantId
    if (!tenantId) {
      return {
        success: false,
        error: { row: rowNumber, error: 'TenantId mancante - impossibile procedere con l\'importazione' }
      };
    }

    // 3. Controllo duplicati
    const duplicateCheck = await this.checkForDuplicates(personData, tenantId);
    if (duplicateCheck.found && !overwriteIds.includes(duplicateCheck.existingPerson.id)) {
      return {
        success: false,
        error: { 
          row: rowNumber, 
          error: `Persona già esistente: ${duplicateCheck.reason}`,
          existingPersonId: duplicateCheck.existingPerson.id
        }
      };
    }

    // 4. Prepara i dati
    const preparedData = await this.preparePersonData(personData);
    
    // 5. Risolvi azienda - usa _companyId se presente, altrimenti companyName
    let resolvedCompanyId = null;
    if (personData._companyId) {
      resolvedCompanyId = await this.resolveCompanyId(personData._companyId, companyId, tenantId);
    } else if (personData.companyName) {
      resolvedCompanyId = await this.resolveCompanyId(personData.companyName, companyId, tenantId);
    } else if (companyId) {
      resolvedCompanyId = companyId;
    }

    // 6. Crea o aggiorna la persona
    try {
      if (duplicateCheck.found && overwriteIds.includes(duplicateCheck.existingPerson.id)) {
        // Aggiorna persona esistente
        await this.updateExistingPerson(duplicateCheck.existingPerson.id, preparedData);
        return { 
          success: true, 
          warning: { row: rowNumber, message: 'Persona aggiornata' }
        };
      } else {
        // Crea nuova persona
        const roleType = this.personService.constructor.mapRoleType(personData.roleType);
        // Importa PersonCore per chiamare direttamente il metodo con tutti i parametri
        const { default: PersonCore } = await import('./core/PersonCore.js');
        await PersonCore.createPerson(preparedData, roleType, resolvedCompanyId, tenantId);
        return { success: true };
      }
    } catch (error) {
      logger.error('Error creating/updating person:', { row: rowNumber, error: error.message });
      return {
        success: false,
        error: { row: rowNumber, error: `Errore durante la creazione: ${error.message}` }
      };
    }
  }

  /**
   * Valida i dati di una persona
   */
  validatePersonData(personData) {
    if (!personData.firstName || !personData.lastName) {
      return { valid: false, error: 'Nome e cognome sono obbligatori' };
    }

    if (personData.email && !this.isValidEmail(personData.email)) {
      return { valid: false, error: 'Email non valida' };
    }

    return { valid: true };
  }

  /**
   * Controlla se esistono duplicati per codice fiscale o email
   */
  async checkForDuplicates(personData, tenantId = null) {
    const whereConditions = [];
    
    if (personData.taxCode) {
      // Normalizza il taxCode per il confronto (CRITICO per evitare falsi negativi)
      const normalizedTaxCode = personData.taxCode.toUpperCase().trim();
      whereConditions.push({ taxCode: normalizedTaxCode });
    }
    
    if (personData.email) {
      whereConditions.push({ email: personData.email.toLowerCase().trim() });
    }

    if (whereConditions.length === 0) {
      return { found: false };
    }

    const whereClause = {
      OR: whereConditions,
      deletedAt: null
    };

    // Filtra per tenant se fornito
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const existingPerson = await prisma.person.findFirst({
      where: whereClause
    });

    if (existingPerson) {
      let reason = '';
      if (personData.taxCode && existingPerson.taxCode === personData.taxCode.toUpperCase().trim()) {
        reason = `codice fiscale ${personData.taxCode}`;
      } else if (personData.email && existingPerson.email === personData.email.toLowerCase().trim()) {
        reason = `email ${personData.email}`;
      }

      return { 
        found: true, 
        existingPerson, 
        reason 
      };
    }

    return { found: false };
  }

  /**
   * Controlla duplicati per CSV (versione semplificata)
   */
  async checkDuplicates(personData, tenantId = null) {
    const duplicateInfo = [];
    
    if (personData.taxCode) {
      // Normalizza il taxCode per il confronto (CRITICO per coerenza)
      const normalizedTaxCode = personData.taxCode.toUpperCase().trim();
      const whereClause = { taxCode: normalizedTaxCode, deletedAt: null };
      if (tenantId) whereClause.tenantId = tenantId;
      
      const existingByTaxCode = await prisma.person.findFirst({
        where: whereClause
      });
      if (existingByTaxCode) {
        duplicateInfo.push('codice fiscale');
      }
    }
    
    if (personData.email) {
      const whereClause = { email: personData.email.toLowerCase().trim(), deletedAt: null };
      if (tenantId) whereClause.tenantId = tenantId;
      
      const existingByEmail = await prisma.person.findFirst({
        where: whereClause
      });
      if (existingByEmail) {
        duplicateInfo.push('email');
      }
    }
    
    return duplicateInfo;
  }

  /**
   * Prepara i dati della persona per la creazione/aggiornamento
   */
  async preparePersonData(personData) {
    const prepared = { ...personData };

    // Normalizza i campi di testo (CRITICO: normalizzazione completa per evitare conflitti)
    if (prepared.firstName) prepared.firstName = this.toTitleCase(prepared.firstName);
    if (prepared.lastName) prepared.lastName = this.toTitleCase(prepared.lastName);
    if (prepared.email) prepared.email = prepared.email.toLowerCase().trim();
    if (prepared.taxCode) prepared.taxCode = prepared.taxCode.toUpperCase().trim();

    // Imposta status di default se vuoto o non valido
    if (!prepared.status || prepared.status.trim() === '') {
      prepared.status = 'ACTIVE';
    } else {
      // Verifica che il valore sia uno dei valori validi dell'enum PersonStatus
      const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING'];
      const upperStatusValue = prepared.status.toString().trim().toUpperCase();
      if (validStatuses.includes(upperStatusValue)) {
        prepared.status = upperStatusValue;
      } else {
        console.warn(`Valore status non valido: ${prepared.status}, impostato su ACTIVE`);
        prepared.status = 'ACTIVE';
      }
    }

    // Gestione della data di nascita
    if (prepared.birthDate) {
      // Se è già presente, formattala correttamente per Prisma
      const parsedDate = this.parseDate(prepared.birthDate);
      if (parsedDate) {
        // Imposta l'ora a mezzanotte UTC per evitare problemi di timezone
        parsedDate.setUTCHours(0, 0, 0, 0);
        prepared.birthDate = parsedDate.toISOString(); // Formato ISO-8601 completo
      } else {
        console.warn(`Data di nascita non valida: ${prepared.birthDate}, rimossa`);
        delete prepared.birthDate;
      }
    } else if (prepared.taxCode) {
      // Estrai data di nascita dal codice fiscale se non fornita
      try {
        const extractedDate = this.extractBirthDateFromTaxCode(prepared.taxCode);
        if (extractedDate) {
          // Imposta l'ora a mezzanotte UTC per evitare problemi di timezone
          extractedDate.setUTCHours(0, 0, 0, 0);
          prepared.birthDate = extractedDate.toISOString(); // Formato ISO-8601 completo
        }
      } catch (error) {
        // Ignora errori di estrazione data
        console.warn(`Errore nell'estrazione data dal codice fiscale ${prepared.taxCode}:`, error.message);
      }
    }

    // Genera username se non fornito
    if (!prepared.username) {
      prepared.username = await this.generateUniqueUsername(prepared.firstName, prepared.lastName);
    }

    // Imposta password di default se non fornita
    if (!prepared.password) {
      prepared.password = 'Password123!';
    }

    return prepared;
  }

  /**
   * Risolve l'ID dell'azienda dal nome o UUID
   */
  async resolveCompanyId(companyName, defaultCompanyId = null, tenantId = null) {
    if (!companyName) return defaultCompanyId;

    // Se companyName è già un UUID valido, ritornalo direttamente
    if (this.isValidUUID(companyName)) {
      // Verifica che l'azienda esista nel tenant specificato
      const whereClause = { id: companyName, deletedAt: null };
      if (tenantId) {
        whereClause.tenantId = tenantId;
      }
      
      const company = await prisma.company.findFirst({
        where: whereClause
      });
      
      if (company) {
        console.log(`✅ Azienda trovata per ID: ${companyName} -> ${company.ragioneSociale} (${company.id})`);
        return company.id;
      } else {
        console.warn(`❌ Azienda con ID ${companyName} non trovata nel tenant ${tenantId}`);
        return defaultCompanyId;
      }
    }

    // Prepara la clausola where per la ricerca per nome
    const baseWhereClause = { deletedAt: null };
    if (tenantId) {
      baseWhereClause.tenantId = tenantId;
    }

    // Cerca per ragioneSociale con match esatto prima
    let company = await prisma.company.findFirst({
      where: {
        ...baseWhereClause,
        ragioneSociale: { equals: companyName, mode: 'insensitive' }
      }
    });

    // Se non trovata con match esatto, cerca con contains
    if (!company) {
      company = await prisma.company.findFirst({
        where: {
          ...baseWhereClause,
          ragioneSociale: { contains: companyName, mode: 'insensitive' }
        }
      });
    }

    if (company) {
      console.log(`✅ Azienda trovata per nome: ${companyName} -> ${company.ragioneSociale} (${company.id})`);
      return company.id;
    }

    console.warn(`❌ Azienda non trovata: ${companyName} nel tenant ${tenantId}`);
    return defaultCompanyId; // Usa defaultCompanyId come fallback
  }

  /**
   * Verifica se una stringa è un UUID valido
   */
  isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Aggiorna una persona esistente
   */
  async updateExistingPerson(personId, personData) {
    // Rimuovi campi che non devono essere aggiornati
    const updateData = { ...personData };
    delete updateData.username; // Non aggiornare username
    delete updateData.password; // Non aggiornare password
    delete updateData.companyName;
    delete updateData.roleType;

    await prisma.person.update({
      where: { id: personId },
      data: updateData
    });
  }

  /**
   * Genera un username unico
   */
  async generateUniqueUsername(firstName, lastName) {
    const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z.]/g, '');
    let username = baseUsername;
    let counter = 1;

    while (await this.usernameExists(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  /**
   * Verifica se un username esiste già
   */
  async usernameExists(username) {
    const existing = await prisma.person.findFirst({
      where: { username, deletedAt: null }
    });
    return !!existing;
  }

  /**
   * Estrae la data di nascita dal codice fiscale
   */
  extractBirthDateFromTaxCode(taxCode) {
    if (!taxCode || taxCode.length !== 16) {
      throw new Error('Codice fiscale non valido');
    }

    const yearPart = taxCode.substring(6, 8);
    const monthPart = taxCode.substring(8, 9);
    const dayPart = taxCode.substring(9, 11);

    // Mappa dei mesi
    const monthMap = {
      'A': '01', 'B': '02', 'C': '03', 'D': '04', 'E': '05', 'H': '06',
      'L': '07', 'M': '08', 'P': '09', 'R': '10', 'S': '11', 'T': '12'
    };

    const month = monthMap[monthPart];
    if (!month) {
      throw new Error('Mese non valido nel codice fiscale');
    }

    // Determina l'anno (assumendo che anni 00-30 siano 2000-2030, 31-99 siano 1931-1999)
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    let year = parseInt(yearPart);
    
    if (year <= 30) {
      year += currentCentury;
    } else {
      year += currentCentury - 100;
    }

    // Per le donne, il giorno è aumentato di 40
    let day = parseInt(dayPart);
    if (day > 31) {
      day -= 40;
    }

    // Usa UTC per evitare problemi di fuso orario
    return new Date(Date.UTC(year, parseInt(month) - 1, day));
  }

  /**
   * Converte una stringa in Title Case
   */
  toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Valida un indirizzo email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Parsa una data da vari formati
   */
  parseDate(dateString) {
    if (!dateString) return null;
    
    // Prova vari formati
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/ // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        let year, month, day;
        if (format === formats[0]) {
          // YYYY-MM-DD
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1; // JavaScript months are 0-based
          day = parseInt(match[3]);
        } else {
          // DD/MM/YYYY o DD-MM-YYYY
          year = parseInt(match[3]);
          month = parseInt(match[2]) - 1; // JavaScript months are 0-based
          day = parseInt(match[1]);
        }
        
        // Usa UTC per evitare problemi di fuso orario
        return new Date(Date.UTC(year, month, day));
      }
    }

    // Fallback: prova Date.parse con UTC
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      // Converte in UTC per consistenza
      return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
    }
    
    return null;
  }
}

export default PersonImportService;