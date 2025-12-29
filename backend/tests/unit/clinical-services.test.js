/**
 * F11.2 Integration Tests - Clinical Services Tests
 * Tests business logic services with mocked Prisma
 * 
 * Covers:
 * - F11.2.1 API endpoint business logic
 * - F11.2.2 Workflow appuntamenti
 * - F11.2.3 Workflow visite
 * - F11.2.4 Multi-tenancy isolation
 */

import { jest } from '@jest/globals';

// ============================================================================
// MOCK SETUP
// ============================================================================

const mockPrisma = {
    poliambulatorio: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    ambulatorio: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    appuntamento: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    visita: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    prestazione: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    referto: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    slotDisponibilita: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    listinoPrezzi: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    strumento: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    convenzione: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    scontoClinico: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    templateCampoVisita: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    documentoClinico: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    orarioAmbulatorio: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    person: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    medico: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    paziente: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    },
    $transaction: jest.fn((callback) => callback(mockPrisma))
};

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
};

// Apply mocks
jest.unstable_mockModule('../../config/prisma-optimization.js', () => ({
    default: mockPrisma
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
    default: mockLogger
}));

// Import services after mocking
const {
    PoliambulatorioService,
    AmbulatorioService,
    AppuntamentoService,
    PrestazioneService,
    VisitaService,
    RefertoService,
    SlotDisponibilitaService,
    ListinoPrezzoService,
    StrumentoService,
    ConvenzioneService,
    ScontoClinicoService,
    TemplateCampoVisitaService,
    DocumentoClinicoService,
    OrarioAmbulatorioService
} = await import('../../services/clinical/index.js');

// ============================================================================
// TEST DATA
// ============================================================================

const TENANT_ID_1 = 'tenant-1';
const TENANT_ID_2 = 'tenant-2';

const mockPoliambulatorio = {
    id: 'poli-1',
    nome: 'Poliambulatorio Centro',
    codice: 'POL-001',
    indirizzo: 'Via Roma 1',
    cap: '00100',
    citta: 'Roma',
    provincia: 'RM',
    telefono: '06 1234567',
    email: 'info@poli.it',
    attivo: true,
    tenantId: TENANT_ID_1,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
};

const mockAmbulatorio = {
    id: 'amb-1',
    nome: 'Ambulatorio Cardiologia',
    codice: 'AMB-001',
    poliambulatorioId: 'poli-1',
    piano: '1',
    stanza: '101',
    attivo: true,
    tenantId: TENANT_ID_1,
    deletedAt: null
};

const mockPrestazione = {
    id: 'prest-1',
    codice: 'PREST-001',
    nome: 'Visita Cardiologica',
    descrizione: 'Visita specialistica cardiologica',
    prezzo: 150.00,
    aliquotaIva: 22,
    durataMinuti: 30,
    attiva: true,
    tenantId: TENANT_ID_1,
    deletedAt: null
};

const mockAppuntamento = {
    id: 'app-1',
    pazienteId: 'paz-1',
    medicoId: 'med-1',
    prestazioneId: 'prest-1',
    ambulatorioId: 'amb-1',
    dataOraInizio: new Date('2024-01-15T09:00:00Z'),
    dataOraFine: new Date('2024-01-15T09:30:00Z'),
    stato: 'PRENOTATO',
    note: 'Prima visita',
    tenantId: TENANT_ID_1,
    deletedAt: null
};

const mockVisita = {
    id: 'vis-1',
    appuntamentoId: 'app-1',
    pazienteId: 'paz-1',
    medicoId: 'med-1',
    prestazioneId: 'prest-1',
    dataOra: new Date('2024-01-15T09:00:00Z'),
    stato: 'IN_CORSO',
    anamnesi: 'Paziente riferisce dolori toracici',
    esamiObiettivo: null,
    diagnosi: null,
    terapia: null,
    note: 'Prima visita cardiologica',
    tenantId: TENANT_ID_1,
    deletedAt: null
};

const mockReferto = {
    id: 'ref-1',
    visitaId: 'vis-1',
    pazienteId: 'paz-1',
    medicoId: 'med-1',
    tipo: 'VISITA',
    contenuto: 'Referto della visita cardiologica',
    firmato: false,
    dataEmissione: new Date(),
    tenantId: TENANT_ID_1,
    deletedAt: null
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('F11.2 Clinical Services Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ==========================================================================
    // F11.2.1 - API ENDPOINT BUSINESS LOGIC
    // ==========================================================================

    describe('F11.2.1 API Endpoint Business Logic', () => {
        describe('PoliambulatorioService', () => {
            test('should get all poliambulatori with pagination', async () => {
                mockPrisma.poliambulatorio.findMany.mockResolvedValue([mockPoliambulatorio]);
                mockPrisma.poliambulatorio.count.mockResolvedValue(1);

                const result = await PoliambulatorioService.getAll(TENANT_ID_1, { page: 1, limit: 10 });

                expect(mockPrisma.poliambulatorio.findMany).toHaveBeenCalled();
                expect(result).toBeDefined();
            });

            test('should get poliambulatorio by id', async () => {
                mockPrisma.poliambulatorio.findFirst.mockResolvedValue(mockPoliambulatorio);

                const result = await PoliambulatorioService.getById('poli-1', TENANT_ID_1);

                expect(mockPrisma.poliambulatorio.findFirst).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            id: 'poli-1',
                            tenantId: TENANT_ID_1,
                            deletedAt: null
                        })
                    })
                );
                expect(result).toEqual(mockPoliambulatorio);
            });

            test('should create poliambulatorio with tenantId', async () => {
                mockPrisma.poliambulatorio.findFirst.mockResolvedValue(null);
                mockPrisma.poliambulatorio.create.mockResolvedValue(mockPoliambulatorio);

                const data = {
                    nome: 'Poliambulatorio Centro',
                    codice: 'POL-001',
                    indirizzo: 'Via Roma 1'
                };

                const result = await PoliambulatorioService.create(data, TENANT_ID_1);

                expect(mockPrisma.poliambulatorio.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            tenantId: TENANT_ID_1
                        })
                    })
                );
                expect(result).toBeDefined();
            });

            test('should update poliambulatorio', async () => {
                mockPrisma.poliambulatorio.findFirst.mockResolvedValue(mockPoliambulatorio);
                mockPrisma.poliambulatorio.update.mockResolvedValue({
                    ...mockPoliambulatorio,
                    nome: 'Nuovo Nome'
                });

                const result = await PoliambulatorioService.update('poli-1', { nome: 'Nuovo Nome' }, TENANT_ID_1);

                expect(result).toBeDefined();
            });

            test('should soft delete poliambulatorio', async () => {
                mockPrisma.poliambulatorio.findFirst.mockResolvedValue(mockPoliambulatorio);
                mockPrisma.poliambulatorio.update.mockResolvedValue({
                    ...mockPoliambulatorio,
                    deletedAt: new Date()
                });

                const result = await PoliambulatorioService.delete('poli-1', TENANT_ID_1);

                expect(mockPrisma.poliambulatorio.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            deletedAt: expect.any(Date)
                        })
                    })
                );
            });
        });

        describe('AmbulatorioService', () => {
            test('should get all ambulatori', async () => {
                mockPrisma.ambulatorio.findMany.mockResolvedValue([mockAmbulatorio]);
                mockPrisma.ambulatorio.count.mockResolvedValue(1);

                const result = await AmbulatorioService.getAll(TENANT_ID_1, {});

                expect(mockPrisma.ambulatorio.findMany).toHaveBeenCalled();
            });

            test('should create ambulatorio linked to poliambulatorio', async () => {
                // Setup required mocks
                mockPrisma.poliambulatorio.findFirst.mockResolvedValue(mockPoliambulatorio);
                mockPrisma.ambulatorio.create.mockResolvedValue(mockAmbulatorio);

                const data = {
                    nome: 'Ambulatorio Cardiologia',
                    codice: 'AMB-001',
                    poliambulatorioId: 'poli-1'
                };

                const result = await AmbulatorioService.create(data, TENANT_ID_1);

                expect(mockPrisma.ambulatorio.create).toHaveBeenCalled();
            });
        });

        describe('PrestazioneService', () => {
            test('should get all prestazioni', async () => {
                mockPrisma.prestazione.findMany.mockResolvedValue([mockPrestazione]);
                mockPrisma.prestazione.count.mockResolvedValue(1);

                const result = await PrestazioneService.getAll(TENANT_ID_1, {});

                expect(mockPrisma.prestazione.findMany).toHaveBeenCalled();
            });

            test('should create prestazione', async () => {
                mockPrisma.prestazione.findFirst.mockResolvedValue(null);
                mockPrisma.prestazione.create.mockResolvedValue(mockPrestazione);

                const data = {
                    codice: 'PREST-001',
                    nome: 'Visita Cardiologica',
                    prezzo: 150.00
                };

                const result = await PrestazioneService.create(data, TENANT_ID_1);

                expect(result).toBeDefined();
            });
        });
    });

    // ==========================================================================
    // F11.2.2 - WORKFLOW APPUNTAMENTI
    // ==========================================================================

    describe('F11.2.2 Workflow Appuntamenti', () => {
        test('should create appuntamento with full setup', async () => {
            // Setup all required mocks for create
            mockPrisma.appuntamento.count.mockResolvedValue(0);
            mockPrisma.person.findFirst.mockResolvedValue({ id: 'paz-1', nome: 'Test' });
            mockPrisma.ambulatorio.findFirst.mockResolvedValue({ id: 'amb-1', nome: 'Amb Test' });
            mockPrisma.appuntamento.findMany.mockResolvedValue([]); // No conflicts
            mockPrisma.appuntamento.create.mockResolvedValue(mockAppuntamento);

            const data = {
                pazienteId: 'paz-1',
                medicoId: 'med-1',
                prestazioneId: 'prest-1',
                ambulatorioId: 'amb-1',
                dataOra: new Date('2024-01-15T09:00:00Z'),
                durataPrevista: 30
            };

            const result = await AppuntamentoService.create(data, TENANT_ID_1);

            expect(mockPrisma.appuntamento.create).toHaveBeenCalled();
        });

        test('should get appuntamenti list', async () => {
            mockPrisma.appuntamento.findMany.mockResolvedValue([mockAppuntamento]);
            mockPrisma.appuntamento.count.mockResolvedValue(1);

            const result = await AppuntamentoService.getAll(TENANT_ID_1, {});

            expect(mockPrisma.appuntamento.findMany).toHaveBeenCalled();
        });

        test('should get appuntamento by id', async () => {
            mockPrisma.appuntamento.findFirst.mockResolvedValue(mockAppuntamento);

            const result = await AppuntamentoService.getById('app-1', TENANT_ID_1);

            expect(mockPrisma.appuntamento.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        id: 'app-1',
                        tenantId: TENANT_ID_1
                    })
                })
            );
        });

        test('should update appuntamento status', async () => {
            mockPrisma.appuntamento.findFirst.mockResolvedValue(mockAppuntamento);
            mockPrisma.appuntamento.update.mockResolvedValue({
                ...mockAppuntamento,
                stato: 'CONFERMATO'
            });

            const result = await AppuntamentoService.update('app-1', { stato: 'CONFERMATO' }, TENANT_ID_1);

            expect(mockPrisma.appuntamento.update).toHaveBeenCalled();
        });

        test('should filter appuntamenti by date range', async () => {
            mockPrisma.appuntamento.findMany.mockResolvedValue([mockAppuntamento]);
            mockPrisma.appuntamento.count.mockResolvedValue(1);

            const filters = {
                dataInizio: '2024-01-01',
                dataFine: '2024-01-31'
            };

            const result = await AppuntamentoService.getAll(TENANT_ID_1, filters);

            expect(mockPrisma.appuntamento.findMany).toHaveBeenCalled();
        });

        test('should filter appuntamenti by medico', async () => {
            mockPrisma.appuntamento.findMany.mockResolvedValue([mockAppuntamento]);
            mockPrisma.appuntamento.count.mockResolvedValue(1);

            const result = await AppuntamentoService.getAll(TENANT_ID_1, { medicoId: 'med-1' });

            expect(mockPrisma.appuntamento.findMany).toHaveBeenCalled();
        });

        test('should filter appuntamenti by paziente', async () => {
            mockPrisma.appuntamento.findMany.mockResolvedValue([mockAppuntamento]);
            mockPrisma.appuntamento.count.mockResolvedValue(1);

            const result = await AppuntamentoService.getAll(TENANT_ID_1, { pazienteId: 'paz-1' });

            expect(mockPrisma.appuntamento.findMany).toHaveBeenCalled();
        });

        test('should soft delete appuntamento', async () => {
            mockPrisma.appuntamento.findFirst.mockResolvedValue(mockAppuntamento);
            mockPrisma.appuntamento.update.mockResolvedValue({
                ...mockAppuntamento,
                deletedAt: new Date()
            });

            const result = await AppuntamentoService.delete('app-1', TENANT_ID_1);

            expect(mockPrisma.appuntamento.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        deletedAt: expect.any(Date)
                    })
                })
            );
        });
    });

    // ==========================================================================
    // F11.2.3 - WORKFLOW VISITE
    // ==========================================================================

    describe('F11.2.3 Workflow Visite', () => {
        test('should create visita with full setup', async () => {
            // Setup all required mocks for create
            mockPrisma.person.findFirst.mockResolvedValue({ id: 'paz-1', nome: 'Test' });
            mockPrisma.appuntamento.findFirst.mockResolvedValue({ id: 'app-1' });
            mockPrisma.prestazione.findFirst.mockResolvedValue({ id: 'prest-1', nome: 'Visita Cardiologica' });
            mockPrisma.visita.create.mockResolvedValue(mockVisita);
            mockPrisma.appuntamento.update.mockResolvedValue({});

            const data = {
                appuntamentoId: 'app-1',
                pazienteId: 'paz-1',
                medicoId: 'med-1',
                prestazioneId: 'prest-1',
                anamnesi: 'Paziente riferisce dolori toracici'
            };

            const result = await VisitaService.create(data, TENANT_ID_1);

            expect(mockPrisma.visita.create).toHaveBeenCalled();
        });

        test('should get visite list', async () => {
            mockPrisma.visita.findMany.mockResolvedValue([mockVisita]);
            mockPrisma.visita.count.mockResolvedValue(1);

            const result = await VisitaService.getAll(TENANT_ID_1, {});

            expect(mockPrisma.visita.findMany).toHaveBeenCalled();
        });

        test('should update visita with diagnosi', async () => {
            mockPrisma.visita.findFirst.mockResolvedValue(mockVisita);
            mockPrisma.visita.update.mockResolvedValue({
                ...mockVisita,
                diagnosi: 'Sospetta aritmia cardiaca',
                stato: 'COMPLETATA'
            });

            const result = await VisitaService.update('vis-1', {
                diagnosi: 'Sospetta aritmia cardiaca',
                stato: 'COMPLETATA'
            }, TENANT_ID_1);

            expect(mockPrisma.visita.update).toHaveBeenCalled();
        });

        test('should update visita with terapia', async () => {
            mockPrisma.visita.findFirst.mockResolvedValue(mockVisita);
            mockPrisma.visita.update.mockResolvedValue({
                ...mockVisita,
                diagnosi: 'Aritmia cardiaca lieve',
                terapia: 'Beta-bloccanti 50mg/die',
                stato: 'COMPLETATA'
            });

            const result = await VisitaService.update('vis-1', {
                diagnosi: 'Aritmia cardiaca lieve',
                terapia: 'Beta-bloccanti 50mg/die',
                stato: 'COMPLETATA'
            }, TENANT_ID_1);

            expect(mockPrisma.visita.update).toHaveBeenCalled();
        });

        test('should filter visite by paziente', async () => {
            mockPrisma.visita.findMany.mockResolvedValue([mockVisita]);
            mockPrisma.visita.count.mockResolvedValue(1);

            const result = await VisitaService.getAll(TENANT_ID_1, { pazienteId: 'paz-1' });

            expect(mockPrisma.visita.findMany).toHaveBeenCalled();
        });

        test('should filter visite by medico', async () => {
            mockPrisma.visita.findMany.mockResolvedValue([mockVisita]);
            mockPrisma.visita.count.mockResolvedValue(1);

            const result = await VisitaService.getAll(TENANT_ID_1, { medicoId: 'med-1' });

            expect(mockPrisma.visita.findMany).toHaveBeenCalled();
        });

        test('should filter visite by stato', async () => {
            mockPrisma.visita.findMany.mockResolvedValue([mockVisita]);
            mockPrisma.visita.count.mockResolvedValue(1);

            const result = await VisitaService.getAll(TENANT_ID_1, { stato: 'IN_CORSO' });

            expect(mockPrisma.visita.findMany).toHaveBeenCalled();
        });
    });

    // ==========================================================================
    // F11.2.4 - MULTI-TENANCY ISOLATION
    // ==========================================================================

    describe('F11.2.4 Multi-tenancy Isolation', () => {
        describe('Tenant isolation in queries', () => {
            test('poliambulatorio queries include tenantId filter', async () => {
                mockPrisma.poliambulatorio.findMany.mockResolvedValue([]);
                mockPrisma.poliambulatorio.count.mockResolvedValue(0);

                await PoliambulatorioService.getAll(TENANT_ID_1, {});

                expect(mockPrisma.poliambulatorio.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            tenantId: TENANT_ID_1
                        })
                    })
                );
            });

            test('ambulatorio queries include tenantId filter', async () => {
                mockPrisma.ambulatorio.findMany.mockResolvedValue([]);
                mockPrisma.ambulatorio.count.mockResolvedValue(0);

                await AmbulatorioService.getAll(TENANT_ID_1, {});

                expect(mockPrisma.ambulatorio.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            tenantId: TENANT_ID_1
                        })
                    })
                );
            });

            test('appuntamento queries include tenantId filter', async () => {
                mockPrisma.appuntamento.findMany.mockResolvedValue([]);
                mockPrisma.appuntamento.count.mockResolvedValue(0);

                await AppuntamentoService.getAll(TENANT_ID_1, {});

                expect(mockPrisma.appuntamento.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            tenantId: TENANT_ID_1
                        })
                    })
                );
            });

            test('visita queries include tenantId filter', async () => {
                mockPrisma.visita.findMany.mockResolvedValue([]);
                mockPrisma.visita.count.mockResolvedValue(0);

                await VisitaService.getAll(TENANT_ID_1, {});

                expect(mockPrisma.visita.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            tenantId: TENANT_ID_1
                        })
                    })
                );
            });

            test('prestazione queries include tenantId filter', async () => {
                mockPrisma.prestazione.findMany.mockResolvedValue([]);
                mockPrisma.prestazione.count.mockResolvedValue(0);

                await PrestazioneService.getAll(TENANT_ID_1, {});

                expect(mockPrisma.prestazione.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            tenantId: TENANT_ID_1
                        })
                    })
                );
            });

            test('referto queries include tenantId filter', async () => {
                mockPrisma.referto.findMany.mockResolvedValue([]);
                mockPrisma.referto.count.mockResolvedValue(0);

                await RefertoService.getAll(TENANT_ID_1, {});

                expect(mockPrisma.referto.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            tenantId: TENANT_ID_1
                        })
                    })
                );
            });
        });

        describe('Soft delete filtering', () => {
            test('queries include deletedAt: null filter', async () => {
                mockPrisma.poliambulatorio.findMany.mockResolvedValue([]);
                mockPrisma.poliambulatorio.count.mockResolvedValue(0);

                await PoliambulatorioService.getAll(TENANT_ID_1, {});

                expect(mockPrisma.poliambulatorio.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            deletedAt: null
                        })
                    })
                );
            });

            test('soft delete sets deletedAt timestamp', async () => {
                mockPrisma.poliambulatorio.findFirst.mockResolvedValue(mockPoliambulatorio);
                mockPrisma.poliambulatorio.update.mockResolvedValue({
                    ...mockPoliambulatorio,
                    deletedAt: new Date()
                });

                await PoliambulatorioService.delete('poli-1', TENANT_ID_1);

                expect(mockPrisma.poliambulatorio.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            deletedAt: expect.any(Date)
                        })
                    })
                );
            });
        });

        describe('Cross-tenant access prevention', () => {
            test('getById returns null for different tenant', async () => {
                // Simulate resource belonging to tenant-2
                mockPrisma.poliambulatorio.findFirst.mockResolvedValue(null);

                const result = await PoliambulatorioService.getById('poli-1', TENANT_ID_2);

                expect(result).toBeNull();
                expect(mockPrisma.poliambulatorio.findFirst).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            tenantId: TENANT_ID_2
                        })
                    })
                );
            });

            test('create sets tenantId from context', async () => {
                mockPrisma.poliambulatorio.create.mockResolvedValue({
                    ...mockPoliambulatorio,
                    tenantId: TENANT_ID_1
                });

                const data = { nome: 'Test', codice: 'TEST-001' };
                await PoliambulatorioService.create(data, TENANT_ID_1);

                expect(mockPrisma.poliambulatorio.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            tenantId: TENANT_ID_1
                        })
                    })
                );
            });
        });
    });
});
