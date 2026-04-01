# P71 — Invio Referto Mail & Consegna Sicura Idoneità

**Status:** ✅ Implementato  
**Data:** 2025  
**Area:** Clinica, Medicina del Lavoro  
**Compliance:** D.Lgs 81/08 Art. 41 c.7, GDPR Art. 9 & 32

---

## Obiettivi

1. **Toggle "Invia referto via email"** — opzione per inviare il referto PDF al paziente via email al termine della visita
2. **Auto-consegna Giudizio di Idoneità** — al termine di visita MDL, il giudizio viene inviato automaticamente al lavoratore via email (ZIP) con password via WhatsApp
3. **Batch notturno 22:00** — cron giornaliero che invia a ogni azienda uno ZIP con tutti i Giudizi di Idoneità emessi nella giornata

---

## Architettura

```
Evento: POST /api/v1/clinica/visite/:id/termina
         │
         ├─── visita.invioRefertoMail = true?
         │         └─── RefertoMailService.sendRefertoToPatient()
         │                   ├─ Legge PDF da VisitaRefertoService
         │                   ├─ Invia email al paziente (PersonTenantProfile.email)
         │                   └─ GDPR audit log
         │
         └─── tipoVisitaMDL + giudizioCreated?
                   └─── IdoneityNotificationService.deliverAfterVisitaComplete()
                             ├─ Genera PDF "lavoratore" (GiudizioIdoneitaPdfService)
                             ├─ Crea ZIP (archiver)
                             ├─ Invia email con ZIP allegato
                             ├─ Invia password via WhatsApp (Twilio - template IDONEITA_PASSWORD)
                             ├─ Aggiorna GiudizioIdoneita.invioSicuroPazienteAt
                             └─ GDPR audit log

Cron 22:00 (Europe/Rome):
   └─── IdoneityNotificationService.sendDailyZipToCompanies()
             ├─ Recupera giudizi VALIDI del giorno senza invioSicuroAziendaAt
             ├─ Raggruppa per azienda (companyTenantProfile)
             ├─ Per ogni azienda: genera PDF "datore", crea ZIP
             ├─ Invia email ZIP all'azienda (emailGenerale)
             ├─ Invia password via WhatsApp (telefonoGenerale)
             ├─ Aggiorna GiudizioIdoneita.invioSicuroAziendaAt (bulk)
             └─ GDPR audit log
```

---

## File Modificati / Creati

### Backend

| File | Tipo | Note |
|------|------|-------|
| `backend/services/clinical/IdoneityNotificationService.js` | RISCRITTO | Consegna sicura lavoratore + batch ZIP aziende + `sendSecureGiudizio()` + `_sendPasswordViaChannel()` |
| `backend/services/clinical/RefertoMailService.js` | CREATO | Invio referto PDF al paziente |
| `backend/services/smsService.js` | AGGIORNATO | Template `IDONEITA_PASSWORD` con varianti `sms` e `whatsapp` |
| `backend/routes/clinica/visite.routes.js` | AGGIORNATO | Import IdoneityNotificationService + RefertoMailService, trigger setImmediate, nuova route PATCH |
| `backend/routes/clinica/pec.routes.js` | AGGIORNATO | Route `POST /giudizio/:id/secure-send` chiama `sendSecureGiudizio()` |
| `backend/servers/api-server.js` | AGGIORNATO | Import + call `sendDailyZipToCompanies()` nel cron 22:00 |
| `backend/prisma/schema.prisma` | AGGIORNATO | Nuovi campi Visita e GiudizioIdoneita |
| `backend/prisma/migrations/20260304_p71_invio_referto_mail_idoneit/migration.sql` | CREATO | Migration DB |
| `backend/tests/integration/p71-notifications.test.js` | CREATO | Test integrazione P71 (10 suite) |

### Database Schema (nuovi campi)

```prisma
model Visita {
  invioRefertoMail Boolean @default(false) @map("invio_referto_mail") // P71
}

model GiudizioIdoneita {
  invioSicuroPazienteAt DateTime? @map("invio_sicuro_paziente_at") // P71
  invioSicuroAziendaAt  DateTime? @map("invio_sicuro_azienda_at")  // P71
}
```

### Frontend

| File | Tipo | Note |
|------|------|-------|
| `src/pages/clinica/clinica/VisitaPage.tsx` | AGGIORNATO | Toggle "Invia referto via email" nei 3 layout branches (tabs/sections/continuous) |
| `src/services/clinicaApi.ts` | AGGIORNATO | Tipo `Visita.invioRefertoMail`, metodo `updateImpostazioniInvio()` |

---

## API

### PATCH /api/v1/clinica/visite/:id/impostazioni-invio

Aggiorna le impostazioni di invio email per una visita.

**Body:**
```json
{ "invioRefertoMail": true }
```

**Response:**
```json
{ "success": true, "data": { "id": "...", "invioRefertoMail": true } }
```

**Auth:** `authenticate` + `checkAdvancedPermission('visite', 'update')`

---

## Comportamento

### Toggle "Invia referto via email"
- Visibile in tutte e 3 le varianti di layout della `VisitaPage`
- Si salva automaticamente al click via `PATCH /:id/impostazioni-invio`
- Disabilitato in modalità readonly
- Colore brand teal (`bg-teal-600`) quando attivo

### Auto-consegna lavoratore (MDL)
- Trigger: `POST /termina` su visita MDL con `tipoGiudizio` compilato
- Eseguito in `setImmediate` (non bloccante — la risposta HTTP non aspetta)
- Se l'email del lavoratore non è presente su `PersonTenantProfile` → skip con warning
- Se WhatsApp fallisce → email consegnata comunque, warning nel log
- Timestamp `invioSicuroPazienteAt` tracciato

### Batch ZIP aziende (22:00)
- Raggruppa i giudizi per `companyTenantProfile` (da mansione o appuntamento)
- Aziende senza `emailGenerale` → skipped
- Giudizi già con `invioSicuroAziendaAt` → esclusi
- Errori su una singola azienda → non bloccano il batch per le altre
- Log statistiche: `{ total, companies, sent, errors }`

---

## Sicurezza Documenti

> **Nota architetturale**: `archiver` v7 crea archivi ZIP standard senza cifratura nativa.  
> La sicurezza è garantita dall'invio della password su **canale separato** (WhatsApp/Twilio),  
> conformemente al principio di "dual-channel authentication" per dati sanitari sensibili.  
> Il file `LEGGIMI.txt` incluso nello ZIP descrive il meccanismo.

### Template WhatsApp/SMS `IDONEITA_PASSWORD`
Variabili: `{{recipientName}}`, `{{password}}`, `{{clinicName}}`, `{{date}}`

Due varianti nel service (`smsService.js`):
- `sms` — testo corto per SMS standard
- `whatsapp` — messaggio formattato con emoji per WhatsApp Business

### Metodo `sendSecureGiudizio()` (invio manuale)

Permette l'invio manuale sicuro di un giudizio di idoneità a uno specifico destinatario tramite la route `POST /api/v1/clinica/pec/giudizio/:id/secure-send`.

**Parametri**: `{ giudizioId, tenantId, performedBy, recipients: { worker?: { email, name, phone }, employer?: { email, name, phone } }, passwordChannel: 'sms' | 'whatsapp' }`

**Comportamento**:
- Genera PDF per ogni destinatario (lavoratore / datore)
- Crea ZIP separato per ciascuno
- Invia email con ZIP allegato
- Invia password via canale scelto (`sms` o `whatsapp`)
- Aggiorna timestamp `invioSicuroPazienteAt` / `invioSicuroAziendaAt`
- GDPR audit log (`MANUAL_SECURE_SEND_WORKER` / `MANUAL_SECURE_SEND_EMPLOYER`)

**File di routing**: `backend/routes/clinica/pec.routes.js` (autenticato)

### Metodo `_sendPasswordViaChannel()`

Metodo privato che sostituisce `_sendPasswordViaWhatsApp()`. Supporta entrambi i canali dispatching a `SmsService.sendSMS()` o `SmsService.sendWhatsApp()` in base al parametro `channel`.

---

## GDPR

Tutte le operazioni producono un `GdprAuditLog` con:

| Campo | Valore |
|-------|--------|
| `resourceType` | `GiudizioIdoneita` o `Visita` |
| `resourceId` | ID del documento |
| `action` | `SECURE_DELIVERY_WORKER` / `BATCH_ZIP_COMPANY` / `REFERTO_EMAIL_DELIVERY` |
| `dataAccessed` | JSON con dettagli operazione (email mascherata, whatsappStatus, etc.) |

---

## Prerequisiti

- `TenantPecConfigService`: configurazione SMTP/PEC attiva per il tenant
- `Twilio`: configurato con `TWILIO_ACCOUNT_SID` e `TWILIO_AUTH_TOKEN` per WhatsApp
- `PersonTenantProfile.email` e `PersonTenantProfile.phone` compilati per il lavoratore
- `CompanyTenantProfile.emailGenerale` e `CompanyTenantProfile.telefonoGenerale` per l'invio aziendale

---

## Testing

### Invio referto manuale
1. Aprire una visita → abilitare il toggle "Invia referto via email"
2. Verificare salvataggio (toast di conferma)
3. Completare la visita → il referto verrà inviato in background
4. Verificare il log per `P71: referto inviato via email`

### Consegna Giudizio di Idoneità
1. Completare una visita MDL con `giudizioIdoneitaMdl` compilato nel template
2. Verificare creazione `GiudizioIdoneita` nel DB con `invioSicuroPazienteAt != null`
3. Verificare email ricevuta con ZIP allegato
4. Verificare WhatsApp con password

### Batch aziende
```bash
# Test manuale dal REPL Node.js
import IdoneityNotificationService from './backend/services/clinical/IdoneityNotificationService.js';
const stats = await IdoneityNotificationService.sendDailyZipToCompanies('TENANT_ID');
console.log(stats);
```
