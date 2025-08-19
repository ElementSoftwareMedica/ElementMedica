# PLANNING RISOLUZIONE COMPANIES PERMISSIONS

**Data:** 6 Gennaio 2025  
**Versione:** 1.0  
**Stato:** In Corso  

## 🎯 OBIETTIVI

### Problemi Identificati
1. **Login 401 Error**: L'admin non riesce più ad effettuare il login
2. **Accesso Companies**: L'admin non può visualizzare la pagina companies
3. **Gestione Permessi Avanzata**: Manca la possibilità di limitare i permessi per:
   - Visualizzare solo dati della propria compagnia
   - Modificare solo dati della propria compagnia
   - Visualizzare scheduled courses come formatore o partecipante
   - Selezionare specifici campi visibili (es. nome, sede ma non IBAN)

### Obiettivi Finali
- ✅ Ripristinare funzionalità di login admin
- ✅ Abilitare accesso pagina companies per admin
- ✅ Implementare sistema permessi granulare per compagnie
- ✅ Implementare controllo accesso ai dati sensibili
- ✅ Mantenere conformità GDPR

## 🔍 ANALISI PROBLEMA

### 1. Stato Attuale Sistema

#### Server Status
- **API Server (4001)**: Terminato per applicare modifiche routing
- **Frontend (5173)**: Attivo
- **Proxy Vite**: Configurato correttamente per `/api` → `http://localhost:4001`

#### Modifiche Applicate
- ✅ Router companies aggiornato da `/companies` a `/api/v1/companies` in `api-server.js`
- ⏳ Server backend richiede riavvio per applicare modifiche

#### Test Risultati
- ✅ Autenticazione funziona attraverso proxy frontend
- ✅ Admin ha tutti i permessi companies necessari
- ❌ API companies restituisce 404 (server non aggiornato)
- ❌ Login frontend fallisce con 401 (server non attivo)

### 2. Architettura Permessi Attuale

#### Sistema Ruoli
```typescript
enum RoleType {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN', 
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  TRAINER = 'TRAINER'
}
```

#### Permessi Companies Esistenti
```typescript
const companiesPermissions = {
  'companies:read': true,
  'companies:manage': true,
  'companies:view': true,
  'companies:create': true,
  'companies:edit': true,
  'companies:delete': true
}
```

#### Limitazioni Attuali
- ❌ Nessun controllo per compagnia di appartenenza
- ❌ Nessun controllo granulare sui campi
- ❌ Nessun controllo per scheduled courses
- ❌ Permessi binari (tutto o niente)

## 📋 PLANNING DETTAGLIATO

### FASE 1: Ripristino Funzionalità Base
**Priorità:** CRITICA  
**Tempo stimato:** 15 minuti

#### 1.1 Riavvio Server Backend
- **Azione**: Informare utente di riavviare `node backend/api-server.js`
- **Verifica**: Test endpoint `/api/v1/companies` attraverso proxy
- **Risultato atteso**: API companies accessibile

#### 1.2 Test Login e Companies Access
- **Azione**: Eseguire test completo autenticazione
- **Verifica**: Login admin + accesso pagina companies
- **Risultato atteso**: Admin può accedere a companies

### FASE 2: Analisi Sistema Permessi Avanzato
**Priorità:** ALTA  
**Tempo stimato:** 30 minuti

#### 2.1 Mappatura Requisiti Permessi
- **Company-Scoped Permissions**: Permessi limitati alla propria compagnia
- **Field-Level Permissions**: Controllo granulare sui campi
- **Role-Based Data Access**: Accesso basato su ruolo e relazione

#### 2.2 Design Schema Permessi
```typescript
interface AdvancedPermission {
  resource: string;           // 'companies', 'employees', 'courses'
  action: string;            // 'read', 'write', 'delete'
  scope: 'global' | 'company' | 'self'; // Ambito permesso
  fields?: string[];         // Campi specifici accessibili
  conditions?: {
    companyId?: string;      // Limitazione per compagnia
    roleType?: RoleType[];   // Ruoli che possono accedere
  };
}
```

### FASE 3: Implementazione Sistema Permessi Granulare
**Priorità:** ALTA  
**Tempo stimato:** 2 ore

#### 3.1 Estensione Schema Database
```sql
-- Tabella per permessi avanzati
CREATE TABLE advanced_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_role_id UUID REFERENCES person_roles(id),
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  scope VARCHAR(20) NOT NULL DEFAULT 'global',
  allowed_fields JSONB,
  conditions JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indici per performance
CREATE INDEX idx_advanced_permissions_person_role ON advanced_permissions(person_role_id);
CREATE INDEX idx_advanced_permissions_resource ON advanced_permissions(resource, action);
```

#### 3.2 Middleware Controllo Permessi
```typescript
// Middleware per controllo permessi granulare
const checkAdvancedPermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const person = req.person;
    const targetCompanyId = req.params.companyId || req.body.companyId;
    
    // Verifica permessi avanzati
    const hasPermission = await advancedPermissionService.checkPermission({
      personId: person.id,
      resource,
      action,
      targetCompanyId,
      requestedFields: req.query.fields
    });
    
    if (!hasPermission.allowed) {
      return res.status(403).json({
        error: 'Accesso negato',
        reason: hasPermission.reason,
        allowedFields: hasPermission.allowedFields
      });
    }
    
    // Filtra campi in base ai permessi
    req.allowedFields = hasPermission.allowedFields;
    next();
  };
};
```

#### 3.3 Service Permessi Avanzati
```typescript
class AdvancedPermissionService {
  async checkPermission(params: {
    personId: string;
    resource: string;
    action: string;
    targetCompanyId?: string;
    requestedFields?: string[];
  }) {
    const { personId, resource, action, targetCompanyId, requestedFields } = params;
    
    // Recupera person con ruoli e compagnia
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        personRoles: {
          where: { deletedAt: null },
          include: { advancedPermissions: true }
        },
        company: true
      }
    });
    
    // Logica controllo permessi
    for (const role of person.personRoles) {
      const permission = role.advancedPermissions.find(p => 
        p.resource === resource && p.action === action
      );
      
      if (permission) {
        // Verifica scope
        if (permission.scope === 'company' && 
            person.companyId !== targetCompanyId) {
          continue;
        }
        
        // Verifica campi
        const allowedFields = this.filterAllowedFields(
          requestedFields,
          permission.allowedFields
        );
        
        return {
          allowed: true,
          allowedFields,
          scope: permission.scope
        };
      }
    }
    
    return {
      allowed: false,
      reason: 'Permesso non trovato',
      allowedFields: []
    };
  }
  
  private filterAllowedFields(requested: string[], allowed: string[]) {
    if (!allowed || allowed.includes('*')) return requested;
    return requested?.filter(field => allowed.includes(field)) || allowed;
  }
}
```

### FASE 4: Implementazione Frontend
**Priorità:** MEDIA  
**Tempo stimato:** 1 ora

#### 4.1 Hook Permessi Avanzati
```typescript
const useAdvancedPermissions = () => {
  const { user } = useAuth();
  
  const checkPermission = useCallback((resource: string, action: string, targetCompanyId?: string) => {
    // Logica controllo permessi lato frontend
    return permissionService.checkAdvancedPermission({
      userId: user.id,
      resource,
      action,
      targetCompanyId
    });
  }, [user]);
  
  const getVisibleFields = useCallback((resource: string, action: string) => {
    return permissionService.getVisibleFields(user.id, resource, action);
  }, [user]);
  
  return { checkPermission, getVisibleFields };
};
```

#### 4.2 Componenti Condizionali
```typescript
const CompanyDataTable = () => {
  const { getVisibleFields } = useAdvancedPermissions();
  const visibleFields = getVisibleFields('companies', 'read');
  
  return (
    <DataTable
      data={companies}
      columns={columns.filter(col => visibleFields.includes(col.key))}
    />
  );
};
```

### FASE 5: Testing e Validazione
**Priorità:** ALTA  
**Tempo stimato:** 45 minuti

#### 5.1 Test Scenari Permessi
- **SUPER_ADMIN**: Accesso completo a tutte le compagnie
- **COMPANY_ADMIN**: Accesso solo alla propria compagnia
- **MANAGER**: Accesso limitato ai dipendenti della propria compagnia
- **EMPLOYEE**: Accesso solo ai propri dati
- **TRAINER**: Accesso ai corsi dove è formatore

#### 5.2 Test Campi Sensibili
- **Dati finanziari**: Solo SUPER_ADMIN e COMPANY_ADMIN
- **Dati personali**: Solo con consenso GDPR
- **Dati aziendali**: Basato su ruolo e compagnia

## 🚀 IMPLEMENTAZIONE

### Step 1: Riavvio Server (IMMEDIATO)
**Richiede azione utente**: Riavviare `node backend/api-server.js`

### Step 2: Verifica Funzionalità Base
Test completo login e accesso companies

### Step 3: Implementazione Schema Avanzato
Estensione database e middleware

### Step 4: Frontend Adattivo
Componenti che rispettano permessi granulari

### Step 5: Testing Completo
Validazione tutti gli scenari

## 📊 METRICHE SUCCESSO

- ✅ Login admin funzionante
- ✅ Accesso pagina companies per admin
- ✅ COMPANY_ADMIN vede solo la propria compagnia
- ✅ MANAGER vede solo dipendenti della propria compagnia
- ✅ Campi sensibili nascosti per ruoli non autorizzati
- ✅ Conformità GDPR mantenuta
- ✅ Performance accettabili (<500ms per controllo permessi)

## 🔒 CONSIDERAZIONI GDPR

### Audit Trail Obbligatorio
```typescript
// Tracciare tutti gli accessi ai dati
await prisma.gdprAuditLog.create({
  data: {
    personId: req.person.id,
    action: 'VIEW_COMPANY_DATA',
    dataType: 'COMPANY_FINANCIAL',
    targetId: companyId,
    allowedFields: req.allowedFields,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  }
});
```

### Minimizzazione Dati
- Solo campi necessari per il ruolo
- Mascheramento dati sensibili
- Accesso basato su necessità lavorativa

### Consenso Informato
- Verifica consenso prima dell'accesso
- Tracciamento revoche consenso
- Rispetto diritto all'oblio

---

**PROSSIMO STEP**: Informare utente di riavviare server backend per applicare modifiche routing companies.