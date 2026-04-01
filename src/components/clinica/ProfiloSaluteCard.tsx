/**
 * ProfiloSaluteCard
 * Scheda del profilo di salute del paziente/dipendente
 *
 * Features:
 * - Vista compatta con sezioni: Invalidità, Abitudini, DPI Personali, DPI Azienda, Mezzi Aziendali
 * - Modalità edit con form completo
 * - Salvataggio tramite profiloDiSaluteApi.upsert
 * - Usato in: EmployeeDetail, VisitaPage (QuickActions)
 *
 * @module components/clinica/ProfiloSaluteCard
 * @version 1.0.0 - R20
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Heart,
    Edit2,
    Save,
    X,
    Loader2,
    ChevronDown,
    Activity,
    AlertCircle,
    Car,
    Shield,
    Cigarette,
    Wine,
    Dumbbell,
} from 'lucide-react';
import {
    profiloDiSaluteApi,
    FUMATORE_LABELS,
    ALCOL_LABELS,
    ATTIVITA_FISICA_LABELS,
    DPI_PERSONALI_OPTIONS,
    DPI_AZIENDA_OPTIONS,
    MEZZI_AZIENDALI_OPTIONS,
    type ProfiloDiSalute,
} from '@/services/clinicaApi';
import { useToast } from '@/hooks/useToast';
import { MalattieProfessionaliTab } from '@/components/clinica/MalattieProfessionaliTab';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ProfiloTab = 'clinica' | 'abitudini' | 'dpi' | 'patente' | 'malattieProf';

interface ProfiloSaluteCardProps {
    personId: string;
    /** Compact variant (less padding, no section headers) */
    compact?: boolean;
    /** Read-only mode */
    isReadonly?: boolean;
    /** When true, organizes the edit form into tabs by category */
    tabLayout?: boolean;
    /** When true, hides the card's own header (useful when embedded in an outer collapsible) */
    hideHeader?: boolean;
    /** When true, the edit form opens immediately (skips the read-only view) */
    autoEdit?: boolean;
}

type ProfiloDraft = Partial<Omit<ProfiloDiSalute, 'id' | 'personId' | 'tenantId' | 'createdAt' | 'updatedAt'>>;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function emptyDraft(): ProfiloDraft {
    return {
        hasInvalidita: false,
        legge104: false,
        causaDiServizio: false,
        hasDiabete: false,
        terapiaInsulina: false,
        hasIpertensione: false,
        hasCardiopatie: false,
        hasAsma: false,
        hasEpilessia: false,
        sonnolenzaDiurna: false,
        apneaNotturna: false,
        patenteCategorie: [],
        patenteSospesa: false,
        cqc: false,
        formazioneGenerale: false,
        formazioneSpecifica: false,
        addestramentoCompletato: false,
        usaDpiPersonali: false,
        dpiPersonali: [],
        dpiAzienda: [],
        usaMezziAziendali: false,
        mezziAziendali: [],
        // Diuresi
        diuresiNocturia: false,
        diuresiUrgenza: false,
        diuresiDolore: false,
        diuresiEmaturia: false,
        // Alvo
        alvoDolore: false,
        alvoSanguinamento: false,
        // Donazioni
        donatoreOrgani: false,
        donatoreSangue: false,
        // Salute riproduttiva
        menopausa: false,
        inGravidanza: false,
        inAllattamento: false,
    };
}

function profileToDraft(p: ProfiloDiSalute): ProfiloDraft {
    return {
        hasInvalidita: p.hasInvalidita,
        tipoInvalidita: p.tipoInvalidita ?? undefined,
        gradoInvaliditaCivile: p.gradoInvaliditaCivile ?? undefined,
        gradoInvaliditaInail: p.gradoInvaliditaInail ?? undefined,
        gradoInvaliditaInps: p.gradoInvaliditaInps ?? undefined,
        causaDiServizio: p.causaDiServizio ?? undefined,
        gradoCausaDiServizio: p.gradoCausaDiServizio ?? undefined,
        legge104: p.legge104,
        legge104Grado: p.legge104Grado ?? undefined,
        fumatore: p.fumatore ?? undefined,
        sigaretteGiorno: p.sigaretteGiorno ?? undefined,
        anniFumo: p.anniFumo ?? undefined,
        alcol: p.alcol ?? undefined,
        unitaAlcolSettimana: p.unitaAlcolSettimana ?? undefined,
        attivitaFisica: p.attivitaFisica ?? undefined,
        oreAttivitaSettimana: p.oreAttivitaSettimana ?? undefined,
        alimentazione: p.alimentazione ?? undefined,
        usaDpiPersonali: p.usaDpiPersonali,
        dpiPersonali: p.dpiPersonali ?? [],
        dpiAzienda: p.dpiAzienda ?? [],
        altriDpiAzienda: p.altriDpiAzienda ?? undefined,
        usaMezziAziendali: p.usaMezziAziendali,
        mezziAziendali: p.mezziAziendali ?? [],
        altriMezziAziendali: p.altriMezziAziendali ?? undefined,
        noteSalute: p.noteSalute ?? undefined,
        // Patologie croniche
        hasDiabete: p.hasDiabete,
        tipoDiabete: p.tipoDiabete ?? undefined,
        terapiaInsulina: p.terapiaInsulina,
        hasIpertensione: p.hasIpertensione,
        hasCardiopatie: p.hasCardiopatie,
        hasAsma: p.hasAsma,
        hasEpilessia: p.hasEpilessia,
        altrePatologie: p.altrePatologie ?? undefined,
        farmaci: p.farmaci ?? undefined,
        allergieFarmaci: p.allergieFarmaci ?? undefined,
        // Sonno
        qualitaSonno: p.qualitaSonno ?? undefined,
        oreSonnoNotte: p.oreSonnoNotte ?? undefined,
        sonnolenzaDiurna: p.sonnolenzaDiurna,
        scalaEpworth: p.scalaEpworth ?? undefined,
        apneaNotturna: p.apneaNotturna,
        // Patente & CQC
        patenteCategorie: p.patenteCategorie ?? [],
        patenteScadenza: p.patenteScadenza ?? undefined,
        patenteSospesa: p.patenteSospesa,
        cqc: p.cqc,
        cqcScadenza: p.cqcScadenza ?? undefined,
        // Formazione D.Lgs 81/08
        formazioneGenerale: p.formazioneGenerale,
        formazioneGeneraleData: p.formazioneGeneraleData ?? undefined,
        formazioneSpecifica: p.formazioneSpecifica,
        formazioneSpecificaData: p.formazioneSpecificaData ?? undefined,
        addestramentoCompletato: p.addestramentoCompletato,
        // Idoneità specifiche
        idoneoLavoroInQuota: p.idoneoLavoroInQuota ?? undefined,
        idoneoSpazioConfinato: p.idoneoSpazioConfinato ?? undefined,
        idoneoGuida: p.idoneoGuida ?? undefined,
        idoneoVDT: p.idoneoVDT ?? undefined,
        // Stato civile & familiari
        statoCivile: p.statoCivile ?? undefined,
        numeroFigli: p.numeroFigli ?? undefined,
        professione: p.professione ?? undefined,
        // Abitudini avanzate
        tipoSigaretta: p.tipoSigaretta ?? undefined,
        etaInizioFumo: p.etaInizioFumo ?? undefined,
        porzioniFruttaVerdure: p.porzioniFruttaVerdure ?? undefined,
        droghe: p.droghe ?? undefined,
        // Sonno avanzato
        disturbiSonno: p.disturbiSonno ?? undefined,
        // Diuresi
        diuresiFrequenza: p.diuresiFrequenza ?? undefined,
        diuresiNocturia: p.diuresiNocturia,
        diuresiUrgenza: p.diuresiUrgenza,
        diuresiDolore: p.diuresiDolore,
        diuresiEmaturia: p.diuresiEmaturia,
        // Alvo
        alvoFrequenza: p.alvoFrequenza ?? undefined,
        alvoFormaBristol: p.alvoFormaBristol ?? undefined,
        alvoDolore: p.alvoDolore,
        alvoSanguinamento: p.alvoSanguinamento,
        // Salute riproduttiva
        sesso: p.sesso ?? undefined,
        ciclaMestruale: p.ciclaMestruale ?? undefined,
        etaMenarca: p.etaMenarca ?? undefined,
        cicloDurata: p.cicloDurata ?? undefined,
        cicloDurataFlusso: p.cicloDurataFlusso ?? undefined,
        cicloRegolare: p.cicloRegolare ?? undefined,
        ultimaMestruazione: p.ultimaMestruazione ?? undefined,
        menopausa: p.menopausa,
        etaMenopausa: p.etaMenopausa ?? undefined,
        numeroGravidanze: p.numeroGravidanze ?? undefined,
        gravidanzeATermine: p.gravidanzeATermine ?? undefined,
        gravidanzePretermine: p.gravidanzePretermine ?? undefined,
        abortiSpontanei: p.abortiSpontanei ?? undefined,
        abortiVolontari: p.abortiVolontari ?? undefined,
        inGravidanza: p.inGravidanza,
        inAllattamento: p.inAllattamento,
        settimanaGestazione: p.settimanaGestazione ?? undefined,
        // Vaccinazioni & esposizioni
        vaccinazioni: p.vaccinazioni ?? undefined,
        esposizioniLavorative: p.esposizioniLavorative ?? undefined,
        // Donazioni
        donatoreOrgani: p.donatoreOrgani,
        donatoreSangue: p.donatoreSangue,
        donatoreSangueFrequenza: p.donatoreSangueFrequenza ?? undefined,
        // DPI date
        datInizioUsoDpiPersonali: p.datInizioUsoDpiPersonali ?? undefined,
        dataInizioUsoDpiAzienda: p.dataInizioUsoDpiAzienda ?? undefined,
        corsiFormazioneDpi: p.corsiFormazioneDpi ?? undefined,
        abilitazioniMezzi: p.abilitazioniMezzi ?? undefined,
        // Formazione scadenze
        formazioneGeneraleScadenza: p.formazioneGeneraleScadenza ?? undefined,
        formazioneSpecificaScadenza: p.formazioneSpecificaScadenza ?? undefined,
        // DPI consegne
        dpiConsegne: p.dpiConsegne ?? undefined,
    };
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const LabelRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div className="flex items-start justify-between gap-2 py-1">
        <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
        <span className="text-xs font-medium text-gray-800 text-right">{value ?? '—'}</span>
    </div>
);

const TagList: React.FC<{ tags: string[] }> = ({ tags }) => (
    <div className="flex flex-wrap gap-1">
        {tags.map(t => (
            <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[11px] rounded-full border border-gray-200">{t}</span>
        ))}
    </div>
);

const CheckboxGroup: React.FC<{
    options: readonly { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
}> = ({ options, selected, onChange }) => {
    const toggle = (val: string) => {
        if (selected.includes(val)) {
            onChange(selected.filter(v => v !== val));
        } else {
            onChange([...selected, val]);
        }
    };
    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map(opt => {
                const isSelected = selected.includes(opt.value);
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggle(opt.value)}
                        className={`px-2 py-1 text-xs rounded-lg border transition-colors ${isSelected
                            ? 'bg-teal-100 text-teal-700 border-teal-300'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        {isSelected && <span className="mr-1">✓</span>}
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export const ProfiloSaluteCard: React.FC<ProfiloSaluteCardProps> = ({
    personId,
    compact = false,
    isReadonly = false,
    tabLayout = false,
    hideHeader = false,
    autoEdit = false,
}) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<ProfiloDraft>(emptyDraft());
    const [activeTab, setActiveTab] = useState<ProfiloTab>('clinica');

    const { data: profilo, isLoading, isError } = useQuery({
        queryKey: ['profilo-salute', personId],
        queryFn: () => profiloDiSaluteApi.getByPerson(personId),
        enabled: !!personId,
        staleTime: 120_000,
        select: (data) => data ?? null,
    });

    const upsertMutation = useMutation({
        mutationFn: () => profiloDiSaluteApi.upsert(personId, draft),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profilo-salute', personId] });
            showToast({ message: 'Profilo salute aggiornato', type: 'success' });
            setIsEditing(false);
        },
        onError: () => {
            showToast({ message: 'Errore nel salvataggio', type: 'error' });
        },
    });

    const startEdit = () => {
        setDraft(profilo ? profileToDraft(profilo) : emptyDraft());
        setIsEditing(true);
    };

    // Auto-open edit mode when requested (e.g. from modal opened with "Modifica" button)
    useEffect(() => {
        if (autoEdit && !isEditing) {
            setDraft(profilo ? profileToDraft(profilo) : emptyDraft());
            setIsEditing(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoEdit, profilo]);

    const cancelEdit = () => {
        setIsEditing(false);
        setDraft(emptyDraft());
    };

    const setField = <K extends keyof ProfiloDraft>(key: K, value: ProfiloDraft[K]) => {
        setDraft(prev => ({ ...prev, [key]: value }));
    };

    const hasSomething = profilo && (
        profilo.hasInvalidita ||
        profilo.hasDiabete ||
        profilo.hasIpertensione ||
        profilo.hasCardiopatie ||
        profilo.hasAsma ||
        profilo.hasEpilessia ||
        profilo.altrePatologie ||
        profilo.farmaci ||
        profilo.allergieFarmaci ||
        profilo.fumatore ||
        profilo.alcol ||
        profilo.attivitaFisica ||
        profilo.qualitaSonno ||
        profilo.apneaNotturna ||
        profilo.patenteCategorie?.length ||
        profilo.cqc ||
        profilo.formazioneGenerale ||
        profilo.formazioneSpecifica ||
        profilo.addestramentoCompletato ||
        profilo.idoneoGuida !== undefined ||
        profilo.usaDpiPersonali ||
        profilo.dpiAzienda?.length ||
        profilo.usaMezziAziendali ||
        // New fields R44
        profilo.statoCivile ||
        profilo.donatoreOrgani ||
        profilo.donatoreSangue ||
        profilo.diuresiFrequenza ||
        profilo.diuresiNocturia ||
        profilo.diuresiUrgenza ||
        profilo.alvoDolore ||
        profilo.alvoSanguinamento ||
        profilo.alvoFrequenza ||
        profilo.vaccinazioni?.length ||
        profilo.esposizioniLavorative?.length ||
        profilo.inGravidanza ||
        profilo.menopausa ||
        profilo.ciclaMestruale
    );

    const padding = compact ? 'p-3' : 'p-4';

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header — hidden when embedded inside outer collapsible */}
            {!hideHeader && (
                <div className={`flex items-center justify-between ${compact ? 'px-4 py-3' : 'px-5 py-4'} border-b border-gray-100`}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                            <Heart className="w-4 h-4 text-rose-500" />
                        </div>
                        <div>
                            <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
                                Profilo Salute
                            </h3>
                            {!compact && <p className="text-xs text-gray-500">Abitudini, invalidità, DPI, mezzi aziendali</p>}
                        </div>
                    </div>
                    {!isReadonly && !isEditing && (
                        <button
                            onClick={startEdit}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-teal-700 hover:bg-teal-50 border border-gray-200 hover:border-teal-200 rounded-lg transition-colors"
                        >
                            <Edit2 className="w-3 h-3" />
                            {profilo ? 'Modifica' : 'Compila'}
                        </button>
                    )}
                </div>
            )}

            {/* Body */}
            <div className={padding}>
                {isLoading ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                ) : isError ? (
                    <div className="flex items-center gap-2 py-4 text-red-500 text-xs">
                        <AlertCircle className="w-4 h-4" />
                        Errore nel caricamento del profilo
                    </div>
                ) : isEditing ? (
                    /* ── Edit Form ── */
                    <div className="space-y-4">
                        {/* Tab navigation */}
                        {tabLayout && (
                            <div className="flex border-b border-gray-200 -mt-1 mb-1 overflow-x-auto">
                                {([
                                    { key: 'clinica' as ProfiloTab, label: 'Clinica', icon: Heart },
                                    { key: 'abitudini' as ProfiloTab, label: 'Abitudini', icon: Activity },
                                    { key: 'dpi' as ProfiloTab, label: 'DPI', icon: Shield },
                                    { key: 'patente' as ProfiloTab, label: 'Patente', icon: Car },
                                    { key: 'malattieProf' as ProfiloTab, label: 'Mal. Prof.', icon: AlertCircle },
                                ]).map(tab => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${activeTab === tab.key
                                            ? 'border-teal-500 text-teal-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        <tab.icon className="w-3 h-3" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Invalidità */}
                        {(!tabLayout || activeTab === 'clinica') && (
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Invalidità</p>
                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                    <input type="checkbox" checked={!!draft.hasInvalidita}
                                        onChange={e => setField('hasInvalidita', e.target.checked)}
                                        className="rounded text-teal-600" />
                                    <span className="text-sm text-gray-700">Ha invalidità riconosciuta</span>
                                </label>
                                {draft.hasInvalidita && (
                                    <div className="pl-5 space-y-2">
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-xs text-gray-500 mb-0.5 block">Tipo / Descrizione</label>
                                                <input type="text" value={draft.tipoInvalidita ?? ''}
                                                    onChange={e => setField('tipoInvalidita', e.target.value)}
                                                    placeholder="Es. Civile, INAIL, Causa di servizio..."
                                                    className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-xs text-gray-500 mb-0.5 block">Grado Civile %</label>
                                                    <input type="number" min={0} max={100}
                                                        value={draft.gradoInvaliditaCivile ?? ''}
                                                        onChange={e => setField('gradoInvaliditaCivile', e.target.value ? Number(e.target.value) : undefined)}
                                                        className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 mb-0.5 block">Grado INAIL %</label>
                                                    <input type="number" min={0} max={100}
                                                        value={draft.gradoInvaliditaInail ?? ''}
                                                        onChange={e => setField('gradoInvaliditaInail', e.target.value ? Number(e.target.value) : undefined)}
                                                        className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 mb-0.5 block">Grado INPS %</label>
                                                    <input type="number" min={0} max={100}
                                                        value={draft.gradoInvaliditaInps ?? ''}
                                                        onChange={e => setField('gradoInvaliditaInps', e.target.value ? Number(e.target.value) : undefined)}
                                                        className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={!!draft.causaDiServizio}
                                                        onChange={e => setField('causaDiServizio', e.target.checked)}
                                                        className="rounded text-teal-600" />
                                                    <span className="text-sm text-gray-700">Causa di servizio</span>
                                                </label>
                                                {draft.causaDiServizio && (
                                                    <div>
                                                        <label className="text-xs text-gray-500 mb-0.5 block">Grado causa %</label>
                                                        <input type="number" min={0} max={100}
                                                            value={draft.gradoCausaDiServizio ?? ''}
                                                            onChange={e => setField('gradoCausaDiServizio', e.target.value ? Number(e.target.value) : undefined)}
                                                            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={!!draft.legge104}
                                                onChange={e => setField('legge104', e.target.checked)}
                                                className="rounded text-teal-600" />
                                            <span className="text-sm text-gray-700">Legge 104/92</span>
                                        </label>
                                        {draft.legge104 && (
                                            <div>
                                                <label className="text-xs text-gray-500 mb-0.5 block">Grado Legge 104</label>
                                                <select value={draft.legge104Grado ?? ''}
                                                    onChange={e => setField('legge104Grado', e.target.value ? Number(e.target.value) : undefined)}
                                                    className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400">
                                                    <option value="">Seleziona</option>
                                                    <option value="1">Grado 1</option>
                                                    <option value="2">Grado 2</option>
                                                    <option value="3">Grado 3</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Abitudini */}
                        {(!tabLayout || activeTab === 'abitudini') && (
                            <div className="space-y-3">
                                {/* Fumo */}
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Fumo</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="col-span-2">
                                            <label className="text-xs text-gray-500 mb-0.5 block">Stato</label>
                                            <select value={draft.fumatore ?? ''}
                                                onChange={e => setField('fumatore', e.target.value || undefined)}
                                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400">
                                                <option value="">Non specificato</option>
                                                {Object.entries(FUMATORE_LABELS).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {(draft.fumatore && draft.fumatore !== 'no') && (<>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-0.5 block">Tipo sigaretta</label>
                                                <select value={(draft as any).tipoSigaretta ?? ''}
                                                    onChange={e => setField('tipoSigaretta' as keyof ProfiloDraft, e.target.value || undefined)}
                                                    className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400">
                                                    <option value="">N/D</option>
                                                    {[['tradizionale', 'Tradizionali'], ['elettronico', 'Elettroniche'], ['sigaro', 'Sigari/pipa'], ['riscaldato', 'Riscaldato (es. IQOS)']].map(([v, l]) => (
                                                        <option key={v} value={v}>{l}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-0.5 block">Età inizio fumo</label>
                                                <input type="number" min={5} max={80}
                                                    value={(draft as any).etaInizioFumo ?? ''}
                                                    onChange={e => setField('etaInizioFumo' as keyof ProfiloDraft, e.target.value ? Number(e.target.value) : undefined)}
                                                    className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-0.5 block">Sigarette/giorno</label>
                                                <input type="number" min={0} max={100}
                                                    value={draft.sigaretteGiorno ?? ''}
                                                    onChange={e => setField('sigaretteGiorno', e.target.value ? Number(e.target.value) : undefined)}
                                                    className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-0.5 block">Anni di fumo</label>
                                                <input type="number" min={0} max={80}
                                                    value={draft.anniFumo ?? ''}
                                                    onChange={e => setField('anniFumo', e.target.value ? Number(e.target.value) : undefined)}
                                                    className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                            </div>
                                        </>)}
                                    </div>
                                </div>

                                {/* Alcol */}
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Alcol</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="col-span-2">
                                            <label className="text-xs text-gray-500 mb-0.5 block">Consumo</label>
                                            <select value={draft.alcol ?? ''}
                                                onChange={e => setField('alcol', e.target.value || undefined)}
                                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400">
                                                <option value="">Non specificato</option>
                                                {Object.entries(ALCOL_LABELS).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {(draft.alcol && draft.alcol !== 'no') && (
                                            <div>
                                                <label className="text-xs text-gray-500 mb-0.5 block">Unità alcoliche/settimana</label>
                                                <input type="number" min={0} max={200} step={1}
                                                    value={draft.unitaAlcolSettimana ?? ''}
                                                    onChange={e => setField('unitaAlcolSettimana', e.target.value ? Number(e.target.value) : undefined)}
                                                    placeholder="Es. 7"
                                                    className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Attività fisica e alimentazione */}
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Stile di vita</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Attività fisica</label>
                                            <select value={draft.attivitaFisica ?? ''}
                                                onChange={e => setField('attivitaFisica', e.target.value || undefined)}
                                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400">
                                                <option value="">Non specificato</option>
                                                {Object.entries(ATTIVITA_FISICA_LABELS).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Ore attività/settimana</label>
                                            <input type="number" min={0} max={50} step={0.5}
                                                value={draft.oreAttivitaSettimana ?? ''}
                                                onChange={e => setField('oreAttivitaSettimana', e.target.value ? Number(e.target.value) : undefined)}
                                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Porzioni frutta/verdura al giorno</label>
                                            <input type="number" min={0} max={20} step={1}
                                                value={(draft as any).porzioniFruttaVerdure ?? ''}
                                                onChange={e => setField('porzioniFruttaVerdure' as keyof ProfiloDraft, e.target.value ? Number(e.target.value) : undefined)}
                                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Alimentazione</label>
                                            <select value={draft.alimentazione ?? ''}
                                                onChange={e => setField('alimentazione', e.target.value || undefined)}
                                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400">
                                                <option value="">N/D</option>
                                                {[['onnivora', 'Onnivora'], ['vegetariana', 'Vegetariana'], ['vegana', 'Vegana'], ['celiaca', 'Celiaca / Gluten-free'], ['altra', 'Altra']].map(([v, l]) => (
                                                    <option key={v} value={v}>{l}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs text-gray-500 mb-0.5 block">Sostanze stupefacenti / Droghe</label>
                                            <input type="text"
                                                value={(draft as any).droghe ?? ''}
                                                onChange={e => setField('droghe' as keyof ProfiloDraft, e.target.value || undefined)}
                                                placeholder="Compilare solo se rilevante per la medicina del lavoro..."
                                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Patologie Croniche — 2 colonne: patologie | allergie+farmaci */}
                        {(!tabLayout || activeTab === 'clinica') && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Left: Patologie croniche */}
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Patologie Croniche</p>
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                            {[
                                                { key: 'hasDiabete', label: 'Diabete' },
                                                { key: 'hasIpertensione', label: 'Ipertensione' },
                                                { key: 'hasCardiopatie', label: 'Cardiopatie' },
                                                { key: 'hasAsma', label: 'Asma' },
                                                { key: 'hasEpilessia', label: 'Epilessia' },
                                            ].map(({ key, label }) => (
                                                <label key={key} className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox"
                                                        checked={!!(draft as any)[key]}
                                                        onChange={e => setField(key as keyof ProfiloDraft, e.target.checked)}
                                                        className="rounded text-teal-600" />
                                                    <span className="text-sm text-gray-700">{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {draft.hasDiabete && (
                                            <label className="flex items-center gap-2 cursor-pointer pl-2">
                                                <input type="checkbox" checked={!!draft.terapiaInsulina}
                                                    onChange={e => setField('terapiaInsulina', e.target.checked)}
                                                    className="rounded text-teal-600" />
                                                <span className="text-sm text-gray-700">Terapia insulinica</span>
                                            </label>
                                        )}
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Altre patologie</label>
                                            <textarea value={draft.altrePatologie ?? ''}
                                                onChange={e => setField('altrePatologie', e.target.value || undefined)}
                                                rows={3} placeholder="Es. ipotiroidismo, artrite..."
                                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400 resize-none" />
                                        </div>
                                    </div>
                                </div>
                                {/* Right: Allergie farmaci (critico) + Farmaci in uso */}
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-1.5">⚠ Allergie Farmaci</p>
                                        <textarea value={draft.allergieFarmaci ?? ''}
                                            onChange={e => setField('allergieFarmaci', e.target.value || undefined)}
                                            rows={4} placeholder="Es. penicillina, FANS, aspirina..."
                                            className="w-full text-sm px-2 py-1.5 border border-red-200 bg-red-50/30 rounded-lg outline-none focus:ring-1 focus:ring-red-400 resize-none" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Farmaci in uso</p>
                                        <textarea value={draft.farmaci ?? ''}
                                            onChange={e => setField('farmaci', e.target.value || undefined)}
                                            rows={4} placeholder="Es. metformina 500mg, ramipril 5mg..."
                                            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400 resize-none" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Sonno */}
                        {(!tabLayout || activeTab === 'abitudini') && (
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Sonno e Vigilanza</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-0.5 block">Qualità sonno</label>
                                        <select value={draft.qualitaSonno ?? ''}
                                            onChange={e => setField('qualitaSonno', e.target.value || undefined)}
                                            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400">
                                            <option value="">N/D</option>
                                            {[['ottima', 'Ottima'], ['buona', 'Buona'], ['discreta', 'Discreta'], ['scarsa', 'Scarsa'], ['pessima', 'Pessima']].map(([v, l]) => (
                                                <option key={v} value={v}>{l}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-0.5 block">Ore/notte</label>
                                        <input type="number" min={0} max={24} step={0.5}
                                            value={draft.oreSonnoNotte ?? ''}
                                            onChange={e => setField('oreSonnoNotte', e.target.value ? Number(e.target.value) : undefined)}
                                            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-0.5 block">Scala Epworth (0-24)</label>
                                        <input type="number" min={0} max={24}
                                            value={draft.scalaEpworth ?? ''}
                                            onChange={e => setField('scalaEpworth', e.target.value ? Number(e.target.value) : undefined)}
                                            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-gray-500 mb-0.5 block">Disturbi del sonno</label>
                                        <input type="text"
                                            value={(draft as any).disturbiSonno ?? ''}
                                            onChange={e => setField('disturbiSonno' as keyof ProfiloDraft, e.target.value || undefined)}
                                            placeholder="Es. insonnia, risvegli notturni, bruxismo..."
                                            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={!!draft.sonnolenzaDiurna}
                                            onChange={e => setField('sonnolenzaDiurna', e.target.checked)}
                                            className="rounded text-teal-600" />
                                        <span className="text-sm text-gray-700">Sonnolenza diurna</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={!!draft.apneaNotturna}
                                            onChange={e => setField('apneaNotturna', e.target.checked)}
                                            className="rounded text-teal-600" />
                                        <span className="text-sm text-gray-700">Apnea notturna</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Patente & CQC */}
                        {(!tabLayout || activeTab === 'patente') && (
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Patente & CQC</p>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-0.5 block">Categorie patente (es. B, C, D)</label>
                                        <input type="text"
                                            value={(draft.patenteCategorie ?? []).join(', ')}
                                            onChange={e => setField('patenteCategorie', e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : [])}
                                            placeholder="B, C, CQC..."
                                            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Scadenza patente</label>
                                            <DatePickerElegante
                                                value={draft.patenteScadenza || null}
                                                onChange={(date) => setField('patenteScadenza', date ? date.toISOString() : undefined)}
                                                size="sm"
                                                clearable />
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={!!draft.patenteSospesa}
                                                onChange={e => setField('patenteSospesa', e.target.checked)}
                                                className="rounded text-red-500" />
                                            <span className="text-sm text-gray-700">Patente sospesa/revocata</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={!!draft.cqc}
                                                onChange={e => setField('cqc', e.target.checked)}
                                                className="rounded text-teal-600" />
                                            <span className="text-sm text-gray-700">CQC</span>
                                        </label>
                                    </div>
                                    {draft.cqc && (
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Scadenza CQC</label>
                                            <DatePickerElegante
                                                value={draft.cqcScadenza || null}
                                                onChange={(date) => setField('cqcScadenza', date ? date.toISOString() : undefined)}
                                                size="sm"
                                                clearable />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Formazione D.Lgs 81/08 & Idoneità */}
                        {(!tabLayout || activeTab === 'patente') && (
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Formazione D.Lgs 81/08 & Idoneità</p>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={!!draft.formazioneGenerale}
                                            onChange={e => setField('formazioneGenerale', e.target.checked)}
                                            className="rounded text-teal-600" />
                                        <span className="text-sm text-gray-700">Formazione generale completata</span>
                                    </label>
                                    {draft.formazioneGenerale && (
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Data formazione generale</label>
                                            <DatePickerElegante
                                                value={draft.formazioneGeneraleData || null}
                                                onChange={(date) => setField('formazioneGeneraleData', date ? date.toISOString() : undefined)}
                                                size="sm"
                                                clearable />
                                        </div>
                                    )}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={!!draft.formazioneSpecifica}
                                            onChange={e => setField('formazioneSpecifica', e.target.checked)}
                                            className="rounded text-teal-600" />
                                        <span className="text-sm text-gray-700">Formazione specifica completata</span>
                                    </label>
                                    {draft.formazioneSpecifica && (
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Data formazione specifica</label>
                                            <DatePickerElegante
                                                value={draft.formazioneSpecificaData || null}
                                                onChange={(date) => setField('formazioneSpecificaData', date ? date.toISOString() : undefined)}
                                                size="sm"
                                                clearable />
                                        </div>
                                    )}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={!!draft.addestramentoCompletato}
                                            onChange={e => setField('addestramentoCompletato', e.target.checked)}
                                            className="rounded text-teal-600" />
                                        <span className="text-sm text-gray-700">Addestramento pratico completato</span>
                                    </label>
                                    <div className="mt-1 border-t border-gray-100 pt-2">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Idoneità specifiche</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { key: 'idoneoLavoroInQuota', label: 'Lavoro in quota' },
                                                { key: 'idoneoSpazioConfinato', label: 'Spazio confinato' },
                                                { key: 'idoneoGuida', label: 'Guida veicoli' },
                                                { key: 'idoneoVDT', label: 'VDT >20h/sett.' },
                                            ].map(({ key, label }) => (
                                                <div key={key}>
                                                    <label className="text-xs text-gray-500 mb-0.5 block">{label}</label>
                                                    <select
                                                        value={(draft as any)[key] === true ? 'true' : (draft as any)[key] === false ? 'false' : ''}
                                                        onChange={e => setField(key as keyof ProfiloDraft, e.target.value === '' ? undefined : e.target.value === 'true')}
                                                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400"
                                                    >
                                                        <option value="">N/D</option>
                                                        <option value="true">Idoneo</option>
                                                        <option value="false">Non idoneo</option>
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DPI Personali */}
                        {(!tabLayout || activeTab === 'dpi') && (
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">DPI Personali</p>                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                    <input type="checkbox" checked={!!draft.usaDpiPersonali}
                                        onChange={e => setField('usaDpiPersonali', e.target.checked)}
                                        className="rounded text-teal-600" />
                                    <span className="text-sm text-gray-700">Utilizza DPI personali</span>
                                </label>
                                {draft.usaDpiPersonali && (
                                    <CheckboxGroup
                                        options={DPI_PERSONALI_OPTIONS}
                                        selected={draft.dpiPersonali ?? []}
                                        onChange={vals => setField('dpiPersonali', vals)}
                                    />
                                )}
                            </div>
                        )}

                        {/* DPI Azienda */}
                        {(!tabLayout || activeTab === 'dpi') && (
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">DPI Aziendali</p>
                                <CheckboxGroup
                                    options={DPI_AZIENDA_OPTIONS}
                                    selected={draft.dpiAzienda ?? []}
                                    onChange={vals => setField('dpiAzienda', vals)}
                                />
                                <input type="text" value={draft.altriDpiAzienda ?? ''}
                                    onChange={e => setField('altriDpiAzienda', e.target.value || undefined)}
                                    placeholder="Altri DPI non in elenco..."
                                    className="mt-2 w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                            </div>
                        )}

                        {/* Mezzi Aziendali */}
                        {(!tabLayout || activeTab === 'dpi') && (
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Mezzi Aziendali</p>
                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                    <input type="checkbox" checked={!!draft.usaMezziAziendali}
                                        onChange={e => setField('usaMezziAziendali', e.target.checked)}
                                        className="rounded text-teal-600" />
                                    <span className="text-sm text-gray-700">Utilizza mezzi aziendali</span>
                                </label>
                                {draft.usaMezziAziendali && (
                                    <CheckboxGroup
                                        options={MEZZI_AZIENDALI_OPTIONS}
                                        selected={draft.mezziAziendali ?? []}
                                        onChange={vals => setField('mezziAziendali', vals)}
                                    />
                                )}
                            </div>
                        )}

                        {/* Stato civile & Donazioni — 2 colonne */}
                        {(!tabLayout || activeTab === 'clinica') && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Stato civile & Familiari */}
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Stato civile & Familiari</p>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Stato civile</label>
                                            <select value={(draft as any).statoCivile ?? ''}
                                                onChange={e => setField('statoCivile' as keyof ProfiloDraft, e.target.value || undefined)}
                                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400">
                                                <option value="">Non specificato</option>
                                                {([
                                                    ['celibe_nubile', 'Celibe / Nubile'],
                                                    ['coniugato_a', 'Coniugato/a'],
                                                    ['convivente', 'Convivente'],
                                                    ['separato_a', 'Separato/a'],
                                                    ['divorziato_a', 'Divorziato/a'],
                                                    ['vedovo_a', 'Vedovo/a'],
                                                ] as const).map(([v, l]) => (
                                                    <option key={v} value={v}>{l}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs text-gray-500 mb-0.5 block">Num. figli</label>
                                                <input type="number" min={0}
                                                    value={(draft as any).numeroFigli ?? ''}
                                                    onChange={e => setField('numeroFigli' as keyof ProfiloDraft, e.target.value ? Number(e.target.value) : undefined)}
                                                    className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Professione</label>
                                            <input type="text"
                                                value={(draft as any).professione ?? ''}
                                                onChange={e => setField('professione' as keyof ProfiloDraft, e.target.value || undefined)}
                                                placeholder="Es. carpentiere, impiegato..."
                                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                        </div>
                                    </div>
                                </div>
                                {/* Donazioni */}
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Donazioni</p>
                                    <div className="space-y-2">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox"
                                                    checked={!!(draft as any).donatoreOrgani}
                                                    onChange={e => setField('donatoreOrgani' as keyof ProfiloDraft, e.target.checked)}
                                                    className="rounded text-teal-600" />
                                                <span className="text-sm text-gray-700">Donatore organi</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox"
                                                    checked={!!(draft as any).donatoreSangue}
                                                    onChange={e => setField('donatoreSangue' as keyof ProfiloDraft, e.target.checked)}
                                                    className="rounded text-teal-600" />
                                                <span className="text-sm text-gray-700">Donatore sangue</span>
                                            </label>
                                        </div>
                                        {(draft as any).donatoreSangue && (
                                            <div>
                                                <label className="text-xs text-gray-500 mb-0.5 block">Frequenza donazione</label>
                                                <input type="text"
                                                    value={(draft as any).donatoreSangueFrequenza ?? ''}
                                                    onChange={e => setField('donatoreSangueFrequenza' as keyof ProfiloDraft, e.target.value || undefined)}
                                                    placeholder="Es. ogni 3 mesi..."
                                                    className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Diuresi & Alvo intestinale — 2 colonne */}
                        {(!tabLayout || activeTab === 'clinica') && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Diuresi */}
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Diuresi</p>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Frequenza minzionale</label>
                                            <select value={(draft as any).diuresiFrequenza ?? ''}
                                                onChange={e => setField('diuresiFrequenza' as keyof ProfiloDraft, e.target.value || undefined)}
                                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400">
                                                <option value="">Non specificata</option>
                                                {[['normale', 'Normale'], ['pollacchiuria', 'Pollacchiuria'], ['oliguria', 'Oliguria'], ['poliuria', 'Poliuria']].map(([v, l]) => (
                                                    <option key={v} value={v}>{l}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            {([
                                                { key: 'diuresiNocturia', label: 'Nicturia' },
                                                { key: 'diuresiUrgenza', label: 'Urgenza minzionale' },
                                                { key: 'diuresiDolore', label: 'Dolore/bruciore' },
                                                { key: 'diuresiEmaturia', label: 'Ematuria' },
                                            ] as const).map(({ key, label }) => (
                                                <label key={key} className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox"
                                                        checked={!!(draft as any)[key]}
                                                        onChange={e => setField(key as keyof ProfiloDraft, e.target.checked)}
                                                        className="rounded text-teal-600" />
                                                    <span className="text-sm text-gray-700">{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {/* Alvo intestinale */}
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Alvo intestinale</p>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Frequenza</label>
                                            <select value={(draft as any).alvoFrequenza ?? ''}
                                                onChange={e => setField('alvoFrequenza' as keyof ProfiloDraft, e.target.value || undefined)}
                                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400">
                                                <option value="">Non specificata</option>
                                                {[['normale', 'Normale'], ['stipsi', 'Stipsi'], ['diarrea', 'Diarrea'], ['alterna', 'Alternata']].map(([v, l]) => (
                                                    <option key={v} value={v}>{l}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-0.5 block">Scala di Bristol (1-7)</label>
                                            <input type="number" min={1} max={7}
                                                value={(draft as any).alvoFormaBristol ?? ''}
                                                onChange={e => setField('alvoFormaBristol' as keyof ProfiloDraft, e.target.value ? Number(e.target.value) : undefined)}
                                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400" />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            {([
                                                { key: 'alvoDolore', label: 'Dolore addominale' },
                                                { key: 'alvoSanguinamento', label: 'Sangue nelle feci' },
                                            ] as const).map(({ key, label }) => (
                                                <label key={key} className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox"
                                                        checked={!!(draft as any)[key]}
                                                        onChange={e => setField(key as keyof ProfiloDraft, e.target.checked)}
                                                        className="rounded text-teal-600" />
                                                    <span className="text-sm text-gray-700">{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Note salute */}
                        {(!tabLayout || activeTab !== 'malattieProf') && (
                            <div>
                                <label className="text-xs text-gray-500 mb-0.5 block">Note salute</label>
                                <textarea
                                    value={draft.noteSalute ?? ''}
                                    onChange={e => setField('noteSalute', e.target.value || undefined)}
                                    rows={2}
                                    placeholder="Note aggiuntive..."
                                    className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400 resize-none"
                                />
                            </div>
                        )}

                        {/* Malattie Professionali Tab */}
                        {(!tabLayout || activeTab === 'malattieProf') && (
                            <MalattieProfessionaliTab
                                personId={personId}
                                isReadonly={isReadonly}
                            />
                        )}

                        {/* Actions */}
                        {(!tabLayout || activeTab !== 'malattieProf') && (
                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => upsertMutation.mutate()}
                                    disabled={upsertMutation.isPending}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                >
                                    {upsertMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Salva
                                </button>
                                <button type="button" onClick={cancelEdit}
                                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                                    <X className="w-4 h-4" />
                                    Annulla
                                </button>
                            </div>
                        )}
                    </div>
                ) : !hasSomething ? (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center py-6 text-gray-400 gap-2">
                        <Heart className="w-8 h-8 opacity-25" />
                        <p className="text-xs">Nessun dato di salute registrato</p>
                        {!isReadonly && (
                            <button onClick={startEdit}
                                className="text-xs text-teal-600 hover:text-teal-700 font-medium mt-1">
                                Compila ora →
                            </button>
                        )}
                    </div>
                ) : (
                    /* ── Read-only view — compact full-width grid ── */
                    <div className="space-y-2.5">

                        {/* ── ALERTS: Invalidità + Allergie (full width, prominent) ── */}
                        {(profilo!.hasInvalidita || profilo!.allergieFarmaci) && (
                            <div className="flex flex-wrap gap-2">
                                {profilo!.hasInvalidita && (
                                    <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200 flex-1 min-w-0">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-amber-700 leading-tight">
                                                Invalidità{profilo!.tipoInvalidita ? ` — ${profilo!.tipoInvalidita}` : ''}
                                            </p>
                                            <p className="text-[11px] text-amber-600 mt-0.5 leading-tight">
                                                {[
                                                    profilo!.gradoInvaliditaCivile && `Civile ${profilo!.gradoInvaliditaCivile}%`,
                                                    profilo!.gradoInvaliditaInail && `INAIL ${profilo!.gradoInvaliditaInail}%`,
                                                    profilo!.gradoInvaliditaInps && `INPS ${profilo!.gradoInvaliditaInps}%`,
                                                    profilo!.causaDiServizio && `Causa servizio${profilo!.gradoCausaDiServizio ? ` ${profilo!.gradoCausaDiServizio}%` : ''}`,
                                                    profilo!.legge104 && `L.104${profilo!.legge104Grado ? ` G${profilo!.legge104Grado}` : ''}`,
                                                ].filter(Boolean).join(' · ')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {profilo!.allergieFarmaci && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200 flex-1 min-w-0">
                                        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                        <p className="text-xs text-red-700 truncate"><span className="font-semibold">Allergie:</span> {profilo!.allergieFarmaci}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── MAIN GRID: 2 cols → 4 cols on xl ── */}
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">

                            {/* Clinico: Patologie + Farmaci */}
                            {(profilo!.hasDiabete || profilo!.hasIpertensione || profilo!.hasCardiopatie || profilo!.hasAsma || profilo!.hasEpilessia || profilo!.altrePatologie || profilo!.farmaci) && (
                                <div className="bg-rose-50/60 rounded-lg border border-rose-100 p-2 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Heart className="w-3 h-3 text-rose-500" />
                                        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">Patologie</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {profilo!.hasDiabete && <span className="px-1.5 py-0 bg-orange-100 text-orange-700 text-[10px] rounded-full border border-orange-200">Diabete{profilo!.terapiaInsulina ? ' + insulina' : ''}</span>}
                                        {profilo!.hasIpertensione && <span className="px-1.5 py-0 bg-red-100 text-red-700 text-[10px] rounded-full border border-red-200">Ipertensione</span>}
                                        {profilo!.hasCardiopatie && <span className="px-1.5 py-0 bg-red-100 text-red-700 text-[10px] rounded-full border border-red-200">Cardiopatie</span>}
                                        {profilo!.hasAsma && <span className="px-1.5 py-0 bg-blue-100 text-blue-700 text-[10px] rounded-full border border-blue-200">Asma</span>}
                                        {profilo!.hasEpilessia && <span className="px-1.5 py-0 bg-purple-100 text-purple-700 text-[10px] rounded-full border border-purple-200">Epilessia</span>}
                                    </div>
                                    {profilo!.altrePatologie && <p className="text-[11px] text-gray-600 leading-tight">{profilo!.altrePatologie}</p>}
                                    {profilo!.farmaci && <p className="text-[11px] text-gray-500 italic leading-tight">💊 {profilo!.farmaci}</p>}
                                </div>
                            )}

                            {/* Stile di vita: Abitudini + Sonno */}
                            {(profilo!.fumatore || profilo!.alcol || profilo!.droghe || profilo!.alimentazione || profilo!.attivitaFisica || profilo!.qualitaSonno || profilo!.apneaNotturna || profilo!.sonnolenzaDiurna || profilo!.scalaEpworth != null) && (
                                <div className="bg-sky-50/60 rounded-lg border border-sky-100 p-2 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Activity className="w-3 h-3 text-sky-500" />
                                        <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wide">Stile di vita</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        {profilo!.fumatore && (
                                            <div className="flex items-center gap-1">
                                                <Cigarette className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
                                                <span className="text-[11px] text-gray-700">{FUMATORE_LABELS[profilo!.fumatore] ?? profilo!.fumatore}</span>
                                                {(profilo!.sigaretteGiorno != null || profilo!.anniFumo != null) && (
                                                    <span className="text-[10px] text-gray-400">
                                                        {[profilo!.sigaretteGiorno != null && `${profilo!.sigaretteGiorno} sig/g`, profilo!.anniFumo != null && `${profilo!.anniFumo} aa`].filter(Boolean).join(' · ')}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {profilo!.alcol && (
                                            <div className="flex items-center gap-1">
                                                <Wine className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
                                                <span className="text-[11px] text-gray-700">{ALCOL_LABELS[profilo!.alcol] ?? profilo!.alcol}</span>
                                                {profilo!.unitaAlcolSettimana != null && (
                                                    <span className="text-[10px] text-gray-400">{profilo!.unitaAlcolSettimana} u.a./sett.</span>
                                                )}
                                            </div>
                                        )}
                                        {profilo!.droghe && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[11px] text-amber-700 font-medium">Sostanze:</span>
                                                <span className="text-[11px] text-gray-700">{profilo!.droghe}</span>
                                            </div>
                                        )}
                                        {profilo!.alimentazione && (
                                            <LabelRow label="Alim." value={profilo!.alimentazione} />
                                        )}
                                        {profilo!.attivitaFisica && (
                                            <div className="flex items-center gap-1">
                                                <Dumbbell className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
                                                <span className="text-[11px] text-gray-700">{ATTIVITA_FISICA_LABELS[profilo!.attivitaFisica] ?? profilo!.attivitaFisica}</span>
                                                {profilo!.oreAttivitaSettimana != null && (
                                                    <span className="text-[10px] text-gray-400">{profilo!.oreAttivitaSettimana}h/sett.</span>
                                                )}
                                            </div>
                                        )}
                                        {profilo!.qualitaSonno && <LabelRow label="Sonno" value={profilo!.qualitaSonno} />}
                                        {profilo!.oreSonnoNotte != null && <LabelRow label="Ore/notte" value={`${profilo!.oreSonnoNotte}h`} />}
                                        {profilo!.scalaEpworth != null && <LabelRow label="Epworth" value={`${profilo!.scalaEpworth}/24`} />}
                                        {profilo!.sonnolenzaDiurna && <p className="text-[10px] text-amber-600">⚠ Sonnolenza diurna</p>}
                                        {profilo!.apneaNotturna && <p className="text-[10px] text-amber-600">⚠ Apnea notturna</p>}
                                    </div>
                                </div>
                            )}

                            {/* DPI & Mezzi Aziendali */}
                            {((profilo!.usaDpiPersonali && profilo!.dpiPersonali?.length > 0) || profilo!.dpiAzienda?.length > 0 || (profilo!.usaMezziAziendali && profilo!.mezziAziendali?.length > 0)) && (
                                <div className="bg-teal-50/60 rounded-lg border border-teal-100 p-2 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Shield className="w-3 h-3 text-teal-600" />
                                        <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">DPI & Mezzi</p>
                                    </div>
                                    {profilo!.usaDpiPersonali && profilo!.dpiPersonali?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] text-teal-600 font-medium mb-0.5">Personali</p>
                                            <TagList tags={profilo!.dpiPersonali.map(d => DPI_PERSONALI_OPTIONS.find(o => o.value === d)?.label ?? d)} />
                                        </div>
                                    )}
                                    {profilo!.dpiAzienda?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] text-teal-600 font-medium mb-0.5">Azienda</p>
                                            <TagList tags={profilo!.dpiAzienda.map(d => DPI_AZIENDA_OPTIONS.find(o => o.value === d)?.label ?? d)} />
                                            {profilo!.altriDpiAzienda && <p className="text-[11px] text-gray-500 italic mt-0.5">{profilo!.altriDpiAzienda}</p>}
                                        </div>
                                    )}
                                    {profilo!.usaMezziAziendali && profilo!.mezziAziendali?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] text-teal-600 font-medium mb-0.5">Mezzi</p>
                                            <TagList tags={profilo!.mezziAziendali.map(m => MEZZI_AZIENDALI_OPTIONS.find(o => o.value === m)?.label ?? m)} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Patente, CQC & Formazione/Idoneità */}
                            {(profilo!.patenteCategorie?.length > 0 || profilo!.cqc || profilo!.formazioneGenerale || profilo!.formazioneSpecifica || profilo!.addestramentoCompletato || profilo!.idoneoGuida != null || profilo!.idoneoVDT != null || profilo!.idoneoLavoroInQuota != null || profilo!.idoneoSpazioConfinato != null) && (
                                <div className="bg-violet-50/60 rounded-lg border border-violet-100 p-2 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Car className="w-3 h-3 text-violet-500" />
                                        <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide">Pat. & Form.</p>
                                    </div>
                                    {(profilo!.patenteCategorie?.length > 0 || profilo!.cqc) && (
                                        <div>
                                            {profilo!.patenteCategorie?.length > 0 && <TagList tags={profilo!.patenteCategorie} />}
                                            {profilo!.patenteSospesa && <p className="text-[10px] text-red-600 mt-0.5">⚠ Sospesa/revocata</p>}
                                            {profilo!.cqc && (
                                                <p className="text-[11px] text-teal-600">
                                                    CQC{profilo!.cqcScadenza ? ` scade ${new Date(profilo!.cqcScadenza).toLocaleDateString('it-IT')}` : ''}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-1">
                                        {profilo!.formazioneGenerale && <span className="px-1.5 py-0 bg-green-100 text-green-700 text-[10px] rounded-full border border-green-200">✓ Gen.</span>}
                                        {profilo!.formazioneSpecifica && <span className="px-1.5 py-0 bg-green-100 text-green-700 text-[10px] rounded-full border border-green-200">✓ Spec.</span>}
                                        {profilo!.addestramentoCompletato && <span className="px-1.5 py-0 bg-green-100 text-green-700 text-[10px] rounded-full border border-green-200">✓ Addestr.</span>}
                                        {profilo!.idoneoLavoroInQuota != null && (
                                            <span className={`px-1.5 py-0 text-[10px] rounded-full border ${profilo!.idoneoLavoroInQuota ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                {profilo!.idoneoLavoroInQuota ? '✓' : '✗'} Quota
                                            </span>
                                        )}
                                        {profilo!.idoneoSpazioConfinato != null && (
                                            <span className={`px-1.5 py-0 text-[10px] rounded-full border ${profilo!.idoneoSpazioConfinato ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                {profilo!.idoneoSpazioConfinato ? '✓' : '✗'} Confin.
                                            </span>
                                        )}
                                        {profilo!.idoneoGuida != null && (
                                            <span className={`px-1.5 py-0 text-[10px] rounded-full border ${profilo!.idoneoGuida ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                {profilo!.idoneoGuida ? '✓' : '✗'} Guida
                                            </span>
                                        )}
                                        {profilo!.idoneoVDT != null && (
                                            <span className={`px-1.5 py-0 text-[10px] rounded-full border ${profilo!.idoneoVDT ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                {profilo!.idoneoVDT ? '✓' : '✗'} VDT
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── ROW 2: Apparati + Donazioni + Vaccinazioni + Esposizioni ── */}
                        {(profilo!.diuresiFrequenza || profilo!.diuresiNocturia || profilo!.diuresiUrgenza || profilo!.diuresiDolore || profilo!.diuresiEmaturia ||
                            profilo!.alvoFrequenza || profilo!.alvoDolore || profilo!.alvoSanguinamento ||
                            profilo!.donatoreOrgani || profilo!.donatoreSangue ||
                            (profilo!.vaccinazioni && (profilo!.vaccinazioni as any[]).length > 0) ||
                            (profilo!.esposizioniLavorative && (profilo!.esposizioniLavorative as any[]).length > 0)) && (
                                <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">

                                    {/* Apparati: Diuresi + Alvo */}
                                    {(profilo!.diuresiFrequenza || profilo!.diuresiNocturia || profilo!.diuresiUrgenza || profilo!.diuresiDolore || profilo!.diuresiEmaturia ||
                                        profilo!.alvoFrequenza || profilo!.alvoDolore || profilo!.alvoSanguinamento) && (
                                            <div className="bg-cyan-50/60 rounded-lg border border-cyan-100 p-2 space-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Activity className="w-3 h-3 text-cyan-500" />
                                                    <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wide">Apparati</p>
                                                </div>
                                                {(profilo!.diuresiFrequenza || profilo!.diuresiNocturia || profilo!.diuresiUrgenza || profilo!.diuresiDolore || profilo!.diuresiEmaturia) && (
                                                    <div className="space-y-0.5">
                                                        <p className="text-[10px] text-cyan-600 font-medium">Diuresi</p>
                                                        {profilo!.diuresiFrequenza && <LabelRow label="Freq." value={profilo!.diuresiFrequenza} />}
                                                        <div className="flex flex-wrap gap-1">
                                                            {profilo!.diuresiNocturia && <span className="px-1.5 py-0 bg-amber-100 text-amber-700 text-[10px] rounded-full border border-amber-200">Nicturia</span>}
                                                            {profilo!.diuresiUrgenza && <span className="px-1.5 py-0 bg-amber-100 text-amber-700 text-[10px] rounded-full border border-amber-200">Urgenza</span>}
                                                            {profilo!.diuresiDolore && <span className="px-1.5 py-0 bg-red-100 text-red-700 text-[10px] rounded-full border border-red-200">Dolore</span>}
                                                            {profilo!.diuresiEmaturia && <span className="px-1.5 py-0 bg-red-100 text-red-700 text-[10px] rounded-full border border-red-200">Ematuria</span>}
                                                        </div>
                                                    </div>
                                                )}
                                                {(profilo!.alvoFrequenza || profilo!.alvoDolore || profilo!.alvoSanguinamento) && (
                                                    <div className="space-y-0.5">
                                                        <p className="text-[10px] text-cyan-600 font-medium">Alvo</p>
                                                        {profilo!.alvoFrequenza && <LabelRow label="Freq." value={profilo!.alvoFrequenza} />}
                                                        {profilo!.alvoFormaBristol != null && <LabelRow label="Bristol" value={`${profilo!.alvoFormaBristol}/7`} />}
                                                        <div className="flex flex-wrap gap-1">
                                                            {profilo!.alvoDolore && <span className="px-1.5 py-0 bg-amber-100 text-amber-700 text-[10px] rounded-full border border-amber-200">Dolore</span>}
                                                            {profilo!.alvoSanguinamento && <span className="px-1.5 py-0 bg-red-100 text-red-700 text-[10px] rounded-full border border-red-200">Sanguinamento</span>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                    {/* Donazioni */}
                                    {(profilo!.donatoreOrgani || profilo!.donatoreSangue) && (
                                        <div className="bg-pink-50/60 rounded-lg border border-pink-100 p-2 space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Heart className="w-3 h-3 text-pink-500" />
                                                <p className="text-[10px] font-bold text-pink-600 uppercase tracking-wide">Donazioni</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {profilo!.donatoreOrgani && <span className="px-1.5 py-0 bg-pink-100 text-pink-700 text-[10px] rounded-full border border-pink-200">♥ Organi</span>}
                                                {profilo!.donatoreSangue && (
                                                    <span className="px-1.5 py-0 bg-red-100 text-red-700 text-[10px] rounded-full border border-red-200">🩸 Sangue{profilo!.donatoreSangueFrequenza ? ` (${profilo!.donatoreSangueFrequenza})` : ''}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Vaccinazioni */}
                                    {profilo!.vaccinazioni && (profilo!.vaccinazioni as any[]).length > 0 && (
                                        <div className="bg-green-50/60 rounded-lg border border-green-100 p-2 space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Shield className="w-3 h-3 text-green-600" />
                                                <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Vaccinazioni</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {(profilo!.vaccinazioni as any[]).map((v: any, i: number) => (
                                                    <span key={i} className="px-1.5 py-0 bg-green-100 text-green-800 text-[10px] rounded-full border border-green-200">
                                                        {v.tipo ?? v.nome ?? v}
                                                        {v.data ? ` (${new Date(v.data).toLocaleDateString('it-IT', { month: '2-digit', year: 'numeric' })})` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Esposizioni Lavorative */}
                                    {profilo!.esposizioniLavorative && (profilo!.esposizioniLavorative as any[]).length > 0 && (
                                        <div className="bg-orange-50/60 rounded-lg border border-orange-100 p-2 space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <AlertCircle className="w-3 h-3 text-orange-500" />
                                                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wide">Esposizioni</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {(profilo!.esposizioniLavorative as any[]).map((e: any, i: number) => (
                                                    <span key={i} className="px-1.5 py-0 bg-orange-100 text-orange-800 text-[10px] rounded-full border border-orange-200">
                                                        {e.tipo ?? e.agente ?? e}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}

                        {/* Note salute (full width) */}
                        {profilo!.noteSalute && (
                            <p className="text-[11px] text-gray-500 italic border-t border-gray-100 pt-2 leading-relaxed">{profilo!.noteSalute}</p>
                        )}

                        {/* Malattie Professionali — sempre visibile in read-only */}
                        <div className="border-t border-gray-100 pt-2">
                            <MalattieProfessionaliTab
                                personId={personId}
                                isReadonly={isReadonly}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfiloSaluteCard;
