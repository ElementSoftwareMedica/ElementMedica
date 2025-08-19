# Piano di Risoluzione Immediata - Problema Import CSV

## Problema Identificato

### Errore Unique Constraint su taxCode
La funzione `importPersonsFromJSON()` nel file `personService.js` (righe 897-1100+) presenta una logica complessa e problematica che causa errori di unique constraint durante l'importazione CSV.

### Analisi del Problema

#### 1. Logica Troppo Complessa (200+ righe)
- Gestione duplicati confusa
- Logica di override non chiara
- Troppi controlli sovrapposti

#### 2. Gestione Conflitti Inadeguata
- Modifica automatica del taxCode con timestamp
- Logica di "proceeding_with_caution" non affidabile
- Controlli duplicati tra frontend e backend

#### 3. Codice Non Manutenibile
- Funzione troppo lunga (200+ righe)
- Responsabilità miste
- Difficile da debuggare

## Soluzione Immediata

### Fase 1: Refactoring Urgente (Oggi)

#### 1.1 Estrazione PersonImportService
Creare un servizio dedicato per l'importazione:

```javascript
// services/person/PersonImportService.js
class PersonImportService {
  async importFromJSON(persons, overwriteIds, companyId, tenantId) {
    // Logica semplificata e chiara
  }
  
  async importFromCSV(file, companyId, tenantId) {
    // Logica CSV dedicata
  }
  
  async handleDuplicates(personData, overwriteIds) {
    // Gestione duplicati centralizzata
  }
  
  async validatePersonData(personData) {
    // Validazione separata
  }
}
```

#### 1.2 Semplificazione Logica Duplicati
- Rimuovere modifica automatica taxCode
- Implementare strategia fail-fast per conflitti
- Separare logica frontend/backend

#### 1.3 Miglioramento Error Handling
- Errori più specifici e informativi
- Logging strutturato
- Rollback in caso di errori critici

### Fase 2: Implementazione (Prossime 2 ore)

#### 2.1 Creare PersonImportService
```bash
mkdir -p backend/services/person
touch backend/services/person/PersonImportService.js
```

#### 2.2 Migrare Logica Import
- Spostare `importPersonsFromJSON` 
- Spostare `importPersonsFromCSV`
- Semplificare logica duplicati

#### 2.3 Aggiornare PersonService
- Rimuovere funzioni import
- Delegare a PersonImportService
- Mantenere backward compatibility

#### 2.4 Aggiornare PersonController
- Utilizzare nuovo PersonImportService
- Mantenere API endpoints esistenti

### Fase 3: Testing (1 ora)

#### 3.1 Test Import CSV
- [ ] Import file template funzionante
- [ ] Gestione duplicati corretta
- [ ] Nessun errore unique constraint

#### 3.2 Test Import JSON
- [ ] Logica frontend-backend allineata
- [ ] Override funzionante
- [ ] Error handling migliorato

#### 3.3 Test Regressione
- [ ] Funzionalità esistenti intatte
- [ ] Performance invariata
- [ ] API compatibility mantenuta

## Implementazione Dettagliata

### PersonImportService.js (Nuovo File)

```javascript
import logger from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';

class PersonImportService {
  constructor(personService) {
    this.personService = personService;
  }

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
        } else {
          results.errors.push(result.error);
        }
        
        if (result.warning) {
          results.warnings.push(result.warning);
        }
        
      } catch (error) {
        logger.error('Unexpected error in import:', { row: i + 1, error: error.message });
        results.errors.push({ 
          row: i + 1, 
          error: `Errore imprevisto: ${error.message}` 
        });
      }
    }

    return results;
  }

  async processPersonImport(personData, overwriteIds, companyId, tenantId, rowNumber) {
    // 1. Validazione base
    const validation = this.validatePersonData(personData);
    if (!validation.valid) {
      return { 
        success: false, 
        error: { row: rowNumber, error: validation.error } 
      };
    }

    // 2. Controllo duplicati
    const duplicateCheck = await this.checkForDuplicates(personData);
    if (duplicateCheck.found && !overwriteIds.includes(duplicateCheck.existingPerson.id)) {
      return { 
        success: false, 
        error: { 
          row: rowNumber, 
          error: `Persona già esistente: ${duplicateCheck.reason}` 
        } 
      };
    }

    // 3. Preparazione dati
    const processedData = this.preparePersonData(personData);
    const resolvedCompanyId = await this.resolveCompanyId(personData, companyId);
    const roleType = this.personService.constructor.mapRoleType(personData.roleType);

    // 4. Creazione/Aggiornamento
    try {
      if (duplicateCheck.found && overwriteIds.includes(duplicateCheck.existingPerson.id)) {
        await this.personService.updatePerson(duplicateCheck.existingPerson.id, processedData);
      } else {
        await this.personService.createPerson(processedData, roleType, resolvedCompanyId, tenantId);
      }
      
      return { success: true };
      
    } catch (error) {
      if (error.code === 'P2002') {
        return { 
          success: false, 
          error: { 
            row: rowNumber, 
            error: `Violazione vincolo unico: ${error.meta?.target?.join(', ') || 'campo duplicato'}` 
          } 
        };
      }
      throw error;
    }
  }

  validatePersonData(personData) {
    if (!personData.firstName || !personData.lastName) {
      return { 
        valid: false, 
        error: 'Dati obbligatori mancanti (nome, cognome)' 
      };
    }

    if (!personData.taxCode && !personData.email) {
      return { 
        valid: false, 
        error: 'Mancano email o codice fiscale per identificare la persona' 
      };
    }

    return { valid: true };
  }

  async checkForDuplicates(personData) {
    let existingPerson = null;
    let reason = '';

    // Controllo per taxCode
    if (personData.taxCode) {
      existingPerson = await prisma.person.findFirst({
        where: {
          taxCode: personData.taxCode,
          deletedAt: null
        }
      });
      if (existingPerson) {
        reason = `codice fiscale ${personData.taxCode}`;
      }
    }

    // Controllo per email (solo se non trovato per taxCode)
    if (!existingPerson && personData.email) {
      existingPerson = await prisma.person.findFirst({
        where: {
          email: personData.email.toLowerCase(),
          deletedAt: null
        }
      });
      if (existingPerson) {
        reason = `email ${personData.email}`;
      }
    }

    return {
      found: !!existingPerson,
      existingPerson,
      reason
    };
  }

  preparePersonData(personData) {
    return {
      firstName: this.toTitleCase(personData.firstName),
      lastName: this.toTitleCase(personData.lastName),
      email: personData.email ? personData.email.toLowerCase() : null,
      phone: personData.phone,
      taxCode: personData.taxCode?.toUpperCase(),
      birthDate: personData.birthDate ? this.parseDate(personData.birthDate) : null,
      residenceAddress: personData.residenceAddress ? this.toTitleCase(personData.residenceAddress) : null,
      residenceCity: personData.residenceCity ? this.toTitleCase(personData.residenceCity) : null,
      province: personData.province?.toUpperCase(),
      postalCode: personData.postalCode,
      notes: personData.notes,
      title: personData.title ? this.toTitleCase(personData.title) : null,
      password: 'Password123!' // Default password
    };
  }

  // Utility methods...
  toTitleCase(str) {
    if (!str) return str;
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  parseDate(dateStr) {
    // Implementazione parsing date
    return new Date(dateStr);
  }

  async resolveCompanyId(personData, defaultCompanyId) {
    if (defaultCompanyId) return defaultCompanyId;
    if (personData._companyId) return personData._companyId;
    if (personData.companyId) return personData.companyId;
    
    if (personData.companyName) {
      const company = await prisma.company.findFirst({
        where: {
          ragioneSociale: { contains: personData.companyName, mode: 'insensitive' },
          deletedAt: null
        }
      });
      return company?.id || null;
    }
    
    return null;
  }
}

export default PersonImportService;
```

### Aggiornamento PersonService.js

```javascript
// Rimuovere importPersonsFromJSON e importPersonsFromCSV
// Aggiungere:

import PersonImportService from './person/PersonImportService.js';

class PersonService {
  constructor() {
    this.importService = new PersonImportService(this);
  }

  // Delegare alle funzioni del servizio di import
  async importPersonsFromJSON(persons, overwriteIds, companyId, tenantId) {
    return this.importService.importFromJSON(persons, overwriteIds, companyId, tenantId);
  }

  async importPersonsFromCSV(file, companyId, tenantId) {
    return this.importService.importFromCSV(file, companyId, tenantId);
  }
}
```

## Benefici Immediati

### 1. Risoluzione Problema Import
- ✅ Eliminazione errori unique constraint
- ✅ Logica duplicati semplificata
- ✅ Error handling migliorato

### 2. Manutenibilità
- ✅ Codice più leggibile (funzioni < 50 righe)
- ✅ Responsabilità separate
- ✅ Testing più semplice

### 3. Stabilità
- ✅ Meno bug
- ✅ Comportamento prevedibile
- ✅ Rollback più semplice

## Timeline

- **Ora 1**: Creazione PersonImportService
- **Ora 2**: Migrazione logica import
- **Ora 3**: Testing e validazione
- **Ora 4**: Deploy e monitoraggio

## Rischi Mitigati

- ✅ Nessuna modifica API pubblica
- ✅ Backward compatibility mantenuta
- ✅ Rollback immediato possibile
- ✅ Test completi prima del deploy