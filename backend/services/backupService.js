/**
 * Backup Service
 * 
 * Gestisce export e import completo del database
 * Supporta:
 * - Export selettivo per entità
 * - Compressione ZIP
 * - Validazione integrità
 * - Restore con merge o overwrite
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import archiver from 'archiver';
import unzipper from 'unzipper';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Definizione entità raggruppate per categoria
const ENTITY_CATEGORIES = {
    core: {
        label: 'Core Business',
        icon: 'Building2',
        entities: [
            { name: 'tenants', model: 'tenant', label: 'Tenant', priority: 1 },
            { name: 'persons', model: 'person', label: 'Persone', priority: 2 },
            { name: 'Company', model: 'company', label: 'Aziende', priority: 3 },
            { name: 'CompanySite', model: 'companySite', label: 'Sedi Aziendali', priority: 4 },
            { name: 'Course', model: 'course', label: 'Corsi', priority: 5 },
            { name: 'CourseSchedule', model: 'courseSchedule', label: 'Programmazioni', priority: 6 },
            { name: 'CourseSession', model: 'courseSession', label: 'Sessioni Corso', priority: 7 },
            { name: 'course_enrollments', model: 'courseEnrollment', label: 'Iscrizioni', priority: 8 },
            { name: 'DVR', model: 'dVR', label: 'DVR', priority: 9 },
            { name: 'Sopralluogo', model: 'sopralluogo', label: 'Sopralluoghi', priority: 10 },
            { name: 'Reparto', model: 'reparto', label: 'Reparti', priority: 11 },
        ]
    },
    cms: {
        label: 'CMS & Contenuti',
        icon: 'FileText',
        entities: [
            { name: 'cms_pages', model: 'cMSPage', label: 'Pagine CMS', priority: 1 },
            { name: 'cms_media', model: 'cMSMedia', label: 'Media Library', priority: 2 },
            { name: 'contact_submissions', model: 'contactSubmission', label: 'Form Submissions', priority: 3 },
        ]
    },
    templates: {
        label: 'Templates & Documenti',
        icon: 'FileCode',
        entities: [
            { name: 'TemplateLink', model: 'templateLink', label: 'Template Documenti', priority: 1 },
            { name: 'TemplateVersion', model: 'templateVersion', label: 'Versioni Template', priority: 2 },
            { name: 'form_templates', model: 'form_templates', label: 'Form Templates', priority: 3 },
            { name: 'form_fields', model: 'form_fields', label: 'Campi Form', priority: 4 },
            { name: 'GeneratedDocument', model: 'generatedDocument', label: 'Documenti Generati', priority: 5, large: true },
            { name: 'attestati', model: 'attestato', label: 'Attestati', priority: 6 },
            { name: 'preventivi', model: 'preventivo', label: 'Preventivi', priority: 7 },
            { name: 'lettere_incarico', model: 'letteraIncarico', label: 'Lettere Incarico', priority: 8 },
            { name: 'registri_presenze', model: 'registroPresenze', label: 'Registri Presenze', priority: 9 },
        ]
    },
    config: {
        label: 'Configurazioni',
        icon: 'Settings',
        entities: [
            { name: 'Permission', model: 'permission', label: 'Permessi', priority: 1 },
            { name: 'custom_roles', model: 'customRole', label: 'Ruoli Custom', priority: 2 },
            { name: 'custom_role_permissions', model: 'customRolePermission', label: 'Permessi Ruoli', priority: 3 },
            { name: 'role_permissions', model: 'rolePermission', label: 'Permessi Base', priority: 4 },
            { name: 'person_roles', model: 'personRole', label: 'Ruoli Persone', priority: 5 },
            { name: 'tenant_configurations', model: 'tenantConfiguration', label: 'Config Tenant', priority: 6 },
            { name: 'advanced_permissions', model: 'advancedPermission', label: 'Permessi Avanzati', priority: 7 },
            { name: 'codici_sconto', model: 'codiceSconto', label: 'Codici Sconto', priority: 8 },
        ]
    },
    audit: {
        label: 'Audit & Log',
        icon: 'ClipboardList',
        entities: [
            { name: 'activity_logs', model: 'activityLog', label: 'Activity Logs', priority: 1, large: true, defaultOff: true },
            { name: 'GdprAuditLog', model: 'gdprAuditLog', label: 'GDPR Audit', priority: 2 },
            { name: 'SecurityAuditLog', model: 'securityAuditLog', label: 'Security Logs', priority: 3, defaultOff: true },
            { name: 'consent_records', model: 'consentRecord', label: 'Consensi GDPR', priority: 4 },
        ]
    },
    relations: {
        label: 'Relazioni & Join',
        icon: 'Link',
        entities: [
            { name: 'ScheduleCompany', model: 'scheduleCompany', label: 'Schedule-Company', priority: 1 },
            { name: 'preventivi_sconti', model: 'preventivoSconto', label: 'Preventivi-Sconti', priority: 2 },
            { name: 'registro_presenze_partecipanti', model: 'registroPresenzePartecipante', label: 'Registro-Partecipanti', priority: 3 },
            { name: 'codici_aziende', model: 'codiceAzienda', label: 'Codici-Aziende', priority: 4 },
            { name: 'codici_corsi', model: 'codiceCorso', label: 'Codici-Corsi', priority: 5 },
            { name: 'codici_persone', model: 'codicePersona', label: 'Codici-Persone', priority: 6 },
            { name: 'fattura_aziende', model: 'fatturaAzienda', label: 'Fatture-Aziende', priority: 7 },
        ]
    }
};

// Entità da escludere sempre (sicurezza)
const EXCLUDED_ENTITIES = [
    'refresh_tokens',
    'person_sessions',
    '_prisma_migrations',
    'GoogleTokens'
];

/**
 * Mappa delle dipendenze tra entità
 * Chiave: entità che dipende
 * Valore: array di entità richieste (nell'ordine di import)
 * 
 * Questa mappa viene usata per:
 * 1. Mostrare warning nel frontend quando si seleziona un'entità senza le sue dipendenze
 * 2. Ordinare correttamente l'import durante il restore
 * 3. Suggerire automaticamente le entità necessarie
 */
const ENTITY_DEPENDENCIES = {
    // Core Business Dependencies
    'CompanySite': ['Company'],
    'Course': ['tenants'],
    'CourseSchedule': ['Course', 'Company', 'persons'],
    'CourseSession': ['CourseSchedule'],
    'course_enrollments': ['CourseSchedule', 'persons'],
    'DVR': ['Company', 'CompanySite'],
    'Sopralluogo': ['Company', 'CompanySite'],
    'Reparto': ['Company', 'CompanySite'],

    // CMS Dependencies
    'cms_pages': ['tenants'],
    'cms_media': ['tenants'],
    'contact_submissions': ['tenants', 'cms_pages'],

    // Templates Dependencies
    'TemplateVersion': ['TemplateLink'],
    'form_fields': ['form_templates'],
    'GeneratedDocument': ['TemplateLink', 'persons'],
    'attestati': ['CourseSchedule', 'course_enrollments', 'persons'],
    'preventivi': ['Course', 'Company', 'persons'],
    'lettere_incarico': ['persons', 'CourseSchedule'],
    'registri_presenze': ['CourseSchedule'],

    // Config Dependencies
    'custom_role_permissions': ['custom_roles', 'Permission'],
    'role_permissions': ['Permission'],
    'person_roles': ['persons'],
    'advanced_permissions': ['persons'],

    // Audit Dependencies (di solito non hanno dipendenze strette)
    'GdprAuditLog': ['persons'],
    'consent_records': ['persons'],

    // Relations Dependencies
    'ScheduleCompany': ['CourseSchedule', 'Company'],
    'preventivi_sconti': ['preventivi', 'codici_sconto'],
    'registro_presenze_partecipanti': ['registri_presenze', 'persons'],
    'codici_aziende': ['codici_sconto', 'Company'],
    'codici_corsi': ['codici_sconto', 'Course'],
    'codici_persone': ['codici_sconto', 'persons'],
    'fattura_aziende': ['preventivi', 'Company']
};

// Campi sensibili da sanitizzare
const SENSITIVE_FIELDS = ['password', 'passwordHash', 'accessToken', 'refreshToken'];

class BackupService {
    constructor() {
        this.backupDir = path.join(process.cwd(), 'backups');
        this.tempDir = path.join(process.cwd(), 'temp');
    }

    /**
     * Ottiene lista entità con conteggi
     */
    async getEntitiesWithCounts(tenantId) {
        const result = {};

        for (const [categoryKey, category] of Object.entries(ENTITY_CATEGORIES)) {
            result[categoryKey] = {
                label: category.label,
                icon: category.icon,
                entities: []
            };

            for (const entity of category.entities) {
                try {
                    const modelName = entity.model;

                    // Verifica se il model esiste in Prisma
                    if (!prisma[modelName]) {
                        logger.warn(`Model ${modelName} non trovato in Prisma`);
                        continue;
                    }

                    // Conta records (con filtro tenant se applicabile)
                    let count = 0;
                    try {
                        // Prova prima con tenantId
                        const hasDeletedAt = await this.modelHasField(modelName, 'deletedAt');
                        const hasTenantId = await this.modelHasField(modelName, 'tenantId');

                        const where = {};
                        if (hasDeletedAt) where.deletedAt = null;
                        if (hasTenantId && tenantId) where.tenantId = tenantId;

                        count = await prisma[modelName].count({ where });
                    } catch (e) {
                        // Se fallisce, conta senza filtri
                        count = await prisma[modelName].count();
                    }

                    result[categoryKey].entities.push({
                        name: entity.name,
                        model: entity.model,
                        label: entity.label,
                        count,
                        large: entity.large || false,
                        defaultOff: entity.defaultOff || false,
                        priority: entity.priority,
                        dependencies: ENTITY_DEPENDENCIES[entity.name] || []
                    });
                } catch (error) {
                    logger.error(`Errore conteggio ${entity.name}:`, error.message);
                }
            }
        }

        return result;
    }

    /**
     * Verifica se un model ha un campo specifico
     */
    async modelHasField(modelName, fieldName) {
        try {
            const model = prisma[modelName];
            if (!model) return false;

            // Prova una query con il campo
            await model.findFirst({
                where: { [fieldName]: undefined },
                take: 0
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Ottiene le dipendenze per un'entità
     */
    getDependencies(entityName) {
        return ENTITY_DEPENDENCIES[entityName] || [];
    }

    /**
     * Ottiene tutte le dipendenze ricorsive per un'entità
     * Ritorna un array ordinato per ordine di import
     */
    getAllDependencies(entityName, visited = new Set()) {
        if (visited.has(entityName)) return [];
        visited.add(entityName);

        const directDeps = this.getDependencies(entityName);
        const allDeps = [];

        for (const dep of directDeps) {
            // Prima aggiungi le dipendenze delle dipendenze
            const subDeps = this.getAllDependencies(dep, new Set(visited));
            for (const subDep of subDeps) {
                if (!allDeps.includes(subDep)) {
                    allDeps.push(subDep);
                }
            }
            // Poi aggiungi la dipendenza diretta
            if (!allDeps.includes(dep)) {
                allDeps.push(dep);
            }
        }

        return allDeps;
    }

    /**
     * Valida le dipendenze per un set di entità selezionate
     * Ritorna oggetto con:
     * - valid: boolean
     * - missing: array di dipendenze mancanti per entità
     * - suggestions: array di entità suggerite da aggiungere
     */
    validateDependencies(selectedEntities) {
        const result = {
            valid: true,
            missing: {},
            suggestions: [],
            warnings: []
        };

        const selectedSet = new Set(selectedEntities);

        for (const entity of selectedEntities) {
            const deps = this.getDependencies(entity);
            const missingDeps = deps.filter(dep => !selectedSet.has(dep));

            if (missingDeps.length > 0) {
                result.valid = false;
                result.missing[entity] = missingDeps;

                // Aggiungi ai suggerimenti
                for (const dep of missingDeps) {
                    if (!result.suggestions.includes(dep)) {
                        result.suggestions.push(dep);
                    }
                }

                // Genera warning leggibile
                const entityInfo = this.findEntityByName(entity);
                const depLabels = missingDeps.map(d => {
                    const depInfo = this.findEntityByName(d);
                    return depInfo ? depInfo.label : d;
                }).join(', ');

                result.warnings.push({
                    entity,
                    label: entityInfo ? entityInfo.label : entity,
                    message: `"${entityInfo?.label || entity}" richiede: ${depLabels}`,
                    missingDeps
                });
            }
        }

        return result;
    }

    /**
     * Ordina le entità per ordine di import corretto (dipendenze prima)
     */
    sortEntitiesForImport(entities) {
        const sorted = [];
        const remaining = [...entities];
        const processedSet = new Set();
        let iterations = 0;
        const maxIterations = entities.length * 2;

        while (remaining.length > 0 && iterations < maxIterations) {
            iterations++;

            for (let i = remaining.length - 1; i >= 0; i--) {
                const entity = remaining[i];
                const deps = this.getDependencies(entity);
                const allDepsProcessed = deps.every(dep =>
                    processedSet.has(dep) || !entities.includes(dep)
                );

                if (allDepsProcessed) {
                    sorted.push(entity);
                    processedSet.add(entity);
                    remaining.splice(i, 1);
                }
            }
        }

        // Se rimangono entità (ciclo), aggiungile comunque
        sorted.push(...remaining);

        return sorted;
    }

    /**
     * Crea backup con entità selezionate
     */
    async createBackup(selectedEntities, options = {}) {
        const { tenantId, includeMedia = false, userId } = options;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = `backup_${timestamp}`;
        const tempPath = path.join(this.tempDir, backupId);

        logger.info(`Creazione backup ${backupId}`, { selectedEntities: selectedEntities.length, tenantId });

        try {
            // Crea directory temp
            await fs.mkdir(tempPath, { recursive: true });
            await fs.mkdir(path.join(tempPath, 'data'), { recursive: true });

            const manifest = {
                id: backupId,
                createdAt: new Date().toISOString(),
                createdBy: userId,
                tenantId,
                version: '1.0.0',
                entities: [],
                totalRecords: 0,
                checksums: {}
            };

            // Export ogni entità selezionata
            for (const entityName of selectedEntities) {
                const entity = this.findEntityByName(entityName);
                if (!entity) {
                    logger.warn(`Entità ${entityName} non trovata, skip`);
                    continue;
                }

                try {
                    const data = await this.exportEntity(entity, tenantId);
                    const filename = `${entityName}.json`;
                    const filePath = path.join(tempPath, 'data', filename);

                    // Sanitizza dati sensibili
                    const sanitizedData = this.sanitizeData(data);

                    // Serializza con formatting consistente
                    const jsonContent = JSON.stringify(sanitizedData, null, 2);
                    await fs.writeFile(filePath, jsonContent);

                    // Calcola checksum sulla stessa stringa scritta nel file
                    const checksum = this.calculateChecksum(jsonContent);

                    manifest.entities.push({
                        name: entityName,
                        model: entity.model,
                        count: data.length,
                        filename
                    });
                    manifest.totalRecords += data.length;
                    manifest.checksums[filename] = checksum;

                    logger.debug(`Esportato ${entityName}: ${data.length} records`);
                } catch (error) {
                    logger.error(`Errore export ${entityName}:`, error.message);
                }
            }

            // Export media files se richiesto
            if (includeMedia) {
                await this.exportMediaFiles(tempPath, manifest);
            }

            // Salva manifest
            await fs.writeFile(
                path.join(tempPath, 'manifest.json'),
                JSON.stringify(manifest, null, 2)
            );

            // Crea ZIP
            await fs.mkdir(this.backupDir, { recursive: true });
            const zipPath = path.join(this.backupDir, `${backupId}.zip`);
            await this.createZip(tempPath, zipPath);

            // Cleanup temp
            await fs.rm(tempPath, { recursive: true });

            // Ottieni dimensione file
            const stats = await fs.stat(zipPath);

            logger.info(`Backup ${backupId} completato`, {
                size: stats.size,
                entities: manifest.entities.length,
                records: manifest.totalRecords
            });

            return {
                id: backupId,
                path: zipPath,
                size: stats.size,
                entities: manifest.entities.length,
                records: manifest.totalRecords,
                createdAt: manifest.createdAt
            };

        } catch (error) {
            // Cleanup in caso di errore
            try {
                await fs.rm(tempPath, { recursive: true });
            } catch { }

            logger.error('Errore creazione backup:', error);
            throw error;
        }
    }

    /**
     * Trova entità per nome
     */
    findEntityByName(name) {
        for (const category of Object.values(ENTITY_CATEGORIES)) {
            const entity = category.entities.find(e => e.name === name);
            if (entity) return entity;
        }
        return null;
    }

    /**
     * Export singola entità
     */
    async exportEntity(entity, tenantId) {
        const modelName = entity.model;

        if (!prisma[modelName]) {
            throw new Error(`Model ${modelName} non trovato`);
        }

        const hasDeletedAt = await this.modelHasField(modelName, 'deletedAt');
        const hasTenantId = await this.modelHasField(modelName, 'tenantId');

        const where = {};
        if (hasDeletedAt) where.deletedAt = null;
        if (hasTenantId && tenantId) where.tenantId = tenantId;

        const data = await prisma[modelName].findMany({ where });
        return data;
    }

    /**
     * Sanitizza dati sensibili
     */
    sanitizeData(data) {
        return data.map(record => {
            const sanitized = { ...record };
            for (const field of SENSITIVE_FIELDS) {
                if (sanitized[field]) {
                    sanitized[field] = '[REDACTED]';
                }
            }
            return sanitized;
        });
    }

    /**
     * Calcola checksum MD5
     */
    calculateChecksum(data) {
        return crypto.createHash('md5').update(data).digest('hex');
    }

    /**
     * Export media files
     */
    async exportMediaFiles(tempPath, manifest) {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const mediaPath = path.join(tempPath, 'media');

        try {
            await fs.mkdir(mediaPath, { recursive: true });

            // Copia uploads
            try {
                const files = await fs.readdir(uploadsDir, { recursive: true });
                let totalSize = 0;

                for (const file of files) {
                    const srcPath = path.join(uploadsDir, file);
                    const destPath = path.join(mediaPath, 'uploads', file);

                    const stat = await fs.stat(srcPath);
                    if (stat.isFile()) {
                        await fs.mkdir(path.dirname(destPath), { recursive: true });
                        await fs.copyFile(srcPath, destPath);
                        totalSize += stat.size;
                    }
                }

                manifest.media = {
                    uploadsSize: totalSize,
                    filesCount: files.filter(f => !f.includes('/')).length
                };
            } catch (e) {
                logger.warn('Uploads directory non trovata o vuota');
            }
        } catch (error) {
            logger.error('Errore export media:', error);
        }
    }

    /**
     * Crea file ZIP
     */
    async createZip(sourceDir, outputPath) {
        return new Promise((resolve, reject) => {
            const output = fsSync.createWriteStream(outputPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => resolve());
            archive.on('error', reject);

            archive.pipe(output);
            archive.directory(sourceDir, false);
            archive.finalize();
        });
    }

    /**
     * Valida file backup
     */
    async validateBackup(zipPath) {
        const tempPath = path.join(this.tempDir, `validate_${Date.now()}`);

        try {
            // Estrai ZIP
            await fs.mkdir(tempPath, { recursive: true });
            await this.extractZip(zipPath, tempPath);

            // Leggi manifest
            const manifestPath = path.join(tempPath, 'manifest.json');
            const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

            // Valida checksums
            const validation = {
                valid: true,
                manifest,
                errors: [],
                warnings: []
            };

            for (const entity of manifest.entities) {
                const filePath = path.join(tempPath, 'data', entity.filename);

                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const checksum = this.calculateChecksum(content);

                    if (manifest.checksums[entity.filename] !== checksum) {
                        validation.errors.push(`Checksum mismatch per ${entity.filename}`);
                        validation.valid = false;
                    }

                    const data = JSON.parse(content);
                    if (data.length !== entity.count) {
                        validation.warnings.push(`Count mismatch per ${entity.name}: atteso ${entity.count}, trovato ${data.length}`);
                    }
                } catch (e) {
                    validation.errors.push(`Errore lettura ${entity.filename}: ${e.message}`);
                    validation.valid = false;
                }
            }

            // Cleanup
            await fs.rm(tempPath, { recursive: true });

            return validation;

        } catch (error) {
            try {
                await fs.rm(tempPath, { recursive: true });
            } catch { }

            throw error;
        }
    }

    /**
     * Estrai ZIP
     */
    async extractZip(zipPath, destPath) {
        return new Promise((resolve, reject) => {
            fsSync.createReadStream(zipPath)
                .pipe(unzipper.Extract({ path: destPath }))
                .on('close', resolve)
                .on('error', reject);
        });
    }

    /**
     * Preview contenuto backup
     */
    async previewBackup(zipPath) {
        const validation = await this.validateBackup(zipPath);

        return {
            valid: validation.valid,
            manifest: validation.manifest,
            entities: validation.manifest.entities,
            totalRecords: validation.manifest.totalRecords,
            createdAt: validation.manifest.createdAt,
            errors: validation.errors,
            warnings: validation.warnings
        };
    }

    /**
     * Restore backup
     */
    async restoreBackup(zipPath, options = {}) {
        const {
            selectedEntities = null, // null = tutte
            overwrite = false,
            tenantId,
            userId
        } = options;

        const tempPath = path.join(this.tempDir, `restore_${Date.now()}`);

        logger.info('Avvio restore backup', { zipPath, overwrite, tenantId });

        try {
            // Valida prima
            const validation = await this.validateBackup(zipPath);
            if (!validation.valid) {
                throw new Error(`Backup non valido: ${validation.errors.join(', ')}`);
            }

            // Estrai
            await fs.mkdir(tempPath, { recursive: true });
            await this.extractZip(zipPath, tempPath);

            const manifest = validation.manifest;
            const results = {
                success: [],
                errors: [],
                skipped: []
            };

            // Filtra entità da ripristinare
            const entitiesToRestore = selectedEntities
                ? manifest.entities.filter(e => selectedEntities.includes(e.name))
                : manifest.entities;

            // Ordina per priorità (relazioni dopo entità principali)
            const sortedEntities = this.sortEntitiesForRestore(entitiesToRestore);

            // Restore ogni entità
            for (const entity of sortedEntities) {
                try {
                    const filePath = path.join(tempPath, 'data', entity.filename);
                    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

                    const restored = await this.restoreEntity(entity, data, { overwrite, tenantId });

                    results.success.push({
                        name: entity.name,
                        imported: restored.imported,
                        updated: restored.updated,
                        skipped: restored.skipped
                    });

                    logger.info(`Ripristinato ${entity.name}`, restored);
                } catch (error) {
                    logger.error(`Errore restore ${entity.name}:`, error.message);
                    results.errors.push({
                        name: entity.name,
                        error: error.message
                    });
                }
            }

            // Restore media se presente
            const mediaPath = path.join(tempPath, 'media', 'uploads');
            try {
                await fs.access(mediaPath);
                await this.restoreMediaFiles(mediaPath);
                results.mediaRestored = true;
            } catch {
                results.mediaRestored = false;
            }

            // Cleanup
            await fs.rm(tempPath, { recursive: true });

            // Log audit
            logger.info('Restore completato', results);

            return results;

        } catch (error) {
            try {
                await fs.rm(tempPath, { recursive: true });
            } catch { }

            logger.error('Errore restore backup:', error);
            throw error;
        }
    }

    /**
     * Ordina entità per restore (dipendenze prima)
     */
    sortEntitiesForRestore(entities) {
        const priority = {
            // Prima le entità base
            'tenants': 1,
            'Permission': 2,
            'custom_roles': 3,
            'persons': 4,
            'Company': 5,
            'CompanySite': 6,
            'Course': 7,
            'CourseSchedule': 8,
            // Poi le relazioni
            'person_roles': 20,
            'ScheduleCompany': 21,
            // Infine i dati dipendenti
            'cms_pages': 30,
            'TemplateLink': 31,
        };

        return [...entities].sort((a, b) => {
            const pa = priority[a.name] || 50;
            const pb = priority[b.name] || 50;
            return pa - pb;
        });
    }

    /**
     * Restore singola entità
     */
    async restoreEntity(entity, data, options) {
        const { overwrite, tenantId } = options;
        const modelName = entity.model;

        if (!prisma[modelName]) {
            throw new Error(`Model ${modelName} non trovato`);
        }

        const results = { imported: 0, updated: 0, skipped: 0 };

        for (const record of data) {
            try {
                // Rimuovi campi redacted
                const cleanRecord = this.cleanRedactedFields(record);

                // Sovrascrivi tenantId se specificato
                if (tenantId && cleanRecord.tenantId) {
                    cleanRecord.tenantId = tenantId;
                }

                // Controlla se esiste
                const existing = await prisma[modelName].findUnique({
                    where: { id: cleanRecord.id }
                });

                if (existing) {
                    if (overwrite) {
                        await prisma[modelName].update({
                            where: { id: cleanRecord.id },
                            data: cleanRecord
                        });
                        results.updated++;
                    } else {
                        results.skipped++;
                    }
                } else {
                    await prisma[modelName].create({
                        data: cleanRecord
                    });
                    results.imported++;
                }
            } catch (error) {
                logger.warn(`Errore import record ${entity.name}:`, error.message);
                results.skipped++;
            }
        }

        return results;
    }

    /**
     * Rimuovi campi redacted
     */
    cleanRedactedFields(record) {
        const cleaned = { ...record };
        for (const [key, value] of Object.entries(cleaned)) {
            if (value === '[REDACTED]') {
                delete cleaned[key];
            }
        }
        return cleaned;
    }

    /**
     * Restore media files
     */
    async restoreMediaFiles(sourcePath) {
        const uploadsDir = path.join(process.cwd(), 'uploads');

        try {
            const files = await fs.readdir(sourcePath, { recursive: true });

            for (const file of files) {
                const srcPath = path.join(sourcePath, file);
                const destPath = path.join(uploadsDir, file);

                const stat = await fs.stat(srcPath);
                if (stat.isFile()) {
                    await fs.mkdir(path.dirname(destPath), { recursive: true });
                    await fs.copyFile(srcPath, destPath);
                }
            }

            logger.info(`Ripristinati ${files.length} media files`);
        } catch (error) {
            logger.error('Errore restore media:', error);
        }
    }

    /**
     * Lista backup esistenti
     */
    async listBackups() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            const files = await fs.readdir(this.backupDir);

            const backups = [];
            for (const file of files) {
                if (file.endsWith('.zip')) {
                    const filePath = path.join(this.backupDir, file);
                    const stats = await fs.stat(filePath);

                    // Prova a leggere manifest
                    try {
                        const preview = await this.previewBackup(filePath);
                        backups.push({
                            id: file.replace('.zip', ''),
                            filename: file,
                            size: stats.size,
                            createdAt: preview.manifest.createdAt,
                            entities: preview.manifest.entities.length,
                            records: preview.manifest.totalRecords
                        });
                    } catch {
                        backups.push({
                            id: file.replace('.zip', ''),
                            filename: file,
                            size: stats.size,
                            createdAt: stats.mtime.toISOString(),
                            entities: 0,
                            records: 0,
                            corrupted: true
                        });
                    }
                }
            }

            return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (error) {
            logger.error('Errore lista backup:', error);
            return [];
        }
    }

    /**
     * Elimina backup
     */
    async deleteBackup(backupId) {
        const filePath = path.join(this.backupDir, `${backupId}.zip`);

        try {
            await fs.unlink(filePath);
            logger.info(`Backup ${backupId} eliminato`);
            return true;
        } catch (error) {
            logger.error(`Errore eliminazione backup ${backupId}:`, error);
            throw error;
        }
    }

    /**
     * Ottieni path backup per download
     */
    getBackupPath(backupId) {
        return path.join(this.backupDir, `${backupId}.zip`);
    }
}

export default new BackupService();
export { ENTITY_CATEGORIES };
