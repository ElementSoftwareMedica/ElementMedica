/**
 * QueueDisplayMonitorService - Gestione monitor display
 * Progetto 53.3: Monitor multipli per ambulatori
 * 
 * Responsabilità:
 * - CRUD configurazioni monitor
 * - Associazione ambulatori a monitor
 * - Generazione token accesso pubblico
 * - Filtro chiamate per monitor
 * 
 * @module services/queue/QueueDisplayMonitorService
 */

import prisma from '../../config/prisma-optimization.js';
import crypto from 'crypto';
import { logger } from '../../utils/logger.js';

/**
 * @typedef {Object} MonitorConfig
 * @property {string} theme - Tema display (light/dark)
 * @property {number} fontSize - Dimensione font numero (px)
 * @property {boolean} showRecentCalls - Mostra chiamate recenti
 * @property {number} recentCallsCount - Numero chiamate recenti
 * @property {boolean} enableAudio - Abilita audio
 * @property {'beep'|'tts'|'both'} audioType - Tipo audio
 * @property {boolean} showMarquee - Mostra ticker scorrevole
 * @property {string} marqueeText - Testo ticker personalizzato
 * @property {string} backgroundColor - Colore sfondo
 */

/**
 * @typedef {Object} MonitorCreateData
 * @property {string} tenantId
 * @property {string} nome
 * @property {string} codice
 * @property {string} [descrizione]
 * @property {string} [poliambulatorioId]
 * @property {MonitorConfig} [config]
 * @property {string[]} [ambulatoriIds]
 */

class QueueDisplayMonitorService {
    /**
     * Genera token di accesso univoco per monitor
     * @returns {string} Token base64url
     */
    generateAccessToken() {
        return crypto.randomBytes(24).toString('base64url');
    }

    /**
     * Crea un nuovo monitor display
     * @param {MonitorCreateData} data
     * @returns {Promise<Object>} Monitor creato
     */
    async create(data) {
        const {
            tenantId,
            nome,
            codice,
            descrizione,
            poliambulatorioId,
            config = {},
            ambulatoriIds = []
        } = data;

        // Verifica codice univoco
        const existing = await prisma.queueDisplayMonitor.findFirst({
            where: {
                tenantId,
                codice,
                deletedAt: null
            }
        });

        if (existing) {
            throw new Error(`Monitor con codice "${codice}" già esistente`);
        }

        // Crea monitor con ambulatori associati
        const monitor = await prisma.queueDisplayMonitor.create({
            data: {
                tenantId,
                nome,
                codice,
                descrizione,
                poliambulatorioId,
                config,
                accessToken: this.generateAccessToken(),
                ambulatori: {
                    create: ambulatoriIds.map((ambulatorioId, index) => ({
                        ambulatorioId,
                        ordine: index
                    }))
                }
            },
            include: {
                ambulatori: {
                    include: {
                        ambulatorio: {
                            select: {
                                id: true,
                                nome: true,
                                codice: true,
                                specializzazione: true
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                },
                poliambulatorio: {
                    select: {
                        id: true,
                        nome: true
                    }
                }
            }
        });

        logger.info({ monitorId: monitor.id, tenantId }, 'Monitor display creato');
        return this.formatMonitor(monitor);
    }

    /**
     * Ottiene tutti i monitor di un tenant
     * @param {Object} options
     * @param {string} options.tenantId
     * @param {string} [options.poliambulatorioId]
     * @param {boolean} [options.activeOnly]
     * @returns {Promise<Object[]>}
     */
    async getAll({ tenantId, poliambulatorioId, activeOnly = true }) {
        const monitors = await prisma.queueDisplayMonitor.findMany({
            where: {
                tenantId,
                ...(poliambulatorioId && { poliambulatorioId }),
                ...(activeOnly && { isActive: true }),
                deletedAt: null
            },
            include: {
                ambulatori: {
                    include: {
                        ambulatorio: {
                            select: {
                                id: true,
                                nome: true,
                                codice: true,
                                specializzazione: true,
                                stato: true
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                },
                poliambulatorio: {
                    select: {
                        id: true,
                        nome: true
                    }
                }
            },
            orderBy: { codice: 'asc' }
        });

        return monitors.map(m => this.formatMonitor(m));
    }

    /**
     * Ottiene un monitor per ID
     * @param {string} id
     * @param {string} tenantId
     * @returns {Promise<Object|null>}
     */
    async getById(id, tenantId) {
        const monitor = await prisma.queueDisplayMonitor.findFirst({
            where: {
                id,
                tenantId,
                deletedAt: null
            },
            include: {
                ambulatori: {
                    include: {
                        ambulatorio: {
                            select: {
                                id: true,
                                nome: true,
                                codice: true,
                                specializzazione: true,
                                stato: true
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                },
                poliambulatorio: {
                    select: {
                        id: true,
                        nome: true
                    }
                }
            }
        });

        return monitor ? this.formatMonitor(monitor) : null;
    }

    /**
     * Ottiene un monitor per token di accesso (uso pubblico)
     * @param {string} accessToken
     * @returns {Promise<Object|null>}
     */
    async getByAccessToken(accessToken) {
        const monitor = await prisma.queueDisplayMonitor.findFirst({
            where: {
                accessToken,
                isActive: true,
                deletedAt: null
            },
            include: {
                ambulatori: {
                    include: {
                        ambulatorio: {
                            select: {
                                id: true,
                                nome: true,
                                codice: true,
                                specializzazione: true
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                },
                poliambulatorio: {
                    select: {
                        id: true,
                        nome: true
                    }
                }
            }
        });

        return monitor ? this.formatMonitor(monitor) : null;
    }

    /**
     * Aggiorna un monitor
     * @param {string} id
     * @param {string} tenantId
     * @param {Object} updateData
     * @returns {Promise<Object>}
     */
    async update(id, tenantId, updateData) {
        // F284: Allowlist — prevent mass assignment (protegge tenantId, deletedAt, accessToken, ecc.)
        const {
            ambulatoriIds,
            nome, codice, descrizione, poliambulatorioId, config, isActive
        } = updateData;
        const data = Object.fromEntries(
            Object.entries({ nome, codice, descrizione, poliambulatorioId, config, isActive })
                .filter(([, v]) => v !== undefined)
        );

        // Verifica esistenza
        const existing = await prisma.queueDisplayMonitor.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!existing) {
            throw new Error('Monitor non trovato');
        }

        // Se cambio codice, verifica unicità
        if (data.codice && data.codice !== existing.codice) {
            const codeExists = await prisma.queueDisplayMonitor.findFirst({
                where: {
                    tenantId,
                    codice: data.codice,
                    id: { not: id },
                    deletedAt: null
                }
            });
            if (codeExists) {
                throw new Error(`Monitor con codice "${data.codice}" già esistente`);
            }
        }

        // Aggiorna in transaction
        const monitor = await prisma.$transaction(async (tx) => {
            // Aggiorna dati base
            await tx.queueDisplayMonitor.update({
                where: { id },
                data
            });

            // Se cambiano gli ambulatori, aggiorna relazioni
            if (ambulatoriIds !== undefined) {
                // Rimuovi tutte le relazioni esistenti
                await tx.queueDisplayMonitorAmbulatorio.deleteMany({
                    where: { monitorId: id }
                });

                // Crea nuove relazioni
                if (ambulatoriIds.length > 0) {
                    await tx.queueDisplayMonitorAmbulatorio.createMany({
                        data: ambulatoriIds.map((ambulatorioId, index) => ({
                            monitorId: id,
                            ambulatorioId,
                            ordine: index
                        }))
                    });
                }
            }

            // Ritorna monitor aggiornato
            return tx.queueDisplayMonitor.findFirst({
                where: { id },
                include: {
                    ambulatori: {
                        include: {
                            ambulatorio: {
                                select: {
                                    id: true,
                                    nome: true,
                                    codice: true,
                                    specializzazione: true,
                                    stato: true
                                }
                            }
                        },
                        orderBy: { ordine: 'asc' }
                    },
                    poliambulatorio: {
                        select: {
                            id: true,
                            nome: true
                        }
                    }
                }
            });
        });

        logger.info({ monitorId: id, tenantId }, 'Monitor display aggiornato');
        return this.formatMonitor(monitor);
    }

    /**
     * Rigenera token di accesso
     * @param {string} id
     * @param {string} tenantId
     * @returns {Promise<Object>}
     */
    async regenerateToken(id, tenantId) {
        const existing = await prisma.queueDisplayMonitor.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!existing) {
            throw new Error('Monitor non trovato');
        }

        const newToken = this.generateAccessToken();

        const monitor = await prisma.queueDisplayMonitor.update({
            where: { id },
            data: { accessToken: newToken },
            include: {
                ambulatori: {
                    include: {
                        ambulatorio: {
                            select: {
                                id: true,
                                nome: true,
                                codice: true,
                                specializzazione: true
                            }
                        }
                    }
                }
            }
        });

        logger.info({ monitorId: id, tenantId }, 'Token monitor rigenerato');
        return this.formatMonitor(monitor);
    }

    /**
     * Elimina un monitor (soft delete)
     * @param {string} id
     * @param {string} tenantId
     * @returns {Promise<boolean>}
     */
    async delete(id, tenantId) {
        const existing = await prisma.queueDisplayMonitor.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!existing) {
            throw new Error('Monitor non trovato');
        }

        await prisma.queueDisplayMonitor.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                isActive: false,
                accessToken: null // Invalida token
            }
        });

        logger.info({ monitorId: id, tenantId }, 'Monitor display eliminato');
        return true;
    }

    /**
     * Ottiene le chiamate recenti filtrate per ambulatori del monitor
     * @param {string} monitorId
     * @param {Object} [options]
     * @param {number} [options.limit]
     * @returns {Promise<Object[]>}
     */
    async getRecentCalls(monitorId, { limit = 10 } = {}) {
        // Prima ottieni gli ambulatori del monitor
        const monitor = await prisma.queueDisplayMonitor.findFirst({
            where: { id: monitorId, deletedAt: null },
            include: {
                ambulatori: {
                    select: { ambulatorioId: true }
                }
            }
        });

        if (!monitor) {
            return [];
        }

        const ambulatoriIds = monitor.ambulatori.map(a => a.ambulatorioId);

        if (ambulatoriIds.length === 0) {
            return [];
        }

        // Ottieni chiamate solo per questi ambulatori
        const calls = await prisma.queueCall.findMany({
            where: {
                tenantId: monitor.tenantId,
                ambulatorioId: { in: ambulatoriIds }
            },
            include: {
                ambulatorio: {
                    select: {
                        id: true,
                        nome: true,
                        codice: true
                    }
                },
                numeroChiamata: {
                    select: {
                        id: true,
                        numero: true,
                        displayNumber: true,
                        stato: true
                    }
                }
            },
            orderBy: { calledAt: 'desc' },
            take: limit
        });

        return calls;
    }

    /**
     * Ottiene stato display per monitor
     * @param {string} monitorId
     * @returns {Promise<Object>}
     */
    async getDisplayState(monitorId) {
        const monitor = await prisma.queueDisplayMonitor.findFirst({
            where: { id: monitorId, deletedAt: null },
            include: {
                ambulatori: {
                    include: {
                        ambulatorio: {
                            select: {
                                id: true,
                                nome: true,
                                codice: true
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                },
                poliambulatorio: {
                    select: {
                        id: true,
                        nome: true
                    }
                }
            }
        });

        if (!monitor) {
            return null;
        }

        const ambulatoriIds = monitor.ambulatori.map(a => a.ambulatorioId);

        // Chiamata corrente (ultima chiamata non ancora completata)
        const currentCall = ambulatoriIds.length > 0 ? await prisma.queueCall.findFirst({
            where: {
                tenantId: monitor.tenantId,
                ambulatorioId: { in: ambulatoriIds },
                acknowledgedAt: null
            },
            include: {
                ambulatorio: {
                    select: {
                        id: true,
                        nome: true,
                        codice: true
                    }
                }
            },
            orderBy: { calledAt: 'desc' }
        }) : null;

        // Chiamate recenti
        const recentCalls = await this.getRecentCalls(monitorId, { limit: 5 });

        // Pazienti in attesa per questi ambulatori
        const waitingCount = ambulatoriIds.length > 0 ? await prisma.numeroChiamata.count({
            where: {
                tenantId: monitor.tenantId,
                ambulatorioId: { in: ambulatoriIds },
                stato: 'IN_ATTESA',
                deletedAt: null
            }
        }) : 0;

        return {
            monitor: this.formatMonitor(monitor),
            currentCall,
            recentCalls,
            waitingCount,
            ambulatoriIds
        };
    }

    /**
     * Formatta monitor per output API
     * @param {Object} monitor
     * @returns {Object}
     */
    formatMonitor(monitor) {
        return {
            id: monitor.id,
            tenantId: monitor.tenantId,
            nome: monitor.nome,
            codice: monitor.codice,
            descrizione: monitor.descrizione,
            poliambulatorioId: monitor.poliambulatorioId,
            poliambulatorio: monitor.poliambulatorio,
            config: monitor.config,
            isActive: monitor.isActive,
            accessToken: monitor.accessToken,
            accessUrl: monitor.accessToken ? `/display/monitor/${monitor.accessToken}` : null,
            ambulatori: monitor.ambulatori?.map(a => ({
                id: a.ambulatorio.id,
                nome: a.ambulatorio.nome,
                codice: a.ambulatorio.codice,
                specializzazione: a.ambulatorio.specializzazione,
                stato: a.ambulatorio.stato,
                ordine: a.ordine
            })) || [],
            createdAt: monitor.createdAt,
            updatedAt: monitor.updatedAt
        };
    }
}

export default new QueueDisplayMonitorService();
