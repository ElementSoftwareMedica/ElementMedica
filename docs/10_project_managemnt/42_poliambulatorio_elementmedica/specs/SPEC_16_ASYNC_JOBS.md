# ⚡ SPEC_16: Job Asincroni e Code

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md), [SPEC_10_REFERTI.md](./SPEC_10_REFERTI.md)

---

## 1. OVERVIEW

Sistema di code per operazioni asincrone:
- Generazione PDF referti
- Invio email/SMS/WhatsApp
- Reminder appuntamenti
- Report schedulati
- Import/export dati

### 1.1 Tecnologia

**BullMQ** + Redis per job queue:
- Retry automatico
- Scheduling (cron)
- Priorità job
- Dead letter queue
- Dashboard monitoraggio

---

## 2. ARCHITETTURA

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   API       │────►│   Redis     │◄────│   Worker    │
│   Server    │     │   Queue     │     │   Process   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  BullMQ     │
                    │  Dashboard  │
                    └─────────────┘
```

---

## 3. CONFIGURAZIONE

### 3.1 Setup BullMQ

```javascript
// backend/config/queue.js

import { Queue, Worker, QueueScheduler } from 'bullmq';
import Redis from 'ioredis';

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null
});

// Code disponibili
export const queues = {
  pdfGeneration: new Queue('pdf-generation', { connection: redisConnection }),
  emailSending: new Queue('email-sending', { connection: redisConnection }),
  smsSending: new Queue('sms-sending', { connection: redisConnection }),
  reminders: new Queue('reminders', { connection: redisConnection }),
  reports: new Queue('reports', { connection: redisConnection }),
  imports: new Queue('imports', { connection: redisConnection })
};

// Configurazioni di default
export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000
  },
  removeOnComplete: {
    age: 24 * 3600,  // 24 ore
    count: 1000
  },
  removeOnFail: {
    age: 7 * 24 * 3600  // 7 giorni
  }
};
```

### 3.2 Tipi Job

```typescript
// backend/types/jobs.ts

interface PDFGenerationJob {
  type: 'REFERTO' | 'FATTURA' | 'REPORT';
  entityId: string;
  tenantId: string;
  template?: string;
  options?: {
    watermark?: boolean;
    encrypt?: boolean;
  };
}

interface EmailJob {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
  tenantId: string;
}

interface ReminderJob {
  appuntamentoId: string;
  tipo: 'CONFERMA' | 'REMINDER_24H' | 'REMINDER_2H';
  canale: 'EMAIL' | 'SMS' | 'WHATSAPP';
  tenantId: string;
}
```

---

## 4. WORKERS

### 4.1 PDF Worker

```javascript
// backend/workers/pdfWorker.js

import { Worker } from 'bullmq';
import { pdfService } from '../services/pdfService.js';
import { storageService } from '../services/storageService.js';
import logger from '../utils/logger.js';

const pdfWorker = new Worker('pdf-generation', async (job) => {
  const { type, entityId, tenantId, template, options } = job.data;
  
  logger.info({ jobId: job.id, type, entityId }, 'Inizio generazione PDF');
  
  try {
    let pdfBuffer;
    let filename;
    
    switch (type) {
      case 'REFERTO':
        const referto = await getRefertoWithData(entityId);
        pdfBuffer = await pdfService.generateRefertoPDF(referto, options);
        filename = `referto_${entityId}.pdf`;
        break;
        
      case 'FATTURA':
        const fattura = await getFatturaWithData(entityId);
        pdfBuffer = await pdfService.generateFatturaPDF(fattura);
        filename = `fattura_${fattura.numero}.pdf`;
        break;
    }
    
    // Upload su storage
    const storageKey = `${tenantId}/pdf/${type.toLowerCase()}/${filename}`;
    await storageService.upload(
      { buffer: pdfBuffer, mimetype: 'application/pdf', originalname: filename },
      storageKey,
      { tenantId, entityId, type }
    );
    
    // Aggiorna entità con URL PDF
    await updateEntityPdfUrl(type, entityId, storageKey);
    
    logger.info({ jobId: job.id, storageKey }, 'PDF generato con successo');
    
    return { success: true, storageKey };
    
  } catch (error) {
    logger.error({ jobId: job.id, error: error.message }, 'Errore generazione PDF');
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 3  // Max 3 PDF paralleli
});

pdfWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job PDF completato');
});

pdfWorker.on('failed', (job, err) => {
  logger.error({ jobId: job.id, error: err.message }, 'Job PDF fallito');
});
```

### 4.2 Email Worker

```javascript
// backend/workers/emailWorker.js

import { Worker } from 'bullmq';
import { emailService } from '../services/emailService.js';

const emailWorker = new Worker('email-sending', async (job) => {
  const { to, subject, template, data, attachments, tenantId } = job.data;
  
  // Carica template
  const html = await emailService.renderTemplate(template, data);
  
  // Invia
  const result = await emailService.send({
    to,
    subject,
    html,
    attachments
  });
  
  // Log invio
  await prisma.emailLog.create({
    data: {
      to,
      subject,
      template,
      status: 'SENT',
      messageId: result.messageId,
      tenantId
    }
  });
  
  return result;
}, {
  connection: redisConnection,
  concurrency: 10,
  limiter: {
    max: 100,
    duration: 60000  // Max 100 email/minuto
  }
});
```

### 4.3 Reminder Worker

```javascript
// backend/workers/reminderWorker.js

import { Worker } from 'bullmq';
import { queues } from '../config/queue.js';

const reminderWorker = new Worker('reminders', async (job) => {
  const { appuntamentoId, tipo, canale, tenantId } = job.data;
  
  const appuntamento = await prisma.appuntamento.findUnique({
    where: { id: appuntamentoId },
    include: {
      paziente: true,
      prestazione: true,
      medico: true,
      ambulatorio: { include: { sede: true } }
    }
  });
  
  if (!appuntamento || appuntamento.stato === 'CANCELLATO') {
    return { skipped: true, reason: 'Appuntamento non valido o cancellato' };
  }
  
  const messageData = {
    pazienteNome: `${appuntamento.paziente.firstName} ${appuntamento.paziente.lastName}`,
    prestazione: appuntamento.prestazione.nome,
    data: formatDate(appuntamento.dataOra),
    ora: formatTime(appuntamento.dataOra),
    medico: `Dr. ${appuntamento.medico.lastName}`,
    sede: appuntamento.ambulatorio.sede.nome,
    indirizzo: appuntamento.ambulatorio.sede.indirizzo
  };
  
  switch (canale) {
    case 'EMAIL':
      await queues.emailSending.add('reminder', {
        to: appuntamento.paziente.email,
        subject: `Promemoria appuntamento - ${appuntamento.prestazione.nome}`,
        template: `reminder_${tipo.toLowerCase()}`,
        data: messageData,
        tenantId
      });
      break;
      
    case 'SMS':
      await queues.smsSending.add('reminder', {
        to: appuntamento.paziente.phone,
        message: formatSmsReminder(tipo, messageData),
        tenantId
      });
      break;
      
    case 'WHATSAPP':
      // Integrazione WhatsApp Business API
      break;
  }
  
  return { sent: true, canale };
}, { connection: redisConnection });
```

---

## 5. SCHEDULING

### 5.1 Job Schedulati

```javascript
// backend/schedulers/index.js

import { queues } from '../config/queue.js';

export function setupScheduledJobs() {
  // Reminder 24h - ogni ora controlla appuntamenti prossime 24-25h
  queues.reminders.add(
    'check-reminders-24h',
    { tipo: 'REMINDER_24H' },
    {
      repeat: { cron: '0 * * * *' },  // Ogni ora
      jobId: 'scheduled-reminder-24h'
    }
  );
  
  // Reminder 2h - ogni 30 min controlla prossime 2-2.5h
  queues.reminders.add(
    'check-reminders-2h',
    { tipo: 'REMINDER_2H' },
    {
      repeat: { cron: '*/30 * * * *' },  // Ogni 30 min
      jobId: 'scheduled-reminder-2h'
    }
  );
  
  // Report giornaliero - ogni giorno alle 23:00
  queues.reports.add(
    'daily-report',
    { tipo: 'DAILY' },
    {
      repeat: { cron: '0 23 * * *' },
      jobId: 'scheduled-daily-report'
    }
  );
  
  // Cleanup vecchi job - ogni notte alle 3:00
  queues.reports.add(
    'cleanup',
    { tipo: 'CLEANUP' },
    {
      repeat: { cron: '0 3 * * *' },
      jobId: 'scheduled-cleanup'
    }
  );
}
```

---

## 6. API SERVICE

### 6.1 Queue Service

```javascript
// backend/services/queueService.js

import { queues, defaultJobOptions } from '../config/queue.js';

export const queueService = {
  // Genera PDF referto
  async generateRefertoPDF(refertoId, tenantId, options = {}) {
    return queues.pdfGeneration.add('referto', {
      type: 'REFERTO',
      entityId: refertoId,
      tenantId,
      options
    }, {
      ...defaultJobOptions,
      priority: options.urgent ? 1 : 5
    });
  },
  
  // Invia email
  async sendEmail(emailData) {
    return queues.emailSending.add('send', emailData, defaultJobOptions);
  },
  
  // Schedula reminder
  async scheduleReminder(appuntamentoId, tipo, scheduledFor, tenantId) {
    const delay = scheduledFor.getTime() - Date.now();
    
    if (delay <= 0) {
      // Esegui subito
      return queues.reminders.add('send', {
        appuntamentoId,
        tipo,
        canale: 'EMAIL',  // Default
        tenantId
      }, defaultJobOptions);
    }
    
    // Schedula per il futuro
    return queues.reminders.add('send', {
      appuntamentoId,
      tipo,
      canale: 'EMAIL',
      tenantId
    }, {
      ...defaultJobOptions,
      delay,
      jobId: `reminder-${appuntamentoId}-${tipo}`
    });
  },
  
  // Cancella reminder (se appuntamento cancellato)
  async cancelReminder(appuntamentoId, tipo) {
    const jobId = `reminder-${appuntamentoId}-${tipo}`;
    const job = await queues.reminders.getJob(jobId);
    if (job) {
      await job.remove();
    }
  },
  
  // Stato job
  async getJobStatus(queueName, jobId) {
    const queue = queues[queueName];
    const job = await queue.getJob(jobId);
    
    if (!job) return null;
    
    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp
    };
  }
};
```

---

## 7. DASHBOARD MONITORAGGIO

### 7.1 Bull Board Setup

```javascript
// backend/admin/bullBoard.js

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { queues } from '../config/queue.js';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: Object.values(queues).map(q => new BullMQAdapter(q)),
  serverAdapter
});

export const bullBoardRouter = serverAdapter.getRouter();

// Uso in Express
// app.use('/admin/queues', requireRole('ADMIN'), bullBoardRouter);
```

---

## 8. COLLEGAMENTI

- **Precedente**: [SPEC_15_RICERCA.md](./SPEC_15_RICERCA.md)
- **Correlato**: [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md), [SPEC_10_REFERTI.md](./SPEC_10_REFERTI.md)
- **Task**: [F2_BACKEND_TASKS.md](../sottofasi/F2_BACKEND_TASKS.md)
