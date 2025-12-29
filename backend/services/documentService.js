/**
 * DocumentService
 * 
 * Servizio per la generazione di documenti PDF da template.
 * Integra:
 * - MarkerResolver: risoluzione marker nei template
 * - PDFService: conversione HTML → PDF
 * - StorageService: salvataggio file
 * - QueueService: generazione batch asincrona
 * 
 * Supporta:
 * - Generazione singola
 * - Generazione batch (es: attestati per tutti i partecipanti)
 * - Numerazione progressiva automatica
 * - Tracking completo (GeneratedDocument)
 * - Metadata e audit trail
 * 
 * @module services/documentService
 */

import optimizedPrisma from '../config/database.js';
import { getMarkerResolver } from './markerResolver.js';
import pdfService from './pdfService.js';
import storageService from './storageService.js';
import { documentQueue } from './queueService.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

const prisma = optimizedPrisma.getClient();

/**
 * Errore di generazione documento
 */
class DocumentGenerationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'DocumentGenerationError';
    this.details = details;
  }
}

/**
 * DocumentService
 * 
 * Servizio principale per la generazione di documenti.
 */
class DocumentService {
  constructor() {
    this.markerResolver = getMarkerResolver();
  }

  /**
   * Genera un singolo documento
   * 
   * @param {Object} params - Parametri di generazione
   * @param {number} params.templateId - ID del template
   * @param {string} params.entityType - Tipo entità (COURSE_SCHEDULE, PERSON, etc.)
   * @param {number} params.entityId - ID dell'entità principale
   * @param {number} params.personId - ID persona (per attestati)
   * @param {number} params.userId - ID utente che genera
   * @param {number} params.tenantId - ID tenant
   * @param {Object} params.options - Opzioni aggiuntive
   * @returns {Promise<Object>} - Documento generato con metadata
   */
  async generateDocument({
    templateId,
    entityType,
    entityId,
    personId = null,
    userId,
    tenantId,
    options = {}
  }) {
    try {
      logger.info('Inizio generazione documento', {
        templateId,
        entityType,
        entityId,
        personId,
        tenantId,
        hasCustomData: !!options.customData,
        hasTrainerOverride: !!options.customData?.trainerOverride,
        hasSessionOverride: !!options.customData?.sessionOverride,
        trainerTotalHours: options.customData?.trainerOverride?.totalHours,
        trainerTotalCompensation: options.customData?.trainerOverride?.totalCompensation,
        sessionParticipantCompanies: options.customData?.sessionOverride?.participantCompanies
      });

      // 1. Carica template
      const template = await this._loadTemplate(templateId, tenantId);

      // 1b. Usa custom template se fornito (per modifiche dinamiche)
      let templateContent = options.customTemplate || template.content;

      // 1c. Se il template è un slideEditor JSON, convertilo in HTML
      const slideEditorResult = this._convertSlideEditorToHtml(templateContent);
      templateContent = slideEditorResult.html;

      // Se è uno slideEditor, aggiorna l'orientation nel layout del template
      if (slideEditorResult.isSlideEditor && slideEditorResult.orientation) {
        template.layout = template.layout || {};
        template.layout.orientation = slideEditorResult.orientation;
        // Per slideEditor, usa margini zero
        template.layout.margins = { top: '0', right: '0', bottom: '0', left: '0' };
      }

      // 2. Carica dati entità
      const entityData = await this._loadEntityData(
        entityType,
        entityId,
        personId,
        tenantId,
        options  // Passa options per permettere override dei participants
      );

      // 3. Build context per marker resolution
      const context = this._buildContext(entityData, template, options);

      // 4. Valida marker nel template
      logger.debug('Template content length:', templateContent?.length);
      logger.debug('Options:', JSON.stringify(options));

      // Log context BEFORE marker resolution (critical for debugging)
      // Using WARN level to ensure visibility in production
      logger.warn('🔍 Context BEFORE marker resolution', {
        component: 'documentService',
        action: 'generateDocument-context',
        templateType: template.type,
        contextKeys: Object.keys(context),
        sessionExists: !!context.session,
        sessionKeys: context.session ? Object.keys(context.session) : [],
        trainerExists: !!context.trainer,
        trainerKeys: context.trainer ? Object.keys(context.trainer) : [],
        // Critical values
        'session.participantCompanies': context.session?.participantCompanies,
        'trainer.totalHours': context.trainer?.totalHours,
        'trainer.totalCompensation': context.trainer?.totalCompensation,
        // Lettera incarico
        'letteraIncarico': context.letteraIncarico,
        'letteraIncarico.number': context.letteraIncarico?.number
      });

      const validation = this.markerResolver.validateMarkers(templateContent);
      logger.debug('Validation result:', JSON.stringify(validation));

      if (!validation.isValid) {
        logger.warn('Template validation failed!', {
          isValid: validation.isValid,
          errorCount: validation.errors?.length || 0,
          warningCount: validation.warnings?.length || 0,
          strict: options.strict,
          templateContentExists: !!templateContent
        });

        if (options.strict !== false) {
          throw new DocumentGenerationError(
            'Template contiene marker non validi',
            { validation }
          );
        } else {
          logger.info('Bypassing marker validation (strict=false)');
        }
      }

      // 5. Risolvi marker nel content
      let html = await this.markerResolver.resolve(
        templateContent,
        context,
        { strict: options.strict !== false }
      );

      // 6. Applica header/footer se presenti (con marker resolution)
      // Per slideEditor e htmlEditor, l'HTML è già completo, non serve _buildFullHtml
      let fullHtml;
      if (slideEditorResult.isSlideEditor) {
        // L'HTML slideEditor è già un documento completo
        // Ma dobbiamo ancora risolvere i marker nel contenuto
        fullHtml = html;
        logger.debug('Using slideEditor HTML directly (skipping _buildFullHtml)');
      } else if (slideEditorResult.isHtmlEditor) {
        // L'HTML editor ha già DOCTYPE, head, body completi - NON re-wrappare!
        // Questo evita DOCTYPE duplicati e conflitti CSS
        fullHtml = html;
        logger.debug('Using htmlEditor HTML directly (skipping _buildFullHtml - template already complete)');
      } else {
        fullHtml = await this._buildFullHtml(html, template, context);
      }

      // 6.5 Processa HTML per PDF (immagini, page break, ecc.)
      fullHtml = await this._processHtmlForPdf(fullHtml, options);

      // 7. Genera PDF (passa context per risolvere marker in header/footer)
      // Passa isSlideEditor per gestire margini zero nei template SlideEditor
      const pdfOptions = await this._buildPdfOptions(template, context, {
        ...options,
        isSlideEditor: slideEditorResult.isSlideEditor,
        orientation: slideEditorResult.orientation
      });
      logger.debug('PDF generation options', {
        templateId,
        templateLayout: template.layout,
        pdfOptions,
        isSlideEditor: slideEditorResult.isSlideEditor,
        htmlLength: fullHtml?.length
      });

      // DEBUG: Log HTML being sent to PDF service
      logger.info('HTML being sent to PDF service', {
        htmlLength: fullHtml?.length,
        htmlPreview: fullHtml?.substring(0, 500),
        htmlEnd: fullHtml?.substring(fullHtml?.length - 200)
      });

      const pdfBuffer = await pdfService.generatePDF(fullHtml, pdfOptions);

      // 8. Ottieni numero progressivo
      const progressiveNumber = await this._getProgressiveNumber(
        template.type,
        tenantId
      );

      // 9. Salva file
      const filename = this._generateFilename(
        template.type,
        entityId,
        personId,
        progressiveNumber,
        context  // Passa context per nome file descrittivo
      );

      const { filepath, fileUrl } = await storageService.saveFile(
        pdfBuffer,
        filename,
        'documents'
      );

      // 10. Calcola hash file
      const fileHash = crypto
        .createHash('sha256')
        .update(pdfBuffer)
        .digest('hex');

      // 11. Salva metadata documento
      const documentData = {
        template: {
          connect: { id: templateId }
        },
        templateVersion: template.version,
        type: template.type,
        entityType,
        entityId,
        filename,
        filepath,
        fileUrl,
        fileSize: pdfBuffer.length,
        fileHash,
        mimeType: 'application/pdf',
        markers: context,
        metadata: {
          progressiveNumber,
          generatedAt: new Date().toISOString(),
          ...options.metadata
        },
        status: 'GENERATED',
        tenant: {
          connect: { id: tenantId }
        }
      };

      // Add generatedBy only if userId is provided
      if (userId) {
        documentData.generator = {
          connect: { id: userId }
        };
      }

      const document = await prisma.generatedDocument.create({
        data: documentData
      });

      // 12. Aggiorna entità specifica se necessario
      await this._updateEntityDocument(
        entityType,
        entityId,
        personId,
        template,
        document,
        context
      );

      logger.info('Documento generato con successo', {
        documentId: document.id,
        filename,
        fileSize: pdfBuffer.length
      });

      return {
        // Campi usati dalle routes
        id: document.id,
        fileName: filename,
        fileUrl,
        fileSize: pdfBuffer.length,

        // Oggetto completo per compatibilità
        document,
        file: {
          buffer: pdfBuffer,
          filename,
          filepath,
          url: fileUrl,
          size: pdfBuffer.length,
          hash: fileHash
        }
      };

    } catch (error) {
      logger.error('Errore generazione documento', {
        error: error.message,
        templateId,
        entityType,
        entityId
      });
      throw error;
    }
  }

  /**
   * Genera documenti in batch (es: attestati per tutti i partecipanti)
   * 
   * @param {Object} params - Parametri batch
   * @param {number} params.templateId - ID template
   * @param {string} params.entityType - Tipo entità
   * @param {number} params.entityId - ID entità principale (es: scheduleId)
   * @param {number[]} params.personIds - Array di person IDs
   * @param {number} params.userId - ID utente
   * @param {number} params.tenantId - ID tenant
   * @param {Object} params.options - Opzioni
   * @returns {Promise<Object>} - Batch info e job IDs
   */
  async generateBatch({
    templateId,
    entityType,
    entityId,
    personIds,
    userId,
    tenantId,
    options = {}
  }) {
    try {
      logger.info('Inizio generazione batch', {
        templateId,
        entityType,
        entityId,
        count: personIds.length,
        tenantId
      });

      // Genera batch ID univoco
      const batchId = crypto.randomUUID();
      const batchSize = personIds.length;

      // Crea jobs in coda
      const jobs = [];
      for (let i = 0; i < personIds.length; i++) {
        const personId = personIds[i];

        const job = await documentQueue.add('generate-document', {
          templateId,
          entityType,
          entityId,
          personId,
          userId,
          tenantId,
          batchId,
          batchIndex: i,
          batchSize,
          options
        }, {
          priority: options.priority || 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: false,
          removeOnFail: false
        });

        jobs.push({
          jobId: job.id,
          personId,
          status: 'queued'
        });
      }

      logger.info('Batch jobs creati in coda', {
        batchId,
        jobCount: jobs.length
      });

      return {
        batchId,
        batchSize,
        jobs,
        status: 'queued',
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Errore generazione batch', {
        error: error.message,
        templateId,
        personIds
      });
      throw error;
    }
  }

  /**
   * Ottiene lo stato di un batch
   * 
   * @param {string} batchId - ID del batch
   * @returns {Promise<Object>} - Stato batch
   */
  async getBatchStatus(batchId) {
    try {
      const documents = await prisma.generatedDocument.findMany({
        where: { batchId },
        select: {
          id: true,
          filename: true,
          status: true,
          fileSize: true,
          createdAt: true
        },
        orderBy: { batchIndex: 'asc' }
      });

      const total = documents.length;
      const completed = documents.filter(d => d.status === 'GENERATED').length;
      const failed = documents.filter(d => d.status === 'DRAFT').length; // DRAFT = fallito

      return {
        batchId,
        total,
        completed,
        failed,
        inProgress: total - completed - failed,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        documents
      };

    } catch (error) {
      logger.error('Errore recupero stato batch', { error: error.message, batchId });
      throw error;
    }
  }

  /**
   * Carica template con validazioni
   * @private
   */
  async _loadTemplate(templateId, tenantId) {
    const template = await prisma.templateLink.findFirst({
      where: {
        id: templateId,
        tenantId,
        deletedAt: null,
        isActive: true
      }
    });

    if (!template) {
      throw new DocumentGenerationError('Template non trovato o non attivo');
    }

    return template;
  }

  /**
   * Carica dati entità dal database
   * @private
   */
  async _loadEntityData(entityType, entityId, personId, tenantId, options = {}) {
    const data = {};

    switch (entityType) {
      case 'COURSE_SCHEDULE':
        // Carica programmazione corso con relazioni
        const schedule = await prisma.courseSchedule.findFirst({
          where: { id: entityId, tenantId, deletedAt: null },
          include: {
            course: true,
            trainer: true
            // enrollments and sessions can be loaded separately if needed
          }
        });

        if (!schedule) {
          throw new DocumentGenerationError('Programmazione non trovata');
        }

        data.schedule = {
          id: schedule.id,
          code: schedule.code || '',
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          location: schedule.location || 'N/A',
          address: '',  // Will be populated from options.markers if provided
          maxParticipants: schedule.maxParticipants || 0,
          sessionsCount: 0,  // Will be calculated separately if needed
          totalHours: schedule.course?.duration || 0,
          status: schedule.status,
          deliveryMode: schedule.deliveryMode || ''
        };

        data.course = {
          id: schedule.course.id,
          title: schedule.course.title,
          code: schedule.course.code,
          duration: schedule.course.duration,
          validityYears: schedule.course.validityYears,
          category: schedule.course.category || '',
          regulation: schedule.course.regulation || '',
          description: schedule.course.description || '',
          objectives: schedule.course.objectives || '',
          topics: schedule.course.topics || '',
          courseType: schedule.course.courseType || '',
          riskLevel: schedule.course.riskLevel || ''
        };

        // Trainer principale dal schedule
        if (schedule.trainer) {
          const trainer = schedule.trainer;
          data.trainer = {
            id: trainer.id,
            fullName: `${trainer.firstName} ${trainer.lastName}`,
            firstName: trainer.firstName,
            lastName: trainer.lastName,
            email: trainer.email,
            phone: trainer.phone || '',
            qualifications: trainer.qualifications || '',
            certifications: trainer.certifications || '',
            specialties: trainer.specialties || ''
          };
        }

        // Persona specifica se richiesta
        if (personId && schedule.enrollments?.length > 0) {
          const personData = schedule.enrollments[0].person;
          data.person = {
            id: personData.id,
            fullName: `${personData.firstName} ${personData.lastName}`,
            firstName: personData.firstName,
            lastName: personData.lastName,
            email: personData.email,
            cf: personData.cf || '',
            phone: personData.phone || '',
            birthDate: personData.birthDate,
            birthPlace: personData.birthPlace || '',
            address: {
              street: personData.address || '',
              city: personData.city || '',
              province: personData.province || '',
              postalCode: personData.postalCode || '',
              country: personData.country || 'Italia',
              full: personData.address ?
                `${personData.address}, ${personData.postalCode} ${personData.city} (${personData.province})` :
                ''
            }
          };
        }

        // Azienda (se corso aziendale)
        if (schedule.companyId) {
          const company = await prisma.company.findUnique({
            where: { id: schedule.companyId }
          });
          if (company) {
            data.company = {
              id: company.id,
              name: company.ragioneSociale || company.name || '',
              vatNumber: company.piva || company.vatNumber || '',
              fiscalCode: company.codiceFiscale || company.fiscalCode || '',
              address: {
                street: company.sedeAzienda || company.address || '',
                city: company.citta || company.city || '',
                province: company.provincia || company.province || '',
                postalCode: company.cap || company.postalCode || '',
                full: (company.sedeAzienda || company.address) ?
                  `${company.sedeAzienda || company.address}, ${company.cap || company.postalCode} ${company.citta || company.city} (${company.provincia || company.province})` :
                  ''
              },
              legalRepresentative: company.personaRiferimento || company.legalRepresentative || '',
              email: company.mail || company.email || '',
              phone: company.telefono || company.phone || ''
            };
          }
        }
        break;

      case 'PERSON':
        // Carica persona singola
        const person = await prisma.person.findFirst({
          where: { id: entityId, tenantId, deletedAt: null }
        });

        if (!person) {
          throw new DocumentGenerationError('Persona non trovata');
        }

        data.person = {
          id: person.id,
          fullName: `${person.firstName} ${person.lastName}`,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          cf: person.cf || '',
          phone: person.phone || '',
          birthDate: person.birthDate,
          birthPlace: person.birthPlace || '',
          address: {
            street: person.address || '',
            city: person.city || '',
            province: person.province || '',
            postalCode: person.postalCode || '',
            country: person.country || 'Italia',
            full: person.address ?
              `${person.address}, ${person.postalCode} ${person.city} (${person.province})` :
              ''
          }
        };
        break;

      case 'PREVENTIVO':
        // Per preventivi, i dati vengono passati tramite customData
        // Non carichiamo nulla qui, tutto gestito da preventivi-service
        data.preventivo = {}; // Placeholder per evitare errori
        break;

      case 'session':
        // Carica sessione con schedule, corso, trainer e partecipanti
        const sessionData = await prisma.courseSession.findFirst({
          where: { id: entityId, tenantId, deletedAt: null },
          include: {
            schedule: {
              include: {
                course: true,
                companies: {
                  include: {
                    company: {
                      include: {
                        persons: {
                          where: { deletedAt: null }
                        }
                      }
                    }
                  }
                }
              }
            },
            trainer: true,
            coTrainer: true
          }
        });

        if (!sessionData) {
          throw new DocumentGenerationError('Sessione non trovata');
        }

        // Dati sessione corrente (usa start/end, non startTime/endTime)
        data.session = {
          id: sessionData.id,
          date: sessionData.date,
          startTime: sessionData.start,
          endTime: sessionData.end,
          duration: sessionData.duration,
          topic: sessionData.topic || '',
          location: sessionData.location || sessionData.schedule?.location || '',
          // Aggiungi trainer alla sessione
          trainer: sessionData.trainer ? {
            id: sessionData.trainer.id,
            fullName: `${sessionData.trainer.firstName} ${sessionData.trainer.lastName}`,
            firstName: sessionData.trainer.firstName,
            lastName: sessionData.trainer.lastName
          } : null
        };

        // Carica tutte le sessioni dello stesso schedule per tabelle presenze
        const allSessions = await prisma.courseSession.findMany({
          where: {
            scheduleId: sessionData.scheduleId,
            tenantId,
            deletedAt: null
          },
          include: {
            trainer: true,
            coTrainer: true
          },
          orderBy: { date: 'asc' }
        });

        data.sessions = allSessions.map(s => ({
          id: s.id,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          duration: s.duration,
          topic: s.topic || '',
          trainerName: s.trainer ? `${s.trainer.firstName} ${s.trainer.lastName}` : '',
          trainer: s.trainer ? {
            id: s.trainer.id,
            fullName: `${s.trainer.firstName} ${s.trainer.lastName}`,
            firstName: s.trainer.firstName,
            lastName: s.trainer.lastName
          } : null
        }));

        // CORREZIONE: Raccogli SOLO i partecipanti iscritti tramite CourseEnrollment
        // NON tutti i dipendenti delle aziende
        const enrollments = await prisma.courseEnrollment.findMany({
          where: {
            scheduleId: sessionData.scheduleId,
            tenantId,
            deletedAt: null
          },
          include: {
            person: {
              include: {
                company: true
              }
            }
          }
        });

        const sessionParticipants = enrollments.map(enrollment => ({
          id: enrollment.person?.id,
          lastName: enrollment.person?.lastName || '',
          firstName: enrollment.person?.firstName || '',
          cf: enrollment.person?.cf || '',
          companyName: enrollment.person?.company?.ragioneSociale || enrollment.person?.company?.name || ''
        })).filter(p => p.id); // Filtra eventuali partecipanti senza id

        // IMPORTANTE: Se options.participants è fornito, usa quelli invece dei sessionParticipants
        // Questo permette di avere solo i partecipanti specifici della sessione selezionata
        // invece di tutti gli iscritti allo schedule
        if (options.participants && options.participants.length > 0) {
          logger.info('Usando participants da options invece di enrollments', {
            optionsCount: options.participants.length,
            enrollmentsCount: sessionParticipants.length
          });
          data.participants = options.participants.map(p => ({
            id: p.id,
            lastName: p.lastName || '',
            firstName: p.firstName || '',
            cf: p.cf || '',
            companyName: p.companyName || ''
          }));
        } else {
          data.participants = sessionParticipants;
        }

        // Aggiungi participantCompanies alla sessione (elenco aziende DAI PARTECIPANTI EFFETTIVI)
        // Prende i nomi azienda dai partecipanti della sessione, non da schedule.companies
        const participantCompanyNames = [...new Set(
          data.participants
            .map(p => p.companyName)
            .filter(Boolean)
        )];
        data.session.participantCompanies = participantCompanyNames.join(', ') || 'N/A';
        data.session.participantsCount = data.participants.length;

        // Aggiungi partecipanti anche a ogni sessione
        data.sessions = data.sessions.map(s => ({
          ...s,
          participants: data.participants
        }));

        // Dati schedule
        if (sessionData.schedule) {
          data.schedule = {
            id: sessionData.schedule.id,
            code: sessionData.schedule.code || '',
            startDate: sessionData.schedule.startDate,
            endDate: sessionData.schedule.endDate,
            location: sessionData.schedule.location || 'N/A',
            address: sessionData.schedule.address || '',
            maxParticipants: sessionData.schedule.maxParticipants || 0,
            sessionsCount: allSessions.length,
            totalHours: sessionData.schedule.course?.duration || 0,
            status: sessionData.schedule.status,
            deliveryMode: sessionData.schedule.deliveryMode || ''
          };
        }

        // Dati corso
        if (sessionData.schedule?.course) {
          const course = sessionData.schedule.course;
          data.course = {
            id: course.id,
            title: course.title,
            code: course.code,
            duration: course.duration,
            validityYears: course.validityYears,
            category: course.category || '',
            regulation: course.regulation || '',
            description: course.description || '',
            objectives: course.objectives || '',
            topics: course.topics || '',
            courseType: course.courseType || '',
            riskLevel: course.riskLevel || ''
          };
        }

        // Trainer della sessione
        if (sessionData.trainer) {
          const sessionTrainer = sessionData.trainer;
          data.trainer = {
            id: sessionTrainer.id,
            fullName: `${sessionTrainer.firstName} ${sessionTrainer.lastName}`,
            firstName: sessionTrainer.firstName,
            lastName: sessionTrainer.lastName,
            email: sessionTrainer.email || '',
            phone: sessionTrainer.phone || '',
            qualifications: sessionTrainer.qualifications || '',
            certifications: sessionTrainer.certifications || '',
            specialties: sessionTrainer.specialties || ''
          };
        }

        // Prima azienda come company principale (se presente)
        const firstCompany = sessionData.schedule?.companies?.[0]?.company;
        if (firstCompany) {
          data.company = {
            id: firstCompany.id,
            name: firstCompany.ragioneSociale || firstCompany.name || '',
            vatNumber: firstCompany.piva || firstCompany.vatNumber || '',
            fiscalCode: firstCompany.codiceFiscale || firstCompany.fiscalCode || '',
            address: {
              street: firstCompany.sedeAzienda || firstCompany.address || '',
              city: firstCompany.citta || firstCompany.city || '',
              province: firstCompany.provincia || firstCompany.province || '',
              postalCode: firstCompany.cap || firstCompany.postalCode || '',
              full: (firstCompany.sedeAzienda || firstCompany.address) ?
                `${firstCompany.sedeAzienda || firstCompany.address}, ${firstCompany.cap || firstCompany.postalCode} ${firstCompany.citta || firstCompany.city} (${firstCompany.provincia || firstCompany.province})` :
                ''
            },
            legalRepresentative: firstCompany.personaRiferimento || firstCompany.legalRepresentative || '',
            email: firstCompany.mail || firstCompany.email || '',
            phone: firstCompany.telefono || firstCompany.phone || ''
          };
        }
        break;

      default:
        throw new DocumentGenerationError(`Entity type non supportato: ${entityType}`);
    }

    return data;
  }

  /**
   * Converte un template slideEditor JSON in HTML per la generazione PDF
   * @private
   * @param {string} content - Contenuto del template (può essere HTML o JSON slideEditor)
   * @returns {Object} - { html: string, isSlideEditor: boolean, orientation?: string }
   */
  _convertSlideEditorToHtml(content) {
    if (!content) {
      logger.debug('_convertSlideEditorToHtml: empty content');
      return { html: content, isSlideEditor: false, isHtmlEditor: false };
    }

    try {
      // Prova a parsare come JSON
      const trimmed = content.trim();
      logger.debug('_convertSlideEditorToHtml: content starts with', {
        firstChars: trimmed.substring(0, 50),
        length: trimmed.length
      });

      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        // Non è JSON, ritorna come HTML
        logger.debug('_convertSlideEditorToHtml: not JSON, treating as HTML');
        return { html: content, isSlideEditor: false, isHtmlEditor: false };
      }

      const parsed = JSON.parse(trimmed);

      // Check if it's an HTML editor wrapper (raw HTML content)
      if (parsed.__htmlEditor && parsed.rawHtml) {
        logger.info('Converting htmlEditor template to HTML', {
          rawHtmlLength: parsed.rawHtml.length
        });
        return {
          html: parsed.rawHtml,
          isSlideEditor: false,
          isHtmlEditor: true
        };
      }

      // Verifica se è un wrapper slideEditor
      if (!parsed.__slideEditor || !Array.isArray(parsed.elements)) {
        // Non è un slideEditor, potrebbe essere altro JSON - ritorna originale
        logger.debug('_convertSlideEditorToHtml: JSON but not slideEditor format');
        return { html: content, isSlideEditor: false, isHtmlEditor: false };
      }

      logger.info('Converting slideEditor template to HTML', {
        elementsCount: parsed.elements.length,
        orientation: parsed.orientation || 'portrait',
        elementTypes: parsed.elements.map(el => el.type)
      });

      const elements = parsed.elements;
      const orientation = parsed.orientation || 'portrait';

      // Dimensioni pagina - USA LE STESSE DIMENSIONI DEL CANVAS FRONTEND
      // Il canvas frontend usa 842x595px per landscape, 595x842px per portrait
      const canvasWidth = orientation === 'landscape' ? 842 : 595;
      const canvasHeight = orientation === 'landscape' ? 595 : 842;

      // Per il PDF, convertiamo in mm mantenendo le proporzioni
      // 842px / 595px = 1.415 che è esattamente 297mm / 210mm (A4 ratio)
      const pageWidthMm = orientation === 'landscape' ? 297 : 210;
      const pageHeightMm = orientation === 'landscape' ? 210 : 297;

      // Calcola scala: A4 a 96 DPI è ~1123x794px, il canvas è 842x595px
      // Scala = targetSize / canvasSize = 1123/842 ≈ 1.334
      // Ma se usiamo mm direttamente, 297mm a 96 DPI = 297 * 96 / 25.4 = 1122.5px
      const pdfWidthPx = pageWidthMm * 96 / 25.4;  // mm to px at 96 DPI
      const scale = pdfWidthPx / canvasWidth;

      // Genera HTML con posizionamento assoluto
      let elementsHtml = elements
        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
        .map(el => this._renderSlideElement(el))
        .join('\n');

      // Wrapper HTML con stili - IMPORTANTE: usa le stesse dimensioni del canvas
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: ${pageWidthMm}mm ${pageHeightMm}mm;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: ${pageWidthMm}mm;
      height: ${pageHeightMm}mm;
      margin: 0;
      padding: 0;
    }
    body {
      position: relative;
      font-family: Arial, sans-serif;
      background: white;
    }
    .slide-container {
      width: ${canvasWidth}px;
      height: ${canvasHeight}px;
      position: relative;
      overflow: visible;
      /* Scala il container dal canvas size al page size */
      transform-origin: top left;
      transform: scale(${scale.toFixed(4)});
    }
    .slide-element {
      position: absolute;
      box-sizing: border-box;
    }
    .slide-element.text {
      overflow: hidden;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    .slide-element.image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .slide-element.shape {
      overflow: hidden;
    }
    .slide-element.line {
      overflow: visible;
    }
  </style>
</head>
<body>
  <div class="slide-container">
    ${elementsHtml}
  </div>
</body>
</html>`;

      logger.info('SlideEditor HTML generated', {
        htmlLength: html.length,
        elementsHtmlLength: elementsHtml.length,
        orientation,
        preview: html.substring(0, 500)
      });

      return { html, isSlideEditor: true, orientation };

    } catch (error) {
      // Errore di parsing - ritorna contenuto originale (probabilmente è già HTML)
      logger.debug('Content is not valid slideEditor JSON, treating as HTML', {
        error: error.message
      });
      return { html: content, isSlideEditor: false };
    }
  }

  /**
   * Renderizza un singolo elemento slideEditor come HTML
   * @private
   */
  _renderSlideElement(element) {
    const { id, type, x, y, width, height, rotation, content, src, style = {} } = element;

    // Stili base - IMPORTANTE: position: absolute per posizionamento corretto
    const baseStyles = [
      'position: absolute',
      `left: ${x}px`,
      `top: ${y}px`,
      `width: ${width}px`,
      `height: ${height}px`,
    ];

    if (rotation) {
      baseStyles.push(`transform: rotate(${rotation}deg)`);
    }

    switch (type) {
      case 'text':
        return this._renderTextElement(element, baseStyles);
      case 'image':
        return this._renderImageElement(element, baseStyles);
      case 'rectangle':
      case 'ellipse':
        return this._renderShapeElement(element, baseStyles);
      case 'line':
      case 'arrow':
        return this._renderLineElement(element, baseStyles);
      case 'qrcode':
        return this._renderQrcodeElement(element, baseStyles);
      default:
        logger.warn('Unknown slide element type', { type, id });
        return '';
    }
  }

  /**
   * Renderizza elemento testo
   * @private
   */
  _renderTextElement(element, baseStyles) {
    const { id, content, style = {} } = element;

    const textStyles = [
      ...baseStyles,
      style.backgroundColor && style.backgroundColor !== 'transparent'
        ? `background-color: ${style.backgroundColor}`
        : '',
      style.color ? `color: ${style.color}` : 'color: #1e293b',
      style.fontSize ? `font-size: ${style.fontSize}px` : 'font-size: 16px',
      style.fontFamily ? `font-family: ${style.fontFamily}` : '',
      style.textAlign ? `text-align: ${style.textAlign}` : '',
      style.fontWeight ? `font-weight: ${style.fontWeight}` : '',
      style.fontStyle ? `font-style: ${style.fontStyle}` : '',
      style.borderWidth ? `border: ${style.borderWidth}px solid ${style.borderColor || '#e2e8f0'}` : '',
      'padding: 8px',
      'white-space: pre-wrap',  // Preserve whitespace and line breaks
    ].filter(Boolean).join('; ');

    // Il content può contenere HTML (es: <b>, <i>, <span style="color:...">)
    // Also convert \n to <br> for proper line break rendering
    let safeContent = content || '';
    // Convert plain newlines to <br> tags if not already HTML
    if (!safeContent.includes('<br') && safeContent.includes('\n')) {
      safeContent = safeContent.replace(/\n/g, '<br/>');
    }

    return `<div class="slide-element text" data-id="${id}" style="${textStyles}">${safeContent}</div>`;
  }

  /**
   * Renderizza elemento immagine
   * @private
   */
  _renderImageElement(element, baseStyles) {
    const { id, src, style = {} } = element;

    const imgStyles = [
      ...baseStyles,
      style.borderWidth ? `border: ${style.borderWidth}px solid ${style.borderColor || '#e2e8f0'}` : '',
      style.borderRadius ? `border-radius: ${style.borderRadius}px` : '',
    ].filter(Boolean).join('; ');

    // Converti URL relativo in assoluto se necessario
    const imgSrc = src?.startsWith('/') ? `${process.env.APP_URL || 'http://localhost:4001'}${src}` : src;

    return `<div class="slide-element image" data-id="${id}" style="${imgStyles}"><img src="${imgSrc || ''}" alt="" /></div>`;
  }

  /**
   * Renderizza elemento forma (rettangolo, ellisse)
   * @private
   */
  _renderShapeElement(element, baseStyles) {
    const { id, type, style = {} } = element;

    const shapeStyles = [
      ...baseStyles,
      style.backgroundColor ? `background-color: ${style.backgroundColor}` : 'background-color: #3b82f6',
      style.borderWidth ? `border: ${style.borderWidth}px solid ${style.borderColor || '#1d4ed8'}` : '',
      type === 'ellipse' ? 'border-radius: 50%' : (style.borderRadius ? `border-radius: ${style.borderRadius}px` : ''),
    ].filter(Boolean).join('; ');

    return `<div class="slide-element shape" data-id="${id}" style="${shapeStyles}"></div>`;
  }

  /**
   * Renderizza elemento linea o freccia
   * @private
   */
  _renderLineElement(element, baseStyles) {
    const { id, type, x, y, width, height, rotation = 0, style = {} } = element;

    const lineWidth = style.lineWidth || 2;
    const lineColor = style.borderColor || '#1e293b';
    const lineStyle = style.lineStyle || 'solid';

    // Per le linee, usa SVG per precisione
    const svgWidth = Math.max(width, 10);
    const svgHeight = Math.max(height, lineWidth * 2);

    // Calcola punti della linea
    const x1 = 0;
    const y1 = svgHeight / 2;
    const x2 = svgWidth;
    const y2 = svgHeight / 2;

    // Stroke dasharray per linee tratteggiate
    let strokeDasharray = '';
    if (lineStyle === 'dashed') {
      strokeDasharray = `stroke-dasharray="${lineWidth * 3} ${lineWidth * 2}"`;
    } else if (lineStyle === 'dotted') {
      strokeDasharray = `stroke-dasharray="${lineWidth} ${lineWidth}"`;
    }

    // Freccia (marker-end)
    let markerDef = '';
    let markerEnd = '';
    if (type === 'arrow') {
      const arrowSize = style.arrowSize || 10;
      markerDef = `
        <defs>
          <marker id="arrowhead-${id}" markerWidth="${arrowSize}" markerHeight="${arrowSize}" 
                  refX="${arrowSize - 2}" refY="${arrowSize / 2}" orient="auto">
            <polygon points="0 0, ${arrowSize} ${arrowSize / 2}, 0 ${arrowSize}" fill="${lineColor}" />
          </marker>
        </defs>`;
      markerEnd = `marker-end="url(#arrowhead-${id})"`;
    }

    const containerStyles = [
      'position: absolute',
      `left: ${x}px`,
      `top: ${y}px`,
      `width: ${svgWidth}px`,
      `height: ${svgHeight}px`,
      rotation ? `transform: rotate(${rotation}deg)` : '',
      'overflow: visible',
    ].filter(Boolean).join('; ');

    return `
      <div class="slide-element line" data-id="${id}" style="${containerStyles}">
        <svg width="${svgWidth}" height="${svgHeight}" style="overflow: visible;">
          ${markerDef}
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
                stroke="${lineColor}" stroke-width="${lineWidth}" 
                ${strokeDasharray} ${markerEnd} />
        </svg>
      </div>`;
  }

  /**
   * Renderizza elemento QR Code
   * Il content contiene il marker {{document.qrCode}} che verrà sostituito con il tag <img> completo del QR
   * @private
   */
  _renderQrcodeElement(element, baseStyles) {
    const { id, content, style = {} } = element;

    // Gli stili del QR code - usa le dimensioni esatte dell'elemento
    const qrStyles = [
      ...baseStyles,
      style.backgroundColor && style.backgroundColor !== 'transparent'
        ? `background-color: ${style.backgroundColor}`
        : 'background-color: white',
      style.borderWidth ? `border: ${style.borderWidth}px solid ${style.borderColor || '#e2e8f0'}` : '',
      style.borderRadius ? `border-radius: ${style.borderRadius}px` : '',
      'padding: 4px',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'overflow: hidden',
    ].filter(Boolean).join('; ');

    // Il content è il marker {{document.qrCode}} che verrà sostituito con il tag <img> completo
    // NON wrappare in un altro <img>, il marker restituisce già il tag completo
    return `<div class="slide-element qrcode" data-id="${id}" style="${qrStyles}">${content || '{{document.qrCode}}'}</div>`;
  }

  /**
   * Build context per marker resolution
   * @private
   */
  _buildContext(entityData, template, options) {
    // Se markers sono forniti esplicitamente nelle options, usali direttamente
    if (options.markers) {
      logger.debug('Using explicit markers from options');
      return options.markers;
    }

    // Altrimenti costruisci context standard
    const tenant = {
      id: template.tenantId,
      name: options.tenantName || 'Element Medica Training',
      logo: options.tenantLogo || '/assets/logo.png',
      address: options.tenantAddress || '',
      phone: options.tenantPhone || '',
      email: options.tenantEmail || '',
      website: options.tenantWebsite || ''
    };

    // Merge tutto nel context
    // NOTA IMPORTANTE: pageNumber e totalPages NON vanno nel context!
    // Devono rimanere come {{document.pageNumber}} nell'HTML
    // e verranno convertiti in <span class="..."> SOLO in _buildPdfOptions
    // per header/footer di Puppeteer che li popola dinamicamente
    const context = {
      ...entityData,
      tenant,
      current: {
        date: new Date(),
        year: new Date().getFullYear(),
        time: new Date().toLocaleTimeString('it-IT')
      },
      document: {
        id: null, // Verrà popolato dopo creazione
        number: null, // Verrà popolato dopo progressivo
        type: template.type,
        date: new Date()
        // pageNumber e totalPages NON sono qui - gestiti in _buildPdfOptions
      }
    };

    // Override document con dati custom se forniti (es. per numero progressivo)
    if (options.customData?.documentOverride) {
      const docOverride = options.customData.documentOverride;
      context.document = {
        ...context.document,
        ...docOverride
      };
      // Aggiungi letteraIncarico come alias di document per compatibilità marker
      context.letteraIncarico = {
        number: docOverride.number,
        date: docOverride.date
      };
      logger.warn('Document override applied for letteraIncarico', {
        component: 'documentService',
        action: '_buildContext-documentOverride',
        number: docOverride.number,
        date: docOverride.date,
        letteraIncarico: context.letteraIncarico
      });
    }

    // Override schedule con dati custom se forniti (es. date formattate)
    if (options.customData?.scheduleOverride) {
      const schedOverride = options.customData.scheduleOverride;
      context.schedule = {
        ...context.schedule,
        ...schedOverride
      };
      logger.debug('Schedule override applied', {
        startDate: schedOverride.startDate,
        endDate: schedOverride.endDate,
        participantCompanies: schedOverride.participantCompanies
      });
    }

    // Override session con dati custom se forniti (alias per trainer, participantCompanies)
    if (options.customData?.sessionOverride) {
      const sessOverride = options.customData.sessionOverride;
      // Initialize session object if not present (for COURSE_SCHEDULE entity type)
      if (!context.session) {
        context.session = {};
      }
      context.session = {
        ...context.session,
        ...sessOverride
      };
      logger.debug('Session override applied', {
        hasTrainer: !!sessOverride.trainer,
        participantCompanies: sessOverride.participantCompanies
      });
    }

    // Override trainer con dati custom se forniti (es. per lettere di incarico)
    if (options.customData?.trainerOverride) {
      const trainerOverride = options.customData.trainerOverride;
      context.trainer = {
        ...context.trainer,
        ...trainerOverride,
        // Formatta rimborso spese: se 0 mostra testo, altrimenti importo
        expensesText: trainerOverride.expenses > 0
          ? `€ ${trainerOverride.expenses.toFixed(2).replace('.', ',')}`
          : 'senza alcun rimborso spese'
      };
      logger.debug('Trainer override applied', {
        trainerId: trainerOverride.id,
        hourlyRate: trainerOverride.hourlyRate,
        totalHours: trainerOverride.totalHours,
        expenses: trainerOverride.expenses,
        totalCompensation: trainerOverride.totalCompensation
      });
    }

    // Final context debug log - using WARN to see in production
    logger.warn('Final context built in _buildContext', {
      hasSchedule: !!context.schedule,
      hasSession: !!context.session,
      hasTrainer: !!context.trainer,
      sessionKeys: context.session ? Object.keys(context.session) : [],
      trainerKeys: context.trainer ? Object.keys(context.trainer) : [],
      sessionParticipantCompanies: context.session?.participantCompanies,
      trainerTotalHours: context.trainer?.totalHours,
      trainerTotalCompensation: context.trainer?.totalCompensation
    });

    return context;
  }

  /**
   * Build HTML completo - SOLO body content
   * Header e Footer sono gestiti separatamente da Puppeteer per ripeterli su ogni pagina
   * @private
   */
  async _buildFullHtml(content, template, context) {
    const styles = template.styles || {};
    const layout = template.layout || {};

    // NOTA: Header e Footer NON vanno qui!
    // Puppeteer li gestisce tramite headerTemplate/footerTemplate nelle opzioni PDF
    // In questo modo si ripetono automaticamente su ogni pagina

    return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${styles.fontFamily || 'Arial, sans-serif'};
      font-size: ${styles.fontSize || '12pt'};
      line-height: ${styles.lineHeight || '1.6'};
      color: ${styles.color || '#000000'};
      background: white;
    }
    
    /* Contenuto - I margini sono gestiti da Puppeteer PDF options */
    .page {
      width: 100%;
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin-bottom: 0.5em;
      font-weight: bold;
    }
    
    p {
      margin-bottom: 0.5em;
      min-height: 1em; /* Garantisce altezza per paragrafi vuoti */
    }
    
    /* Paragrafi vuoti mantengono spazio (a capo senza testo) */
    p:empty {
      min-height: 1em;
      display: block;
    }
    
    /* TipTap usa &nbsp; per paragrafi vuoti, o <br> */
    p:has(br:only-child),
    p:has(> br:first-child:last-child) {
      min-height: 1em;
    }
    
    /* Liste puntate e numerate - spaziatura corretta */
    ul, ol {
      margin: 0.5em 0;
      padding-left: 1.5em;
    }
    
    ul li, ol li {
      margin-bottom: 0.3em;
      padding-left: 0.3em;
    }
    
    /* Elenchi puntati nested */
    ul ul, ol ol, ul ol, ol ul {
      margin: 0.2em 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      table-layout: auto; /* Rispetta le width inline delle colonne */
    }
    
    /* Styling tabelle base - inline styles dall'editor hanno precedenza */
    table th, table td {
      border: 1px solid #d1d5db; /* Stesso colore dell'editor TipTap */
      padding: 0.5rem; /* Stesso padding dell'editor (8px) */
      text-align: left;
      vertical-align: top;
    }
    
    table th {
      background-color: #f3f4f6; /* Stesso colore dell'editor TipTap */
      font-weight: 600;
    }
    
    /* Supporta colgroup per larghezze colonne */
    table colgroup col {
      /* Le width sono definite inline dall'editor */
    }
    
    /* Immagini nel corpo del documento - rispetta dimensioni inline dall'editor */
    img {
      max-width: 100%; /* Evita overflow orizzontale */
      height: auto; /* Mantiene aspect ratio se non specificato */
    }
    
    /* Se l'immagine ha width inline, rispettala */
    img[style*="width"] {
      max-width: none; /* Rimuovi max-width se c'è width esplicita */
    }
    img[width] {
      max-width: none;
    }
    
    /* Page break styling - ottimizzato per Puppeteer */
    /* IMPORTANTE: Per funzionare con Puppeteer PDF, page-break deve essere su elemento visibile */
    .page-break-wrapper {
      page-break-after: always !important;
      break-after: page !important;
      clear: both;
      display: block;
      height: 1px;
      margin: 0;
      padding: 0;
    }
    
    .page-break {
      page-break-after: always !important;
      break-after: page !important;
      display: block !important;
      clear: both;
      height: 1px !important;
      margin: 0 !important;
      padding: 0 !important;
      background: none !important;
      border: none !important;
    }
    
    /* Ensure line breaks are preserved */
    .content, .page, p, div:not(.page-break):not(.page-break-wrapper), span {
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    /* Ensure br tags create visible line breaks */
    br {
      display: block;
      content: "";
      margin-top: 0;
      line-height: 1.5em; /* Altezza visibile per br */
    }
    
    /* br singoli all'interno di elementi inline devono creare spaziatura */
    br::after {
      content: "\\A";
      white-space: pre;
    }
    
    /* Print/PDF specific styles */
    @media print {
      .page-break-wrapper {
        page-break-after: always !important;
        break-after: page !important;
        clear: both;
        display: block !important;
        height: 1px !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      .page-break {
        page-break-after: always !important;
        break-after: page !important;
        display: block !important;
        clear: both;
        height: 1px !important;
        border: none !important;
        background: none !important;
      }
      
      .page-break span {
        display: none !important;
      }
    }
    
    ${styles.customCSS || ''}
  </style>
</head>
<body>
  <div class="page">
    ${content}
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Processa HTML per ottimizzazione PDF
   * - Converte URL immagini relativi in assoluti
   * - Sistema page break CSS
   * - Pulisce elementi visuali dell'editor
   * @private
   */
  async _processHtmlForPdf(html, options = {}) {
    if (!html) return html;

    let processedHtml = html;

    // 1. Rimuovi indicatori visuali del page break
    processedHtml = processedHtml.replace(
      /<div[^>]*>▼ FINE PAGINA ▼<\/div>/gi,
      ''
    );
    processedHtml = processedHtml.replace(
      /<div[^>]*>▲ INIZIO NUOVA PAGINA ▲<\/div>/gi,
      ''
    );
    processedHtml = processedHtml.replace(
      /<p[^>]*>\[Contenuto pagina successiva[^\]]*\]<\/p>/gi,
      ''
    );

    // Rimuovi div vuoti con solo margin-bottom (inseriti erroneamente dall'editor)
    processedHtml = processedHtml.replace(
      /<div[^>]*style=["'][^"']*margin-bottom[^"']*["'][^>]*>\s*<\/div>/gi,
      ''
    );

    // 2. Converti immagini con path relativi in URL assoluti
    const baseUrl = options.baseUrl || process.env.FRONTEND_URL || 'http://localhost:5173';

    processedHtml = processedHtml.replace(
      /src="\/([^"]+)"/g,
      `src="${baseUrl}/$1"`
    );

    processedHtml = processedHtml.replace(
      /src="(?!http|https|data:|\/\/)([^"]+)"/g,
      (match, path) => `src="${baseUrl}/${path}"`
    );

    // 3. GESTIONE PAGE BREAK - APPROCCIO CON data-page-break ATTRIBUTE
    // Il div con data-page-break="true" viene sostituito con CSS page-break puro
    // IMPORTANTE: Per Puppeteer/Chrome, serve:
    // - display: block
    // - break-after: page (standard) + page-break-after: always (legacy)
    // - elemento deve avere contenuto o min-height per essere renderizzato
    // - clear: both per assicurare che non sia inline con altri elementi
    // - height esplicito (non min-height) può aiutare Puppeteer
    const pageBreakReplacement = `<div style="display: block; page-break-after: always; break-after: page; height: 1px; clear: both; margin: 0; padding: 0; border: none; background: transparent; visibility: visible;"></div>`;

    // Log HTML prima di processare page breaks per debug
    const hasDataPageBreak = processedHtml.includes('data-page-break');
    const hasPageBreakClass = processedHtml.includes('page-break');
    const hasInterruzioneText = processedHtml.includes('INTERRUZIONE');

    logger.info('🔍 PAGE BREAK DEBUG - Before processing', {
      hasDataPageBreak,
      hasPageBreakClass,
      hasInterruzioneText,
      htmlLength: processedHtml.length
    });

    // Log del contenuto intorno a INTERRUZIONE se presente
    if (hasInterruzioneText) {
      const idx = processedHtml.indexOf('INTERRUZIONE');
      const snippet = processedHtml.substring(Math.max(0, idx - 100), Math.min(processedHtml.length, idx + 100));
      logger.info('🔍 PAGE BREAK DEBUG - Content around INTERRUZIONE:', { snippet });
    }

    // Pattern 1: div con data-page-break attribute (nuovo formato) - cattura TUTTO il contenuto interno
    // Usa pattern non-greedy più ampio per catturare div nested
    processedHtml = processedHtml.replace(
      /<div[^>]*data-page-break\s*=\s*["']?true["']?[^>]*>[\s\S]*?<\/div>/gi,
      pageBreakReplacement
    );

    // Pattern 2: div con classe page-break-visual (nuovo formato editor)
    processedHtml = processedHtml.replace(
      /<div[^>]*class\s*=\s*["'][^"']*page-break-visual[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
      pageBreakReplacement
    );

    // Pattern 3: div con classe page-break-wrapper (vecchio formato) - con contenuto nested
    processedHtml = processedHtml.replace(
      /<div[^>]*class\s*=\s*["'][^"']*page-break-wrapper[^"']*["'][^>]*>[\s\S]*?<\/div>(?:\s*<\/div>)*/gi,
      pageBreakReplacement
    );

    // Pattern 4: div con classe page-break singolo
    processedHtml = processedHtml.replace(
      /<div[^>]*class\s*=\s*["'][^"']*\bpage-break\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
      pageBreakReplacement
    );

    // ==========================================
    // IMPORTANTE: I pattern per il testo "INTERRUZIONE DI PAGINA" devono essere eseguiti
    // PRIMA dei pattern di pulizia che rimuovono solo il testo!
    // ==========================================

    // Pattern 5: CRITICO - TipTap converte il div page-break in:
    // <p><span style="..."><strong>— INTERRUZIONE DI PAGINA —</strong></span></p>
    // Questo pattern cattura l'intera struttura e la sostituisce con un vero page break
    const beforePattern5 = processedHtml.includes('INTERRUZIONE');
    processedHtml = processedHtml.replace(
      /<p[^>]*>\s*<span[^>]*>(?:<strong>)?[\s]*[—\-–]*\s*INTERRUZIONE\s+DI\s+PAGINA\s*[—\-–]*\s*(?:<\/strong>)?<\/span>\s*<\/p>/gi,
      pageBreakReplacement
    );
    const afterPattern5 = processedHtml.includes('INTERRUZIONE');
    if (beforePattern5 && !afterPattern5) {
      logger.info('✅ Pattern 5 MATCHED and replaced INTERRUZIONE with page-break');
    }

    // Pattern 6: Variante con span nested o senza strong
    processedHtml = processedHtml.replace(
      /<p[^>]*>\s*<span[^>]*>[—\-–\s]*INTERRUZIONE\s+DI\s+PAGINA[—\-–\s]*<\/span>\s*<\/p>/gi,
      pageBreakReplacement
    );

    // Pattern 7: Qualsiasi elemento che contiene "— INTERRUZIONE DI PAGINA —"
    // Fallback per catturare qualsiasi variante
    processedHtml = processedHtml.replace(
      /<(?:p|div|span)[^>]*>(?:<[^>]+>)*\s*[—\-–]*\s*INTERRUZIONE\s+DI\s+PAGINA\s*[—\-–]*\s*(?:<\/[^>]+>)*<\/(?:p|div|span)>/gi,
      pageBreakReplacement
    );

    // ==========================================
    // Pattern di pulizia - Rimuovono testo residuo DOPO i pattern di sostituzione
    // ==========================================

    // Pattern 8: Rimuovi testo INTERRUZIONE residuo (entity HTML: —, etc.)
    // Questo serve solo per pulire eventuali frammenti rimasti
    processedHtml = processedHtml.replace(
      /(?:—|&mdash;|&#8212;)?\s*INTERRUZIONE\s+DI\s+PAGINA\s*(?:—|&mdash;|&#8212;)?/gi,
      ''
    );

    // Pattern 9: Rimuovi span contenenti solo INTERRUZIONE residuo
    processedHtml = processedHtml.replace(
      /<span[^>]*>[\s—&;#0-9]*INTERRUZIONE\s+DI\s+PAGINA[\s—&;#0-9]*<\/span>/gi,
      ''
    );

    // Log finale per debug
    const pageBreakCount = (processedHtml.match(/page-break-after/gi) || []).length;
    const hasPageBreakInline = processedHtml.includes('page-break-after: always');

    logger.info('🔍 PAGE BREAK DEBUG - After processing', {
      pageBreakCount,
      hasPageBreakInline,
      stillHasInterruzioneText: processedHtml.includes('INTERRUZIONE'),
      htmlLength: processedHtml.length
    });

    return processedHtml;
  }

  /**
   * Build opzioni PDF da template
   * Header e Footer di Puppeteer si ripetono su ogni pagina
   * pageNumber e totalPages funzionano SOLO in headerTemplate/footerTemplate
   * @private
   */
  async _buildPdfOptions(template, context = {}, options = {}) {
    const layout = template.layout || {};
    const baseUrl = options.baseUrl || process.env.BACKEND_URL || 'http://localhost:4001';

    // Costruisci header template per Puppeteer
    let headerTemplate = '<span></span>'; // Default vuoto
    if (template.header) {
      // Risolvi marker nell'header
      let processedHeader = await this.markerResolver.resolve(
        template.header,
        context,
        { strict: false }
      );

      // Converti {{document.pageNumber}} in classe Puppeteer
      processedHeader = processedHeader.replace(/\{\{document\.pageNumber\}\}/gi, '<span class="pageNumber"></span>');
      processedHeader = processedHeader.replace(/\{\{document\.totalPages\}\}/gi, '<span class="totalPages"></span>');

      // IMPORTANTE: Converti immagini in DATA URI (Puppeteer non carica URL remoti in header/footer)
      processedHeader = await this._convertImagesToDataUri(processedHeader);

      // Wrap in stile per Puppeteer header (font-size è OBBLIGATORIO)
      // IMPORTANTE: L'header Puppeteer ha spazio limitato dal margine top
      // Le immagini con dimensioni esplicite inline le mantengono, altrimenti max-height 80px
      // ✅ FIX: Aumentato padding-bottom a 5mm per evitare che il contenuto venga tagliato sotto l'header
      headerTemplate = `
        <style>
          .puppeteer-header img:not([style*="width"]):not([style*="height"]):not([width]):not([height]) {
            max-height: 80px;
            width: auto;
            height: auto;
            object-fit: contain;
          }
          /* Immagini con dimensioni esplicite: rispetta le dimensioni */
          .puppeteer-header img[style*="width"],
          .puppeteer-header img[style*="height"],
          .puppeteer-header img[width],
          .puppeteer-header img[height] {
            /* Mantieni le dimensioni inline */
            object-fit: contain;
          }
        </style>
        <div class="puppeteer-header" style="width: 100%; font-size: 10px; padding: 2mm 10mm 5mm 10mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box;">
          ${processedHeader}
        </div>
      `;
    }

    // Costruisci footer template per Puppeteer
    let footerTemplate = '<span></span>'; // Default vuoto
    if (template.footer) {
      // Risolvi marker nel footer
      let processedFooter = await this.markerResolver.resolve(
        template.footer,
        context,
        { strict: false }
      );

      // Converti {{document.pageNumber}} in classe Puppeteer
      processedFooter = processedFooter.replace(/\{\{document\.pageNumber\}\}/gi, '<span class="pageNumber"></span>');
      processedFooter = processedFooter.replace(/\{\{document\.totalPages\}\}/gi, '<span class="totalPages"></span>');

      // IMPORTANTE: Converti immagini in DATA URI
      processedFooter = await this._convertImagesToDataUri(processedFooter);

      // Wrap in stile per Puppeteer footer (font-size è OBBLIGATORIO)
      // Le immagini con dimensioni esplicite inline le mantengono, altrimenti max-height 80px
      footerTemplate = `
        <style>
          .puppeteer-footer img:not([style*="width"]):not([style*="height"]):not([width]):not([height]) {
            max-height: 80px;
            width: auto;
            height: auto;
            object-fit: contain;
          }
          .puppeteer-footer img[style*="width"],
          .puppeteer-footer img[style*="height"],
          .puppeteer-footer img[width],
          .puppeteer-footer img[height] {
            object-fit: contain;
          }
        </style>
        <div class="puppeteer-footer" style="width: 100%; font-size: 10px; padding: 10px 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
          ${processedFooter}
        </div>
      `;
    } else {
      // Footer default con numerazione pagine se non specificato
      footerTemplate = `
        <div style="width: 100%; font-size: 9px; padding: 5px 20px; text-align: center; color: #666;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `;
    }

    // Margini - valori ragionevoli per documenti professionali
    // Se c'è header, serve spazio extra top per header Puppeteer
    // Se c'è footer, serve spazio extra bottom per footer Puppeteer
    const hasHeader = template.header && template.header.trim().length > 0;
    const hasFooter = template.footer && template.footer.trim().length > 0;

    // SlideEditor templates usano margini ZERO perché il layout è già
    // calcolato per riempire la pagina intera con posizionamento assoluto
    const isSlideEditor = options.isSlideEditor === true;

    // Leggi margini dal layout, usa default se non specificati
    // PREVENTIVO usa margini eleganti (10mm) per layout professionale
    // SLIDEEDITOR usa margini zero (il canvas scala per riempire A4)
    const isPreventivo = template.type === 'PREVENTIVO';

    let margins;
    if (isSlideEditor) {
      // SlideEditor: margini zero, il contenuto scala per riempire tutta la pagina
      margins = { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' };
    } else if (layout.margins) {
      // ✅ FIX: Usa i margini definiti nel layout del template se presenti
      // Questo rispetta i margini definiti in cm/mm dallo script di creazione template
      margins = {
        top: layout.margins.top || (hasHeader ? '35mm' : '15mm'),
        right: layout.margins.right || '15mm',
        bottom: layout.margins.bottom || (hasFooter ? '25mm' : '15mm'),
        left: layout.margins.left || '15mm'
      };
    } else {
      // Margini default se non specificati nel layout
      // ✅ FIX: Aumentato top margin da 25mm a 35mm per accomodare header con logo e titolo
      margins = {
        top: isPreventivo ? '5mm' : (hasHeader ? '35mm' : '15mm'),
        right: isPreventivo ? '5mm' : '15mm',
        bottom: isPreventivo ? '5mm' : (hasFooter ? '25mm' : '15mm'),
        left: isPreventivo ? '5mm' : '15mm'
      };
    }

    logger.debug('PDF options built', {
      templateType: template.type,
      isPreventivo,
      isSlideEditor,
      hasHeader,
      hasFooter,
      margins,
      headerPreview: headerTemplate.substring(0, 200),
      footerPreview: footerTemplate.substring(0, 200)
    });

    // Per SlideEditor, usa l'orientation dal template se disponibile
    const landscape = isSlideEditor && options.orientation
      ? options.orientation === 'landscape'
      : layout.orientation === 'landscape';

    return {
      format: layout.format || 'A4',
      landscape,
      margin: margins,
      printBackground: true,
      preferCSSPageSize: isSlideEditor || isPreventivo, // SlideEditor e PREVENTIVO usano @page CSS
      displayHeaderFooter: !isSlideEditor && !isPreventivo, // SlideEditor e PREVENTIVO non hanno header/footer separati
      headerTemplate: (isSlideEditor || isPreventivo) ? '<span></span>' : headerTemplate,
      footerTemplate: (isSlideEditor || isPreventivo) ? '<span></span>' : footerTemplate
    };
  }

  /**
   * Assicura che le immagini abbiano dimensioni ragionevoli
   * PRESERVA le dimensioni impostate nell'editor (width, height, style)
   * Aggiunge solo un fallback se non ci sono dimensioni
   * @private
   */
  _ensureImageDimensions(html, { maxHeight = '50px', maxWidth = 'auto' } = {}) {
    if (!html) return html;

    // Trova tutti i tag img
    const imgRegex = /<img([^>]*)>/gi;

    return html.replace(imgRegex, (match, attrs) => {
      // Controlla se ha già dimensioni specificate in qualsiasi forma
      const hasWidth = /width\s*[:=]|width:/i.test(attrs);
      const hasHeight = /height\s*[:=]|height:/i.test(attrs);
      const hasMaxHeight = /max-height/i.test(attrs);
      const hasMaxWidth = /max-width/i.test(attrs);
      const hasStyleDimensions = /style\s*=\s*["'][^"']*(?:width|height)/i.test(attrs);

      // Se ha GIÀ dimensioni definite (nell'editor), NON modificare
      // Questo preserva le dimensioni impostate dall'utente
      if (hasWidth || hasHeight || hasMaxHeight || hasMaxWidth || hasStyleDimensions) {
        logger.debug('Image has dimensions, preserving', { attrs: attrs.substring(0, 100) });
        return match;
      }

      // Solo se NON ha dimensioni, aggiungi un fallback ragionevole
      const hasStyle = /style\s*=/i.test(attrs);
      if (hasStyle) {
        // Aggiungi alla fine dello style esistente
        return match.replace(
          /style\s*=\s*["']([^"']*)["']/i,
          `style="$1; max-height: ${maxHeight}; width: auto;"`
        );
      } else {
        // Aggiungi attributo style
        return `<img style="max-height: ${maxHeight}; width: auto;"${attrs}>`;
      }
    });
  }

  /**
   * Converte URL immagini relativi in assoluti
   * @private
   */
  _convertImageUrls(html, baseUrl) {
    if (!html) return html;

    // Pattern 1: src="/path/to/image"
    let result = html.replace(
      /src="\/([^"]+)"/g,
      `src="${baseUrl}/$1"`
    );

    // Pattern 2: src="uploads/..." o altri path relativi
    result = result.replace(
      /src="(?!http|https|data:|\/\/)([^"]+)"/g,
      (match, path) => `src="${baseUrl}/${path}"`
    );

    return result;
  }

  /**
   * Converte immagini in DATA URI base64 per Puppeteer header/footer
   * IMPORTANTE: Puppeteer headerTemplate/footerTemplate NON possono caricare URL remoti
   * Le immagini devono essere inline come data:image/...;base64,...
   * @private
   */
  async _convertImagesToDataUri(html) {
    if (!html) return html;

    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');

    // Trova tutti i tag img con src
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let result = html;
    const matches = [...html.matchAll(imgRegex)];

    for (const match of matches) {
      const fullMatch = match[0];
      let imgSrc = match[1];

      // Skip se già è data URI
      if (imgSrc.startsWith('data:')) continue;

      try {
        let imageBuffer = null;

        // Se è URL http/https, prova a fare fetch
        if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
          try {
            // Estrai il path dalla URL per leggere direttamente il file
            const url = new URL(imgSrc);
            const localPath = url.pathname;

            // Prova prima a leggere dal filesystem locale
            const possiblePaths = [
              path.join(process.cwd(), localPath),
              path.join(process.cwd(), localPath.replace(/^\//, '')),
              path.join(process.cwd(), 'uploads', localPath.replace(/^\/uploads\//, '')),
            ];

            for (const tryPath of possiblePaths) {
              try {
                imageBuffer = await fs.readFile(tryPath);
                logger.debug('Image loaded from local path', { path: tryPath });
                break;
              } catch (e) {
                // Continua a provare altri path
              }
            }

            // Se non trovato localmente, prova fetch
            if (!imageBuffer) {
              const response = await fetch(imgSrc, { timeout: 5000 });
              if (response.ok) {
                imageBuffer = Buffer.from(await response.arrayBuffer());
                logger.debug('Image fetched from URL', { url: imgSrc });
              }
            }
          } catch (fetchError) {
            logger.warn('Failed to fetch image', { src: imgSrc, error: fetchError.message });
          }
        }
        // Se è path relativo/assoluto, leggi dal filesystem
        else {
          const relativePath = imgSrc.startsWith('/') ? imgSrc.slice(1) : imgSrc;
          const possiblePaths = [
            path.join(process.cwd(), relativePath),
            path.join(process.cwd(), 'uploads', relativePath),
            path.join(process.cwd(), imgSrc),
          ];

          for (const tryPath of possiblePaths) {
            try {
              imageBuffer = await fs.readFile(tryPath);
              logger.debug('Image loaded from path', { path: tryPath });
              break;
            } catch (e) {
              // Continua a provare altri path
            }
          }
        }

        if (imageBuffer) {
          // Determina MIME type dall'estensione
          const ext = imgSrc.toLowerCase().split('.').pop()?.split('?')[0] || 'png';
          const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'webp': 'image/webp'
          };
          const mimeType = mimeTypes[ext] || 'image/png';

          // Converti in base64
          const base64 = imageBuffer.toString('base64');
          const dataUri = `data:${mimeType};base64,${base64}`;

          // Sostituisci SOLO il valore src, preservando tutti gli altri attributi (width, height, style, class)
          // Questo mantiene le dimensioni originali dell'immagine
          const newImgTag = fullMatch.replace(/src=["'][^"']+["']/, `src="${dataUri}"`);
          result = result.replace(fullMatch, newImgTag);

          logger.debug('Image converted to data URI (preserving dimensions)', {
            originalSrc: imgSrc.substring(0, 50),
            dataUriLength: dataUri.length,
            hasWidthAttr: fullMatch.includes('width'),
            hasStyleAttr: fullMatch.includes('style')
          });
        } else {
          logger.warn('Could not load image for data URI conversion', { src: imgSrc });
        }

      } catch (error) {
        logger.warn('Failed to convert image to data URI', { src: imgSrc, error: error.message });
      }
    }

    return result;
  }

  /**
   * Genera numero progressivo per documento
   * @private
   */
  async _getProgressiveNumber(documentType, tenantId) {
    const year = new Date().getFullYear();

    // Conta documenti dello stesso tipo nell'anno corrente
    const count = await prisma.generatedDocument.count({
      where: {
        type: documentType,
        tenantId,
        generatedAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`)
        }
      }
    });

    // Formato: YYYY/NNN (es: 2024/001)
    return `${year}/${String(count + 1).padStart(3, '0')}`;
  }

  /**
   * Genera filename per documento
   * @private
   * @param {string} documentType - Tipo documento
   * @param {string} entityId - ID entità
   * @param {string} personId - ID persona (opzionale)
   * @param {string} progressiveNumber - Numero progressivo
   * @param {Object} context - Context con dati per nome descrittivo
   * @returns {string} - Nome file
   */
  _generateFilename(documentType, entityId, personId, progressiveNumber, context = {}) {
    const timestamp = Date.now();

    // Per ATTENDANCE_REGISTER usa formato: yyyy.mm.dd - Nome corso - Registro Presenze.pdf
    if (documentType === 'ATTENDANCE_REGISTER' && context) {
      const sessionDate = context.session?.date || context.schedule?.startDate || new Date();
      const date = new Date(sessionDate);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');

      const courseTitle = context.course?.title || 'Corso';
      // Sanitizza il nome del corso per uso nel filename
      const sanitizedTitle = courseTitle
        .replace(/[<>:"/\\|?*]/g, '') // Rimuovi caratteri non validi
        .replace(/\s+/g, ' ')         // Normalizza spazi
        .trim()
        .substring(0, 50);            // Limita lunghezza

      return `${yyyy}.${mm}.${dd} - ${sanitizedTitle} - Registro Presenze.pdf`;
    }

    // Per LETTER_OF_ENGAGEMENT usa formato: yyyy.mm.dd - Cognome Nome - Lettera di Incarico.pdf
    if (documentType === 'LETTER_OF_ENGAGEMENT' && context) {
      const date = new Date();
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');

      // Prendi nome del trainer dal context
      const trainerLastName = context.trainer?.lastName || '';
      const trainerFirstName = context.trainer?.firstName || '';
      const trainerName = `${trainerLastName} ${trainerFirstName}`.trim() || 'Formatore';

      // Sanitizza il nome per uso nel filename
      const sanitizedName = trainerName
        .replace(/[<>:"/\\|?*]/g, '') // Rimuovi caratteri non validi
        .replace(/\s+/g, ' ')         // Normalizza spazi
        .trim()
        .substring(0, 50);            // Limita lunghezza

      return `${yyyy}.${mm}.${dd} - ${sanitizedName} - Lettera di Incarico.pdf`;
    }

    // Per altri tipi, usa formato standard
    const personSuffix = personId ? `_person${personId}` : '';
    const progSuffix = progressiveNumber ? `_${progressiveNumber.replace('/', '-')}` : '';

    const typePrefix = {
      'LETTER_OF_ENGAGEMENT': 'lettera',
      'ATTENDANCE_REGISTER': 'registro',
      'CERTIFICATE': 'attestato',
      'INVOICE': 'fattura',
      'COURSE_PROGRAM': 'programma'
    }[documentType] || 'document';

    return `${typePrefix}_${entityId}${personSuffix}${progSuffix}_${timestamp}.pdf`;
  }

  /**
   * Aggiorna entità specifica con riferimento al documento
   * @private
   */
  async _updateEntityDocument(entityType, entityId, personId, template, document, markers) {
    try {
      switch (template.type) {
        case 'CERTIFICATE':
          // Aggiorna attestato
          if (personId) {
            await prisma.attestato.updateMany({
              where: {
                scheduledCourseId: entityId,
                personId,
                deletedAt: null
              },
              data: {
                templateId: template.id,
                templateVersion: template.version,
                markers,
                generatedBy: document.generatedBy,
                fileSize: document.fileSize,
                updatedAt: new Date()
              }
            });
          }
          break;

        case 'LETTER_OF_ENGAGEMENT':
          // Crea/aggiorna lettera incarico
          const existingLettera = await prisma.letteraIncarico.findFirst({
            where: {
              scheduledCourseId: entityId,
              deletedAt: null
            }
          });

          if (existingLettera) {
            await prisma.letteraIncarico.update({
              where: { id: existingLettera.id },
              data: {
                templateId: template.id,
                templateVersion: template.version,
                markers,
                generatedBy: document.generatedBy,
                fileSize: document.fileSize
              }
            });
          }
          break;

        case 'ATTENDANCE_REGISTER':
          // Crea/aggiorna registro presenze
          // entityId per i registri è sessionId, non scheduleId
          const existingRegistro = await prisma.registroPresenze.findFirst({
            where: {
              sessionId: entityId,
              deletedAt: null
            }
          });

          if (existingRegistro) {
            await prisma.registroPresenze.update({
              where: { id: existingRegistro.id },
              data: {
                templateId: template.id,
                templateVersion: template.version,
                markers,
                generatedBy: document.generatedBy,
                fileSize: document.fileSize
              }
            });
          }
          break;
      }
    } catch (error) {
      logger.warn('Errore aggiornamento entità documento', {
        error: error.message,
        entityType,
        entityId
      });
      // Non blocca la generazione se l'aggiornamento fallisce
    }
  }

  /**
   * Elimina documento (soft delete)
   * 
   * @param {number} documentId - ID documento
   * @param {number} tenantId - ID tenant
   * @returns {Promise<void>}
   */
  async deleteDocument(documentId, tenantId) {
    const document = await prisma.generatedDocument.findFirst({
      where: { id: documentId, tenantId }
    });

    if (!document) {
      throw new DocumentGenerationError('Documento non trovato');
    }

    // Soft delete
    await prisma.generatedDocument.update({
      where: { id: documentId },
      data: { deletedAt: new Date() }
    });

    // Elimina file fisico (opzionale)
    try {
      await storageService.deleteFile(document.filepath);
    } catch (error) {
      logger.warn('Errore eliminazione file fisico', {
        error: error.message,
        filepath: document.filepath
      });
    }

    logger.info('Documento eliminato', { documentId });
  }

  /**
   * Ottiene statistiche generazione documenti
   * 
   * @param {number} tenantId - ID tenant
   * @param {Object} filters - Filtri opzionali
   * @returns {Promise<Object>} - Statistiche
   */
  async getStatistics(tenantId, filters = {}) {
    const where = {
      tenantId,
      deletedAt: null,
      ...filters
    };

    const [total, byType, byStatus, totalSize] = await Promise.all([
      prisma.generatedDocument.count({ where }),

      prisma.generatedDocument.groupBy({
        by: ['type'],
        where,
        _count: true
      }),

      prisma.generatedDocument.groupBy({
        by: ['status'],
        where,
        _count: true
      }),

      prisma.generatedDocument.aggregate({
        where,
        _sum: { fileSize: true }
      })
    ]);

    return {
      total,
      byType: Object.fromEntries(
        byType.map(item => [item.type, item._count])
      ),
      byStatus: Object.fromEntries(
        byStatus.map(item => [item.status, item._count])
      ),
      totalSize: totalSize._sum.fileSize || 0,
      totalSizeMB: Math.round((totalSize._sum.fileSize || 0) / 1024 / 1024 * 100) / 100
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Ottiene l'istanza singleton del DocumentService
 * @returns {DocumentService}
 */
function getDocumentService() {
  if (!instance) {
    instance = new DocumentService();
  }
  return instance;
}

export {
  DocumentService,
  DocumentGenerationError,
  getDocumentService
};

export default getDocumentService;
