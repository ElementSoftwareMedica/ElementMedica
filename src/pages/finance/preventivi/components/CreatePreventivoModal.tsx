/**
 * CreatePreventivoModal Component
 * 
 * Modal for creating new preventivi (quotes) with multi-voice support.
 * Extracted from PreventiviPage.tsx as part of Project 46 modularization.
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { format } from 'date-fns';
import {
    Plus,
    X,
    Building2,
    User,
    Tag,
    Trash2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { apiGet, apiPost } from '@/services/api';
import SearchableDropdown from './SearchableDropdown';
import {
    Company,
    Person,
    CourseSchedule,
    PreventivoVoce,
    CreatePreventivoData,
    TIPO_SERVIZIO_CONFIG
} from '../types';

interface CreatePreventivoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreatePreventivoData) => Promise<void>;
}

interface ScontoValidation {
    valid: boolean;
    importoSconto: number;
    codiceNome?: string;
    tipoSconto?: string;
    valore?: number;
    error?: string;
}

const CreatePreventivoModal: React.FC<CreatePreventivoModalProps> = ({
    isOpen,
    onClose,
    onSubmit
}) => {
    const [formData, setFormData] = useState<CreatePreventivoData>({
        tipoServizio: 'CORSO',
        titoloServizio: '',
        descrizioneServizio: '',
        prezzoTotale: 0,
        aliquotaIva: 22,
        note: '',
        voci: [{ id: '1', descrizione: '', quantita: 1, prezzoUnitario: 0, subtotale: 0 }]
    });
    const [companies, setCompanies] = useState<Company[]>([]);
    const [persons, setPersons] = useState<Person[]>([]);
    const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
    const [clienteType, setClienteType] = useState<'azienda' | 'persona'>('azienda');
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);

    // Stato validazione codice sconto
    const [scontoValidation, setScontoValidation] = useState<ScontoValidation | null>(null);
    const [validatingSconto, setValidatingSconto] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadFormData();
        }
    }, [isOpen]);

    const loadFormData = async () => {
        setLoadingData(true);
        try {
            const [companiesRes, personsRes, schedulesRes] = await Promise.all([
                apiGet<Company[]>('/api/v1/companies').catch(() => []),
                apiGet<Person[]>('/api/v1/persons').catch(() => []),
                apiGet<CourseSchedule[]>('/api/v1/schedules').catch(() => [])
            ]);

            // Sort companies alphabetically
            const sortedCompanies = Array.isArray(companiesRes)
                ? companiesRes.sort((a, b) => (a.ragioneSociale || '').localeCompare(b.ragioneSociale || ''))
                : [];
            setCompanies(sortedCompanies);
            setPersons(Array.isArray(personsRes) ? personsRes : []);

            // Sort schedules by date (most recent/future first) and exclude expired
            const now = new Date();
            const validSchedules = (Array.isArray(schedulesRes) ? schedulesRes : [])
                .filter(s => {
                    // Exclude expired schedules (endDate < now and status COMPLETED)
                    const endDate = (s as any).endDate ? new Date((s as any).endDate) : new Date(s.startDate);
                    return endDate >= now || (s as any).status !== 'COMPLETED';
                })
                .sort((a, b) => {
                    const dateA = new Date(a.startDate);
                    const dateB = new Date(b.startDate);
                    return dateB.getTime() - dateA.getTime(); // Descending (newest first)
                });
            setSchedules(validSchedules);
        } catch (err) {
            console.error('Error loading form data:', err);
        } finally {
            setLoadingData(false);
        }
    };

    // Calcola subtotale per una voce
    const updateVoceSubtotale = (voce: PreventivoVoce): PreventivoVoce => ({
        ...voce,
        subtotale: voce.quantita * voce.prezzoUnitario
    });

    // Aggiungi nuova voce
    const addVoce = () => {
        const newVoci = [...(formData.voci || []), {
            id: Date.now().toString(),
            descrizione: '',
            quantita: 1,
            prezzoUnitario: 0,
            subtotale: 0
        }];
        setFormData({ ...formData, voci: newVoci });
    };

    // Rimuovi voce
    const removeVoce = (id: string) => {
        if ((formData.voci?.length || 0) <= 1) return; // Keep at least one
        const newVoci = (formData.voci || []).filter(v => v.id !== id);
        setFormData({ ...formData, voci: newVoci });
    };

    // Aggiorna voce
    const updateVoce = (id: string, field: keyof PreventivoVoce, value: string | number) => {
        const newVoci = (formData.voci || []).map(v => {
            if (v.id !== id) return v;
            const updated = { ...v, [field]: value };
            return updateVoceSubtotale(updated);
        });
        setFormData({ ...formData, voci: newVoci });
    };

    // Calcola totali (con sconto se validato)
    const totaleVoci = (formData.voci || []).reduce((sum, v) => sum + v.subtotale, 0);
    const importoScontoCalcolato = scontoValidation?.valid ? scontoValidation.importoSconto : 0;
    const imponibileScontato = totaleVoci - importoScontoCalcolato;
    const importoIva = imponibileScontato * (formData.aliquotaIva / 100);
    const importoFinale = imponibileScontato + importoIva;

    // Funzione per validare il codice sconto
    const validateCodiceSconto = async (codice: string) => {
        if (!codice || codice.trim().length === 0) {
            setScontoValidation(null);
            return;
        }

        // Verifica che ci sia un cliente selezionato
        const clienteId = formData.aziendaId || formData.personaId;
        if (!clienteId) {
            setScontoValidation({
                valid: false,
                importoSconto: 0,
                error: 'Seleziona prima un cliente per validare il codice sconto'
            });
            return;
        }

        setValidatingSconto(true);
        try {
            const response = await apiPost<{
                success: boolean;
                valid: boolean;
                codice?: {
                    id: string;
                    codice: string;
                    nome: string;
                    descrizione?: string;
                    tipoSconto: string;
                    valore: number;
                    cumulabile: boolean;
                };
                calcolo?: {
                    prezzoBase: number;
                    importoSconto: number;
                    prezzoFinale: number;
                    risparmioPercentuale: string;
                };
                errors?: string[];
                error?: string;
            }>('/api/v1/codici-sconto/valida', {
                codice: codice.trim().toUpperCase(),
                prezzoBase: totaleVoci,
                tipoServizio: formData.tipoServizio,
                clienteId: clienteId,
                clienteType: formData.aziendaId ? 'azienda' : 'persona',
                ...(formData.corsoId && { corsoId: formData.corsoId })
            });

            if (response.valid && response.calcolo) {
                setScontoValidation({
                    valid: true,
                    importoSconto: response.calcolo.importoSconto,
                    codiceNome: response.codice?.nome,
                    tipoSconto: response.codice?.tipoSconto,
                    valore: response.codice?.valore
                });
            } else {
                setScontoValidation({
                    valid: false,
                    importoSconto: 0,
                    error: response.errors?.[0] || response.error || 'Codice sconto non valido'
                });
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Errore nella validazione del codice sconto';
            setScontoValidation({
                valid: false,
                importoSconto: 0,
                error: errorMessage
            });
        } finally {
            setValidatingSconto(false);
        }
    };

    // Effetto per validare il codice sconto con debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (formData.codiceSconto && totaleVoci > 0 && (formData.aziendaId || formData.personaId)) {
                validateCodiceSconto(formData.codiceSconto);
            } else if (!formData.aziendaId && !formData.personaId && formData.codiceSconto) {
                // Resetta se non c'è cliente ma c'è codice
                setScontoValidation({
                    valid: false,
                    importoSconto: 0,
                    error: 'Seleziona prima un cliente per validare il codice sconto'
                });
            } else {
                setScontoValidation(null);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.codiceSconto, totaleVoci, formData.aziendaId, formData.personaId, formData.tipoServizio, formData.corsoId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Build description from voci
            const vociDescription = (formData.voci || [])
                .filter(v => v.descrizione && v.subtotale > 0)
                .map(v => `• ${v.descrizione}: ${v.quantita} x €${v.prezzoUnitario.toFixed(2)} = €${v.subtotale.toFixed(2)}`)
                .join('\n');

            const fullDescription = vociDescription
                ? `${formData.descrizioneServizio || ''}\n\nDettaglio voci:\n${vociDescription}`.trim()
                : formData.descrizioneServizio;

            await onSubmit({
                ...formData,
                prezzoTotale: totaleVoci,
                descrizioneServizio: fullDescription
            });
            onClose();
            // Reset form
            setFormData({
                tipoServizio: 'CORSO',
                titoloServizio: '',
                descrizioneServizio: '',
                prezzoTotale: 0,
                aliquotaIva: 22,
                note: '',
                voci: [{ id: '1', descrizione: '', quantita: 1, prezzoUnitario: 0, subtotale: 0 }],
                codiceSconto: ''
            });
        } catch (err) {
            console.error('Error creating preventivo:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Nuovo Preventivo
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-white" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]" noValidate>
                    {loadingData ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Tipo Servizio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Servizio *</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {Object.entries(TIPO_SERVIZIO_CONFIG).map(([key, config]) => {
                                        const Icon = config.icon;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, tipoServizio: key as CreatePreventivoData['tipoServizio'] })}
                                                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${formData.tipoServizio === key
                                                        ? 'border-orange-500 bg-orange-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <Icon className={`h-5 w-5 ${config.color}`} />
                                                <span className="text-xs font-medium text-center">{config.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Cliente Type Toggle */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
                                <div className="flex gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setClienteType('azienda');
                                            setFormData({ ...formData, personaId: undefined });
                                        }}
                                        className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${clienteType === 'azienda'
                                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                    >
                                        <Building2 className="h-4 w-4" />
                                        Azienda
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setClienteType('persona');
                                            setFormData({ ...formData, aziendaId: undefined });
                                        }}
                                        className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${clienteType === 'persona'
                                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                    >
                                        <User className="h-4 w-4" />
                                        Persona
                                    </button>
                                </div>

                                {clienteType === 'azienda' ? (
                                    <SearchableDropdown
                                        value={formData.aziendaId || ''}
                                        onChange={(value) => setFormData({ ...formData, aziendaId: value || undefined })}
                                        options={companies.map(c => ({
                                            value: c.id,
                                            label: c.ragioneSociale || 'N/A'
                                        }))}
                                        placeholder="Seleziona azienda..."
                                        searchPlaceholder="Cerca azienda..."
                                        required
                                    />
                                ) : (
                                    <SearchableDropdown
                                        value={formData.personaId || ''}
                                        onChange={(value) => setFormData({ ...formData, personaId: value || undefined })}
                                        options={persons.map(p => ({
                                            value: p.id,
                                            label: `${p.firstName} ${p.lastName}`
                                        }))}
                                        placeholder="Seleziona persona..."
                                        searchPlaceholder="Cerca persona..."
                                        required
                                    />
                                )}
                            </div>

                            {/* Corso (if tipo = CORSO) */}
                            {formData.tipoServizio === 'CORSO' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Corso Programmato</label>
                                    <SearchableDropdown
                                        value={formData.corsoId || ''}
                                        onChange={(value) => setFormData({ ...formData, corsoId: value || undefined })}
                                        options={schedules.map(s => ({
                                            value: s.id,
                                            label: `${s.course?.title || 'N/A'} - ${format(new Date(s.startDate), 'dd/MM/yyyy')}`
                                        }))}
                                        placeholder="Seleziona corso (opzionale)..."
                                        searchPlaceholder="Cerca corso..."
                                    />
                                </div>
                            )}

                            {/* Titolo Servizio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Titolo Servizio *</label>
                                <input
                                    type="text"
                                    value={formData.titoloServizio}
                                    onChange={(e) => setFormData({ ...formData, titoloServizio: e.target.value })}
                                    placeholder="Es. Corso Sicurezza sul Lavoro"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    required
                                />
                            </div>

                            {/* VOCI DEL PREVENTIVO */}
                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-sm font-medium text-gray-700">
                                        Voci del Preventivo
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addVoce}
                                        className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Aggiungi voce
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {/* Header */}
                                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                                        <div className="col-span-5">Descrizione</div>
                                        <div className="col-span-2 text-center">Qtà</div>
                                        <div className="col-span-2 text-right">Prezzo Unit.</div>
                                        <div className="col-span-2 text-right">Subtotale</div>
                                        <div className="col-span-1"></div>
                                    </div>

                                    {/* Voci */}
                                    {(formData.voci || []).map((voce) => (
                                        <div key={voce.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-gray-200">
                                            <div className="col-span-5">
                                                <input
                                                    type="text"
                                                    value={voce.descrizione}
                                                    onChange={(e) => updateVoce(voce.id, 'descrizione', e.target.value)}
                                                    placeholder="Es. Partecipante corso base"
                                                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={voce.quantita}
                                                    onChange={(e) => updateVoce(voce.id, 'quantita', parseInt(e.target.value) || 1)}
                                                    className="w-full px-3 py-1.5 text-sm text-center border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={voce.prezzoUnitario}
                                                        onChange={(e) => updateVoce(voce.id, 'prezzoUnitario', parseFloat(e.target.value) || 0)}
                                                        className="w-full pl-5 pr-2 py-1.5 text-sm text-right border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-2 text-right font-medium text-gray-900 text-sm">
                                                € {voce.subtotale.toFixed(2)}
                                            </div>
                                            <div className="col-span-1 text-center">
                                                {(formData.voci?.length || 0) > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeVoce(voce.id)}
                                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Codice Sconto */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <div className="flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-green-600" />
                                        Codice Sconto (opzionale)
                                    </div>
                                </label>
                                <input
                                    type="text"
                                    value={formData.codiceSconto || ''}
                                    onChange={(e) => setFormData({ ...formData, codiceSconto: e.target.value.toUpperCase() })}
                                    placeholder="Es. SCONTO20"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 uppercase"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Il codice sconto verrà applicato dopo la creazione del preventivo
                                </p>
                            </div>

                            {/* IVA */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Aliquota IVA</label>
                                <select
                                    value={formData.aliquotaIva}
                                    onChange={(e) => setFormData({ ...formData, aliquotaIva: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                >
                                    <option value="0">0% (Esente)</option>
                                    <option value="4">4%</option>
                                    <option value="10">10%</option>
                                    <option value="22">22%</option>
                                </select>
                            </div>

                            {/* Totali Preview */}
                            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                                <h4 className="font-medium text-gray-700 mb-3">Riepilogo</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Totale voci ({(formData.voci || []).filter(v => v.subtotale > 0).length}):</span>
                                        <span className="font-medium">€ {totaleVoci.toFixed(2)}</span>
                                    </div>

                                    {/* Sconto - mostra solo se validato o in validazione */}
                                    {formData.codiceSconto && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600 flex items-center gap-1">
                                                Sconto
                                                {validatingSconto && (
                                                    <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-orange-500"></span>
                                                )}
                                                {scontoValidation?.valid && scontoValidation.codiceNome && (
                                                    <span className="text-xs text-green-600">({scontoValidation.codiceNome})</span>
                                                )}
                                                {scontoValidation && !scontoValidation.valid && (
                                                    <span className="text-xs text-red-500" title={scontoValidation.error}>⚠️</span>
                                                )}
                                            </span>
                                            {scontoValidation?.valid ? (
                                                <span className="font-medium text-green-600">- € {importoScontoCalcolato.toFixed(2)}</span>
                                            ) : (
                                                <span className="font-medium text-gray-400">€ 0.00</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Subtotale scontato (mostra solo se c'è uno sconto valido) */}
                                    {scontoValidation?.valid && importoScontoCalcolato > 0 && (
                                        <div className="flex justify-between text-gray-600">
                                            <span>Imponibile scontato:</span>
                                            <span className="font-medium">€ {imponibileScontato.toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between">
                                        <span className="text-gray-600">IVA ({formData.aliquotaIva}%):</span>
                                        <span className="font-medium">€ {importoIva.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-orange-300">
                                        <span className="text-gray-900 font-semibold">Totale:</span>
                                        <span className="text-xl font-bold text-orange-600">€ {importoFinale.toFixed(2)}</span>
                                    </div>

                                    {/* Messaggio risparmio */}
                                    {scontoValidation?.valid && importoScontoCalcolato > 0 && (
                                        <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200 text-center">
                                            <span className="text-green-700 text-xs font-medium">
                                                🎉 Risparmi € {importoScontoCalcolato.toFixed(2)} con il codice sconto!
                                            </span>
                                        </div>
                                    )}

                                    {/* Errore codice sconto */}
                                    {scontoValidation && !scontoValidation.valid && scontoValidation.error && (
                                        <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200 text-center">
                                            <span className="text-red-600 text-xs">
                                                ⚠️ {scontoValidation.error}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                                <textarea
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    placeholder="Note aggiuntive..."
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>
                        </div>
                    )}
                </form>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Annulla
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={loading || !formData.titoloServizio || totaleVoci <= 0 || (!formData.aziendaId && !formData.personaId)}
                        className="flex items-center gap-2"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <Plus className="h-4 w-4" />
                        )}
                        Crea Preventivo
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CreatePreventivoModal;
