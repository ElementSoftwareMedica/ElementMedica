/**
 * TariffarioAziendaleService
 * 
 * Service per la gestione dei Tariffari Aziende - Medicina del Lavoro
 * P59 Sprint 11: Nuovo design M2M - tariffari unici associati a più aziende
 * 
 * @module services/management/TariffarioAziendaleService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import pdfService from '../pdfService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';

// P59: Usa __dirname equivalente per moduli ES (più affidabile di process.cwd())
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root public del progetto (per accesso loghi in PDF Puppeteer)
const PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'public');

/**
 * Converte un path relativo /uploads/... in data-URL base64
 * Necessario per Puppeteer (accesso locale) e per URL assolute (fetch)
 */
function logoToDataUrl(rawPath) {
    if (!rawPath) return '';
    if (rawPath.startsWith('data:')) return rawPath;

    let effectivePath = rawPath;
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
        try {
            const url = new URL(rawPath);
            const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0';
            if (isLocal) { effectivePath = url.pathname; } else { return rawPath; }
        } catch { return rawPath; }
    }

    const relativePath = effectivePath.startsWith('/') ? effectivePath : '/' + effectivePath;
    const cleanPath = effectivePath.startsWith('/') ? effectivePath.slice(1) : effectivePath;
    const BACKEND_DIR = path.join(__dirname, '..', '..');
    const PROJECT_ROOT = path.join(BACKEND_DIR, '..');
    const candidates = [
        path.join(PUBLIC_DIR, relativePath),
        path.join(BACKEND_DIR, cleanPath),
        path.join(BACKEND_DIR, 'public', cleanPath),
        path.join(PROJECT_ROOT, 'public', cleanPath),
        path.join(PROJECT_ROOT, cleanPath),
        path.join(__dirname, '..', '..', '..', 'uploads', path.basename(rawPath))
    ];
    // Security: resolve candidates and verify they stay within allowed directories
    const allowedRoots = [BACKEND_DIR, PROJECT_ROOT].map(d => path.resolve(d));
    for (const filePath of candidates) {
        const resolved = path.resolve(filePath);
        if (!allowedRoots.some(root => resolved.startsWith(root + path.sep) || resolved === root)) continue;
        if (fs.existsSync(resolved)) {
            try {
                const data = fs.readFileSync(resolved);
                const ext = resolved.split('.').pop().toLowerCase();
                const mime = ext === 'png' ? 'image/png'
                    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                        : ext === 'svg' ? 'image/svg+xml'
                            : ext === 'webp' ? 'image/webp'
                                : 'image/png';
                return `data:${mime};base64,${data.toString('base64')}`;
            } catch { continue; }
        }
    }
    return '';
}

function resolveFirstValidLogo(...paths) {
    for (const p of paths) {
        if (!p) continue;
        const result = logoToDataUrl(p);
        if (result.startsWith('data:')) return result;
    }
    return '';
}


// Labels per i tipi di voce
const TIPO_VOCE_LABELS = {
    PRESTAZIONE: 'Prestazione MDL',
    QUESTIONARIO: 'Questionario / Modulo MDL',
    CONSULENZA: 'Consulenza',
    SPESA_FISSA: 'Spesa Una Tantum',
    SPESA_RICORRENTE: 'Spesa Ricorrente',
    SOPRALLUOGO_MC: 'Sopralluogo MC',
    SOPRALLUOGO_RSPP: 'Sopralluogo RSPP',
    DVR_NUOVO: 'Nuovo DVR',
    DVR_AGGIORNAMENTO_CON_MODIFICHE: 'Agg. DVR (con modifiche)',
    DVR_AGGIORNAMENTO_SENZA_MODIFICHE: 'Agg. DVR (senza modifiche)',
    NOMINA_MC: 'Nomina MC',
    NOMINA_RSPP: 'Nomina RSPP',
    USCITA_MC: 'Uscita MC',
};

// Abbreviazioni per i tipi di voce (per PDF compatto)
const TIPO_VOCE_ABBR = {
    PRESTAZIONE: 'PREST',
    QUESTIONARIO: 'QUEST',
    CONSULENZA: 'CONS',
    SPESA_FISSA: 'FISSA',
    SPESA_RICORRENTE: 'RIC.',
    SOPRALLUOGO_MC: 'SOPR.MC',
    SOPRALLUOGO_RSPP: 'SOPR.R',
    DVR_NUOVO: 'DVR-N',
    DVR_AGGIORNAMENTO_CON_MODIFICHE: 'DVR-CM',
    DVR_AGGIORNAMENTO_SENZA_MODIFICHE: 'DVR-SM',
    NOMINA_MC: 'NOM.MC',
    NOMINA_RSPP: 'NOM.R',
    USCITA_MC: 'USC.MC',
};

// Labels per frequenza
const FREQUENZA_LABELS = {
    UNA_TANTUM: 'Una tantum',
    PER_VISITA: 'Per visita',
    PER_DIPENDENTE: 'Per dipendente',
    MENSILE: 'Mensile',
    TRIMESTRALE: 'Trimestrale',
    SEMESTRALE: 'Semestrale',
    ANNUALE: 'Annuale',
    SECONDO_SORVEGLIANZA: 'Da protocollo'
};

// Abbreviazioni per frequenza (per PDF compatto)
const FREQUENZA_ABBR = {
    UNA_TANTUM: '1x',
    PER_VISITA: '/vis',
    PER_DIPENDENTE: '/dip',
    MENSILE: 'Mens.',
    TRIMESTRALE: 'Trim.',
    SEMESTRALE: 'Sem.',
    ANNUALE: 'Ann.',
    SECONDO_SORVEGLIANZA: 'Prot.'
};

// Labels per unità di calcolo
const UNITA_CALCOLO_LABELS = {
    FLAT: 'Fisso',
    PER_DIPENDENTE: 'Per dip.',
    PER_SEDE: 'Per sede',
    PER_VISITA: 'Per visita'
};

// Abbreviazioni per unità di calcolo (per PDF compatto)
const UNITA_ABBR = {
    FLAT: 'Fisso',
    PER_DIPENDENTE: '/dip',
    PER_SEDE: '/sede',
    PER_VISITA: '/vis'
};

// P59: Tipi voce che supportano il compenso professionista (medico/MC/RSPP).
// DEVE restare allineato con TIPI_VOCE_CON_COMPENSO nel frontend
// (src/services/tariffarioAziendaleApi.ts): PRESTAZIONE, QUESTIONARIO e USCITA_MC
// prevedono il compenso al medico competente che va persistito su create/update.
const TIPI_VOCE_CON_COMPENSO = [
    'PRESTAZIONE',
    'QUESTIONARIO',
    'SOPRALLUOGO_MC',
    'SOPRALLUOGO_RSPP',
    'DVR_NUOVO',
    'DVR_AGGIORNAMENTO_CON_MODIFICHE',
    'DVR_AGGIORNAMENTO_SENZA_MODIFICHE',
    'NOMINA_MC',
    'NOMINA_RSPP',
    'CONSULENZA',
    'USCITA_MC',
];

// CSS class per badge tipo
const TIPO_BADGE_CLASSES = {
    PRESTAZIONE: 'tipo-prestazione',
    QUESTIONARIO: 'tipo-questionario',
    CONSULENZA: 'tipo-consulenza',
    SPESA_FISSA: 'tipo-spesa-fissa',
    SPESA_RICORRENTE: 'tipo-spesa-ricorrente',
    SOPRALLUOGO_MC: 'tipo-sopralluogo',
    SOPRALLUOGO_RSPP: 'tipo-sopralluogo',
    DVR_NUOVO: 'tipo-dvr',
    DVR_AGGIORNAMENTO_CON_MODIFICHE: 'tipo-dvr',
    DVR_AGGIORNAMENTO_SENZA_MODIFICHE: 'tipo-dvr',
    NOMINA_MC: 'tipo-nomina',
    NOMINA_RSPP: 'tipo-nomina',
};

// Labels per categorie visita MDL (P58/P59 - CategoriaVisitaMDL enum)
const CATEGORIA_VISITA_LABELS = {
    PREVENTIVA: 'Preventiva',
    PERIODICA: 'Periodica',
    DOPO_ASSENZA: 'Dopo Assenza',
    STRAORDINARIA: 'Straordinaria',
};

// Ordine canonico delle categorie visita MDL
const VISITA_MDL_CATEGORIES_ORDER = ['PREVENTIVA', 'PERIODICA', 'DOPO_ASSENZA', 'STRAORDINARIA'];

/**
 * P59 Sprint 11: Include standard per le query dei tariffari
 * Rimosso pattern clone, usa relazione M2M con companyAssociations
 * NOTA: Lo schema usa snake_case per i nomi delle relazioni (db pull)
 */
const tariffarioInclude = {
    convenzione: {
        select: {
            id: true,
            codice: true,
            nome: true
        }
    },
    // P59 Sprint 11.1: Include associazioni M2M con successore specifico per azienda
    companyAssociations: {
        where: { deletedAt: null },
        select: {
            id: true,
            validoDa: true,
            validoA: true,
            attivo: true,
            note: true,
            // P59 Sprint 11.1: Successore specifico per questa associazione azienda
            successoreAssociationId: true,
            successoreAssociation: {
                select: {
                    id: true,
                    tariffario: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            validoDa: true
                        }
                    }
                }
            },
            predecessoreAssociation: {
                select: {
                    id: true,
                    tariffario: {
                        select: {
                            id: true,
                            codice: true,
                            nome: true,
                            validoA: true
                        }
                    }
                }
            },
            companyTenantProfile: {
                select: {
                    id: true,
                    company: {
                        select: {
                            id: true,
                            ragioneSociale: true,
                            piva: true
                        }
                    }
                }
            }
        }
    },
    voci: {
        where: { deletedAt: null },
        include: {
            prestazione: {
                select: {
                    id: true,
                    codice: true,
                    nome: true,
                    tipo: true,
                    prezzoBase: true,
                    durataPrevista: true
                }
            },
            documentoTemplate: {
                select: {
                    id: true,
                    codice: true,
                    nome: true,
                    tipo: true
                }
            },
            fasceDipendenti: {
                where: { deletedAt: null },
                orderBy: { minDipendenti: 'asc' }
            }
        },
        orderBy: { ordine: 'asc' }
    },
    _count: {
        select: {
            voci: { where: { deletedAt: null } },
            companyAssociations: { where: { deletedAt: null } }  // P59 Sprint 11.2: M2M count
        }
    }
};

/**
 * TariffarioAziendaleService
 */
const TariffarioAziendaleService = {
    /**
     * Lista tutti i tariffari con filtri
     * @param {string[]|null} tenantIds - Array of tenant IDs to filter by, or null for all tenants
     * @param {object} filters - Additional filters
     */
    async getAll(tenantIds, filters = {}) {
        // P49: Frontend sends companyId which is actually companyTenantProfileId
        const { tipo, companyId, convenzioneId, attivo, search, page = 1, limit = 20 } = filters;

        // Build tenant filter
        let tenantFilter = {};
        if (Array.isArray(tenantIds)) {
            tenantFilter = { tenantId: { in: tenantIds } };
        } else if (typeof tenantIds === 'string') {
            tenantFilter = { tenantId: tenantIds };
        }
        // null = no tenant filter (admin mode)

        // P59 Sprint 11: Rimosso tipo e companyId - tutti i tariffari sono template
        const where = {
            ...tenantFilter,
            deletedAt: null,
            ...(convenzioneId && { convenzioneId }),
            ...(attivo !== undefined && { attivo }),
            ...(search && {
                OR: [
                    { codice: { contains: search, mode: 'insensitive' } },
                    { nome: { contains: search, mode: 'insensitive' } },
                    { descrizione: { contains: search, mode: 'insensitive' } }
                ]
            })
        };

        const [tariffari, total] = await Promise.all([
            prisma.tariffarioAziendale.findMany({
                where,
                include: {
                    convenzione: { select: { id: true, codice: true, nome: true } },
                    // P59 Sprint 11: Conta aziende associate tramite relazione M2M
                    _count: {
                        select: {
                            voci: { where: { deletedAt: null } },
                            companyAssociations: { where: { deletedAt: null, attivo: true } }
                        }
                    }
                },
                orderBy: [{ nome: 'asc' }],
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.tariffarioAziendale.count({ where })
        ]);

        return {
            data: tariffari,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Ottiene un tariffario per ID con tutte le voci
     */
    /**
     * Ottiene un tariffario per ID
     * @param {string} id - ID del tariffario
     * @param {string[]|string|null} tenantIds - Array di tenant IDs, singolo tenantId, o null per tutti
     */
    async getById(id, tenantIds) {
        // Build tenant filter
        let tenantFilter = {};
        if (Array.isArray(tenantIds)) {
            tenantFilter = { tenantId: { in: tenantIds } };
        } else if (typeof tenantIds === 'string') {
            tenantFilter = { tenantId: tenantIds };
        }
        // null = no tenant filter (admin viewing all)

        const tariffario = await prisma.tariffarioAziendale.findFirst({
            where: { id, ...tenantFilter, deletedAt: null },
            include: tariffarioInclude
        });

        if (!tariffario) {
            throw new Error('Tariffario non trovato');
        }

        return tariffario;
    },

    /**
     * P59 Sprint 11: Crea un nuovo tariffario (template)
     */
    async create(data, tenantId, createdBy) {
        const {
            codice,
            nome,
            descrizione,
            convenzioneId,
            validoDa,
            validoA,
            attivo = true,
            note,
            voci = []
        } = data;

        // Verifica codice univoco
        const existing = await prisma.tariffarioAziendale.findFirst({
            where: { tenantId, codice, deletedAt: null }
        });
        if (existing) {
            throw new Error(`Esiste già un tariffario con codice "${codice}"`);
        }

        // P59 Sprint 11: Crea tariffario (template unico, senza tipo o companyId)
        const tariffario = await prisma.tariffarioAziendale.create({
            data: {
                codice,
                nome,
                descrizione,
                convenzioneId,
                validoDa: validoDa ? new Date(validoDa) : new Date(),
                validoA: validoA ? new Date(validoA) : null,
                attivo,
                note,
                tenantId,
                createdBy,
                voci: {
                    create: voci.map((voce, index) => ({
                        tipo: voce.tipo,
                        prestazioneId: voce.tipo === 'PRESTAZIONE' ? voce.prestazioneId : null,
                        nome: voce.tipo !== 'PRESTAZIONE' ? voce.nome : null,
                        descrizione: voce.descrizione,
                        prezzoBase: voce.prezzoBase,
                        ivaAliquota: voce.ivaAliquota || 22,
                        frequenza: voce.frequenza || 'UNA_TANTUM',
                        usaFasceDipendenti: voce.usaFasceDipendenti || false,
                        ordine: voce.ordine ?? index,
                        attivo: voce.attivo ?? true,
                        note: voce.note,
                        tenantId,
                        fasceDipendenti: voce.usaFasceDipendenti && voce.fasceDipendenti ? {
                            create: voce.fasceDipendenti.map(fascia => ({
                                minDipendenti: fascia.minDipendenti,
                                maxDipendenti: fascia.maxDipendenti,
                                prezzo: fascia.prezzo,
                                descrizione: fascia.descrizione,
                                tenantId
                            }))
                        } : undefined
                    }))
                }
            },
            include: tariffarioInclude
        });

        logger.info({ tariffarioId: tariffario.id, codice, tenantId }, 'Tariffario aziendale creato');
        return tariffario;
    },

    /**
     * Aggiorna un tariffario
     */
    async update(id, data, tenantId) {
        const tariffario = await prisma.tariffarioAziendale.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!tariffario) {
            throw new Error('Tariffario non trovato');
        }

        // P59 Sprint 11.1: Rimosso successoreId (ora è su TariffarioCompanyAssociation)
        const {
            codice,
            nome,
            descrizione,
            convenzioneId,
            validoDa,
            validoA,
            attivo,
            note
        } = data;

        // Se cambia codice, verifica unicità
        if (codice && codice !== tariffario.codice) {
            const existing = await prisma.tariffarioAziendale.findFirst({
                where: { tenantId, codice, deletedAt: null, id: { not: id } }
            });
            if (existing) {
                throw new Error(`Esiste già un tariffario con codice "${codice}"`);
            }
        }

        // P59 Sprint 11: Aggiorna tariffario (rimosso cambio tipo)
        const updated = await prisma.tariffarioAziendale.update({
            where: { id },
            data: {
                ...(codice && { codice }),
                ...(nome && { nome }),
                ...(descrizione !== undefined && { descrizione }),
                ...(convenzioneId !== undefined && { convenzioneId }),
                ...(validoDa && { validoDa: new Date(validoDa) }),
                ...(validoA !== undefined && { validoA: validoA ? new Date(validoA) : null }),
                ...(attivo !== undefined && { attivo }),
                ...(note !== undefined && { note })
                // P59 Sprint 11.1: successoreId è ora gestito su TariffarioCompanyAssociation
            },
            include: tariffarioInclude
        });

        logger.info({ tariffarioId: id, tenantId }, 'Tariffario aziendale aggiornato');
        return updated;
    },

    /**
     * Soft delete di un tariffario
     */
    async delete(id, tenantId) {
        const tariffario = await prisma.tariffarioAziendale.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                // P59 Sprint 11: Verifica associazioni M2M invece di cloni
                companyAssociations: { where: { deletedAt: null }, select: { id: true } }
            }
        });

        if (!tariffario) {
            throw new Error('Tariffario non trovato');
        }

        // Non eliminare se ha associazioni attive
        if (tariffario.companyAssociations.length > 0) {
            throw new Error('Non è possibile eliminare un tariffario con aziende associate. Rimuovi prima le associazioni.');
        }

        await prisma.$transaction([
            // Soft delete fasce
            prisma.fasciaDipendentiPrezzo.updateMany({
                where: {
                    voceTariffario: { tariffarioAziendaleId: id },
                    deletedAt: null
                },
                data: { deletedAt: new Date() }
            }),
            // Soft delete voci
            prisma.voceTariffario.updateMany({
                where: { tariffarioAziendaleId: id, deletedAt: null },
                data: { deletedAt: new Date() }
            }),
            // Soft delete tariffario
            prisma.tariffarioAziendale.update({
                where: { id },
                data: { deletedAt: new Date() }
            })
        ]);

        logger.info({ tariffarioId: id, tenantId }, 'Tariffario aziendale eliminato');
        return { success: true };
    },

    /**
     * Clona un tariffario esistente (con tutte le voci e fasce dipendenti).
     * Il clone parte come non-attivo con codice suffisso "_COPIA".
     */
    async clone(sourceId, tenantId, createdBy) {
        // Carica sorgente con voci e fasce
        const source = await prisma.tariffarioAziendale.findFirst({
            where: { id: sourceId, tenantId, deletedAt: null },
            include: {
                voci: {
                    where: { deletedAt: null },
                    include: { fasceDipendenti: { where: { deletedAt: null } } },
                    orderBy: { ordine: 'asc' }
                }
            }
        });
        if (!source) throw new Error('Tariffario sorgente non trovato');

        // Genera codice univoco (aggiunge _COPIA, poi _COPIA_2 ecc.)
        const baseCode = `${source.codice}_COPIA`;
        let finalCodice = baseCode;
        let counter = 1;
        while (true) {
            const exists = await prisma.tariffarioAziendale.findFirst({
                where: { tenantId, codice: finalCodice, deletedAt: null }
            });
            if (!exists) break;
            finalCodice = `${baseCode}_${counter}`;
            counter++;
        }

        const nuovo = await prisma.tariffarioAziendale.create({
            data: {
                codice: finalCodice,
                nome: `${source.nome} (Copia)`,
                descrizione: source.descrizione,
                convenzioneId: source.convenzioneId,
                validoDa: source.validoDa,
                validoA: source.validoA,
                attivo: false, // partenza non-attivo
                note: source.note,
                tenantId,
                createdBy,
                voci: {
                    create: source.voci.map((voce, index) => ({
                        tipo: voce.tipo,
                        prestazioneId: voce.prestazioneId,
                        documentoTemplateId: voce.documentoTemplateId,
                        nome: voce.nome,
                        descrizione: voce.descrizione,
                        prezzoBase: voce.prezzoBase,
                        ivaAliquota: voce.ivaAliquota,
                        frequenza: voce.frequenza,
                        unitaCalcolo: voce.unitaCalcolo,
                        modalitaAttivazione: voce.modalitaAttivazione,
                        usaFasceDipendenti: voce.usaFasceDipendenti,
                        ordine: voce.ordine ?? index,
                        attivo: voce.attivo,
                        note: voce.note,
                        categoriaVisita: voce.categoriaVisita,
                        durataMinimaMinuti: voce.durataMinimaMinuti,
                        compensoProfessionistaTipo: voce.compensoProfessionistaTipo,
                        compensoProfessionistaValore: voce.compensoProfessionistaValore,
                        compensoProfessionistaMinimo: voce.compensoProfessionistaMinimo,
                        compensoProfessionistaMassimo: voce.compensoProfessionistaMassimo,
                        tenantId,
                        fasceDipendenti: voce.usaFasceDipendenti && voce.fasceDipendenti?.length > 0 ? {
                            create: voce.fasceDipendenti.map(f => ({
                                minDipendenti: f.minDipendenti,
                                maxDipendenti: f.maxDipendenti,
                                prezzo: f.prezzo,
                                descrizione: f.descrizione,
                                tenantId
                            }))
                        } : undefined
                    }))
                }
            },
            include: tariffarioInclude
        });

        logger.info({ sourceId, nuovoId: nuovo.id, codice: finalCodice, tenantId }, 'Tariffario clonato');
        return nuovo;
    },

    // =============================================
    // P59 Sprint 11: ASSOCIAZIONE TARIFFARIO-AZIENDA (M2M)
    // =============================================

    /**
     * Associa un tariffario a un'azienda (crea record nella tabella pivot)
     * Un tariffario può essere associato a multiple aziende senza creare copie
     * 
     * P59 Sprint 11.2: Se l'azienda ha già un tariffario attivo diverso,
     * lo chiude automaticamente impostando validoA e attivo=false
     * 
     * @param {string} tariffarioId - ID del tariffario da associare
     * @param {string} companyTenantProfileId - ID del CompanyTenantProfile
     * @param {string} tenantId - Tenant corrente
     * @param {object} data - Dati opzionali (validoDa, validoA, note)
     */
    async associate(tariffarioId, companyTenantProfileId, tenantId, data = {}) {
        const { validoDa, validoA, note } = data;
        const now = new Date();
        const effectiveValidoDa = validoDa ? new Date(validoDa) : now;

        // Verifica che il tariffario esista e appartenga al tenant
        const tariffario = await prisma.tariffarioAziendale.findFirst({
            where: { id: tariffarioId, tenantId, deletedAt: null }
        });
        if (!tariffario) {
            throw new Error('Tariffario non trovato');
        }

        // Verifica che l'azienda esista e appartenga al tenant
        const company = await prisma.companyTenantProfile.findFirst({
            where: { id: companyTenantProfileId, tenantId, deletedAt: null },
            include: { company: true }
        });
        if (!company) {
            throw new Error('Azienda non trovata');
        }

        // P59 Sprint 11.2: Gestisci ri-associazione e aggiornamento
        // Se esiste già un'associazione per lo STESSO tariffario, aggiornala invece di crearne una nuova
        const existingAssociation = await prisma.tariffarioCompanyAssociation.findFirst({
            where: {
                tariffarioId,
                companyTenantProfileId,
                deletedAt: null
            }
        });

        // Se esiste un'associazione esistente (attiva o meno), aggiornala
        if (existingAssociation) {
            // Prima chiudi eventuali altre associazioni attive
            // Se il successore parte nel futuro, tieni attivo il predecessore fino a validoA
            const closingDate = new Date(effectiveValidoDa.getTime() - 1000);
            const predecessorStillActive = effectiveValidoDa > now;
            await prisma.tariffarioCompanyAssociation.updateMany({
                where: {
                    companyTenantProfileId,
                    attivo: true,
                    deletedAt: null,
                    tariffarioId: { not: tariffarioId }
                },
                data: {
                    attivo: predecessorStillActive ? true : false,
                    validoA: closingDate,
                    updatedAt: now
                }
            });

            // Aggiorna l'associazione esistente
            const updated = await prisma.tariffarioCompanyAssociation.update({
                where: { id: existingAssociation.id, deletedAt: null },
                data: {
                    validoDa: effectiveValidoDa,
                    validoA: validoA ? new Date(validoA) : null,
                    attivo: true,
                    note: note || existingAssociation.note,
                    updatedAt: now
                },
                include: {
                    tariffario: {
                        include: {
                            convenzione: true,
                            voci: {
                                where: { deletedAt: null },
                                orderBy: { ordine: 'asc' }
                            },
                            _count: { select: { companyAssociations: { where: { deletedAt: null } } } }
                        }
                    },
                    companyTenantProfile: {
                        include: { company: true }
                    }
                }
            });

            logger.info({
                associationId: updated.id,
                tariffarioId,
                companyTenantProfileId,
                action: 'updated',
                tenantId
            }, 'Associazione tariffario aggiornata (M2M)');

            return updated;
        }

        // P59 Sprint 11.2: Chiudi automaticamente le associazioni attive con ALTRI tariffari
        // Questo garantisce un solo tariffario attivo per azienda alla volta
        const activeOtherAssociations = await prisma.tariffarioCompanyAssociation.findMany({
            where: {
                companyTenantProfileId,
                attivo: true,
                deletedAt: null,
                tariffarioId: { not: tariffarioId }  // Solo altri tariffari
            },
            include: {
                tariffario: { select: { nome: true, codice: true } }
            }
        });

        // Chiudi tutte le associazioni attive con altri tariffari
        // Se il successore parte nel futuro, tieni attivo il predecessore fino a validoA
        if (activeOtherAssociations.length > 0) {
            const closingDate = new Date(effectiveValidoDa.getTime() - 1000); // 1 secondo prima del nuovo
            const predecessorStillActive = effectiveValidoDa > now;
            await prisma.tariffarioCompanyAssociation.updateMany({
                where: {
                    id: { in: activeOtherAssociations.map(a => a.id) }
                },
                data: {
                    attivo: predecessorStillActive ? true : false,
                    validoA: closingDate,
                    updatedAt: now
                }
            });

            logger.info({
                companyTenantProfileId,
                closedAssociations: activeOtherAssociations.map(a => ({
                    id: a.id,
                    tariffarioNome: a.tariffario?.nome
                })),
                newTariffarioId: tariffarioId
            }, 'Chiuse associazioni tariffario precedenti per nuova associazione');
        }

        // Crea l'associazione nella tabella pivot
        const association = await prisma.tariffarioCompanyAssociation.create({
            data: {
                tariffarioId,
                companyTenantProfileId,
                tenantId,
                validoDa: effectiveValidoDa,
                validoA: validoA ? new Date(validoA) : null,
                attivo: true,
                note: note || null
            },
            include: {
                tariffario: {
                    include: {
                        convenzione: true,
                        voci: {
                            where: { deletedAt: null },
                            orderBy: { ordine: 'asc' }
                        },
                        _count: { select: { companyAssociations: { where: { deletedAt: null } } } }
                    }
                },
                companyTenantProfile: {
                    include: { company: true }
                }
            }
        });

        logger.info({
            associationId: association.id,
            tariffarioId,
            companyTenantProfileId,
            companyName: company.company.ragioneSociale,
            tenantId
        }, 'Tariffario associato ad azienda (M2M)');

        return association;
    },

    /**
     * Rimuove l'associazione tra un tariffario e un'azienda (soft delete)
     * 
     * @param {string} tariffarioId - ID del tariffario
     * @param {string} companyTenantProfileId - ID del CompanyTenantProfile
     * @param {string} tenantId - Tenant corrente
     */
    async dissociate(tariffarioId, companyTenantProfileId, tenantId) {
        // Verifica che l'associazione esista
        const association = await prisma.tariffarioCompanyAssociation.findFirst({
            where: {
                tariffarioId,
                companyTenantProfileId,
                tenantId,
                deletedAt: null
            },
            include: {
                tariffario: true,
                companyTenantProfile: { include: { company: true } }
            }
        });

        if (!association) {
            throw new Error('Associazione non trovata');
        }

        // Soft delete dell'associazione
        await prisma.tariffarioCompanyAssociation.update({
            where: { id: association.id, deletedAt: null },
            data: { deletedAt: new Date() }
        });

        logger.info({
            associationId: association.id,
            tariffarioId,
            companyTenantProfileId,
            companyName: association.companyTenantProfile.company.ragioneSociale,
            tenantId
        }, 'Associazione tariffario-azienda rimossa');

        return { success: true };
    },

    /**
     * Ottiene tutti i tariffari associati a un'azienda (via M2M)
     * P59 Sprint 11.1: Include successore specifico per questa azienda
     * 
     * @param {string} companyTenantProfileId - ID del CompanyTenantProfile
     * @param {string} tenantId - Tenant corrente
     */
    async getByCompanyProfile(companyTenantProfileId, tenantId) {
        const associations = await prisma.tariffarioCompanyAssociation.findMany({
            where: {
                companyTenantProfileId,
                tenantId,
                deletedAt: null
            },
            include: {
                tariffario: {
                    include: {
                        convenzione: true,
                        // P59 Sprint 11.2: Include voci complete con prestazione e fasce
                        voci: {
                            where: { deletedAt: null },
                            orderBy: { ordine: 'asc' },
                            include: {
                                prestazione: { select: { id: true, codice: true, nome: true } },
                                documentoTemplate: { select: { id: true, codice: true, nome: true, tipo: true } },
                                fasceDipendenti: {
                                    where: { deletedAt: null },
                                    orderBy: { minDipendenti: 'asc' }
                                }
                            }
                        },
                        _count: { select: { companyAssociations: { where: { deletedAt: null } } } }
                    }
                },
                // P59 Sprint 11.1: Include successore specifico per questa associazione
                successoreAssociation: {
                    include: {
                        tariffario: { select: { id: true, codice: true, nome: true, validoDa: true } }
                    }
                },
                predecessoreAssociation: {
                    include: {
                        tariffario: { select: { id: true, codice: true, nome: true, validoA: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Ritorna i tariffari con info sull'associazione e successore
        return associations.map(assoc => ({
            ...assoc.tariffario,
            association: {
                id: assoc.id,
                validoDa: assoc.validoDa,
                validoA: assoc.validoA,
                attivo: assoc.attivo,
                note: assoc.note,
                createdAt: assoc.createdAt,
                // P59 Sprint 11.1: Successore specifico per questa azienda
                successoreAssociationId: assoc.successoreAssociationId,
                successoreAssociation: assoc.successoreAssociation,
                predecessoreAssociation: assoc.predecessoreAssociation
            },
            numeroAziendeAssociate: assoc.tariffario._count?.companyAssociations || 0
        }));
    },

    /**
     * Ottiene tutte le aziende associate a un tariffario (via M2M)
     * 
     * @param {string} tariffarioId - ID del tariffario
     * @param {string} tenantId - Tenant corrente
     */
    async getAssociatedCompanies(tariffarioId, tenantId) {
        const associations = await prisma.tariffarioCompanyAssociation.findMany({
            where: {
                tariffarioId,
                tenantId,
                deletedAt: null
            },
            include: {
                companyTenantProfile: {
                    include: {
                        company: true,
                        sites: { where: { deletedAt: null } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return associations.map(assoc => ({
            associationId: assoc.id,
            validoDa: assoc.validoDa,
            validoA: assoc.validoA,
            attivo: assoc.attivo,
            note: assoc.note,
            createdAt: assoc.createdAt,
            company: {
                id: assoc.companyTenantProfile.id,
                companyId: assoc.companyTenantProfile.companyId,
                ragioneSociale: assoc.companyTenantProfile.company.ragioneSociale,
                partitaIva: assoc.companyTenantProfile.company.partitaIva,
                codiceFiscale: assoc.companyTenantProfile.company.codiceFiscale,
                status: assoc.companyTenantProfile.status,
                numeroSedi: assoc.companyTenantProfile.sites?.length || 0
            }
        }));
    },

    /**
     * P59 Sprint 11.1: Aggiorna un'associazione tariffario-azienda
     * Permette di modificare validità, note, stato attivo e successore
     * 
     * @param {string} associationId - ID dell'associazione
     * @param {string} tenantId - Tenant corrente
     * @param {object} data - Dati da aggiornare
     */
    async updateAssociation(associationId, tenantId, data = {}) {
        const { validoDa, validoA, attivo, note, successoreAssociationId } = data;

        // Verifica che l'associazione esista
        const association = await prisma.tariffarioCompanyAssociation.findFirst({
            where: { id: associationId, tenantId, deletedAt: null },
            include: {
                tariffario: true,
                companyTenantProfile: { include: { company: true } }
            }
        });

        if (!association) {
            throw new Error('Associazione non trovata');
        }

        // Se viene specificato un successore, verifica che esista
        if (successoreAssociationId) {
            const successoreAssociation = await prisma.tariffarioCompanyAssociation.findFirst({
                where: {
                    id: successoreAssociationId,
                    tenantId,
                    deletedAt: null,
                    // Il successore deve essere per la stessa azienda
                    companyTenantProfileId: association.companyTenantProfileId
                }
            });

            if (!successoreAssociation) {
                throw new Error('Associazione successore non trovata o non appartiene alla stessa azienda');
            }

            // Evita riferimento circolare
            if (successoreAssociationId === associationId) {
                throw new Error('Un\'associazione non può essere successore di se stessa');
            }
        }

        // Aggiorna l'associazione
        const updated = await prisma.tariffarioCompanyAssociation.update({
            where: { id: associationId, deletedAt: null },
            data: {
                ...(validoDa !== undefined && { validoDa: validoDa ? new Date(validoDa) : null }),
                ...(validoA !== undefined && { validoA: validoA ? new Date(validoA) : null }),
                ...(attivo !== undefined && { attivo }),
                ...(note !== undefined && { note }),
                ...(successoreAssociationId !== undefined && { successoreAssociationId })
            },
            include: {
                tariffario: {
                    include: {
                        convenzione: true,
                        _count: { select: { companyAssociations: { where: { deletedAt: null } } } }
                    }
                },
                companyTenantProfile: { include: { company: true } },
                successoreAssociation: {
                    include: {
                        tariffario: { select: { id: true, codice: true, nome: true, validoDa: true } }
                    }
                },
                predecessoreAssociation: {
                    include: {
                        tariffario: { select: { id: true, codice: true, nome: true, validoA: true } }
                    }
                }
            }
        });

        logger.info({
            associationId,
            tariffarioId: association.tariffarioId,
            companyTenantProfileId: association.companyTenantProfileId,
            companyName: association.companyTenantProfile.company.ragioneSociale,
            changes: Object.keys(data).filter(k => data[k] !== undefined),
            tenantId
        }, 'Associazione tariffario-azienda aggiornata');

        return updated;
    },

    // =============================================
    // GESTIONE VOCI TARIFFARIO
    // =============================================

    /**
     * Aggiunge una voce al tariffario
     */
    async addVoce(tariffarioId, data, tenantId) {
        const tariffario = await prisma.tariffarioAziendale.findFirst({
            where: { id: tariffarioId, tenantId, deletedAt: null }
        });

        if (!tariffario) {
            throw new Error('Tariffario non trovato');
        }

        const {
            tipo,
            prestazioneId,
            documentoTemplateId,
            nome,
            descrizione,
            prezzoBase,
            ivaAliquota = 22,
            frequenza = 'UNA_TANTUM',
            unitaCalcolo = 'FLAT',                    // P44 Enhancement
            modalitaAttivazione = 'AUTOMATICA',       // P44 Enhancement
            usaFasceDipendenti = false,
            ordine,
            note,
            fasceDipendenti = [],
            // Categoria visita MDL (prima visita vs periodica) - solo PRESTAZIONE
            categoriaVisita,
            // Durata minima in minuti (usata per CONSULENZA, es. 30 = 0.5h)
            durataMinimaMinuti,
            // P59: Compenso professionista per voci SOPRALLUOGO_*, DVR_*, NOMINA_*, CONSULENZA
            compensoProfessionistaTipo,
            compensoProfessionistaValore,
            compensoProfessionistaMinimo,
            compensoProfessionistaMassimo
        } = data;

        // Validazione
        if (tipo === 'PRESTAZIONE' && !prestazioneId) {
            throw new Error('Per una voce di tipo PRESTAZIONE è obbligatorio specificare la prestazione');
        }
        if (tipo === 'QUESTIONARIO' && !documentoTemplateId) {
            throw new Error('Per una voce di tipo QUESTIONARIO è obbligatorio specificare il documento template');
        }
        if (tipo !== 'PRESTAZIONE' && tipo !== 'QUESTIONARIO' && !nome) {
            throw new Error('Per una voce spesa è obbligatorio specificare il nome');
        }

        // Trova ordine massimo
        const maxOrdine = await prisma.voceTariffario.aggregate({
            where: { tariffarioAziendaleId: tariffarioId, deletedAt: null },
            _max: { ordine: true }
        });

        // P59: Determina se è un tipo che supporta compenso professionista
        const tipiConCompenso = TIPI_VOCE_CON_COMPENSO;
        const supportsCompenso = tipiConCompenso.includes(tipo);

        const voce = await prisma.voceTariffario.create({
            data: {
                tariffarioAziendaleId: tariffarioId,
                tipo,
                prestazioneId: tipo === 'PRESTAZIONE' ? prestazioneId : null,
                documentoTemplateId: tipo === 'QUESTIONARIO' ? documentoTemplateId : null,
                nome: (tipo !== 'PRESTAZIONE' && tipo !== 'QUESTIONARIO') ? nome : null,
                descrizione,
                prezzoBase,
                ivaAliquota,
                frequenza,
                unitaCalcolo,                          // P44 Enhancement
                modalitaAttivazione,                   // P44 Enhancement
                usaFasceDipendenti,
                ordine: ordine ?? (maxOrdine._max.ordine || 0) + 1,
                note,
                tenantId,
                // Categoria visita MDL (solo per PRESTAZIONE)
                ...(tipo === 'PRESTAZIONE' && categoriaVisita ? { categoriaVisita } : {}),
                // Durata minima minuti (solo per CONSULENZA)
                ...(tipo === 'CONSULENZA' && durataMinimaMinuti !== undefined ? { durataMinimaMinuti } : {}),
                // P59: Compenso professionista (solo per tipi SOPRALLUOGO_*, DVR_*, NOMINA_*, CONSULENZA)
                ...(supportsCompenso && compensoProfessionistaTipo && { compensoProfessionistaTipo }),
                ...(supportsCompenso && compensoProfessionistaValore !== undefined && { compensoProfessionistaValore }),
                ...(supportsCompenso && compensoProfessionistaMinimo !== undefined && { compensoProfessionistaMinimo }),
                ...(supportsCompenso && compensoProfessionistaMassimo !== undefined && { compensoProfessionistaMassimo }),
                fasceDipendenti: usaFasceDipendenti && fasceDipendenti.length > 0 ? {
                    create: fasceDipendenti.map(fascia => ({
                        minDipendenti: fascia.minDipendenti,
                        maxDipendenti: fascia.maxDipendenti,
                        prezzo: fascia.prezzo,
                        descrizione: fascia.descrizione,
                        tenantId
                    }))
                } : undefined
            },
            include: {
                prestazione: {
                    select: { id: true, codice: true, nome: true }
                },
                documentoTemplate: {
                    select: { id: true, codice: true, nome: true, tipo: true }
                },
                fasceDipendenti: { where: { deletedAt: null } }
            }
        });

        logger.info({ voceId: voce.id, tariffarioId, tipo, tenantId }, 'Voce tariffario aggiunta');
        return voce;
    },

    /**
     * Aggiunge più voci al tariffario in un'unica transazione.
     * Usato per VISITA_MEDICINA_LAVORO (una voce per ogni categoria).
     */
    async addVociBatch(tariffarioId, vociData, tenantId) {
        const tariffario = await prisma.tariffarioAziendale.findFirst({
            where: { id: tariffarioId, tenantId, deletedAt: null }
        });
        if (!tariffario) throw new Error('Tariffario non trovato');
        if (!Array.isArray(vociData) || vociData.length === 0) throw new Error('Nessuna voce da aggiungere');

        // Ordine di partenza
        const maxOrdine = await prisma.voceTariffario.aggregate({
            where: { tariffarioAziendaleId: tariffarioId, deletedAt: null },
            _max: { ordine: true }
        });
        let ordineStart = (maxOrdine._max.ordine || 0) + 1;

        const tipiConCompenso = TIPI_VOCE_CON_COMPENSO;

        const createPromises = vociData.map((data, idx) => {
            const {
                tipo = 'PRESTAZIONE', prestazioneId, documentoTemplateId, nome, descrizione, prezzoBase,
                ivaAliquota = 22, frequenza = 'UNA_TANTUM', unitaCalcolo = 'FLAT',
                modalitaAttivazione = 'AUTOMATICA', usaFasceDipendenti = false, note,
                categoriaVisita, durataMinimaMinuti,
                compensoProfessionistaTipo, compensoProfessionistaValore,
                compensoProfessionistaMinimo, compensoProfessionistaMassimo
            } = data;

            const supportsCompenso = tipiConCompenso.includes(tipo);

            return prisma.voceTariffario.create({
                data: {
                    tariffarioAziendaleId: tariffarioId,
                    tipo,
                    prestazioneId: tipo === 'PRESTAZIONE' ? prestazioneId : null,
                    documentoTemplateId: tipo === 'QUESTIONARIO' ? documentoTemplateId : null,
                    nome: (tipo !== 'PRESTAZIONE' && tipo !== 'QUESTIONARIO') ? nome : null,
                    descrizione, prezzoBase, ivaAliquota, frequenza, unitaCalcolo,
                    modalitaAttivazione, usaFasceDipendenti,
                    ordine: ordineStart + idx, note, tenantId,
                    ...(tipo === 'PRESTAZIONE' && categoriaVisita ? { categoriaVisita } : {}),
                    ...(tipo === 'CONSULENZA' && durataMinimaMinuti !== undefined ? { durataMinimaMinuti } : {}),
                    ...(supportsCompenso && compensoProfessionistaTipo && { compensoProfessionistaTipo }),
                    ...(supportsCompenso && compensoProfessionistaValore !== undefined && { compensoProfessionistaValore }),
                    ...(supportsCompenso && compensoProfessionistaMinimo !== undefined && { compensoProfessionistaMinimo }),
                    ...(supportsCompenso && compensoProfessionistaMassimo !== undefined && { compensoProfessionistaMassimo }),
                },
                include: {
                    prestazione: { select: { id: true, codice: true, nome: true } },
                    documentoTemplate: { select: { id: true, codice: true, nome: true, tipo: true } },
                    fasceDipendenti: { where: { deletedAt: null } }
                }
            });
        });

        const voci = await prisma.$transaction(createPromises);
        logger.info({ count: voci.length, tariffarioId, tenantId }, 'Batch voci tariffario aggiunte');
        return voci;
    },

    /**
     * Aggiorna una voce del tariffario
     */
    async updateVoce(voceId, data, tenantId) {
        const voce = await prisma.voceTariffario.findFirst({
            where: { id: voceId, tenantId, deletedAt: null }
        });

        if (!voce) {
            throw new Error('Voce tariffario non trovata');
        }

        const {
            prestazioneId,
            nome,
            descrizione,
            prezzoBase,
            ivaAliquota,
            frequenza,
            unitaCalcolo,                              // P44 Enhancement
            modalitaAttivazione,                       // P44 Enhancement
            usaFasceDipendenti,
            ordine,
            attivo,
            note,
            // Categoria visita MDL (prima visita vs periodica) - solo PRESTAZIONE
            categoriaVisita,
            // Durata minima in minuti (usata per CONSULENZA)
            durataMinimaMinuti,
            // P59: Compenso professionista
            compensoProfessionistaTipo,
            compensoProfessionistaValore,
            compensoProfessionistaMinimo,
            compensoProfessionistaMassimo
        } = data;

        // Non permettere cambio tipo
        if (data.tipo && data.tipo !== voce.tipo) {
            throw new Error('Non è possibile cambiare il tipo di voce');
        }

        // P59: Determina se è un tipo che supporta compenso professionista
        const tipiConCompenso = TIPI_VOCE_CON_COMPENSO;
        const supportsCompenso = tipiConCompenso.includes(voce.tipo);

        const updated = await prisma.voceTariffario.update({
            where: { id: voceId, deletedAt: null },
            data: {
                ...(voce.tipo === 'PRESTAZIONE' && prestazioneId && { prestazioneId }),
                ...(voce.tipo !== 'PRESTAZIONE' && nome && { nome }),
                ...(descrizione !== undefined && { descrizione }),
                ...(prezzoBase !== undefined && { prezzoBase }),
                ...(ivaAliquota !== undefined && { ivaAliquota }),
                ...(frequenza && { frequenza }),
                ...(unitaCalcolo && { unitaCalcolo }),                   // P44 Enhancement
                ...(modalitaAttivazione && { modalitaAttivazione }),     // P44 Enhancement
                ...(usaFasceDipendenti !== undefined && { usaFasceDipendenti }),
                ...(ordine !== undefined && { ordine }),
                ...(attivo !== undefined && { attivo }),
                ...(note !== undefined && { note }),
                // Categoria visita MDL (solo PRESTAZIONE)
                ...(voce.tipo === 'PRESTAZIONE' && categoriaVisita !== undefined && { categoriaVisita: categoriaVisita || null }),
                // Durata minima minuti (solo CONSULENZA)
                ...(voce.tipo === 'CONSULENZA' && durataMinimaMinuti !== undefined && { durataMinimaMinuti }),
                // P59: Compenso professionista (solo per tipi SOPRALLUOGO_*, DVR_*, NOMINA_*, CONSULENZA)
                ...(supportsCompenso && compensoProfessionistaTipo !== undefined && { compensoProfessionistaTipo }),
                ...(supportsCompenso && compensoProfessionistaValore !== undefined && { compensoProfessionistaValore }),
                ...(supportsCompenso && compensoProfessionistaMinimo !== undefined && { compensoProfessionistaMinimo }),
                ...(supportsCompenso && compensoProfessionistaMassimo !== undefined && { compensoProfessionistaMassimo })
            },
            include: {
                prestazione: { select: { id: true, codice: true, nome: true } },
                documentoTemplate: { select: { id: true, codice: true, nome: true, tipo: true } },
                fasceDipendenti: { where: { deletedAt: null } }
            }
        });

        logger.info({ voceId, tenantId }, 'Voce tariffario aggiornata');
        return updated;
    },

    /**
     * Elimina una voce del tariffario
     */
    async deleteVoce(voceId, tenantId) {
        const voce = await prisma.voceTariffario.findFirst({
            where: { id: voceId, tenantId, deletedAt: null }
        });

        if (!voce) {
            throw new Error('Voce tariffario non trovata');
        }

        await prisma.$transaction([
            prisma.fasciaDipendentiPrezzo.updateMany({
                where: { voceTariffarioId: voceId, deletedAt: null },
                data: { deletedAt: new Date() }
            }),
            prisma.voceTariffario.update({
                where: { id: voceId, deletedAt: null },
                data: { deletedAt: new Date() }
            })
        ]);

        logger.info({ voceId, tenantId }, 'Voce tariffario eliminata');
        return { success: true };
    },

    /**
     * P59 Sprint 11.2: Riordina le voci del tariffario
     * @param {string} tariffarioId - ID del tariffario
     * @param {Array<{id: string, ordine: number}>} updates - Array di voci da riordinare
     * @param {string} tenantId - ID del tenant
     */
    async reorderVoci(tariffarioId, updates, tenantId) {
        // Verifica che il tariffario esista
        const tariffario = await prisma.tariffarioAziendale.findFirst({
            where: { id: tariffarioId, tenantId, deletedAt: null }
        });

        if (!tariffario) {
            throw new Error('Tariffario non trovato');
        }

        // Aggiorna l'ordine di ogni voce in una transazione
        await prisma.$transaction(
            updates.map(({ id, ordine }) =>
                prisma.voceTariffario.updateMany({
                    where: {
                        id,
                        tariffarioAziendaleId: tariffarioId,
                        tenantId,
                        deletedAt: null
                    },
                    data: { ordine }
                })
            )
        );

        logger.info({ tariffarioId, tenantId, vociCount: updates.length }, 'Voci tariffario riordinate');
        return { success: true };
    },

    // =============================================
    // GESTIONE FASCE DIPENDENTI
    // =============================================

    /**
     * Aggiunge una fascia dipendenti a una voce
     */
    async addFascia(voceId, data, tenantId) {
        const voce = await prisma.voceTariffario.findFirst({
            where: { id: voceId, tenantId, deletedAt: null }
        });

        if (!voce) {
            throw new Error('Voce tariffario non trovata');
        }

        const { minDipendenti, maxDipendenti, prezzo, descrizione } = data;

        // Verifica sovrapposizione fasce
        const esistenti = await prisma.fasciaDipendentiPrezzo.findMany({
            where: { voceTariffarioId: voceId, deletedAt: null }
        });

        for (const fascia of esistenti) {
            const fasciaMax = fascia.maxDipendenti ?? Infinity;
            const newMax = maxDipendenti ?? Infinity;

            // Verifica sovrapposizione
            if (minDipendenti <= fasciaMax && newMax >= fascia.minDipendenti) {
                throw new Error(`La fascia ${minDipendenti}-${maxDipendenti || '∞'} si sovrappone con ${fascia.minDipendenti}-${fascia.maxDipendenti || '∞'}`);
            }
        }

        const fascia = await prisma.fasciaDipendentiPrezzo.create({
            data: {
                voceTariffarioId: voceId,
                minDipendenti,
                maxDipendenti,
                prezzo,
                descrizione,
                tenantId
            }
        });

        // Aggiorna flag usaFasceDipendenti
        await prisma.voceTariffario.update({
            where: { id: voceId, deletedAt: null },
            data: { usaFasceDipendenti: true }
        });

        logger.info({ fasciaId: fascia.id, voceId, tenantId }, 'Fascia dipendenti aggiunta');
        return fascia;
    },

    /**
     * Aggiorna una fascia dipendenti
     */
    async updateFascia(fasciaId, data, tenantId) {
        const fascia = await prisma.fasciaDipendentiPrezzo.findFirst({
            where: { id: fasciaId, tenantId, deletedAt: null }
        });

        if (!fascia) {
            throw new Error('Fascia dipendenti non trovata');
        }

        const { minDipendenti, maxDipendenti, prezzo, descrizione } = data;

        // Se cambiano i range, verifica sovrapposizione
        if (minDipendenti !== undefined || maxDipendenti !== undefined) {
            const esistenti = await prisma.fasciaDipendentiPrezzo.findMany({
                where: {
                    voceTariffarioId: fascia.voceTariffarioId,
                    deletedAt: null,
                    id: { not: fasciaId }
                }
            });

            const newMin = minDipendenti ?? fascia.minDipendenti;
            const newMax = maxDipendenti ?? fascia.maxDipendenti ?? Infinity;

            for (const f of esistenti) {
                const fMax = f.maxDipendenti ?? Infinity;
                if (newMin <= fMax && newMax >= f.minDipendenti) {
                    throw new Error(`La fascia ${newMin}-${newMax === Infinity ? '∞' : newMax} si sovrappone con ${f.minDipendenti}-${f.maxDipendenti || '∞'}`);
                }
            }
        }

        const updated = await prisma.fasciaDipendentiPrezzo.update({
            where: { id: fasciaId, deletedAt: null },
            data: {
                ...(minDipendenti !== undefined && { minDipendenti }),
                ...(maxDipendenti !== undefined && { maxDipendenti }),
                ...(prezzo !== undefined && { prezzo }),
                ...(descrizione !== undefined && { descrizione })
            }
        });

        logger.info({ fasciaId, tenantId }, 'Fascia dipendenti aggiornata');
        return updated;
    },

    /**
     * Elimina una fascia dipendenti
     */
    async deleteFascia(fasciaId, tenantId) {
        const fascia = await prisma.fasciaDipendentiPrezzo.findFirst({
            where: { id: fasciaId, tenantId, deletedAt: null }
        });

        if (!fascia) {
            throw new Error('Fascia dipendenti non trovata');
        }

        await prisma.fasciaDipendentiPrezzo.update({
            where: { id: fasciaId, deletedAt: null },
            data: { deletedAt: new Date() }
        });

        // Controlla se ci sono altre fasce
        const remaining = await prisma.fasciaDipendentiPrezzo.count({
            where: { voceTariffarioId: fascia.voceTariffarioId, deletedAt: null }
        });

        // Se non ci sono più fasce, disabilita usaFasceDipendenti
        if (remaining === 0) {
            await prisma.voceTariffario.update({
                where: { id: fascia.voceTariffarioId, deletedAt: null },
                data: { usaFasceDipendenti: false }
            });
        }

        logger.info({ fasciaId, tenantId }, 'Fascia dipendenti eliminata');
        return { success: true };
    },

    // =============================================
    // UTILITY
    // =============================================

    // P59 Sprint 11.2: Rimossi metodi legacy getByCompany e getByCompanyProfile (clone-based)
    // Il metodo getByCompanyProfile corretto è alla linea ~588, usa il pattern M2M

    /**
     * Calcola il prezzo per una voce in base al numero di dipendenti
     */
    async calcolaPrezzo(voceId, numeroDipendenti, tenantId) {
        const voce = await prisma.voceTariffario.findFirst({
            where: { id: voceId, tenantId, deletedAt: null },
            include: {
                fasceDipendenti: {
                    where: { deletedAt: null },
                    orderBy: { minDipendenti: 'asc' }
                }
            }
        });

        if (!voce) {
            throw new Error('Voce tariffario non trovata');
        }

        // Se non usa fasce, ritorna prezzoBase
        if (!voce.usaFasceDipendenti || voce.fasceDipendenti.length === 0) {
            return {
                prezzo: voce.prezzoBase,
                fascia: null,
                usaFasce: false
            };
        }

        // Trova la fascia corretta
        const fascia = voce.fasceDipendenti.find(f => {
            const max = f.maxDipendenti ?? Infinity;
            return numeroDipendenti >= f.minDipendenti && numeroDipendenti <= max;
        });

        if (!fascia) {
            // Nessuna fascia trovata, usa prezzo base
            return {
                prezzo: voce.prezzoBase,
                fascia: null,
                usaFasce: true,
                warning: `Nessuna fascia trovata per ${numeroDipendenti} dipendenti`
            };
        }

        return {
            prezzo: fascia.prezzo,
            fascia: {
                id: fascia.id,
                minDipendenti: fascia.minDipendenti,
                maxDipendenti: fascia.maxDipendenti,
                descrizione: fascia.descrizione
            },
            usaFasce: true
        };
    },

    /**
     * Ottiene le prestazioni MDL disponibili per le voci tariffario.
     * 
     * Filtra con logica OR:
     * P44 Phase 3: Filtra SOLO per brancheSpecialistiche contenente "Medicina del Lavoro"
     * Le prestazioni devono avere esplicitamente questa branca assegnata per apparire.
     * 
     * Include: prestazioni, certificati, esami strumentali, esami lab, bundle, ecc.
     * che hanno "Medicina del Lavoro" nelle brancheSpecialistiche.
     */
    async getPrestazioniMDL(tenantId) {
        const TIPI_QUESTIONARIO_MDL = [
            'QUESTIONARIO_ANAMNESI_MDL',
            'QUESTIONARIO_RISCHIO',
            'QUESTIONARIO_SINTOMI',
            'SCHEDA_SORVEGLIANZA',
            'ALCOL_SCREENING',
            'ANAMNESI'
        ];

        const [prestazioni, questionari] = await Promise.all([
            prisma.prestazione.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    attivo: true,
                    // Filtra per branca MDL o tipo VISITA_MEDICINA_LAVORO
                    OR: [
                        {
                            brancheSpecialistiche: {
                                hasSome: [
                                    'Medicina del Lavoro',
                                    'MDL',
                                    'Medicina Del Lavoro',
                                    'medicina del lavoro',
                                    'MEDICINA DEL LAVORO'
                                ]
                            }
                        },
                        { tipo: 'VISITA_MEDICINA_LAVORO' }
                    ]
                },
                select: {
                    id: true,
                    codice: true,
                    nome: true,
                    tipo: true,
                    prezzoBase: true,
                    durataPrevista: true,
                    ivaAliquota: true,
                    brancheSpecialistiche: true,
                    branchType: true
                },
                orderBy: [
                    { tipo: 'asc' },
                    { nome: 'asc' }
                ]
            }),
            prisma.documentoTemplate.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    isActive: true,
                    tipo: { in: TIPI_QUESTIONARIO_MDL }
                },
                select: {
                    id: true,
                    codice: true,
                    nome: true,
                    tipo: true,
                    descrizione: true
                },
                orderBy: [
                    { tipo: 'asc' },
                    { nome: 'asc' }
                ]
            })
        ]);

        return { prestazioni, questionari };
    },

    /**
     * Ottiene i tariffari base disponibili per la clonazione
     */
    async getTariffariBase(tenantId) {
        return prisma.tariffarioAziendale.findMany({
            where: {
                tenantId,
                tipo: 'BASE',
                attivo: true,
                deletedAt: null
            },
            select: {
                id: true,
                codice: true,
                nome: true,
                descrizione: true,
                validoDa: true,
                validoA: true,
                _count: {
                    select: { voci: { where: { deletedAt: null } } }
                }
            },
            orderBy: { nome: 'asc' }
        });
    },

    /**
     * Genera PDF del tariffario
     * @param {string} id - ID del tariffario
     * @param {string|string[]|null} tenantIds - Tenant IDs per accesso
     * @returns {Promise<{buffer: Buffer, filename: string}>}
     */
    async generatePDF(id, tenantIds) {
        // Recupera il tariffario completo
        const tariffario = await this.getById(id, tenantIds);
        if (!tariffario) {
            throw new Error('Tariffario non trovato');
        }

        // Recupera info tenant
        const tenant = await prisma.tenant.findFirst({
            where: { id: tariffario.tenantId, deletedAt: null },
            select: { name: true, settings: true }
        });

        // Il logo può essere nelle settings del tenant (JSON)
        const tenantSettings = tenant?.settings && typeof tenant.settings === 'object' ? tenant.settings : {};
        const logoUrl = resolveFirstValidLogo(tenantSettings.branches?.MEDICA?.logo, tenantSettings.branches?.FORMAZIONE?.logo, tenantSettings.logoUrl, tenantSettings.logo);

        // Prepara i dati per il template
        const vociRaw = tariffario.voci || [];

        // Helper: mappa una voce generica in una riga PDF (preserva l'ordine `ordine`)
        const mapVoceRow = (voce, index = 0) => ({
            ordine: voce.ordine ?? index,
            nome: voce.nome || voce.prestazione?.nome || voce.documentoTemplate?.nome || 'Voce senza nome',
            descrizione: voce.descrizione || '',
            prezzoBase: Number(voce.prezzoBase).toFixed(2),
            ivaAliquota: Number(voce.ivaAliquota).toFixed(0),
            frequenzaAbbr: FREQUENZA_ABBR[voce.frequenza] || voce.frequenza || '-',
            frequenzaLabel: FREQUENZA_LABELS[voce.frequenza] || voce.frequenza || '-',
            unitaAbbr: UNITA_ABBR[voce.unitaCalcolo] || voce.unitaCalcolo || '-',
            usaFasceDipendenti: voce.usaFasceDipendenti,
            fasceDipendenti: (voce.fasceDipendenti || []).map(f => ({
                range: f.maxDipendenti ? `${f.minDipendenti}-${f.maxDipendenti}` : `${f.minDipendenti}+`,
                prezzo: Number(f.prezzo).toFixed(2),
                descrizione: f.descrizione
            }))
        });

        // ── CARD 1 · PRESTAZIONI MEDICINA DEL LAVORO ──────────────────────────
        // 1a) Visite MDL: tutte le tipologie con lo STESSO prezzo accorpate in una riga
        const VISITE_MDL_ROWS = (() => {
            const visiteVoci = vociRaw.filter(v => v.tipo === 'PRESTAZIONE' && v.categoriaVisita && v.prestazioneId);
            if (!visiteVoci.length) return [];
            const ordered = [...visiteVoci].sort((a, b) =>
                (VISITA_MDL_CATEGORIES_ORDER.indexOf(a.categoriaVisita) - VISITA_MDL_CATEGORIES_ORDER.indexOf(b.categoriaVisita))
            );
            const priceMap = new Map(); // key "prezzo|iva|freq" → riga accorpata
            for (const v of ordered) {
                const prezzo = Number(v.prezzoBase).toFixed(2);
                const iva = Number(v.ivaAliquota).toFixed(0);
                const key = `${prezzo}|${iva}|${v.frequenza}`;
                if (!priceMap.has(key)) {
                    priceMap.set(key, {
                        labels: [],
                        prezzoBase: prezzo,
                        ivaAliquota: iva,
                        frequenzaLabel: FREQUENZA_LABELS[v.frequenza] || v.frequenza || '-'
                    });
                }
                priceMap.get(key).labels.push(CATEGORIA_VISITA_LABELS[v.categoriaVisita] || v.categoriaVisita);
            }
            return [...priceMap.values()].map(r => ({
                categoriaLabel: r.labels.join(' / '),
                prezzoBase: r.prezzoBase,
                ivaAliquota: r.ivaAliquota,
                frequenzaLabel: r.frequenzaLabel
            }));
        })();

        // 1b) Prestazioni mediche: PRESTAZIONE senza categoria visita (ECG, spirometria, ...)
        //     + Questionari MDL, trattati come prestazioni mediche nella STESSA sezione
        //     (nessun sotto-titolo separato). Ordine = ordine voci nel tariffario.
        const PRESTAZIONI_MEDICHE_ROWS = vociRaw
            .filter(v =>
                (v.tipo === 'PRESTAZIONE' && !(v.categoriaVisita && v.prestazioneId)) ||
                v.tipo === 'QUESTIONARIO'
            )
            .map(mapVoceRow);

        const HAS_PRESTAZIONI_MDL = VISITE_MDL_ROWS.length > 0
            || PRESTAZIONI_MEDICHE_ROWS.length > 0;

        // ── CARD 2 · CONSULENZA E SICUREZZA ───────────────────────────────────
        const DVR_DESCRIZIONE = {
            DVR_NUOVO: 'Nuovo DVR',
            DVR_AGGIORNAMENTO_CON_MODIFICHE: 'Aggiornamento con modifiche maggiori',
            DVR_AGGIORNAMENTO_SENZA_MODIFICHE: 'Aggiornamento senza modifiche maggiori',
        };
        const isDvr = (t) => t === 'DVR_NUOVO'
            || t === 'DVR_AGGIORNAMENTO_CON_MODIFICHE'
            || t === 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE';
        const CONSULENZA_SICUREZZA_ROWS = (() => {
            const ORDER = ['CONSULENZA', 'NOMINA_MC', 'NOMINA_RSPP', 'SOPRALLUOGO_MC', 'SOPRALLUOGO_RSPP',
                'DVR_NUOVO', 'DVR_AGGIORNAMENTO_CON_MODIFICHE', 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE'];
            return vociRaw
                .filter(v => ORDER.includes(v.tipo))
                .sort((a, b) => (ORDER.indexOf(a.tipo) - ORDER.indexOf(b.tipo)) || ((a.ordine || 0) - (b.ordine || 0)))
                .map((voce, index) => ({
                    ordine: voce.ordine || index + 1,
                    // DVR: colonna "Tipo" = "DVR", la distinzione finisce nella descrizione
                    tipoLabel: isDvr(voce.tipo) ? 'DVR' : (TIPO_VOCE_LABELS[voce.tipo] || voce.tipo),
                    nome: isDvr(voce.tipo) ? DVR_DESCRIZIONE[voce.tipo] : (voce.nome || 'Servizio'),
                    descrizione: isDvr(voce.tipo) ? '' : (voce.descrizione || ''),
                    prezzoBase: Number(voce.prezzoBase).toFixed(2),
                    ivaAliquota: Number(voce.ivaAliquota).toFixed(0),
                    frequenzaAbbr: FREQUENZA_ABBR[voce.frequenza] || voce.frequenza || '-',
                }));
        })();
        const HAS_CONSULENZA_SICUREZZA = CONSULENZA_SICUREZZA_ROWS.length > 0;

        // ── CARD 3 · SPESE ACCESSORIE (una tantum, ricorrenti, uscite MC) ─────
        const SPESE_ACCESSORIE_ROWS = vociRaw
            .filter(v => ['SPESA_FISSA', 'SPESA_RICORRENTE', 'USCITA_MC'].includes(v.tipo))
            .map(mapVoceRow);
        const HAS_SPESE_ACCESSORIE = SPESE_ACCESSORIE_ROWS.length > 0;

        const templateData = {
            TARIFFARIO_CODICE: tariffario.codice,
            TARIFFARIO_NOME: tariffario.nome,
            TARIFFARIO_TIPO: tariffario.tipo === 'BASE' ? 'Tariffario Base' : 'Tariffario Aziendale',
            DESCRIZIONE: tariffario.descrizione,
            ATTIVO: tariffario.attivo,
            VALIDO_DA: tariffario.validoDa ? new Date(tariffario.validoDa).toLocaleDateString('it-IT') : '',
            VALIDO_A: tariffario.validoA ? new Date(tariffario.validoA).toLocaleDateString('it-IT') : null,
            CONVENZIONE_NOME: tariffario.convenzione?.nome,
            AZIENDA_NOME: tariffario.companyTenantProfile?.company?.ragioneSociale,
            AZIENDA_PIVA: tariffario.companyTenantProfile?.company?.piva,
            NOTE: tariffario.note,
            LOGO_URL: logoUrl,
            TENANT_NOME: tenant?.name || '',
            DATA_GENERAZIONE: new Date().toLocaleDateString('it-IT', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }),
            // CARD 1 · Prestazioni Medicina del Lavoro (visite + prestazioni + questionari)
            HAS_PRESTAZIONI_MDL,
            VISITE_MDL_ROWS,
            HAS_VISITE_MDL: VISITE_MDL_ROWS.length > 0,
            PRESTAZIONI_MEDICHE_ROWS,
            HAS_PRESTAZIONI_MEDICHE: PRESTAZIONI_MEDICHE_ROWS.length > 0,
            // CARD 2 · Consulenza e Sicurezza
            HAS_CONSULENZA_SICUREZZA,
            CONSULENZA_SICUREZZA_ROWS,
            // CARD 3 · Spese Accessorie (una tantum, ricorrenti, uscite MC)
            HAS_SPESE_ACCESSORIE,
            SPESE_ACCESSORIE_ROWS,
            TOTALE_VOCI: vociRaw.length,
        };

        // P59: Carica e compila il template usando __dirname per percorso affidabile
        // Il file è in backend/public/templates/ relativo alla root del backend
        const templatePath = path.join(__dirname, '..', '..', 'public', 'templates', 'tariffario-aziendale.html');

        let templateHtml;
        try {
            templateHtml = fs.readFileSync(templatePath, 'utf-8');
        } catch (error) {
            logger.error({ error: error.message, templatePath }, 'Errore lettura template tariffario');
            throw new Error('Template tariffario non trovato');
        }

        // Compila con Handlebars
        const template = Handlebars.compile(templateHtml);
        const html = template(templateData);

        // Genera PDF
        const pdfBuffer = await pdfService.generatePDF(html, {
            format: 'A4',
            landscape: false,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });

        // Nome file = nome del tariffario (sanitizzato), con fallback al codice
        const safeNome = (tariffario.nome || tariffario.codice || 'tariffario')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // rimuove accenti
            .replace(/[^a-zA-Z0-9]+/g, '_')                   // spazi/simboli → _
            .replace(/^_+|_+$/g, '')                          // trim _
            .slice(0, 80) || 'tariffario';
        const filename = `${safeNome}.pdf`;

        logger.info({
            tariffarioId: id,
            filename,
            vociCount: tariffario.voci?.length
        }, 'PDF tariffario generato');

        return { buffer: pdfBuffer, filename };
    },

    /**
     * P65: Ottiene le voci tariffario aziendali che includono una specifica prestazione
     * @param {string} prestazioneId - ID della prestazione
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Voci con tariffario parent e aziende associate
     */
    async getVociByPrestazione(prestazioneId, tenantId) {
        const voci = await prisma.voceTariffario.findMany({
            where: {
                prestazioneId,
                deletedAt: null,
                tariffarioAziendale: {
                    tenantId,
                    deletedAt: null
                }
            },
            include: {
                tariffarioAziendale: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true,
                        attivo: true,
                        validoDa: true,
                        validoA: true,
                        convenzioneId: true,
                        convenzione: {
                            select: { id: true, codice: true, nome: true }
                        },
                        companyAssociations: {
                            where: {
                                attivo: true,
                                deletedAt: null
                            },
                            include: {
                                companyTenantProfile: {
                                    select: {
                                        id: true,
                                        company: {
                                            select: {
                                                id: true,
                                                ragioneSociale: true,
                                                piva: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                fasceDipendenti: {
                    where: { deletedAt: null },
                    orderBy: { minDipendenti: 'asc' }
                }
            },
            orderBy: [
                { tariffarioAziendale: { nome: 'asc' } },
                { ordine: 'asc' }
            ]
        });

        return voci;
    },

    /**
     * P65: Ottiene le voci tariffario che prezzano uno specifico DocumentoTemplate (questionario)
     * @param {string} documentoTemplateId - ID del DocumentoTemplate
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Voci con tariffario parent e aziende associate
     */
    async getVociByDocumentoTemplate(documentoTemplateId, tenantId) {
        const voci = await prisma.voceTariffario.findMany({
            where: {
                documentoTemplateId,
                tipo: 'QUESTIONARIO',
                deletedAt: null,
                tariffarioAziendale: {
                    tenantId,
                    deletedAt: null
                }
            },
            include: {
                tariffarioAziendale: {
                    select: {
                        id: true,
                        codice: true,
                        nome: true,
                        attivo: true,
                        validoDa: true,
                        validoA: true,
                        companyAssociations: {
                            where: {
                                attivo: true,
                                deletedAt: null
                            },
                            include: {
                                companyTenantProfile: {
                                    select: {
                                        id: true,
                                        company: {
                                            select: {
                                                id: true,
                                                ragioneSociale: true,
                                                piva: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: [
                { tariffarioAziendale: { nome: 'asc' } },
                { ordine: 'asc' }
            ]
        });

        return voci;
    },

    /**
     * Risolvi un Company.id o CompanyTenantProfile.id al profilo corretto
     * @param {string} idOrCompanyId - CTP.id o Company.id globale
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<{id: string}|null>}
     */
    async resolveCompanyProfile(idOrCompanyId, tenantId) {
        return prisma.companyTenantProfile.findFirst({
            where: {
                OR: [
                    { id: idOrCompanyId, tenantId, deletedAt: null },
                    { companyId: idOrCompanyId, tenantId, deletedAt: null }
                ]
            },
            select: { id: true }
        });
    }
};

export default TariffarioAziendaleService;
