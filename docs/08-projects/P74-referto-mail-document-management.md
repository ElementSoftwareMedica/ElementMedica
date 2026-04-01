# P74 — Referto Mail, Document Management & Salva e Completa UX

**Stato**: ✅ Completato  
**Priorità**: Alta  
**Data inizio**: 2025  
**Data completamento**: 6 marzo 2026  
**Autore**: GitHub Copilot / Matteo Michielon

---

## 🎯 Obiettivo

Potenziare il flusso di completamento visita con un menu avanzato, gestire template di email per l'invio referti, creare un gestionale di documenti interni (procedure e marketing) nel management, e migliorare la UX della modulistica.

---

## 📋 Scope

### 1. Fix Modulistica DELETE 409 UX
**Problema**: Il template di modulistica non può essere eliminato se ha documenti compilati attivi. Il messaggio di errore toast appare ma l'utente non ha azioni alternative visibili.

**Soluzione**:
- Quando la cancellazione fallisce con status 409 (o messaggio "documenti compilati attivi"), mostrare un dialogo di conferma speciale che:
  1. Spiega quanti documenti attivi bloccano l'eliminazione
  2. Offre l'alternativa "Disattiva template" (soft-disable, no cascade delete)
  3. Permette di annullare

**File modificati**:
- `src/pages/clinica/impostazioni/modulistica/ModulisticaPage.tsx`

---

### 2. Redesign "Salva e Completa" — Split Button con Dropdown Menu

**Problema**: Il toggle "Invia referto via email" è nascosto nella sidebar (3 copie in 3 branch del layout) e non è parte del flusso di completamento. Non c'è modo di gestire firma, stampa, allegati al momento del completamento.

**Soluzione**: Nuovo componente `SalvaCompletaMenu` — split button:
- **Pulsante principale**: "Salva e Completa" (comportamento invariato)
- **Chevron dropdown** (⌄) apre un pannello con:

| Opzione | Tipo | Note |
|---|---|---|
| Invia referto via email | Checkbox | Se visita MDL: disabilitato + tooltip "Invio automatico schedulato" |
| Applica firma medico al PDF | Checkbox | Richiede firma configurata |
| Apri PDF referto dopo completamento | Checkbox | Apre il PDF generato in nuova tab |
| Stampa N copie | Number input (1-5) | Se N>0 stampa automaticamente al completamento |
| Allegati mail aggiuntivi | Multi-select | Visibile solo se "Invia email" attivo — da DocManagement "marketing" |
| Salva come preferenze default | Toggle | Persiste le preferenze correnti per questo medico/tenant |

- **Rimozione legacy**: Eliminare i 3 blocchi "Invia referto via email" dalla sidebar di `VisitaPage.tsx` (branch tabs, sections, continuous)

**Stato preferenze**: Salvate in `MedicoPreferenze` (nuovo record in PersonTenantProfile.preferences o model dedicato)

**File modificati/creati**:
- `src/pages/clinica/clinica/components/SalvaCompletaMenu.tsx` (NUOVO)
- `src/pages/clinica/clinica/components/StickyVisitHeader.tsx` (aggiorna props + integra SalvaCompletaMenu)
- `src/pages/clinica/clinica/VisitaPage.tsx` (rimuovi 3 blocchi invioRefertoMail, passa nuove props)
- `src/pages/clinica/clinica/hooks/useVisitaForm.ts` (eventuale aggiornamento)
- `backend/routes/clinica/visite.routes.js` (preferenze medico endpoint)

---

### 3. Email Template Settings (/poliambulatorio/impostazioni)

**Obiettivo**: Permettere la configurazione del testo delle email di invio referto per branca, medico o prestazione specifica.

**Regola di risoluzione** (priorità decrescente):
1. Prestazione specifica
2. Medico specifico
3. Branca (MEDICA / FORMAZIONE / MANAGEMENT)
4. Default tenant

**Nuovo modello Prisma**:
```prisma
model EmailTemplate {
  id            String    @id @default(cuid())
  tenantId      String
  tenant        Tenant    @relation(fields: [tenantId], references: [id])
  
  nome          String    // Label display
  branca        String?   // "MEDICA" | "FORMAZIONE" | "MANAGEMENT"
  medicoId      String?   // PersonTenantProfile.id
  prestazioneId String?   // Prestazione.id
  
  subject       String    @default("Il tuo referto medico")
  bodyHtml      String    @db.Text  // HTML con variabili: {{paziente}}, {{data}}, {{medico}}, {{prestazione}}
  
  // Marketing docs da allegare (array di InternalDocument.id)
  allegatiIds   String[]  @default([])
  
  isDefault     Boolean   @default(false)
  isActive      Boolean   @default(true)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  createdBy     String?
  deletedAt     DateTime?
  
  @@index([tenantId, branca])
  @@index([tenantId, medicoId])
  @@index([tenantId, prestazioneId])
}
```

**Nuova pagina**: `/poliambulatorio/impostazioni/email-template`  
**Voce menu** aggiunta in `ClinicaSettingsPage.tsx`

**File creati**:
- `src/pages/clinica/impostazioni/email-template/EmailTemplateSettingsPage.tsx`
- `src/pages/clinica/impostazioni/email-template/EmailTemplateForm.tsx`
- `backend/services/clinical/EmailTemplateService.js`
- `backend/routes/clinica/email-templates.routes.js`

---

### 4. Document Management — Gestionale Documenti Interni (Management)

**Obiettivo**: Sistema centralizzato per documenti aziendali con:
- **Procedure interne** con versionamento (revisioni)
- **Documenti marketing** allegabili alle email di invio referto
- Organizzazione a cartelle (gerarchica)

**Nuovi modelli Prisma**:

```prisma
model DocFolder {
  id          String      @id @default(cuid())
  tenantId    String
  tenant      Tenant      @relation(fields: [tenantId], references: [id])
  
  nome        String
  descrizione String?
  tipo        DocFolderTipo @default(GENERICO)  // INTERNO | MARKETING | GENERICO
  parentId    String?
  parent      DocFolder?  @relation("FolderTree", fields: [parentId], references: [id])
  children    DocFolder[] @relation("FolderTree")
  
  documents   InternalDocument[]
  
  ordine      Int         @default(0)
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  deletedAt   DateTime?
  createdBy   String?
  
  @@index([tenantId])
  @@index([tenantId, parentId])
}

enum DocFolderTipo {
  GENERICO
  INTERNO
  MARKETING
}

model InternalDocument {
  id            String    @id @default(cuid())
  tenantId      String
  tenant        Tenant    @relation(fields: [tenantId], references: [id])
  
  folderId      String?
  folder        DocFolder? @relation(fields: [folderId], references: [id])
  
  nome          String
  descrizione   String?
  tipo          InternalDocumentTipo  // PROCEDURA | MODULO | MARKETING | ALTRO
  
  // File storage
  fileUrl       String
  fileName      String
  fileSize      Int?
  mimeType      String?
  
  // Versioning
  versione      String    @default("1.0")
  revisionNote  String?
  isCurrentVersion Boolean @default(true)
  parentDocId   String?   // punta alla versione precedente
  
  tags          String[]  @default([])
  isPublic      Boolean   @default(false)  // visibile senza auth (per marketing pubblico)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  createdBy     String?
  deletedAt     DateTime?
  
  @@index([tenantId])
  @@index([tenantId, tipo])
  @@index([tenantId, folderId])
}

enum InternalDocumentTipo {
  PROCEDURA
  MODULO
  MARKETING
  ALTRO
}
```

**Nuova sezione in management**: `/management/documenti`  
**Sidebar entry** aggiunta nel Management layout  

**File creati**:
- `src/pages/management/documenti/DocumentManagementPage.tsx`
- `src/pages/management/documenti/DocFolderTree.tsx`
- `src/pages/management/documenti/InternalDocumentList.tsx`
- `src/pages/management/documenti/InternalDocumentForm.tsx`
- `backend/services/management/InternalDocumentService.js`
- `backend/routes/management/internal-documents.routes.js`

---

## 🗺️ Architettura E2E

```
[VisitaPage - StickyVisitHeader]
  └── SalvaCompletaMenu (dropdown)
        ├── invioRefertoMail checkbox → stato locale → PATCH /visite/:id/impostazioni-invio
        ├── applicaFirma checkbox → stato locale
        ├── apriPdf checkbox → stato locale
        ├── stampaCopie (0-5) → stato locale
        ├── allegatiIds (da InternalDocument tipo MARKETING) → stato locale
        └── salvaDefault → PATCH /visite/preferenze-completamento

[Completamento visita]
  └── POST /visite/:id/termina
        ├── invioRefertoMail=true → RefertoMailService.sendRefertoToPatient()
        │     ├── EmailTemplateService.resolveTemplate(tenantId, medicoId, prestazioneId)
        │     └── Allega InternalDocument.fileUrl se allegatiIds presenti
        ├── applicaFirma=true → firma medico applicata al PDF
        └── stampaCopie > 0 → trigger print job server-side o flag al frontend

[Management - /management/documenti]
  └── DocFolderTree (sidebar cartelle)
        └── InternalDocumentList
              ├── Upload nuovo documento
              ├── Nuova revisione (nuova versione, mantiene parent)
              └── Tipi: PROCEDURA | MODULO | MARKETING | ALTRO
                    └── MARKETING docs → selezionabili in EmailTemplate e SalvaCompletaMenu

[Clinica Impostazioni - /poliambulatorio/impostazioni/email-template]
  └── Lista EmailTemplate (per branca/medico/prestazione)
        ├── Editor HTML (subject + bodyHtml con variabili)
        └── Selezione allegati MARKETING da DocManagement
```

---

## 📁 File da creare/modificare

### Backend
| File | Azione |
|---|---|
| `backend/prisma/schema.prisma` | Aggiungere `EmailTemplate`, `DocFolder`, `InternalDocument`, `DocFolderTipo`, `InternalDocumentTipo` |
| `backend/services/management/InternalDocumentService.js` | NUOVO |
| `backend/routes/management/internal-documents.routes.js` | NUOVO |
| `backend/services/clinical/EmailTemplateService.js` | NUOVO |
| `backend/routes/clinica/email-templates.routes.js` | NUOVO |
| `backend/services/clinical/RefertoMailService.js` | Aggiornare per usare EmailTemplateService + allegati |
| `backend/servers/api.server.js` | Registrare nuove routes |

### Frontend
| File | Azione |
|---|---|
| `src/pages/clinica/clinica/components/SalvaCompletaMenu.tsx` | NUOVO |
| `src/pages/clinica/clinica/components/StickyVisitHeader.tsx` | Integra SalvaCompletaMenu, nuove props |
| `src/pages/clinica/clinica/VisitaPage.tsx` | Rimuovi 3 blocchi invioRefertoMail, aggiorna onComplete |
| `src/pages/clinica/impostazioni/ClinicaSettingsPage.tsx` | Aggiungi voce email template |
| `src/pages/clinica/impostazioni/email-template/EmailTemplateSettingsPage.tsx` | NUOVO |
| `src/pages/clinica/impostazioni/email-template/EmailTemplateForm.tsx` | NUOVO |
| `src/pages/management/documenti/DocumentManagementPage.tsx` | NUOVO |
| `src/pages/management/documenti/DocFolderTree.tsx` | NUOVO |
| `src/pages/management/documenti/InternalDocumentList.tsx` | NUOVO |
| `src/pages/management/documenti/InternalDocumentForm.tsx` | NUOVO |
| `src/pages/management/ManagementRouter.tsx` | Registra route /documenti |
| `src/pages/clinica/impostazioni/modulistica/ModulisticaPage.tsx` | Migliora UX DELETE 409 |

### DB Migration
| File | Azione |
|---|---|
| `backend/prisma/migrations/YYYYMMDD_p74_email_template_doc_management/` | Nuova migration |

---

## 🔐 Permessi

| Risorsa | Permesso |
|---|---|
| `EmailTemplate` | `email-templates:read`, `email-templates:write` (clinica admin) |
| `InternalDocument` | `internal-documents:read`, `internal-documents:write` (management admin) |
| `DocFolder` | `doc-folders:read`, `doc-folders:write` (management admin) |

---

## ✅ Checklist Implementazione

- [x] Schema Prisma aggiornato con nuovi modelli (`DocFolder`, `InternalDocument`, `EmailTemplate`, enums)
- [x] Migrazione DB creata e applicata (`prisma db push`)
- [x] InternalDocumentService con CRUD + upload + versioning
- [x] Email template backend service con risoluzione priorità
- [x] RefertoMailService aggiornato con resolveTemplate + allegati
- [x] Routes registrate in api.server.js (`/api/v1/management/documenti`, `/api/v1/clinical/email-templates`)
- [x] Frontend DocumentManagementPage con folder tree + list + upload modale
- [x] Frontend InternalDocumentForm con upload (integrato in UploadDocumentModal nella DocumentManagementPage)
- [x] Frontend EmailTemplateSettingsPage con editor variabili + allegati marketing
- [x] SalvaCompletaMenu component (split button + dropdown con tutte le opzioni)
- [x] StickyVisitHeader aggiornato (rimosse ~127 righe old block, integrato SalvaCompletaMenu)
- [x] VisitaPage: rimossi 3 blocchi invioRefertoMail legacy (P71, ~8642 chars)
- [x] ManagementRouter: route `/documenti` registrata
- [x] ManagementLayout: sidebar entry "Documenti" aggiunta con icona `FolderOpen`
- [x] ClinicaSettingsPage: voce email template aggiunta
- [x] ModulisticaPage: UX DELETE 409 migliorata (dialogo conferma + "Disattiva template")
- [x] managementDocsApi.ts: `create`/`createRevision` usa `apiUpload` (fix auth Bearer token)
- [x] E2E verifica completamento visita con email (RefertoMailService → EmailTemplateService)
- [x] Zero TypeScript errors su tutti i file

---

## 📅 Changelog

| Data | Nota |
|---|---|
| 2025 | Creazione documento P74 |
| 6 marzo 2026 | P74-rev1: E2E review completato. Fix: (1) `managementDocsApi.ts` — sostituito raw `fetch` con `apiUpload` per auth Bearer token corretta su upload multipart; (2) `ManagementLayout.tsx` — aggiunto `FolderOpen` icon + entry sidebar "Documenti" per `/management/documenti`; (3) aggiunte label breadcrumb per segmenti `documenti`/`cartelle`; (4) zero TypeScript errors su tutti i file. Stato: ✅ COMPLETATO |

