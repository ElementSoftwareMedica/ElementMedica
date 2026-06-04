# Analisi E2E GDPR e Sicurezza Webapp/Desktop

Data: 2026-06-04  
Ambito: ElementMedica webapp, API `/api/v1`, app desktop offline-first, sincronizzazione online/offline, documenti MDL, licenze desktop, bridge dispositivi.

## Stato Avanzamento

Ultimo aggiornamento tecnico: 2026-06-04.

Controlli implementati/verificati:

- Documenti MDL generati da Risultati Anonimi Collettivi e Verbale Riunione Periodica archiviati nello stesso storico dei documenti firmabili.
- Metadati documentali MDL estesi con hash SHA-256 del file, hash del documento origine quando si firma da storico, stato scansione e origine generata/upload.
- Download documenti MDL con header `X-Document-SHA256` e `X-Content-Type-Options: nosniff`.
- Upload documenti MDL e allegati visita desktop protetti da hash SHA-256 e scansione malware opzionale tramite `CLAMAV_SCAN_COMMAND`/`FILE_SCAN_COMMAND`.
- Export XML Allegato 3B tracciato in `GdprAuditLog` con hash SHA-256 del payload XML e validazione strutturale prima del download.
- App desktop: sync incrementale gia presente via `lastSyncAt` su `GET /api/v1/desktop-sync/download-full-db`.
- App desktop: sync incrementale estesa con tombstone soft-delete per le tabelle desktop sincronizzate; i record cancellati online vengono marcati `_isDeleted=1` localmente senza cancellazione fisica.
- App desktop: scadenze MDL riallineate a `ScadenzaPrestazioneProtocollo` per alimentare correttamente la card Sorveglianza Sanitaria offline.
- App desktop: cifratura field-level dei principali campi PII/sanitari via Electron `safeStorage`; mappa estesa a campi denormalizzati, documentali, scadenze, servizi MDL e profilo salute. Resta necessario requisito operativo BitLocker/FileVault o cifratura integrale DB per protezione completa.
- Packaging Windows desktop verificato con `better-sqlite3` nativo `win32-x64`.

Controlli ancora non chiusi al 100%:

- Validazione XSD ufficiale Allegato 3B: manca nel repository lo schema INAIL versionato da usare come fonte di verita.
- Scansione malware in produzione: codice pronto, ma deve essere configurato il comando scanner sul server.
- Test automatici helper documenti MDL: aggiunto test su risoluzione `CompanyTenantProfile` tenant-scoped, tipologie consentite e sanitizzazione filename. Resta utile fixture E2E multi-tenant reale per l'intera route HTTP.
- Cifratura completa del file SQLite: non implementata; oggi e presente cifratura field-level piu requisito operativo di cifratura disco.
- DPIA/ROPA: richiede validazione DPO/legale fuori dal codice.

## Obiettivo

Verificare che webapp e app desktop lavorino sugli stessi dati sanitari e amministrativi con controlli coerenti di riservatezza, integrita, disponibilita, tracciabilita e isolamento tenant. Questo documento e un audit tecnico-operativo: non sostituisce una valutazione formale DPO/legale, ma identifica controlli implementati, rischi residui e verifiche obbligatorie prima di considerare il flusso conforme in produzione.

## Superfici Analizzate

- Autenticazione web e desktop con Bearer token.
- Licenze desktop e heartbeat.
- Sincronizzazione full/day DB desktop.
- Persistenza SQLite locale e packaging Electron.
- Documenti aziendali MDL: nomine, tariffari, riunione periodica, risultati anonimi collettivi, Allegato 3B.
- Generazione, firma, upload e download PDF.
- Autorizzazioni tenant e ruoli.
- Gestione PII/dati sanitari, audit trail, soft delete.
- Deploy e release frontend/backend/desktop.

## Riferimenti Normativi/Operativi

- INAIL, pagina "Medico competente": conferma obbligo art. 40 D.Lgs. 81/08, trasmissione telematica e dati aggregati evidenziando differenze di genere.
- INAIL, Manuale Utente Medico Competente v2.2 del 12/05/2025: conferma aggiornamento del tracciato record per invio da file in v2.1 del 19/12/2024, workflow comunicazione via file e obbligo di compilare anche valori pari a 0 nelle sezioni statistiche.
- Stato repo: non e presente uno schema XSD ufficiale INAIL versionato; l'export usa quindi validazione strutturale applicativa e hash/audit, ma la validazione XSD resta un requisito aperto.

## Controlli Forti Presenti

### Autenticazione e sessioni

- Backend usa route versionate `/api/v1`.
- Le route sensibili analizzate sono dietro middleware autenticato.
- Il desktop invia `Authorization: Bearer <token>` e `X-Tenant-ID`; il backend verifica che l'utente appartenga al tenant indicato prima di usarlo.
- La route `POST /api/v1/desktop-licenses/heartbeat` e montata: senza token risponde `401`, quindi non e una route pubblica e non espone stato licenza.

Rischio residuo: medio-basso. Va mantenuta la regola Bearer-only e va evitato qualsiasi fallback cookie/legacy.

### Multi-tenancy

- I flussi analizzati usano `getEffectiveTenantId(req)` o `req.person.tenantId`.
- Le query su documenti MDL risolvono l'azienda tramite `CompanyTenantProfile` nel tenant corrente.
- Le directory documentali sono segmentate per `tenantId/companyTenantProfileId/documentType`.

Rischio residuo: medio. Ogni nuova route di documenti o sync deve avere test automatico che provi accesso cross-tenant negato.

### Documenti MDL e firma

- I documenti MDL aziendali sono separati per tipologia: `nomine`, `tariffario`, `riunione-periodica`, `risultati-anonimi`.
- I filename ricevuti dal client vengono normalizzati con basename e whitelist caratteri.
- Il download risolve il path dentro la directory attesa e verifica che il path finale resti nel perimetro della directory.
- Ogni documento archiviato o firmato contiene metadati con hash SHA-256 e, per firme da storico, hash del documento sorgente.
- Il download restituisce `X-Document-SHA256` per permettere verifica integrita lato client/log operativo.
- La firma online puo firmare un documento sorgente gia archiviato, evitando di rigenerare un PDF diverso da quello visto dall'utente.
- I PDF generati per riunione periodica e risultati anonimi collettivi vengono archiviati nei documenti MDL, rendendo possibile storico, firma e upload firmato.

Rischio residuo: medio. Serve retention policy documentale esplicita. La scansione malware e disponibile via configurazione server, ma va abilitata in produzione.

### Desktop offline-first

- Il DB locale e in `app.getPath('userData')`, separato dall'installazione.
- WAL e PRAGMA prestazionali sono configurati.
- I campi PII/sanitari principali sono cifrati a livello applicativo con Electron `safeStorage` prima della scrittura su SQLite.
- La mappa PII desktop include anche nomi/codici fiscali denormalizzati, note appuntamento/visita, `datiStrutturati`, referti, documenti, scadenze, servizi MDL e profilo salute.
- La licenza consente uso offline con grace period limitato.
- Il packaging Windows ora forza rebuild/install native deps `win32-x64` e unpack esplicito di `better-sqlite3`, evitando il bundle di un `.node` non Windows.

Rischio residuo: medio-alto se il dispositivo non e cifrato a livello OS. La cifratura field-level protegge molti campi sensibili, ma indici, chiavi, metadati e campi non marcati PII restano nel file SQLite. BitLocker/FileVault o cifratura integrale DB devono essere requisiti operativi.

## Rischi Critici e Mitigazioni

### Dati sanitari su desktop

Rischio: perdita/furto laptop o profilo Windows compromesso con accesso al DB SQLite locale.

Mitigazioni richieste:
- Obbligare cifratura disco: BitLocker su Windows, FileVault su macOS.
- Auto-lock app gia presente: verificare timeout e blocco dopo sospensione.
- Mantenere aggiornata la mappa `PII_FIELDS` desktop per ogni nuova tabella/campo sanitario sincronizzato; dal 2026-06-04 la mappa copre anche i campi denormalizzati e documentali sincronizzati.
- Valutare cifratura integrale SQLite con chiave derivata da credenziale locale o secure storage.
- Disabilitare export massivi non autorizzati e tracciare ogni export in audit log.

Priorita: alta.

### Upload documenti

Rischio: caricamento file malevoli o PDF con contenuto attivo.

Mitigazioni richieste:
- Limitare MIME e dimensione, gia presente.
- Abilitare in produzione scansione antivirus/ClamAV o servizio equivalente via `CLAMAV_SCAN_COMMAND`/`FILE_SCAN_COMMAND`.
- Forzare download/preview con header sicuri (`Content-Type`, `Content-Disposition`, `X-Content-Type-Options: nosniff`).
- Evitare rendering inline di formati non PDF/immagine sicuri.

Priorita: alta.

### Sincronizzazione online/offline

Rischio: divergenza dati, conflitti non rilevati, perdita di aggiornamenti o overwrite di dati sanitari.

Mitigazioni richieste:
- Ogni tabella sync deve avere `updatedAt`, `deletedAt`, `tenantId`, `remoteId/localId` e mapping ID verificabile.
- Upload deve essere idempotente e non creare duplicati per movimenti/documenti/visite.
- Errori di remap devono bloccare solo il record interessato e produrre coda retry, non perdere batch interi.
- Il full download e affiancato da sync incrementale basata su `lastSyncAt`; dal 2026-06-04 include tombstone soft-delete per le tabelle desktop e applicazione locale `_isDeleted=1`.
- La tabella locale `scadenze` riceve ora `ScadenzaPrestazioneProtocollo`, non `DeadlineItem`, evitando divergenze nella Sorveglianza Sanitaria offline.

Priorita: alta.

### Allegato 3B e documenti inviati a enti

Rischio: XML errato inviato a INAIL o statistiche non allineate.

Mitigazioni richieste:
- Ricalcolo statistiche al momento dell'export XML, non affidarsi a snapshot obsoleti.
- Preview modificabile con evidenza dei campi calcolati vs manuali.
- Validazione strutturale obbligatoria prima del download definitivo.
- Validazione XSD ufficiale da integrare appena disponibile lo schema INAIL versionato.
- Audit log di export XML con hash SHA-256; da estendere a modifica manuale/invio quando il flusso di invio sara definitivo.

Priorita: alta.

### Firma online

Rischio: firma applicata a documento diverso dalla preview o non tracciata.

Mitigazioni richieste:
- Usare sempre `sourceFilename` per firmare il PDF gia archiviato quando si firma da storico.
- Salvare metadata firma: firmatario, timestamp, documento origine, hash SHA-256 prima/dopo firma.
- Mostrare hash o versione documento nel modal di firma per documenti regolatori.

Priorita: media-alta.

## Verifiche E2E Obbligatorie

### Webapp aziende/sicurezza

1. Aprire `/poliambulatorio/mdl/aziende/:id?tab=sicurezza`.
2. Generare Risultati Anonimi Collettivi.
3. Verificare download PDF.
4. Verificare che la card mostri `Documenti pregressi > 0`.
5. Aprire documento da storico.
6. Firmare online lo stesso documento.
7. Verificare creazione nuovo file firmato.
8. Caricare file firmato manualmente.
9. Verificare che lo storico mostri upload firmato e firma online.
10. Ripetere identico flusso per Verbale Riunione Periodica.

### Allegato 3B

1. Aprire `/poliambulatorio/mdl/allegato-3b`.
2. Creare nuovo Allegato 3B per azienda con nomina MC.
3. Verificare preview statistiche non tutte a zero quando esistono lavoratori/visite.
4. Esportare XML.
5. Validare XML con schema INAIL.
6. Eliminare Allegato 3B non inviato.
7. Rigenerare e verificare dati coerenti.

### Desktop Windows

1. Generare installer Windows con `npm run package:win`.
2. Installare su Windows pulito.
3. Avviare app e verificare che `better_sqlite3.node` non produca `not a valid Win32 application`.
4. Login, heartbeat licenza, download full DB.
5. Sincronizzazione giornaliera e upload allegati.
6. Verificare assenza notifiche automatiche eccessive.

### Sync dati sanitari

1. Creare/modificare visita online.
2. Scaricare DB desktop.
3. Verificare stessi template visita, prestazioni, protocolli, scadenze, giudizi.
4. Modificare offline una visita consentita.
5. Sincronizzare.
6. Riaprire online e verificare congruenza dati.

## Checklist Sicurezza Per Release

- TypeScript webapp: zero errori.
- TypeScript desktop: zero errori.
- Build production webapp riuscita.
- Build desktop Windows su ambiente Windows o rebuild native win32-x64 prima del packaging.
- Route heartbeat: `POST /api/v1/desktop-licenses/heartbeat` restituisce `401` senza token.
- Nessuna credenziale in commit, log o release.
- Nessun file `node_modules`, release binarie o build output nel commit.
- Smoke HTTP su frontend dopo deploy.
- Log produzione letti solo con `tail -n 20`, `pm2 logs --lines 20 --nostream` o filtri mirati.

## Verifiche Tecniche Eseguite 2026-06-04

- `node --check backend/controllers/desktop-sync.controller.js`: OK.
- `node --check backend/routes/companies-routes.js`: OK.
- `cd desktop-app && npm run typecheck`: OK.
- `cd backend && SKIP_DB_SETUP=true npm test -- --runInBand tests/unit/company-mdl-documents.test.js tests/unit/desktop-sync-tombstones.test.js tests/unit/file-security.test.js`: OK.

## Gap Da Chiudere Prima Di Dichiarare Conformita Piena

1. Cifratura integrale del DB locale oppure requisito tecnico obbligatorio di cifratura disco verificato in onboarding device.
2. Validazione XSD Allegato 3B integrata prima dell'export definitivo quando lo schema ufficiale viene versionato nel repository.
3. Antivirus/malware scanning da abilitare sul server impostando `CLAMAV_SCAN_COMMAND` o `FILE_SCAN_COMMAND`.
4. Test automatici cross-tenant: helper documentali MDL coperti; resta fixture E2E HTTP multi-tenant per tutta la route.
5. Sync incrementale: tombstone implementati e coperti da test unitario mapping; resta test E2E tabella-per-tabella con fixture reale.
6. Registro DPIA/ROPA aggiornato con trattamento offline desktop.

## Valutazione Finale

Lo stato tecnico e utilizzabile con rischio controllato per test e rollout progressivo, ma non va considerato "zero rischio". I punti piu sensibili sono DB locale desktop, upload documenti e validazione formale Allegato 3B. Con le mitigazioni indicate e test E2E ripetibili, il sistema puo raggiungere un livello di sicurezza adeguato al trattamento di dati sanitari in contesto multi-tenant.
