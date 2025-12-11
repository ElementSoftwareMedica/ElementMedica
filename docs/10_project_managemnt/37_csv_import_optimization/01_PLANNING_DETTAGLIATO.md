# 📋 CSV Import Optimization - Planning Dettagliato

**Progetto:** 37_csv_import_optimization  
**Data:** 22 Novembre 2025  
**Versione:** 1.0  
**Stato:** 🚀 READY FOR IMPLEMENTATION

---

## 📑 Indice

1. [Task Breakdown](#-task-breakdown)
2. [Fasi di Implementazione](#-fasi-di-implementazione)
3. [Dipendenze tra Task](#-dipendenze-tra-task)
4. [Priorità e Criticità](#-priorit%C3%A0-e-criticit%C3%A0)
5. [Risorse e Tempi](#-risorse-e-tempi)

---

## 🎯 Task Breakdown

### FASE 1: Analysis & Cleanup (1 giorno - 8h)

#### Task 1.1: Analisi Codice Esistente (3h)
**Descrizione:** Mappatura completa di tutti i file coinvolti nel sistema di import  
**Output:**
- Documento `analysis/company_import_current_flow.md`
- Documento `analysis/person_import_current_flow.md`
- Documento `analysis/code_inventory.md` con lista file da modificare/eliminare

**File da analizzare:**
- Frontend:
  - `src/components/companies/CompanyImport.tsx` ✅
  - `src/components/companies/company-import/CompanyImportRefactored.tsx` ✅
  - `src/components/companies/CompanyImportConflictModal.tsx` ✅
  - `src/components/persons/person-import/PersonImportRefactored.tsx` ✅
  - `src/components/shared/GenericImport.tsx` ✅
  - `src/components/shared/GenericImport/` (tutti i file)
  - `src/components/trainers/TrainerImport.tsx`
- Backend:
  - `backend/routes/companies-routes.js` (POST /import) ✅
  - `backend/routes/person-routes.js` (POST /import) ✅
  - `backend/services/person/PersonImportService.js` ✅
  - `backend/services/person/import/PersonImport.js` ✅
  - `backend/controllers/personController.js` (importPersons) ✅

**Deliverable:**
```markdown
# Code Inventory

## Files to Modify
- [ ] path/to/file.tsx (reason)

## Files to Delete
- [ ] path/to/obsolete.tsx (reason)

## Files to Create
- [ ] path/to/new-file.tsx (reason)
```

#### Task 1.2: Identificazione Codice Duplicato (2h)
**Descrizione:** Trovare logica duplicata tra Company/Person import da consolidare  
**Output:**
- Lista funzioni condivise da estrarre
- Design utility module `backend/utils/importValidation.js`
- Design utility module `src/utils/importHelpers.ts`

**Funzioni comuni identificate:**
- Normalizzazione CF/PIVA
- Parsing CSV
- Rilevamento duplicati
- Formattazione errori
- Generazione report

#### Task 1.3: Pulizia File Obsoleti (1h)
**Descrizione:** Rimuovere file legacy non più utilizzati  
**Criteri:**
- File con commento "legacy" o "deprecated"
- File non importati da nessuna parte
- File duplicati

**Azioni:**
1. Spostare in `/cleanup-temp/37_removed/`
2. Aggiornare import nei file che li usavano
3. Verificare che build funzioni

#### Task 1.4: Setup Struttura Progetto (2h)
**Descrizione:** Creare cartelle e file base per nuova implementazione  
**Output:**
```
src/
├── components/
│   ├── import/
│   │   ├── common/
│   │   │   ├── ImportConflictResolutionPanel.tsx
│   │   │   ├── ImportPreviewTable.tsx
│   │   │   ├── ImportSummary.tsx
│   │   │   └── BulkCompanyAssignmentPanel.tsx
│   │   ├── company/
│   │   │   ├── CompanyImportModal.tsx (refactored)
│   │   │   └── CompanyImportConflictModal.tsx (enhanced)
│   │   ├── employee/
│   │   │   ├── EmployeeImportModal.tsx (NEW)
│   │   │   └── EmployeeImportConflictModal.tsx (NEW)
│   │   └── trainer/
│   │       ├── TrainerImportModal.tsx (NEW)
│   │       ├── TrainerImportConflictModal.tsx (NEW)
│   │       └── TrainerCredentialsDisplay.tsx (NEW)
│   └── ...
├── services/
│   ├── import/
│   │   ├── companyImport.ts
│   │   ├── employeeImport.ts
│   │   └── trainerImport.ts
│   └── ...
└── utils/
    ├── importHelpers.ts (NEW)
    └── importValidation.ts (NEW)

backend/
├── routes/
│   ├── company-import-routes.js (consolidato)
│   ├── employee-import-routes.js (NEW)
│   └── trainer-import-routes.js (NEW)
├── services/
│   ├── company/
│   │   └── CompanyImportService.js (refactored)
│   ├── employee/
│   │   └── EmployeeImportService.js (NEW)
│   └── trainer/
│       ├── TrainerImportService.js (NEW)
│       └── TrainerAccountService.js (NEW)
└── utils/
    ├── importValidation.js (NEW)
    └── credentialsGenerator.js (NEW)
```

---

### FASE 2: Company Import Optimization (2 giorni - 16h)

#### Task 2.1: Refactoring Backend Company Import (4h)
**Descrizione:** Semplificare e migliorare logica backend  
**File:** `backend/routes/companies-routes.js` (POST /import)

**Problemi attuali:**
- Codice molto lungo e complesso (500+ linee)
- Logica annidata difficile da seguire
- Gestione sedi mista con Company

**Soluzione:**
1. Estrarre in `backend/services/company/CompanyImportService.js`:
   - `validateCompanyBatch(companies)` - Validazione pre-import
   - `detectPivaConflicts(companies, tenantId)` - Rileva duplicati PIVA
   - `importCompany(companyData, resolutions, tenantId)` - Import singola azienda
   - `createCompanySite(companyId, siteData, tenantId)` - Creazione sede
   - `updateCompany(companyId, companyData)` - Aggiornamento
2. Route diventa solo orchestrator (< 100 linee)

**Codice target:**
```javascript
// backend/routes/company-import-routes.js
router.post('/import', authenticateToken(), checkPermission('companies:create'),
  async (req, res) => {
    const { companies, overwriteIds = [] } = req.body;
    const tenantId = req.person.tenantId;
    
    // Validation
    const validation = await companyImportService.validateBatch(companies);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors });
    }
    
    // Detect conflicts
    const conflicts = await companyImportService.detectConflicts(companies, tenantId);
    if (conflicts.length > 0 && overwriteIds.length === 0) {
      return res.status(409).json({ conflicts });
    }
    
    // Import
    const results = await companyImportService.importBatch(
      companies, 
      overwriteIds, 
      tenantId
    );
    
    res.json(results);
  }
);
```

#### Task 2.2: Enhanced Conflict Modal - Add Site Option (4h)
**Descrizione:** Migliorare modal conflitti con opzione "Aggiungi come sede"  
**File:** `src/components/import/company/CompanyImportConflictModal.tsx`

**Nuove features:**
1. **Terza opzione risoluzione:**
   ```tsx
   type ConflictResolution = 
     | { action: 'skip' }
     | { action: 'overwrite', companyId: string }
     | { action: 'add_site', companyId: string, siteName: string }
   ```

2. **Form inline per nome sede:**
   ```tsx
   {resolution.action === 'add_site' && (
     <input
       type="text"
       placeholder="Nome nuova sede"
       value={resolution.siteName}
       onChange={(e) => updateResolution(index, { siteName: e.target.value })}
     />
   )}
   ```

3. **Mostra sedi esistenti:**
   ```tsx
   {conflict.existingCompany.sites.length > 0 && (
     <div className="existing-sites">
       <h5>Sedi esistenti:</h5>
       <ul>
         {conflict.existingCompany.sites.map(site => (
           <li key={site.id}>{site.siteName} - {site.citta}</li>
         ))}
       </ul>
     </div>
   )}
   ```

#### Task 2.3: Improved Data Diff Display (3h)
**Descrizione:** Visualizzazione migliore delle differenze tra dati  
**File:** `src/components/import/common/ImportConflictResolutionPanel.tsx`

**Features:**
1. **Highlight differenze:**
   ```tsx
   <div className="data-comparison">
     <div className="column">
       <h6>Da Importare</h6>
       {Object.entries(newData).map(([key, value]) => (
         <div className={value !== existingData[key] ? 'different' : ''}>
           <strong>{key}:</strong> {value}
         </div>
       ))}
     </div>
     <div className="column">
       <h6>In Database</h6>
       {Object.entries(existingData).map(([key, value]) => (
         <div className={value !== newData[key] ? 'different' : ''}>
           <strong>{key}:</strong> {value}
         </div>
       ))}
     </div>
   </div>
   ```

2. **Color coding:**
   - Verde: campo uguale
   - Giallo: campo diverso
   - Rosso: campo mancante

#### Task 2.4: Batch Resolution Actions (2h)
**Descrizione:** Azioni rapide per risolvere tutti i conflitti in una volta  
**File:** `src/components/import/company/CompanyImportConflictModal.tsx`

**Features:**
```tsx
<div className="batch-actions">
  <button onClick={() => resolveAll('skip')}>
    Salta tutti
  </button>
  <button onClick={() => resolveAll('overwrite')}>
    Sovrascrivi tutti
  </button>
  <button onClick={() => resolveAll('add_site')}>
    Aggiungi tutti come sedi
  </button>
</div>
```

#### Task 2.5: Testing Company Import (3h)
**Descrizione:** Test completi per company import  
**File:** `backend/__tests__/company-import.test.js`

**Test cases:**
1. Import azienda nuova (PIVA univoca)
2. Import azienda con PIVA duplicata → conflict
3. Risoluzione conflict: skip
4. Risoluzione conflict: overwrite
5. Risoluzione conflict: add site
6. Import batch con mix (nuove + duplicati)
7. Validazione PIVA (rimozione IT, spazi, solo numeri)
8. Import senza PIVA ma con CF
9. Soft delete recovery

---

### FASE 3: Employee Import Implementation (3 giorni - 24h)

#### Task 3.1: Backend EmployeeImportService (6h)
**Descrizione:** Creare servizio dedicato per import dipendenti  
**File:** `backend/services/employee/EmployeeImportService.js`

**Metodi principali:**
```javascript
class EmployeeImportService {
  /**
   * Valida batch dipendenti prima import
   */
  async validateBatch(employees, tenantId) {
    // 1. Valida campi obbligatori (firstName, lastName, taxCode)
    // 2. Normalizza CF (uppercase, trim)
    // 3. Verifica duplicati nel batch stesso
    // 4. Valida formato email (se presente)
    return { valid: boolean, errors: [] };
  }

  /**
   * Rileva conflitti CF con Person esistenti
   */
  async detectConflicts(employees, tenantId) {
    const conflicts = [];
    
    for (const emp of employees) {
      const normalized CF = this.normalizeTaxCode(emp.taxCode);
      
      // Cerca Person esistente con stesso CF
      const existing = await prisma.person.findFirst({
        where: {
          taxCode: normalizedCF,
          tenantId,
          deletedAt: null
        },
        include: { personRoles: true }
      });
      
      if (existing) {
        conflicts.push({
          employee: emp,
          existingPerson: existing,
          type: existing.personRoles.some(r => r.roleType === 'EMPLOYEE')
            ? 'duplicate_employee'
            : 'person_exists_different_role'
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Risolve azienda da nome o PIVA
   */
  async resolveCompany(companyNameOrPiva, tenantId) {
    // 1. Prova con PIVA normalizzata
    const normalizedPiva = this.normalizePiva(companyNameOrPiva);
    let company = await prisma.company.findFirst({
      where: { piva: normalizedPiva, tenantId, deletedAt: null }
    });
    
    // 2. Se non trovata, prova con nome (case insensitive)
    if (!company) {
      company = await prisma.company.findFirst({
        where: {
          ragioneSociale: { contains: companyNameOrPiva, mode: 'insensitive' },
          tenantId,
          deletedAt: null
        }
      });
    }
    
    return company;
  }

  /**
   * Import batch dipendenti con risoluzioni conflitti
   */
  async importBatch(employees, resolutions, tenantId) {
    const results = { created: [], updated: [], errors: [] };
    
    for (const emp of employees) {
      try {
        // Risolvi azienda
        const company = await this.resolveCompany(emp.companyName || emp.companyPiva, tenantId);
        if (!company && !resolutions[emp.index]?.companyId) {
          results.errors.push({ 
            index: emp.index, 
            error: 'Azienda non trovata' 
          });
          continue;
        }
        
        const companyId = company?.id || resolutions[emp.index]?.companyId;
        
        // Gestisci conflitto
        const resolution = resolutions[emp.index];
        if (resolution?.action === 'skip') continue;
        
        if (resolution?.action === 'overwrite') {
          // Aggiorna Person esistente
          const updated = await this.updatePerson(resolution.personId, emp, companyId, tenantId);
          results.updated.push(updated);
        } else {
          // Crea nuova Person + PersonRole
          const created = await this.createEmployee(emp, companyId, tenantId);
          results.created.push(created);
        }
        
      } catch (error) {
        results.errors.push({ index: emp.index, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Crea Employee (Person + PersonRole)
   */
  async createEmployee(employeeData, companyId, tenantId) {
    return await prisma.$transaction(async (tx) => {
      // 1. Crea Person
      const person = await tx.person.create({
        data: {
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          taxCode: this.normalizeTaxCode(employeeData.taxCode),
          email: employeeData.email,
          phone: employeeData.phone,
          birthDate: employeeData.birthDate,
          birthPlace: employeeData.birthPlace,
          residenceAddress: employeeData.residenceAddress,
          residenceCity: employeeData.residenceCity,
          residenceProvince: employeeData.residenceProvince,
          residencePostalCode: employeeData.residencePostalCode,
          notes: employeeData.notes,
          companyId,
          tenantId
        }
      });
      
      // 2. Crea PersonRole (EMPLOYEE)
      await tx.personRole.create({
        data: {
          personId: person.id,
          roleType: 'EMPLOYEE'
        }
      });
      
      return person;
    });
  }

  /**
   * Aggiorna Person esistente
   */
  async updatePerson(personId, employeeData, companyId, tenantId) {
    return await prisma.person.update({
      where: { id: personId },
      data: {
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        email: employeeData.email,
        phone: employeeData.phone,
        birthDate: employeeData.birthDate,
        // ... altri campi
        companyId
      }
    });
  }

  /**
   * Normalizza Codice Fiscale
   */
  normalizeTaxCode(taxCode) {
    return taxCode.toUpperCase().trim();
  }

  /**
   * Normalizza P.IVA
   */
  normalizePiva(piva) {
    return piva.replace(/\s+/g, '').replace(/^IT/, '').replace(/\D/g, '');
  }
}
```

#### Task 3.2: Backend Employee Import Route (2h)
**Descrizione:** Endpoint dedicato per import dipendenti  
**File:** `backend/routes/employee-import-routes.js`

```javascript
import express from 'express';
import EmployeeImportService from '../services/employee/EmployeeImportService.js';

const router = express.Router();
const employeeImportService = new EmployeeImportService();

/**
 * POST /api/employees/import
 * Import batch employees from CSV
 */
router.post('/import', 
  authenticateToken(),
  requirePermission('persons:create'),
  async (req, res) => {
    try {
      const { employees, resolutions = {} } = req.body;
      const tenantId = req.person.tenantId;
      
      // Validate
      const validation = await employeeImportService.validateBatch(employees, tenantId);
      if (!validation.valid) {
        return res.status(400).json({ errors: validation.errors });
      }
      
      // Detect conflicts
      const conflicts = await employeeImportService.detectConflicts(employees, tenantId);
      if (conflicts.length > 0 && Object.keys(resolutions).length === 0) {
        return res.status(409).json({ conflicts });
      }
      
      // Import
      const results = await employeeImportService.importBatch(employees, resolutions, tenantId);
      
      res.json({
        success: true,
        results,
        summary: {
          total: employees.length,
          created: results.created.length,
          updated: results.updated.length,
          errors: results.errors.length
        }
      });
      
    } catch (error) {
      logger.error('Employee import failed:', error);
      res.status(500).json({ error: 'Import failed' });
    }
  }
);

export default router;
```

#### Task 3.3: Frontend EmployeeImportModal (6h)
**Descrizione:** Modal completo per import dipendenti  
**File:** `src/components/import/employee/EmployeeImportModal.tsx`

**Features:**
1. **CSV Upload & Preview:**
   ```tsx
   const [employees, setEmployees] = useState<EmployeeData[]>([]);
   const [conflicts, setConflicts] = useState<EmployeeConflict[]>([]);
   const [invalidCompanies, setInvalidCompanies] = useState<number[]>([]);
   
   const handleFileUpload = async (file: File) => {
     const data = await parseCSV(file, EMPLOYEE_CSV_HEADERS);
     
     // Normalizza CF
     const normalized = data.map(emp => ({
       ...emp,
       taxCode: normalizeTaxCode(emp.taxCode)
     }));
     
     // Match companies
     const withCompanies = await matchCompanies(normalized);
     
     // Flag invalid companies
     const invalid = withCompanies
       .map((emp, idx) => emp.companyId ? null : idx)
       .filter(idx => idx !== null);
     
     setEmployees(withCompanies);
     setInvalidCompanies(invalid);
   };
   ```

2. **Company Assignment Panel:**
   ```tsx
   {invalidCompanies.length > 0 && (
     <BulkCompanyAssignmentPanel
       employees={employees}
       invalidIndices={invalidCompanies}
       onAssign={(indices, companyId) => {
         setEmployees(prev => prev.map((emp, idx) =>
           indices.includes(idx) ? { ...emp, companyId } : emp
         ));
         setInvalidCompanies(prev => prev.filter(i => !indices.includes(i)));
       }}
     />
   )}
   ```

3. **Preview Table:**
   ```tsx
   <EmployeePreviewTable
     employees={employees}
     onRowSelect={setSelectedRows}
     invalidCompanies={invalidCompanies}
   />
   ```

4. **Import Flow:**
   ```tsx
   const handleImport = async () => {
     // Send to API
     const response = await employeeImportService.importEmployees(employees);
     
     if (response.conflicts) {
       // Show conflict modal
       setConflicts(response.conflicts);
       setShowConflictModal(true);
     } else {
       // Show success
       toast.success(`${response.summary.created} dipendenti importati`);
       onClose();
     }
   };
   ```

#### Task 3.4: Frontend EmployeeImportConflictModal (4h)
**Descrizione:** Modal risoluzione conflitti dipendenti  
**File:** `src/components/import/employee/EmployeeImportConflictModal.tsx`

**Layout:**
```tsx
<Modal title="Conflitti Codice Fiscale">
  {conflicts.map(conflict => (
    <ConflictCard key={conflict.index}>
      <ConflictHeader>
        Riga {conflict.index + 1}: {conflict.employee.firstName} {conflict.employee.lastName}
      </ConflictHeader>
      
      <ConflictType>
        {conflict.type === 'duplicate_employee' 
          ? '⚠️ Codice Fiscale già presente come Employee'
          : '⚠️ Persona con stesso CF già presente (ruolo diverso)'
        }
      </ConflictType>
      
      <DataComparison
        newData={conflict.employee}
        existingData={conflict.existingPerson}
      />
      
      <ResolutionOptions>
        <Radio
          value="skip"
          checked={resolutions[conflict.index]?.action === 'skip'}
          onChange={() => updateResolution(conflict.index, { action: 'skip' })}
        >
          Salta (mantieni esistente)
        </Radio>
        
        <Radio
          value="overwrite"
          checked={resolutions[conflict.index]?.action === 'overwrite'}
          onChange={() => updateResolution(conflict.index, { 
            action: 'overwrite',
            personId: conflict.existingPerson.id
          })}
        >
          Sovrascrivi dati
        </Radio>
        
        {conflict.type === 'person_exists_different_role' && (
          <Radio
            value="add_role"
            checked={resolutions[conflict.index]?.action === 'add_role'}
            onChange={() => updateResolution(conflict.index, { 
              action: 'add_role',
              personId: conflict.existingPerson.id
            })}
          >
            Aggiungi ruolo EMPLOYEE
          </Radio>
        )}
      </ResolutionOptions>
    </ConflictCard>
  ))}
  
  <BatchActions>
    <Button onClick={() => resolveAll('skip')}>Salta tutti</Button>
    <Button onClick={() => resolveAll('overwrite')}>Sovrascrivi tutti</Button>
  </BatchActions>
  
  <Footer>
    <Button onClick={onClose}>Annulla</Button>
    <Button onClick={handleConfirm} primary>
      Conferma ({Object.keys(resolutions).length}/{conflicts.length})
    </Button>
  </Footer>
</Modal>
```

#### Task 3.5: BulkCompanyAssignmentPanel Component (3h)
**Descrizione:** Componente riutilizzabile per assegnazione aziende  
**File:** `src/components/import/common/BulkCompanyAssignmentPanel.tsx`

**Features:**
```tsx
interface BulkCompanyAssignmentPanelProps {
  employees: EmployeeData[];
  invalidIndices: number[];
  companies: Company[];
  onAssign: (indices: number[], companyId: string) => void;
}

export const BulkCompanyAssignmentPanel: React.FC<Props> = ({
  employees,
  invalidIndices,
  companies,
  onAssign
}) => {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  
  return (
    <Panel className="bulk-assignment">
      <Header>
        <AlertIcon />
        <Title>{invalidIndices.length} dipendenti senza azienda valida</Title>
      </Header>
      
      <Filter>
        <label>Filtra per:</label>
        <Select onChange={(e) => {
          if (e.target.value === 'invalid') {
            setSelectedRows(invalidIndices);
          } else {
            setSelectedRows([]);
          }
        }}>
          <option value="all">Tutti</option>
          <option value="invalid">Solo senza azienda</option>
        </Select>
      </Filter>
      
      <EmployeeList>
        {employees.map((emp, idx) => (
          <EmployeeRow
            key={idx}
            selected={selectedRows.includes(idx)}
            invalid={invalidIndices.includes(idx)}
            onClick={() => toggleRow(idx)}
          >
            <Checkbox checked={selectedRows.includes(idx)} />
            <Name>{emp.firstName} {emp.lastName}</Name>
            <TaxCode>{emp.taxCode}</TaxCode>
            <Company>
              {emp.companyId 
                ? `✓ ${emp.companyName}`
                : `⚠️ ${emp.companyName || 'Non specificata'}`
              }
            </Company>
          </EmployeeRow>
        ))}
      </EmployeeList>
      
      <AssignmentControls>
        <Label>Selezionati: {selectedRows.length}</Label>
        <CompanySelect
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
        >
          <option value="">Seleziona azienda...</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>
              {company.ragioneSociale} {company.piva && `(${company.piva})`}
            </option>
          ))}
        </CompanySelect>
        <Button
          onClick={() => {
            onAssign(selectedRows, selectedCompany);
            setSelectedRows([]);
            setSelectedCompany('');
          }}
          disabled={!selectedCompany || selectedRows.length === 0}
        >
          Applica
        </Button>
      </AssignmentControls>
    </Panel>
  );
};
```

#### Task 3.6: Testing Employee Import (3h)
**Descrizione:** Test completi per employee import  
**File:** `backend/__tests__/employee-import.test.js`

**Test cases:**
1. Import employee nuovo (CF univoco)
2. Import employee con CF duplicato → conflict
3. Risoluzione conflict: skip
4. Risoluzione conflict: overwrite
5. Import con azienda valida (match by PIVA)
6. Import con azienda valida (match by name)
7. Import con azienda non trovata → error
8. Validazione CF (uppercase, trim)
9. Creazione Person + PersonRole correttamente
10. Import batch mix (nuovi + duplicati + invalid companies)

---

### FASE 4: Trainer Import Implementation (3 giorni - 24h)

#### Task 4.1: Backend TrainerAccountService (4h)
**Descrizione:** Servizio per creazione account trainer  
**File:** `backend/services/trainer/TrainerAccountService.js`

```javascript
import crypto from 'crypto';
import bcrypt from 'bcrypt';

class TrainerAccountService {
  /**
   * Genera username univoco nel formato nome.cognome
   * Se esiste già, aggiunge numero progressivo: nome.cognome1, nome.cognome2, ecc.
   */
  async generateUniqueUsername(email, firstName, lastName, tenantId) {
    // Normalizza firstName e lastName (rimuovi spazi e accenti, lowercase)
    const normalizedFirstName = firstName.toLowerCase()
      .replace(/\s+/g, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    const normalizedLastName = lastName.toLowerCase()
      .replace(/\s+/g, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Formato base: nome.cognome
    const baseUsername = `${normalizedFirstName}.${normalizedLastName}`;
    
    // Verifica univocità
    let username = baseUsername;
    let counter = 1;
    
    while (await this.usernameExists(username, tenantId)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }
    
    return username;
  }

  /**
   * Verifica se username esiste già
   */
  async usernameExists(username, tenantId) {
    const existing = await prisma.user.findFirst({
      where: { username, tenantId }
    });
    return !!existing;
  }

  /**
   * Genera password standard per tutti i trainer
   * Password fissa: "Password123!"
   * L'utente dovrà cambiarla al primo accesso (mustChangePassword=true)
   */
  generateSecurePassword() {
    // Password standard per tutti i trainer
    return 'Password123!';
  }

  /**
   * Crea account User per trainer
   */
  async createTrainerAccount(personId, email, username, tenantId) {
    // Genera password
    const plainPassword = this.generateSecurePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    // Crea User
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        globalRole: 'TRAINER',
        personId,
        tenantId,
        mustChangePassword: true,
        isActive: true
      }
    });
    
    return {
      user,
      plainPassword // Per invio email
    };
  }

  /**
   * Invia email con credenziali
   */
  async sendWelcomeEmail(email, username, password) {
    // Usa EmailService esistente
    const emailService = new EmailService();
    
    await emailService.send({
      to: email,
      subject: 'Benvenuto - Credenziali Account Formatore',
      template: 'trainer-welcome',
      data: {
        username,
        password,
        loginUrl: process.env.FRONTEND_URL + '/login'
      }
    });
  }
}

export default TrainerAccountService;
```

#### Task 4.2: Backend TrainerImportService (5h)
**Descrizione:** Servizio per import trainers  
**File:** `backend/services/trainer/TrainerImportService.js`

```javascript
import TrainerAccountService from './TrainerAccountService.js';

class TrainerImportService {
  constructor() {
    this.accountService = new TrainerAccountService();
  }

  /**
   * Valida batch trainers
   */
  async validateBatch(trainers, tenantId) {
    const errors = [];
    
    for (let i = 0; i < trainers.length; i++) {
      const trainer = trainers[i];
      
      // Campi obbligatori
      if (!trainer.firstName || !trainer.lastName) {
        errors.push({ index: i, error: 'Nome e cognome obbligatori' });
      }
      
      if (!trainer.taxCode) {
        errors.push({ index: i, error: 'Codice Fiscale obbligatorio' });
      }
      
      // EMAIL OBBLIGATORIA per trainer (serve per account)
      if (!trainer.email || !this.isValidEmail(trainer.email)) {
        errors.push({ index: i, error: 'Email valida obbligatoria per formatori' });
      }
      
      // Verifica email univoca nel batch
      const duplicateEmail = trainers.findIndex((t, idx) => 
        idx !== i && t.email === trainer.email
      );
      if (duplicateEmail !== -1) {
        errors.push({ 
          index: i, 
          error: `Email duplicata con riga ${duplicateEmail + 1}` 
        });
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Rileva conflitti
   */
  async detectConflicts(trainers, tenantId) {
    const conflicts = [];
    
    for (const trainer of trainers) {
      const normalizedCF = this.normalizeTaxCode(trainer.taxCode);
      
      // Cerca Person esistente
      const existingPerson = await prisma.person.findFirst({
        where: {
          taxCode: normalizedCF,
          tenantId,
          deletedAt: null
        },
        include: {
          personRoles: true,
          user: true
        }
      });
      
      if (existingPerson) {
        const hasTrainerRole = existingPerson.personRoles.some(r => r.roleType === 'TRAINER');
        
        conflicts.push({
          trainer,
          existingPerson,
          type: hasTrainerRole 
            ? 'duplicate_trainer' 
            : 'person_exists_different_role',
          hasAccount: !!existingPerson.user
        });
      }
      
      // Verifica email univoca
      const existingEmail = await prisma.user.findFirst({
        where: { email: trainer.email, tenantId }
      });
      
      if (existingEmail && existingEmail.personId !== existingPerson?.id) {
        conflicts.push({
          trainer,
          type: 'duplicate_email',
          existingUser: existingEmail
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Import batch trainers
   */
  async importBatch(trainers, resolutions, tenantId) {
    const results = {
      created: [],
      updated: [],
      errors: [],
      credentials: [] // Per email/download
    };
    
    for (const trainer of trainers) {
      try {
        const resolution = resolutions[trainer.index];
        
        if (resolution?.action === 'skip') continue;
        
        if (resolution?.action === 'overwrite') {
          // Aggiorna Person esistente
          const updated = await this.updateTrainer(
            resolution.personId,
            trainer,
            tenantId
          );
          results.updated.push(updated);
        } else if (resolution?.action === 'add_role') {
          // Aggiungi ruolo + crea account
          const updated = await this.addTrainerRole(
            resolution.personId,
            trainer,
            tenantId
          );
          results.updated.push(updated.person);
          results.credentials.push(updated.credentials);
        } else {
          // Crea nuovo Trainer
          const created = await this.createTrainer(trainer, tenantId);
          results.created.push(created.person);
          results.credentials.push(created.credentials);
        }
        
      } catch (error) {
        results.errors.push({
          index: trainer.index,
          error: error.message
        });
      }
    }
    
    // Invia email credenziali
    for (const cred of results.credentials) {
      try {
        await this.accountService.sendWelcomeEmail(
          cred.email,
          cred.username,
          cred.password
        );
      } catch (emailError) {
        logger.warn('Failed to send welcome email:', emailError);
        // Non bloccare import per email fallite
      }
    }
    
    return results;
  }

  /**
   * Crea Trainer (Person + PersonRole + User)
   */
  async createTrainer(trainerData, tenantId) {
    return await prisma.$transaction(async (tx) => {
      // 1. Crea Person
      const person = await tx.person.create({
        data: {
          firstName: trainerData.firstName,
          lastName: trainerData.lastName,
          taxCode: this.normalizeTaxCode(trainerData.taxCode),
          email: trainerData.email,
          phone: trainerData.phone,
          birthDate: trainerData.birthDate,
          birthPlace: trainerData.birthPlace,
          residenceAddress: trainerData.residenceAddress,
          residenceCity: trainerData.residenceCity,
          residenceProvince: trainerData.residenceProvince,
          residencePostalCode: trainerData.residencePostalCode,
          notes: trainerData.notes,
          tenantId
        }
      });
      
      // 2. Crea PersonRole (TRAINER)
      await tx.personRole.create({
        data: {
          personId: person.id,
          roleType: 'TRAINER'
        }
      });
      
      // 3. Genera username
      const username = trainerData.username || 
        await this.accountService.generateUniqueUsername(
          trainerData.email,
          trainerData.firstName,
          trainerData.lastName,
          tenantId
        );
      
      // 4. Crea User account
      const { user, plainPassword } = await this.accountService.createTrainerAccount(
        person.id,
        trainerData.email,
        username,
        tenantId
      );
      
      return {
        person,
        credentials: {
          email: trainerData.email,
          username,
          password: plainPassword
        }
      };
    });
  }

  /**
   * Aggiorna Trainer esistente
   */
  async updateTrainer(personId, trainerData, tenantId) {
    return await prisma.person.update({
      where: { id: personId },
      data: {
        firstName: trainerData.firstName,
        lastName: trainerData.lastName,
        email: trainerData.email,
        phone: trainerData.phone,
        birthDate: trainerData.birthDate,
        // ... altri campi
      }
    });
  }

  /**
   * Aggiungi ruolo TRAINER a Person esistente
   */
  async addTrainerRole(personId, trainerData, tenantId) {
    return await prisma.$transaction(async (tx) => {
      // 1. Aggiungi PersonRole
      await tx.personRole.create({
        data: {
          personId,
          roleType: 'TRAINER'
        }
      });
      
      // 2. Crea User account
      const person = await tx.person.findUnique({ where: { id: personId } });
      
      const username = trainerData.username || 
        await this.accountService.generateUniqueUsername(
          trainerData.email,
          person.firstName,
          person.lastName,
          tenantId
        );
      
      const { user, plainPassword } = await this.accountService.createTrainerAccount(
        personId,
        trainerData.email,
        username,
        tenantId
      );
      
      return {
        person,
        credentials: {
          email: trainerData.email,
          username,
          password: plainPassword
        }
      };
    });
  }

  normalizeTaxCode(taxCode) {
    return taxCode.toUpperCase().trim();
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

export default TrainerImportService;
```

#### Task 4.3: Backend Trainer Import Route (2h)
**Descrizione:** Endpoint per import trainers  
**File:** `backend/routes/trainer-import-routes.js`

```javascript
import express from 'express';
import TrainerImportService from '../services/trainer/TrainerImportService.js';

const router = express.Router();
const trainerImportService = new TrainerImportService();

/**
 * POST /api/trainers/import
 */
router.post('/import',
  authenticateToken(),
  requirePermission('persons:create'),
  async (req, res) => {
    try {
      const { trainers, resolutions = {} } = req.body;
      const tenantId = req.person.tenantId;
      
      // Validate
      const validation = await trainerImportService.validateBatch(trainers, tenantId);
      if (!validation.valid) {
        return res.status(400).json({ errors: validation.errors });
      }
      
      // Detect conflicts
      const conflicts = await trainerImportService.detectConflicts(trainers, tenantId);
      if (conflicts.length > 0 && Object.keys(resolutions).length === 0) {
        return res.status(409).json({ conflicts });
      }
      
      // Import
      const results = await trainerImportService.importBatch(trainers, resolutions, tenantId);
      
      res.json({
        success: true,
        results,
        summary: {
          total: trainers.length,
          created: results.created.length,
          updated: results.updated.length,
          errors: results.errors.length,
          credentialsGenerated: results.credentials.length
        }
      });
      
    } catch (error) {
      logger.error('Trainer import failed:', error);
      res.status(500).json({ error: 'Import failed' });
    }
  }
);

export default router;
```

#### Task 4.4: Frontend TrainerImportModal (5h)
**Descrizione:** Modal import trainers  
**File:** `src/components/import/trainer/TrainerImportModal.tsx`

**Similar to EmployeeImportModal but with:**
1. Email validation obbligatoria
2. Preview credenziali che verranno generate
3. No company assignment (trainers non appartengono ad aziende)

#### Task 4.5: Frontend TrainerCredentialsDisplay (3h)
**Descrizione:** Componente per mostrare credenziali generate  
**File:** `src/components/import/trainer/TrainerCredentialsDisplay.tsx`

```tsx
interface Credential {
  email: string;
  username: string;
  password: string;
}

interface Props {
  credentials: Credential[];
  onClose: () => void;
}

export const TrainerCredentialsDisplay: React.FC<Props> = ({ credentials, onClose }) => {
  const downloadCSV = () => {
    const csv = [
      'Email,Username,Password',
      ...credentials.map(c => `${c.email},${c.username},${c.password}`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trainer-credentials-${Date.now()}.csv`;
    a.click();
  };
  
  return (
    <Modal title="Credenziali Formatori Generate">
      <Alert type="success">
        {credentials.length} account creati. 
        Email di benvenuto inviate.
      </Alert>
      
      <Alert type="warning">
        ⚠️ Salva queste credenziali! Non saranno più visibili.
      </Alert>
      
      <CredentialsTable>
        <thead>
          <tr>
            <th>Email</th>
            <th>Username</th>
            <th>Password Temporanea</th>
          </tr>
        </thead>
        <tbody>
          {credentials.map((cred, idx) => (
            <tr key={idx}>
              <td>{cred.email}</td>
              <td>{cred.username}</td>
              <td>
                <PasswordField value={cred.password} />
                <CopyButton text={cred.password} />
              </td>
            </tr>
          ))}
        </tbody>
      </CredentialsTable>
      
      <Actions>
        <Button onClick={downloadCSV} icon={<Download />}>
          Scarica CSV Credenziali
        </Button>
        <Button onClick={onClose} primary>
          Chiudi
        </Button>
      </Actions>
    </Modal>
  );
};
```

#### Task 4.6: Email Template - Trainer Welcome (2h)
**Descrizione:** Template email per credenziali trainer  
**File:** `backend/email-templates/trainer-welcome.hbs`

```handlebars
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Benvenuto - Credenziali Account</title>
</head>
<body>
  <h1>Benvenuto nel Sistema Formazione</h1>
  
  <p>Ciao,</p>
  
  <p>È stato creato un account formatore per te. Ecco le tue credenziali di accesso:</p>
  
  <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
    <p><strong>Username:</strong> {{username}}</p>
    <p><strong>Password Temporanea:</strong> {{password}}</p>
    <p><strong>URL Login:</strong> <a href="{{loginUrl}}">{{loginUrl}}</a></p>
  </div>
  
  <p><strong>⚠️ IMPORTANTE:</strong></p>
  <ul>
    <li>Al primo accesso ti sarà richiesto di cambiare la password</li>
    <li>Conserva queste credenziali in un luogo sicuro</li>
    <li>Non condividere la tua password con nessuno</li>
  </ul>
  
  <p>Per qualsiasi problema, contatta l'amministratore.</p>
  
  <p>Buon lavoro!</p>
</body>
</html>
```

#### Task 4.7: Testing Trainer Import (3h)
**Descrizione:** Test completi trainer import  
**File:** `backend/__tests__/trainer-import.test.js`

**Test cases:**
1. Import trainer nuovo (CF + email univoci)
2. Import trainer con CF duplicato → conflict
3. Import trainer con email duplicata → conflict
4. Generazione username da firstName.lastName
5. Verifica unicità username con contatore progressivo
6. Password standard "Password123!"
7. Creazione Person + PersonRole + User
8. Invio email credenziali
9. Download CSV credenziali

---

### FASE 5: Testing & Refinement (2 giorni - 16h)

#### Task 5.1: Unit Tests - Validation Utils (3h)
**File:** `backend/__tests__/utils/importValidation.test.js`

**Test:**
- Normalizzazione PIVA
- Normalizzazione CF
- Validazione email
- Rilevamento duplicati in batch
- Formattazione errori

#### Task 5.2: Integration Tests - Full Import Flows (5h)
**File:** `backend/__tests__/integration/import-flows.test.js`

**Scenari:**
1. Import 100 aziende nuove
2. Import 50 aziende + 30 duplicati (mix resolutions)
3. Import 200 dipendenti con company assignment
4. Import 100 dipendenti + 20 conflicts
5. Import 50 trainers con generazione account
6. Import mix: aziende + dipendenti + trainers

#### Task 5.3: E2E Tests - User Flows (4h)
**File:** `tests/e2e/csv-import.spec.ts`

**Scenari Playwright:**
1. User carica CSV aziende, risolve conflitti, conferma import
2. User carica CSV dipendenti, assegna aziende, risolve conflitti
3. User carica CSV trainers, visualizza credenziali, scarica CSV

#### Task 5.4: Performance Testing (2h)
**File:** `backend/__tests__/performance/import-performance.test.js`

**Benchmark:**
- Import 1000 aziende < 10 secondi
- Import 5000 dipendenti < 30 secondi
- Import 500 trainers (con account) < 20 secondi

#### Task 5.5: Bug Fixing & Optimization (2h)
- Risolvere issue trovati durante testing
- Ottimizzare query database
- Migliorare UX based on feedback

---

### FASE 6: Documentation & Deployment (1 giorno - 8h)

#### Task 6.1: User Documentation (2h)
**File:** `docs/user-guide/csv-import-guide.md`

**Contenuto:**
- Come preparare CSV per import
- Template CSV per Company/Employee/Trainer
- Guida passo-passo import
- Gestione conflitti
- FAQ e troubleshooting

#### Task 6.2: API Documentation (2h)
**File:** `docs/api/import-endpoints.md`

**Documenta:**
- POST /api/companies/import
- POST /api/employees/import
- POST /api/trainers/import
- Request/Response schemas
- Error codes
- Examples

#### Task 6.3: Template CSV Files (1h)
**File:** `docs/10_project_managemnt/37_csv_import_optimization/templates/`

**Crea:**
- `company_import_template.csv`
- `employee_import_template.csv`
- `trainer_import_template.csv`

Con headers e 2-3 righe di esempio

#### Task 6.4: Deployment Guide (1h)
**File:** `docs/deployment/csv-import-deployment.md`

**Checklist:**
- [ ] Merge feature branch
- [ ] Run migrations (se necessarie)
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Smoke tests in production
- [ ] Rollback plan

#### Task 6.5: Release Notes (1h)
**File:** `CHANGELOG.md`

**Documenta:**
- Nuove features
- Breaking changes
- Migration guide
- Known issues

#### Task 6.6: Training Materials (1h)
**File:** `docs/training/csv-import-training.md`

**Video/Slides:**
- Demo import aziende
- Demo import dipendenti
- Demo import trainers
- Best practices

---

## 🔗 Dipendenze tra Task

```
FASE 1 (Analysis)
├─ Task 1.1 (Analysis) ─┬─> Task 1.2 (Identify Duplicates)
│                        └─> Task 1.3 (Cleanup)
└─ Task 1.4 (Setup) ────────> Tutte le altre fasi

FASE 2 (Company)
├─ Task 2.1 (Backend) ──────> Task 2.5 (Tests)
├─ Task 2.2 (Modal) ────────> Task 2.5 (Tests)
├─ Task 2.3 (Diff Display) ─> Task 2.2
└─ Task 2.4 (Batch Actions) ─> Task 2.2

FASE 3 (Employee)
├─ Task 3.1 (Backend) ──────> Task 3.2 (Route) ──> Task 3.6 (Tests)
├─ Task 3.3 (Modal) ────────> Task 3.6 (Tests)
├─ Task 3.4 (Conflict) ─────> Task 3.3
└─ Task 3.5 (Bulk Assign) ──> Task 3.3

FASE 4 (Trainer)
├─ Task 4.1 (Account Svc) ──> Task 4.2 (Import Svc) ──> Task 4.3 (Route) ──> Task 4.7
├─ Task 4.4 (Modal) ────────> Task 4.7 (Tests)
├─ Task 4.5 (Credentials) ──> Task 4.4
└─ Task 4.6 (Email) ────────> Task 4.2

FASE 5 (Testing)
└─ Richiede completamento Fasi 2, 3, 4

FASE 6 (Documentation)
└─ Richiede completamento Fase 5
```

---

## ⚡ Priorità e Criticità

### Priorità ALTA 🔴
- Task 1.1: Analisi codice (blocca tutto)
- Task 2.1: Backend Company (base per altri)
- Task 3.1: Backend Employee (core feature)
- Task 4.2: Backend Trainer (core feature)

### Priorità MEDIA 🟡
- Task 2.2: Modal conflitti Company
- Task 3.3: Modal Employee
- Task 3.5: Bulk company assignment
- Task 4.4: Modal Trainer

### Priorità BASSA 🟢
- Task 2.3: Data diff display (nice to have)
- Task 2.4: Batch actions (convenience)
- Task 4.5: Credentials display (can be simple)
- Task 4.6: Email template (can use basic)

---

## 📊 Risorse e Tempi

### Timeline Ottimizzato

**Settimana 1:**
- Giorno 1: FASE 1 completa (8h)
- Giorno 2-3: FASE 2 completa (16h)

**Settimana 2:**
- Giorno 4-6: FASE 3 completa (24h)

**Settimana 3:**
- Giorno 7-9: FASE 4 completa (24h)

**Settimana 4:**
- Giorno 10-11: FASE 5 completa (16h)
- Giorno 12: FASE 6 completa (8h)

**TOTALE: 12 giorni lavorativi (96 ore)**

### Risorse Richieste

**Sviluppatore Full-Stack:**
- 12 giorni full-time
- Competenze: React, TypeScript, Node.js, Prisma, PostgreSQL

**Designer UI/UX (opzionale):**
- 2 giorni per review modals
- Feedback su UX import flows

**QA Tester:**
- 2 giorni per testing manuale
- Verifica scenari edge case

---

## 📈 Metriche di Successo

### Code Quality
- [ ] 80%+ test coverage
- [ ] 0 TypeScript errors
- [ ] 0 ESLint errors
- [ ] < 5 code smells (SonarQube)

### Performance
- [ ] Import 100 aziende < 5s
- [ ] Import 500 dipendenti < 10s
- [ ] Import 50 trainers < 15s
- [ ] Lighthouse score > 90

### UX
- [ ] Risoluzione conflitti < 2 min (10 conflitti)
- [ ] Bulk assignment < 30s (20 dipendenti)
- [ ] Download credenziali < 5s

### Business
- [ ] 0% duplicati PIVA in production
- [ ] 0% duplicati CF in production
- [ ] 100% dipendenti con azienda valida
- [ ] 100% trainers con account funzionante

---

## 🎯 Next Steps

1. Review questo planning con stakeholders
2. Approval per procedere
3. Creare branch `feature/csv-import-optimization`
4. Kickoff FASE 1

---

**Ultimo Aggiornamento:** 22 Novembre 2025  
**Status:** ✅ READY FOR APPROVAL
