````markdown
# 📧 SPEC_17: Sistema Comunicazioni Multi-Canale

**Versione**: 1.0  
**Data**: 2025-12-11  
**Collegato a**: [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md), [SPEC_10_REFERTI.md](./SPEC_10_REFERTI.md), [SPEC_16_ASYNC_JOBS.md](./SPEC_16_ASYNC_JOBS.md)

---

## 1. OVERVIEW

Sistema unificato di comunicazione multi-canale per gestire tutte le interazioni con pazienti:
- **Email** - Conferme, reminder, invio documenti
- **SMS** - Reminder rapidi
- **WhatsApp** - Messaggi interattivi
- **Push Notifications** - App mobile (PWA)
- **Portale Paziente** - Area riservata online

---

## 2. ARCHITETTURA

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMMUNICATION ORCHESTRATOR                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Trigger Events                  Communication Service               │
│  ─────────────────              ────────────────────                │
│                                                                      │
│  ┌─────────────┐                ┌─────────────────┐                 │
│  │ Appuntamento│───────────────►│  Email Worker   │──►SendGrid/SES │
│  │  Created    │                └─────────────────┘                 │
│  └─────────────┘                                                    │
│                                 ┌─────────────────┐                 │
│  ┌─────────────┐                │   SMS Worker    │──►Twilio        │
│  │  Reminder   │───────────────►└─────────────────┘                 │
│  │   24h/2h    │                                                    │
│  └─────────────┘                ┌─────────────────┐                 │
│                                 │ WhatsApp Worker │──►WA Business   │
│  ┌─────────────┐                └─────────────────┘                 │
│  │  Referto    │───────────────►                                    │
│  │  Firmato    │                ┌─────────────────┐                 │
│  └─────────────┘                │  Push Worker    │──►Firebase      │
│                                 └─────────────────┘                 │
│  ┌─────────────┐                                                    │
│  │  Fattura    │                                                    │
│  │  Emessa     │                                                    │
│  └─────────────┘                                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. CANALI DI COMUNICAZIONE

### 3.1 EMAIL

#### Provider Supportati
| Provider | Use Case | Note |
|----------|----------|------|
| **SendGrid** | Primary | Alta deliverability, templates |
| **AWS SES** | Backup/Scale | Costo inferiore per volumi |
| **SMTP Custom** | On-premise | Per compliance particolare |

#### Template Email

```typescript
// Template IDs
enum EmailTemplate {
  // Appuntamenti
  APPOINTMENT_CONFIRMATION = 'appointment-confirmation',
  APPOINTMENT_REMINDER_48H = 'appointment-reminder-48h',
  APPOINTMENT_REMINDER_24H = 'appointment-reminder-24h',
  APPOINTMENT_REMINDER_2H = 'appointment-reminder-2h',
  APPOINTMENT_CANCELLED = 'appointment-cancelled',
  APPOINTMENT_RESCHEDULED = 'appointment-rescheduled',
  
  // Referti
  REPORT_READY = 'report-ready',
  REPORT_ATTACHED = 'report-attached',
  
  // Fatturazione
  INVOICE_CREATED = 'invoice-created',
  INVOICE_PAYMENT_REMINDER = 'invoice-payment-reminder',
  INVOICE_RECEIPT = 'invoice-receipt',
  
  // Account
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password-reset',
  PORTAL_ACCESS = 'portal-access',
  
  // Marketing (opt-in)
  RECALL_CHECKUP = 'recall-checkup',
  PROMO_CAMPAIGN = 'promo-campaign',
}
```

#### Configurazione SendGrid

```javascript
// backend/config/email.js
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const emailConfig = {
  defaultFrom: {
    email: 'noreply@elementmedica.com',
    name: 'ElementMedica'
  },
  replyTo: 'info@elementmedica.com',
  
  // Rate limiting
  rateLimit: {
    perSecond: 10,
    perMinute: 100,
    perDay: 10000
  },
  
  // Tracking
  tracking: {
    clickTracking: true,
    openTracking: true,
    subscriptionTracking: false
  }
};
```

#### Email Service

```javascript
// backend/services/communication/emailService.js
import { queues } from '../../config/queue.js';
import logger from '../../utils/logger.js';

export const emailService = {
  /**
   * Invia email conferma appuntamento
   */
  async sendAppointmentConfirmation(appointment) {
    const { paziente, prestazione, medico, dataOra, ambulatorio } = appointment;
    
    return queues.emailSending.add('appointment-confirmation', {
      to: paziente.email,
      templateId: EmailTemplate.APPOINTMENT_CONFIRMATION,
      dynamicData: {
        paziente_nome: paziente.firstName,
        prestazione_nome: prestazione.nome,
        medico_nome: `Dr. ${medico.lastName}`,
        data: formatDate(dataOra, 'dd/MM/yyyy'),
        ora: formatDate(dataOra, 'HH:mm'),
        sede_nome: ambulatorio.sede.nome,
        sede_indirizzo: ambulatorio.sede.indirizzo,
        ambulatorio_nome: ambulatorio.nome,
        codice_prenotazione: appointment.codice,
        link_conferma: generateConfirmLink(appointment.id),
        link_cancella: generateCancelLink(appointment.id),
        istruzioni_preparazione: prestazione.istruzioniPaziente
      },
      tenantId: appointment.tenantId,
      attachments: prestazione.richiedeConsenso ? [{
        filename: 'consenso_informato.pdf',
        type: 'application/pdf',
        content: await generateConsensoForm(prestazione)
      }] : []
    });
  },
  
  /**
   * Invia referto firmato
   */
  async sendReport(referto, options = {}) {
    const { paziente } = referto.visita;
    
    // Genera PDF se non già generato
    let pdfUrl = referto.pdfUrl;
    if (!pdfUrl) {
      const pdfResult = await generateRefertoPDF(referto.id);
      pdfUrl = pdfResult.storageKey;
    }
    
    // Scarica PDF per allegato
    const pdfBuffer = await downloadFromStorage(pdfUrl);
    
    return queues.emailSending.add('report-send', {
      to: options.email || paziente.email,
      templateId: EmailTemplate.REPORT_ATTACHED,
      dynamicData: {
        paziente_nome: paziente.firstName,
        prestazione_nome: referto.visita.prestazione.nome,
        data_visita: formatDate(referto.visita.oraInizio, 'dd/MM/yyyy'),
        medico_nome: `Dr. ${referto.visita.medico.lastName}`,
        link_portale: generatePortalLink(paziente.id)
      },
      attachments: [{
        filename: `Referto_${referto.numero}.pdf`,
        type: 'application/pdf',
        content: pdfBuffer.toString('base64'),
        disposition: 'attachment'
      }],
      tenantId: referto.tenantId
    });
  },
  
  /**
   * Invia fattura
   */
  async sendInvoice(fattura) {
    const pdfBuffer = await generateFatturaPDF(fattura.id);
    
    return queues.emailSending.add('invoice-send', {
      to: fattura.paziente.email,
      templateId: EmailTemplate.INVOICE_CREATED,
      dynamicData: {
        paziente_nome: fattura.paziente.firstName,
        numero_fattura: fattura.numero,
        data_fattura: formatDate(fattura.dataEmissione, 'dd/MM/yyyy'),
        importo_totale: formatCurrency(fattura.totale),
        scadenza: formatDate(fattura.dataScadenza, 'dd/MM/yyyy'),
        link_pagamento: generatePaymentLink(fattura.id)
      },
      attachments: [{
        filename: `Fattura_${fattura.numero}.pdf`,
        type: 'application/pdf',
        content: pdfBuffer.toString('base64')
      }],
      tenantId: fattura.tenantId
    });
  }
};
```

---

### 3.2 SMS

#### Provider: Twilio

```javascript
// backend/config/sms.js
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const smsConfig = {
  fromNumber: process.env.TWILIO_PHONE_NUMBER,
  
  // Template SMS (max 160 char per segment)
  templates: {
    REMINDER_24H: 'ElementMedica: Promemoria appuntamento domani {data} ore {ora} per {prestazione}. Dr. {medico}. Per info: {telefono}',
    REMINDER_2H: 'ElementMedica: Appuntamento oggi ore {ora}. Presentarsi 10 min prima. {sede}',
    CONFIRMATION_CODE: 'ElementMedica: Codice conferma {codice}. Valido 10 minuti.',
    REPORT_READY: 'ElementMedica: Il suo referto è pronto. Acceda al portale: {link}'
  },
  
  rateLimit: {
    perNumber: 3,    // Max 3 SMS per numero/giorno
    perDay: 1000     // Max SMS/giorno totali
  }
};
```

#### SMS Service

```javascript
// backend/services/communication/smsService.js

export const smsService = {
  async sendReminder(appointment, tipo) {
    const { paziente, prestazione, medico, dataOra, ambulatorio } = appointment;
    
    // Verifica opt-in SMS
    if (!paziente.smsOptIn) {
      logger.info({ pazienteId: paziente.id }, 'SMS skipped: no opt-in');
      return { skipped: true, reason: 'no-opt-in' };
    }
    
    // Verifica numero valido
    const phone = formatPhoneNumber(paziente.phone);
    if (!phone) {
      logger.warn({ pazienteId: paziente.id }, 'SMS skipped: invalid phone');
      return { skipped: true, reason: 'invalid-phone' };
    }
    
    const template = smsConfig.templates[`REMINDER_${tipo}`];
    const message = interpolate(template, {
      data: formatDate(dataOra, 'dd/MM'),
      ora: formatDate(dataOra, 'HH:mm'),
      prestazione: prestazione.nome.substring(0, 30),
      medico: medico.lastName,
      sede: ambulatorio.sede.nome.substring(0, 40),
      telefono: ambulatorio.sede.telefono
    });
    
    return queues.smsSending.add('reminder', {
      to: phone,
      message,
      tenantId: appointment.tenantId,
      appointmentId: appointment.id
    });
  }
};
```

---

### 3.3 WHATSAPP BUSINESS

#### Setup WhatsApp Business API

```javascript
// backend/config/whatsapp.js

export const whatsappConfig = {
  provider: 'META', // Meta Cloud API (recommended)
  
  businessAccountId: process.env.WA_BUSINESS_ACCOUNT_ID,
  phoneNumberId: process.env.WA_PHONE_NUMBER_ID,
  accessToken: process.env.WA_ACCESS_TOKEN,
  
  // Template approvati da Meta
  templates: {
    APPOINTMENT_REMINDER: {
      name: 'appuntamento_promemoria',
      language: 'it',
      components: [
        { type: 'header', format: 'text' },
        { type: 'body' },
        { type: 'button', sub_type: 'quick_reply', index: 0 },
        { type: 'button', sub_type: 'quick_reply', index: 1 }
      ]
    },
    REPORT_READY: {
      name: 'referto_disponibile',
      language: 'it'
    }
  },
  
  webhook: {
    verifyToken: process.env.WA_WEBHOOK_VERIFY_TOKEN,
    callbackUrl: `${process.env.API_URL}/webhooks/whatsapp`
  }
};
```

#### WhatsApp Service

```javascript
// backend/services/communication/whatsappService.js
import axios from 'axios';

const META_API = 'https://graph.facebook.com/v18.0';

export const whatsappService = {
  /**
   * Invia messaggio template approvato
   */
  async sendTemplate(phoneNumber, templateName, parameters) {
    const { phoneNumberId, accessToken, templates } = whatsappConfig;
    const template = templates[templateName];
    
    if (!template) {
      throw new Error(`Template ${templateName} not configured`);
    }
    
    const response = await axios.post(
      `${META_API}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatWhatsAppNumber(phoneNumber),
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language },
          components: buildComponents(template.components, parameters)
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      messageId: response.data.messages[0].id,
      status: 'sent'
    };
  },
  
  /**
   * Gestisce risposte webhook
   */
  async handleWebhook(payload) {
    const { entry } = payload;
    
    for (const change of entry[0].changes) {
      const value = change.value;
      
      // Messaggio in arrivo
      if (value.messages) {
        for (const message of value.messages) {
          await this.processIncomingMessage(message);
        }
      }
      
      // Status update (delivered, read, etc.)
      if (value.statuses) {
        for (const status of value.statuses) {
          await this.updateMessageStatus(status);
        }
      }
    }
  },
  
  async processIncomingMessage(message) {
    const { from, type, text, button } = message;
    
    // Gestione risposte rapide (conferma/cancella)
    if (type === 'button') {
      const response = button.payload; // 'CONFERMA' o 'CANCELLA'
      const appointmentId = await findAppointmentByPhone(from);
      
      if (appointmentId && response === 'CONFERMA') {
        await confirmAppointment(appointmentId);
        await this.sendText(from, '✅ Appuntamento confermato! A presto.');
      }
      
      if (appointmentId && response === 'CANCELLA') {
        await cancelAppointment(appointmentId, 'Richiesta paziente via WhatsApp');
        await this.sendText(from, '❌ Appuntamento cancellato. Per nuova prenotazione chiami il numero XXX.');
      }
    }
    
    // Messaggio testuale libero
    if (type === 'text') {
      // Crea ticket supporto o notifica segreteria
      await createSupportTicket({
        source: 'whatsapp',
        phone: from,
        message: text.body
      });
    }
  }
};
```

---

### 3.4 PUSH NOTIFICATIONS

#### Firebase Cloud Messaging

```javascript
// backend/config/push.js
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  })
});

export const pushService = {
  async sendToDevice(token, notification, data = {}) {
    try {
      const response = await admin.messaging().send({
        token,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icon-192.png'
        },
        data: {
          ...data,
          click_action: data.url || '/'
        },
        webpush: {
          fcmOptions: {
            link: data.url
          }
        }
      });
      
      return { success: true, messageId: response };
    } catch (error) {
      if (error.code === 'messaging/registration-token-not-registered') {
        // Token invalido, rimuovi dal database
        await removePushToken(token);
      }
      throw error;
    }
  },
  
  async sendToTopic(topic, notification, data = {}) {
    return admin.messaging().send({
      topic,
      notification,
      data
    });
  }
};
```

---

## 4. DATABASE MODELS

### 4.1 Preferenze Comunicazione

```prisma
model PreferenzeComunicazione {
  id                    String   @id @default(uuid())
  
  personId              String   @unique
  person                Person   @relation(fields: [personId], references: [id])
  
  // Canali abilitati
  emailEnabled          Boolean  @default(true)
  smsEnabled            Boolean  @default(false)
  whatsappEnabled       Boolean  @default(false)
  pushEnabled           Boolean  @default(false)
  
  // Preferenze specifiche
  reminderEmail         Boolean  @default(true)
  reminderSms           Boolean  @default(false)
  reminderWhatsapp      Boolean  @default(false)
  reminderPush          Boolean  @default(true)
  
  reportByEmail         Boolean  @default(true)
  invoiceByEmail        Boolean  @default(true)
  
  marketingOptIn        Boolean  @default(false)
  marketingOptInDate    DateTime?
  
  // Push tokens
  pushTokens            PushToken[]
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@index([tenantId])
}

model PushToken {
  id                    String   @id @default(uuid())
  
  preferenzeId          String
  preferenze            PreferenzeComunicazione @relation(fields: [preferenzeId], references: [id])
  
  token                 String   @unique
  platform              PushPlatform
  deviceName            String?
  
  isActive              Boolean  @default(true)
  lastUsed              DateTime?
  
  createdAt             DateTime @default(now())
}

enum PushPlatform {
  WEB
  IOS
  ANDROID
}

model CommunicationLog {
  id                    String   @id @default(uuid())
  
  personId              String
  person                Person   @relation(fields: [personId], references: [id])
  
  channel               CommunicationChannel
  templateId            String?
  subject               String?
  recipient             String         // email/phone
  
  status                MessageStatus  @default(PENDING)
  statusUpdatedAt       DateTime?
  
  // Provider info
  providerMessageId     String?
  providerResponse      Json?
  
  // Error tracking
  errorCode             String?
  errorMessage          String?
  retryCount            Int            @default(0)
  
  // Related entity
  entityType            String?        // 'APPOINTMENT', 'REPORT', 'INVOICE'
  entityId              String?
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant         @relation(fields: [tenantId], references: [id])
  
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt
  
  @@index([tenantId, personId])
  @@index([tenantId, channel, status])
  @@index([entityType, entityId])
}

enum CommunicationChannel {
  EMAIL
  SMS
  WHATSAPP
  PUSH
  PORTAL
}

enum MessageStatus {
  PENDING
  QUEUED
  SENT
  DELIVERED
  READ
  FAILED
  BOUNCED
  UNSUBSCRIBED
}
```

---

## 5. ORCHESTRAZIONE COMUNICAZIONI

### 5.1 Communication Orchestrator

```javascript
// backend/services/communication/orchestrator.js

export const communicationOrchestrator = {
  /**
   * Invia notifica su tutti i canali preferiti
   */
  async notify(personId, eventType, data, options = {}) {
    const preferenze = await getPreferenze(personId);
    const results = [];
    
    // Determina canali da usare
    const channels = this.resolveChannels(preferenze, eventType, options);
    
    for (const channel of channels) {
      try {
        const result = await this.sendViaChannel(channel, eventType, data);
        results.push({ channel, ...result });
      } catch (error) {
        logger.error({ channel, eventType, error: error.message }, 'Notification failed');
        results.push({ channel, success: false, error: error.message });
      }
    }
    
    // Log tutte le comunicazioni
    await this.logCommunications(personId, eventType, results);
    
    return results;
  },
  
  resolveChannels(preferenze, eventType, options) {
    const channels = [];
    
    // Priorità: WhatsApp > Push > Email > SMS
    if (eventType.startsWith('REMINDER')) {
      if (preferenze.reminderWhatsapp && preferenze.whatsappEnabled) {
        channels.push('WHATSAPP');
      } else if (preferenze.reminderPush && preferenze.pushEnabled) {
        channels.push('PUSH');
      } else if (preferenze.reminderEmail && preferenze.emailEnabled) {
        channels.push('EMAIL');
      } else if (preferenze.reminderSms && preferenze.smsEnabled) {
        channels.push('SMS');
      }
    }
    
    if (eventType === 'REPORT_READY') {
      // Sempre email + opzionale altri
      if (preferenze.reportByEmail) {
        channels.push('EMAIL');
      }
      if (preferenze.pushEnabled) {
        channels.push('PUSH');
      }
    }
    
    // Override se specificato
    if (options.forceChannels) {
      return options.forceChannels;
    }
    
    return [...new Set(channels)]; // Deduplica
  },
  
  async sendViaChannel(channel, eventType, data) {
    switch (channel) {
      case 'EMAIL':
        return emailService.send(eventType, data);
      case 'SMS':
        return smsService.send(eventType, data);
      case 'WHATSAPP':
        return whatsappService.send(eventType, data);
      case 'PUSH':
        return pushService.send(eventType, data);
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }
};
```

### 5.2 Scheduler Reminder

```javascript
// backend/schedulers/reminderScheduler.js

export const reminderScheduler = {
  /**
   * Job che gira ogni ora, cerca appuntamenti da notificare
   */
  async checkReminders() {
    const now = new Date();
    
    // Reminder 48h
    const in48h = addHours(now, 48);
    const in47h = addHours(now, 47);
    await this.sendReminders(in47h, in48h, 'REMINDER_48H');
    
    // Reminder 24h
    const in24h = addHours(now, 24);
    const in23h = addHours(now, 23);
    await this.sendReminders(in23h, in24h, 'REMINDER_24H');
    
    // Reminder 2h
    const in2h = addHours(now, 2);
    const in1h30m = addMinutes(now, 90);
    await this.sendReminders(in1h30m, in2h, 'REMINDER_2H');
  },
  
  async sendReminders(from, to, type) {
    const appointments = await prisma.appuntamento.findMany({
      where: {
        dataOra: { gte: from, lt: to },
        stato: { in: ['PRENOTATO', 'CONFERMATO'] },
        deletedAt: null,
        // Non già notificato per questo tipo
        NOT: {
          CommunicationLog: {
            some: {
              templateId: type,
              status: { in: ['SENT', 'DELIVERED'] }
            }
          }
        }
      },
      include: {
        paziente: { include: { PreferenzeComunicazione: true } },
        prestazione: true,
        medico: true,
        ambulatorio: { include: { sede: true } }
      }
    });
    
    logger.info({ count: appointments.length, type }, 'Sending reminders');
    
    for (const appointment of appointments) {
      await communicationOrchestrator.notify(
        appointment.pazienteId,
        type,
        { appointment }
      );
    }
  }
};
```

---

## 6. PORTALE PAZIENTE

### 6.1 Funzionalità

| Feature | Descrizione |
|---------|-------------|
| **Dashboard** | Prossimi appuntamenti, ultimi referti |
| **Appuntamenti** | Visualizza, conferma, cancella, prenota nuovo |
| **Referti** | Scarica PDF, storico visite |
| **Fatture** | Visualizza, paga online, ricevute |
| **Profilo** | Dati anagrafici, preferenze comunicazione |
| **Documenti** | Upload documenti richiesti |
| **Messaggi** | Chat con segreteria |

### 6.2 Autenticazione Paziente

```javascript
// Accesso via Magic Link (passwordless)
// 1. Paziente inserisce email/telefono
// 2. Riceve link valido 15 min
// 3. Click → autenticato

POST /api/v1/portal/request-access
{ email: "paziente@email.com" }

// Sistema invia email con link:
// https://portale.elementmedica.com/auth?token=xxx

GET /api/v1/portal/verify?token=xxx
// Verifica token, crea sessione JWT

// Oppure: OTP via SMS
POST /api/v1/portal/request-otp
{ phone: "+39123456789" }

POST /api/v1/portal/verify-otp
{ phone: "+39123456789", code: "123456" }
```

---

## 7. RECALL AUTOMATICO

### 7.1 Sistema Recall

```javascript
// backend/services/recallService.js

export const recallService = {
  /**
   * Job giornaliero: identifica pazienti da richiamare
   */
  async checkRecalls() {
    // Controlli periodici basati su prestazione
    const recallRules = await prisma.recallRule.findMany({
      where: { isActive: true }
    });
    
    for (const rule of recallRules) {
      await this.processRecallRule(rule);
    }
  },
  
  async processRecallRule(rule) {
    // Es: "Visita cardiologica" → recall dopo 12 mesi
    const threshold = subMonths(new Date(), rule.intervalMonths);
    
    const patients = await prisma.visita.findMany({
      where: {
        prestazioneId: rule.prestazioneId,
        stato: 'COMPLETATA',
        oraFine: { lt: threshold },
        // Non ha già appuntamento futuro
        paziente: {
          Appuntamento: {
            none: {
              prestazioneId: rule.prestazioneId,
              dataOra: { gt: new Date() },
              stato: { notIn: ['CANCELLATO', 'NO_SHOW'] }
            }
          }
        },
        // Non già richiamato di recente
        NOT: {
          paziente: {
            CommunicationLog: {
              some: {
                templateId: 'RECALL_CHECKUP',
                createdAt: { gt: subMonths(new Date(), 3) }
              }
            }
          }
        }
      },
      include: {
        paziente: { include: { PreferenzeComunicazione: true } }
      }
    });
    
    for (const visita of patients) {
      if (visita.paziente.PreferenzeComunicazione?.marketingOptIn) {
        await communicationOrchestrator.notify(
          visita.pazienteId,
          'RECALL_CHECKUP',
          { 
            prestazione: rule.prestazione,
            lastVisit: visita.oraFine,
            bookingUrl: generateBookingUrl(rule.prestazioneId)
          }
        );
      }
    }
  }
};
```

### 7.2 Model Recall Rules

```prisma
model RecallRule {
  id                    String   @id @default(uuid())
  
  nome                  String
  
  prestazioneId         String
  prestazione           Prestazione @relation(fields: [prestazioneId], references: [id])
  
  intervalMonths        Int      // Mesi dopo ultima visita
  
  templateEmail         String?
  templateSms           String?
  
  isActive              Boolean  @default(true)
  
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@index([tenantId])
}
```

---

## 8. API ENDPOINTS

```
# Preferenze
GET    /api/v1/comunicazioni/preferenze           # Get preferenze utente corrente
PUT    /api/v1/comunicazioni/preferenze           # Aggiorna preferenze
POST   /api/v1/comunicazioni/push-token           # Registra push token
DELETE /api/v1/comunicazioni/push-token/:token    # Rimuovi push token

# Invio manuale (admin)
POST   /api/v1/comunicazioni/send                 # Invia messaggio singolo
POST   /api/v1/comunicazioni/broadcast            # Broadcast a gruppo

# Log
GET    /api/v1/comunicazioni/log                  # Lista comunicazioni
GET    /api/v1/comunicazioni/log/:id              # Dettaglio

# Webhook
POST   /webhooks/sendgrid                         # SendGrid events
POST   /webhooks/twilio                           # Twilio status
POST   /webhooks/whatsapp                         # WhatsApp events

# Portale paziente
POST   /api/v1/portal/request-access              # Richiedi accesso
GET    /api/v1/portal/verify                      # Verifica magic link
POST   /api/v1/portal/request-otp                 # Richiedi OTP
POST   /api/v1/portal/verify-otp                  # Verifica OTP
```

---

## 9. UNSUBSCRIBE & GDPR

### 9.1 Gestione Opt-out

```javascript
// Link unsubscribe in ogni email
// https://elementmedica.com/unsubscribe?token=xxx&channel=email

GET /api/v1/unsubscribe
{
  token: "jwt-con-paziente-id",
  channel: "email" | "sms" | "whatsapp" | "all"
}

// Aggiorna preferenze + log GDPR
```

### 9.2 Export Comunicazioni (GDPR)

```javascript
GET /api/v1/gdpr/export/communications/:personId

// Returns: JSON con tutte le comunicazioni inviate
{
  communications: [
    {
      date: "2024-01-15T10:30:00Z",
      channel: "EMAIL",
      type: "APPOINTMENT_CONFIRMATION",
      recipient: "paziente@email.com",
      status: "DELIVERED"
    },
    // ...
  ]
}
```

---

## 10. COLLEGAMENTI

- **Specifiche correlate**: 
  - [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md) - Trigger reminder
  - [SPEC_10_REFERTI.md](./SPEC_10_REFERTI.md) - Invio referti
  - [SPEC_16_ASYNC_JOBS.md](./SPEC_16_ASYNC_JOBS.md) - Queue jobs
  - [SPEC_12_AUDIT_GDPR.md](./SPEC_12_AUDIT_GDPR.md) - Compliance

- **Workflow correlati**:
  - [WF_01_PRENOTAZIONE.md](../workflows/WF_01_PRENOTAZIONE.md)
  - [WF_04_REFERTO.md](../workflows/WF_04_REFERTO.md)

````
