
# 📊 REPORT ANALISI SCHEMA PRISMA

**Data Analisi**: 2025-07-11T11:24:54.245Z
**Schema Path**: /Users/matteo.michielon/project 2.0/backend/prisma/schema.prisma

## 📈 RIEPILOGO GENERALE

- **Problemi Totali**: 124
- **Priorità Alta**: 1 (Indici, Multi-tenant)
- **Priorità Media**: 19 (Relazioni, Performance)
- **Priorità Bassa**: 104 (Naming, Enum)

## 🚨 PROBLEMI PRIORITÀ ALTA

### Indici Mancanti (0)


### Multi-Tenant Issues (1)
- tenantId nullable: 1

## ⚠️ PROBLEMI PRIORITÀ MEDIA

### Relazioni senza onDelete (19)
- @relation("AssignedRoles")
- @relation("GrantedPermissions")
- @relation("ScheduleTrainer")
- @relation("SessionTrainer")
- @relation("SessionCoTrainer")

### Performance Issues (0)


## 📝 PROBLEMI PRIORITÀ BASSA

### Naming Conventions (98)
- Campi snake_case: 24
- @map superflui: 44

### Opportunità Enum (6)
- Status fields: 0
- Type fields: 6

## 🎯 PROSSIMI PASSI

1. **Fase 2**: Naming & Convenzioni (98 issues)
2. **Fase 3**: Indici & Vincoli (0 issues)
3. **Fase 4**: Relazioni & onDelete (19 issues)
4. **Fase 6**: Multi-tenant & Sicurezza (1 issues)
5. **Fase 7**: Enum & Validazione Tipi (6 issues)

---
*Report generato automaticamente dal Schema Analyzer*
