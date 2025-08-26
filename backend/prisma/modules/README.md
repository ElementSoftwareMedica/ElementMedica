# 📦 SCHEMA PRISMA MODULARIZZATO

## Panoramica
Questo schema è stato modularizzato per migliorare:
- **Manutenibilità**: Ogni modulo gestisce un dominio specifico
- **Scalabilità**: Facile aggiunta di nuovi moduli
- **Collaborazione**: Team diversi possono lavorare su moduli separati
- **Testing**: Test isolati per ogni modulo

## Struttura Moduli

### 📁 CORE
Modelli core del sistema (Tenant, Permission, etc.)
**Modelli**: Tenant, TenantConfiguration, Permission, RefreshToken

### 📁 USERS
Gestione utenti e ruoli
**Modelli**: Person, PersonRole, PersonSession, EnhancedUserRole, CustomRole

### 📁 COMPANIES
Gestione aziende e organizzazioni
**Modelli**: Company, ScheduleCompany

### 📁 COURSES
Sistema corsi e formazione
**Modelli**: Course, CourseSchedule, CourseEnrollment, CourseSession

### 📁 ATTENDANCE
Sistema presenze e registrazioni
**Modelli**: RegistroPresenze, RegistroPresenzePartecipante

### 📁 DOCUMENTS
Gestione documenti e attestati
**Modelli**: Attestato, LetteraIncarico, TemplateLink

### 📁 BILLING
Sistema fatturazione e preventivi
**Modelli**: Preventivo, PreventivoPartecipante, Fattura

### 📁 TESTING
Sistema test e valutazioni
**Modelli**: TestDocument, TestPartecipante

### 📁 AUDIT
Sistema audit e GDPR
**Modelli**: ActivityLog, GdprAuditLog, ConsentRecord

### 📁 MONITORING
Monitoraggio e metriche
**Modelli**: TenantUsage


## Utilizzo

### Sviluppo
1. Modifica i file nei moduli specifici: `prisma/modules/{module}/schema.prisma`
2. Esegui build: `npm run schema:build`
3. Genera client: `npx prisma generate`

### Build Schema
```bash
# Build schema unificato
npm run schema:build

# Verifica schema
npm run schema:validate

# Deploy migrazioni
npm run schema:deploy
```

### Convenzioni
- **Naming**: PascalCase per modelli, camelCase per campi
- **Relazioni**: Sempre specificare onDelete
- **Indici**: Aggiungere per campi di ricerca frequenti
- **Documentazione**: Commentare modelli complessi

## Architettura

```
prisma/
├── schema.prisma          # Schema principale (generato)
├── schema-modular.prisma  # Schema con commenti moduli
└── modules/               # Moduli separati
    ├── core/             # Tenant, Permission
    ├── users/            # Person, Roles
    ├── courses/          # Course, Enrollment
    └── ...
```

## Best Practices

1. **Modularità**: Un modulo = un dominio business
2. **Dipendenze**: Minimizzare dipendenze cross-module
3. **Testing**: Test per ogni modulo
4. **Documentazione**: README per ogni modulo
5. **Versioning**: Versionare modifiche schema

---
*Documentazione generata automaticamente dalla Fase 8*
