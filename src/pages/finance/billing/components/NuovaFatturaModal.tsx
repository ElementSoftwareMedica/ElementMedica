/**
 * NuovaFatturaModal - P97
 *
 * Modal unificata per la creazione di fatture elettroniche.
 * Supporta tutti i tipi di servizio:
 *   - Visite mediche (privati e MDL)
 *   - Corsi di formazione
 *   - DVR, RSPP, Sopralluoghi, Nomine, Acconti
 * Supporta terzo pagante (genitore per minore, azienda per dipendente).
 * Permette la selezione tra più enti emittenti.
 *
 * @project P97 - Fatturazione Elettronica
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Plus, Trash2, ChevronDown, ChevronUp,
    User, Building2, AlertTriangle, Euro, FileText,
    Users, Shield, Briefcase, Activity, Clock, BookmarkCheck
} from 'lucide-react';
import { CRUDButton, CRUDPrimaryButton } from '../../../../components/ui';
import {
    useFatturazione,
    EnteEmittente,
    TipoServizio,
    TipoDocumentoFattura,
    ClienteType,
    TerzoPaganteTipo,
    CreaBozzaInput,
} from '../../../../hooks/finance/useFatturazione';
import { useToast } from '../../../../hooks/useToast';
import { apiGet, apiPatch, apiPut } from '../../../../services/api';
import { DatePickerElegante } from '../../../../components/ui/DatePickerElegante';
import ElegantSelect from '../../../../components/ui/ElegantSelect';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_SERVIZIO_OPTIONS: Array<{
    value: TipoServizio;
    label: string;
    icon: React.ReactNode;
    defaultDocumento: TipoDocumentoFattura;
    clientePreferred?: ClienteType;
    group: string;
}> = [
        // Clinica
        { value: 'VISITA', label: 'Visita medica (privata)', icon: <Activity className="h-4 w-4 text-teal-500" />, defaultDocumento: 'FATTURA', clientePreferred: 'PERSONA', group: 'Clinica' },
        { value: 'VISITA_MDL', label: 'Visita MDL (med. lavoro)', icon: <Activity className="h-4 w-4 text-blue-500" />, defaultDocumento: 'FATTURA', clientePreferred: 'AZIENDA', group: 'Medicina del Lavoro' },
        // Formazione
        { value: 'CORSO', label: 'Corso di formazione', icon: <Users className="h-4 w-4 text-violet-500" />, defaultDocumento: 'FATTURA', clientePreferred: 'AZIENDA', group: 'Formazione' },
        { value: 'CERTIFICAZIONE', label: 'Certificazione', icon: <Shield className="h-4 w-4 text-violet-500" />, defaultDocumento: 'FATTURA', group: 'Formazione' },
        // Medicina del Lavoro
        { value: 'DVR', label: 'DVR (Valutazione Rischi)', icon: <FileText className="h-4 w-4 text-orange-500" />, defaultDocumento: 'FATTURA', clientePreferred: 'AZIENDA', group: 'Medicina del Lavoro' },
        { value: 'RSPP', label: 'Incarico RSPP', icon: <Briefcase className="h-4 w-4 text-orange-500" />, defaultDocumento: 'FATTURA', clientePreferred: 'AZIENDA', group: 'Medicina del Lavoro' },
        { value: 'SOPRALLUOGO', label: 'Sopralluogo', icon: <Building2 className="h-4 w-4 text-orange-500" />, defaultDocumento: 'FATTURA', clientePreferred: 'AZIENDA', group: 'Medicina del Lavoro' },
        { value: 'NOMINA', label: 'Nomina (MC/RSPP/RLS)', icon: <Briefcase className="h-4 w-4 text-blue-500" />, defaultDocumento: 'FATTURA', clientePreferred: 'AZIENDA', group: 'Medicina del Lavoro' },
        // Finanziario
        { value: 'ACCONTO', label: 'Acconto (TD02)', icon: <Euro className="h-4 w-4 text-amber-500" />, defaultDocumento: 'ACCONTO', group: 'Finanziario' },
        { value: 'RIMBORSO', label: 'Rimborso spese', icon: <Euro className="h-4 w-4 text-gray-500" />, defaultDocumento: 'FATTURA', group: 'Finanziario' },
        { value: 'ALTRO', label: 'Altro', icon: <FileText className="h-4 w-4 text-gray-400" />, defaultDocumento: 'FATTURA', group: 'Altro' },
    ];

const ALIQUOTE_IVA = [
    { value: 22, label: '22% — Standard' },
    { value: 10, label: '10% — Ridotta' },
    { value: 4, label: '4% — Super ridotta' },
    { value: 0, label: '0% — Esente/Non imponibile' },
];

const NATURA_MAP: Record<number, string> = {
    0: 'N4', // Esente
};

const MODALITA_PAGAMENTO = [
    { value: 'MP05', label: 'Bonifico bancario' },
    { value: 'MP08', label: 'Carta di credito' },
    { value: 'MP01', label: 'Contanti' },
    { value: 'MP02', label: 'Assegno' },
    { value: 'MP12', label: 'RIBA' },
    { value: 'MP22', label: 'MAV' },
];

const CONDIZIONI_PAGAMENTO = [
    { value: 'TP02', label: 'Pagamento completo' },
    { value: 'TP01', label: 'Pagamento a rate' },
    { value: 'TP03', label: 'Anticipo' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineaInput {
    key: string;
    descrizione: string;
    quantita: number;
    unitaMisura: string;
    prezzoUnitario: number;
    aliquotaIva: number;
    natura: string;
    /** Prestazione di medicina estetica: se true + disagioPsicologico → esente IVA */
    medicineEstetica?: boolean;
}

type Sezione = 'tipo' | 'emittente' | 'destinatario' | 'terzo' | 'linee' | 'pagamento';

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
    id: Sezione;
    title: string;
    icon: React.ReactNode;
    open: boolean;
    onToggle: () => void;
    completed?: boolean;
}> = ({ title, icon, open, onToggle, completed }) => (
    <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            {icon}
            {title}
            {completed && (
                <span className="inline-block w-2 h-2 rounded-full bg-teal-500 ml-1" title="Completato" />
            )}
        </span>
        {open
            ? <ChevronUp className="h-4 w-4 text-gray-400" />
            : <ChevronDown className="h-4 w-4 text-gray-400" />
        }
    </button>
);

// ─── Input helper ─────────────────────────────────────────────────────────────

const Field: React.FC<{
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}> = ({ label, required, error, hint, children }) => (
    <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
        {hint && !error && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
);

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent";
const selectCls = `${inputCls} appearance-none bg-[linear-gradient(45deg,transparent_50%,#64748b_50%),linear-gradient(135deg,#64748b_50%,transparent_50%)] bg-[length:5px_5px,5px_5px] bg-[position:calc(100%-18px)_50%,calc(100%-13px)_50%] bg-no-repeat pr-9`;

// SistemaTS flag_opposizione: 0 = non si oppone (invia a TS, detraibile); 1 = oppone (non invia)
const defaultSistemaTsFlag = (ts: TipoServizio): number =>
    ts === 'VISITA_MDL' ? 1 : 0;

// ─── Main Component ───────────────────────────────────────────────────────────

export interface NuovaFatturaPrecompile {
    tipoServizio?: TipoServizio;
    personaId?: string;
    aziendaId?: string;
    visitaId?: string;
    courseScheduleId?: string;
    nominaId?: string;
    sopralluogoId?: string;
    dvrId?: string;
    preventivoId?: string;
    descrizioneDefault?: string;
    prezzoDefault?: number;
    sistemaTsDefault?: 0 | 1;
    cessionarioDenominazione?: string;
    cessionarioCF?: string;
    cessionarioPIVA?: string;
    cessionarioIndirizzo?: string;
    cessionarioCAP?: string;
    cessionarioCitta?: string;
    cessionarioProvincia?: string;
}

interface NuovaFatturaModalProps {
    onClose: () => void;
    onCreated: () => void;
    precompile?: NuovaFatturaPrecompile;
    /** If provided, modal enters edit mode (loads existing bozza and uses PUT) */
    editId?: string;
}

const NuovaFatturaModal: React.FC<NuovaFatturaModalProps> = ({ onClose, onCreated, precompile, editId }) => {
    const { showToast } = useToast();
    const { entiEmittenti, fetchEntiEmittenti, creaFatturaBozza } = useFatturazione();

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // ── Open sections ──────────────────────────────────────────────────────────
    const [openSections, setOpenSections] = useState<Set<Sezione>>(() => {
        const initial = new Set<Sezione>();
        // tipo: open if not pre-determined from precompile context
        if (!precompile?.tipoServizio && !precompile?.aziendaId && !precompile?.personaId) initial.add('tipo');
        // emittente: closed by default — il default viene auto-selezionato e il badge "completed" ne conferma lo stato
        // destinatario: sempre aperto
        initial.add('destinatario');
        return initial;
    });
    const toggleSection = (s: Sezione) => {
        setOpenSections(prev => {
            const next = new Set(prev);
            next.has(s) ? next.delete(s) : next.add(s);
            return next;
        });
    };

    // ── Form state ─────────────────────────────────────────────────────────────
    const [enteEmittenteId, setEnteEmittenteId] = useState('');
    // Auto-detect VISITA vs VISITA_MDL from context (aziendaId → MDL)
    const [tipoServizio, setTipoServizio] = useState<TipoServizio>(
        precompile?.tipoServizio ?? (precompile?.aziendaId ? 'VISITA_MDL' : 'VISITA')
    );
    const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoFattura>('FATTURA');
    const [dataEmissione, setDataEmissione] = useState(new Date().toISOString().split('T')[0]);
    const [dataScadenza, setDataScadenza] = useState('');

    // Destinatario
    const [clienteType, setClienteType] = useState<ClienteType>(precompile?.aziendaId ? 'AZIENDA' : 'PERSONA');
    const [cessionarioDenominazione, setCessionarioDenominazione] = useState(precompile?.cessionarioDenominazione ?? '');
    const [cessionarioCF, setCessionarioCF] = useState(precompile?.cessionarioCF ?? '');
    const [cessionarioPIVA, setCessionarioPIVA] = useState(precompile?.cessionarioPIVA ?? '');
    const [cessionarioIndirizzo, setCessionarioIndirizzo] = useState(precompile?.cessionarioIndirizzo ?? '');
    const [cessionarioCAP, setCessionarioCAP] = useState(precompile?.cessionarioCAP ?? '');
    const [cessionarioCitta, setCessionarioCitta] = useState(precompile?.cessionarioCitta ?? '');
    const [cessionarioProvincia, setCessionarioProvincia] = useState(precompile?.cessionarioProvincia ?? '');

    // Terzo pagante
    const [enableTerzo, setEnableTerzo] = useState(false);
    const [terzoPaganteTipo, setTerzoPaganteTipo] = useState<TerzoPaganteTipo>('GENITORE');
    const [terzoDenominazione, setTerzoDenominazione] = useState('');
    const [terzoCF, setTerzoCF] = useState('');
    const [terzoPIVA, setTerzoPIVA] = useState('');
    const [terzoIndirizzo, setTerzoIndirizzo] = useState('');
    const [terzoCAP, setTerzoCAP] = useState('');
    const [terzoCitta, setTerzoCitta] = useState('');
    const [terzoProvincia, setTerzoProvincia] = useState('');

    // Pagamento
    const [condizioniPagamento, setCondizioniPagamento] = useState('TP02');
    const [modalitaPagamento, setModalitaPagamento] = useState('MP08'); // default: carta di credito
    const [iban, setIban] = useState('');

    // Linee
    const _initialTipo = precompile?.tipoServizio ?? (precompile?.aziendaId ? 'VISITA_MDL' : 'VISITA');
    const _initialEsente = ['VISITA', 'VISITA_MDL'].includes(_initialTipo);
    const [linee, setLinee] = useState<LineaInput[]>([
        {
            key: '1',
            descrizione: precompile?.descrizioneDefault ?? '',
            quantita: 1,
            unitaMisura: '',
            prezzoUnitario: precompile?.prezzoDefault ?? 0,
            aliquotaIva: _initialEsente ? 0 : 22,
            natura: _initialEsente ? 'N4' : '',
        },
    ]);

    const [flagManualeOverride, setFlagManualeOverride] = useState(precompile?.sistemaTsDefault !== undefined);
    const [sistemaTsFlagOpp, setSistemaTsFlagOpp] = useState<number>(
        precompile?.sistemaTsDefault ?? defaultSistemaTsFlag(precompile?.tipoServizio ?? (precompile?.aziendaId ? 'VISITA_MDL' : 'VISITA'))
    );
    const [disagioPsicologico, setDisagioPsicologico] = useState(false);
    const [forceBollo, setForceBollo] = useState<boolean | undefined>(undefined);
    // Flag che indica se il valore di disagioPsicologico viene dal profilo paziente
    const [disagioFromProfile, setDisagioFromProfile] = useState(false);
    const [savingDisagioProfile, setSavingDisagioProfile] = useState(false);

    // ── Auto-sync sistemaTsFlagOpp con tipoServizio (salvo override manuale) ──
    useEffect(() => {
        if (!flagManualeOverride) {
            setSistemaTsFlagOpp(defaultSistemaTsFlag(tipoServizio));
        }
    }, [tipoServizio, flagManualeOverride]);

    // ── Auto-carica disagioPsicologico dal profilo paziente ───────────────────
    useEffect(() => {
        const personaId = precompile?.personaId;
        if (!personaId || tipoServizio !== 'VISITA') return;
        apiGet<{ success: boolean; data: { disagioPsicologico: boolean } }>(
            `/api/v1/persons/${personaId}/billing-settings`
        ).then(res => {
            if (res?.success) {
                const val = res.data.disagioPsicologico;
                setDisagioPsicologico(val);
                setDisagioFromProfile(val);
            }
        }).catch(() => { /* profilo non trovato o permesso negato: silent */ });
    }, [precompile?.personaId, tipoServizio]);

    const handleSaveDisagioProfile = async () => {
        const personaId = precompile?.personaId;
        if (!personaId) return;
        setSavingDisagioProfile(true);
        try {
            await apiPatch(`/api/v1/persons/${personaId}/billing-settings`, {
                disagioPsicologico
            });
            setDisagioFromProfile(disagioPsicologico);
            showToast({ type: 'success', message: 'Preferenza disagio psicologico salvata sul profilo paziente' });
        } catch {
            showToast({ type: 'error', message: 'Impossibile salvare la preferenza sul profilo paziente' });
        } finally {
            setSavingDisagioProfile(false);
        }
    };

    // ── Effects ────────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchEntiEmittenti();
    }, [fetchEntiEmittenti]);

    // Carica dati fattura esistente in modalità modifica
    useEffect(() => {
        if (!editId) return;
        apiGet<{ data: any }>(`/api/v1/billing/fatture/${editId}`)
            .then(res => {
                const f = res.data;
                if (!f) return;
                if (f.enteEmittenteId) setEnteEmittenteId(f.enteEmittenteId);
                if (f.tipoServizio) setTipoServizio(f.tipoServizio);
                if (f.tipoDocumento) setTipoDocumento(f.tipoDocumento);
                if (f.dataEmissione) setDataEmissione(new Date(f.dataEmissione).toISOString().split('T')[0]);
                if (f.dataScadenza) setDataScadenza(new Date(f.dataScadenza).toISOString().split('T')[0]);
                if (f.clienteType) setClienteType(f.clienteType);
                if (f.cessionarioDenominazione) setCessionarioDenominazione(f.cessionarioDenominazione);
                if (f.cessionarioCF) setCessionarioCF(f.cessionarioCF);
                if (f.cessionarioPIVA) setCessionarioPIVA(f.cessionarioPIVA);
                if (f.cessionarioIndirizzo) setCessionarioIndirizzo(f.cessionarioIndirizzo);
                if (f.cessionarioCAP) setCessionarioCAP(f.cessionarioCAP);
                if (f.cessionarioCitta) setCessionarioCitta(f.cessionarioCitta);
                if (f.cessionarioProvincia) setCessionarioProvincia(f.cessionarioProvincia);
                if (f.condizioniPagamento) setCondizioniPagamento(f.condizioniPagamento);
                if (f.modalitaPagamento) setModalitaPagamento(f.modalitaPagamento);
                if (f.iban) setIban(f.iban);
                if (f.sistemaTsFlagOpp !== undefined) { setSistemaTsFlagOpp(f.sistemaTsFlagOpp); setFlagManualeOverride(true); }
                if (f.disagioPsicologico) setDisagioPsicologico(f.disagioPsicologico);
                if (f.terzoPaganteTipo) {
                    setEnableTerzo(true);
                    setTerzoPaganteTipo(f.terzoPaganteTipo);
                    if (f.terzoPaganteDenominazione) setTerzoDenominazione(f.terzoPaganteDenominazione);
                    if (f.terzoPaganteCF) setTerzoCF(f.terzoPaganteCF);
                }
                if (f.linee?.length > 0) {
                    setLinee(f.linee.map((l: any, i: number) => ({
                        key: String(i + 1),
                        descrizione: l.descrizione || '',
                        quantita: l.quantita ?? 1,
                        unitaMisura: l.unitaMisura || '',
                        prezzoUnitario: l.prezzoUnitario ?? 0,
                        aliquotaIva: l.aliquotaIva ?? 22,
                        natura: l.natura || '',
                    })));
                }
            })
            .catch(() => {
                showToast({ type: 'error', message: 'Errore caricamento dati fattura' });
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editId]);

    // Imposta ente default
    useEffect(() => {
        if (!enteEmittenteId && entiEmittenti.length > 0) {
            const def = entiEmittenti.find(e => e.isDefault) ?? entiEmittenti[0];
            setEnteEmittenteId(def.id);
        }
    }, [entiEmittenti, enteEmittenteId]);

    // Adatta tipoDocumento e clienteType quando cambia tipoServizio
    useEffect(() => {
        const opt = TIPO_SERVIZIO_OPTIONS.find(o => o.value === tipoServizio);
        if (opt) {
            setTipoDocumento(opt.defaultDocumento);
            if (opt.clientePreferred) setClienteType(opt.clientePreferred);
        }
    }, [tipoServizio]);

    // IBAN default dall'ente emittente
    useEffect(() => {
        const ente = entiEmittenti.find(e => e.id === enteEmittenteId);
        if (ente?.iban) setIban(ente.iban);
    }, [enteEmittenteId, entiEmittenti]);

    // ── Linee helpers ──────────────────────────────────────────────────────────
    const addLinea = () => {
        const isEsente = ['VISITA', 'VISITA_MDL'].includes(tipoServizio);
        setLinee(prev => [...prev, {
            key: Date.now().toString(),
            descrizione: '', quantita: 1, unitaMisura: '',
            prezzoUnitario: 0,
            aliquotaIva: isEsente ? 0 : 22,
            natura: isEsente ? 'N4' : '',
        }]);
    };

    const removeLinea = (key: string) => {
        setLinee(prev => prev.filter(l => l.key !== key));
    };

    const updateLinea = (key: string, field: keyof LineaInput, value: string | number) => {
        setLinee(prev => prev.map(l => {
            if (l.key !== key) return l;
            const updated = { ...l, [field]: value };
            // Quando si attiva/disattiva il flag medicinEstetica, aggiorna IVA in base al disagio
            if (field === 'medicineEstetica') {
                if (tipoServizio === 'VISITA' || tipoServizio === 'VISITA_MDL') {
                    updated.aliquotaIva = value && !disagioPsicologico ? 22 : 0;
                    updated.natura = value && !disagioPsicologico ? '' : 'N4';
                } else if (value) {
                    updated.aliquotaIva = 22;
                    updated.natura = '';
                } else {
                    updated.aliquotaIva = 22;
                    updated.natura = '';
                }
            }
            return updated;
        }));
    };

    // Quando cambia disagioPsicologico, aggiorna tutte le righe di medicina estetica
    useEffect(() => {
        setLinee(prev => prev.map(l => {
            if (!l.medicineEstetica) return l;
            return { ...l, aliquotaIva: disagioPsicologico ? 0 : 22, natura: disagioPsicologico ? 'N4' : '' };
        }));
    }, [disagioPsicologico]);

    // ── Calcoli bollo e totali ─────────────────────────────────────────────────
    // lineeEffettive: safety override per garantire IVA corretta indipendentemente dallo stato UI
    const lineeEffettive = linee.map(l => {
        if (tipoServizio === 'VISITA' || tipoServizio === 'VISITA_MDL') {
            if (l.medicineEstetica && !disagioPsicologico) {
                return { ...l, aliquotaIva: 22, natura: '' };
            }
            return { ...l, aliquotaIva: 0, natura: 'N4' };
        }
        return l;
    });

    // Auto-bollo: totale >77.47 e almeno una riga esente
    const totaleLinee = lineeEffettive.reduce((s, l) => s + Number(l.quantita) * Number(l.prezzoUnitario), 0);
    const haEsenteIVA = lineeEffettive.some(l => Number(l.aliquotaIva) === 0);
    const autoBolloApplicabile = totaleLinee > 77.47 && haEsenteIVA;
    const bolloApplicato = forceBollo !== undefined ? forceBollo : autoBolloApplicabile;

    const totals = lineeEffettive.reduce(
        (acc, l) => {
            const tot = Number(l.quantita) * Number(l.prezzoUnitario);
            const iva = tot * (Number(l.aliquotaIva) / 100);
            acc.imponibile += tot;
            acc.iva += iva;
            acc.totale += tot + iva;
            return acc;
        },
        { imponibile: 0, iva: 0, totale: 0 }
    );
    // Aggiunge bollo al totale
    const totaleConBollo = bolloApplicato ? totals.totale + 2.00 : totals.totale;

    const formatEur = (n: number) =>
        n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

    // ── Validation ─────────────────────────────────────────────────────────────
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!enteEmittenteId) newErrors.enteEmittenteId = 'Seleziona l\'ente emittente';
        if (!cessionarioDenominazione.trim()) newErrors.cessionarioDenominazione = 'Denominazione obbligatoria';
        if (!cessionarioCF.trim()) newErrors.cessionarioCF = 'Codice fiscale obbligatorio';
        if (!cessionarioIndirizzo.trim()) newErrors.cessionarioIndirizzo = 'Indirizzo obbligatorio';
        if (!cessionarioCAP.trim()) newErrors.cessionarioCAP = 'CAP obbligatorio';
        if (!cessionarioCitta.trim()) newErrors.cessionarioCitta = 'Città obbligatoria';
        if (linee.length === 0) newErrors.linee = 'Aggiungi almeno una riga';
        linee.forEach((l, i) => {
            if (!l.descrizione.trim()) newErrors[`linea_${i}_desc`] = 'Descrizione obbligatoria';
            if (Number(l.prezzoUnitario) === 0) newErrors[`linea_${i}_prezzo`] = 'Prezzo > 0';
        });
        if (enableTerzo) {
            if (!terzoDenominazione.trim()) newErrors.terzoDenominazione = 'Denominazione terzo pagante obbligatoria';
            if (!terzoCF.trim()) newErrors.terzoCF = 'Codice fiscale terzo pagante obbligatorio';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!validate()) {
            showToast({ type: 'error', message: 'Correggi i campi obbligatori' });
            return;
        }

        setSubmitting(true);
        try {
            const input: CreaBozzaInput = {
                enteEmittenteId,
                tipoDocumento,
                tipoServizio,
                dataEmissione,
                ...(dataScadenza ? { dataScadenza } : {}),
                clienteType,
                cessionarioDenominazione,
                cessionarioCF,
                ...(cessionarioPIVA ? { cessionarioPIVA } : {}),
                cessionarioIndirizzo,
                cessionarioCAP,
                cessionarioCitta,
                ...(cessionarioProvincia ? { cessionarioProvincia } : {}),
                ...(enableTerzo ? {
                    terzoPaganteTipo,
                    terzoPaganteDenominazione: terzoDenominazione,
                    terzoPaganteCF: terzoCF,
                    ...(terzoPIVA ? { terzoPagantePIVA: terzoPIVA } : {}),
                    ...(terzoIndirizzo ? { terzoIndirizzoSede: terzoIndirizzo } : {}),
                    ...(terzoCAP ? { terzoCAPSede: terzoCAP } : {}),
                    ...(terzoCitta ? { terzoCittaSede: terzoCitta } : {}),
                    ...(terzoProvincia ? { terzoProvinciaSede: terzoProvincia } : {}),
                } : {}),
                condizioniPagamento,
                modalitaPagamento,
                ...(iban ? { iban } : {}),
                sistemaTsFlagOpp,
                disagioPsicologico,
                forceBollo,
                ...(precompile?.visitaId ? { visitaId: precompile.visitaId } : {}),
                ...(precompile?.personaId ? { clientePersonaId: precompile.personaId } : {}),
                ...(precompile?.aziendaId ? { clienteAziendaId: precompile.aziendaId } : {}),
                ...(precompile?.courseScheduleId ? { courseScheduleId: precompile.courseScheduleId } : {}),
                ...(precompile?.nominaId ? { nominaId: precompile.nominaId } : {}),
                ...(precompile?.sopralluogoId ? { sopralluogoId: precompile.sopralluogoId } : {}),
                ...(precompile?.dvrId ? { dvrId: precompile.dvrId } : {}),
                ...(precompile?.preventivoId ? { preventivoId: precompile.preventivoId } : {}),
                linee: lineeEffettive.map(l => ({
                    descrizione: l.descrizione,
                    quantita: Number(l.quantita),
                    ...(l.unitaMisura ? { unitaMisura: l.unitaMisura } : {}),
                    prezzoUnitario: Number(l.prezzoUnitario),
                    aliquotaIva: Number(l.aliquotaIva),
                    ...(l.natura ? { natura: l.natura } : {}),
                    ...(l.medicineEstetica ? { medicineEstetica: true } : {}),
                })),
            };

            if (editId) {
                await apiPut(`/api/v1/billing/fatture/${editId}`, input);
                showToast({ type: 'success', message: 'Fattura aggiornata con successo' });
            } else {
                await creaFatturaBozza(input);
                showToast({ type: 'success', message: 'Fattura in bozza creata con successo' });
            }
            onCreated();
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore creazione fattura' });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-2xl my-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editId ? 'Modifica Bozza Fattura' : 'Nuova Fattura Elettronica'}</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Bozza — verrà salvata e potrai emetter via SDI in seguito</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">

                    {/* ① Tipo Fattura */}
                    <SectionHeader id="tipo" title="Tipo fattura e servizio" icon={<FileText className="h-4 w-4 text-teal-500" />}
                        open={openSections.has('tipo')} onToggle={() => toggleSection('tipo')}
                        completed={!!tipoServizio}
                    />
                    {openSections.has('tipo') && (
                        <div className="px-1 pb-2 space-y-4">
                            <Field label="Tipo servizio" required>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {TIPO_SERVIZIO_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setTipoServizio(opt.value)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${tipoServizio === opt.value
                                                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium'
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            {opt.icon}
                                            <span className="truncate">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </Field>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Tipo documento" required>
                                    <ElegantSelect
                                        value={tipoDocumento}
                                        onChange={value => setTipoDocumento(value as TipoDocumentoFattura)}
                                        triggerClassName="h-10 rounded-lg"
                                        options={[
                                            { value: 'FATTURA', label: 'TD01 — Fattura' },
                                            { value: 'ACCONTO', label: 'TD02 — Acconto' },
                                            { value: 'NOTA_CREDITO', label: 'TD04 — Nota credito' },
                                            { value: 'NOTA_DEBITO', label: 'TD05 — Nota debito' },
                                        ]}
                                    />
                                </Field>
                                <Field label="Data emissione" required>
                                    <DatePickerElegante
                                        value={dataEmissione || null}
                                        onChange={(date) => setDataEmissione(date ? date.toISOString().split('T')[0] : '')}
                                        size="sm" />
                                </Field>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Data scadenza pagamento">
                                    <DatePickerElegante
                                        value={dataScadenza || null}
                                        onChange={(date) => setDataScadenza(date ? date.toISOString().split('T')[0] : '')}
                                        size="sm"
                                        clearable />
                                </Field>
                                <Field label="SistemaTS flag" hint="0 = invia a SistemaTS (spesa detraibile); 1 = opposizione (non invia, non detraibile)">
                                    <ElegantSelect
                                        value={String(sistemaTsFlagOpp)}
                                        onChange={value => { setSistemaTsFlagOpp(Number(value)); setFlagManualeOverride(true); }}
                                        triggerClassName="h-10 rounded-lg"
                                        options={[
                                            { value: '0', label: '0 — Invia a SistemaTS (detraibile)' },
                                            { value: '1', label: '1 — Opposizione (non invia)' },
                                        ]}
                                    />
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* ② Ente Emittente */}
                    <SectionHeader id="emittente" title="Ente emittente" icon={<Building2 className="h-4 w-4 text-violet-500" />}
                        open={openSections.has('emittente')} onToggle={() => toggleSection('emittente')}
                        completed={!!enteEmittenteId}
                    />
                    {openSections.has('emittente') && (
                        <div className="px-1 pb-2 space-y-3">
                            {errors.enteEmittenteId && (
                                <div className="flex items-center gap-2 text-xs text-red-500">
                                    <AlertTriangle className="h-3.5 w-3.5" /> {errors.enteEmittenteId}
                                </div>
                            )}
                            {entiEmittenti.length === 0 ? (
                                <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Nessun ente emittente configurato.{' '}
                                    <a href="/management/billing/enti-emittenti" className="underline">Configurane uno →</a>
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    {entiEmittenti.filter(e => e.isActive).map(ente => (
                                        <button
                                            key={ente.id}
                                            type="button"
                                            onClick={() => {
                                                setEnteEmittenteId(ente.id);
                                                setOpenSections(prev => { const next = new Set(prev); next.delete('emittente'); next.add('destinatario'); return next; });
                                            }}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${enteEmittenteId === ente.id
                                                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                {ente.tipo === 'SOCIETA'
                                                    ? <Building2 className="h-4 w-4 text-violet-500" />
                                                    : <User className="h-4 w-4 text-teal-500" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                                    {ente.denominazione}
                                                    {ente.isDefault && (
                                                        <span className="text-xs font-normal px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">Default</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                    {ente.codiceFiscale}{ente.piva ? ` · P.IVA ${ente.piva}` : ''} · {ente.regimeFiscale}
                                                </div>
                                            </div>
                                            {!ente.acubeConfigurato && (
                                                <span className="text-xs text-amber-500 flex items-center gap-1">
                                                    <AlertTriangle className="h-3.5 w-3.5" /> Senza AcubeAPI
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ③ Destinatario */}
                    <SectionHeader id="destinatario" title="Destinatario fattura" icon={<User className="h-4 w-4 text-blue-500" />}
                        open={openSections.has('destinatario')} onToggle={() => toggleSection('destinatario')}
                        completed={!!cessionarioDenominazione && !!cessionarioCF}
                    />
                    {openSections.has('destinatario') && (
                        <div className="px-1 pb-2 space-y-4">
                            <div className="flex gap-3">
                                {(['PERSONA', 'AZIENDA'] as ClienteType[]).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setClienteType(t)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${clienteType === t
                                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                                            }`}
                                    >
                                        {t === 'PERSONA' ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                                        {t === 'PERSONA' ? 'Persona fisica' : 'Azienda / Ente'}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Field label={clienteType === 'PERSONA' ? 'Cognome e Nome' : 'Ragione Sociale'} required error={errors.cessionarioDenominazione}>
                                        <input type="text" value={cessionarioDenominazione} onChange={e => setCessionarioDenominazione(e.target.value)}
                                            placeholder={clienteType === 'PERSONA' ? 'Rossi Mario' : 'Acme Srl'} className={inputCls} />
                                    </Field>
                                </div>
                                <Field label={clienteType === 'PERSONA' ? 'Codice Fiscale' : 'Codice Fiscale'} required error={errors.cessionarioCF}>
                                    <input type="text" value={cessionarioCF} onChange={e => setCessionarioCF(e.target.value.toUpperCase())}
                                        placeholder="RSSMRA80A01H501Z" className={inputCls} maxLength={16} />
                                </Field>
                                {clienteType === 'AZIENDA' && (
                                    <Field label="Partita IVA">
                                        <input type="text" value={cessionarioPIVA} onChange={e => setCessionarioPIVA(e.target.value)}
                                            placeholder="01234567890" className={inputCls} maxLength={11} />
                                    </Field>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-3">
                                    <Field label="Indirizzo" required error={errors.cessionarioIndirizzo}>
                                        <input type="text" value={cessionarioIndirizzo} onChange={e => setCessionarioIndirizzo(e.target.value)}
                                            placeholder="Via Roma 1" className={inputCls} />
                                    </Field>
                                </div>
                                <Field label="CAP" required error={errors.cessionarioCAP}>
                                    <input type="text" value={cessionarioCAP} onChange={e => setCessionarioCAP(e.target.value)}
                                        placeholder="20100" className={inputCls} maxLength={5} />
                                </Field>
                                <Field label="Città" required error={errors.cessionarioCitta}>
                                    <input type="text" value={cessionarioCitta} onChange={e => setCessionarioCitta(e.target.value)}
                                        placeholder="Milano" className={inputCls} />
                                </Field>
                                <Field label="Provincia (2 lettere)">
                                    <input type="text" value={cessionarioProvincia} onChange={e => setCessionarioProvincia(e.target.value.toUpperCase())}
                                        placeholder="MI" className={inputCls} maxLength={2} />
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* ④ Terzo Pagante (opzionale) */}
                    <div>
                        <button
                            type="button"
                            onClick={() => {
                                setEnableTerzo(!enableTerzo);
                                if (!enableTerzo) toggleSection('terzo');
                            }}
                            className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${enableTerzo ? 'bg-teal-500 border-teal-500' : 'border-gray-400 dark:border-gray-500'
                                }`}>
                                {enableTerzo && <div className="w-2 h-2 bg-white rounded-sm" />}
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                <Users className="h-4 w-4 text-amber-500" />
                                Terzo pagante (es. genitore per minore, azienda per dipendente)
                            </span>
                        </button>

                        {enableTerzo && openSections.has('terzo') && (
                            <div className="mt-2 px-1 pb-2 space-y-4">
                                <div className="flex gap-3 flex-wrap">
                                    {(['GENITORE', 'AZIENDA', 'ALTRO'] as TerzoPaganteTipo[]).map(t => (
                                        <button key={t} type="button" onClick={() => setTerzoPaganteTipo(t)}
                                            className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${terzoPaganteTipo === t
                                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium'
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                                }`}
                                        >
                                            {t === 'GENITORE' ? '👨‍👧 Genitore/Tutore' : t === 'AZIENDA' ? '🏢 Azienda' : '👤 Altro'}
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
                                    La fattura verrà intestata al <strong>destinatario</strong> (beneficiario della prestazione) ma il <strong>terzo pagante</strong> sarà indicato nel documento come soggetto che effettua il pagamento.
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <Field label="Denominazione terzo pagante" required error={errors.terzoDenominazione}>
                                            <input type="text" value={terzoDenominazione} onChange={e => setTerzoDenominazione(e.target.value)}
                                                placeholder={terzoPaganteTipo === 'GENITORE' ? 'Rossi Giovanni (padre)' : 'Azienda Alfa Srl'} className={inputCls} />
                                        </Field>
                                    </div>
                                    <Field label="Codice Fiscale terzo" required error={errors.terzoCF}>
                                        <input type="text" value={terzoCF} onChange={e => setTerzoCF(e.target.value.toUpperCase())}
                                            className={inputCls} maxLength={16} />
                                    </Field>
                                    {terzoPaganteTipo === 'AZIENDA' && (
                                        <Field label="P.IVA terzo">
                                            <input type="text" value={terzoPIVA} onChange={e => setTerzoPIVA(e.target.value)} className={inputCls} maxLength={11} />
                                        </Field>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <Field label="Indirizzo terzo">
                                            <input type="text" value={terzoIndirizzo} onChange={e => setTerzoIndirizzo(e.target.value)} className={inputCls} />
                                        </Field>
                                    </div>
                                    <Field label="CAP"><input type="text" value={terzoCAP} onChange={e => setTerzoCAP(e.target.value)} className={inputCls} maxLength={5} /></Field>
                                    <Field label="Città"><input type="text" value={terzoCitta} onChange={e => setTerzoCitta(e.target.value)} className={inputCls} /></Field>
                                    <Field label="Provincia"><input type="text" value={terzoProvincia} onChange={e => setTerzoProvincia(e.target.value.toUpperCase())} className={inputCls} maxLength={2} /></Field>
                                </div>
                            </div>
                        )}
                        {enableTerzo && !openSections.has('terzo') && (
                            <button type="button" onClick={() => toggleSection('terzo')}
                                className="mt-1 ml-4 text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400">
                                Mostra campi terzo pagante
                            </button>
                        )}
                    </div>

                    {/* ⑤ Linee */}
                    <SectionHeader id="linee" title={`Voci fattura (${linee.length})`} icon={<Euro className="h-4 w-4 text-teal-500" />}
                        open={openSections.has('linee')} onToggle={() => toggleSection('linee')}
                        completed={linee.every(l => l.descrizione.trim() && Number(l.prezzoUnitario) > 0)}
                    />
                    {openSections.has('linee') && (
                        <div className="px-1 pb-2 space-y-3">
                            {errors.linee && (
                                <div className="flex items-center gap-2 text-xs text-red-500"><AlertTriangle className="h-3.5 w-3.5" />{errors.linee}</div>
                            )}
                            {linee.map((linea, idx) => (
                                <div key={linea.key} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Riga {idx + 1}</span>
                                        {linee.length > 1 && (
                                            <button type="button" onClick={() => removeLinea(linea.key)}
                                                className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <Field label="Descrizione" required error={errors[`linea_${idx}_desc`]}>
                                        <input type="text" value={linea.descrizione}
                                            onChange={e => updateLinea(linea.key, 'descrizione', e.target.value)}
                                            placeholder="Visita medica specialistica — es. 'Visita di idoneità MDL ...'"
                                            className={inputCls} />
                                    </Field>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Field label="Qtà">
                                            <input type="number" min="0.01" step="0.01" value={linea.quantita}
                                                onChange={e => updateLinea(linea.key, 'quantita', e.target.value)}
                                                className={inputCls} />
                                        </Field>
                                        <Field label="Unità misura">
                                            <input type="text" value={linea.unitaMisura}
                                                onChange={e => updateLinea(linea.key, 'unitaMisura', e.target.value)}
                                                placeholder="es. ore, pz" className={inputCls} />
                                        </Field>
                                        <Field label="Prezzo unit. (€)" required error={errors[`linea_${idx}_prezzo`]}>
                                            <input type="number" min="0" step="0.01" value={linea.prezzoUnitario}
                                                onChange={e => updateLinea(linea.key, 'prezzoUnitario', e.target.value)}
                                                className={inputCls} />
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Aliquota IVA">
                                            <ElegantSelect
                                                value={String(linea.aliquotaIva)}
                                                onChange={value => updateLinea(linea.key, 'aliquotaIva', value)}
                                                triggerClassName="h-10 rounded-lg"
                                                options={ALIQUOTE_IVA.map(a => ({ value: String(a.value), label: a.label }))}
                                            />
                                        </Field>
                                        {Number(linea.aliquotaIva) === 0 && (
                                            <Field label="Natura (esenzione)">
                                                <ElegantSelect
                                                    value={linea.natura || 'N4'}
                                                    onChange={value => updateLinea(linea.key, 'natura', value)}
                                                    triggerClassName="h-10 rounded-lg"
                                                    options={[
                                                        { value: 'N4', label: 'N4 — Esenti art.10' },
                                                        { value: 'N2.2', label: 'N2.2 — Non soggette' },
                                                        { value: 'N3.5', label: 'N3.5 — Non imponibili' },
                                                        { value: 'N6', label: 'N6 — Reverse charge' },
                                                    ]}
                                                />
                                            </Field>
                                        )}
                                        <div className="flex items-end">
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                = {formatEur(Number(linea.quantita) * Number(linea.prezzoUnitario))}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Flag medicina estetica per esenzione IVA */}
                                    {tipoServizio === 'VISITA' && (
                                        <button type="button"
                                            onClick={() => updateLinea(linea.key, 'medicineEstetica' as keyof LineaInput, linea.medicineEstetica ? 0 : 1)}
                                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors text-left ${linea.medicineEstetica
                                                ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                                : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:text-purple-500'
                                                }`}>
                                            <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${linea.medicineEstetica ? 'bg-purple-500 border-purple-500' : 'border-gray-400'
                                                }`}>
                                                {linea.medicineEstetica && <div className="w-2 h-2 bg-white rounded-sm" />}
                                            </div>
                                            Prestazione estetica (può essere esente IVA se finalità terapeutica)
                                        </button>
                                    )}
                                </div>
                            ))}

                            <button type="button" onClick={addLinea}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-teal-400 hover:text-teal-500 dark:hover:border-teal-600 dark:hover:text-teal-400 transition-colors">
                                <Plus className="h-4 w-4" /> Aggiungi voce
                            </button>

                            {/* Totali */}
                            <div className="mt-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 space-y-1.5">
                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                                    <span>Imponibile</span><span className="font-medium">{formatEur(totals.imponibile)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                                    <span>IVA</span><span className="font-medium">{formatEur(totals.iva)}</span>
                                </div>
                                {/* Bollo virtuale */}
                                {(autoBolloApplicabile || forceBollo) && (
                                    <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                                        <span className="flex items-center gap-1">
                                            <span>🪙</span> Bollo virtuale (DPR 642/72)
                                        </span>
                                        <span className="font-medium">{formatEur(2.00)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white border-t border-teal-200 dark:border-teal-800 pt-1.5 mt-1.5">
                                    <span>TOTALE</span><span>{formatEur(totaleConBollo)}</span>
                                </div>
                            </div>

                            {/* Bollo override manuale */}
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50">
                                <div className="flex-1 space-y-1">
                                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                        🪙 Bollo virtuale €2.00
                                    </p>
                                    <p className="text-xs text-amber-600 dark:text-amber-500">
                                        {autoBolloApplicabile
                                            ? 'Auto-applicato: totale >€77.47 con riga esente IVA'
                                            : 'Non applicato automaticamente (totale ≤€77.47 o nessuna riga esente)'}
                                    </p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button type="button"
                                        onClick={() => setForceBollo(forceBollo === true ? undefined : true)}
                                        className={`px-2 py-1 text-xs rounded ${forceBollo === true ? 'bg-amber-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}>
                                        Forza sì
                                    </button>
                                    <button type="button"
                                        onClick={() => setForceBollo(forceBollo === false ? undefined : false)}
                                        className={`px-2 py-1 text-xs rounded ${forceBollo === false ? 'bg-gray-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}>
                                        Forza no
                                    </button>
                                    {forceBollo !== undefined && (
                                        <button type="button" onClick={() => setForceBollo(undefined)}
                                            className="px-2 py-1 text-xs rounded bg-white dark:bg-gray-700 text-gray-500 border border-gray-300 dark:border-gray-600">
                                            Auto
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Disagio psicologico — esenzione IVA medicina estetica */}
                            {tipoServizio === 'VISITA' && (
                                <div className="flex flex-col gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/50">
                                    <button type="button" onClick={() => setDisagioPsicologico(!disagioPsicologico)}
                                        className="flex items-start gap-2 text-left w-full">
                                        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${disagioPsicologico ? 'bg-purple-500 border-purple-500' : 'border-purple-300 dark:border-purple-600'
                                            }`}>
                                            {disagioPsicologico && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2">
                                                Finalità terapeutica (disagio psicologico)
                                                {disagioFromProfile && disagioPsicologico && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-600 border border-purple-200">
                                                        <BookmarkCheck className="w-3 h-3" />
                                                        dal profilo
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-purple-600 dark:text-purple-500">
                                                Applicare esenzione IVA art.10 n.18 DPR 633/72 alle prestazioni di medicina estetica
                                            </p>
                                        </div>
                                    </button>
                                    {/* Salva preferenza sul profilo paziente */}
                                    {precompile?.personaId && disagioPsicologico !== disagioFromProfile && (
                                        <button
                                            type="button"
                                            onClick={handleSaveDisagioProfile}
                                            disabled={savingDisagioProfile}
                                            className="self-start flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300 transition-colors disabled:opacity-50"
                                        >
                                            <BookmarkCheck className="w-3 h-3" />
                                            {savingDisagioProfile ? 'Salvataggio...' : 'Salva come predefinito per questo paziente'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ⑥ Pagamento */}
                    <SectionHeader id="pagamento" title="Modalità di pagamento" icon={<Clock className="h-4 w-4 text-gray-500" />}
                        open={openSections.has('pagamento')} onToggle={() => toggleSection('pagamento')}
                        completed={!!condizioniPagamento && !!modalitaPagamento}
                    />
                    {openSections.has('pagamento') && (
                        <div className="px-1 pb-2 grid grid-cols-2 gap-4">
                            <Field label="Condizioni pagamento">
                                <ElegantSelect
                                    value={condizioniPagamento}
                                    onChange={setCondizioniPagamento}
                                    triggerClassName="h-10 rounded-lg"
                                    options={CONDIZIONI_PAGAMENTO}
                                />
                            </Field>
                            <Field label="Modalità pagamento">
                                <ElegantSelect
                                    value={modalitaPagamento}
                                    onChange={setModalitaPagamento}
                                    triggerClassName="h-10 rounded-lg"
                                    options={MODALITA_PAGAMENTO}
                                />
                            </Field>
                            <div className="col-span-2">
                                <Field label="IBAN (per bonifico)" hint="Lascia vuoto per usare l'IBAN dell'ente emittente">
                                    <input type="text" value={iban} onChange={e => setIban(e.target.value)}
                                        placeholder="IT60X0542811101000000123456" className={inputCls} />
                                </Field>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 flex-shrink-0">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Totale: <span className="font-bold text-gray-900 dark:text-white">{formatEur(totaleConBollo)}</span>
                        {bolloApplicato && <span className="ml-1 text-xs text-amber-500">(incl. bollo)</span>}
                    </div>
                    <div className="flex items-center gap-3">
                        <CRUDButton onClick={onClose} disabled={submitting}>Annulla</CRUDButton>
                        <CRUDPrimaryButton onClick={handleSubmit} disabled={submitting || entiEmittenti.length === 0}>
                            {submitting ? (
                                <><span className="animate-spin mr-1.5">⏳</span> {editId ? 'Salvataggio…' : 'Creazione…'}</>
                            ) : (
                                <><FileText className="h-4 w-4 mr-1.5" /> {editId ? 'Salva Modifiche' : 'Crea Bozza'}</>
                            )}
                        </CRUDPrimaryButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NuovaFatturaModal;
