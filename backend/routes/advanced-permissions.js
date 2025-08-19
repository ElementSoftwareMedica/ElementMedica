import express from 'express';
import { PrismaClient } from '@prisma/client';
import enhancedRoleService from '../services/enhancedRoleService.js';
import { authenticate } from '../auth/middleware.js';
import { tenantMiddleware } from '../middleware/tenant.js';

const router = express.Router();
const prisma = new PrismaClient();

// Applica solo il middleware del tenant globalmente
// Il middleware di autenticazione sarà applicato solo alle route che ne hanno bisogno
router.use(tenantMiddleware);

/**
 * @route GET /api/advanced-permissions/entities
 * @desc Ottiene tutte le entità disponibili per i permessi
 * @access Admin
 * @updated Fixed permission format to use backend format
 */
router.get('/entities',
  authenticate(),
  // enhancedRoleService.requirePermission('ROLE_MANAGEMENT'), // Temporaneamente disabilitato per debug
  async (req, res) => {
    try {
      const entities = [
        {
          id: 'persons',
          name: 'persons',
          displayName: 'Persone',
          description: 'Gestione delle persone e dipendenti',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'firstName', name: 'firstName', displayName: 'Nome', type: 'string', sensitive: false },
            { id: 'lastName', name: 'lastName', displayName: 'Cognome', type: 'string', sensitive: false },
            { id: 'email', name: 'email', displayName: 'Email', type: 'email', sensitive: true },
            { id: 'phone', name: 'phone', displayName: 'Telefono', type: 'phone', sensitive: true },
            { id: 'address', name: 'address', displayName: 'Indirizzo', type: 'string', sensitive: true },
            { id: 'fiscalCode', name: 'fiscalCode', displayName: 'Codice Fiscale', type: 'string', sensitive: true },
            { id: 'birthDate', name: 'birthDate', displayName: 'Data di Nascita', type: 'date', sensitive: true },
            { id: 'salary', name: 'salary', displayName: 'Stipendio', type: 'number', sensitive: true },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'companies',
          name: 'companies',
          displayName: 'Aziende',
          description: 'Gestione delle aziende e organizzazioni',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'ragioneSociale', name: 'ragioneSociale', displayName: 'Ragione Sociale', type: 'string', sensitive: false },
            { id: 'partitaIva', name: 'partitaIva', displayName: 'Partita IVA', type: 'string', sensitive: true },
            { id: 'codiceFiscale', name: 'codiceFiscale', displayName: 'Codice Fiscale', type: 'string', sensitive: true },
            { id: 'indirizzo', name: 'indirizzo', displayName: 'Indirizzo', type: 'string', sensitive: false },
            { id: 'citta', name: 'citta', displayName: 'Città', type: 'string', sensitive: false },
            { id: 'provincia', name: 'provincia', displayName: 'Provincia', type: 'string', sensitive: false },
            { id: 'cap', name: 'cap', displayName: 'CAP', type: 'string', sensitive: false },
            { id: 'telefono', name: 'telefono', displayName: 'Telefono', type: 'phone', sensitive: false },
            { id: 'email', name: 'email', displayName: 'Email', type: 'email', sensitive: false },
            { id: 'pec', name: 'pec', displayName: 'PEC', type: 'email', sensitive: true },
            { id: 'sito_web', name: 'sito_web', displayName: 'Sito Web', type: 'url', sensitive: false },
            { id: 'settore', name: 'settore', displayName: 'Settore', type: 'string', sensitive: false },
            { id: 'dipendenti_count', name: 'dipendenti_count', displayName: 'Numero Dipendenti', type: 'number', sensitive: false },
            { id: 'isActive', name: 'isActive', displayName: 'Attivo', type: 'boolean', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'courses',
          name: 'courses',
          displayName: 'Corsi',
          description: 'Gestione dei corsi di formazione',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo', type: 'string', sensitive: false },
            { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string', sensitive: false },
            { id: 'startDate', name: 'startDate', displayName: 'Data Inizio', type: 'date', sensitive: false },
            { id: 'endDate', name: 'endDate', displayName: 'Data Fine', type: 'date', sensitive: false },
            { id: 'duration', name: 'duration', displayName: 'Durata', type: 'number', sensitive: false },
            { id: 'category', name: 'category', displayName: 'Categoria', type: 'string', sensitive: false },
            { id: 'level', name: 'level', displayName: 'Livello', type: 'string', sensitive: false },
            { id: 'price', name: 'price', displayName: 'Prezzo', type: 'number', sensitive: false },
            { id: 'maxParticipants', name: 'maxParticipants', displayName: 'Max Partecipanti', type: 'number', sensitive: false },
            { id: 'isActive', name: 'isActive', displayName: 'Attivo', type: 'boolean', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'trainings',
          name: 'trainings',
          displayName: 'Formazioni',
          description: 'Gestione delle sessioni di formazione',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo Sessione', type: 'string', sensitive: false },
            { id: 'startDate', name: 'startDate', displayName: 'Data Inizio', type: 'date', sensitive: false },
            { id: 'endDate', name: 'endDate', displayName: 'Data Fine', type: 'date', sensitive: false },
            { id: 'location', name: 'location', displayName: 'Luogo', type: 'string', sensitive: false },
            { id: 'instructor', name: 'instructor', displayName: 'Formatore', type: 'string', sensitive: false },
            { id: 'status', name: 'status', displayName: 'Stato', type: 'string', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'roles',
          name: 'roles',
          displayName: 'Ruoli',
          description: 'Gestione dei ruoli e permessi',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'name', name: 'name', displayName: 'Nome Ruolo', type: 'string', sensitive: false },
            { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string', sensitive: false },
            { id: 'level', name: 'level', displayName: 'Livello', type: 'number', sensitive: false },
            { id: 'isActive', name: 'isActive', displayName: 'Attivo', type: 'boolean', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'hierarchy',
          name: 'hierarchy',
          displayName: 'Gerarchia',
          description: 'Gestione della gerarchia organizzativa',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'name', name: 'name', displayName: 'Nome Nodo', type: 'string', sensitive: false },
            { id: 'type', name: 'type', displayName: 'Tipo', type: 'string', sensitive: false },
            { id: 'level', name: 'level', displayName: 'Livello', type: 'number', sensitive: false },
            { id: 'manager', name: 'manager', displayName: 'Responsabile', type: 'string', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'sites',
          name: 'sites',
          displayName: 'Sedi Aziendali',
          description: 'Gestione delle sedi aziendali',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'siteName', name: 'siteName', displayName: 'Nome Sede', type: 'string', sensitive: false },
            { id: 'citta', name: 'citta', displayName: 'Città', type: 'string', sensitive: false },
            { id: 'indirizzo', name: 'indirizzo', displayName: 'Indirizzo', type: 'string', sensitive: false },
            { id: 'telefono', name: 'telefono', displayName: 'Telefono', type: 'string', sensitive: false },
            { id: 'mail', name: 'mail', displayName: 'Email', type: 'email', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'reparti',
          name: 'reparti',
          displayName: 'Reparti',
          description: 'Gestione dei reparti aziendali',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'nome', name: 'nome', displayName: 'Nome Reparto', type: 'string', sensitive: false },
            { id: 'descrizione', name: 'descrizione', displayName: 'Descrizione', type: 'string', sensitive: false },
            { id: 'codiceReparto', name: 'codiceReparto', displayName: 'Codice Reparto', type: 'string', sensitive: false },
            { id: 'budget', name: 'budget', displayName: 'Budget', type: 'number', sensitive: true },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'dvr',
          name: 'dvr',
          displayName: 'DVR (Documenti Valutazione Rischi)',
          description: 'Gestione dei documenti di valutazione dei rischi',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'titolo', name: 'titolo', displayName: 'Titolo', type: 'string', sensitive: false },
            { id: 'descrizione', name: 'descrizione', displayName: 'Descrizione', type: 'string', sensitive: false },
            { id: 'versione', name: 'versione', displayName: 'Versione', type: 'string', sensitive: false },
            { id: 'dataEmissione', name: 'dataEmissione', displayName: 'Data Emissione', type: 'date', sensitive: false },
            { id: 'stato', name: 'stato', displayName: 'Stato', type: 'string', sensitive: false },
            { id: 'companyId', name: 'companyId', displayName: 'ID Azienda', type: 'number', sensitive: false },
            { id: 'siteId', name: 'siteId', displayName: 'ID Sede', type: 'number', sensitive: false },
            { id: 'responsabile', name: 'responsabile', displayName: 'Responsabile', type: 'string', sensitive: false },
            { id: 'approvato', name: 'approvato', displayName: 'Approvato', type: 'boolean', sensitive: false },
            { id: 'dataApprovazione', name: 'dataApprovazione', displayName: 'Data Approvazione', type: 'date', sensitive: false },
            { id: 'scadenza', name: 'scadenza', displayName: 'Scadenza', type: 'date', sensitive: false },
            { id: 'note', name: 'note', displayName: 'Note', type: 'string', sensitive: false },
            { id: 'allegati', name: 'allegati', displayName: 'Allegati', type: 'string', sensitive: false },
            { id: 'reportPath', name: 'reportPath', displayName: 'Percorso Report', type: 'string', sensitive: true },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        // Entità virtuali basate su Person con ruoli specifici
        {
          id: 'employees',
          name: 'employees',
          displayName: 'Dipendenti',
          description: 'Gestione dei dipendenti (Person con ruolo Responsabile Aziendale o inferiore)',
          isVirtual: true,
          baseEntity: 'persons',
          virtualCriteria: {
            roleTypes: ['COMPANY_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'EMPLOYEE'],
            hierarchyBranch: 'company'
          },
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'firstName', name: 'firstName', displayName: 'Nome', type: 'string', sensitive: false },
            { id: 'lastName', name: 'lastName', displayName: 'Cognome', type: 'string', sensitive: false },
            { id: 'email', name: 'email', displayName: 'Email', type: 'email', sensitive: true },
            { id: 'phone', name: 'phone', displayName: 'Telefono', type: 'phone', sensitive: true },
            { id: 'address', name: 'address', displayName: 'Indirizzo', type: 'string', sensitive: true },
            { id: 'fiscalCode', name: 'fiscalCode', displayName: 'Codice Fiscale', type: 'string', sensitive: true },
            { id: 'birthDate', name: 'birthDate', displayName: 'Data di Nascita', type: 'date', sensitive: true },
            { id: 'salary', name: 'salary', displayName: 'Stipendio', type: 'number', sensitive: true },
            { id: 'role', name: 'role', displayName: 'Ruolo Aziendale', type: 'string', sensitive: false },
            { id: 'department', name: 'department', displayName: 'Reparto', type: 'string', sensitive: false },
            { id: 'hireDate', name: 'hireDate', displayName: 'Data Assunzione', type: 'date', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'trainers',
          name: 'trainers',
          displayName: 'Formatori',
          description: 'Gestione dei formatori (Person con ruolo Coordinatore Formatori o inferiore)',
          isVirtual: true,
          baseEntity: 'persons',
          virtualCriteria: {
            roleTypes: ['TRAINER_COORDINATOR', 'TRAINER', 'ASSISTANT_TRAINER'],
            hierarchyBranch: 'training'
          },
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'firstName', name: 'firstName', displayName: 'Nome', type: 'string', sensitive: false },
            { id: 'lastName', name: 'lastName', displayName: 'Cognome', type: 'string', sensitive: false },
            { id: 'email', name: 'email', displayName: 'Email', type: 'email', sensitive: true },
            { id: 'phone', name: 'phone', displayName: 'Telefono', type: 'phone', sensitive: true },
            { id: 'specialization', name: 'specialization', displayName: 'Specializzazione', type: 'string', sensitive: false },
            { id: 'certifications', name: 'certifications', displayName: 'Certificazioni', type: 'string', sensitive: false },
            { id: 'experience', name: 'experience', displayName: 'Esperienza (anni)', type: 'number', sensitive: false },
            { id: 'hourlyRate', name: 'hourlyRate', displayName: 'Tariffa Oraria', type: 'number', sensitive: true },
            { id: 'availability', name: 'availability', displayName: 'Disponibilità', type: 'string', sensitive: false },
            { id: 'rating', name: 'rating', displayName: 'Valutazione', type: 'number', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'sopralluoghi',
          name: 'sopralluoghi',
          displayName: 'Sopralluoghi',
          description: 'Gestione dei sopralluoghi aziendali',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'titolo', name: 'titolo', displayName: 'Titolo', type: 'string', sensitive: false },
            { id: 'descrizione', name: 'descrizione', displayName: 'Descrizione', type: 'string', sensitive: false },
            { id: 'tipo', name: 'tipo', displayName: 'Tipo Sopralluogo', type: 'string', sensitive: false },
            { id: 'dataSopralluogo', name: 'dataSopralluogo', displayName: 'Data Sopralluogo', type: 'date', sensitive: false },
            { id: 'stato', name: 'stato', displayName: 'Stato', type: 'string', sensitive: false },
            { id: 'esito', name: 'esito', displayName: 'Esito', type: 'string', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'gdpr',
          name: 'gdpr',
          displayName: 'GDPR',
          description: 'Gestione della conformità GDPR',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo', type: 'string', sensitive: false },
            { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string', sensitive: false },
            { id: 'dataType', name: 'dataType', displayName: 'Tipo Dato', type: 'string', sensitive: true },
            { id: 'purpose', name: 'purpose', displayName: 'Finalità', type: 'string', sensitive: false },
            { id: 'retention', name: 'retention', displayName: 'Conservazione', type: 'string', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'documents',
          name: 'documents',
          displayName: 'Documenti',
          description: 'Gestione dei documenti aziendali',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo', type: 'string', sensitive: false },
            { id: 'type', name: 'type', displayName: 'Tipo', type: 'string', sensitive: false },
            { id: 'version', name: 'version', displayName: 'Versione', type: 'string', sensitive: false },
            { id: 'createdDate', name: 'createdDate', displayName: 'Data Creazione', type: 'date', sensitive: false },
            { id: 'content', name: 'content', displayName: 'Contenuto', type: 'string', sensitive: true },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'certificates',
          name: 'certificates',
          displayName: 'Certificati',
          description: 'Gestione dei certificati',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'name', name: 'name', displayName: 'Nome Certificato', type: 'string', sensitive: false },
            { id: 'issuer', name: 'issuer', displayName: 'Ente Emittente', type: 'string', sensitive: false },
            { id: 'issueDate', name: 'issueDate', displayName: 'Data Emissione', type: 'date', sensitive: false },
            { id: 'expiryDate', name: 'expiryDate', displayName: 'Data Scadenza', type: 'date', sensitive: false },
            { id: 'status', name: 'status', displayName: 'Stato', type: 'string', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'equipment',
          name: 'equipment',
          displayName: 'Attrezzature',
          description: 'Gestione delle attrezzature',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'name', name: 'name', displayName: 'Nome Attrezzatura', type: 'string', sensitive: false },
            { id: 'model', name: 'model', displayName: 'Modello', type: 'string', sensitive: false },
            { id: 'serialNumber', name: 'serialNumber', displayName: 'Numero Seriale', type: 'string', sensitive: false },
            { id: 'purchaseDate', name: 'purchaseDate', displayName: 'Data Acquisto', type: 'date', sensitive: false },
            { id: 'cost', name: 'cost', displayName: 'Costo', type: 'number', sensitive: true },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'incidents',
          name: 'incidents',
          displayName: 'Incidenti',
          description: 'Gestione degli incidenti',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo', type: 'string', sensitive: false },
            { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string', sensitive: false },
            { id: 'severity', name: 'severity', displayName: 'Gravità', type: 'string', sensitive: false },
            { id: 'date', name: 'date', displayName: 'Data Incidente', type: 'date', sensitive: false },
            { id: 'status', name: 'status', displayName: 'Stato', type: 'string', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'audits',
          name: 'audits',
          displayName: 'Audit',
          description: 'Gestione degli audit',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo Audit', type: 'string', sensitive: false },
            { id: 'type', name: 'type', displayName: 'Tipo Audit', type: 'string', sensitive: false },
            { id: 'date', name: 'date', displayName: 'Data Audit', type: 'date', sensitive: false },
            { id: 'auditor', name: 'auditor', displayName: 'Auditor', type: 'string', sensitive: false },
            { id: 'findings', name: 'findings', displayName: 'Risultati', type: 'string', sensitive: true },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'policies',
          name: 'policies',
          displayName: 'Politiche',
          description: 'Gestione delle politiche aziendali',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo Politica', type: 'string', sensitive: false },
            { id: 'category', name: 'category', displayName: 'Categoria', type: 'string', sensitive: false },
            { id: 'version', name: 'version', displayName: 'Versione', type: 'string', sensitive: false },
            { id: 'effectiveDate', name: 'effectiveDate', displayName: 'Data Efficacia', type: 'date', sensitive: false },
            { id: 'content', name: 'content', displayName: 'Contenuto', type: 'string', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'procedures',
          name: 'procedures',
          displayName: 'Procedure',
          description: 'Gestione delle procedure aziendali',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo Procedura', type: 'string', sensitive: false },
            { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string', sensitive: false },
            { id: 'steps', name: 'steps', displayName: 'Passi', type: 'string', sensitive: false },
            { id: 'owner', name: 'owner', displayName: 'Responsabile', type: 'string', sensitive: false },
            { id: 'lastReview', name: 'lastReview', displayName: 'Ultima Revisione', type: 'date', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'risks',
          name: 'risks',
          displayName: 'Rischi',
          description: 'Gestione dei rischi aziendali',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo Rischio', type: 'string', sensitive: false },
            { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string', sensitive: false },
            { id: 'probability', name: 'probability', displayName: 'Probabilità', type: 'string', sensitive: false },
            { id: 'impact', name: 'impact', displayName: 'Impatto', type: 'string', sensitive: false },
            { id: 'mitigation', name: 'mitigation', displayName: 'Mitigazione', type: 'string', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'controls',
          name: 'controls',
          displayName: 'Controlli',
          description: 'Gestione dei controlli aziendali',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo Controllo', type: 'string', sensitive: false },
            { id: 'type', name: 'type', displayName: 'Tipo Controllo', type: 'string', sensitive: false },
            { id: 'frequency', name: 'frequency', displayName: 'Frequenza', type: 'string', sensitive: false },
            { id: 'responsible', name: 'responsible', displayName: 'Responsabile', type: 'string', sensitive: false },
            { id: 'lastExecution', name: 'lastExecution', displayName: 'Ultima Esecuzione', type: 'date', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'assessments',
          name: 'assessments',
          displayName: 'Valutazioni',
          description: 'Gestione delle valutazioni',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo Valutazione', type: 'string', sensitive: false },
            { id: 'type', name: 'type', displayName: 'Tipo Valutazione', type: 'string', sensitive: false },
            { id: 'date', name: 'date', displayName: 'Data Valutazione', type: 'date', sensitive: false },
            { id: 'assessor', name: 'assessor', displayName: 'Valutatore', type: 'string', sensitive: false },
            { id: 'score', name: 'score', displayName: 'Punteggio', type: 'number', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'notifications',
          name: 'notifications',
          displayName: 'Notifiche',
          description: 'Gestione delle notifiche di sistema',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo', type: 'string', sensitive: false },
            { id: 'message', name: 'message', displayName: 'Messaggio', type: 'string', sensitive: false },
            { id: 'type', name: 'type', displayName: 'Tipo', type: 'string', sensitive: false },
            { id: 'date', name: 'date', displayName: 'Data', type: 'date', sensitive: false },
            { id: 'read', name: 'read', displayName: 'Letto', type: 'boolean', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'reports',
          name: 'reports',
          displayName: 'Report',
          description: 'Gestione dei report aziendali',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo Report', type: 'string', sensitive: false },
            { id: 'type', name: 'type', displayName: 'Tipo Report', type: 'string', sensitive: false },
            { id: 'generatedDate', name: 'generatedDate', displayName: 'Data Generazione', type: 'date', sensitive: false },
            { id: 'format', name: 'format', displayName: 'Formato', type: 'string', sensitive: false },
            { id: 'data', name: 'data', displayName: 'Dati', type: 'string', sensitive: true },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'analytics',
          name: 'analytics',
          displayName: 'Analytics',
          description: 'Gestione delle analitiche aziendali',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'metric', name: 'metric', displayName: 'Metrica', type: 'string', sensitive: false },
            { id: 'value', name: 'value', displayName: 'Valore', type: 'number', sensitive: false },
            { id: 'date', name: 'date', displayName: 'Data', type: 'date', sensitive: false },
            { id: 'category', name: 'category', displayName: 'Categoria', type: 'string', sensitive: false },
            { id: 'source', name: 'source', displayName: 'Fonte', type: 'string', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'settings',
          name: 'settings',
          displayName: 'Impostazioni',
          description: 'Gestione delle impostazioni di sistema',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'key', name: 'key', displayName: 'Chiave', type: 'string', sensitive: false },
            { id: 'value', name: 'value', displayName: 'Valore', type: 'string', sensitive: false },
            { id: 'category', name: 'category', displayName: 'Categoria', type: 'string', sensitive: false },
            { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string', sensitive: false },
            { id: 'isSystem', name: 'isSystem', displayName: 'Sistema', type: 'boolean', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'logs',
          name: 'logs',
          displayName: 'Log di Sistema',
          description: 'Gestione dei log di sistema',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'timestamp', name: 'timestamp', displayName: 'Timestamp', type: 'date', sensitive: false },
            { id: 'level', name: 'level', displayName: 'Livello', type: 'string', sensitive: false },
            { id: 'message', name: 'message', displayName: 'Messaggio', type: 'string', sensitive: false },
            { id: 'source', name: 'source', displayName: 'Fonte', type: 'string', sensitive: false },
            { id: 'userId', name: 'userId', displayName: 'ID Utente', type: 'string', sensitive: true },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'backups',
          name: 'backups',
          displayName: 'Backup',
          description: 'Gestione dei backup di sistema',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'name', name: 'name', displayName: 'Nome Backup', type: 'string', sensitive: false },
            { id: 'date', name: 'date', displayName: 'Data Backup', type: 'date', sensitive: false },
            { id: 'size', name: 'size', displayName: 'Dimensione', type: 'number', sensitive: false },
            { id: 'type', name: 'type', displayName: 'Tipo', type: 'string', sensitive: false },
            { id: 'status', name: 'status', displayName: 'Stato', type: 'string', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'integrations',
          name: 'integrations',
          displayName: 'Integrazioni',
          description: 'Gestione delle integrazioni esterne',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'name', name: 'name', displayName: 'Nome Integrazione', type: 'string', sensitive: false },
            { id: 'type', name: 'type', displayName: 'Tipo', type: 'string', sensitive: false },
            { id: 'status', name: 'status', displayName: 'Stato', type: 'string', sensitive: false },
            { id: 'lastSync', name: 'lastSync', displayName: 'Ultima Sincronizzazione', type: 'date', sensitive: false },
            { id: 'config', name: 'config', displayName: 'Configurazione', type: 'string', sensitive: true },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'workflows',
          name: 'workflows',
          displayName: 'Flussi di Lavoro',
          description: 'Gestione dei flussi di lavoro aziendali',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'name', name: 'name', displayName: 'Nome Workflow', type: 'string', sensitive: false },
            { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string', sensitive: false },
            { id: 'status', name: 'status', displayName: 'Stato', type: 'string', sensitive: false },
            { id: 'steps', name: 'steps', displayName: 'Passi', type: 'string', sensitive: false },
            { id: 'owner', name: 'owner', displayName: 'Proprietario', type: 'string', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'templates',
          name: 'templates',
          displayName: 'Template',
          description: 'Gestione dei template aziendali',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'name', name: 'name', displayName: 'Nome Template', type: 'string', sensitive: false },
            { id: 'type', name: 'type', displayName: 'Tipo', type: 'string', sensitive: false },
            { id: 'content', name: 'content', displayName: 'Contenuto', type: 'string', sensitive: false },
            { id: 'version', name: 'version', displayName: 'Versione', type: 'string', sensitive: false },
            { id: 'lastModified', name: 'lastModified', displayName: 'Ultima Modifica', type: 'date', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'form_templates',
          name: 'form_templates',
          displayName: 'Template Form',
          description: 'Gestione dei template per form dinamici',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'name', name: 'name', displayName: 'Nome Template', type: 'string', sensitive: false },
            { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string', sensitive: false },
            { id: 'type', name: 'type', displayName: 'Tipo Form', type: 'string', sensitive: false },
            { id: 'schema', name: 'schema', displayName: 'Schema JSON', type: 'string', sensitive: false },
            { id: 'version', name: 'version', displayName: 'Versione', type: 'string', sensitive: false },
            { id: 'isActive', name: 'isActive', displayName: 'Attivo', type: 'boolean', sensitive: false },
            { id: 'requiresAuth', name: 'requiresAuth', displayName: 'Richiede Autenticazione', type: 'boolean', sensitive: false },
            { id: 'settings', name: 'settings', displayName: 'Impostazioni', type: 'string', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'form_submissions',
          name: 'form_submissions',
          displayName: 'Risposte Form',
          description: 'Gestione delle risposte ai form',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'formData', name: 'formData', displayName: 'Dati Form', type: 'string', sensitive: true },
            { id: 'submittedAt', name: 'submittedAt', displayName: 'Data Invio', type: 'date', sensitive: false },
            { id: 'ipAddress', name: 'ipAddress', displayName: 'Indirizzo IP', type: 'string', sensitive: true },
            { id: 'userAgent', name: 'userAgent', displayName: 'User Agent', type: 'string', sensitive: false },
            { id: 'status', name: 'status', displayName: 'Stato', type: 'string', sensitive: false },
            { id: 'processedAt', name: 'processedAt', displayName: 'Data Elaborazione', type: 'date', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        },
        {
          id: 'public_cms',
          name: 'public_cms',
          displayName: 'CMS Pubblico',
          description: 'Gestione dei contenuti del sito pubblico',
          fields: [
            { id: 'id', name: 'id', displayName: 'ID', type: 'number', sensitive: false },
            { id: 'section', name: 'section', displayName: 'Sezione', type: 'string', sensitive: false },
            { id: 'title', name: 'title', displayName: 'Titolo', type: 'string', sensitive: false },
            { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string', sensitive: false },
            { id: 'content', name: 'content', displayName: 'Contenuto', type: 'string', sensitive: false },
            { id: 'images', name: 'images', displayName: 'Immagini', type: 'string', sensitive: false },
            { id: 'metadata', name: 'metadata', displayName: 'Metadati', type: 'string', sensitive: false },
            { id: 'createdAt', name: 'createdAt', displayName: 'Data Creazione', type: 'datetime', sensitive: false },
            { id: 'updatedAt', name: 'updatedAt', displayName: 'Ultimo Aggiornamento', type: 'datetime', sensitive: false }
          ]
        }
      ];

      res.json({
        success: true,
        entities: entities
      });
    } catch (error) {
      console.error('[ADVANCED_PERMISSIONS] Error getting entities:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get entities'
      });
    }
  }
);

/**
 * @route GET /api/advanced-permissions/resources
 * @desc Ottiene tutte le risorse disponibili per i permessi
 * @access Admin
 */
router.get('/resources',
  enhancedRoleService.requirePermission('roles.read'),
  async (req, res) => {
    try {
      const resources = {
        person: {
          name: 'Persone',
          actions: ['read', 'create', 'update', 'delete'],
          fields: [
            'id', 'firstName', 'lastName', 'email', 'username',
            'phone', 'address', 'city', 'province', 'cap',
            'fiscalCode', 'birthDate', 'birthPlace', 'nationality',
            'isActive', 'lastLogin', 'createdAt', 'updatedAt'
          ]
        },
        company: {
          name: 'Aziende',
          actions: ['read', 'create', 'update', 'delete'],
          fields: [
            'id', 'ragioneSociale', 'partitaIva', 'codiceFiscale',
            'indirizzo', 'citta', 'provincia', 'cap', 'telefono',
            'email', 'pec', 'sito_web', 'settore', 'dipendenti_count',
            'isActive', 'createdAt', 'updatedAt'
          ]
        },
        course: {
          name: 'Corsi',
          actions: ['read', 'create', 'update', 'delete', 'assign'],
          fields: [
            'id', 'title', 'description', 'duration', 'category',
            'level', 'price', 'maxParticipants', 'isActive',
            'createdAt', 'updatedAt'
          ]
        },
        training: {
          name: 'Formazioni',
          actions: ['read', 'create', 'update', 'delete', 'conduct'],
          fields: [
            'id', 'title', 'description', 'startDate', 'endDate',
            'location', 'status', 'participantsCount', 'maxParticipants',
            'createdAt', 'updatedAt'
          ]
        }
      };

      res.json({
        success: true,
        data: resources
      });
    } catch (error) {
      console.error('[ADVANCED_PERMISSIONS] Error getting resources:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get resources'
      });
    }
  }
);

/**
 * @route GET /api/advanced-permissions/scopes
 * @desc Ottiene tutti gli scope disponibili per i permessi
 * @access Admin
 */
router.get('/scopes',
  authenticate(),
  enhancedRoleService.requirePermission('roles.read'),
  async (req, res) => {
    try {
      const scopes = {
        global: {
          name: 'Globale',
          description: 'Accesso completo a tutte le risorse del sistema'
        },
        tenant: {
          name: 'Tenant',
          description: 'Accesso limitato alle risorse del tenant corrente'
        },
        company: {
          name: 'Azienda',
          description: 'Accesso limitato alle risorse della propria azienda'
        },
        department: {
          name: 'Dipartimento',
          description: 'Accesso limitato alle risorse del proprio dipartimento'
        },
        self: {
          name: 'Personale',
          description: 'Accesso limitato alle proprie risorse'
        }
      };

      res.json({
        success: true,
        data: scopes
      });
    } catch (error) {
      console.error('[ADVANCED_PERMISSIONS] Error getting scopes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get scopes'
      });
    }
  }
);

/**
 * @route GET /api/advanced-permissions/conditions
 * @desc Ottiene tutte le condizioni disponibili per i permessi
 * @access Admin
 */
router.get('/conditions',
  authenticate(),
  enhancedRoleService.requirePermission('roles.read'),
  async (req, res) => {
    try {
      const conditions = {
        ownedBy: {
          name: 'Proprietario',
          description: 'Può accedere solo alle risorse di cui è proprietario',
          values: ['self']
        },
        companyId: {
          name: 'Azienda',
          description: 'Può accedere solo alle risorse della stessa azienda',
          values: ['same', 'any']
        },
        departmentId: {
          name: 'Dipartimento',
          description: 'Può accedere solo alle risorse dello stesso dipartimento',
          values: ['same', 'any']
        },
        status: {
          name: 'Stato',
          description: 'Può accedere solo alle risorse con uno stato specifico',
          values: ['active', 'inactive', 'pending', 'completed']
        }
      };

      res.json({
        success: true,
        data: conditions
      });
    } catch (error) {
      console.error('[ADVANCED_PERMISSIONS] Error getting conditions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get conditions'
      });
    }
  }
);

/**
 * @route POST /api/advanced-permissions/validate
 * @desc Valida una configurazione di permessi avanzati
 * @access Admin
 */
router.post('/validate',
  authenticate(),
  enhancedRoleService.requirePermission('roles.manage'),
  async (req, res) => {
    try {
      const { resource, action, scope, allowedFields, conditions } = req.body;
      const errors = [];

      // Validazione risorsa
      const validResources = ['person', 'company', 'course', 'training'];
      if (!resource || !validResources.includes(resource)) {
        errors.push('Resource must be one of: ' + validResources.join(', '));
      }

      // Validazione azione
      const validActions = ['read', 'create', 'update', 'delete', 'assign', 'conduct'];
      if (!action || !validActions.includes(action)) {
        errors.push('Action must be one of: ' + validActions.join(', '));
      }

      // Validazione scope
      const validScopes = ['global', 'tenant', 'company', 'department', 'self'];
      if (!scope || !validScopes.includes(scope)) {
        errors.push('Scope must be one of: ' + validScopes.join(', '));
      }

      // Validazione campi consentiti
      if (allowedFields && !Array.isArray(allowedFields)) {
        errors.push('AllowedFields must be an array');
      }

      // Validazione condizioni
      if (conditions && typeof conditions !== 'object') {
        errors.push('Conditions must be an object');
      }

      const isValid = errors.length === 0;

      res.json({
        success: true,
        data: {
          isValid,
          errors,
          configuration: {
            resource,
            action,
            scope,
            allowedFields,
            conditions
          }
        }
      });
    } catch (error) {
      console.error('[ADVANCED_PERMISSIONS] Error validating configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate configuration'
      });
    }
  }
);

/**
 * @route GET /api/advanced-permissions/health
 * @desc Health check endpoint senza middleware
 * @access Public
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

/**
 * @route GET /api/advanced-permissions/test
 * @desc Test endpoint per verificare il middleware
 * @access Admin
 */
router.get('/test',
  authenticate(),
  enhancedRoleService.requirePermission('roles.read'),
  async (req, res) => {
    try {
      console.log('[ADVANCED_PERMISSIONS] Test endpoint called successfully');
      res.json({
        success: true,
        message: 'Test endpoint working',
        user: {
          id: req.user?.id,
          email: req.user?.email,
          globalRole: req.user?.globalRole
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[ADVANCED_PERMISSIONS] Test endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Test endpoint failed'
      });
    }
  }
);

/**
 * @route GET /api/advanced-permissions/roles/:roleId
 * @desc Ottiene i permessi avanzati per un ruolo specifico
 * @access Admin
 */
router.get('/roles/:roleId',
  authenticate(),
  enhancedRoleService.requirePermission('roles.read'),
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const tenantId = req.tenant?.id;

      console.log(`[ADVANCED_PERMISSIONS] Getting role permissions for roleId: ${roleId}, tenantId: ${tenantId}`);

      // Verifica se il roleId è un RoleType valido
      const validRoleTypes = [
        'EMPLOYEE', 'MANAGER', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'TRAINER', 
        'SENIOR_TRAINER', 'TRAINER_COORDINATOR', 'EXTERNAL_TRAINER', 
        'SUPER_ADMIN', 'ADMIN', 'COMPANY_ADMIN', 'TENANT_ADMIN', 
        'VIEWER', 'OPERATOR', 'COORDINATOR', 'SUPERVISOR', 'GUEST', 
        'CONSULTANT', 'AUDITOR'
      ];

      if (!validRoleTypes.includes(roleId)) {
        console.log(`[ADVANCED_PERMISSIONS] Invalid roleType: ${roleId}`);
        return res.status(404).json({
          success: false,
          error: 'Invalid role type'
        });
      }

      // Ottieni i permessi del ruolo dal modello PersonRole
      const rolePermissions = await prisma.rolePermission.findMany({
        where: {
          personRole: {
            roleType: roleId,
            tenantId,
            isActive: true
          }
        },
        select: {
          id: true,
          permission: true,
          isGranted: true,
          grantedAt: true,
          grantedBy: true,
          personRole: {
            select: {
              id: true,
              roleType: true
            }
          }
        }
      });

      console.log(`[ADVANCED_PERMISSIONS] Found ${rolePermissions.length} permissions for role ${roleId}`);

      // Ottieni anche i permessi avanzati
      const advancedPermissions = await prisma.advancedPermission.findMany({
        where: {
          personRole: {
            roleType: roleId,
            tenantId,
            isActive: true
          }
        },
        select: {
          id: true,
          resource: true,
          action: true,
          scope: true,
          siteAccess: true,
          allowedFields: true,
          conditions: true,
          personRole: {
            select: {
              id: true,
              roleType: true
            }
          }
        }
      });

      console.log(`[ADVANCED_PERMISSIONS] Found ${advancedPermissions.length} advanced permissions for role ${roleId}`);

      // Raggruppa i permessi per categoria (ottimizzato)
      const groupedPermissions = {};
      
      // Aggiungi permessi base
      rolePermissions.forEach(rp => {
        const permissionName = rp.permission;
        const category = permissionName.includes('.') ? permissionName.split('.')[0] : 'general';
        
        if (!groupedPermissions[category]) {
          groupedPermissions[category] = [];
        }
        
        groupedPermissions[category].push({
          id: rp.id,
          name: permissionName,
          type: 'basic',
          action: permissionName.includes('.') ? permissionName.split('.')[1] : permissionName,
          description: `Permission: ${permissionName}`,
          isGranted: rp.isGranted,
          assignedAt: rp.grantedAt,
          assignedBy: rp.grantedBy,
          isActive: rp.isGranted
        });
      });

      // Aggiungi permessi avanzati
      advancedPermissions.forEach(ap => {
        const category = ap.resource;
        
        if (!groupedPermissions[category]) {
          groupedPermissions[category] = [];
        }
        
        groupedPermissions[category].push({
          id: ap.id,
          name: `${ap.resource}.${ap.action}`,
          type: 'advanced',
          resource: ap.resource,
          action: ap.action,
          scope: ap.scope,
          siteAccess: ap.siteAccess,
          allowedFields: ap.allowedFields,
          conditions: ap.conditions,
          description: `Advanced permission: ${ap.resource}.${ap.action}`,
          isGranted: true,
          isActive: true
        });
      });

      const response = {
        success: true,
        role: {
          id: roleId,
          roleType: roleId,
          name: roleId.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          description: `System role: ${roleId}`,
          isActive: true
        },
        permissions: groupedPermissions,
        stats: {
          totalPermissions: rolePermissions.length + advancedPermissions.length,
          basicPermissions: rolePermissions.filter(rp => rp.isGranted).length,
          advancedPermissions: advancedPermissions.length,
          resourcesCount: Object.keys(groupedPermissions).length
        }
      };

      console.log(`[ADVANCED_PERMISSIONS] Returning response for role ${roleId}:`, {
        roleId: roleId,
        roleType: roleId,
        totalPermissions: response.stats.totalPermissions,
        resourcesCount: response.stats.resourcesCount
      });

      res.json(response);
    } catch (error) {
      console.error('[ADVANCED_PERMISSIONS] Error getting role permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get role permissions'
      });
    }
  }
);

/**
 * @route GET /api/advanced-permissions/preview
 * @desc Anteprima dell'effetto di una configurazione di permessi
 * @access Admin
 */
router.get('/preview',
  authenticate(),
  enhancedRoleService.requirePermission('roles.read'),
  async (req, res) => {
    try {
      const { resource, action, scope, allowedFields, conditions, roleType } = req.query;
      const tenantId = req.tenant.id;

      // Simula l'applicazione dei permessi
      let sampleData = {};
      let filteredData = {};

      // Genera dati di esempio in base alla risorsa
      switch (resource) {
        case 'person':
          sampleData = {
            id: 1,
            firstName: 'Mario',
            lastName: 'Rossi',
            email: 'mario.rossi@example.com',
            username: 'mario.rossi',
            phone: '+39 123 456 7890',
            address: 'Via Roma 123',
            city: 'Milano',
            province: 'MI',
            cap: '20100',
            fiscalCode: 'RSSMRA80A01F205X',
            birthDate: '1980-01-01',
            birthPlace: 'Milano',
            nationality: 'Italiana',
            isActive: true,
            lastLogin: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          break;
        case 'company':
          sampleData = {
            id: 1,
            ragioneSociale: 'Esempio S.r.l.',
            partitaIva: '12345678901',
            codiceFiscale: '12345678901',
            indirizzo: 'Via Milano 456',
            citta: 'Roma',
            provincia: 'RM',
            cap: '00100',
            telefono: '+39 06 123 4567',
            email: 'info@esempio.it',
            pec: 'pec@esempio.it',
            sito_web: 'https://www.esempio.it',
            settore: 'Tecnologia',
            dipendenti_count: 50,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          break;
        default:
          sampleData = { id: 1, name: 'Esempio', description: 'Dati di esempio' };
      }

      // Applica il filtro dei campi se specificato
      if (allowedFields && Array.isArray(allowedFields)) {
        const allowedFieldsSet = new Set(allowedFields);
        filteredData = {};
        allowedFieldsSet.forEach(field => {
          if (sampleData.hasOwnProperty(field)) {
            filteredData[field] = sampleData[field];
          }
        });
        // Aggiungi sempre l'ID
        if (sampleData.id && !filteredData.id) {
          filteredData.id = sampleData.id;
        }
      } else {
        filteredData = sampleData;
      }

      res.json({
        success: true,
        data: {
          configuration: {
            resource,
            action,
            scope,
            allowedFields,
            conditions,
            roleType
          },
          preview: {
            originalData: sampleData,
            filteredData,
            fieldsRemoved: Object.keys(sampleData).filter(key => !filteredData.hasOwnProperty(key)),
            fieldsKept: Object.keys(filteredData)
          }
        }
      });
    } catch (error) {
      console.error('[ADVANCED_PERMISSIONS] Error generating preview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate preview'
      });
    }
  }
);

export default router;