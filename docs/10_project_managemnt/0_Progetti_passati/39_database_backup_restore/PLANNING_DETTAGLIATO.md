# Progetto 39: Sistema Backup e Restore Database

**Data Creazione**: 1 Dicembre 2025  
**Branch**: feature/settings-templates-redesign  
**Priorità**: ALTA  
**Complessità**: MEDIA-ALTA (3-4 giorni)

---

## 📋 EXECUTIVE SUMMARY

### Obiettivo
Implementare un sistema completo di backup e restore del database accessibile dalla sezione `/settings/backup` dell'applicazione. L'utente potrà selezionare quali entità esportare, scaricare un file compresso contenente tutti i dati, e successivamente ripristinarli.

### Valore Aggiunto
- **Disaster Recovery**: Possibilità di ripristinare rapidamente lo stato del sistema
- **Migrazione**: Facilita lo spostamento dati tra ambienti (dev → staging → production)
- **Testing**: Snapshot del database per test e debugging
- **Audit**: Backup periodici per compliance GDPR

---

## 🏗️ ARCHITETTURA TECNICA

### Formato Backup: JSON + ZIP
**Motivazioni**:
1. **Leggibilità**: JSON è human-readable per debug
2. **Portabilità**: Indipendente dal database engine
3. **Compressione**: ZIP riduce dimensioni (-70/80%)
4. **Struttura**: Ogni tabella in file separato per restore selettivo
5. **Metadati**: Include versione schema, timestamp, checksum

### Struttura File Backup
```
backup_20251201_120000.zip
├── manifest.json           # Metadati backup
├── schema_version.json     # Versione Prisma schema
├── data/
│   ├── tenants.json
│   ├── persons.json
│   ├── companies.json
│   ├── courses.json
│   ├── schedules.json
│   ├── cms_pages.json
│   ├── cms_media.json
│   ├── templates.json
│   ├── form_templates.json
│   └── ... (altre 50+ tabelle)
├── media/
│   ├── uploads/           # File caricati
│   └── documents/         # Documenti generati
└── checksums.json         # Verifica integrità
```

---

## 📊 ENTITÀ DATABASE (58 tabelle)

### Categoria: Core Business
| Tabella | Records | Priorità | Note |
|---------|---------|----------|------|
| tenants | ~3 | CRITICA | Multi-tenancy base |
| persons | ~100 | CRITICA | Utenti, dipendenti, trainer |
| Company | ~50 | CRITICA | Aziende clienti |
| CompanySite | ~80 | ALTA | Sedi aziendali |
| Course | ~30 | ALTA | Catalogo corsi |
| CourseSchedule | ~200 | ALTA | Programmazione corsi |

### Categoria: CMS e Contenuti
| Tabella | Records | Priorità | Note |
|---------|---------|----------|------|
| cms_pages | ~25 | CRITICA | Contenuti pagine pubbliche |
| cms_media | ~100 | ALTA | Media library |
| cms_media_folders | ~10 | MEDIA | Organizzazione media |
| cms_navigation | ~20 | MEDIA | Menu navigazione |

### Categoria: Templates e Documenti
| Tabella | Records | Priorità | Note |
|---------|---------|----------|------|
| TemplateLink | ~10 | CRITICA | Template documenti |
| TemplateVersion | ~20 | ALTA | Versioni template |
| form_templates | ~5 | ALTA | Form pubblici |
| GeneratedDocument | ~500 | MEDIA | Documenti generati |

### Categoria: Audit e Log
| Tabella | Records | Priorità | Note |
|---------|---------|----------|------|
| activity_logs | ~10000 | BASSA | Log attività (opzionale) |
| GdprAuditLog | ~5000 | ALTA | Audit GDPR |
| SecurityAuditLog | ~1000 | MEDIA | Log sicurezza |

### Categoria: Configurazioni
| Tabella | Records | Priorità | Note |
|---------|---------|----------|------|
| Permission | ~100 | CRITICA | Permessi sistema |
| custom_roles | ~10 | CRITICA | Ruoli personalizzati |
| tenant_configurations | ~3 | CRITICA | Config per tenant |

---

## 🎨 UI/UX DESIGN

### Layout Pagina Backup

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙️ Impostazioni > Backup & Restore                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📦 BACKUP DATABASE                                      │   │
│  │                                                          │   │
│  │  Seleziona le entità da includere nel backup:           │   │
│  │                                                          │   │
│  │  ☑️ Seleziona Tutto    ☐ Deseleziona Tutto              │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ 🏢 CORE BUSINESS                           [▼]  │    │   │
│  │  │   ☑️ Tenant (3)                                  │    │   │
│  │  │   ☑️ Persone (127)                              │    │   │
│  │  │   ☑️ Aziende (52)                               │    │   │
│  │  │   ☑️ Sedi Aziendali (84)                        │    │   │
│  │  │   ☑️ Corsi (28)                                 │    │   │
│  │  │   ☑️ Programmazioni (198)                       │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ 📄 CMS & CONTENUTI                         [▼]  │    │   │
│  │  │   ☑️ Pagine CMS (25)                            │    │   │
│  │  │   ☑️ Media Library (156)                        │    │   │
│  │  │   ☑️ Navigazione (18)                           │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ 📋 TEMPLATES & FORM                        [▼]  │    │   │
│  │  │   ☑️ Template Documenti (8)                     │    │   │
│  │  │   ☑️ Form Templates (4)                         │    │   │
│  │  │   ☐ Documenti Generati (512) ⚠️ Large          │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ 🔐 CONFIGURAZIONI                          [▼]  │    │   │
│  │  │   ☑️ Permessi (98)                              │    │   │
│  │  │   ☑️ Ruoli Custom (12)                          │    │   │
│  │  │   ☑️ Config Tenant (3)                          │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ 📊 AUDIT & LOG                             [▼]  │    │   │
│  │  │   ☐ Activity Logs (12.4k) ⚠️ Very Large        │    │   │
│  │  │   ☑️ GDPR Audit (5.2k)                          │    │   │
│  │  │   ☐ Security Logs (1.1k)                        │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ 📁 MEDIA FILES                             [▼]  │    │   │
│  │  │   ☑️ Uploads (/uploads) - 45.2 MB              │    │   │
│  │  │   ☐ Documents (/documents) - 128 MB ⚠️         │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │   │
│  │  📊 Stima dimensione: ~12.5 MB                        │   │
│  │  📋 Entità selezionate: 42/58                         │   │
│  │                                                          │   │
│  │  [ 💾 Scarica Backup ]  [ 📅 Backup Automatico... ]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔄 RESTORE DATABASE                                     │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │                                                   │   │   │
│  │  │     📤 Trascina qui il file di backup            │   │   │
│  │  │        oppure clicca per selezionare             │   │   │
│  │  │                                                   │   │   │
│  │  │     Formati supportati: .zip                     │   │   │
│  │  │                                                   │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  │  ⚠️ ATTENZIONE: Il restore sovrascriverà i dati        │   │
│  │     esistenti. Assicurati di avere un backup recente.   │   │
│  │                                                          │   │
│  │  Opzioni Restore:                                        │   │
│  │  ☑️ Mostra anteprima prima di applicare                 │   │
│  │  ☐ Sovrascrivi dati esistenti (merge altrimenti)        │   │
│  │  ☑️ Valida integrità file prima del restore             │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📜 STORICO BACKUP                                       │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ Data         │ Dimensione │ Entità │ Azioni       │ │   │
│  │  ├────────────────────────────────────────────────────┤ │   │
│  │  │ 01/12 10:30  │ 12.5 MB    │ 42/58  │ ⬇️ 🗑️       │ │   │
│  │  │ 30/11 18:00  │ 11.8 MB    │ 40/58  │ ⬇️ 🗑️       │ │   │
│  │  │ 29/11 09:15  │ 11.2 MB    │ 38/58  │ ⬇️ 🗑️       │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 IMPLEMENTAZIONE TECNICA

### Backend API Endpoints

```
POST   /api/v1/backup/create          # Crea backup con entità selezionate
GET    /api/v1/backup/download/:id    # Scarica file backup
POST   /api/v1/backup/restore         # Restore da file
GET    /api/v1/backup/preview         # Anteprima contenuto backup
GET    /api/v1/backup/history         # Lista backup precedenti
DELETE /api/v1/backup/:id             # Elimina backup
GET    /api/v1/backup/entities        # Lista entità con conteggi
POST   /api/v1/backup/validate        # Valida integrità file
```

### File Structure

```
backend/
├── routes/
│   └── backup-routes.js              # API routes
├── services/
│   └── backupService.js              # Business logic
├── controllers/
│   └── backupController.js           # Request handlers
└── utils/
    └── backupUtils.js                # Utility functions

src/
├── pages/settings/
│   └── BackupRestoreTab.tsx          # Main component
├── services/
│   └── backupService.ts              # API client
└── components/backup/
    ├── EntitySelector.tsx            # Checkboxes per entità
    ├── BackupProgress.tsx            # Progress bar
    ├── RestoreDropzone.tsx           # Upload area
    ├── BackupHistory.tsx             # Lista backup
    └── RestorePreview.tsx            # Anteprima restore
```

---

## 📅 TIMELINE

### Giorno 1: Backend Core
- [ ] Creare `backup-routes.js`
- [ ] Creare `backupService.js`
- [ ] Implementare export JSON per tutte le entità
- [ ] Implementare compressione ZIP
- [ ] Test export singole tabelle

### Giorno 2: Backend Restore + Media
- [ ] Implementare restore da ZIP
- [ ] Gestione media files (uploads)
- [ ] Validazione integrità
- [ ] Gestione conflitti (merge vs overwrite)
- [ ] Test restore completo

### Giorno 3: Frontend UI
- [ ] Creare `BackupRestoreTab.tsx`
- [ ] Implementare `EntitySelector.tsx`
- [ ] Implementare `RestoreDropzone.tsx`
- [ ] Integrare nella pagina Settings
- [ ] Styling e UX polish

### Giorno 4: Testing e Refinement
- [ ] Test E2E backup → restore
- [ ] Gestione errori e edge cases
- [ ] Progress feedback real-time
- [ ] Documentazione
- [ ] Performance optimization

---

## 🔐 SICUREZZA

### Requisiti
1. **Autenticazione**: Solo utenti ADMIN
2. **Permessi**: Nuovo permesso `backup:manage`
3. **Audit**: Log ogni operazione backup/restore
4. **Crittografia**: Opzione per password su ZIP
5. **Sanitizzazione**: Escape dati sensibili (password hash esclusi)

### Dati Esclusi dal Backup
- `refresh_tokens` - Security sensitive
- `person_sessions` - Session data
- Password hash in `persons` - Solo metadata

---

## ✅ CHECKLIST PRE-IMPLEMENTAZIONE

- [x] Analisi tabelle database (58 tabelle)
- [x] Design UI/UX
- [x] Architettura tecnica definita
- [x] Timeline stimata
- [ ] Creazione branch dedicato (opzionale)
- [ ] Setup test environment

---

## 🚀 PROSSIMI PASSI

1. **Conferma design** con utente
2. **Iniziare implementazione** backend
3. **Test incrementali** per ogni tabella
4. **UI frontend** con preview real-time
5. **Integration test** completo

