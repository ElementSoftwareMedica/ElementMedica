/**
 * useFatturazione - Hook per la gestione delle fatture elettroniche P97
 */
import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDeleteWithPayload } from '../../services/api';

// ─── Tipi ────────────────────────────────────────────────────────────────────

export type StatoFattura = 'BOZZA' | 'EMESSA' | 'PAGATA' | 'ANNULLATA' | 'STORNATA';
export type TipoDocumentoFattura = 'FATTURA' | 'ACCONTO' | 'NOTA_CREDITO' | 'NOTA_DEBITO';
export type AcubeInvoiceStatus = 'BOZZA' | 'WAITING' | 'SENT' | 'DELIVERED' | 'NOT_DELIVERED' | 'REJECTED' | 'CANCELLED';
export type TipoEnteEmittente = 'SOCIETA' | 'PROFESSIONISTA' | 'PERSONA_FISICA';
export type TipoServizio =
    | 'VISITA'
    | 'VISITA_MDL'
    | 'CORSO'
    | 'FORMAZIONE'
    | 'CERTIFICAZIONE'
    | 'DVR'
    | 'RSPP'
    | 'SOPRALLUOGO'
    | 'NOMINA'
    | 'ACCONTO'
    | 'RIMBORSO'
    | 'ALTRO';
export type TerzoPaganteTipo = 'GENITORE' | 'AZIENDA' | 'ALTRO';
export type ClienteType = 'PERSONA' | 'AZIENDA';

export interface FatturaElettronicaLinea {
    id: string;
    fatturaId: string;
    numeroLinea: number;
    descrizione: string;
    quantita: number;
    unitaMisura?: string;
    prezzoUnitario: number;
    prezzoTotale: number;
    aliquotaIva: number;
    natura?: string;
}

export interface FatturaElettronica {
    id: string;
    tenantId: string;
    enteEmittenteId: string;
    enteEmittente?: {
        id: string;
        denominazione: string;
        tipo: TipoEnteEmittente;
    };
    cedenteDenominazione: string;
    cedenteCF: string;
    cedentePIVA?: string;
    tipoDocumento: TipoDocumentoFattura;
    tipoServizio: TipoServizio;
    numero: string;
    dataEmissione: string;
    dataScadenza?: string;
    clienteType: ClienteType;
    clientePersonaId?: string;
    clienteAziendaId?: string;
    cessionarioDenominazione: string;
    cessionarioCF: string;
    cessionarioPIVA?: string;
    cessionarioIndirizzo?: string;
    cessionarioCAP?: string;
    cessionarioCitta?: string;
    cessionarioProvincia?: string;
    // Terzo pagante (genitore per minore, azienda pagante per dipendente, ecc.)
    terzoPaganteTipo?: TerzoPaganteTipo;
    terzoPaganteDenominazione?: string;
    terzoPaganteCF?: string;
    terzoPagantePIVA?: string;
    terzoPersonaId?: string;
    terzoAziendaId?: string;
    imponibile: number;
    aliquotaIva: number;
    importoIva: number;
    totale: number;
    divisa: string;
    // Bollo virtuale
    bolloVirtuale: boolean;
    importoBollo: number;
    // IVA esenzione medicina estetica (disagio psicologico)
    disagioPsicologico: boolean;
    condizioniPagamento?: string;
    modalitaPagamento?: string;
    iban?: string;
    stato: StatoFattura;
    acubeStatus: AcubeInvoiceStatus;
    acubeUuid?: string;
    sistemaTsProtocol?: string;
    sistemaTsOutcome?: number;
    sistemaTsFlagOpp: number;
    fatturaOrigineId?: string;
    fatturaOrigine?: { id: string; numero: string; dataEmissione: string };
    noteCreditoEmesse?: Array<{ id: string; numero: string; totale: number; stato: StatoFattura }>;
    linee: FatturaElettronicaLinea[];
    // Collegamento entità dominio
    visitaId?: string;
    courseScheduleId?: string;
    nominaId?: string;
    sopralluogoId?: string;
    dvrId?: string;
    preventivoId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface FattureStats {
    contatori: {
        bozze: number;
        emesse: number;
        pagate: number;
        annullate: number;
        stornate: number;
    };
    totali: {
        emesso: number;
        incassato: number;
    };
    sdi: Record<string, number>;
}

export interface EnteEmittente {
    id: string;
    denominazione: string;
    label?: string;          // Etichetta profilo (es. "Studio Medico", "Azienda SRL")
    ruoloFatturazione?: string; // "azienda" | "medico" | "studio" | "laboratorio"
    tipo: TipoEnteEmittente;
    codiceFiscale: string;
    piva?: string;
    regimeFiscale: string;
    codiceAteco?: string;
    indirizzo?: string;
    citta?: string;
    cap?: string;
    provincia?: string;
    email?: string;
    pec?: string;
    iban?: string;
    sistemaTsAbilitato: boolean;
    annoNumFattura: number;
    progressivoFatt: number;
    isDefault: boolean;
    isActive: boolean;
    /** AcubeAPI è sempre gestita centralmente da ElementMedica (SaaS model) */
    acubeConfigurato: boolean;
    sistemaTsConfigurato: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreaBozzaInput {
    enteEmittenteId: string;
    tipoDocumento: TipoDocumentoFattura;
    tipoServizio: TipoServizio;
    dataEmissione?: string;
    dataScadenza?: string;
    clienteType: ClienteType;
    clientePersonaId?: string;
    clienteAziendaId?: string;
    // Terzo pagante
    terzoPaganteTipo?: TerzoPaganteTipo;
    terzoPaganteDenominazione?: string;
    terzoPaganteCF?: string;
    terzoPagantePIVA?: string;
    terzoPersonaId?: string;
    terzoAziendaId?: string;
    terzoIndirizzoSede?: string;
    terzoCAPSede?: string;
    terzoCittaSede?: string;
    terzoProvinciaSede?: string;
    // Dati cessionario (se non risolti automaticamente da clientePersonaId/clienteAziendaId)
    cessionarioDenominazione?: string;
    cessionarioCF?: string;
    cessionarioPIVA?: string;
    cessionarioIndirizzo?: string;
    cessionarioCAP?: string;
    cessionarioCitta?: string;
    cessionarioProvincia?: string;
    // Pagamento
    condizioniPagamento?: string;
    modalitaPagamento?: string;
    iban?: string;
    // Collegamento entità dominio
    preventivoId?: string;
    visitaId?: string;
    courseScheduleId?: string;
    nominaId?: string;
    sopralluogoId?: string;
    dvrId?: string;
    // Linee fattura
    linee: Array<{
        descrizione: string;
        quantita: number;
        unitaMisura?: string;
        prezzoUnitario: number;
        aliquotaIva: number;
        natura?: string;
        /** Medicina estetica: se true applica esenzione IVA ex art.10 n.18 DPR 633/72 */
        medicineEstetica?: boolean;
    }>;
    sistemaTsFlagOpp?: number;
    /** Applicazione manuale bollo (override auto-calcolo) */
    forceBollo?: boolean;
    /** Finalità terapeutica (disagio psicologico) → esenzione IVA prestazioni estetiche */
    disagioPsicologico?: boolean;
    note?: string;
    /**
     * IDs di movimentoContabile da collegare alla fattura.
     * Il backend aggiornerà fatturaElettronicaId su questi record
     * così scompaiono dalla lista "DA_FATTURARE".
     */
    sourceMovimentoIds?: string[];
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useFatturazione = () => {
    const [fatture, setFatture] = useState<FatturaElettronica[]>([]);
    const [stats, setStats] = useState<FattureStats | null>(null);
    const [entiEmittenti, setEntiEmittenti] = useState<EnteEmittente[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 50,
        pages: 1
    });

    // ── Fatture ──────────────────────────────────────────────────────────────

    const fetchFatture = useCallback(async (params: {
        stato?: string;
        tipoDocumento?: string;
        enteEmittenteId?: string;
        from?: string;
        to?: string;
        search?: string;
        page?: number;
        limit?: number;
        clientePersonaId?: string;
        clienteAziendaId?: string;
        visitaId?: string;
        courseScheduleId?: string;
        nominaId?: string;
        sopralluogoId?: string;
        dvrId?: string;
    } = {}) => {
        setLoading(true);
        setError(null);
        try {
            const query = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => v !== undefined && query.append(k, String(v)));
            const res = await apiGet<{ data: FatturaElettronica[]; meta: typeof pagination }>(`/api/v1/billing/fatture?${query}`);
            setFatture(res.data ?? []);
            setPagination(res.meta ?? { total: 0, page: 1, limit: 50, pages: 1 });
        } catch (err: unknown) {
            setError('Errore caricamento fatture');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async (params: { from?: string; to?: string } = {}) => {
        setLoadingStats(true);
        try {
            const query = new URLSearchParams();
            if (params.from) query.append('from', params.from);
            if (params.to) query.append('to', params.to);
            const res = await apiGet<{ data: FattureStats }>(`/api/v1/billing/fatture/stats?${query}`);
            setStats(res.data ?? null);
        } catch {
            // Stats non bloccanti
        } finally {
            setLoadingStats(false);
        }
    }, []);

    const getFattura = useCallback(async (id: string): Promise<FatturaElettronica | null> => {
        try {
            const res = await apiGet<{ data: FatturaElettronica }>(`/api/v1/billing/fatture/${id}`);
            return res.data ?? null;
        } catch {
            return null;
        }
    }, []);

    const creaFatturaBozza = useCallback(async (input: CreaBozzaInput): Promise<FatturaElettronica> => {
        const res = await apiPost<{ data: FatturaElettronica }>('/api/v1/billing/fatture', input);
        return res.data;
    }, []);

    const emettiFattura = useCallback(async (id: string): Promise<{ data: FatturaElettronica; message: string }> => {
        return await apiPost<{ data: FatturaElettronica; message: string }>(`/api/v1/billing/fatture/${id}/emetti`, {});
    }, []);

    const segnaPagata = useCallback(async (id: string): Promise<FatturaElettronica> => {
        const res = await apiPost<{ data: FatturaElettronica }>(`/api/v1/billing/fatture/${id}/segna-pagata`, {});
        return res.data;
    }, []);

    const creaNotaCredito = useCallback(async (id: string, note?: string): Promise<FatturaElettronica> => {
        const res = await apiPost<{ data: FatturaElettronica }>(`/api/v1/billing/fatture/${id}/nota-credito`, { note });
        return res.data;
    }, []);

    const aggiornaBozza = useCallback(async (id: string, data: Record<string, unknown>): Promise<FatturaElettronica> => {
        const res = await apiPut<{ data: FatturaElettronica }>(`/api/v1/billing/fatture/${id}`, data);
        return res.data;
    }, []);

    const eliminaFattura = useCallback(async (id: string, deletionReason: string): Promise<void> => {
        await apiDeleteWithPayload(`/api/v1/billing/fatture/${id}`, { deletionReason });
    }, []);

    // ── Enti Emittenti ────────────────────────────────────────────────────────

    const fetchEntiEmittenti = useCallback(async () => {
        try {
            const res = await apiGet<{ data: EnteEmittente[] }>('/api/v1/billing/enti-emittenti');
            setEntiEmittenti(res.data ?? []);
        } catch (err: unknown) {
        }
    }, []);

    const creaEnteEmittente = useCallback(async (data: Partial<EnteEmittente> & {
        acubeApiKey?: string;
        acubePassword?: string;
        sistemaTsPinCode?: string;
        sistemaTsPassword?: string;
    }): Promise<EnteEmittente> => {
        const res = await apiPost<{ data: EnteEmittente }>('/api/v1/billing/enti-emittenti', data);
        return res.data;
    }, []);

    const aggiornaEnteEmittente = useCallback(async (id: string, data: Partial<EnteEmittente> & {
        acubeApiKey?: string;
        acubePassword?: string;
        sistemaTsPinCode?: string;
        sistemaTsPassword?: string;
    }): Promise<EnteEmittente> => {
        const res = await apiPut<{ data: EnteEmittente }>(`/api/v1/billing/enti-emittenti/${id}`, data);
        return res.data;
    }, []);

    const eliminaEnteEmittente = useCallback(async (id: string, deletionReason: string): Promise<void> => {
        await apiDeleteWithPayload(`/api/v1/billing/enti-emittenti/${id}`, { deletionReason });
    }, []);

    const testConnessioneAcube = useCallback(async (id: string, credentials?: { email: string; password: string }): Promise<{ ok: boolean; message: string }> => {
        return await apiPost<{ ok: boolean; message: string }>(`/api/v1/billing/enti-emittenti/${id}/test-acube`, credentials || {});
    }, []);

    const testConnessioneSistemaTS = useCallback(async (id: string): Promise<{ ok: boolean; message: string }> => {
        return await apiPost<{ ok: boolean; message: string }>(`/api/v1/billing/enti-emittenti/${id}/test-sistema-ts`, {});
    }, []);

    return {
        // Fatture
        fatture,
        stats,
        loading,
        loadingStats,
        error,
        pagination,
        fetchFatture,
        fetchStats,
        getFattura,
        creaFatturaBozza,
        emettiFattura,
        segnaPagata,
        creaNotaCredito,
        aggiornaBozza,
        eliminaFattura,
        // Enti emittenti
        entiEmittenti,
        fetchEntiEmittenti,
        creaEnteEmittente,
        aggiornaEnteEmittente,
        eliminaEnteEmittente,
        testConnessioneAcube,
        testConnessioneSistemaTS,
    };
};
