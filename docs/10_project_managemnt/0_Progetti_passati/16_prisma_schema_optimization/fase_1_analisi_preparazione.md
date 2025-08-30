# 📊 Fase 1: Analisi e Preparazione

**Durata Stimata**: 1-2 giorni  
**Stato**: In Planning  
**Priorità**: Critica  

## 🎯 Obiettivi Fase 1

1. **Analisi Schema Attuale**: Mappatura completa struttura esistente
2. **Backup Sicurezza**: Protezione dati prima modifiche
3. **Identificazione Dipendenze**: Mapping file/codice impattati
4. **Setup Ambiente Test**: Preparazione testing isolato

## 📋 Task Dettagliati

### 1.1 Analisi Schema Prisma Attuale

#### 1.1.1 Inventario Modelli
- [ ] Conteggio modelli totali
- [ ] Identificazione modelli obsoleti (User, Employee, Role)
- [ ] Mappatura relazioni inter-modelli
- [ ] Analisi campi con naming inconsistente

#### 1.1.2 Audit Naming Conventions
- [ ] Lista campi snake_case da convertire
- [ ] Identificazione @map superflui
- [ ] Verifica @db.* ridondanti
- [ ] Mappatura @@map vs nomi tabelle reali

#### 1.1.3 Analisi Performance
- [ ] Identificazione FK senza indici
- [ ] Verifica campi @unique con gestione NULL
- [ ] Analisi query lente esistenti
- [ ] Mappatura relazioni N+1 potenziali

#### 1.1.4 Audit Sicurezza
- [ ] Verifica tenantId coverage
- [ ] Identificazione campi sensibili GDPR
- [ ] Mappatura soft-delete inconsistencies
- [ ] Analisi permessi multi-tenant

### 1.2 Backup e Sicurezza Dati

#### 1.2.1 Backup Database
```bash
# Backup completo PostgreSQL
pg_dump -h localhost -U postgres -d project_db > backup_pre_optimization_$(date +%Y%m%d_%H%M%S).sql

# Backup schema only
pg_dump -h localhost -U postgres -d project_db --schema-only > schema_backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 1.2.2 Backup Codice
- [ ] Git commit stato attuale
- [ ] Tag versione pre-optimization
- [ ] Backup file critici (schema.prisma, migrations)
- [ ] Documentazione stato corrente

### 1.3 Mappatura Dipendenze

#### 1.3.1 File Backend Impattati
- [ ] `backend/prisma/schema.prisma` (principale)
- [ ] `backend/controllers/*.js` (query Prisma)
- [ ] `backend/services/*.js` (business logic)
- [ ] `backend/routes/*.js` (API endpoints)
- [ ] `backend/middleware/*.js` (auth, tenant)

#### 1.3.2 File Frontend Impattati
- [ ] `src/services/api/*.ts` (API calls)
- [ ] `src/types/*.ts` (TypeScript types)
- [ ] `src/components/**/*.tsx` (UI components)
- [ ] `src/hooks/*.ts` (custom hooks)

#### 1.3.3 File Configurazione
- [ ] `package.json` (dependencies)
- [ ] `.env*` (environment variables)
- [ ] Migration files esistenti
- [ ] Test files (`tests/**/*.js`)

### 1.4 Setup Ambiente Test

#### 1.4.1 Database Test
```bash
# Creazione database test
createdb project_test_db

# Restore backup in test DB
psql -h localhost -U postgres -d project_test_db < backup_pre_optimization.sql
```

#### 1.4.2 Configurazione Test Environment
- [ ] File `.env.test` con DB test
- [ ] Prisma test client configuration
- [ ] Jest setup per testing schema
- [ ] Mock data per testing

#### 1.4.3 Script Validazione
```javascript
// test_schema_integrity.js
// Verifica integrità schema prima/dopo modifiche
```

### 1.5 Analisi Dettagliata Problemi Attuali

#### 1.5.1 Naming Inconsistencies
```prisma
// PROBLEMI IDENTIFICATI:
created_at vs createdAt
deleted_at vs deletedAt
user_id vs userId
company_id vs companyId
```

#### 1.5.2 Indici Mancanti
```prisma
// FK senza indici:
companyId in PersonRole
tenantId in multiple models
scheduleId in CourseSession
```

#### 1.5.3 Relazioni Problematiche
```prisma
// onDelete non specificato:
Person -> PersonRole (dovrebbe essere Cascade)
Company -> Course (dovrebbe essere SetNull)
```

#### 1.5.4 Multi-Tenant Issues
```prisma
// tenantId nullable dove dovrebbe essere required:
Person.tenantId
Company.tenantId
Course.tenantId
```

## 📊 Output Fase 1

### Deliverables
1. **Report Analisi Schema** (`analisi_schema_attuale.md`)
2. **Backup Database** (file .sql con timestamp)
3. **Mappa Dipendenze** (`dipendenze_codice.md`)
4. **Ambiente Test** (configurato e funzionante)
5. **Lista Problemi** (`problemi_identificati.md`)

### Metriche Raccolte
- Numero modelli totali: `__`
- Campi da rinominare: `__`
- Indici da aggiungere: `__`
- Relazioni da sistemare: `__`
- File codice impattati: `__`

## ✅ Criteri di Completamento

- [ ] Schema attuale completamente mappato
- [ ] Backup sicuro creato e verificato
- [ ] Tutte le dipendenze identificate
- [ ] Ambiente test funzionante
- [ ] Lista problemi prioritizzata
- [ ] Team allineato su scope modifiche

## 🚨 Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Perdita dati durante backup | Bassa | Alto | Backup multipli + verifica |
| Dipendenze nascoste | Media | Medio | Analisi codice approfondita |
| Ambiente test non rappresentativo | Media | Alto | Sync completo con produzione |
| Sottostima complessità | Alta | Medio | Buffer tempo + revisioni |

## 📞 Prossimi Passi

Al completamento Fase 1:
1. **Review** risultati con stakeholder
2. **Prioritizzazione** problemi identificati
3. **Planning dettagliato** Fase 2 (Naming)
4. **Go/No-Go** decision per proseguimento

---

**Nota**: Questa fase è fondamentale per il successo dell'intero progetto. Non procedere alla Fase 2 senza completamento 100% di tutti i task.