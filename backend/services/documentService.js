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
        tenantId
      });

      // 1. Carica template
      const template = await this._loadTemplate(templateId, tenantId);

      // 2. Carica dati entità
      const entityData = await this._loadEntityData(
        entityType,
        entityId,
        personId,
        tenantId
      );

      // 3. Build context per marker resolution
      const context = this._buildContext(entityData, template, options);

      // 4. Valida marker nel template
      logger.debug('Template content length:', template.content?.length);
      logger.debug('Options:', JSON.stringify(options));
      
      const validation = this.markerResolver.validateMarkers(template.content);
      logger.debug('Validation result:', JSON.stringify(validation));
      
      if (!validation.isValid) {
        logger.warn('Template validation failed!', { 
          isValid: validation.isValid,
          errorCount: validation.errors?.length || 0,
          warningCount: validation.warnings?.length || 0,
          strict: options.strict,
          templateContentExists: !!template.content
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
      const html = await this.markerResolver.resolve(
        template.content,
        context,
        { strict: options.strict !== false }
      );

      // 6. Applica header/footer se presenti (con marker resolution)
      const fullHtml = await this._buildFullHtml(html, template, context);

      // 7. Genera PDF
      const pdfOptions = this._buildPdfOptions(template);
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
        progressiveNumber
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
      const document = await prisma.generatedDocument.create({
        data: {
          templateId,
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
          generatedBy: userId,
          tenantId
        }
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
  async _loadEntityData(entityType, entityId, personId, tenantId) {
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
          status: schedule.status
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
          topics: schedule.course.topics || ''
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
              name: company.name,
              vatNumber: company.vatNumber || '',
              fiscalCode: company.fiscalCode || '',
              address: {
                street: company.address || '',
                city: company.city || '',
                province: company.province || '',
                postalCode: company.postalCode || '',
                full: company.address ? 
                  `${company.address}, ${company.postalCode} ${company.city} (${company.province})` : 
                  ''
              },
              legalRepresentative: company.legalRepresentative || '',
              email: company.email || '',
              phone: company.phone || ''
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

      default:
        throw new DocumentGenerationError(`Entity type non supportato: ${entityType}`);
    }

    return data;
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
    return {
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
      }
    };
  }

  /**
   * Build HTML completo con header/footer
   * @private
   */
  async _buildFullHtml(content, template, context) {
    const styles = template.styles || {};
    const layout = template.layout || {};

    // Resolve markers in header and footer
    let processedHeader = '';
    let processedFooter = '';

    if (template.header) {
      processedHeader = await this.markerResolver.resolve(
        template.header,
        context,
        { strict: false }
      );
    }

    if (template.footer) {
      processedFooter = await this.markerResolver.resolve(
        template.footer,
        context,
        { strict: false }
      );
    }

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
    
    .page {
      width: 100%;
      padding: ${layout.margins?.top || '2cm'} ${layout.margins?.right || '2cm'} 
              ${layout.margins?.bottom || '2cm'} ${layout.margins?.left || '2cm'};
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin-bottom: 0.5em;
      font-weight: bold;
    }
    
    p {
      margin-bottom: 0.5em;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
    }
    
    table th, table td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    }
    
    table th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    
    ${styles.customCSS || ''}
  </style>
</head>
<body>
  ${processedHeader ? `<header>${processedHeader}</header>` : ''}
  
  <div class="page">
    ${content}
  </div>
  
  ${processedFooter ? `<footer>${processedFooter}</footer>` : ''}
</body>
</html>
    `.trim();
  }

  /**
   * Build opzioni PDF da template
   * @private
   */
  _buildPdfOptions(template) {
    const layout = template.layout || {};
    
    return {
      format: layout.pageSize || 'A4',
      landscape: layout.orientation === 'landscape',
      margin: {
        top: layout.margins?.top || '2cm',
        right: layout.margins?.right || '2cm',
        bottom: layout.margins?.bottom || '2cm',
        left: layout.margins?.left || '2cm'
      },
      printBackground: true,
      preferCSSPageSize: false
    };
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
   */
  _generateFilename(documentType, entityId, personId, progressiveNumber) {
    const timestamp = Date.now();
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
                scheduleId: entityId,
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
              scheduleId: entityId,
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
          const existingRegistro = await prisma.registroPresenze.findFirst({
            where: {
              scheduleId: entityId,
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
