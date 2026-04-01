/**
 * TariffarioCompanyCard
 * 
 * Card che mostra il tariffario MDL associato ad un'azienda con le voci compattate.
 * P59 Sprint 11.2: Rinominata in "Tariffario Medicina del Lavoro e Sicurezza"
 * 
 * @module components/companies/TariffarioCompanyCard
 * @project P59 - ElementSicurezza Enhancement
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Euro,
    Calendar,
    FileText,
    CheckCircle2,
    Clock,
    Tag,
    Edit,
    Printer,
    ChevronDown,
    ChevronUp,
    Users,
    Stethoscope,
    Briefcase,
    AlertCircle,
    History,
    Settings2,
    X
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from '../../design-system';
import { tariffariAziendaliApi } from '../../services/tariffarioAziendaleApi';
import { useToast } from '../../hooks/useToast';
import { useTenantFilter } from '../../context/TenantFilterContext';
import { cn } from '../../design-system/utils';

// P59 Sprint 11.2: Interfaccia voce completa
interface VoceTariffarioInfo {
    id: string;
    tipo: string;
    nome?: string;
    descrizione?: string;
    prezzoBase: number | string;
    frequenza: string;
    unitaCalcolo?: string;
    usaFasceDipendenti?: boolean;
    attivo: boolean;
    ordine: number;
    categoriaVisita?: string;  // CategoriaVisitaMDL per prestazioni MDL
    prestazione?: {
        id: string;
        codice: string;
        nome: string;
    };
    fasceDipendenti?: Array<{
        id: string;
        minDipendenti: number;
        maxDipendenti?: number | null;
        prezzo: number | string;
    }>;
}

// Labels per categorie visita MDL
const CATEGORIA_VISITA_MDL_LABELS: Record<string, string> = {
    PREVENTIVA: 'Visita Preventiva',
    PERIODICA: 'Visita Periodica',
    DOPO_ASSENZA: 'Rientro da Assenza',
    STRAORDINARIA: 'Visita Straordinaria',
};

interface TariffarioInfo {
    id: string;
    codice?: string;
    nome: string;
    descrizione?: string;
    validoDa?: string;
    validoA?: string | null;
    attivo: boolean;
    vociCount?: number;
    tipo?: 'BASE' | 'AZIENDALE';
    voci?: VoceTariffarioInfo[];
    association?: {
        id: string;
        validoDa: string;
        validoA?: string | null;
        attivo: boolean;
        note?: string | null;
    };
}

interface TariffarioCompanyCardProps {
    tariffario: TariffarioInfo;
    successoreTariffario?: TariffarioInfo | null;
    storicoTariffari?: TariffarioInfo[];  // Storico dei tariffari scaduti
    companyId: string;
    companyName?: string;
    className?: string;
    onPrintPDF?: () => void;
    onEditAssociation?: () => void;  // Callback per aprire il modal di modifica associazione
    onEditSuccessore?: () => void;   // Callback per modificare l'associazione successore
    onDeleteSuccessore?: () => void; // Callback per rimuovere il successore designato
}

// Labels per i tipi di voce
const TIPO_VOCE_LABELS: Record<string, string> = {
    PRESTAZIONE: 'Prestazione',
    SPESA_FISSA: 'Spesa Una Tantum',
    SPESA_RICORRENTE: 'Spesa Ricorrente',
    SOPRALLUOGO_MC: 'Sopralluogo MC',
    SOPRALLUOGO_RSPP: 'Sopralluogo RSPP',
    DVR_NUOVO: 'Nuovo DVR',
    DVR_AGGIORNAMENTO_CON_MODIFICHE: 'Agg. DVR (con mod.)',
    DVR_AGGIORNAMENTO_SENZA_MODIFICHE: 'Agg. DVR (senza mod.)',
    NOMINA_MC: 'Nomina MC',
    NOMINA_RSPP: 'Nomina RSPP',
};

// Icone per tipo voce
const TIPO_VOCE_ICONS: Record<string, React.ElementType> = {
    PRESTAZIONE: Stethoscope,
    SPESA_FISSA: Euro,
    SPESA_RICORRENTE: Euro,
    SOPRALLUOGO_MC: Briefcase,
    SOPRALLUOGO_RSPP: Briefcase,
    DVR_NUOVO: FileText,
    DVR_AGGIORNAMENTO_CON_MODIFICHE: FileText,
    DVR_AGGIORNAMENTO_SENZA_MODIFICHE: FileText,
    NOMINA_MC: Users,
    NOMINA_RSPP: Users,
};

// Labels per frequenza
const FREQUENZA_LABELS: Record<string, string> = {
    UNA_TANTUM: 'Una tantum',
    PER_VISITA: 'Per visita',
    PER_DIPENDENTE: 'Per dipendente',
    MENSILE: 'Mensile',
    TRIMESTRALE: 'Trimestrale',
    SEMESTRALE: 'Semestrale',
    ANNUALE: 'Annuale',
    SECONDO_SORVEGLIANZA: 'Sorveglianza Sanitaria',
};

const TariffarioCompanyCard: React.FC<TariffarioCompanyCardProps> = ({
    tariffario,
    successoreTariffario,
    storicoTariffari = [],
    companyId,
    companyName,
    className,
    onEditAssociation,
    onEditSuccessore,
    onDeleteSuccessore,
}) => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [isPrinting, setIsPrinting] = useState(false);
    const [showAllVoci, setShowAllVoci] = useState(false);
    const [showAllAltreVoci, setShowAllAltreVoci] = useState(false);
    const [showStorico, setShowStorico] = useState(false);

    // Calcola stato validità
    const getValidityStatus = () => {
        if (!tariffario.attivo) {
            return { label: 'Non attivo', color: 'bg-gray-100 text-gray-600', icon: Clock };
        }

        const now = new Date();
        const validoDa = tariffario.validoDa ? new Date(tariffario.validoDa) : null;
        const validoA = tariffario.validoA ? new Date(tariffario.validoA) : null;

        if (validoDa && validoDa > now) {
            return { label: 'Futuro', color: 'bg-blue-100 text-blue-700', icon: Clock };
        }
        if (validoA && validoA < now) {
            return { label: 'Scaduto', color: 'bg-red-100 text-red-700', icon: Clock };
        }
        if (validoA) {
            const daysUntilExpiry = Math.floor((validoA.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry <= 30) {
                return { label: `Scade tra ${daysUntilExpiry}g`, color: 'bg-amber-100 text-amber-700', icon: Clock };
            }
        }
        return { label: 'Attivo', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
    };

    const validityStatus = getValidityStatus();
    const StatusIcon = validityStatus.icon;

    // Format date
    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Format price
    const formatPrice = (price: number | string) => {
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(numPrice);
    };

    // Get display name for voce
    const getVoceDisplayName = (voce: VoceTariffarioInfo): string => {
        if (voce.prestazione?.nome) return voce.prestazione.nome;
        if (voce.nome) return voce.nome;
        return TIPO_VOCE_LABELS[voce.tipo] || voce.tipo;
    };

    // P59 Sprint 11.2: Get tenant params for cross-tenant PDF access
    const { getTenantFilterParams } = useTenantFilter();

    // Handle PDF print
    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            const tenantParams = getTenantFilterParams();
            await tariffariAziendaliApi.downloadPDF(tariffario.id, tenantParams);
            showToast({ type: 'success', message: 'PDF generato correttamente' });
        } catch (error) {
            showToast({ type: 'error', message: 'Errore nella generazione del PDF' });
        } finally {
            setIsPrinting(false);
        }
    };

    // Voci da mostrare (prime 5 o tutte)
    const voci = tariffario.voci || [];

    // Separa in 4 gruppi semantici che specchiano il PDF
    const CONSULENZA_TYPES = [
        'CONSULENZA', 'SOPRALLUOGO_MC', 'SOPRALLUOGO_RSPP', 'NOMINA_MC', 'NOMINA_RSPP',
        'DVR_NUOVO', 'DVR_AGGIORNAMENTO_CON_MODIFICHE', 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE'
    ];
    const mdlVoci = voci.filter(v => v.tipo === 'PRESTAZIONE' && v.categoriaVisita);
    const consulenzaVoci = voci.filter(v => CONSULENZA_TYPES.includes(v.tipo));
    const questionariVoci = voci.filter(v => v.tipo === 'QUESTIONARIO');
    const altreVoci = voci.filter(v =>
        !['PRESTAZIONE', 'QUESTIONARIO', ...CONSULENZA_TYPES].includes(v.tipo) ||
        (v.tipo === 'PRESTAZIONE' && !v.categoriaVisita)
    );

    // Raggruppa le prestazioni MDL per nome prestazione → poi categorie con prezzi unificati
    const CATEGORIA_ORDER = ['PREVENTIVA', 'PERIODICA', 'DOPO_ASSENZA', 'STRAORDINARIA'];
    const mdlByPrestazione = mdlVoci.reduce((acc, v) => {
        const key = v.prestazione?.nome || v.nome || 'Visita MDL';
        if (!acc[key]) acc[key] = [];
        acc[key].push(v);
        return acc;
    }, {} as Record<string, VoceTariffarioInfo[]>);

    // Per ogni prestazione, fonde categorie con stesso prezzo con " / "
    const mdlPrestazioniGroups = Object.entries(mdlByPrestazione).map(([prestazioneName, rows]) => {
        const ordered = CATEGORIA_ORDER
            .filter(cat => rows.some(r => r.categoriaVisita === cat))
            .map(cat => rows.find(r => r.categoriaVisita === cat)!);
        const merged: { label: string; price: number | string; frequenza: string }[] = [];
        const seen = new Map<string, number>();
        for (const r of ordered) {
            const key = `${r.prezzoBase}|${r.frequenza}`;
            if (seen.has(key)) {
                merged[seen.get(key)!].label += ' / ' + (CATEGORIA_VISITA_MDL_LABELS[r.categoriaVisita!] ?? r.categoriaVisita);
            } else {
                seen.set(key, merged.length);
                merged.push({
                    label: CATEGORIA_VISITA_MDL_LABELS[r.categoriaVisita!] ?? r.categoriaVisita ?? '',
                    price: r.prezzoBase,
                    frequenza: r.frequenza,
                });
            }
        }
        return { prestazioneName, rows: merged };
    });

    const displayAltreVoci = showAllVoci ? altreVoci : altreVoci.slice(0, 3);
    const hasMoreAltreVoci = altreVoci.length > 3;

    // Raggruppa DVR_AGGIORNAMENTO_CON_MODIFICHE e DVR_AGGIORNAMENTO_SENZA_MODIFICHE
    // sulla stessa riga quando hanno lo stesso prezzo base.
    type DisplayVoce = (VoceTariffarioInfo & { mergedLabel?: string });
    const mergedAltreVoci: DisplayVoce[] = (() => {
        const result: DisplayVoce[] = [];
        const conMod = altreVoci.find(v => v.tipo === 'DVR_AGGIORNAMENTO_CON_MODIFICHE');
        const senzaMod = altreVoci.find(v => v.tipo === 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE');
        const samePriceAgg =
            conMod && senzaMod &&
            Number(conMod.prezzoBase) === Number(senzaMod.prezzoBase);

        for (const voce of altreVoci) {
            if (voce.tipo === 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE' && samePriceAgg) continue; // skip: verrà fusa
            if (voce.tipo === 'DVR_AGGIORNAMENTO_CON_MODIFICHE' && samePriceAgg) {
                result.push({ ...voce, mergedLabel: 'Aggiornamento DVR (con / senza modifiche)' });
            } else {
                result.push(voce);
            }
        }
        return result;
    })();
    const displayMergedVoci = showAllAltreVoci ? mergedAltreVoci : mergedAltreVoci.slice(0, 3);
    const hasMoreMergedVoci = mergedAltreVoci.length > 3 && !showAllAltreVoci;

    return (
        <Card className={cn(
            "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-emerald-200 dark:border-emerald-800 hover:shadow-md dark:hover:shadow-black/30 transition-shadow",
            className
        )}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                        <Euro className="h-5 w-5" />
                        Tariffario Medicina del Lavoro e Sicurezza
                    </CardTitle>
                    <Badge className={cn("text-xs font-medium", validityStatus.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {validityStatus.label}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Header info tariffario */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-50 text-lg leading-tight">
                            {tariffario.nome}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <Tag className="h-3.5 w-3.5" />
                                Cod. {tariffario.codice}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                                {formatDate(tariffario.association?.validoDa || tariffario.validoDa)}
                                {(tariffario.association?.validoA || tariffario.validoA) && (
                                    <> - {formatDate(tariffario.association?.validoA || tariffario.validoA)}</>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Voci tariffario compattate */}
                {voci.length > 0 ? (
                    <div className="border-t border-emerald-200 dark:border-emerald-800 pt-3 space-y-3">
                        {/* Summary compatta: sempre visibile */}
                        <div className="flex flex-wrap gap-2 text-xs">
                            {mdlVoci.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 font-medium">
                                    <Stethoscope className="h-3 w-3" />{mdlVoci.length} Visite MDL
                                </span>
                            )}
                            {consulenzaVoci.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-medium">
                                    <Briefcase className="h-3 w-3" />{consulenzaVoci.length} Consulenza/Sicurezza
                                </span>
                            )}
                            {questionariVoci.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 font-medium">
                                    <FileText className="h-3 w-3" />{questionariVoci.length} Questionari
                                </span>
                            )}
                            {altreVoci.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 font-medium">
                                    <Euro className="h-3 w-3" />{altreVoci.length} Altre voci
                                </span>
                            )}
                        </div>

                        {/* Pulsante espandi/comprimi dettaglio */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 dark:text-emerald-400 -mb-1"
                            onClick={() => setShowAllVoci(!showAllVoci)}
                        >
                            {showAllVoci ? (
                                <><ChevronUp className="h-4 w-4 mr-1" />Comprimi dettaglio</>
                            ) : (
                                <><ChevronDown className="h-4 w-4 mr-1" />Espandi dettaglio ({voci.length} voci)</>
                            )}
                        </Button>

                        {/* Dettaglio espandibile */}
                        {showAllVoci && (
                            <div className="space-y-3">
                                {/* §1 Prestazioni Visite MDL raggruppate per nome prestazione */}
                                {mdlPrestazioniGroups.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide flex items-center gap-1">
                                            <Stethoscope className="h-3.5 w-3.5" /> Visite Medicina del Lavoro
                                        </p>
                                        {mdlPrestazioniGroups.map(({ prestazioneName, rows }) => (
                                            <div key={prestazioneName} className="rounded-lg border border-teal-200 dark:border-teal-700 overflow-hidden">
                                                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-teal-50 dark:bg-teal-900/30">
                                                    <span className="text-xs font-semibold text-teal-800 dark:text-teal-200">{prestazioneName}</span>
                                                </div>
                                                <div className="divide-y divide-teal-100 dark:divide-teal-800">
                                                    {rows.map((row, i) => (
                                                        <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-white/60 dark:bg-gray-800/60 text-sm">
                                                            <span className="text-gray-700 dark:text-gray-300 text-xs">{row.label}</span>
                                                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                                                <span className="text-xs text-gray-400">{FREQUENZA_LABELS[row.frequenza] || row.frequenza}</span>
                                                                <span className="font-semibold text-emerald-700">{formatPrice(row.price)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* §2 Questionari MDL */}
                                {questionariVoci.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide flex items-center gap-1">
                                            <FileText className="h-3.5 w-3.5" /> Questionari
                                        </p>
                                        {questionariVoci.map(voce => (
                                            <div key={voce.id} className="flex items-center justify-between py-1.5 px-2 bg-cyan-50/60 dark:bg-cyan-900/20 rounded border border-cyan-100 dark:border-cyan-800 text-sm">
                                                <span className="truncate text-gray-800 dark:text-gray-200">{getVoceDisplayName(voce)}</span>
                                                <span className="ml-2 font-semibold text-emerald-700 flex-shrink-0">{formatPrice(voce.prezzoBase)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* §3 Consulenza e Sicurezza */}
                                {consulenzaVoci.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide flex items-center gap-1">
                                            <Briefcase className="h-3.5 w-3.5" /> Consulenza e Sicurezza
                                        </p>
                                        {consulenzaVoci.map(voce => (
                                            <div key={voce.id} className="flex items-center justify-between py-1.5 px-2 bg-purple-50/60 dark:bg-purple-900/20 rounded border border-purple-100 dark:border-purple-800 text-sm">
                                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 flex-shrink-0">
                                                        {TIPO_VOCE_LABELS[voce.tipo] || voce.tipo}
                                                    </span>
                                                    <span className="truncate text-gray-800 dark:text-gray-200">{getVoceDisplayName(voce)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                                    <span className="text-xs text-gray-400">{FREQUENZA_LABELS[voce.frequenza] || voce.frequenza}</span>
                                                    <span className="font-semibold text-emerald-700">{formatPrice(voce.prezzoBase)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* §4 Altre voci (DVR, spese) */}
                                {altreVoci.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                                            <Euro className="h-3.5 w-3.5" /> Altre voci
                                        </p>
                                        {displayMergedVoci.map(voce => {
                                            const VoceIcon = TIPO_VOCE_ICONS[voce.tipo] || FileText;
                                            return (
                                                <div key={voce.id} className="flex items-center justify-between py-1.5 px-2 bg-white/60 dark:bg-gray-800/60 rounded border border-emerald-100 dark:border-emerald-800 text-sm">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <VoceIcon className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                                        <span className="truncate text-gray-800 dark:text-gray-200">{voce.mergedLabel ?? getVoceDisplayName(voce)}</span>
                                                        {voce.usaFasceDipendenti && voce.fasceDipendenti && voce.fasceDipendenti.length > 0 && (
                                                            <Badge variant="outline" className="text-[10px] px-1 py-0 text-emerald-600 border-emerald-300">
                                                                <Users className="h-2.5 w-2.5 mr-0.5" />{voce.fasceDipendenti.length} fasce
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                                        <span className="text-xs text-gray-400">{FREQUENZA_LABELS[voce.frequenza] || voce.frequenza}</span>
                                                        <span className="font-semibold text-emerald-700">
                                                            {voce.usaFasceDipendenti ? <span className="text-xs">Fasce</span> : formatPrice(voce.prezzoBase)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {mergedAltreVoci.length > 3 && (
                                            <Button variant="ghost" size="sm" className="w-full text-emerald-700 hover:bg-emerald-100"
                                                onClick={(e) => { e.stopPropagation(); setShowAllAltreVoci(!showAllAltreVoci); }}>
                                                {showAllAltreVoci ? (
                                                    <><ChevronUp className="h-4 w-4 mr-1" />Comprimi</>
                                                ) : (
                                                    <><ChevronDown className="h-4 w-4 mr-1" />+{mergedAltreVoci.length - 3} voci</>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="border-t border-emerald-200 dark:border-emerald-800 pt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <AlertCircle className="h-4 w-4" />
                            Nessuna voce configurata
                        </div>
                    </div>
                )}

                {/* Successore designato - mostrato separatamente dallo storico */}
                {successoreTariffario && (
                    <div className="border-t border-emerald-200 dark:border-emerald-800 pt-3 mt-3">
                        <div className="p-3 rounded-lg border border-dashed border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/20">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                                        Successore designato
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {onEditSuccessore && (
                                        <button
                                            onClick={onEditSuccessore}
                                            className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-800/30 text-amber-600 dark:text-amber-400 transition-colors"
                                            title="Modifica successore"
                                        >
                                            <Settings2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    {onDeleteSuccessore && (
                                        <button
                                            onClick={onDeleteSuccessore}
                                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-800/30 text-red-500 dark:text-red-400 transition-colors"
                                            title="Rimuovi successore"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                                        {successoreTariffario.nome}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {successoreTariffario.codice}
                                    </p>
                                </div>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                    In arrivo
                                </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                        Valido dal {formatDate(successoreTariffario.association?.validoDa || successoreTariffario.validoDa)}
                                    </span>
                                </div>
                                {(successoreTariffario.association?.validoA || successoreTariffario.validoA) && (
                                    <div className="flex items-center gap-1">
                                        <span>
                                            al {formatDate(successoreTariffario.association?.validoA || successoreTariffario.validoA)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Storico Tariffari - mostrato solo se ci sono tariffari scaduti */}
                {storicoTariffari.length > 0 && (
                    <div className="border-t border-emerald-200 dark:border-emerald-800 pt-3 mt-3">
                        <button
                            onClick={() => setShowStorico(!showStorico)}
                            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 w-full"
                        >
                            <History className="h-4 w-4" />
                            <span className="font-medium">Storico ({storicoTariffari.length} precedenti)</span>
                            {showStorico ? (
                                <ChevronUp className="h-4 w-4 ml-auto" />
                            ) : (
                                <ChevronDown className="h-4 w-4 ml-auto" />
                            )}
                        </button>
                        {showStorico && (
                            <div className="mt-2 space-y-2">
                                {storicoTariffari.map((t) => (
                                    <div
                                        key={t.id}
                                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{t.nome}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{t.codice}</p>
                                            </div>
                                            <Badge variant="secondary" className="bg-gray-200 text-gray-600">
                                                Scaduto
                                            </Badge>
                                        </div>
                                        {t.association && (
                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                <Calendar className="h-3 w-3" />
                                                <span>
                                                    {formatDate(t.association.validoDa)}
                                                    {t.association.validoA && ` - ${formatDate(t.association.validoA)}`}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-emerald-100 dark:border-emerald-800">
                    {onEditAssociation && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-blue-700 border-blue-300 hover:bg-blue-100"
                            onClick={onEditAssociation}
                        >
                            <Settings2 className="h-4 w-4 mr-1.5" />
                            Modifica Associazione
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className={onEditAssociation ? "" : "flex-1"}
                        onClick={() => navigate(`/poliambulatorio/mdl/tariffari-aziende/${tariffario.id}`)}
                    >
                        <Edit className="h-4 w-4 mr-1.5" />
                        Modifica Tariffario
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                        onClick={handlePrint}
                        disabled={isPrinting}
                        title="Stampa PDF"
                    >
                        {isPrinting ? (
                            <span className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
                        ) : (
                            <Printer className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default TariffarioCompanyCard;
