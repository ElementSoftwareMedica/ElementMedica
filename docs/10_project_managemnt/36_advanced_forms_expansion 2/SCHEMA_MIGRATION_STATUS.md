# Schema Migration Status - Phase 1 Complete

**Data**: 18 Novembre 2025  
**Stato**: Schema Prisma allineato, migration da applicare

---

## ✅ Modifiche Completate allo Schema

### 1. Nuovi Modelli Aggiunti

#### SEOConfig
- Gestione completa SEO per pages e courses
- Campi: title, description, keywords, canonicalUrl
- Open Graph support
- Twitter Card support  
- Structured Data (JSON-LD)
- Relazioni: CMSPage (1:1), Course (1:1), Tenant

#### Sitemap
- Gestione sitemap XML automatica
- Campi: url, changefreq, priority, lastmod
- Entity tracking (entityType, entityId)
- Publishing control (isPublic)
- Relazione: Tenant

### 2. Campi Aggiunti ai Modelli Esistenti

#### Course
- `seoId` (String?, unique) - FK a SEOConfig
- Relazione `seo` - SEOConfig?

#### form_templates
- `settings` (Json?) - Template settings (passingScore, maxScore, timeLimit)
- `isPublic` (Boolean, default: false) - Form pubblico senza auth
- `allowAnonymous` (Boolean, default: false) - Submissions anonime
- INDEX su `isPublic`

#### form_fields  
- `sectionId` (String?) - Assegnazione sezione
- `entityMapping` (Json?) - Mapping Person/Company
- `scoring` (Json?) - Configurazione scoring quiz
- `enableCapacityLimit` (Boolean?, default: false) - Limiti capacità
- `enableQuizMode` (Boolean?, default: false) - Modalità quiz/test
- INDEX su `sectionId`

#### ContactSubmission
- `templateId` (String?) - Reference a form template
- `score` (Float?) - Punteggio quiz
- `maxScore` (Float?) - Punteggio massimo
- `passed` (Boolean?) - Se ha superato test
- INDEX su `templateId`

#### CMSPage
- Relazione `seoConfig` - SEOConfig?

#### Tenant
- Relazioni: `seoConfigs[]`, `sitemaps[]`

---

## 📊 Migration Status

### Current Situation
```
DATABASE: 27 migrations applicate
LOCAL: 25 migrations presenti

Missing LOCAL migrations:
- 20251115141322_fase2_media_library_advanced
- 20251115_add_seo_system

Pending DATABASE migrations:
- 20251104_add_template_enums (locale ma non applicata)
```

### Strategy Forward

**Opzione 1: Baseline Reset (CONSIGLIATO per development)**
```bash
# Backup database
pg_dump $DATABASE_URL > backup-pre-migration.sql

# Reset migrations
npx prisma migrate reset --skip-seed

# Applica tutte le migration
npx prisma migrate deploy

# Seed con nuovi dati
npm run seed
```

**Opzione 2: Incremental Migration (per production)**
```bash
# Pull schema dal database
npx prisma db pull

# Genera solo le differenze
npx prisma migrate dev --name add_advanced_forms_seo

# Applica migration
npx prisma migrate deploy
```

---

## 🎯 Prossimi Step

### Fase 2A: Risoluzione Migration Conflict (15 min)
1. Decidere strategia (reset vs incremental)
2. Backup database attuale
3. Applicare migration
4. Verificare schema allineato

### Fase 2B: Backend Controllers (2 ore)
1. Copiare formsController da backend copia
2. Copiare cmsController da backend copia  
3. Copiare seoController da backend copia
4. Adattare import paths
5. Integrare con middleware esistenti

### Fase 2C: Backend Services (2 ore)
1. Copiare formsService da backend copia
2. Copiare cmsService da backend copia
3. Copiare seoService da backend copia
4. Adattare queries Prisma
5. Test integration

### Fase 2D: Backend Routes (1 ora)
1. Integrare routes forms
2. Integrare routes cms
3. Integrare routes seo
4. Verificare API versioning
5. Test endpoints

---

## ⚠️ Note Importanti

### Breaking Changes
**NESSUNO** - Tutte le modifiche sono additive:
- ✅ Nessuna colonna eliminata
- ✅ Nessuna tabella rinominata
- ✅ Solo campi opzionali aggiunti
- ✅ Solo nuove tabelle create

### Backward Compatibility
- ✅ Tutte le query esistenti continuano a funzionare
- ✅ Nuovi campi hanno default o sono nullable
- ✅ Nessun impatto su codice esistente

### Performance Impact
- ✅ Nuovi indici migliorano performance
- ✅ Relazioni ottimizzate
- ✅ Query esistenti non impattate

---

## 📝 Files Modificati

```
backend/prisma/schema.prisma
  - +92 linee (2 nuovi modelli)
  - +15 campi nuovi
  - +8 indici nuovi
  - +4 relazioni nuove
```

---

## ✅ Validazione

```bash
✅ npx prisma validate
   "The schema at prisma/schema.prisma is valid 🚀"

✅ npx prisma generate  
   "Generated Prisma Client (v5.22.0) in 519ms"

⏳ npx prisma migrate dev
   (pending - risoluzione conflict)
```

---

**Status**: Schema pronto, in attesa applicazione migration

