# 📧 Guida Setup Email con Google Workspace

**Data**: 10 Dicembre 2025  
**Domini**: elementmedica.com, elementformazione.com

---

## 📋 Indice

1. [Opzioni Disponibili](#opzioni-disponibili)
2. [Opzione A: Google Workspace (Raccomandato)](#opzione-a-google-workspace)
3. [Opzione B: Email Forwarding Gratuito](#opzione-b-email-forwarding-gratuito)
4. [Configurazione DNS](#configurazione-dns)
5. [Verifica Configurazione](#verifica-configurazione)

---

## 🎯 Opzioni Disponibili

| Opzione | Costo | Vantaggi | Svantaggi |
|---------|-------|----------|-----------|
| **Google Workspace** | €6/utente/mese | Full Gmail, Drive, Calendar | Costo mensile |
| **ImprovMX** | Gratuito | Forwarding semplice | Solo forward, no invio |
| **Zoho Mail** | Gratuito (1 utente) | Webmail completo | Limite utenti |
| **Mailgun/SendGrid** | Pay-as-you-go | API transazionali | Più tecnico |

---

## 📬 Opzione A: Google Workspace (Raccomandato)

### Step 1: Registrazione Google Workspace

1. Vai su: **https://workspace.google.com/intl/it/**
2. Clicca **"Inizia"**
3. Inserisci informazioni azienda:
   - Nome azienda: `Element Medica` (o `Element Formazione`)
   - Numero dipendenti: 1-9
   - Paese: Italia
4. Inserisci i tuoi dati personali
5. Scegli il dominio: **"Ho già un dominio"**
6. Inserisci: `elementmedica.com`
7. Crea account admin: `info@elementmedica.com`
8. Scegli piano: **Business Starter** (€6/mese)

### Step 2: Verifica Proprietà Dominio

Google ti chiederà di verificare che sei il proprietario del dominio.

**Metodo consigliato: Record TXT DNS**

1. Google ti darà un codice tipo:  
   `google-site-verification=xxxxxxxxxxxxxxxxxxx`

2. Vai nel pannello DNS del tuo registrar (dove hai comprato il dominio)

3. Aggiungi record TXT:
   ```
   Tipo:    TXT
   Host:    @
   Valore:  google-site-verification=xxxxxxxxxxxxxxxxxxx
   TTL:     3600
   ```

4. Attendi 5-15 minuti

5. Clicca "Verifica" in Google Workspace

### Step 3: Configurazione Record MX

Dopo la verifica, configura i record MX per ricevere email.

**Record MX da aggiungere:**

| Priorità | Server Mail |
|----------|-------------|
| 1 | `ASPMX.L.GOOGLE.COM` |
| 5 | `ALT1.ASPMX.L.GOOGLE.COM` |
| 5 | `ALT2.ASPMX.L.GOOGLE.COM` |
| 10 | `ALT3.ASPMX.L.GOOGLE.COM` |
| 10 | `ALT4.ASPMX.L.GOOGLE.COM` |

**Nel pannello DNS:**

```
Tipo:     MX
Host:     @
Valore:   ASPMX.L.GOOGLE.COM
Priorità: 1
TTL:      3600

Tipo:     MX
Host:     @
Valore:   ALT1.ASPMX.L.GOOGLE.COM
Priorità: 5
TTL:      3600

... (ripeti per tutti)
```

### Step 4: Record SPF (Anti-Spam)

Aggiungi record SPF per autenticare le email inviate:

```
Tipo:    TXT
Host:    @
Valore:  v=spf1 include:_spf.google.com ~all
TTL:     3600
```

### Step 5: Record DKIM (Firma Digitale)

1. In Google Workspace Admin: **Apps → Gmail → Authenticate email**
2. Clicca **"Generate new record"**
3. Google ti darà un record tipo:
   ```
   Nome:   google._domainkey
   Valore: v=DKIM1; k=rsa; p=MIIBIjANBg...
   ```
4. Aggiungi nel DNS:
   ```
   Tipo:    TXT
   Host:    google._domainkey
   Valore:  v=DKIM1; k=rsa; p=MIIBIjANBg...
   TTL:     3600
   ```
5. Torna in Google Workspace e clicca **"Start authentication"**

### Step 6: Record DMARC (Policy)

```
Tipo:    TXT
Host:    _dmarc
Valore:  v=DMARC1; p=quarantine; rua=mailto:info@elementmedica.com
TTL:     3600
```

### Step 7: Accesso Gmail

Dopo configurazione:
- Vai su: **https://mail.google.com**
- Login con: `info@elementmedica.com`

---

## 📬 Opzione B: Email Forwarding Gratuito (ImprovMX)

Se vuoi solo **ricevere** email e inoltrarle al tuo Gmail personale.

### Step 1: Registrazione ImprovMX

1. Vai su: **https://improvmx.com/**
2. Registrati (gratis)
3. Aggiungi dominio: `elementmedica.com`

### Step 2: Configura Alias

```
info@elementmedica.com → tua-email-personale@gmail.com
```

### Step 3: Record MX

```
Tipo:     MX
Host:     @
Valore:   mx1.improvmx.com
Priorità: 10
TTL:      3600

Tipo:     MX
Host:     @
Valore:   mx2.improvmx.com
Priorità: 20
TTL:      3600
```

### Step 4: Record SPF

```
Tipo:    TXT
Host:    @
Valore:  v=spf1 include:spf.improvmx.com ~all
TTL:     3600
```

**Limitazione**: Puoi solo RICEVERE. Per INVIARE come `info@elementmedica.com` devi configurare Gmail "Send as".

---

## 🌐 Configurazione DNS Completa

### Per elementmedica.com (Google Workspace)

```dns
# Verifica proprietà (temporaneo, puoi rimuovere dopo verifica)
@    TXT    "google-site-verification=xxxxxxxxxxxxx"

# Email (MX Records)
@    MX     1    ASPMX.L.GOOGLE.COM
@    MX     5    ALT1.ASPMX.L.GOOGLE.COM
@    MX     5    ALT2.ASPMX.L.GOOGLE.COM
@    MX     10   ALT3.ASPMX.L.GOOGLE.COM
@    MX     10   ALT4.ASPMX.L.GOOGLE.COM

# Autenticazione Email
@              TXT    "v=spf1 include:_spf.google.com ~all"
google._domainkey    TXT    "v=DKIM1; k=rsa; p=..."
_dmarc         TXT    "v=DMARC1; p=quarantine; rua=mailto:info@elementmedica.com"

# Sito Web (già configurato)
@    A    128.140.15.15
www  A    128.140.15.15
```

### Per elementformazione.com

Ripeti stessa configurazione con il secondo dominio in Google Workspace.

---

## ✅ Verifica Configurazione

### 1. Verifica MX Records

```bash
dig MX elementmedica.com +short
# Output atteso:
# 1 ASPMX.L.GOOGLE.COM.
# 5 ALT1.ASPMX.L.GOOGLE.COM.
# ...
```

### 2. Verifica SPF

```bash
dig TXT elementmedica.com +short | grep spf
# Output: "v=spf1 include:_spf.google.com ~all"
```

### 3. Verifica DKIM

```bash
dig TXT google._domainkey.elementmedica.com +short
# Output: "v=DKIM1; k=rsa; p=..."
```

### 4. Test Invio/Ricezione

1. Invia email a `info@elementmedica.com` da Gmail personale
2. Verifica ricezione in Google Workspace
3. Rispondi per testare l'invio

### 5. Tool Online

- **MX Toolbox**: https://mxtoolbox.com/
- **Google Admin Toolbox**: https://toolbox.googleapps.com/apps/checkmx/

---

## 🔧 Configurazione Gmail Esistente (Opzionale)

Se vuoi gestire `info@elementmedica.com` dal tuo Gmail personale:

### Ricevere (Forward)

1. In Google Workspace Admin → Users → `info@elementmedica.com`
2. Email forwarding → Aggiungi `tua-email@gmail.com`

### Inviare come (Send as)

1. Nel tuo Gmail personale → Impostazioni → Account
2. "Aggiungi un altro indirizzo email"
3. Inserisci: `info@elementmedica.com`
4. Google invierà email di verifica
5. Conferma il codice
6. Ora puoi inviare email come `info@elementmedica.com`

---

## 💰 Riepilogo Costi

### Google Workspace Business Starter

| Voce | Costo |
|------|-------|
| 1 utente | €6/mese |
| 2 utenti (2 domini) | €12/mese |
| **Annuale (sconto)** | ~€130/anno |

### Cosa Include

- ✅ Gmail professionale (30GB storage)
- ✅ Google Drive (30GB)
- ✅ Google Calendar
- ✅ Google Meet
- ✅ Google Docs/Sheets/Slides
- ✅ Supporto 24/7
- ✅ Admin console
- ✅ Sicurezza avanzata

---

## 📞 Prossimi Passi

1. **Decidi l'opzione** (Workspace raccomandato per professionalità)
2. **Accedi a Cloudflare** (i tuoi domini usano Cloudflare per DNS)
3. **Inizia con 1 dominio** (elementmedica.com)
4. **Testa tutto** prima di aggiungere il secondo
5. **Configura elementformazione.com** con stessa procedura

---

## ☁️ Guida Specifica Cloudflare

I tuoi domini usano **Cloudflare DNS**. Ecco come configurare:

### Accesso Cloudflare

1. Vai su: **https://dash.cloudflare.com/**
2. Login con le tue credenziali
3. Seleziona il dominio (es. `elementmedica.com`)
4. Vai su **DNS** nel menu laterale

### Aggiungere Record MX in Cloudflare

1. Clicca **"Add record"**
2. Tipo: **MX**
3. Name: **@**
4. Mail server: `ASPMX.L.GOOGLE.COM`
5. Priority: `1`
6. **Proxy status: DNS only** (nuvola grigia!) ⚠️ IMPORTANTE
7. Clicca **Save**

Ripeti per tutti i 5 record MX.

### Aggiungere Record TXT (SPF, DKIM, DMARC)

1. Clicca **"Add record"**
2. Tipo: **TXT**
3. Name: `@` (per SPF) o `google._domainkey` (per DKIM) o `_dmarc`
4. Content: il valore del record
5. **Proxy status: DNS only**
6. Clicca **Save**

### ⚠️ IMPORTANTE: Proxy Status

Per i record email (MX, TXT) devi **disabilitare il proxy Cloudflare**:
- ❌ Proxied (nuvola arancione) = NON FUNZIONA per email
- ✅ DNS only (nuvola grigia) = CORRETTO per email

### Screenshot Cloudflare (esempio)

```
┌─────────────────────────────────────────────────────────────┐
│ Type   Name              Content                   Proxy    │
├─────────────────────────────────────────────────────────────┤
│ A      @                 128.140.15.15             Proxied  │
│ A      www               128.140.15.15             Proxied  │
│ MX     @                 ASPMX.L.GOOGLE.COM (1)    DNS only │
│ MX     @                 ALT1.ASPMX.L.GOOGLE.COM   DNS only │
│ TXT    @                 v=spf1 include:_spf...    DNS only │
│ TXT    google._domainkey v=DKIM1; k=rsa; p=...     DNS only │
│ TXT    _dmarc            v=DMARC1; p=quarantine... DNS only │
└─────────────────────────────────────────────────────────────┘
```

---

## ❓ FAQ

**D: Posso usare un solo account Google Workspace per entrambi i domini?**  
R: Sì, puoi aggiungere più domini allo stesso account e creare alias.

**D: Quanto tempo serve per la propagazione DNS?**  
R: Di solito 15-60 minuti, massimo 24-48 ore.

**D: Posso migrare email esistenti?**  
R: Sì, Google offre tool di migrazione.

**D: Cosa succede se non rinnovo Google Workspace?**  
R: Le email continueranno ad arrivare ma non potrai accedervi.

