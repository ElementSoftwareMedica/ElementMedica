# 🔌 FASE 2: Backend API Cliniche

## Documento di Fase

**Fase**: 2 - Backend API  
**Durata Stimata**: 3-4 settimane  
**Prerequisiti**: FASE 0 + FASE 1 completate  
**Output**: API REST complete per tutte le entità cliniche

---

## 📋 INDICE

1. [Obiettivi](#1-obiettivi)
2. [Architettura API](#2-architettura-api)
3. [Routes e Controller](#3-routes-e-controller)
4. [Services](#4-services)
5. [Middleware Clinici](#5-middleware-clinici)
6. [Audit Trail Clinico](#6-audit-trail-clinico)
7. [Checklist Implementazione](#7-checklist-implementazione)
8. [Test Cases](#8-test-cases)

---

## 1. Obiettivi

### 1.1 Obiettivo Principale
Implementare tutte le API REST per la gestione del poliambulatorio, rispettando l'architettura esistente e i pattern consolidati.

### 1.2 Principi di Design

| Principio | Applicazione |
|-----------|--------------|
| **Namespace separato** | `/api/v1/clinica/*` per tutte le API mediche |
| **RBAC** | Permessi granulari per ogni endpoint |
| **Audit** | Log di ogni accesso a dati PHI |
| **Validazione** | Joi/Zod per input validation |
| **Response format** | Standard JSON API con paginazione |

---

## 2. Architettura API

### 2.1 Struttura Routes

```
backend/routes/v1/clinica/
├── index.js                    # Router principale clinica
├── poliambulatorio.js          # CRUD poliambulatorio
├── sedi.js                     # CRUD sedi
├── ambulatori.js               # CRUD ambulatori
├── strumentario.js             # CRUD strumentario + manutenzioni
├── prestazioni.js              # CRUD prestazioni
├── listini.js                  # CRUD listini + convenzioni
├── agenda.js                   # Disponibilità e slot
├── appuntamenti.js             # CRUD appuntamenti
├── visite.js                   # CRUD visite
├── referti.js                  # CRUD referti + versioning
├── pazienti.js                 # Estensione Person per pazienti
├── documenti.js                # Upload/download documenti clinici
└── fatturazione.js             # Fatture prestazioni
```

### 2.2 Response Format Standard

```javascript
// Success response
{
  "success": true,
  "data": { /* entity or array */ },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "dataOra", "message": "Data appuntamento non valida" }
    ]
  }
}
```

---

## 3. Routes e Controller

### 3.1 Poliambulatorio Routes

```javascript
// backend/routes/v1/clinica/poliambulatorio.js

import express from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/rbac.js';
import { validateRequest } from '../../../middleware/validation.js';
import { auditClinico } from '../../../middleware/auditClinico.js';
import * as controller from '../../../controllers/clinica/poliambulatorioController.js';
import { poliambulatorioSchema } from '../../../validations/clinica/poliambulatorio.js';

const router = express.Router();

// GET /api/v1/clinica/poliambulatorio
// Ottieni configurazione poliambulatorio (uno per tenant)
router.get(
  '/',
  requireAuth,
  requirePermission('VIEW_AMBULATORI'),
  auditClinico('VIEW', 'Poliambulatorio'),
  controller.getPoliambulatorio
);

// PUT /api/v1/clinica/poliambulatorio
// Aggiorna configurazione poliambulatorio
router.put(
  '/',
  requireAuth,
  requirePermission('MANAGE_AMBULATORI'),
  validateRequest(poliambulatorioSchema.update),
  auditClinico('UPDATE', 'Poliambulatorio'),
  controller.updatePoliambulatorio
);

// POST /api/v1/clinica/poliambulatorio/setup
// Setup iniziale (solo se non esiste)
router.post(
  '/setup',
  requireAuth,
  requirePermission('MANAGE_AMBULATORI'),
  validateRequest(poliambulatorioSchema.create),
  auditClinico('CREATE', 'Poliambulatorio'),
  controller.setupPoliambulatorio
);

export default router;
```

### 3.2 Ambulatori Routes

```javascript
// backend/routes/v1/clinica/ambulatori.js

import express from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/rbac.js';
import { validateRequest } from '../../../middleware/validation.js';
import { auditClinico } from '../../../middleware/auditClinico.js';
import * as controller from '../../../controllers/clinica/ambulatoriController.js';
import { ambulatorioSchema } from '../../../validations/clinica/ambulatorio.js';

const router = express.Router();

// GET /api/v1/clinica/ambulatori
router.get(
  '/',
  requireAuth,
  requirePermission('VIEW_AMBULATORI'),
  controller.getAll
);

// GET /api/v1/clinica/ambulatori/:id
router.get(
  '/:id',
  requireAuth,
  requirePermission('VIEW_AMBULATORI'),
  auditClinico('VIEW', 'Ambulatorio'),
  controller.getById
);

// POST /api/v1/clinica/ambulatori
router.post(
  '/',
  requireAuth,
  requirePermission('MANAGE_AMBULATORI'),
  validateRequest(ambulatorioSchema.create),
  auditClinico('CREATE', 'Ambulatorio'),
  controller.create
);

// PUT /api/v1/clinica/ambulatori/:id
router.put(
  '/:id',
  requireAuth,
  requirePermission('MANAGE_AMBULATORI'),
  validateRequest(ambulatorioSchema.update),
  auditClinico('UPDATE', 'Ambulatorio'),
  controller.update
);

// DELETE /api/v1/clinica/ambulatori/:id (soft delete)
router.delete(
  '/:id',
  requireAuth,
  requirePermission('MANAGE_AMBULATORI'),
  auditClinico('DELETE', 'Ambulatorio'),
  controller.softDelete
);

// GET /api/v1/clinica/ambulatori/:id/disponibilita
router.get(
  '/:id/disponibilita',
  requireAuth,
  requirePermission('VIEW_AGENDA'),
  controller.getDisponibilita
);

// GET /api/v1/clinica/ambulatori/:id/strumentario
router.get(
  '/:id/strumentario',
  requireAuth,
  requirePermission('VIEW_STRUMENTARIO'),
  controller.getStrumentario
);

export default router;
```

### 3.3 Appuntamenti Routes

```javascript
// backend/routes/v1/clinica/appuntamenti.js

import express from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/rbac.js';
import { validateRequest } from '../../../middleware/validation.js';
import { auditClinico } from '../../../middleware/auditClinico.js';
import * as controller from '../../../controllers/clinica/appuntamentiController.js';
import { appuntamentoSchema } from '../../../validations/clinica/appuntamento.js';

const router = express.Router();

// GET /api/v1/clinica/appuntamenti
// Lista appuntamenti con filtri (data, medico, ambulatorio, stato)
router.get(
  '/',
  requireAuth,
  requirePermission('VIEW_AGENDA'),
  controller.getAll
);

// GET /api/v1/clinica/appuntamenti/:id
router.get(
  '/:id',
  requireAuth,
  requirePermission('VIEW_AGENDA'),
  auditClinico('VIEW', 'Appuntamento'),
  controller.getById
);

// POST /api/v1/clinica/appuntamenti
// Crea nuovo appuntamento
router.post(
  '/',
  requireAuth,
  requirePermission('BOOK_APPOINTMENTS'),
  validateRequest(appuntamentoSchema.create),
  auditClinico('CREATE', 'Appuntamento'),
  controller.create
);

// PUT /api/v1/clinica/appuntamenti/:id
router.put(
  '/:id',
  requireAuth,
  requirePermission('BOOK_APPOINTMENTS'),
  validateRequest(appuntamentoSchema.update),
  auditClinico('UPDATE', 'Appuntamento'),
  controller.update
);

// PATCH /api/v1/clinica/appuntamenti/:id/stato
// Cambia stato (PRENOTATO → CONFERMATO → ACCETTATO → etc.)
router.patch(
  '/:id/stato',
  requireAuth,
  requirePermission('MANAGE_AGENDA'),
  validateRequest(appuntamentoSchema.changeStatus),
  auditClinico('UPDATE', 'Appuntamento'),
  controller.changeStatus
);

// POST /api/v1/clinica/appuntamenti/:id/accetta
// Accettazione paziente (segreteria)
router.post(
  '/:id/accetta',
  requireAuth,
  requirePermission('MANAGE_AGENDA'),
  auditClinico('UPDATE', 'Appuntamento'),
  controller.accettaPaziente
);

// POST /api/v1/clinica/appuntamenti/:id/chiama
// Chiama paziente (assegna numero chiamata)
router.post(
  '/:id/chiama',
  requireAuth,
  requirePermission('MANAGE_AGENDA'),
  auditClinico('UPDATE', 'Appuntamento'),
  controller.chiamaPaziente
);

// DELETE /api/v1/clinica/appuntamenti/:id
// Cancella appuntamento
router.delete(
  '/:id',
  requireAuth,
  requirePermission('CANCEL_APPOINTMENTS'),
  auditClinico('DELETE', 'Appuntamento'),
  controller.cancel
);

// POST /api/v1/clinica/appuntamenti/:id/reminder
// Invia reminder (WhatsApp/Email/SMS)
router.post(
  '/:id/reminder',
  requireAuth,
  requirePermission('MANAGE_AGENDA'),
  controller.sendReminder
);

// GET /api/v1/clinica/appuntamenti/oggi
// Appuntamenti di oggi per dashboard
router.get(
  '/oggi',
  requireAuth,
  requirePermission('VIEW_AGENDA'),
  controller.getOggi
);

// GET /api/v1/clinica/appuntamenti/medico/:medicoId
// Appuntamenti per medico specifico
router.get(
  '/medico/:medicoId',
  requireAuth,
  requirePermission('VIEW_AGENDA'),
  controller.getByMedico
);

export default router;
```

### 3.4 Visite Routes

```javascript
// backend/routes/v1/clinica/visite.js

import express from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/rbac.js';
import { validateRequest } from '../../../middleware/validation.js';
import { auditClinico } from '../../../middleware/auditClinico.js';
import * as controller from '../../../controllers/clinica/visiteController.js';
import { visitaSchema } from '../../../validations/clinica/visita.js';

const router = express.Router();

// GET /api/v1/clinica/visite
router.get(
  '/',
  requireAuth,
  requirePermission('VIEW_VISITS'),
  controller.getAll
);

// GET /api/v1/clinica/visite/:id
router.get(
  '/:id',
  requireAuth,
  requirePermission('VIEW_VISITS'),
  auditClinico('VIEW', 'Visita'),
  controller.getById
);

// POST /api/v1/clinica/visite
// Inizia visita da appuntamento
router.post(
  '/',
  requireAuth,
  requirePermission('CREATE_VISITS'),
  validateRequest(visitaSchema.create),
  auditClinico('CREATE', 'Visita'),
  controller.create
);

// PUT /api/v1/clinica/visite/:id
router.put(
  '/:id',
  requireAuth,
  requirePermission('EDIT_VISITS'),
  validateRequest(visitaSchema.update),
  auditClinico('UPDATE', 'Visita'),
  controller.update
);

// POST /api/v1/clinica/visite/:id/inizia
// Inizia visita (registra ora inizio)
router.post(
  '/:id/inizia',
  requireAuth,
  requirePermission('START_VISITS'),
  auditClinico('UPDATE', 'Visita'),
  controller.iniziaVisita
);

// POST /api/v1/clinica/visite/:id/completa
// Completa visita (registra ora fine)
router.post(
  '/:id/completa',
  requireAuth,
  requirePermission('COMPLETE_VISITS'),
  auditClinico('UPDATE', 'Visita'),
  controller.completaVisita
);

// PUT /api/v1/clinica/visite/:id/campi
// Salva valori campi visita
router.put(
  '/:id/campi',
  requireAuth,
  requirePermission('EDIT_VISITS'),
  validateRequest(visitaSchema.updateCampi),
  auditClinico('UPDATE', 'Visita'),
  controller.salvaCampi
);

// GET /api/v1/clinica/visite/:id/campi
// Ottieni template campi per la visita
router.get(
  '/:id/campi',
  requireAuth,
  requirePermission('VIEW_VISITS'),
  controller.getCampi
);

export default router;
```

### 3.5 Referti Routes

```javascript
// backend/routes/v1/clinica/referti.js

import express from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/rbac.js';
import { validateRequest } from '../../../middleware/validation.js';
import { auditClinico } from '../../../middleware/auditClinico.js';
import * as controller from '../../../controllers/clinica/refertiController.js';
import { refertoSchema } from '../../../validations/clinica/referto.js';

const router = express.Router();

// GET /api/v1/clinica/referti
router.get(
  '/',
  requireAuth,
  requirePermission('VIEW_CLINICAL_REPORTS'),
  controller.getAll
);

// GET /api/v1/clinica/referti/:id
router.get(
  '/:id',
  requireAuth,
  requirePermission('VIEW_CLINICAL_REPORTS'),
  auditClinico('VIEW', 'Referto'),
  controller.getById
);

// POST /api/v1/clinica/referti
// Crea referto da visita
router.post(
  '/',
  requireAuth,
  requirePermission('CREATE_CLINICAL_REPORTS'),
  validateRequest(refertoSchema.create),
  auditClinico('CREATE', 'Referto'),
  controller.create
);

// PUT /api/v1/clinica/referti/:id
// Aggiorna referto (solo se BOZZA)
router.put(
  '/:id',
  requireAuth,
  requirePermission('EDIT_CLINICAL_REPORTS'),
  validateRequest(refertoSchema.update),
  auditClinico('UPDATE', 'Referto'),
  controller.update
);

// POST /api/v1/clinica/referti/:id/firma
// Firma digitale referto (solo MEDICO)
router.post(
  '/:id/firma',
  requireAuth,
  requirePermission('SIGN_CLINICAL'),
  auditClinico('SIGN', 'Referto'),
  controller.firma
);

// GET /api/v1/clinica/referti/:id/versioni
// Storico versioni referto (event sourcing)
router.get(
  '/:id/versioni',
  requireAuth,
  requirePermission('VIEW_CLINICAL_REPORTS'),
  controller.getVersioni
);

// GET /api/v1/clinica/referti/:id/pdf
// Genera PDF referto
router.get(
  '/:id/pdf',
  requireAuth,
  requirePermission('EXPORT_CLINICAL_REPORTS'),
  auditClinico('EXPORT', 'Referto'),
  controller.generatePDF
);

// POST /api/v1/clinica/referti/:id/invia
// Invia referto a paziente (email)
router.post(
  '/:id/invia',
  requireAuth,
  requirePermission('EXPORT_CLINICAL_REPORTS'),
  auditClinico('SEND', 'Referto'),
  controller.inviaAPaziente
);

export default router;
```

---

## 4. Services

### 4.1 Struttura Services

```
backend/services/clinica/
├── poliambulatorioService.js
├── ambulatoriService.js
├── strumentarioService.js
├── prestazioniService.js
├── listiniService.js
├── agendaService.js
├── appuntamentiService.js
├── visiteService.js
├── refertiService.js
├── documentiService.js
├── fatturazioneService.js
├── reminderService.js          # WhatsApp/SMS/Email
└── numeroChiamataService.js    # Sistema chiamata pazienti
```

### 4.2 Appuntamenti Service

```javascript
// backend/services/clinica/appuntamentiService.js

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { queueService } from '../queueService.js';

export const appuntamentiService = {
  /**
   * Crea nuovo appuntamento
   */
  async create(data, tenantId, userId) {
    // Verifica disponibilità slot
    const isDisponibile = await this.verificaDisponibilita(
      data.medicoId,
      data.ambulatorioId,
      data.dataOra,
      data.durataMinuti,
      tenantId
    );
    
    if (!isDisponibile) {
      throw new Error('Slot non disponibile');
    }
    
    // Verifica conflitti
    const conflitto = await this.verificaConflitti(
      data.medicoId,
      data.ambulatorioId,
      data.dataOra,
      data.durataMinuti,
      tenantId
    );
    
    if (conflitto) {
      throw new Error(`Conflitto con appuntamento esistente: ${conflitto.id}`);
    }
    
    // Crea appuntamento
    const appuntamento = await prisma.appuntamento.create({
      data: {
        ...data,
        tenantId,
        prenotatoDaId: userId,
        stato: 'PRENOTATO',
        statoSecondario: 'IN_ATTESA_CONFERMA'
      },
      include: {
        paziente: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        medico: { select: { id: true, firstName: true, lastName: true } },
        prestazione: { select: { id: true, nome: true, durata: true } },
        ambulatorio: { select: { id: true, nome: true, numero: true } }
      }
    });
    
    // Schedula reminder (asincrono)
    await queueService.addJob('reminder-appuntamento', {
      appuntamentoId: appuntamento.id,
      tipo: 'CONFERMA',
      scheduledFor: new Date() // Immediato per conferma
    });
    
    // Schedula reminder 24h prima
    const reminder24h = new Date(data.dataOra);
    reminder24h.setHours(reminder24h.getHours() - 24);
    
    await queueService.addJob('reminder-appuntamento', {
      appuntamentoId: appuntamento.id,
      tipo: 'REMINDER_24H',
      scheduledFor: reminder24h
    });
    
    logger.info({ appuntamentoId: appuntamento.id, userId }, 'Appuntamento creato');
    
    return appuntamento;
  },
  
  /**
   * Verifica disponibilità slot
   */
  async verificaDisponibilita(medicoId, ambulatorioId, dataOra, durataMinuti, tenantId) {
    const giornoSettimana = new Date(dataOra).getDay();
    const ora = dataOra.toTimeString().slice(0, 5); // "HH:MM"
    
    // Verifica slot disponibilità medico
    const slot = await prisma.slotDisponibilita.findFirst({
      where: {
        tenantId,
        medicoId,
        ambulatorioId,
        giornoSettimana,
        isAttivo: true,
        deletedAt: null,
        oraInizio: { lte: ora },
        oraFine: { gte: ora }
      }
    });
    
    if (!slot) {
      return false;
    }
    
    // Verifica eccezioni (ferie, etc.)
    const dataStr = dataOra.toISOString().split('T')[0];
    if (slot.eccezioni.includes(dataStr)) {
      return false;
    }
    
    return true;
  },
  
  /**
   * Verifica conflitti con altri appuntamenti
   */
  async verificaConflitti(medicoId, ambulatorioId, dataOra, durataMinuti, tenantId, excludeId = null) {
    const oraFine = new Date(dataOra);
    oraFine.setMinutes(oraFine.getMinutes() + durataMinuti);
    
    const conflitto = await prisma.appuntamento.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        stato: { notIn: ['CANCELLATO', 'NO_SHOW'] },
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          // Stesso medico
          {
            medicoId,
            dataOra: {
              gte: dataOra,
              lt: oraFine
            }
          },
          // Stesso ambulatorio
          {
            ambulatorioId,
            dataOra: {
              gte: dataOra,
              lt: oraFine
            }
          }
        ]
      }
    });
    
    return conflitto;
  },
  
  /**
   * Accetta paziente (check-in)
   */
  async accettaPaziente(id, userId, tenantId) {
    const appuntamento = await prisma.appuntamento.findFirst({
      where: { id, tenantId, deletedAt: null }
    });
    
    if (!appuntamento) {
      throw new Error('Appuntamento non trovato');
    }
    
    if (appuntamento.stato !== 'CONFERMATO' && appuntamento.stato !== 'PRENOTATO') {
      throw new Error('Stato appuntamento non valido per accettazione');
    }
    
    // Assegna numero chiamata
    const numeroChiamata = await this.assegnaNumeroChiamata(appuntamento.id, tenantId);
    
    // Calcola eventuale ritardo paziente
    const oraArrivo = new Date();
    const dataOraAppuntamento = new Date(appuntamento.dataOra);
    const ritardoMinuti = Math.max(0, Math.floor((oraArrivo - dataOraAppuntamento) / 60000));
    
    const updated = await prisma.appuntamento.update({
      where: { id },
      data: {
        stato: 'ACCETTATO',
        statoSecondario: ritardoMinuti > 0 ? 'RITARDO_PAZIENTE' : 'NESSUNO',
        oraArrivo,
        ritardoPazienteMinuti: ritardoMinuti > 0 ? ritardoMinuti : null,
        accettatoDaId: userId,
        numeroChiamataId: numeroChiamata.id,
        privacyAccettata: true
      },
      include: {
        paziente: true,
        medico: true,
        prestazione: true,
        numeroChiamata: true
      }
    });
    
    logger.info({ appuntamentoId: id, userId, ritardoMinuti }, 'Paziente accettato');
    
    return updated;
  },
  
  /**
   * Assegna numero chiamata progressivo giornaliero
   */
  async assegnaNumeroChiamata(appuntamentoId, tenantId) {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    
    // Trova ultimo numero del giorno
    const ultimo = await prisma.numeroChiamata.findFirst({
      where: {
        tenantId,
        data: oggi
      },
      orderBy: { numero: 'desc' }
    });
    
    const nuovoNumero = (ultimo?.numero || 0) + 1;
    
    const numeroChiamata = await prisma.numeroChiamata.create({
      data: {
        tenantId,
        numero: nuovoNumero,
        data: oggi
      }
    });
    
    return numeroChiamata;
  },
  
  /**
   * Chiama paziente (mostra su monitor)
   */
  async chiamaPaziente(id, ambulatorioDestinazioneId, userId, tenantId) {
    const appuntamento = await prisma.appuntamento.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { numeroChiamata: true }
    });
    
    if (!appuntamento) {
      throw new Error('Appuntamento non trovato');
    }
    
    if (appuntamento.stato !== 'ACCETTATO') {
      throw new Error('Paziente non ancora accettato');
    }
    
    // Aggiorna numero chiamata
    await prisma.numeroChiamata.update({
      where: { id: appuntamento.numeroChiamataId },
      data: {
        isChiamato: true,
        dataChiamata: new Date(),
        ambulatorioDestinazioneId
      }
    });
    
    // Aggiorna appuntamento
    const updated = await prisma.appuntamento.update({
      where: { id },
      data: {
        stato: 'CHIAMATO',
        oraChiamata: new Date(),
        chiamatoDaId: userId
      },
      include: {
        paziente: true,
        numeroChiamata: true,
        ambulatorio: true
      }
    });
    
    // TODO: Emit websocket event per aggiornare monitor sala attesa
    // websocketService.emit('numero-chiamata', { numero: appuntamento.numeroChiamata.numero, ambulatorio: ambulatorioDestinazioneId });
    
    logger.info({ appuntamentoId: id, numero: appuntamento.numeroChiamata.numero }, 'Paziente chiamato');
    
    return updated;
  }
};
```

### 4.3 Referti Service (con Versioning)

```javascript
// backend/services/clinica/refertiService.js

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { queueService } from '../queueService.js';
import { storageService } from '../storageService.js';

export const refertiService = {
  /**
   * Crea referto da visita
   */
  async create(data, tenantId, userId) {
    const visita = await prisma.visita.findFirst({
      where: { id: data.visitaId, tenantId, deletedAt: null },
      include: {
        appuntamento: { include: { paziente: true, prestazione: true } },
        medicoEsecutore: true,
        valoriCampi: { include: { campoVisita: true } }
      }
    });
    
    if (!visita) {
      throw new Error('Visita non trovata');
    }
    
    if (visita.referto) {
      throw new Error('Referto già esistente per questa visita');
    }
    
    // Genera contenuto da template e valori campi
    const contenuto = await this.generaContenuto(visita, data.templateId, tenantId);
    
    const referto = await prisma.referto.create({
      data: {
        visitaId: data.visitaId,
        templateId: data.templateId,
        templateVersion: 1,
        contenuto,
        contenutoJson: data.contenutoJson,
        stato: 'BOZZA',
        versione: 1,
        tenantId,
        creatoDaId: userId
      },
      include: {
        visita: {
          include: {
            appuntamento: { include: { paziente: true, prestazione: true } },
            medicoEsecutore: true
          }
        }
      }
    });
    
    logger.info({ refertoId: referto.id, visitaId: data.visitaId, userId }, 'Referto creato');
    
    return referto;
  },
  
  /**
   * Aggiorna referto (solo se BOZZA, crea nuova versione)
   */
  async update(id, data, tenantId, userId) {
    const referto = await prisma.referto.findFirst({
      where: { id, tenantId, deletedAt: null }
    });
    
    if (!referto) {
      throw new Error('Referto non trovato');
    }
    
    if (referto.stato !== 'BOZZA') {
      throw new Error('Referto non modificabile (già firmato o inviato)');
    }
    
    // Salva versione precedente (event sourcing)
    await prisma.versioneReferto.create({
      data: {
        refertoId: id,
        versione: referto.versione,
        contenuto: referto.contenuto,
        contenutoJson: referto.contenutoJson,
        motivoModifica: data.motivoModifica || 'Modifica',
        tenantId,
        creatoDaId: userId
      }
    });
    
    // Aggiorna referto con nuova versione
    const updated = await prisma.referto.update({
      where: { id },
      data: {
        contenuto: data.contenuto,
        contenutoJson: data.contenutoJson,
        versione: referto.versione + 1
      }
    });
    
    logger.info({ refertoId: id, versione: updated.versione, userId }, 'Referto aggiornato');
    
    return updated;
  },
  
  /**
   * Firma digitale referto (solo MEDICO)
   */
  async firma(id, userId, tenantId) {
    const referto = await prisma.referto.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        visita: { include: { medicoEsecutore: true } }
      }
    });
    
    if (!referto) {
      throw new Error('Referto non trovato');
    }
    
    if (referto.stato !== 'BOZZA' && referto.stato !== 'COMPLETATO') {
      throw new Error('Referto non firmabile');
    }
    
    // Verifica che chi firma sia il medico esecutore
    if (referto.visita.medicoEsecutoreId !== userId) {
      // Verifica se è un medico supervisore (TODO: logica permessi)
      throw new Error('Solo il medico esecutore può firmare');
    }
    
    // Crea firma digitale
    const firmaDigitale = await prisma.firmaDigitale.create({
      data: {
        personaId: userId,
        tipoDocumento: 'REFERTO',
        documentoId: id,
        hash: await this.calcolaHashReferto(referto),
        timestamp: new Date(),
        tenantId
      }
    });
    
    // Aggiorna referto
    const updated = await prisma.referto.update({
      where: { id },
      data: {
        stato: 'FIRMATO',
        isFirmato: true,
        dataFirma: new Date(),
        firmaDigitaleId: firmaDigitale.id
      }
    });
    
    // Genera PDF (asincrono)
    await queueService.addJob('genera-pdf-referto', {
      refertoId: id,
      tenantId
    });
    
    logger.info({ refertoId: id, userId, firmaId: firmaDigitale.id }, 'Referto firmato');
    
    return updated;
  },
  
  /**
   * Genera contenuto referto da template
   */
  async generaContenuto(visita, templateId, tenantId) {
    // Ottieni template
    const template = await prisma.templateLink.findFirst({
      where: { id: templateId, tenantId, deletedAt: null }
    });
    
    if (!template) {
      throw new Error('Template non trovato');
    }
    
    let contenuto = template.content || '';
    
    // Sostituisci placeholder
    const placeholders = {
      '{{PAZIENTE_NOME}}': `${visita.appuntamento.paziente.firstName} ${visita.appuntamento.paziente.lastName}`,
      '{{PAZIENTE_CF}}': visita.appuntamento.paziente.taxCode || '',
      '{{PAZIENTE_DATA_NASCITA}}': visita.appuntamento.paziente.birthDate?.toLocaleDateString('it-IT') || '',
      '{{MEDICO_NOME}}': `${visita.medicoEsecutore.firstName} ${visita.medicoEsecutore.lastName}`,
      '{{MEDICO_ALBO}}': visita.medicoEsecutore.registerCode || '',
      '{{PRESTAZIONE}}': visita.appuntamento.prestazione.nome,
      '{{DATA_VISITA}}': visita.oraInizio.toLocaleDateString('it-IT'),
      '{{ORA_VISITA}}': visita.oraInizio.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    };
    
    // Aggiungi valori campi visita
    for (const valore of visita.valoriCampi) {
      const placeholder = `{{CAMPO_${valore.campoVisita.nome.toUpperCase()}}}`;
      contenuto = contenuto.replace(placeholder, valore.valore || '');
    }
    
    // Sostituisci tutti i placeholder
    for (const [key, value] of Object.entries(placeholders)) {
      contenuto = contenuto.replaceAll(key, value);
    }
    
    return contenuto;
  },
  
  /**
   * Calcola hash del referto per firma
   */
  async calcolaHashReferto(referto) {
    const crypto = await import('crypto');
    const data = JSON.stringify({
      id: referto.id,
      visitaId: referto.visitaId,
      contenuto: referto.contenuto,
      versione: referto.versione
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  },
  
  /**
   * Ottieni storico versioni
   */
  async getVersioni(id, tenantId) {
    const versioni = await prisma.versioneReferto.findMany({
      where: { refertoId: id, tenantId },
      include: {
        creatoDa: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { versione: 'desc' }
    });
    
    return versioni;
  }
};
```

---

## 5. Middleware Clinici

### 5.1 Audit Clinico Middleware

```javascript
// backend/middleware/auditClinico.js

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

/**
 * Middleware per audit log accessi PHI (Protected Health Information)
 */
export const auditClinico = (operazione, entita) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Salva riferimento alla risposta originale
    const originalJson = res.json.bind(res);
    let responseData = null;
    
    // Override res.json per catturare la risposta
    res.json = (data) => {
      responseData = data;
      return originalJson(data);
    };
    
    // Continua con la richiesta
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        
        // Log solo per operazioni sensibili
        const isPHI = ['Visita', 'Referto', 'Paziente', 'CartellaClinica', 'DocumentoClinico'].includes(entita);
        
        if (isPHI || operazione !== 'VIEW') {
          await prisma.auditLogClinico.create({
            data: {
              entita,
              entitaId: req.params.id || responseData?.data?.id || null,
              operazione,
              personId: req.person?.id,
              tenantId: req.tenantId,
              ipAddress: req.ip || req.connection?.remoteAddress,
              userAgent: req.get('User-Agent'),
              metodo: req.method,
              path: req.originalUrl,
              statusCode: res.statusCode,
              durationMs: duration,
              requestBody: operazione !== 'VIEW' ? sanitizeForLog(req.body) : null,
              responseSuccess: res.statusCode >= 200 && res.statusCode < 300,
              metadata: {
                query: req.query,
                params: req.params
              }
            }
          });
        }
        
        // Log sempre su file per PHI
        if (isPHI) {
          logger.info({
            type: 'PHI_ACCESS',
            entita,
            entitaId: req.params.id,
            operazione,
            userId: req.person?.id,
            tenantId: req.tenantId,
            ip: req.ip,
            statusCode: res.statusCode,
            duration
          }, `PHI Access: ${operazione} ${entita}`);
        }
      } catch (error) {
        logger.error({ error }, 'Errore audit clinico');
      }
    });
    
    next();
  };
};

/**
 * Sanitizza dati per log (rimuovi password, token, etc.)
 */
function sanitizeForLog(data) {
  if (!data) return null;
  
  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'cf', 'codiceFiscale', 'taxCode'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}
```

### 5.2 Modello AuditLogClinico

```prisma
// Da aggiungere in FASE 1 schema

model AuditLogClinico {
  id              String    @id @default(uuid())
  
  // Entità tracciata
  entita          String    // "Visita", "Referto", etc.
  entitaId        String?
  operazione      String    // "VIEW", "CREATE", "UPDATE", "DELETE", "SIGN", "EXPORT", "SEND"
  
  // Chi ha eseguito
  personId        String?
  person          Person?   @relation("AuditClinicoPerson", fields: [personId], references: [id])
  
  // Dettagli richiesta
  ipAddress       String?
  userAgent       String?
  metodo          String?   // HTTP method
  path            String?
  statusCode      Int?
  durationMs      Int?
  
  // Dati
  requestBody     Json?
  responseSuccess Boolean   @default(true)
  metadata        Json?
  
  // Multi-tenancy
  tenantId        String
  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Timestamp (immutabile)
  createdAt       DateTime  @default(now())
  
  @@index([tenantId, entita, createdAt])
  @@index([personId, createdAt])
  @@index([entita, entitaId])
  @@index([tenantId])
}
```

---

## 6. Validazioni

### 6.1 Appuntamento Validation

```javascript
// backend/validations/clinica/appuntamento.js

import Joi from 'joi';

export const appuntamentoSchema = {
  create: Joi.object({
    pazienteId: Joi.string().uuid().required(),
    prestazioneId: Joi.string().uuid().required(),
    medicoId: Joi.string().uuid().required(),
    ambulatorioId: Joi.string().uuid().required(),
    infermiereId: Joi.string().uuid().optional(),
    listinoId: Joi.string().uuid().optional(),
    convenzioneId: Joi.string().uuid().optional(),
    dataOra: Joi.date().iso().min('now').required(),
    durataMinuti: Joi.number().integer().min(5).max(480).required(),
    origine: Joi.string().valid('TELEFONO', 'WEB', 'WALK_IN', 'RICHIAMO', 'CONVENZIONE', 'ALTRO').default('TELEFONO'),
    isRicorrente: Joi.boolean().default(false),
    numeroRicorrenze: Joi.number().integer().min(1).max(52).when('isRicorrente', {
      is: true,
      then: Joi.required()
    }),
    note: Joi.string().max(1000).optional(),
    richiedeAssistenza: Joi.boolean().default(false),
    noteAccessibilita: Joi.string().max(500).optional()
  }),
  
  update: Joi.object({
    dataOra: Joi.date().iso().min('now').optional(),
    durataMinuti: Joi.number().integer().min(5).max(480).optional(),
    medicoId: Joi.string().uuid().optional(),
    ambulatorioId: Joi.string().uuid().optional(),
    infermiereId: Joi.string().uuid().optional(),
    note: Joi.string().max(1000).optional(),
    noteInterne: Joi.string().max(1000).optional()
  }).min(1),
  
  changeStatus: Joi.object({
    stato: Joi.string().valid(
      'PRENOTATO', 'CONFERMATO', 'ACCETTATO', 'CHIAMATO', 
      'IN_VISITA', 'COMPLETATO', 'CANCELLATO', 'NO_SHOW'
    ).required(),
    statoSecondario: Joi.string().valid(
      'IN_ATTESA_CONFERMA', 'CONFERMATO_PAZIENTE', 'RITARDO_PAZIENTE',
      'RITARDO_MEDICO', 'DOCUMENTAZIONE_MANCANTE', 'NESSUNO'
    ).optional(),
    motivo: Joi.string().max(500).when('stato', {
      is: 'CANCELLATO',
      then: Joi.required()
    })
  })
};
```

---

## 7. Checklist Implementazione

### 7.1 Routes

- [ ] `backend/routes/v1/clinica/index.js` - Router principale
- [ ] `backend/routes/v1/clinica/poliambulatorio.js`
- [ ] `backend/routes/v1/clinica/sedi.js`
- [ ] `backend/routes/v1/clinica/ambulatori.js`
- [ ] `backend/routes/v1/clinica/strumentario.js`
- [ ] `backend/routes/v1/clinica/prestazioni.js`
- [ ] `backend/routes/v1/clinica/listini.js`
- [ ] `backend/routes/v1/clinica/convenzioni.js`
- [ ] `backend/routes/v1/clinica/agenda.js`
- [ ] `backend/routes/v1/clinica/appuntamenti.js`
- [ ] `backend/routes/v1/clinica/visite.js`
- [ ] `backend/routes/v1/clinica/referti.js`
- [ ] `backend/routes/v1/clinica/pazienti.js`
- [ ] `backend/routes/v1/clinica/documenti.js`
- [ ] `backend/routes/v1/clinica/fatturazione.js`
- [ ] `backend/routes/v1/clinica/numero-chiamata.js`

### 7.2 Controllers

- [ ] `backend/controllers/clinica/poliambulatorioController.js`
- [ ] `backend/controllers/clinica/sediController.js`
- [ ] `backend/controllers/clinica/ambulatoriController.js`
- [ ] `backend/controllers/clinica/strumentarioController.js`
- [ ] `backend/controllers/clinica/prestazioniController.js`
- [ ] `backend/controllers/clinica/listiniController.js`
- [ ] `backend/controllers/clinica/convenzioniController.js`
- [ ] `backend/controllers/clinica/agendaController.js`
- [ ] `backend/controllers/clinica/appuntamentiController.js`
- [ ] `backend/controllers/clinica/visiteController.js`
- [ ] `backend/controllers/clinica/refertiController.js`
- [ ] `backend/controllers/clinica/pazientiController.js`
- [ ] `backend/controllers/clinica/documentiController.js`
- [ ] `backend/controllers/clinica/fatturazioneController.js`
- [ ] `backend/controllers/clinica/numeroChiamataController.js`

### 7.3 Services

- [ ] `backend/services/clinica/poliambulatorioService.js`
- [ ] `backend/services/clinica/ambulatoriService.js`
- [ ] `backend/services/clinica/strumentarioService.js`
- [ ] `backend/services/clinica/prestazioniService.js`
- [ ] `backend/services/clinica/listiniService.js`
- [ ] `backend/services/clinica/agendaService.js`
- [ ] `backend/services/clinica/appuntamentiService.js`
- [ ] `backend/services/clinica/visiteService.js`
- [ ] `backend/services/clinica/refertiService.js`
- [ ] `backend/services/clinica/documentiService.js`
- [ ] `backend/services/clinica/fatturazioneService.js`
- [ ] `backend/services/clinica/reminderService.js`
- [ ] `backend/services/clinica/numeroChiamataService.js`

### 7.4 Middleware

- [ ] `backend/middleware/auditClinico.js`
- [ ] `backend/middleware/requireMedico.js`
- [ ] `backend/middleware/requirePazienteOwner.js`

### 7.5 Validations

- [ ] `backend/validations/clinica/poliambulatorio.js`
- [ ] `backend/validations/clinica/ambulatorio.js`
- [ ] `backend/validations/clinica/strumentario.js`
- [ ] `backend/validations/clinica/prestazione.js`
- [ ] `backend/validations/clinica/listino.js`
- [ ] `backend/validations/clinica/appuntamento.js`
- [ ] `backend/validations/clinica/visita.js`
- [ ] `backend/validations/clinica/referto.js`

---

## 8. Test Cases

| ID | Endpoint | Test | Expected |
|----|----------|------|----------|
| T2.1 | POST /appuntamenti | Crea appuntamento valido | 201 + data |
| T2.2 | POST /appuntamenti | Conflitto orario | 409 Conflict |
| T2.3 | POST /appuntamenti/:id/accetta | Accettazione paziente | 200 + numero chiamata |
| T2.4 | POST /appuntamenti/:id/chiama | Chiama paziente | 200 + emit websocket |
| T2.5 | POST /visite | Crea visita da appuntamento | 201 |
| T2.6 | POST /referti | Crea referto da visita | 201 |
| T2.7 | PUT /referti/:id | Aggiorna referto BOZZA | 200 + versione++ |
| T2.8 | PUT /referti/:id | Aggiorna referto FIRMATO | 403 Forbidden |
| T2.9 | POST /referti/:id/firma | Firma medico esecutore | 200 + stato FIRMATO |
| T2.10 | POST /referti/:id/firma | Firma non medico | 403 Forbidden |
| T2.11 | GET /referti/:id/versioni | Storico versioni | Array versioni |
| T2.12 | * | Audit log PHI | Record creato |

---

**Prossimo Documento**: `04_FASE_3_FRONTEND_BASE.md` - Frontend Base Medica
