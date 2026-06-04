# Analisi E2E GDPR e Sicurezza Webapp/Desktop

Data: 2026-06-04  
Ambito: ElementMedica webapp, API `/api/v1`, app desktop offline-first, sincronizzazione online/offline, documenti MDL, licenze desktop, bridge dispositivi.

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
- La firma online puo firmare un documento sorgente gia archiviato, evitando di rigenerare un PDF diverso da quello visto dall'utente.
- I PDF generati per riunione periodica e risultati anonimi collettivi vengono archiviati nei documenti MDL, rendendo possibile storico, firma e upload firmato.

Rischio residuo: medio. Serve retention policy documentale esplicita e verifica malware/antivirus sugli upload PDF/immagini.

### Desktop offline-first

- Il DB locale e in `app.getPath('userData')`, separato dall'installazione.
- WAL e PRAGMA prestazionali sono configurati.
- La licenza consente uso offline con grace period limitato.
- Il packaging Windows ora forza rebuild/install native deps `win32-x64` e unpack esplicito di `better-sqlite3`, evitando il bundle di un `.node` non Windows.

Rischio residuo: alto se il dispositivo non e cifrato a livello OS. Il DB locale contiene dati sanitari: BitLocker/FileVault o cifratura applicativa del DB devono essere requisiti operativi.

## Rischi Critici e Mitigazioni

### Dati sanitari su desktop

Rischio: perdita/furto laptop o profilo Windows compromesso con accesso al DB SQLite locale.

Mitigazioni richieste:
- Obbligare cifratura disco: BitLocker su Windows, FileVault su macOS.
- Auto-lock app gia presente: verificare timeout e blocco dopo sospensione.
- Valutare cifratura applicativa SQLite con chiave derivata da credenziale locale o secure storage.
- Disabilitare export massivi non autorizzati e tracciare ogni export in audit log.

Priorita: alta.

### Upload documenti

Rischio: caricamento file malevoli o PDF con contenuto attivo.

Mitigazioni richieste:
- Limitare MIME e dimensione, gia presente.
- Aggiungere scansione antivirus/ClamAV o servizio equivalente prima della pubblicazione.
- Forzare download/preview con header sicuri (`Content-Type`, `Content-Disposition`, `X-Content-Type-Options: nosniff`).
- Evitare rendering inline di formati non PDF/immagine sicuri.

Priorita: alta.

### Sincronizzazione online/offline

Rischio: divergenza dati, conflitti non rilevati, perdita di aggiornamenti o overwrite di dati sanitari.

Mitigazioni richieste:
- Ogni tabella sync deve avere `updatedAt`, `deletedAt`, `tenantId`, `remoteId/localId` e mapping ID verificabile.
- Upload deve essere idempotente e non creare duplicati per movimenti/documenti/visite.
- Errori di remap devono bloccare solo il record interessato e produrre coda retry, non perdere batch interi.
- Il full download deve essere affiancato da sync incrementale basata su `updatedAt`/cursor per ridurre payload e rischi di timeout.

Priorita: alta.

### Allegato 3B e documenti inviati a enti

Rischio: XML errato inviato a INAIL o statistiche non allineate.

Mitigazioni richieste:
- Ricalcolo statistiche al momento dell'export XML, non affidarsi a snapshot obsoleti.
- Preview modificabile con evidenza dei campi calcolati vs manuali.
- Validazione XSD ufficiale prima del download definitivo.
- Audit log di generazione, modifica manuale, export e invio.

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

## Gap Da Chiudere Prima Di Dichiarare Conformita Piena

1. Cifratura forte del DB locale o requisito tecnico obbligatorio di cifratura disco.
2. Validazione XSD Allegato 3B integrata prima dell'export definitivo.
3. Antivirus/malware scanning sugli upload.
4. Hash SHA-256 e catena di custodia per PDF regolatori firmati.
5. Test automatici cross-tenant per ogni nuova route documentale.
6. Sync incrementale con cursor per ridurre full download e superficie di errore.
7. Registro DPIA/ROPA aggiornato con trattamento offline desktop.

## Valutazione Finale

Lo stato tecnico e utilizzabile con rischio controllato per test e rollout progressivo, ma non va considerato "zero rischio". I punti piu sensibili sono DB locale desktop, upload documenti e validazione formale Allegato 3B. Con le mitigazioni indicate e test E2E ripetibili, il sistema puo raggiungere un livello di sicurezza adeguato al trattamento di dati sanitari in contesto multi-tenant.
