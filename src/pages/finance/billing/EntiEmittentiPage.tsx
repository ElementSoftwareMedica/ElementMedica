/**
 * EntiEmittentiPage - P97 (aggiornato P98 Part 4 - SaaS model)
 *
 * Gestione degli enti emittenti per la fatturazione.
 *
 * === ARCHITETTURA SaaS ===
 * AcubeAPI è gestita CENTRALMENTE da ElementMedica.
 * I tenant configurano SOLO dati fiscali; nessuna credenziale AcubeAPI richiesta.
 * Più enti per tenant: es. "Studio Medico Srl" + "Dott. Rossi — Libero Professionista".
 */
import React, { useEffect, useState } from 'react';
import {
    Building2, User, Plus, Edit2, Trash2, CheckCircle2,
    XCircle, Wifi, WifiOff, RefreshCw, Shield,
    Star, AlertTriangle, Info, Zap, Globe
} from 'lucide-react';
import { CRUDPrimaryButton } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { useFatturazione, EnteEmittente, TipoEnteEmittente } from '../../../hooks/finance/useFatturazione';
import { apiPost } from '../../../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<TipoEnteEmittente, { label: string; icon: React.ReactNode }> = {
    SOCIETA: { label: 'Società', icon: <Building2 className="h-4 w-4" /> },
    PROFESSIONISTA: { label: 'Professionista', icon: <User className="h-4 w-4" /> },
    PERSONA_FISICA: { label: 'Persona fisica', icon: <User className="h-4 w-4" /> },
};

const REGIME_LABEL: Record<string, string> = {
    RF01: 'Ordinario',
    RF02: 'Contribuenti minimi',
    RF04: 'Agricoltura',
    RF05: 'Vendita sali e tabacchi',
    RF10: 'Agenzie viaggi',
    RF19: 'Forfettario',
};

// ─── EnteCard ─────────────────────────────────────────────────────────────────

interface EnteCardProps {
    ente: EnteEmittente;
    onEdit: (ente: EnteEmittente) => void;
    onDelete: (ente: EnteEmittente) => void;
    onTestSistemaTS: (ente: EnteEmittente) => Promise<void>;
}

const EnteCard: React.FC<EnteCardProps> = ({ ente, onEdit, onDelete, onTestSistemaTS }) => {
    const [testingSTS, setTestingSTS] = useState(false);
    const [stsOk, setStsOk] = useState<boolean | null>(null);

    const handleTestSTS = async () => {
        setTestingSTS(true);
        try {
            await onTestSistemaTS(ente);
            setStsOk(true);
        } catch {
            setStsOk(false);
        } finally {
            setTestingSTS(false);
        }
    };

    const tipo = TIPO_LABEL[ente.tipo];

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl border-2 flex flex-col overflow-hidden transition-all ${ente.isDefault
                ? 'border-teal-500 dark:border-teal-600'
                : 'border-gray-200 dark:border-gray-700'
            } ${!ente.isActive ? 'opacity-60' : ''}`}>
            {/* Header colorato */}
            <div className={`px-4 py-3 flex items-center justify-between ${ente.isDefault ? 'bg-teal-50 dark:bg-teal-900/20' : 'bg-gray-50 dark:bg-gray-700/30'
                }`}>
                <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg ${ente.isDefault ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400' : 'bg-white dark:bg-gray-700 text-gray-500'
                        }`}>{tipo.icon}</span>
                    <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{ente.denominazione}</h3>
                            {ente.label && (
                                <span className="text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full">
                                    {(ente as any).label}
                                </span>
                            )}
                            {ente.isDefault && (
                                <span className="text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Star className="h-3 w-3" /> Default
                                </span>
                            )}
                            {!ente.isActive && (
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">Inattivo</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            {tipo.label}
                            {ente.ruoloFatturazione && (
                                <span className="ml-1 text-violet-500 dark:text-violet-400 capitalize">&middot; {(ente as any).ruoloFatturazione}</span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => onEdit(ente)} title="Modifica"
                        className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-gray-700 transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onDelete(ente)} title="Elimina"
                        className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Corpo */}
            <div className="p-4 flex flex-col gap-3">
                {/* Dati fiscali */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Codice Fiscale</p>
                        <p className="font-mono font-medium text-gray-700 dark:text-gray-200 text-xs">{ente.codiceFiscale}</p>
                    </div>
                    {ente.piva && (
                        <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">P.IVA</p>
                            <p className="font-mono font-medium text-gray-700 dark:text-gray-200 text-xs">{ente.piva}</p>
                        </div>
                    )}
                    {(ente.citta || ente.provincia) && (
                        <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Sede</p>
                            <p className="text-gray-700 dark:text-gray-200 text-xs">
                                {[ente.citta, ente.provincia ? `(${ente.provincia})` : ''].filter(Boolean).join(' ')}
                            </p>
                        </div>
                    )}
                    <div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Regime</p>
                        <p className="text-gray-700 dark:text-gray-200 text-xs">
                            {ente.regimeFiscale} — {REGIME_LABEL[ente.regimeFiscale] || ente.regimeFiscale}
                        </p>
                    </div>
                    {ente.annoNumFattura > 0 && (
                        <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Progressivo</p>
                            <p className="font-mono text-gray-700 dark:text-gray-200 text-xs">
                                {ente.annoNumFattura}/{String(ente.progressivoFatt).padStart(4, '0')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Integrazioni */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2.5 space-y-2">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Integrazioni SDI</p>

                    {/* AcubeAPI — gestita centralmente */}
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                        <Globe className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-teal-800 dark:text-teal-200">AcubeAPI (SDI)</span>
                            <span className="ml-1 text-xs text-teal-600/60 dark:text-teal-400/60">— Gestito da ElementMedica</span>
                        </div>
                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                    </div>

                    {/* SistemaTS */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                            <div>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Sistema TS (MEF)</span>
                                <div>
                                    {ente.sistemaTsAbilitato && ente.sistemaTsConfigurato ? (
                                        <span className="text-[10px] text-teal-600 dark:text-teal-400 flex items-center gap-0.5">
                                            <CheckCircle2 className="h-2.5 w-2.5" /> Configurato
                                        </span>
                                    ) : ente.sistemaTsAbilitato ? (
                                        <span className="text-[10px] text-orange-500 flex items-center gap-0.5">
                                            <AlertTriangle className="h-2.5 w-2.5" /> Credenziali mancanti
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                            <WifiOff className="h-2.5 w-2.5" /> Non abilitato
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {ente.sistemaTsAbilitato && ente.sistemaTsConfigurato && (
                            <button
                                onClick={handleTestSTS}
                                disabled={testingSTS}
                                title="Testa connessione SistemaTS"
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-50 transition-colors font-medium"
                            >
                                {testingSTS ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
                                Test
                            </button>
                        )}
                    </div>
                    {stsOk !== null && (
                        <div className="ml-6">
                            {stsOk
                                ? <span className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> SistemaTS OK</span>
                                : <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"><XCircle className="h-3 w-3" /> SistemaTS non OK</span>
                            }
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Componente principale ───────────────────────────────────────────────────

const EntiEmittentiPage: React.FC = () => {
    const { showToast } = useToast();
    const { confirm } = useConfirmDialog();

    const {
        entiEmittenti, fetchEntiEmittenti,
        creaEnteEmittente, aggiornaEnteEmittente, getEnteEmittente, eliminaEnteEmittente,
        testConnessioneSistemaTS,
    } = useFatturazione();

    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEnte, setEditingEnte] = useState<EnteEmittente | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [testingMasterAcube, setTestingMasterAcube] = useState(false);
    const [masterAcubeStatus, setMasterAcubeStatus] = useState<{ ok: boolean; env?: string } | null>(null);

    // Form state — senza credenziali AcubeAPI (SaaS model)
    const [form, setForm] = useState({
        denominazione: '',
        label: '',
        ruoloFatturazione: '' as string,
        tipo: 'PROFESSIONISTA' as TipoEnteEmittente,
        codiceFiscale: '',
        piva: '',
        regimeFiscale: 'RF01',
        codiceAteco: '',
        indirizzo: '',
        citta: '',
        cap: '',
        provincia: '',
        email: '',
        pec: '',
        iban: '',
        sistemaTsPinCode: '',
        sistemaTsUsername: '',
        sistemaTsPassword: '',
        sistemaTsAbilitato: false,
        isDefault: false,
        isActive: true,
    });

    useEffect(() => {
        fetchEntiEmittenti().finally(() => setLoading(false));
    }, [fetchEntiEmittenti]);

    // Test stato AcubeAPI master all'apertura pagina
    useEffect(() => {
        const checkAcube = async () => {
            try {
                const res = await apiPost<{ ok: boolean; env?: string }>('/api/v1/billing/enti-emittenti/test-acube-master', {});
                setMasterAcubeStatus({ ok: (res as any)?.ok === true, env: (res as any)?.env });
            } catch {
                setMasterAcubeStatus({ ok: false });
            }
        };
        checkAcube();
    }, []);

    const handleTestMasterAcube = async () => {
        setTestingMasterAcube(true);
        try {
            const res: any = await apiPost('/api/v1/billing/enti-emittenti/test-acube-master', {});
            setMasterAcubeStatus({ ok: res?.ok === true, env: res?.env });
            if (res?.ok) {
                showToast({ type: 'success', message: `AcubeAPI OK (${res.env || 'sandbox'})` });
            } else {
                showToast({ type: 'error', message: `AcubeAPI error: ${res?.message || 'Errore sconosciuto'}` });
            }
        } catch (err: unknown) {
            setMasterAcubeStatus({ ok: false });
            showToast({ type: 'error', message: 'Errore test AcubeAPI' });
        } finally {
            setTestingMasterAcube(false);
        }
    };

    const openCreate = () => {
        setEditingEnte(null);
        setForm({
            denominazione: '', tipo: 'PROFESSIONISTA', codiceFiscale: '', piva: '',
            regimeFiscale: 'RF01', codiceAteco: '',
            indirizzo: '', citta: '', cap: '', provincia: '',
            email: '', pec: '', iban: '', label: '', ruoloFatturazione: '',
            sistemaTsPinCode: '', sistemaTsUsername: '', sistemaTsPassword: '',
            sistemaTsAbilitato: false, isDefault: false, isActive: true,
        });
        setShowForm(true);
    };

    const openEdit = async (ente: EnteEmittente) => {
        setEditingEnte(ente);
        // Popola subito con i dati di lista (anagrafica); le credenziali SistemaTS
        // (pinCode/username) arrivano dal dettaglio GET /:id — la password non è mai
        // esposta dal backend (resta vuota = invariata).
        setForm({
            denominazione: ente.denominazione,
            label: (ente as any).label || '',
            ruoloFatturazione: (ente as any).ruoloFatturazione || '',
            tipo: ente.tipo,
            codiceFiscale: ente.codiceFiscale,
            piva: ente.piva || '',
            regimeFiscale: ente.regimeFiscale,
            codiceAteco: (ente as any).codiceAteco || '',
            indirizzo: ente.indirizzo || '',
            citta: ente.citta || '',
            cap: ente.cap || '',
            provincia: ente.provincia || '',
            email: ente.email || '',
            pec: ente.pec || '',
            iban: ente.iban || '',
            sistemaTsPinCode: '',
            sistemaTsUsername: '',
            sistemaTsPassword: '',
            sistemaTsAbilitato: ente.sistemaTsAbilitato,
            isDefault: ente.isDefault,
            isActive: ente.isActive,
        });
        setShowForm(true);

        // Recupera il dettaglio completo per popolare le credenziali SistemaTS
        try {
            const full = await getEnteEmittente(ente.id);
            setForm(f => ({
                ...f,
                sistemaTsPinCode: full.sistemaTsPinCode || '',
                sistemaTsUsername: full.sistemaTsUsername || '',
            }));
        } catch {
            // In caso di errore il form resta utilizzabile con i campi credenziali vuoti
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingEnte) {
                await aggiornaEnteEmittente(editingEnte.id, form);
                showToast({ type: 'success', message: 'Ente emittente aggiornato' });
            } else {
                await creaEnteEmittente(form);
                showToast({ type: 'success', message: 'Ente emittente creato' });
            }
            setShowForm(false);
            fetchEntiEmittenti();
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore salvataggio' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (ente: EnteEmittente) => {
        const ok = await confirm({
            title: `Eliminare "${ente.denominazione}"?`,
            message: 'Questo ente non potrà più essere usato per emettere nuove fatture.',
            confirmLabel: 'Elimina',
            variant: 'danger',
        });
        if (!ok) return;

        try {
            await eliminaEnteEmittente(ente.id, 'Eliminazione manuale ente emittente');
            showToast({ type: 'success', message: 'Ente eliminato' });
            fetchEntiEmittenti();
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore eliminazione' });
        }
    };

    const handleTestSistemaTS = async (ente: EnteEmittente) => {
        const result = await testConnessioneSistemaTS(ente.id);
        if (result.ok) {
            showToast({ type: 'success', message: `${ente.denominazione}: SistemaTS OK` });
        } else {
            showToast({ type: 'error', message: `Errore SistemaTS: ${result.message}` });
            throw new Error(result.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building2 className="h-7 w-7 text-teal-600" />
                        Enti Emittenti
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Soggetti fiscali da cui emettere fatture — studio, medico, azienda…
                    </p>
                </div>
                <CRUDPrimaryButton onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Nuovo Ente
                </CRUDPrimaryButton>
            </div>

            {/* Status AcubeAPI centralizzato */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${masterAcubeStatus === null
                    ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    : masterAcubeStatus.ok
                        ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${masterAcubeStatus?.ok ? 'bg-teal-100 dark:bg-teal-900/40' : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                        <Zap className={`h-5 w-5 ${masterAcubeStatus?.ok ? 'text-teal-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">AcubeAPI — Fatturazione Elettronica SDI</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {masterAcubeStatus === null && 'Verifica connessione…'}
                            {masterAcubeStatus?.ok && (
                                <span className="text-teal-700 dark:text-teal-300">
                                    Servizio attivo · ambiente: <strong>{masterAcubeStatus.env || 'sandbox'}</strong> · gestito da ElementMedica
                                </span>
                            )}
                            {masterAcubeStatus !== null && !masterAcubeStatus.ok && (
                                <span className="text-red-600 dark:text-red-400">Connessione non riuscita — contatta il supporto</span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {masterAcubeStatus !== null && (
                        masterAcubeStatus.ok
                            ? <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                            : <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <button
                        onClick={handleTestMasterAcube}
                        disabled={testingMasterAcube}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                        {testingMasterAcube ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
                        Testa
                    </button>
                </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-sm">
                <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-500" />
                <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">Come funziona la fatturazione?</p>
                    <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                        Aggiungi uno o più enti fiscali (es. &ldquo;Studio Medico Srl&rdquo; + &ldquo;Dott. Rossi — Libero Professionista&rdquo;).
                        AcubeAPI è attivata automaticamente da ElementMedica — nessuna credenziale richiesta.
                        Configura SistemaTS solo se trasmetti spese sanitarie al MEF per la dichiarazione dei redditi dei pazienti.
                    </p>
                </div>
            </div>

            {/* Form modale */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingEnte ? `Modifica: ${editingEnte.denominazione}` : 'Nuovo Ente Emittente'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                            {/* Sezione anagrafica */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Anagrafica fiscale</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Denominazione <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            value={form.denominazione}
                                            onChange={e => setForm(f => ({ ...f, denominazione: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Etichetta profilo
                                        </label>
                                        <input
                                            placeholder="es. Studio Medico, Azienda SRL, Medico di Base..."
                                            value={form.label}
                                            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Ruolo fatturazione
                                        </label>
                                        <select
                                            value={form.ruoloFatturazione}
                                            onChange={e => setForm(f => ({ ...f, ruoloFatturazione: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        >
                                            <option value="">— Generico —</option>
                                            <option value="azienda">Azienda</option>
                                            <option value="medico">Medico professionista</option>
                                            <option value="studio">Studio medico</option>
                                            <option value="laboratorio">Laboratorio</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Tipo <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            value={form.tipo}
                                            onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoEnteEmittente }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        >
                                            <option value="SOCIETA">Società</option>
                                            <option value="PROFESSIONISTA">Professionista</option>
                                            <option value="PERSONA_FISICA">Persona fisica</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Codice Fiscale <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            value={form.codiceFiscale}
                                            onChange={e => setForm(f => ({ ...f, codiceFiscale: e.target.value.toUpperCase() }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">P.IVA</label>
                                        <input
                                            value={form.piva}
                                            maxLength={11}
                                            onChange={e => setForm(f => ({ ...f, piva: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Regime Fiscale</label>
                                        <select
                                            value={form.regimeFiscale}
                                            onChange={e => setForm(f => ({ ...f, regimeFiscale: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        >
                                            <option value="RF01">RF01 — Ordinario</option>
                                            <option value="RF02">RF02 — Contribuenti minimi</option>
                                            <option value="RF04">RF04 — Agricoltura</option>
                                            <option value="RF10">RF10 — Agenzie viaggi</option>
                                            <option value="RF19">RF19 — Forfettario</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Codice ATECO</label>
                                        <input
                                            value={form.codiceAteco}
                                            onChange={e => setForm(f => ({ ...f, codiceAteco: e.target.value }))}
                                            placeholder="es. 86.21.0"
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sede */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sede</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="col-span-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Indirizzo <span className="text-red-500">*</span></label>
                                        <input required value={form.indirizzo}
                                            onChange={e => setForm(f => ({ ...f, indirizzo: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Città <span className="text-red-500">*</span></label>
                                        <input required value={form.citta}
                                            onChange={e => setForm(f => ({ ...f, citta: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">CAP <span className="text-red-500">*</span></label>
                                        <input required value={form.cap} maxLength={5}
                                            onChange={e => setForm(f => ({ ...f, cap: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Prov. <span className="text-red-500">*</span></label>
                                        <input required value={form.provincia} maxLength={2}
                                            onChange={e => setForm(f => ({ ...f, provincia: e.target.value.toUpperCase() }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Contatti & Banca */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Contatti &amp; Dati Bancari</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
                                        <input type="email" value={form.email}
                                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">PEC</label>
                                        <input type="email" value={form.pec}
                                            onChange={e => setForm(f => ({ ...f, pec: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">IBAN</label>
                                        <input value={form.iban} placeholder="IT..."
                                            onChange={e => setForm(f => ({ ...f, iban: e.target.value.toUpperCase() }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                    </div>
                                </div>
                            </div>

                            {/* AcubeAPI - info (non configurabile dai tenant) */}
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                                <Globe className="h-4 w-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-teal-800 dark:text-teal-200">AcubeAPI (SDI) — inclusa nel piano</p>
                                    <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">
                                        La fatturazione elettronica via SDI è gestita centralmente da ElementMedica.
                                        Non è richiesta alcuna configurazione da parte tua.
                                    </p>
                                </div>
                            </div>

                            {/* SistemaTS */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Shield className="h-3.5 w-3.5 text-violet-500" />
                                        Sistema TS (MEF)
                                        <span className="text-gray-400 font-normal normal-case tracking-normal text-xs">— spese sanitarie per 730</span>
                                    </h3>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.sistemaTsAbilitato}
                                            onChange={e => setForm(f => ({ ...f, sistemaTsAbilitato: e.target.checked }))}
                                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        />
                                        <span className="text-sm text-gray-600 dark:text-gray-300">Abilitato</span>
                                    </label>
                                </div>
                                {form.sistemaTsAbilitato && (
                                    <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800 space-y-2">
                                        {/* autoComplete=off su tutta la sezione per evitare che il browser
                                            riempia il campo CF con email/username dell'account */}
                                        <div className="grid grid-cols-3 gap-4 items-start">
                                            <div className="flex flex-col">
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">PIN Code</label>
                                                <input
                                                    value={form.sistemaTsPinCode}
                                                    maxLength={20}
                                                    name="sts-pincode"
                                                    autoComplete="off"
                                                    placeholder={editingEnte?.sistemaTsConfigurato ? '••••••••••' : ''}
                                                    onChange={e => setForm(f => ({ ...f, sistemaTsPinCode: e.target.value }))}
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Codice Fiscale</label>
                                                <input
                                                    value={form.sistemaTsUsername}
                                                    maxLength={16}
                                                    name="sts-cf"
                                                    autoComplete="off"
                                                    autoCapitalize="characters"
                                                    placeholder="es. RSSMRA80A01H501U"
                                                    onChange={e => setForm(f => ({ ...f, sistemaTsUsername: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
                                                <input
                                                    type="password"
                                                    value={form.sistemaTsPassword}
                                                    name="sts-password"
                                                    autoComplete="new-password"
                                                    onChange={e => setForm(f => ({ ...f, sistemaTsPassword: e.target.value }))}
                                                    placeholder={editingEnte?.sistemaTsConfigurato ? '••••••••' : ''}
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Credenziali del Sistema TS (MEF) dell'intestatario. Il <strong>Codice Fiscale</strong> è quello del medico/proprietario, non un'email.
                                            {editingEnte?.sistemaTsConfigurato && ' Lascia un campo vuoto per non modificarlo.'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Flags */}
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.isDefault}
                                        onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Ente predefinito</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.isActive}
                                        onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Attivo</span>
                                </label>
                            </div>

                            {/* Bottoni */}
                            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                    Annulla
                                </button>
                                <CRUDPrimaryButton type="submit" disabled={submitting}>
                                    {submitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                                    {editingEnte ? 'Salva modifiche' : 'Crea ente'}
                                </CRUDPrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Lista enti */}
            {loading ? (
                <div className="flex justify-center py-12 text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
            ) : entiEmittenti.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nessun ente emittente configurato</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Aggiungi un ente per iniziare a emettere fatture elettroniche
                    </p>
                    <CRUDPrimaryButton
                        className="mt-4"
                        onClick={openCreate}
                    >
                        <Plus className="h-4 w-4" /> Aggiungi ente
                    </CRUDPrimaryButton>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {entiEmittenti.map((ente: EnteEmittente) => (
                        <EnteCard
                            key={ente.id}
                            ente={ente}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onTestSistemaTS={handleTestSistemaTS}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default EntiEmittentiPage;
