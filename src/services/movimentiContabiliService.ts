/**
 * Movimenti Contabili Service
 * 
 * Frontend service per gestione movimenti contabili (P59)
 * 
 * Questo servizio gestisce la comunicazione con le API per:
 * - CRUD movimenti contabili
 * - Dashboard finanziaria
 * - Aging report (scadenze)
 * - Statistiche e aggregazioni
 */

import api, { apiDeleteWithPayload } from './api';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type DirezioneMovimento = 'ENTRATA' | 'USCITA';

export type StatoMovimento =
    | 'BOZZA'
    | 'CONFERMATO'
    | 'FATTURATO'
    | 'PAGATO'
    | 'SCADUTO'
    | 'ANNULLATO';

export type TipoAttivitaMovimento =
    | 'VISITA_MEDICA'
    | 'VISITA_SPECIALISTICA'
    | 'ESAME_DIAGNOSTICO'
    | 'GIUDIZIO_IDONEITA'
    | 'ALLEGATO_3B'
    | 'DVR'
    | 'SOPRALLUOGO'
    | 'NOMINA_RUOLO'
    | 'CORSO_FORMAZIONE'
    | 'CORSO_AGGIORNAMENTO'
    | 'BUNDLE_PACCHETTO'
    | 'PREVENTIVO'
    | 'CONSULENZA'
    | 'ALTRO';

export type TipoSoggettoMovimento =
    | 'PAZIENTE'
    | 'AZIENDA'
    | 'MEDICO_COLLABORATORE'
    | 'FORNITORE'
    | 'SEDE';

export type TipoCompensoMedico =
    | 'PERCENTUALE_VISITA'
    | 'FISSO_VISITA'
    | 'FISSO_MENSILE'
    | 'PERCENTUALE_FATTURATO';

export type BranchType = 'MEDICA' | 'FORMAZIONE';

export interface MovimentoContabile {
    id: string;
    direzione: DirezioneMovimento;
    tipo: TipoAttivitaMovimento;
    stato: StatoMovimento;

    // Riferimenti alle attività
    visitaId?: string;
    appuntamentoId?: string;
    appPrestazioneId?: string;
    sopralluogoId?: string;
    dvrId?: string;
    nominaRuoloId?: string;
    courseScheduleId?: string;
    bundleId?: string;
    giudizioIdoneitaId?: string;
    allegato3bId?: string;
    refertoId?: string;

    // Soggetto del movimento
    tipoSoggetto: TipoSoggettoMovimento;
    personId?: string;
    companyTenantProfileId?: string;
    siteId?: string;

    // Movimento collegato (per coppie ENTRATA/USCITA)
    movimentoCollegatoId?: string;

    // Importi
    importoLordo: number;
    aliquotaIva: number;
    importoIva: number;
    importoNetto: number;
    ritenutaAcconto?: number;
    importoDaPagare?: number;
    scontoApplicato?: number;
    scontoMotivo?: string;

    // Compenso medico
    compensoTipo?: TipoCompensoMedico;
    compensoValore?: number;
    importoRiferimento?: number;

    // Date
    dataEsecuzione: string;
    dataRegistrazione: string;
    dataScadenza?: string;
    dataFatturazione?: string;
    dataPagamento?: string;

    // Fatturazione
    fatturaId?: string;
    preventivoId?: string;
    numeroFatturaRicevuta?: string;
    dataFatturaRicevuta?: string;
    fileFatturaRicevuta?: string;

    // Tariffario
    voceTariffarioId?: string;
    tariffarioMedicoId?: string;
    listinoId?: string;

    // Pagamento
    metodoPagamento?: string;
    riferimentoPagamento?: string;

    // Descrizione
    descrizione?: string;
    note?: string;

    // Metadata
    branch_type: BranchType;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    createdBy?: string;
    updatedBy?: string;

    // Relazioni (opzionali, popolate da include)
    visita?: { id: string; dataVisita: string };
    appuntamento?: { id: string; dataOraInizio: string };
    sopralluogo?: { id: string; dataOra: string };
    dvr?: { id: string; numero: string };
    nominaRuolo?: { id: string; ruolo: string };
    courseSchedule?: { id: string; course?: { title: string } };
    giudizioIdoneita?: { id: string; esito: string };
    person?: { id: string; firstName: string; lastName: string };
    companyTenantProfile?: { id: string; ragioneSociale: string };
    companySite?: { id: string; name: string };
    fattura?: { id: string; numero: string };
}

// ============================================
// REQUEST INTERFACES
// ============================================

export interface MovimentiContabiliListParams {
    page?: number;
    limit?: number;
    direzione?: DirezioneMovimento;
    stato?: StatoMovimento | StatoMovimento[];
    tipo?: TipoAttivitaMovimento;
    tipoSoggetto?: TipoSoggettoMovimento;
    branchType?: BranchType;
    personId?: string;
    companyTenantProfileId?: string;
    dataEsecuzioneDa?: string;
    dataEsecuzioneA?: string;
    dataScadenzaDa?: string;
    dataScadenzaA?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    include?: string; // comma separated: visita,person,company,fattura
}

export interface CreateMovimentoInput {
    direzione: DirezioneMovimento;
    tipo: TipoAttivitaMovimento;
    tipoSoggetto: TipoSoggettoMovimento;
    importoLordo: number;
    importoNetto: number;
    aliquotaIva?: number;
    importoIva?: number;
    stato?: StatoMovimento;
    dataEsecuzione: string;
    dataScadenza?: string;
    descrizione?: string;
    note?: string;
    branch_type?: BranchType;

    // Riferimenti opzionali
    visitaId?: string;
    appuntamentoId?: string;
    sopralluogoId?: string;
    dvrId?: string;
    nominaRuoloId?: string;
    courseScheduleId?: string;
    personId?: string;
    companyTenantProfileId?: string;
    siteId?: string;

    // Compenso medico
    compensoTipo?: TipoCompensoMedico;
    compensoValore?: number;
}

export interface UpdateMovimentoInput extends Partial<CreateMovimentoInput> {
    dataPagamento?: string;
    metodoPagamento?: string;
    riferimentoPagamento?: string;
    fatturaId?: string;
    numeroFatturaRicevuta?: string;
    dataFatturaRicevuta?: string;
    dataFatturazione?: string;
}

// ============================================
// RESPONSE INTERFACES
// ============================================

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface DashboardStats {
    totaleEntrate: number;
    totaleUscite: number;
    saldo: number;
    entratePerStato: Record<StatoMovimento, number>;
    uscitePerStato: Record<StatoMovimento, number>;
    entratePerTipo: Record<TipoAttivitaMovimento, number>;
    uscitePerTipo: Record<TipoAttivitaMovimento, number>;
    trend: {
        periodo: string;
        entrate: number;
        uscite: number;
        saldo: number;
    }[];
}

export interface AgingReportItem {
    fascia: string; // '0-30', '31-60', '61-90', '90+'
    count: number;
    importoTotale: number;
    movimenti: MovimentoContabile[];
}

export interface AgingReport {
    direzione: DirezioneMovimento;
    dataRiferimento: string;
    fasce: AgingReportItem[];
    totale: {
        count: number;
        importo: number;
    };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Parse numeric fields from string to number
 */
function parseMovimento(m: any): MovimentoContabile {
    return {
        ...m,
        importoLordo: parseFloat(m.importoLordo) || 0,
        importoNetto: parseFloat(m.importoNetto) || 0,
        aliquotaIva: parseFloat(m.aliquotaIva) || 0,
        importoIva: parseFloat(m.importoIva) || 0,
        ritenutaAcconto: m.ritenutaAcconto ? parseFloat(m.ritenutaAcconto) : undefined,
        importoDaPagare: m.importoDaPagare ? parseFloat(m.importoDaPagare) : undefined,
        scontoApplicato: m.scontoApplicato ? parseFloat(m.scontoApplicato) : undefined,
        compensoValore: m.compensoValore ? parseFloat(m.compensoValore) : undefined,
        importoRiferimento: m.importoRiferimento ? parseFloat(m.importoRiferimento) : undefined,
    };
}

// ============================================
// SERVICE CLASS
// ============================================

class MovimentiContabiliService {
    private basePath = '/api/v1/movimenti-contabili';

    // ==========================================
    // CRUD OPERATIONS
    // ==========================================

    /**
     * List movimenti with filters and pagination
     */
    async list(params?: MovimentiContabiliListParams): Promise<PaginatedResponse<MovimentoContabile>> {
        const response = await api.get(this.basePath, { params });
        const responseData = response.data as any;

        // Handle response structure
        const data = responseData?.data || responseData;
        const movimenti = data?.movimenti || data?.data || [];
        const pagination = data?.pagination || {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: movimenti.length,
            totalPages: 1
        };

        return {
            data: movimenti.map(parseMovimento),
            pagination
        };
    }

    /**
     * Get movimento by ID
     */
    async getById(id: string, include?: string): Promise<MovimentoContabile> {
        const response = await api.get(`${this.basePath}/${id}`, {
            params: include ? { include } : undefined
        });
        const responseData = response.data as any;
        const movimento = responseData?.data || responseData;
        return parseMovimento(movimento);
    }

    /**
     * Create new movimento
     */
    async create(input: CreateMovimentoInput): Promise<MovimentoContabile> {
        const response = await api.post(this.basePath, input);
        const responseData = response.data as any;
        const movimento = responseData?.data || responseData;
        return parseMovimento(movimento);
    }

    /**
     * Update movimento
     */
    async update(id: string, input: UpdateMovimentoInput): Promise<MovimentoContabile> {
        const response = await api.patch(`${this.basePath}/${id}`, input);
        const responseData = response.data as any;
        const movimento = responseData?.data || responseData;
        return parseMovimento(movimento);
    }

    /**
     * Soft delete movimento (GDPR compliant)
     */
    async delete(id: string, deletionReason: string): Promise<void> {
        await apiDeleteWithPayload(`${this.basePath}/${id}`, { deletionReason });
    }

    // ==========================================
    // BULK OPERATIONS
    // ==========================================

    /**
     * Create paired movements (ENTRATA + USCITA)
     */
    async createPair(
        entrataInput: CreateMovimentoInput,
        uscitaInput: CreateMovimentoInput
    ): Promise<{ entrata: MovimentoContabile; uscita: MovimentoContabile }> {
        const response = await api.post(`${this.basePath}/pair`, {
            entrata: entrataInput,
            uscita: uscitaInput
        });
        const responseData = response.data as any;
        const data = responseData?.data || responseData;
        return {
            entrata: parseMovimento(data.entrata),
            uscita: parseMovimento(data.uscita)
        };
    }

    /**
     * Bulk update stato
     */
    async bulkUpdateStato(ids: string[], stato: StatoMovimento): Promise<number> {
        const response = await api.patch(`${this.basePath}/bulk/stato`, { ids, stato });
        const responseData = response.data as any;
        return responseData?.data?.updated || responseData?.updated || 0;
    }

    // ==========================================
    // PAYMENT OPERATIONS
    // ==========================================

    /**
     * Mark movimento as paid
     */
    async markAsPaid(
        id: string,
        dataPagamento: string,
        metodoPagamento?: string,
        riferimentoPagamento?: string
    ): Promise<MovimentoContabile> {
        return this.update(id, {
            stato: 'PAGATO',
            dataPagamento,
            metodoPagamento,
            riferimentoPagamento
        });
    }

    /**
     * Link movimento to fattura
     */
    async linkToFattura(id: string, fatturaId: string): Promise<MovimentoContabile> {
        return this.update(id, {
            stato: 'FATTURATO',
            fatturaId,
            dataFatturazione: new Date().toISOString()
        });
    }

    // ==========================================
    // DASHBOARD & REPORTS
    // ==========================================

    /**
     * Get dashboard statistics
     */
    async getDashboardStats(params?: {
        branchType?: BranchType;
        dataDa?: string;
        dataA?: string;
    }): Promise<DashboardStats> {
        const response = await api.get(`${this.basePath}/dashboard/stats`, { params });
        const responseData = response.data as any;
        return responseData?.data || responseData;
    }

    /**
     * Get aging report (scadenze)
     */
    async getAgingReport(params?: {
        direzione?: DirezioneMovimento;
        branchType?: BranchType;
        dataRiferimento?: string;
    }): Promise<AgingReport> {
        const response = await api.get(`${this.basePath}/reports/aging`, { params });
        const responseData = response.data as any;
        return responseData?.data || responseData;
    }

    /**
     * Get movimenti scaduti
     */
    async getScaduti(params?: {
        direzione?: DirezioneMovimento;
        branchType?: BranchType;
        giorniScaduti?: number;
    }): Promise<MovimentoContabile[]> {
        const response = await api.get(`${this.basePath}/scaduti`, { params });
        const responseData = response.data as any;
        const movimenti = responseData?.data || responseData || [];
        return movimenti.map(parseMovimento);
    }

    /**
     * Get movimenti in scadenza
     */
    async getInScadenza(params?: {
        direzione?: DirezioneMovimento;
        branchType?: BranchType;
        giorniProssimi?: number;
    }): Promise<MovimentoContabile[]> {
        const response = await api.get(`${this.basePath}/in-scadenza`, { params });
        const responseData = response.data as any;
        const movimenti = responseData?.data || responseData || [];
        return movimenti.map(parseMovimento);
    }

    // ==========================================
    // AGGREGATIONS
    // ==========================================

    /**
     * Get totali per direzione
     */
    async getTotali(params?: {
        branchType?: BranchType;
        dataDa?: string;
        dataA?: string;
        stato?: StatoMovimento[];
    }): Promise<{
        entrate: { count: number; importoLordo: number; importoNetto: number };
        uscite: { count: number; importoLordo: number; importoNetto: number };
        saldo: number;
    }> {
        const response = await api.get(`${this.basePath}/totali`, { params });
        const responseData = response.data as any;
        return responseData?.data || responseData;
    }

    /**
     * Get movimenti by soggetto
     */
    async getBySoggetto(
        tipoSoggetto: TipoSoggettoMovimento,
        soggettoId: string,
        params?: MovimentiContabiliListParams
    ): Promise<PaginatedResponse<MovimentoContabile>> {
        return this.list({
            ...params,
            tipoSoggetto,
            ...(tipoSoggetto === 'PAZIENTE' ? { personId: soggettoId } : {}),
            ...(tipoSoggetto === 'AZIENDA' ? { companyTenantProfileId: soggettoId } : {}),
        });
    }

    /**
     * Get movimenti by attività (visita, sopralluogo, etc.)
     */
    async getByAttivita(
        tipo: 'visita' | 'sopralluogo' | 'dvr' | 'nomina' | 'corso',
        attivitaId: string
    ): Promise<MovimentoContabile[]> {
        const paramKey = {
            visita: 'visitaId',
            sopralluogo: 'sopralluogoId',
            dvr: 'dvrId',
            nomina: 'nominaRuoloId',
            corso: 'courseScheduleId'
        }[tipo];

        const response = await api.get(this.basePath, {
            params: { [paramKey]: attivitaId }
        });
        const responseData = response.data as any;
        const movimenti = responseData?.data?.movimenti || responseData?.data || [];
        return movimenti.map(parseMovimento);
    }

    // ==========================================
    // EXPORT
    // ==========================================

    /**
     * Export movimenti to Excel
     */
    async exportExcel(params?: MovimentiContabiliListParams): Promise<Blob> {
        const response = await api.get(`${this.basePath}/export/excel`, {
            params,
            responseType: 'blob'
        });
        return response.data as Blob;
    }

    /**
     * Export movimenti to PDF
     */
    async exportPdf(params?: MovimentiContabiliListParams): Promise<Blob> {
        const response = await api.get(`${this.basePath}/export/pdf`, {
            params,
            responseType: 'blob'
        });
        return response.data as Blob;
    }
}

// Export singleton instance
const movimentiContabiliService = new MovimentiContabiliService();
export default movimentiContabiliService;
