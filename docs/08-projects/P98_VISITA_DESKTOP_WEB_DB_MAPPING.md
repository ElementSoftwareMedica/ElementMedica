# P98 - Allineamento Visita Web/Desktop e DB Offline

Aggiornato: 2026-06-01

## Stato

- Release `0.1.37` macOS + Windows pubblicata su `/desktop-updates`.
- Accesso SSH root ripristinato via rescue Hetzner senza creare nuovi server o servizi.
- Storage produzione impostato esplicitamente su `STORAGE_MODE=local`: i file vengono salvati sul VPS in `/var/www/elementmedica/backend/uploads` e sono serviti da Nginx come `/uploads/...`.
- Audit aggiuntivo completato su `/aziende`, `/aziende/:id`, `/pazienti`, `/pazienti/:id`, `/visite`, `/visite/:id`: le relazioni web critiche ora hanno tabelle locali dedicate; i JSON residui sono campi JSON anche nello schema Prisma o code/audit tecnici.

## Mappatura `/visite/:id`

La webapp usa `/visite/:id` come aggregatore di dati clinici, documentali, MDL, contabili e audit. L'app desktop ora ha tabelle locali dedicate e non solo contenitori generici per:

- visita, appuntamento, prestazioni appuntamento;
- paziente e profilo salute;
- mansioni, rischi lavoratore, protocolli, scadenze;
- rischi mansione in `mansione_rischi`;
- prestazioni protocollo in `protocollo_prestazioni`;
- giudizio idoneita, esami strumentali, allegati;
- template visita;
- template modulistica/questionari;
- configurazione questionari medici in `questionari_medici_config`;
- documenti compilati;
- risposte questionari;
- documenti clinici e documenti personali;
- referti;
- revisioni visita e access log visita;
- firme digitali;
- movimenti contabili;
- tariffari aziendali, voci tariffario e associazioni aziende.
- nomine figure sicurezza/medico competente in `nomine_ruolo`.
- profilo salute in colonne dedicate di `profili_salute`, non nel contenitore generico `data`.

## Tabelle Desktop Aggiunte/Estese

- `documenti_compilati`
- `questionari_risposte`
- `profili_salute`
- `documenti_clinici`
- `person_documents`
- `referti`
- `visit_revisions`
- `visit_access_logs`
- `firme_digitali`
- `nomine_ruolo`
- `mansione_rischi`
- `protocollo_prestazioni`
- `questionari_medici_config`
- `sopralluoghi`
- `dvr`
- `consulenze_mdl`
- `allegati_3b`
- `slot_disponibilita`
- estensione `document_templates` con campi firma/versione/branch/validita/obbligatorieta
- `questionari_compilati` rimosso dai percorsi runtime desktop: modulistica/questionari usa solo `documenti_compilati` e `questionari_risposte`.

## Mappatura Pagine Target

| Pagina desktop | Tabelle locali dedicate | Note |
| --- | --- | --- |
| `/aziende` | `companies`, `company_sites`, `nomine_ruolo`, `patients`, `lavoratore_mansioni`, `mansioni`, `mansione_rischi`, `protocolli`, `protocollo_prestazioni`, `tariffari`, `tariffario_voci`, `tariffario_company_associations`, `movimenti_contabili` | Il filtro con/senza MC usa `nomine_ruolo` e sedi, non JSON azienda. |
| `/aziende/:id` | `companies`, `company_sites`, `nomine_ruolo`, `patients`, `lavoratore_mansioni`, `mansioni`, `mansione_rischi`, `protocolli`, `protocollo_prestazioni`, `scadenze`, `appointments`, `visits`, `documenti_clinici`, `person_documents`, `tariffari`, `tariffario_voci`, `tariffario_company_associations`, `movimenti_contabili`, `sopralluoghi`, `dvr`, `consulenze_mdl`, `allegati_3b` | Sorveglianza sanitaria, nomine, tariffari, servizi MDL e documenti leggono relazioni dedicate. |
| `/pazienti` | `patients`, `companies`, `company_sites`, `lavoratore_mansioni`, `mansioni`, `visits`, `appointments` | Lista e filtri usano colonne locali indicizzate. |
| `/pazienti/:id` | `patients`, `profili_salute`, `documenti_clinici`, `person_documents`, `lavoratore_mansioni`, `mansioni`, `mansione_rischi`, `protocolli`, `protocollo_prestazioni`, `scadenze`, `visits`, `appointments`, `giudizi_idoneita` | Card protocolli e mansioni non dipendono piu da JSON embedded. |
| `/visite` | `visits`, `appointments`, `appointment_prestazioni`, `patients`, `companies`, `prestazioni`, `medici`, `visit_templates`, `referti`, `movimenti_contabili` | Lista visite e azioni usano record locali dedicati. |
| `/visite/:id` | `visits`, `visit_templates`, `visit_revisions`, `visit_access_logs`, `patients`, `profili_salute`, `prestazioni`, `appointment_prestazioni`, `medici`, `giudizi_idoneita`, `esami_strumentali`, `document_templates`, `questionari_medici_config`, `documenti_compilati`, `questionari_risposte`, `documenti_clinici`, `person_documents`, `referti`, `firme_digitali`, `lavoratore_mansioni`, `mansioni`, `mansione_rischi`, `protocolli`, `protocollo_prestazioni`, `scadenze`, `tariffario_voci`, `movimenti_contabili` | E la pagina piu ampia: card MDL, modulistica/questionari, documenti, medico refertante, prestazioni, referto e audit hanno storage locale dedicato. |

## JSON Residui Consentiti

Questi campi restano JSON perche sono JSON anche nello schema Prisma online:

- `visits.datiStrutturati`, `visits.accessControl`;
- `visit_templates.fields`, `visit_templates.sidebarConfig`, `visit_templates.printConfig`;
- `document_templates.campi`;
- `documenti_compilati.datiCompilati`;
- `questionari_risposte.valoreJson`;
- `referti.allegati`;
- `visit_revisions.previousData`, `visit_revisions.newData`, `visit_access_logs.details`;
- `audit_logs.dataAccessed`, `audit_logs.metadata`.

I campi legacy `companies.mediciCoordinati`, `companies.nomineFigure`, `mansioni.rischi*`, `protocolli.prestazioni`, `tariffari.voci`, `tariffari.companyAssociations`, `document_templates.questionarioConfig`, `questionari_compilati` e `profili_salute.data` sono rimossi dai percorsi runtime desktop. I dati vengono riscaricati dal DB online nelle tabelle dedicate.

## Sync

Download `download-day` e `download-full-db` ora includono:

- `documentiCompilati`
- `questionariRisposte`
- `profiliSalute`
- `documentiClinici`
- `personDocuments`
- `referti`
- `visitRevisions`
- `visitAccessLogs`
- `firmeDigitali`
- `vociTariffario`
- `tariffarioCompanyAssociations`
- `mansioneRischi`
- `protocolloPrestazioni`
- `questionariMediciConfig`
- `sopralluoghi`
- `dvrs`
- `consulenzeMDL`
- `allegati3B`
- nomine da `CompanyTenantProfile.nomine`, salvate in `nomine_ruolo`

Upload batch ora riconosce anche:

- `documentoCompilato`
- `questionarioRisposta`
- `profiloDiSalutePersona`
- `documentoClinico`
- `referto`
- `firmaDigitale`
- `mansioneRischio`
- `protocolloPrestazione`
- `questionarioMedicoConfig`
- `tariffarioCompanyAssociation`
- `sopralluogo`
- `dVR`
- `consulenzaMDL`
- `allegato3B`

## Aggiornamento 0.1.35

- Aggiunta tabella locale `allegati_3b` allineata al modello online `Allegato3B`.
- Esteso download full DB con `allegati3B`; esteso upload batch con entity `allegato3B`.
- Estesa UI desktop di `/aziende/:id` con card Documenti Periodici comprensiva di Allegato 3B.
- Le card DVR, Sopralluoghi, Consulenze MDL e Documenti Periodici mostrano i documenti allegati gia presenti nel tab Documenti.
- I flussi MDL da Sorveglianza Sanitaria ora creano appuntamenti/visite con tutte le prestazioni selezionate dal protocollo, non solo la prestazione principale.

## Aggiornamento 0.1.36

- Aggiunta tabella locale `slot_disponibilita` e download sync per slot disponibilita MDL.
- Il modal desktop "Programma visite mediche" in `/aziende/:id` mostra una griglia settimanale con slot liberi/occupati, selezione medico, fasce orarie, assegnazione slot e fallback manuale.
- Il modal "Crea visita medica del lavoro" precompila medico, ambulatorio, data, ora e durata dallo slot attivo del medico quando disponibile.
- Corretto inserimento `lavoratore_rischi_aggiuntivi` con `_localId` obbligatorio.
- `/visite/:id` mantiene prestazioni multiple anche per visite senza appuntamento, salvandole in `datiStrutturati._prestazioniAggiuntive` senza sostituire la principale.
- `/visite/:id` recupera il piano di sorveglianza anche dal `protocolloSanitarioId` diretto del paziente.
- Migliorato layout del modal "Profilo di salute" con gruppi logici e campi condizionali.

## Aggiornamento 0.1.37

- Upload allegati visita desktop corretto: gli allegati vengono inviati con `_serverId` visita e non con ID locale; il fallback legacy non maschera piu i 404 applicativi.
- `/aziende/:id` mostra data inizio/scadenza nomina MC, successore e indicazione auto-rinnovo quando non c'e successore.
- `/aziende/:id` permette upload PDF firmato nelle nomine e mostra quicklook/download sui documenti collegati a DVR e sopralluoghi.
- `Nuova Consulenza MDL` calcola durata fatturabile e importo da voce tariffario consulenza con arrotondamento a frazione minima.
- `/visite/:id` salva e mostra prestazioni multiple anche nella card Sorveglianza Sanitaria, con periodicita/scadenza configurabile.
- `/visite/:id` migliora il modal Profilo di salute con BMI automatico, campi fumo/alcol/attivita condizionali e preset per unita alcoliche/ore attivita.
- Card Mansioni mostra il protocollo sanitario associato e ricarica il protocollo diretto del lavoratore dopo modifica.

## UI Desktop Corretta

- Il modal `DocumentiVisitaModal` legge/scrive solo `documenti_compilati`; il fallback legacy `questionari_compilati` e stato rimosso.
- I campi data del modal usano `ElegantDateInput` con formato utente `dd/mm/yyyy`.
- Il date picker chiude il popup su selezione giorno singolo; il range resta a doppio click.
- `/aziende` filtra "con/senza medico competente" su `nomine_ruolo` e `company_sites`, non su JSON generici.
- `/aziende/:id` legge nomine e tariffari da tabelle dedicate (`nomine_ruolo`, `tariffario_voci`, `tariffario_company_associations`).
- `/aziende/:id` ha l'associazione/cambio tariffario aziendale dentro la card "Servizi Medicina del Lavoro"; la card Tariffari duplicata nel tab Sicurezza e stata rimossa.
- `/aziende/:id` nella card "Sorveglianza Sanitaria" usa modal dedicati per "Programma visite mediche" e "Crea visita medica del lavoro", con selezione accertamenti da protocollo, medico, ambulatorio, sede, durata, tipo visita e prestazione principale.
- `/aziende/:id` mostra i documenti caricati anche nelle card di origine: DVR, sopralluoghi, consulenze MDL e documenti periodici.
- `/aziende/:id` include "Allegato 3B" nei Documenti Periodici con tabella locale e sync dedicati.
- `/aziende/:id`, `/pazienti/:id`, `/visite/:id` e `Protocolli` leggono rischi mansione e prestazioni protocollo da `mansione_rischi` e `protocollo_prestazioni`.
- `/visite/:id` risolve i prezzi delle prestazioni dai tariffari locali dedicati.
- `/visite/:id` legge e salva il profilo salute su `profili_salute` con campi dedicati, mantenendo in `visits.datiStrutturati` solo i dati dinamici della visita/template.

## Verifiche

- `node --check backend/controllers/desktop-sync.controller.js`: OK.
- `desktop-app npm run typecheck`: OK.
- `desktop-app npm run build`: OK.
- `desktop-app npm run test:e2e -- --reporter=list`: 9 passed, 3 skipped.
- `desktop-app npm run package`: OK macOS.
- `desktop-app npm run package:win`: OK Windows.
- 2026-06-01: `node --check backend/controllers/desktop-sync.controller.js`: OK.
- 2026-06-01: `desktop-app npm run typecheck`: OK.
- 2026-06-01: `desktop-app npm run build`: OK.
- 2026-06-01: `desktop-app npm run package`: OK macOS x64/arm64, release `0.1.37`.
- 2026-06-01: `desktop-app npm run package:win`: OK Windows x64, release `0.1.37`.
- 2026-06-01: manifest HTTPS `latest.yml` e `latest-mac.yml`: `version: 0.1.37`, HTTP 200.
- 2026-06-01: installer HTTPS Windows e macOS arm64: HTTP 200.
- 2026-06-01: `/api/v1/desktop-sync/upload-attachment`: HTTP 401 senza auth, route protetta presente.
- 2026-06-01: `/api/v1/clinica/documenti/visita/upload`: HTTP 401 senza auth, route protetta presente.
- 2026-06-01: manifest HTTPS `latest.yml` e `latest-mac.yml`: `version: 0.1.36`, HTTP 200.
- 2026-06-01: installer HTTPS Windows e macOS arm64: HTTP 200.
- 2026-06-01: `/health`: HTTP 200.
- 2026-06-01: `/api/v1/desktop-sync/upload-attachment`: HTTP 401 senza auth, route protetta presente.
- 2026-06-01: `/api/v1/clinica/documenti/visita/upload`: HTTP 401 senza auth, route protetta presente.
- 2026-06-01: `desktop-app npm run package`: OK macOS x64/arm64.
- 2026-06-01: `desktop-app npm run package:win`: OK Windows x64.
- 2026-06-01: `desktop-app npm run rebuild:native:mac:arm64`: OK.
- 2026-06-01: `desktop-app npm run test:e2e -- --reporter=list`: 9 passed, 3 skipped.
- 2026-06-01: manifest locali `latest.yml` e `latest-mac.yml`: `version: 0.1.36`.
- 2026-06-01: `desktop-app npm run package`: OK macOS.
- 2026-06-01: `desktop-app npm run package:win`: OK Windows.
- 2026-06-01: `desktop-app npm run rebuild:native:mac:arm64`: OK dopo package Windows.
- 2026-06-01: `desktop-app npm run test:e2e -- --reporter=list`: 9 passed, 3 skipped.
- 2026-06-01: manifest HTTPS `latest.yml` e `latest-mac.yml`: `version: 0.1.34`.
- 2026-06-01: endpoint `/api/v1/desktop-sync/upload-attachment`: HTTP 401 senza auth, route protetta presente.
- 2026-06-01: probe `/uploads/temp/...`: HTTP 200, poi rimosso.
- 2026-06-01: `node --check backend/controllers/desktop-sync.controller.js`: OK.
- 2026-06-01: `desktop-app npm run typecheck`: OK.
- 2026-06-01: `desktop-app npm run build`: OK.
- 2026-06-01: `desktop-app npm run package`: OK macOS x64/arm64.
- 2026-06-01: `desktop-app npm run package:win`: OK Windows x64.
- 2026-06-01: `desktop-app npm run rebuild:native:mac:arm64`: OK.
- 2026-06-01: `desktop-app npm run test:e2e -- --reporter=list`: 9 passed, 3 skipped.
- 2026-06-01: manifest locali `latest.yml` e `latest-mac.yml`: `version: 0.1.35`.
- 2026-06-01: manifest HTTPS `latest.yml` e `latest-mac.yml`: `version: 0.1.35`, HTTP 200.
- 2026-06-01: installer HTTPS Windows e macOS arm64: HTTP 200.
- 2026-06-01: `/health`: HTTP 200.
- 2026-06-01: `/api/v1/desktop-sync/upload-attachment`: HTTP 401 senza auth, route protetta presente.
- 2026-06-01: `node --check backend/controllers/desktop-sync.controller.js`: OK.
- 2026-06-01: `desktop-app npm run typecheck`: OK.
- 2026-06-01: `desktop-app npm run build`: OK.
