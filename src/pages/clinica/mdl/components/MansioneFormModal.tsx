/**
 * MansioneFormModal - Form per creazione/modifica mansione
 * 
 * Modal form per gestire mansioni lavorative con rischi associati.
 * Supporta aggiunta/rimozione rischi dinamica con selettore codice rischio.
 * Include riferimenti normativi D.Lgs 81/08 pre-compilati.
 * 
 * @module pages/clinica/mdl/components/MansioneFormModal
 * @project P56 - Medicina del Lavoro Sistema Completo
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    X,
    Plus,
    Trash2,
    Loader2,
    AlertTriangle,
    ShieldAlert,
    Info,
    Filter,
    Book,
    Search
} from 'lucide-react';
import {
    clinicaApi,
    type Mansione,
    type MansioneRischio,
    type CodiceRischio,
    type LivelloRischio,
    type CategoriaRischio,
    type CatalogoRischio,
    type CatalogoRischiResponse
} from '../../../../services/clinicaApi';
import { useToast } from '../../../../hooks/useToast';
import Modal from '../../../../design-system/molecules/Modal/Modal';
import { RIFERIMENTI_NORMATIVI, type RiferimentoNormativo } from '../../../../utils/riferimentiNormativi';

interface MansioneFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mansione?: Mansione | null;
}

// Risk level options
const RISK_LEVELS: { value: LivelloRischio; label: string; color: string }[] = [
    { value: 'BASSO', label: 'Basso', color: 'bg-green-100 text-green-700' },
    { value: 'MEDIO', label: 'Medio', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'ALTO', label: 'Alto', color: 'bg-orange-100 text-orange-700' },
    { value: 'MOLTO_ALTO', label: 'Molto Alto', color: 'bg-red-100 text-red-700' }
];

// Risk category labels with order - aligned with Prisma enum CategoriaRischio
const RISK_CATEGORIES: { value: CategoriaRischio; label: string; order: number }[] = [
    { value: 'FISICI', label: '🔊 Fisici', order: 1 },
    { value: 'CHIMICI', label: '🧪 Chimici', order: 2 },
    { value: 'BIOLOGICI', label: '🦠 Biologici', order: 3 },
    { value: 'ERGONOMICI', label: '🏋️ Ergonomici', order: 4 },
    { value: 'ORGANIZZATIVI', label: '📋 Organizzativi', order: 5 },
    { value: 'SPECIFICI', label: '⚠️ Specifici', order: 6 },  // Quota, spazi confinati, guida
    { value: 'SETTORIALI', label: '🏭 Settoriali', order: 7 }  // Carrelli, elettrico, incendio
];

// RIFERIMENTI_NORMATIVI importato da @/utils/riferimentiNormativi

interface RischioFormData {
    id?: string;
    codiceRischio: CodiceRischio | '';
    livelloRischio: LivelloRischio;
    categoriaRischio: CategoriaRischio;
    descrizione: string;
    noteValutazione: string;
}

const MansioneFormModal: React.FC<MansioneFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    mansione
}) => {
    const { showToast } = useToast();
    const isEditing = !!mansione;

    // Form state
    const [formData, setFormData] = useState({
        codice: '',
        denominazione: '',
        descrizione: '',
        settore: '',
        areaLavoro: '',
        siteId: ''
    });

    const [rischi, setRischi] = useState<RischioFormData[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Filtro per categoria rischi (per ogni rischio aggiunto)
    const [rischioFilters, setRischioFilters] = useState<Record<number, CategoriaRischio | ''>>({})
    // Testo di ricerca per ogni rischio
    const [rischioSearches, setRischioSearches] = useState<Record<number, string>>({});

    // Fetch risk catalog
    const { data: catalogoRischi } = useQuery({
        queryKey: ['catalogo-rischi'],
        queryFn: () => clinicaApi.rischioPrestazioni.getCatalogo(),
        staleTime: Infinity // Static data
    });

    // Ordina e raggruppa i rischi per categoria
    const rischiOrdinati = useMemo(() => {
        if (!catalogoRischi?.flatList) return [];

        // Ordina prima per categoria (ordine definito), poi per nome
        return [...catalogoRischi.flatList].sort((a, b) => {
            const catOrderA = RISK_CATEGORIES.find(c => c.value === a.categoria)?.order || 99;
            const catOrderB = RISK_CATEGORIES.find(c => c.value === b.categoria)?.order || 99;
            if (catOrderA !== catOrderB) return catOrderA - catOrderB;
            return a.nome.localeCompare(b.nome);
        });
    }, [catalogoRischi]);

    // Filtra rischi per un dropdown specifico
    const getFilteredRischi = useCallback((index: number): CatalogoRischio[] => {
        const filter = rischioFilters[index];
        if (!filter) return rischiOrdinati;
        return rischiOrdinati.filter(r => r.categoria === filter);
    }, [rischiOrdinati, rischioFilters]);

    // Populate form when editing
    useEffect(() => {
        if (mansione) {
            setFormData({
                codice: mansione.codice || '',
                denominazione: mansione.denominazione || '',
                descrizione: mansione.descrizione || '',
                settore: mansione.settore || '',
                areaLavoro: mansione.areaLavoro || '',
                siteId: mansione.siteId || ''
            });

            // Backend returns rischiAssociati, not rischi
            const rischiDaBackend = mansione.rischiAssociati || mansione.rischi || [];
            if (rischiDaBackend.length > 0) {
                setRischi(rischiDaBackend.map(r => ({
                    id: r.id,
                    codiceRischio: r.codiceRischio,
                    livelloRischio: r.livelloRischio || r.livello || 'MEDIO',
                    categoriaRischio: r.categoriaRischio || r.categoria || 'FISICI',
                    descrizione: r.descrizione || r.descrizioneEsposizione || '',
                    noteValutazione: r.noteValutazione || ''
                })));
            }
        }
    }, [mansione]);

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: (data: { formData: typeof formData; rischi: RischioFormData[] }) => {
            // Filter out rischi without codiceRischio and map to backend format
            const validRischi = data.rischi
                .filter((r): r is RischioFormData & { codiceRischio: CodiceRischio } =>
                    r.codiceRischio !== '' && r.codiceRischio !== null
                )
                .map(r => ({
                    codiceRischio: r.codiceRischio,
                    livello: r.livelloRischio,         // Backend expects livello
                    categoria: r.categoriaRischio,     // Backend expects categoria
                    descrizioneEsposizione: r.descrizione || undefined
                }));

            const payload = {
                ...data.formData,
                rischi: validRischi
            };

            if (isEditing && mansione) {
                return clinicaApi.mansioni.update(mansione.id, payload);
            }
            return clinicaApi.mansioni.create(payload);
        },
        onSuccess: () => {
            showToast({
                type: 'success',
                message: isEditing ? 'Mansione aggiornata con successo' : 'Mansione creata con successo'
            });
            onSuccess();
        },
        onError: (error: Error) => {
            showToast({
                type: 'error',
                message: 'Errore durante il salvataggio'
            });
        }
    });

    // Handlers
    const handleInputChange = useCallback((field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when field changes
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }, [errors]);

    const handleAddRischio = useCallback(() => {
        setRischi(prev => [...prev, {
            codiceRischio: '',
            livelloRischio: 'MEDIO',
            categoriaRischio: 'FISICI',
            descrizione: '',
            noteValutazione: ''
        }]);
    }, []);

    const handleRemoveRischio = useCallback((index: number) => {
        setRischi(prev => prev.filter((_, i) => i !== index));
        // Rimuovi filtri e ricerche associati
        setRischioFilters(prev => {
            const newFilters = { ...prev };
            delete newFilters[index];
            return newFilters;
        });
        setRischioSearches(prev => {
            const newSearches = { ...prev };
            delete newSearches[index];
            return newSearches;
        });
    }, []);

    // Gestisce il cambio del filtro categoria per un rischio
    const handleCategoryFilterChange = useCallback((index: number, categoria: CategoriaRischio | '') => {
        setRischioFilters(prev => ({ ...prev, [index]: categoria }));
        // Se cambia il filtro categoria, resetta il codice rischio
        setRischi(prev => {
            const newRischi = [...prev];
            // Se c'è un filtro e il rischio attuale non appartiene a quella categoria, resettalo
            if (categoria && newRischi[index].codiceRischio) {
                const rischioAttuale = catalogoRischi?.flatList?.find(r => r.codice === newRischi[index].codiceRischio);
                if (rischioAttuale && rischioAttuale.categoria !== categoria) {
                    newRischi[index].codiceRischio = '';
                }
            }
            // Aggiorna la categoria selezionata
            if (categoria) {
                newRischi[index].categoriaRischio = categoria;
            }
            return newRischi;
        });
    }, [catalogoRischi]);

    const handleRischioChange = useCallback((index: number, field: keyof RischioFormData, value: string) => {
        setRischi(prev => {
            const newRischi = [...prev];
            newRischi[index] = { ...newRischi[index], [field]: value };

            // Auto-fill category and update filter when selecting risk code
            if (field === 'codiceRischio' && catalogoRischi?.flatList) {
                const rischio = catalogoRischi.flatList.find(r => r.codice === value);
                if (rischio) {
                    newRischi[index].categoriaRischio = rischio.categoria;
                    // Aggiorna anche il filtro categoria per coerenza
                    setRischioFilters(prevFilters => ({ ...prevFilters, [index]: rischio.categoria }));
                }
            }

            return newRischi;
        });
    }, [catalogoRischi]);

    // Ottiene i riferimenti normativi per un codice rischio
    const getRiferimentoNormativo = useCallback((codice: CodiceRischio | '') => {
        if (!codice) return null;
        return RIFERIMENTI_NORMATIVI[codice] || null;
    }, []);

    const validate = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.denominazione.trim()) {
            newErrors.denominazione = 'La denominazione è obbligatoria';
        }

        if (!formData.codice.trim()) {
            newErrors.codice = 'Il codice è obbligatorio';
        }

        // Check for duplicate risk codes
        const riskCodes = rischi.filter(r => r.codiceRischio).map(r => r.codiceRischio);
        const uniqueCodes = new Set(riskCodes);
        if (riskCodes.length !== uniqueCodes.size) {
            newErrors.rischi = 'Non puoi aggiungere lo stesso rischio più volte';
        }

        // Avvisa per rischi incompleti (aggiunti ma senza codice selezionato)
        const rischiIncompleti = rischi.filter(r => !r.codiceRischio && (r.livelloRischio || r.descrizione));
        if (rischiIncompleti.length > 0) {
            newErrors.rischi = `${rischiIncompleti.length} rischio/i aggiunti senza codice selezionato. Completa o rimuovi le righe incomplete.`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, rischi]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        saveMutation.mutate({ formData, rischi });
    }, [formData, rischi, validate, saveMutation]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Modifica Mansione' : 'Nuova Mansione'}
            size="xl"
        >
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Informazioni Base
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Codice *
                                </label>
                                <input
                                    type="text"
                                    value={formData.codice}
                                    onChange={(e) => handleInputChange('codice', e.target.value)}
                                    className={`input-clinica w-full ${errors.codice ? 'border-red-300' : ''}`}
                                    placeholder="es. MAN001"
                                />
                                {errors.codice && (
                                    <p className="text-sm text-red-600 mt-1">{errors.codice}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Denominazione Mansione *
                                </label>
                                <input
                                    type="text"
                                    value={formData.denominazione}
                                    onChange={(e) => handleInputChange('denominazione', e.target.value)}
                                    className={`input-clinica w-full ${errors.denominazione ? 'border-red-300' : ''}`}
                                    placeholder="es. Operatore Carrellista"
                                />
                                {errors.denominazione && (
                                    <p className="text-sm text-red-600 mt-1">{errors.denominazione}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descrizione
                            </label>
                            <textarea
                                value={formData.descrizione}
                                onChange={(e) => handleInputChange('descrizione', e.target.value)}
                                className="input-clinica w-full"
                                rows={2}
                                placeholder="Descrizione delle attività svolte..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Settore
                                </label>
                                <input
                                    type="text"
                                    value={formData.settore}
                                    onChange={(e) => handleInputChange('settore', e.target.value)}
                                    className="input-clinica w-full"
                                    placeholder="es. Logistica"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Area Lavoro
                                </label>
                                <input
                                    type="text"
                                    value={formData.areaLavoro}
                                    onChange={(e) => handleInputChange('areaLavoro', e.target.value)}
                                    className="input-clinica w-full"
                                    placeholder="es. Magazzino"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rischi Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4" />
                                Rischi Associati
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddRischio}
                                className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                            >
                                <Plus className="h-4 w-4" />
                                Aggiungi Rischio
                            </button>
                        </div>

                        {errors.rischi && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-600">{errors.rischi}</p>
                            </div>
                        )}

                        {rischi.length === 0 ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                                <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 mb-3">
                                    Nessun rischio associato. Clicca "Aggiungi Rischio" per iniziare.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleAddRischio}
                                    className="text-sm text-teal-600 hover:text-teal-700 font-medium border border-teal-300 hover:border-teal-400 rounded-lg px-4 py-2 transition-colors inline-flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Aggiungi Rischio
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {rischi.map((rischio, index) => {
                                    const rifNormativo = getRiferimentoNormativo(rischio.codiceRischio);
                                    const filteredRischiList = getFilteredRischi(index);
                                    const currentFilter = rischioFilters[index] || '';

                                    return (
                                        <div
                                            key={index}
                                            className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <span className="text-xs font-medium text-gray-500">
                                                    Rischio #{index + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRischio(index)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>

                                            {/* Riga 1: Categoria - badge pills sempre visibili */}
                                            <div className="mb-3">
                                                <label className="block text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                                                    <Filter className="h-3 w-3" />
                                                    Categoria
                                                </label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCategoryFilterChange(index, '')}
                                                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${currentFilter === ''
                                                                ? 'bg-teal-600 text-white border-teal-600'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400 hover:text-teal-700'
                                                            }`}
                                                    >
                                                        Tutti
                                                    </button>
                                                    {RISK_CATEGORIES.map(cat => (
                                                        <button
                                                            key={cat.value}
                                                            type="button"
                                                            onClick={() => handleCategoryFilterChange(index, cat.value)}
                                                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${currentFilter === cat.value
                                                                    ? 'bg-teal-600 text-white border-teal-600'
                                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400 hover:text-teal-700'
                                                                }`}
                                                        >
                                                            {cat.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Riga 2: Codice Rischio (lista) + Livello (bottoni) */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                                {/* Codice Rischio - lista ricercabile */}
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Codice Rischio *
                                                    </label>
                                                    {rischio.codiceRischio && (
                                                        <div className="mb-2 flex items-center gap-1.5 px-2 py-1 bg-teal-50 border border-teal-200 rounded-md">
                                                            <span className="font-mono text-xs font-semibold text-teal-700">[{rischio.codiceRischio}]</span>
                                                            <span className="text-xs text-teal-800 truncate flex-1">
                                                                {rischiOrdinati.find(r => r.codice === rischio.codiceRischio)?.nome || ''}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRischioChange(index, 'codiceRischio', '')}
                                                                className="text-teal-400 hover:text-red-500 flex-shrink-0"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div className="relative mb-1">
                                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                                        <input
                                                            type="text"
                                                            placeholder="Cerca per nome o codice..."
                                                            value={rischioSearches[index] || ''}
                                                            onChange={(e) => setRischioSearches(prev => ({ ...prev, [index]: e.target.value }))}
                                                            className="input-clinica w-full text-xs"
                                                            style={{ paddingLeft: '2rem' }}
                                                        />
                                                    </div>
                                                    <div className="h-36 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
                                                        {(() => {
                                                            const q = (rischioSearches[index] || '').toLowerCase();
                                                            const list = filteredRischiList.filter(r =>
                                                                !q || r.nome.toLowerCase().includes(q) || r.codice.toLowerCase().includes(q)
                                                            );
                                                            if (list.length === 0) return (
                                                                <div className="flex items-center justify-center h-full text-xs text-gray-400">Nessun risultato</div>
                                                            );
                                                            return list.map(r => (
                                                                <button
                                                                    key={r.codice}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleRischioChange(index, 'codiceRischio', r.codice);
                                                                        setRischioSearches(prev => ({ ...prev, [index]: '' }));
                                                                    }}
                                                                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${rischio.codiceRischio === r.codice
                                                                            ? 'bg-teal-50 text-teal-800 font-medium'
                                                                            : 'hover:bg-gray-50 text-gray-700'
                                                                        }`}
                                                                >
                                                                    <span className="font-mono text-gray-400 mr-1.5">[{r.codice}]</span>
                                                                    {r.nome}
                                                                </button>
                                                            ));
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* Livello - bottoni colorati */}
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-2">
                                                        Livello Rischio
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {RISK_LEVELS.map(level => (
                                                            <button
                                                                key={level.value}
                                                                type="button"
                                                                onClick={() => handleRischioChange(index, 'livelloRischio', level.value)}
                                                                className={`py-2.5 rounded-lg text-xs font-semibold transition-all border-2 ${rischio.livelloRischio === level.value
                                                                        ? level.color + ' border-transparent shadow-sm scale-105'
                                                                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
                                                                    }`}
                                                            >
                                                                {level.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {/* Indicatore visivo livello selezionato */}
                                                    {rischio.livelloRischio && (
                                                        <div className={`mt-3 px-3 py-1.5 rounded-full text-center text-xs font-semibold ${RISK_LEVELS.find(l => l.value === rischio.livelloRischio)?.color || ''
                                                            }`}>
                                                            Selezionato: {RISK_LEVELS.find(l => l.value === rischio.livelloRischio)?.label}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Riferimento normativo D.Lgs 81/08 */}
                                            {rifNormativo && (
                                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                    <div className="flex items-start gap-2">
                                                        <Book className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                                        <div className="text-xs text-blue-800 space-y-1">
                                                            <div><strong>Normativa:</strong> {rifNormativo.normativa}</div>
                                                            <div><strong>Riferimento:</strong> {rifNormativo.articoli}</div>
                                                            <div><strong>Periodicità:</strong> {rifNormativo.periodicita}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-3">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Note valutazione
                                                </label>
                                                <input
                                                    type="text"
                                                    value={rischio.noteValutazione}
                                                    onChange={(e) => handleRischioChange(index, 'noteValutazione', e.target.value)}
                                                    className="input-clinica w-full text-sm"
                                                    placeholder="Note sulla valutazione del rischio..."
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Bottom "Aggiungi Rischio" button (visible when there are already risks) */}
                        {rischi.length > 0 && (
                            <button
                                type="button"
                                onClick={handleAddRischio}
                                className="w-full py-2.5 text-sm text-teal-600 hover:text-teal-700 font-medium border-2 border-dashed border-teal-200 hover:border-teal-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Aggiungi Altro Rischio
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-clinica-secondary"
                        disabled={saveMutation.isPending}
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        className="btn-clinica-primary"
                        disabled={saveMutation.isPending}
                    >
                        {saveMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Salvataggio...
                            </>
                        ) : isEditing ? (
                            'Salva Modifiche'
                        ) : (
                            'Crea Mansione'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default MansioneFormModal;
