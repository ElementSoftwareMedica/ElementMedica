# 🔗 MAPPATURA DIPENDENZE - User/Employee/Role → Person

## 🎯 Obiettivo

Mappatura completa di tutti i riferimenti a `User`, `Employee` e `Role` nel codebase che dovranno essere aggiornati durante il refactoring verso l'entità unificata `Person`.

---

## 📊 STATISTICHE DIPENDENZE

### Totale Riferimenti Identificati
- **User**: 45+ riferimenti in 25+ file
- **Employee**: 15+ riferimenti in 10+ file  
- **Role**: 20+ riferimenti in 15+ file
- **PersonRole**: 15+ riferimenti (già moderni) ✅

### Distribuzione per Categoria
| Categoria | User | Employee | Role | PersonRole |
|-----------|------|----------|------|------------|
| Auth/Middleware | 15 | 0 | 5 | 8 |
| Routes | 12 | 3 | 3 | 2 |
| Services | 8 | 2 | 8 | 3 |
| Tests | 10 | 10 | 2 | 2 |

---

## 🔐 CATEGORIA: AUTH/MIDDLEWARE

### File Critici da Aggiornare

#### `/backend/auth/middleware.js` ⚠️ CRITICO
**Riferimenti User**: Sistema autenticazione principale
```javascript
// ATTUALE (da aggiornare)
const user = await prisma.user.findUnique({
  where: { id: userId, eliminato: false }
});

// TARGET (Person unificato)
const person = await prisma.person.findUnique({
  where: { id: personId, deletedAt: null }
});
```

#### `/backend/auth/routes.js` ⚠️ CRITICO
**Riferimenti**: 6 query User + 2 UserRole
- Linea 79: `prisma.user.findUnique` (login)
- Linea 135: `prisma.user.update` (lastLogin)
- Linea 404: `prisma.user.findUnique` (register check)
- Linea 423: `prisma.user.create` (register)
- Linea 448: `prisma.userRole.create` (assign role)
- Linea 495: `prisma.user.findUnique` (profile)

#### `/backend/auth/jwt-advanced.js`
**Riferimenti**: 1 query User
- Linea 206: `prisma.user.update` (lastLogin)

#### `/backend/middleware/rbac.js` ⚠️ CRITICO
**Riferimenti**: 3 query User + 1 UserRole
- Linea 20: `prisma.user.findUnique` (authorization)
- Linea 96: `prisma.userRole.findMany` (roles check)
- Linea 132: `prisma.user.findUnique` (permission check)
- Linea 202: `prisma.user.findUnique` (admin check)

#### `/backend/middleware/auth-advanced.js`
**Riferimenti**: 3 query User
- Linea 317: `prisma.user.findUnique` (auth)
- Linea 325: `prisma.user.update` (lastLogin)
- Linea 365: `prisma.user.update` (activity)

---

## 🛣️ CATEGORIA: ROUTES

### File da Aggiornare

#### `/backend/routes/v1/auth.js` ⚠️ CRITICO
**Riferimenti**: 4 query User + 1 UserRole
- Linea 321: `prisma.user.findUnique` (register check)
- Linea 336: `prisma.user.create` (register)
- Linea 357: `prisma.userRole.create` (assign role)
- Linea 653: `prisma.user.findUnique` (profile)

#### `/backend/routes/users-routes.js`
**Riferimenti**: 2 query User
- Linea 115: `prisma.user.findUnique` (update check)
- Linea 127: `prisma.user.update` (update user)

#### `/backend/routes/auth-advanced.js`
**Riferimenti**: 2 query User
- Linea 52: `prisma.user.findUnique` (login)
- Linea 152: `prisma.user.update` (lastLogin)

---

## 🔧 CATEGORIA: SERVICES

### File da Aggiornare

#### `/backend/services/gdpr-service.js` ⚠️ GDPR CRITICO
**Riferimenti**: 3 query User + 1 UserRole
- Linea 251: `prisma.user.update` (anonymize)
- Linea 265: `prisma.user.delete` (hard delete)
- Linea 354: `prisma.user.findUnique` (export data)
- Linea 370: `prisma.userRole.findMany` (export roles)

**⚠️ ATTENZIONE GDPR**: Questo file gestisce cancellazione e export dati personali

#### `/backend/services/tenantService.js`
**Riferimenti**: 1 query User + 1 Role
- Linea 182: `prisma.user.updateMany` (tenant update)
- Linea 332: `prisma.role.create` (create role)

#### `/backend/services/enhancedRoleService.js`
**Riferimenti**: 7 query EnhancedUserRole
- Linea 164: `prisma.enhancedUserRole.update`
- Linea 176: `prisma.enhancedUserRole.create`
- Linea 201: `prisma.enhancedUserRole.updateMany`
- Linea 241: `prisma.enhancedUserRole.findMany`
- Linea 351: `prisma.enhancedUserRole.findMany`
- Linea 383: `prisma.enhancedUserRole.update`
- Linea 429: `prisma.enhancedUserRole.updateMany`

#### `/backend/services/personService.js` ✅ MODERNO
**Riferimenti**: 2 query PersonRole (già corretti)
- Linea 183: `prisma.personRole.create` ✅
- Linea 206: `prisma.personRole.updateMany` ✅

---

## 🧪 CATEGORIA: TESTS

### File da Aggiornare

#### `/backend/tests/auth.test.js`
**Riferimenti**: 3 query User + 2 Employee
- Linea 38: `prisma.user.create` (test user)
- Linea 54: `prisma.employee.deleteMany` (cleanup)
- Linea 55: `prisma.user.deleteMany` (cleanup)
- Linea 116: `prisma.user.findUnique` (test)
- Linea 127: `prisma.user.findUnique` (test)

#### `/backend/tests/documents.test.js`
**Riferimenti**: 3 query User + 5 Employee
- Linea 44: `prisma.user.create` (test user)
- Linea 57: `prisma.employee.create` (test employee)
- Linea 78: `prisma.employee.deleteMany` (cleanup)
- Linea 79: `prisma.user.deleteMany` (cleanup)
- Linea 101: `prisma.employee.findUnique` (test)
- Linea 213: `prisma.employee.create` (test)
- Linea 230: `prisma.employee.delete` (cleanup)

#### `/backend/tests/setup.js`
**Riferimenti**: 2 query User + 2 Employee
- Linea 58: `prisma.employee.deleteMany` (cleanup)
- Linea 60: `prisma.user.deleteMany` (cleanup)
- Linea 93: `prisma.user.create` (helper)
- Linea 109: `prisma.employee.create` (helper)

#### `/backend/tests/personController.test.js` ✅ MODERNO
**Riferimenti**: 2 query PersonRole (già corretti)
- Linea 284: `mockPrisma.personRole.create` ✅
- Linea 304: `mockPrisma.personRole.deleteMany` ✅

---

## 📜 CATEGORIA: SCRIPTS E UTILITIES

### File da Aggiornare

#### `/backend/create-admin.js`
**Riferimenti**: 1 query User + 1 UserRole
- Linea 50: `prisma.user.create` (admin creation)
- Linea 75: `prisma.userRole.create` (admin role)

#### `/backend/init-admin.js`
**Riferimenti**: 1 query User + 1 Role
- Linea 57: `prisma.role.create` (role creation)
- Linea 104: `prisma.user.create` (admin creation)

#### `/backend/reset-admin-password.js`
**Riferimenti**: 2 query User
- Linea 11: `prisma.user.findUnique` (find admin)
- Linea 29: `prisma.user.update` (update password)

#### `/backend/prisma/seed.js`
**Riferimenti**: 1 query Employee
- Linea 26: `prisma.employee.create` (seed data)

---

## 🔄 PIANO MIGRAZIONE DIPENDENZE

### Fase 1: Preparazione (Priorità CRITICA)

#### 1.1 Backup Query Esistenti
```bash
# Backup di tutte le query User/Employee/Role
grep -r "prisma\.(user|employee|role)\.(find\|create\|update\|delete)" backend/ > backup_queries.txt
```

#### 1.2 Creazione Script Migrazione
```javascript
// Script per convertire automaticamente le query
const migrateQueries = {
  'prisma.user.findUnique': 'prisma.person.findUnique',
  'prisma.user.findMany': 'prisma.person.findMany',
  'prisma.user.create': 'prisma.person.create',
  'prisma.user.update': 'prisma.person.update',
  'prisma.user.delete': 'prisma.person.delete',
  'eliminato: false': 'deletedAt: null',
  'eliminato: true': 'deletedAt: { not: null }'
};
```

### Fase 2: Migrazione per Categoria

#### 2.1 Auth/Middleware (Giorni 1-2)
**Ordine di Migrazione**:
1. `/backend/auth/middleware.js` - Sistema autenticazione base
2. `/backend/middleware/rbac.js` - Sistema autorizzazioni
3. `/backend/auth/routes.js` - Endpoint autenticazione
4. `/backend/auth/jwt-advanced.js` - JWT management
5. `/backend/middleware/auth-advanced.js` - Auth avanzato

#### 2.2 Routes (Giorni 3-4)
**Ordine di Migrazione**:
1. `/backend/routes/v1/auth.js` - API v1 auth
2. `/backend/routes/users-routes.js` - User management
3. `/backend/routes/auth-advanced.js` - Auth avanzato

#### 2.3 Services (Giorni 5-6)
**Ordine di Migrazione**:
1. `/backend/services/gdpr-service.js` - ⚠️ GDPR CRITICO
2. `/backend/services/tenantService.js` - Multi-tenant
3. `/backend/services/enhancedRoleService.js` - Role management

#### 2.4 Tests e Scripts (Giorni 7)
**Ordine di Migrazione**:
1. `/backend/tests/setup.js` - Test utilities
2. `/backend/tests/auth.test.js` - Auth tests
3. `/backend/tests/documents.test.js` - Document tests
4. Scripts di utilità

### Fase 3: Verifica e Test (Giorni 8)

#### 3.1 Test Automatizzati
```bash
# Test per ogni file migrato
node test_migration_auth.cjs
node test_migration_routes.cjs
node test_migration_services.cjs
```

#### 3.2 Verifica GDPR
```bash
# Test specifici GDPR
node test_gdpr_compliance.cjs
node test_data_export.cjs
node test_data_deletion.cjs
```

---

## ⚠️ RISCHI E MITIGAZIONI

### Rischi Identificati

#### 1. 🔐 Rottura Autenticazione
**Rischio**: Sistema auth non funzionante
**Impatto**: 🔴 CRITICO
**Mitigazione**: 
- Test isolati per ogni file
- Rollback immediato se problemi
- Backup completo pre-migrazione

#### 2. 📊 Perdita Dati
**Rischio**: Dati User/Employee persi
**Impatto**: 🔴 CRITICO
**Mitigazione**:
- Script migrazione dati testato
- Backup database completo
- Verifica integrità post-migrazione

#### 3. 🛡️ Violazione GDPR
**Rischio**: Accesso dati non autorizzato
**Impatto**: 🔴 CRITICO
**Mitigazione**:
- Test GDPR per ogni endpoint
- Audit trail completo
- Verifica controlli accesso

#### 4. 🧪 Test Falliti
**Rischio**: Test suite non funzionante
**Impatto**: 🟡 MEDIO
**Mitigazione**:
- Aggiornamento test parallelo
- Mock data aggiornati
- Test coverage mantenuto

### Piano Rollback

#### Rollback Immediato
```bash
# Ripristino da backup
cp -r backup_project_pre_refactoring/* ./
psql -d database < backup_pre_refactoring.sql
```

#### Rollback Parziale
```bash
# Rollback singolo file
git checkout HEAD~1 -- backend/auth/middleware.js
npm test
```

---

## 📊 CHECKLIST MIGRAZIONE

### Pre-Migrazione
- [ ] Backup completo database
- [ ] Backup completo codice
- [ ] Test baseline funzionanti
- [ ] Script migrazione testati

### Durante Migrazione
- [ ] Test isolati per ogni file
- [ ] Verifica GDPR per ogni endpoint
- [ ] Log dettagliati modifiche
- [ ] Rollback plan pronto

### Post-Migrazione
- [ ] Test suite completa
- [ ] Verifica performance
- [ ] Audit sicurezza
- [ ] Documentazione aggiornata

---

## 🎯 METRICHE SUCCESSO

### Metriche Tecniche
- ✅ **0 query User/Employee/Role** rimanenti
- ✅ **100% test** funzionanti
- ✅ **0 regressioni** funzionali
- ✅ **Performance** mantenuta o migliorata

### Metriche GDPR
- ✅ **100% endpoint** con controlli accesso
- ✅ **Audit trail** completo
- ✅ **Data export** funzionante
- ✅ **Data deletion** conforme

### Metriche Qualitative
- ✅ **Codice** più semplice e manutenibile
- ✅ **Schema** unificato e coerente
- ✅ **Documentazione** aggiornata
- ✅ **Team** formato su nuova architettura

---

**Data Mappatura**: 29 Dicembre 2024  
**File Analizzati**: 35+  
**Dipendenze Identificate**: 80+  
**Priorità**: CRITICA per Auth/Middleware  
**Prossimo Step**: Creazione script migrazione automatica