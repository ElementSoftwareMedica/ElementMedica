# Frequently Asked Questions (FAQ)

**Versione:** 2.0 Post-Refactoring  
**Data:** 25 Gennaio 2025  
**Sistema:** Architettura Tre Server GDPR-Compliant

## 📋 Panoramica

Questa sezione contiene le risposte alle domande più frequenti sul Sistema Unificato Person con architettura a tre server, organizzate per categoria per facilitare la ricerca delle informazioni.

## 🏗️ Architettura Sistema

**Domanda:** Come è strutturato il nuovo sistema?

**Risposta:** Il sistema utilizza un'architettura a tre server:
- **API Server (3000)**: Gestisce Person CRUD, autenticazione, GDPR
- **Documents Server (3001)**: Genera PDF e gestisce file
- **Proxy Server (3002)**: Load balancing e routing

Tutti i server comunicano con un database PostgreSQL unificato.

## 🚀 Domande Generali

### Cos'è il Sistema Unificato Person?

Il Sistema Unificato Person è una piattaforma GDPR-compliant che gestisce tutte le tipologie di utenti (admin, user, customer) attraverso un'unica entità "Person" con sistema di ruoli flessibile. Include gestione documenti, autenticazione sicura PKCE+JWT, e compliance GDPR completa con audit trail.

### Quali browser sono supportati?

**Browser Supportati:**
- ✅ **Chrome** 90+ (Consigliato per sviluppo)
- ✅ **Firefox** 88+
- ✅ **Safari** 14+
- ✅ **Edge** 90+

**Browser Non Supportati:**
- ❌ Internet Explorer (tutte le versioni)
- ❌ Chrome < 90
- ❌ Firefox < 88

**Note per Sviluppatori:**
- Usare sempre Chrome DevTools per debugging
- Testare su tutti i browser supportati
- Verificare compatibilità JWT e PKCE

### È disponibile un'app mobile?

**Stato Attuale:**
- 📱 **App iOS:** Pianificata Q3 2025
- 📱 **App Android:** Pianificata Q3 2025
- 🌐 **Web Mobile:** Supportata (responsive design)

**Funzionalità Web Mobile:**
- Gestione Person (CRUD)
- Autenticazione PKCE
- Export dati GDPR
- Gestione consensi
- Visualizzazione documenti

**Considerazioni GDPR Mobile:**
- Stesso livello di compliance
- Audit trail completo
- Gestione consensi mobile-friendly

### Quali formati di file sono supportati?

**Documenti:**
- 📄 PDF (tutte le versioni)
- 📝 Microsoft Word (.doc, .docx)
- 📊 Microsoft Excel (.xls, .xlsx)
- 📋 Microsoft PowerPoint (.ppt, .pptx)
- 📄 Testo (.txt, .rtf)
- 📄 OpenDocument (.odt, .ods, .odp)

**Immagini:**
- 🖼️ JPEG (.jpg, .jpeg)
- 🖼️ PNG (.png)
- 🖼️ GIF (.gif)
- 🖼️ SVG (.svg)
- 🖼️ TIFF (.tiff, .tif)

**Altri:**
- 📦 ZIP (.zip)
- 📦 RAR (.rar)
- 📄 CSV (.csv)
- 🎥 Video (.mp4, .avi, .mov) - Solo visualizzazione

**Formati Non Supportati:**
- ❌ File eseguibili (.exe, .msi)
- ❌ Script (.bat, .sh, .ps1)
- ❌ File di sistema

## 👤 Domande su Account e Accesso

### Quali sono le credenziali di test standard?

**Credenziali Test Obbligatorie:**
```
Email: admin@example.com
Password: Admin123!
```

**⚠️ IMPORTANTE:**
- Usare SEMPRE queste credenziali per test
- Mai usare credenziali reali in development
- Mai hardcodare credenziali nel codice
- Configurare via variabili ambiente in production

### Come funziona l'autenticazione PKCE?

**PKCE (Proof Key for Code Exchange)** è il metodo di autenticazione sicura utilizzato:

1. **Code Verifier**: Stringa random generata dal client
2. **Code Challenge**: Hash SHA256 del code verifier
3. **Authorization**: Server verifica challenge
4. **Token Exchange**: Rilascio JWT con verifier

**Vantaggi:**
- Protezione contro attacchi man-in-the-middle
- Sicurezza per applicazioni pubbliche
- Standard OAuth 2.1

### Come posso reimpostare la password?

**⚠️ Solo per Ambiente di Test:**

**Metodo 1 - Script Reset (Autorizzato):**
```bash
# Solo con autorizzazione Tech Lead
./scripts/reset-test-user.sh
```

**Metodo 2 - Database Reset (Emergenza):**
```sql
-- Solo in development, mai in production
UPDATE "Person" 
SET "passwordHash" = '[new-hash]' 
WHERE email = 'admin@example.com';
```

**Metodo 3 - Contatta Tech Lead:**
- Fornisci la tua email aziendale
- Specifica ambiente (dev/staging/prod)
- Richiedi reset autorizzato

### Perché non riesco ad accedere?

**Possibili Cause Sistema Person:**

1. **Credenziali Errate**
   - Verifica di usare: admin@example.com / Admin123!
   - Controlla CAPS LOCK
   - Verifica layout tastiera

2. **Person Soft-Deleted**
   ```sql
   -- Verifica se Person è attiva
   SELECT email, "deletedAt" 
   FROM "Person" 
   WHERE email = 'admin@example.com';
   ```

3. **Ruoli Disattivati**
   ```sql
   -- Verifica ruoli attivi
   SELECT pr."roleType", pr."isActive" 
   FROM "PersonRole" pr 
   JOIN "Person" p ON pr."personId" = p.id 
   WHERE p.email = 'admin@example.com';
   ```

4. **Problemi JWT/PKCE**
   - Svuota localStorage del browser
   - Verifica configurazione JWT_SECRET
   - Controlla logs API Server: `pm2 logs api-server`

5. **Server Issues**
   ```bash
   # Verifica health dei server
   curl http://localhost:4003/health
   curl http://localhost:4001/health
   curl http://localhost:4002/health
   ```

6. **Database Connectivity**
   ```bash
   # Test connessione database
   psql -d person_system -c "SELECT 1;"
   ```

### Come posso cambiare la mia password?

1. Accedi al sistema
2. Vai in "⚙️ Impostazioni" → "🔒 Sicurezza"
3. Clicca "🔑 Cambia Password"
4. Inserisci:
   - Password attuale
   - Nuova password
   - Conferma nuova password
5. Clicca "Salva"

**Requisiti Password:**
- Minimo 8 caratteri
- Almeno 1 lettera maiuscola
- Almeno 1 lettera minuscola
- Almeno 1 numero
- Almeno 1 carattere speciale (!@#$%^&*)

### Come funziona il sistema di ruoli Person?

**Sistema Unificato PersonRole:**

Tutte le tipologie di utenti sono gestite tramite l'entità `Person` con ruoli associati:

```prisma
enum RoleType {
  ADMIN
  USER  
  CUSTOMER
  MANAGER
  VIEWER
}
```

**Esempi di Utilizzo:**
```javascript
// Verifica se Person ha ruolo ADMIN
const hasAdminRole = person.roles.some(role => 
  role.roleType === 'ADMIN' && role.isActive
);

// Assegna nuovo ruolo
await prisma.personRole.create({
  data: {
    personId: person.id,
    roleType: 'MANAGER',
    isActive: true
  }
});
```

**Vantaggi:**
- Flessibilità: Una Person può avere più ruoli
- Scalabilità: Facile aggiungere nuovi ruoli
- GDPR: Audit trail completo
- Sicurezza: Controllo granulare permessi

### Cos'è il Soft Delete?

**Implementazione GDPR-Compliant:**

Invece di eliminare fisicamente i record, il sistema usa `deletedAt`:

```javascript
// ✅ CORRETTO - Soft delete
const deletePerson = async (id) => {
  return await prisma.person.update({
    where: { id },
    data: { 
      deletedAt: new Date(),
      email: `deleted_${id}@deleted.local`,
      firstName: '[DELETED]',
      lastName: '[DELETED]'
    }
  });
};

// ✅ CORRETTO - Query solo record attivi
const activePersons = await prisma.person.findMany({
  where: { deletedAt: null }
});
```

**Vantaggi:**
- **GDPR Compliance**: Mantiene audit trail
- **Recuperabilità**: Possibile ripristino
- **Integrità**: Preserva relazioni database
- **Audit**: Tracciabilità completa

## 📁 Domande sui Documenti

### Qual è la dimensione massima per i file?

**Limiti Standard:**
- 📄 **File singolo:** 10 MB
- 📤 **Upload simultaneo:** 10 file
- 💾 **Spazio totale:** Varia per tenant

**Limiti Personalizzati:**
- Gli amministratori possono aumentare i limiti
- Piani Enterprise hanno limiti più alti
- Contatta l'admin per richieste speciali

### Come posso organizzare i miei documenti?

**Struttura Consigliata:**
```
📁 I Miei Documenti
├── 📁 Progetti
│   ├── 📁 Progetto Alpha
│   └── 📁 Progetto Beta
├── 📁 Amministrazione
│   ├── 📁 Contratti
│   └── 📁 Fatture
└── 📁 Personale
    ├── 📁 Formazione
    └── 📁 Valutazioni
```

**Best Practices:**
- Usa nomi cartelle descrittivi
- Mantieni una struttura coerente
- Non creare troppe sottocartelle
- Usa i tag per categorizzazione aggiuntiva

### Come funziona il controllo versioni?

**Versioning Automatico:**
- Ogni upload di un file esistente crea una nuova versione
- Le versioni precedenti sono sempre accessibili
- Puoi ripristinare qualsiasi versione precedente

**Gestione Versioni:**
1. Clicca sul documento
2. Vai alla tab "📋 Versioni"
3. Visualizza cronologia completa
4. Scarica o ripristina versioni precedenti

**Numerazione:**
- v1.0 - Versione iniziale
- v1.1 - Modifiche minori
- v2.0 - Modifiche maggiori

### Posso recuperare un file eliminato?

**Cestino Documenti:**
- I file eliminati vanno nel cestino
- Rimangono nel cestino per 30 giorni
- Puoi ripristinarli entro questo periodo

**Come Recuperare:**
1. Vai in "🗑️ Cestino"
2. Trova il documento eliminato
3. Clicca "🔄 Ripristina"
4. Il file torna nella posizione originale

**Eliminazione Definitiva:**
- Dopo 30 giorni i file sono eliminati definitivamente
- Gli admin possono recuperare da backup (entro 90 giorni)

## 🔍 Domande sulla Ricerca

### Come posso trovare rapidamente un documento?

**Ricerca Rapida:**
1. Usa la barra di ricerca in alto
2. Digita parole chiave del:
   - Nome file
   - Contenuto documento
   - Tag associati
   - Nome autore

**Ricerca Avanzata:**
1. Clicca "🔍 Ricerca Avanzata"
2. Usa filtri specifici:
   - Tipo file
   - Data creazione
   - Dimensione
   - Autore
   - Cartella

**Operatori Ricerca:**
- `"frase esatta"` - Cerca frase esatta
- `parola1 AND parola2` - Entrambe presenti
- `parola1 OR parola2` - Almeno una presente
- `-parola` - Esclude documenti con questa parola

### Perché la ricerca non trova il mio documento?

**Possibili Cause:**

1. **Indicizzazione in Corso**
   - I nuovi documenti richiedono tempo per l'indicizzazione
   - Attendi 5-10 minuti dopo l'upload

2. **Permessi Insufficienti**
   - Puoi cercare solo documenti a cui hai accesso
   - Verifica i permessi con il proprietario

3. **Documento in Cartella Privata**
   - Controlla se il documento è in una cartella condivisa
   - Verifica la posizione del documento

4. **Termini di Ricerca Troppo Specifici**
   - Prova termini più generici
   - Usa la ricerca avanzata con filtri

### Posso cercare all'interno del contenuto dei PDF?

**Sì, la ricerca full-text è supportata per:**
- ✅ PDF con testo selezionabile
- ✅ Documenti Word/Excel/PowerPoint
- ✅ File di testo
- ✅ Email (se supportate)

**Limitazioni:**
- ❌ PDF scansionati (solo immagini)
- ❌ Immagini senza OCR
- ❌ File protetti da password

**OCR (Riconoscimento Ottico):**
- Disponibile per piani Enterprise
- Elabora automaticamente PDF scansionati
- Estrae testo da immagini

## 🤝 Domande sulla Condivisione

### Come posso condividere un documento?

**Condivisione Interna:**
1. Seleziona il documento
2. Clicca "🔗 Condividi"
3. Aggiungi utenti o gruppi
4. Imposta permessi:
   - 👁️ Solo lettura
   - ✏️ Modifica
   - 🗑️ Eliminazione
5. Clicca "Condividi"

**Link Pubblico:**
1. Clicca "🔗 Genera Link"
2. Configura opzioni:
   - Scadenza
   - Password (opzionale)
   - Limite visualizzazioni
3. Copia e condividi il link

### Quanto tempo rimane attivo un link di condivisione?

**Durata Default:**
- Link senza scadenza: **Permanenti**
- Link con scadenza: **Personalizzabile**

**Opzioni Scadenza:**
- 1 ora
- 1 giorno
- 1 settimana
- 1 mese
- 3 mesi
- 6 mesi
- 1 anno
- Personalizzato

**Gestione Link:**
- Puoi disattivare un link in qualsiasi momento
- Visualizzi statistiche di accesso
- Ricevi notifiche di utilizzo (opzionale)

### Posso vedere chi ha visualizzato il mio documento?

**Sì, il sistema traccia:**
- 👤 **Chi** ha visualizzato
- 📅 **Quando** è stato visualizzato
- 🌐 **Da dove** (IP/dispositivo)
- ⏱️ **Quanto tempo** di visualizzazione

**Come Visualizzare:**
1. Apri il documento
2. Vai alla tab "📊 Analytics"
3. Visualizza statistiche dettagliate

**Privacy:**
- Solo il proprietario vede le statistiche complete
- Gli utenti con permessi di modifica vedono statistiche limitate
- Rispetta le impostazioni privacy del tenant

### Come posso revocare l'accesso a un documento?

**Revoca Condivisione Utente:**
1. Vai alle impostazioni del documento
2. Sezione "👥 Condiviso con"
3. Clicca "🗑️" accanto all'utente
4. Conferma la revoca

**Disattiva Link Pubblico:**
1. Vai a "🔗 Link Attivi"
2. Clicca "🗑️ Elimina" sul link
3. Il link diventa immediatamente inaccessibile

**Revoca Immediata:**
- Le modifiche sono immediate
- Gli utenti perdono accesso istantaneamente
- Ricevono notifica della revoca (opzionale)

## ⚙️ Domande su Impostazioni

### Come posso cambiare la lingua dell'interfaccia?

1. Vai in "⚙️ Impostazioni" → "🌐 Preferenze"
2. Sezione "Lingua"
3. Seleziona la lingua desiderata:
   - 🇮🇹 Italiano
   - 🇬🇧 English
   - 🇫🇷 Français
   - 🇩🇪 Deutsch
   - 🇪🇸 Español
4. Clicca "Salva"
5. La pagina si ricarica nella nuova lingua

### Come posso cambiare il tema (chiaro/scuro)?

1. Vai in "⚙️ Impostazioni" → "🎨 Aspetto"
2. Seleziona tema:
   - 🌞 **Chiaro** - Sfondo bianco
   - 🌙 **Scuro** - Sfondo scuro
   - 🔄 **Automatico** - Segue sistema operativo
3. Il cambiamento è immediato

**Vantaggi Tema Scuro:**
- Riduce affaticamento occhi
- Risparmia batteria (schermi OLED)
- Migliore per ambienti poco illuminati

### Come posso personalizzare la dashboard?

**Widget Disponibili:**
- 📄 Documenti Recenti
- 📊 Statistiche Utilizzo
- 📈 Grafici Attività
- 📅 Calendario Scadenze
- 👥 Attività Team
- 🔔 Notifiche

**Personalizzazione:**
1. Vai in "📊 Dashboard"
2. Clicca "⚙️ Personalizza"
3. Trascina widget per riorganizzare
4. Ridimensiona trascinando gli angoli
5. Nascondi widget non necessari
6. Salva layout

### Come gestisco le notifiche?

**Tipi di Notifiche:**
- 📧 **Email** - Inviate alla tua casella
- 🔔 **Browser** - Notifiche desktop
- 📱 **In-App** - All'interno del sistema

**Configurazione:**
1. Vai in "⚙️ Impostazioni" → "🔔 Notifiche"
2. Configura per categoria:
   - Documenti condivisi
   - Caricamenti completati
   - Scadenze documenti
   - Attività team
   - Aggiornamenti sistema

**Frequenza Email:**
- Immediato
- Digest giornaliero
- Digest settimanale
- Mai

## 🔒 Domande su Sicurezza e Privacy

### I miei documenti sono sicuri?

**Sicurezza Dati:**
- 🔐 **Crittografia** AES-256 per dati a riposo
- 🔒 **HTTPS/TLS** per dati in transito
- 🛡️ **Backup** automatici giornalieri
- 🔑 **Controllo accessi** granulare

**Sicurezza Infrastruttura:**
- 🏢 **Data center** certificati ISO 27001
- 🔥 **Firewall** e sistemi di rilevamento intrusioni
- 📊 **Monitoraggio** 24/7
- 🔄 **Aggiornamenti** di sicurezza automatici

**Compliance:**
- ✅ GDPR compliant
- ✅ ISO 27001
- ✅ SOC 2 Type II

### Cosa succede ai miei dati se lascio l'azienda?

**Processo Standard:**
1. **Account disattivato** dall'amministratore
2. **Documenti personali** trasferiti o eliminati
3. **Documenti condivisi** rimangono accessibili al team
4. **Dati personali** anonimizzati dopo 90 giorni

**Diritti GDPR:**
- Puoi richiedere esportazione dati
- Puoi richiedere eliminazione completa
- Puoi richiedere rettifica dati errati

### Come posso richiedere l'eliminazione dei miei dati?

**Richiesta Self-Service:**
1. Vai in "⚙️ Impostazioni" → "🔒 Privacy"
2. Sezione "Diritti GDPR"
3. Clicca "🗑️ Richiedi Eliminazione Dati"
4. Conferma la richiesta

**Processo:**
- Richiesta elaborata entro 30 giorni
- Ricevi conferma via email
- Dati anonimizzati o eliminati
- Log mantenuti per compliance (anonimi)

**Attenzione:**
- ⚠️ Processo irreversibile
- ⚠️ Perdi accesso a tutti i documenti
- ⚠️ Condivisioni vengono revocate

### Posso esportare tutti i miei dati?

**Sì, puoi richiedere un'esportazione completa:**

**Cosa Include:**
- 👤 Dati profilo
- 📄 Tutti i documenti caricati
- 📊 Log delle attività
- 🔗 Cronologia condivisioni
- ⚙️ Impostazioni e preferenze

**Come Richiedere:**
1. Vai in "🔒 Privacy" → "📤 Esporta Dati"
2. Seleziona dati da includere
3. Clicca "Richiedi Esportazione"
4. Ricevi email quando pronto
5. Scarica archivio ZIP

**Formato Dati:**
- Documenti: File originali
- Metadati: JSON strutturato
- Report: PDF leggibile

## 💰 Domande su Piani e Limiti

### Quali sono i limiti del mio piano?

**Piano Base:**
- 👥 Utenti: 10
- 💾 Storage: 10 GB
- 📄 Documenti: 1,000
- 🔗 Condivisioni: 50/mese

**Piano Professional:**
- 👥 Utenti: 50
- 💾 Storage: 100 GB
- 📄 Documenti: 10,000
- 🔗 Condivisioni: 500/mese
- 📊 Analytics avanzate

**Piano Enterprise:**
- 👥 Utenti: Illimitati
- 💾 Storage: 1 TB+
- 📄 Documenti: Illimitati
- 🔗 Condivisioni: Illimitate
- 🔍 OCR incluso
- 🛡️ Sicurezza avanzata
- 📞 Supporto prioritario

### Come posso vedere il mio utilizzo attuale?

1. Vai in "📊 Dashboard"
2. Widget "Statistiche Utilizzo"
3. Visualizza:
   - Spazio utilizzato/disponibile
   - Numero documenti
   - Condivisioni del mese
   - Utenti attivi

**Dettagli Avanzati:**
- Vai in "⚙️ Impostazioni" → "📊 Utilizzo"
- Grafici storici
- Breakdown per categoria
- Proiezioni future

### Cosa succede se supero i limiti?

**Superamento Storage:**
- ⚠️ Avviso al 80% di utilizzo
- 🚫 Blocco upload al 100%
- 📧 Notifiche amministratore
- 💡 Suggerimenti per liberare spazio

**Superamento Utenti:**
- 🚫 Impossibile aggiungere nuovi utenti
- 👥 Utenti esistenti continuano a funzionare
- 📧 Notifica per upgrade piano

**Soluzioni:**
- Elimina documenti non necessari
- Upgrade a piano superiore
- Acquista storage aggiuntivo
- Ottimizza utilizzo esistente

## 🆘 Domande su Supporto

### Come posso contattare il supporto?

**Canali Disponibili:**

1. **💬 Chat Live**
   - Icona chat in basso a destra
   - Orari: Lun-Ven 9:00-18:00
   - Risposta immediata

2. **📧 Email**
   - support@yourdomain.com
   - Risposta entro 4 ore
   - Allegare screenshot se utili

3. **📞 Telefono**
   - +39 02 1234 5678
   - Orari: Lun-Ven 9:00-18:00
   - Per problemi urgenti

4. **📚 Knowledge Base**
   - help.yourdomain.com
   - Guide dettagliate
   - Video tutorial

### Quali informazioni devo fornire per una segnalazione?

**Informazioni Essenziali:**
1. **Descrizione problema** dettagliata
2. **Passi per riprodurre** il problema
3. **Messaggio errore** esatto (se presente)
4. **Browser e versione** utilizzati
5. **Sistema operativo**
6. **Timestamp** quando si è verificato

**Informazioni Utili:**
- Screenshot del problema
- URL della pagina
- Azioni eseguite prima dell'errore
- Se il problema è ricorrente
- Altri utenti coinvolti

**Template Segnalazione:**
```
Oggetto: [PROBLEMA] Breve descrizione

Descrizione:
[Descrivi cosa è successo]

Passi per riprodurre:
1. [Primo passo]
2. [Secondo passo]
3. [Risultato atteso vs ottenuto]

Informazioni tecniche:
- Browser: Chrome 120
- OS: Windows 11
- Timestamp: 27/01/2025 10:30
- URL: https://app.yourdomain.com/documents

Allegati:
[Screenshot se disponibili]
```

### Quanto tempo ci vuole per risolvere un problema?

**Tempi di Risposta:**

**Problemi Critici** (Sistema down)
- 🚨 Risposta: 30 minuti
- 🔧 Risoluzione: 2-4 ore
- 📞 Escalation automatica

**Problemi Gravi** (Funzionalità non disponibili)
- ⚠️ Risposta: 2 ore
- 🔧 Risoluzione: 4-8 ore
- 📧 Aggiornamenti ogni 2 ore

**Problemi Normali** (Bug minori)
- 📧 Risposta: 4 ore
- 🔧 Risoluzione: 1-3 giorni
- 📊 Aggiornamenti giornalieri

**Richieste Informazioni**
- 💬 Risposta: 1 ora
- ✅ Risoluzione: Immediata

### È disponibile supporto fuori orario?

**Supporto Standard:**
- 🕘 Orari: Lun-Ven 9:00-18:00
- 📧 Email: Sempre accettate
- 💬 Chat: Solo in orario

**Supporto Emergenze:**
- 📞 Telefono: +39 333 123 4567
- 🕐 Orari: 24/7
- 🚨 Solo per: Sistema down, perdita dati, sicurezza

**Piani Enterprise:**
- 📞 Supporto prioritario 24/7
- 👨‍💼 Account manager dedicato
- 🔧 Interventi on-site disponibili

---

## 📞 Contatti Rapidi

### Supporto Tecnico
- **💬 Chat:** Icona in basso a destra
- **📧 Email:** support@yourdomain.com
- **📞 Telefono:** +39 02 1234 5678

### Emergenze
- **📞 Telefono:** +39 333 123 4567
- **🚨 Solo per:** Sistemi down, perdita dati

### Risorse Online
- **📚 Knowledge Base:** help.yourdomain.com
- **🎥 Video Tutorial:** tutorials.yourdomain.com
- **📋 Status Sistema:** status.yourdomain.com

---

**Precedente:** [Common Issues](common-issues.md)  
**Prossimo:** [User Manual](../user/user-manual.md)  
**Correlato:** [Admin Manual](../user/admin-manual.md)

---

*Questa FAQ è aggiornata alla versione 1.0 del sistema. Per domande non coperte, contatta il supporto tecnico.*

### Autenticazione/JWT

**D: Devo configurare JWT_SECRET sul Proxy?**  
R: No. Il Proxy non firma token e non necessita di variabili JWT. I secret vanno configurati solo sull'API Server.

**D: Come devo inviare il refresh token?**  
R: L'endpoint `/auth/refresh` accetta il token sia via header `X-Refresh-Token` sia nel body come `refresh_token`.