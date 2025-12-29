````markdown
# 🌐 SPEC_18: Portale Paziente e Booking Online

**Versione**: 1.0  
**Data**: 2025-12-11  
**Collegato a**: [SPEC_05_AGENDA.md](./SPEC_05_AGENDA.md), [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md), [SPEC_17_COMUNICAZIONI.md](./SPEC_17_COMUNICAZIONI.md)

---

## 1. OVERVIEW

Il Portale Paziente è l'interfaccia web self-service che permette ai pazienti di:
- Prenotare appuntamenti online
- Visualizzare/scaricare referti
- Gestire profilo e preferenze
- Visualizzare storico visite e fatture
- Comunicare con la struttura

---

## 2. ARCHITETTURA

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PORTALE PAZIENTE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                     ┌──────────────────┐                            │
│                     │   Landing Page   │  ← portale.elementmedica.it│
│                     │   (pubblico)     │                            │
│                     └────────┬─────────┘                            │
│                              │                                       │
│        ┌─────────────────────┼─────────────────────┐                │
│        │                     │                     │                 │
│        ▼                     ▼                     ▼                 │
│  ┌───────────┐        ┌───────────┐        ┌───────────┐           │
│  │  Booking  │        │   Login   │        │   Info    │           │
│  │  Online   │        │  Accesso  │        │  Contatti │           │
│  │(no auth)  │        │           │        │           │           │
│  └─────┬─────┘        └─────┬─────┘        └───────────┘           │
│        │                    │                                        │
│        │                    ▼                                        │
│        │             ┌───────────────────────────┐                  │
│        │             │      AREA RISERVATA       │                  │
│        │             ├───────────────────────────┤                  │
│        │             │                           │                  │
│        │             │  ┌──────────┐ ┌────────┐ │                  │
│        │             │  │Dashboard │ │Profilo │ │                  │
│        │             │  └──────────┘ └────────┘ │                  │
│        │             │                           │                  │
│        │             │  ┌──────────┐ ┌────────┐ │                  │
│        │             │  │Appuntam. │ │Referti │ │                  │
│        │             │  └──────────┘ └────────┘ │                  │
│        │             │                           │                  │
│        │             │  ┌──────────┐ ┌────────┐ │                  │
│        │             │  │ Fatture  │ │Messaggi│ │                  │
│        │             │  └──────────┘ └────────┘ │                  │
│        │             │                           │                  │
│        │             └───────────────────────────┘                  │
│        │                                                             │
│        └──────── Redirect dopo prenotazione ────►                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. BOOKING ONLINE PUBBLICO

### 3.1 Flusso Prenotazione (No Auth)

```
STEP 1: Selezione Prestazione
          │
          ▼
STEP 2: Selezione Medico (opzionale)
          │
          ▼
STEP 3: Selezione Data/Ora
          │
          ▼
STEP 4: Inserimento Dati Paziente
        ├── Paziente esistente? → Login/OTP
        └── Nuovo paziente → Form registrazione
          │
          ▼
STEP 5: Conferma + Pagamento (opzionale)
          │
          ▼
STEP 6: Riepilogo + Invio Conferma
```

### 3.2 Widget Booking Embeddabile

```html
<!-- Widget per sito esterno -->
<div id="elementmedica-booking"></div>
<script 
  src="https://portale.elementmedica.it/widget.js"
  data-tenant="elementmedica"
  data-prestazione="visita-cardiologica"
  data-color="#0066CC"
></script>
```

### 3.3 API Pubbliche (Rate Limited)

```
# No autenticazione (rate limited: 30 req/min)

GET  /api/v1/public/prestazioni
     ?sede=xxx                     # Filtra per sede
     &specialita=cardiologia       # Filtra per specialità
     &prenotabileOnline=true       # Solo prenotabili online

GET  /api/v1/public/medici
     ?prestazioneId=xxx            # Medici per prestazione
     
GET  /api/v1/public/disponibilita
     ?prestazioneId=xxx
     &medicoId=xxx                 # Opzionale
     &sedeId=xxx                   # Opzionale  
     &dataInizio=2024-01-15
     &dataFine=2024-01-22
     
POST /api/v1/public/prenota
     # Body: vedi sotto
     # Richiede CAPTCHA
```

### 3.4 Schema Prenotazione Pubblica

```javascript
// POST /api/v1/public/prenota
{
  // Paziente
  paziente: {
    email: "paziente@email.com",      // Obbligatorio
    firstName: "Mario",
    lastName: "Rossi",
    phone: "+39 333 1234567",         // Obbligatorio
    codiceFiscale: "RSSMRA80A01H501X",
    dataNascita: "1980-01-01",
    sesso: "M"
  },
  
  // Appuntamento
  prestazioneId: "uuid",
  medicoId: "uuid",                    // Opzionale
  slotId: "uuid",                      // O dataOra + ambulatorioId
  dataOra: "2024-01-20T09:00:00Z",
  ambulatorioId: "uuid",
  
  // Note
  note: "Prima visita, porto esami precedenti",
  
  // Consensi
  privacyAccettata: true,
  marketingOptIn: false,
  
  // Anti-spam
  captchaToken: "recaptcha-token",
  
  // Pagamento (se richiesto)
  metodoPagamento: "CARTA" | "BONIFICO" | "SEDE",
  
  // Tracking
  origine: "WEB",
  utmSource: "google",
  utmCampaign: "promo-gennaio"
}
```

### 3.5 Validazioni Booking

```javascript
const publicBookingValidation = {
  // Rate limiting
  maxBookingsPerEmail: 3,        // Per 24h
  maxBookingsPerPhone: 3,
  
  // Anticipo
  minBookingAdvance: 2,          // Ore minime
  maxBookingAdvance: 90,         // Giorni massimi
  
  // Orari
  allowWeekends: false,          // Configurabile per tenant
  
  // Anti-spam
  requireCaptcha: true,
  blockDisposableEmails: true
};
```

---

## 4. AREA RISERVATA PAZIENTE

### 4.1 Autenticazione

#### Metodi di Accesso

| Metodo | Descrizione | Sicurezza |
|--------|-------------|-----------|
| **Magic Link** | Link via email, valido 15 min | Media |
| **OTP SMS** | Codice 6 cifre, valido 10 min | Alta |
| **Password** | Per utenti registrati | Alta |
| **SPID** | Identità digitale (futuro) | Molto alta |

#### Magic Link Flow

```javascript
// 1. Richiesta accesso
POST /api/v1/portal/auth/request-magic-link
{ email: "paziente@email.com" }

// Sistema invia email con link:
// https://portale.elementmedica.it/auth/verify?token=eyJhbGc...

// 2. Verifica token
GET /api/v1/portal/auth/verify?token=xxx

// Response: JWT sessione + redirect a dashboard
{
  success: true,
  accessToken: "jwt...",
  refreshToken: "refresh...",
  user: {
    id: "uuid",
    email: "paziente@email.com",
    firstName: "Mario",
    lastName: "Rossi"
  }
}
```

#### OTP SMS Flow

```javascript
// 1. Richiedi OTP
POST /api/v1/portal/auth/request-otp
{ phone: "+39 333 1234567" }

// 2. Verifica OTP
POST /api/v1/portal/auth/verify-otp
{
  phone: "+39 333 1234567",
  code: "123456"
}
```

### 4.2 Dashboard Paziente

```
┌──────────────────────────────────────────────────────────────────┐
│                    DASHBOARD PAZIENTE                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Benvenuto, Mario Rossi                         [Profilo] [Esci] │
│                                                                   │
│  ┌─────────────────────────────┐  ┌────────────────────────────┐ │
│  │    PROSSIMI APPUNTAMENTI    │  │      ULTIMI REFERTI        │ │
│  ├─────────────────────────────┤  ├────────────────────────────┤ │
│  │                             │  │                            │ │
│  │  📅 Lun 20 Gen - 09:00      │  │  📄 Visita Cardiologica   │ │
│  │  Visita Cardiologica        │  │     15 Gen 2024           │ │
│  │  Dr. Bianchi                │  │     [Scarica PDF]         │ │
│  │  Amb. 3 - Sede Centrale     │  │                            │ │
│  │                             │  │  📄 ECG                    │ │
│  │  [Conferma] [Cancella]      │  │     10 Gen 2024           │ │
│  │                             │  │     [Scarica PDF]         │ │
│  └─────────────────────────────┘  └────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────┐  ┌────────────────────────────┐ │
│  │     FATTURE DA PAGARE       │  │        QUICK ACTIONS       │ │
│  ├─────────────────────────────┤  ├────────────────────────────┤ │
│  │                             │  │                            │ │
│  │  💳 Fattura #2024-0042      │  │  [+ Prenota Appuntamento]  │ │
│  │  €85.00 - Scade 30 Gen      │  │                            │ │
│  │                             │  │  [📤 Carica Documento]     │ │
│  │  [Paga Online]              │  │                            │ │
│  │                             │  │  [✉️ Contatta Segreteria]  │ │
│  └─────────────────────────────┘  └────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 4.3 Sezione Appuntamenti

**Funzionalità**:
- Visualizza appuntamenti futuri e passati
- Conferma appuntamento (entro X ore)
- Cancella appuntamento (con motivo)
- Riprogramma (se consentito)
- Prenota nuovo appuntamento
- Stampa promemoria

### 4.4 Sezione Referti

**Funzionalità**:
- Lista referti per data
- Filtro per tipo prestazione
- Download PDF firmato
- Visualizzazione inline (PDF viewer)
- Storico visite con dettagli

**Accesso**:
- Solo referti FIRMATI
- Audit log per ogni download
- Scadenza link temporaneo

### 4.5 Sezione Fatture

**Funzionalità**:
- Lista fatture (pagate e da pagare)
- Download PDF fattura
- Pagamento online (Stripe/PayPal)
- Storico pagamenti
- Richiesta rateizzazione

### 4.6 Sezione Profilo

**Dati modificabili**:
- Telefono
- Email
- Indirizzo
- Medico di base
- Preferenze comunicazione

**Dati non modificabili** (solo da segreteria):
- Nome, Cognome
- Codice Fiscale
- Data nascita

---

## 5. COMPONENTI FRONTEND

### 5.1 Booking Widget

```tsx
// src/features/portal/booking/PublicBookingWizard.tsx

export function PublicBookingWizard({ tenantSlug, defaultPrestazione }) {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>({});
  
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <BookingStepIndicator current={step} total={6} />
      
      {/* Step 1: Prestazione */}
      {step === 1 && (
        <PrestazioneSelector
          tenantSlug={tenantSlug}
          defaultValue={defaultPrestazione}
          onSelect={(prestazione) => {
            setBookingData({ ...bookingData, prestazione });
            setStep(2);
          }}
        />
      )}
      
      {/* Step 2: Medico (opzionale) */}
      {step === 2 && (
        <MedicoSelector
          prestazioneId={bookingData.prestazione.id}
          onSelect={(medico) => {
            setBookingData({ ...bookingData, medico });
            setStep(3);
          }}
          onSkip={() => setStep(3)}
        />
      )}
      
      {/* Step 3: Data e Ora */}
      {step === 3 && (
        <SlotPicker
          prestazioneId={bookingData.prestazione.id}
          medicoId={bookingData.medico?.id}
          onSelect={(slot) => {
            setBookingData({ ...bookingData, slot });
            setStep(4);
          }}
        />
      )}
      
      {/* Step 4: Dati Paziente */}
      {step === 4 && (
        <PatientForm
          onSubmit={(paziente) => {
            setBookingData({ ...bookingData, paziente });
            setStep(5);
          }}
        />
      )}
      
      {/* Step 5: Conferma e Pagamento */}
      {step === 5 && (
        <BookingConfirmation
          data={bookingData}
          onConfirm={handleBookingConfirm}
        />
      )}
      
      {/* Step 6: Successo */}
      {step === 6 && (
        <BookingSuccess
          booking={bookingResult}
          onNewBooking={() => {
            setBookingData({});
            setStep(1);
          }}
        />
      )}
    </div>
  );
}
```

### 5.2 Calendario Disponibilità

```tsx
// src/features/portal/booking/SlotPicker.tsx

export function SlotPicker({ prestazioneId, medicoId, onSelect }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const { data: slots, isLoading } = useQuery({
    queryKey: ['disponibilita', prestazioneId, medicoId, selectedDate],
    queryFn: () => fetchDisponibilita({
      prestazioneId,
      medicoId,
      dataInizio: startOfWeek(selectedDate),
      dataFine: endOfWeek(selectedDate)
    })
  });
  
  return (
    <div className="space-y-4">
      {/* Calendario settimana */}
      <WeekCalendar
        selected={selectedDate}
        onDateChange={setSelectedDate}
        disabledDates={getDisabledDates(slots)}
      />
      
      {/* Slot disponibili per giorno selezionato */}
      <div className="grid grid-cols-4 gap-2">
        {slots?.filter(s => isSameDay(s.datetime, selectedDate)).map(slot => (
          <Button
            key={slot.id}
            variant={slot.available ? 'outline' : 'ghost'}
            disabled={!slot.available}
            onClick={() => onSelect(slot)}
            className="h-12"
          >
            {format(slot.datetime, 'HH:mm')}
          </Button>
        ))}
      </div>
      
      {/* Legenda */}
      <div className="flex gap-4 text-sm text-gray-500">
        <span>🟢 Disponibile</span>
        <span>⚪ Non disponibile</span>
      </div>
    </div>
  );
}
```

### 5.3 Viewer Referto

```tsx
// src/features/portal/referti/RefertoViewer.tsx

export function RefertoViewer({ refertoId }) {
  const { data: referto, isLoading } = useReferto(refertoId);
  const [showPdf, setShowPdf] = useState(false);
  
  const handleDownload = async () => {
    // Genera link temporaneo (audit logged)
    const { url } = await generateDownloadLink(refertoId);
    window.open(url, '_blank');
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{referto.visita.prestazione.nome}</CardTitle>
            <CardDescription>
              {format(referto.dataFirma, 'dd MMMM yyyy')} - 
              Dr. {referto.visita.medico.lastName}
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPdf(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Visualizza
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Scarica PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {showPdf && (
        <CardContent>
          <PdfViewer url={referto.pdfUrl} />
        </CardContent>
      )}
    </Card>
  );
}
```

---

## 6. API PORTAL (Autenticate)

```
# Richiede JWT paziente

# Dashboard
GET  /api/v1/portal/dashboard           # Overview dati

# Appuntamenti
GET  /api/v1/portal/appuntamenti        # Lista appuntamenti
POST /api/v1/portal/appuntamenti        # Nuovo appuntamento
GET  /api/v1/portal/appuntamenti/:id    # Dettaglio
POST /api/v1/portal/appuntamenti/:id/conferma   # Conferma
POST /api/v1/portal/appuntamenti/:id/cancella   # Cancella

# Referti
GET  /api/v1/portal/referti             # Lista referti firmati
GET  /api/v1/portal/referti/:id         # Dettaglio
GET  /api/v1/portal/referti/:id/download # Download PDF

# Fatture
GET  /api/v1/portal/fatture             # Lista fatture
GET  /api/v1/portal/fatture/:id         # Dettaglio
GET  /api/v1/portal/fatture/:id/pdf     # Download PDF
POST /api/v1/portal/fatture/:id/paga    # Inizio pagamento

# Profilo
GET  /api/v1/portal/profilo             # Dati profilo
PUT  /api/v1/portal/profilo             # Aggiorna
PUT  /api/v1/portal/preferenze          # Preferenze comunicazione

# Documenti
GET  /api/v1/portal/documenti           # Lista documenti caricati
POST /api/v1/portal/documenti           # Upload documento
```

---

## 7. SICUREZZA

### 7.1 Rate Limiting

| Endpoint | Limite |
|----------|--------|
| `/public/prenota` | 5 req/min per IP |
| `/portal/auth/*` | 10 req/min per IP |
| `/portal/*` | 60 req/min per user |
| Download PDF | 10 req/min per user |

### 7.2 CAPTCHA

```javascript
// Integrazione reCAPTCHA v3
const verifyCaptcha = async (token) => {
  const response = await axios.post(
    'https://www.google.com/recaptcha/api/siteverify',
    null,
    {
      params: {
        secret: process.env.RECAPTCHA_SECRET,
        response: token
      }
    }
  );
  
  return response.data.success && response.data.score >= 0.5;
};
```

### 7.3 Link Temporanei PDF

```javascript
// Genera link firmato per download
const generateSecureDownloadLink = async (refertoId, userId) => {
  // Log accesso
  await prisma.auditLogClinico.create({
    data: {
      azione: 'DOWNLOAD_REFERTO',
      entityType: 'REFERTO',
      entityId: refertoId,
      personId: userId,
      metadata: { source: 'PORTAL' }
    }
  });
  
  // Genera URL firmato (scade in 5 min)
  const signedUrl = await generateSignedUrl(
    `referti/${refertoId}.pdf`,
    { expiresIn: 300 }
  );
  
  return { url: signedUrl };
};
```

---

## 8. INTEGRAZIONI PAGAMENTO

### 8.1 Stripe Integration

```javascript
// backend/services/payment/stripeService.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeService = {
  async createPaymentIntent(fattura) {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(fattura.totale * 100), // Centesimi
      currency: 'eur',
      metadata: {
        fatturaId: fattura.id,
        pazienteId: fattura.pazienteId,
        tenantId: fattura.tenantId
      },
      receipt_email: fattura.paziente.email
    });
    
    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id
    };
  },
  
  async handleWebhook(payload, signature) {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    if (event.type === 'payment_intent.succeeded') {
      const { fatturaId } = event.data.object.metadata;
      await markFatturaPaid(fatturaId, {
        paymentId: event.data.object.id,
        method: 'STRIPE'
      });
    }
  }
};
```

---

## 9. SEO & MARKETING

### 9.1 Meta Tags Dinamici

```jsx
// src/features/portal/pages/PrestazioneDetail.tsx

<Helmet>
  <title>{prestazione.nome} | ElementMedica</title>
  <meta name="description" content={prestazione.descrizione} />
  <meta property="og:title" content={prestazione.nome} />
  <meta property="og:description" content={prestazione.descrizione} />
  <meta property="og:type" content="website" />
  <link rel="canonical" href={`https://elementmedica.com/prestazioni/${prestazione.slug}`} />
</Helmet>
```

### 9.2 Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  "name": "ElementMedica",
  "url": "https://elementmedica.com",
  "telephone": "+39 02 1234567",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Via Roma 123",
    "addressLocality": "Milano",
    "postalCode": "20100",
    "addressCountry": "IT"
  },
  "medicalSpecialty": ["Cardiologia", "Dermatologia", "Ortopedia"],
  "availableService": [
    {
      "@type": "MedicalProcedure",
      "name": "Visita Cardiologica",
      "procedureType": "Diagnostic"
    }
  ]
}
```

---

## 10. COLLEGAMENTI

- **Specifiche correlate**: 
  - [SPEC_05_AGENDA.md](./SPEC_05_AGENDA.md) - Slot disponibilità
  - [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md) - Workflow prenotazione
  - [SPEC_10_REFERTI.md](./SPEC_10_REFERTI.md) - Download referti
  - [SPEC_17_COMUNICAZIONI.md](./SPEC_17_COMUNICAZIONI.md) - Notifiche

- **Workflow correlati**:
  - [WF_01_PRENOTAZIONE.md](../workflows/WF_01_PRENOTAZIONE.md)

````
