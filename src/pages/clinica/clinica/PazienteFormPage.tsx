/**
 * PazienteFormPage — Pagina modifica dati paziente
 *
 * Modifica i dati anagrafici del paziente (Person global + PersonTenantProfile).
 * Backend: PUT /api/v1/clinica/pazienti/:id
 *
 * @module pages/clinica/clinica/PazienteFormPage
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, User, CreditCard, Users, Search, UserPlus, X } from 'lucide-react';
import { pazientiApi, type Paziente } from '../../../services/clinicaApi';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { useToast } from '../../../hooks/useToast';
import { DEFAULT_ETHNICITY, ETHNICITY_OPTIONS } from '../../../constants/ethnicityOptions';

interface FormData {
    firstName: string;
    lastName: string;
    taxCode: string;
    email: string;
    phone: string;
    birthDate: string;
    gender: string;
    etnia: string;
    residenceAddress: string;
    residenceCity: string;
    postalCode: string;
    province: string;
    numeroCi: string;
    tipoCi: string;
    altroDocumento: string;
    isMinore: boolean;
    isNonAutonomo: boolean;
    tutelanteRelazione: string;
    tutelanteNome: string;
    tutelanteCognome: string;
    tutelanteCF: string;
    tutelanti: Array<{ id?: string; tutelanteId?: string; relazione: string; firstName: string; lastName: string; taxCode?: string; isExisting?: boolean }>;
}

interface FormErrors {
    firstName?: string;
    lastName?: string;
    taxCode?: string;
    email?: string;
    province?: string;
}

const getInitialFormData = (): FormData => ({
    firstName: '',
    lastName: '',
    taxCode: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: '',
    etnia: DEFAULT_ETHNICITY,
    residenceAddress: '',
    residenceCity: '',
    postalCode: '',
    province: '',
    numeroCi: '',
    tipoCi: 'CI',
    altroDocumento: '',
    isMinore: false,
    isNonAutonomo: false,
    tutelanteRelazione: 'GENITORE',
    tutelanteNome: '',
    tutelanteCognome: '',
    tutelanteCF: '',
    tutelanti: [],
});

const PazienteFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [formData, setFormData] = useState<FormData>(getInitialFormData());
    const [errors, setErrors] = useState<FormErrors>({});
    const [guardianSearch, setGuardianSearch] = useState('');
    const [guardianResults, setGuardianResults] = useState<Paziente[]>([]);
    const [isSearchingGuardian, setIsSearchingGuardian] = useState(false);

    // Fetch paziente data
    const { data: paziente, isLoading } = useQuery({
        queryKey: ['paziente', id],
        queryFn: () => pazientiApi.getById(id!),
        enabled: !!id,
    });

    // Populate form when data loads
    useEffect(() => {
        if (!paziente) return;
        setFormData({
            firstName: paziente.firstName || paziente.nome || '',
            lastName: paziente.lastName || paziente.cognome || '',
            taxCode: paziente.taxCode || paziente.codiceFiscale || '',
            email: paziente.email || '',
            phone: paziente.phone || paziente.telefono || '',
            birthDate: (paziente.birthDate || paziente.dataNascita || '').split('T')[0],
            gender: paziente.gender || paziente.sesso || '',
            etnia: paziente.etnia || DEFAULT_ETHNICITY,
            residenceAddress: paziente.residenceAddress || paziente.indirizzo || '',
            residenceCity: paziente.residenceCity || paziente.comune || '',
            postalCode: paziente.postalCode || paziente.cap || '',
            province: paziente.province || paziente.provincia || '',
            numeroCi: paziente.numeroCi || '',
            tipoCi: paziente.tipoCi || 'CI',
            altroDocumento: paziente.altroDocumento || '',
            isMinore: !!paziente.isMinore,
            isNonAutonomo: !!paziente.isNonAutonomo,
            tutelanteRelazione: 'GENITORE',
            tutelanteNome: '',
            tutelanteCognome: '',
            tutelanteCF: '',
            tutelanti: (paziente.tutelanti || []).map((rel: any) => ({
                id: rel.id,
                tutelanteId: rel.tutelante?.id,
                relazione: rel.relazione,
                firstName: rel.tutelante?.firstName || '',
                lastName: rel.tutelante?.lastName || '',
                taxCode: rel.tutelante?.taxCode || '',
                isExisting: true,
            })),
        });
    }, [paziente]);

    useEffect(() => {
        const q = guardianSearch.trim();
        if (q.length < 2) {
            setGuardianResults([]);
            return;
        }
        let cancelled = false;
        setIsSearchingGuardian(true);
        pazientiApi.search(q)
            .then(results => {
                if (!cancelled) setGuardianResults((results || []).filter(p => p.id !== id).slice(0, 6));
            })
            .catch(() => {
                if (!cancelled) setGuardianResults([]);
            })
            .finally(() => {
                if (!cancelled) setIsSearchingGuardian(false);
            });
        return () => {
            cancelled = true;
        };
    }, [guardianSearch, id]);

    const validate = useCallback((): boolean => {
        const e: FormErrors = {};
        if (!formData.firstName.trim()) e.firstName = 'Nome è obbligatorio';
        if (!formData.lastName.trim()) e.lastName = 'Cognome è obbligatorio';
        if (formData.taxCode && formData.taxCode.length !== 16) e.taxCode = 'Il codice fiscale deve avere 16 caratteri';
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Email non valida';
        if (formData.province && formData.province.length > 2) e.province = 'La provincia deve avere max 2 caratteri';
        setErrors(e);
        return Object.keys(e).length === 0;
    }, [formData]);

    const updateMutation = useMutation({
        mutationFn: async (data: Partial<Paziente>) => {
            const updated = await pazientiApi.update(id!, data);
            if (formData.isMinore || formData.isNonAutonomo) {
                for (const tutelante of formData.tutelanti) {
                    await pazientiApi.addTutelante(id!, {
                        tutelanteId: tutelante.tutelanteId,
                        firstName: tutelante.firstName,
                        lastName: tutelante.lastName,
                        taxCode: tutelante.taxCode,
                        relazione: tutelante.relazione,
                        isLegalGuardian: ['GENITORE', 'TUTORE_LEGALE', 'CURATORE'].includes(tutelante.relazione),
                    });
                }
            }
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['paziente', id] });
            queryClient.invalidateQueries({ queryKey: ['pazienti'] });
            showToast({ message: 'Paziente aggiornato con successo', type: 'success' });
            navigate(`/poliambulatorio/pazienti/${id}`);
        },
        onError: () => {
            showToast({ message: 'Errore durante l\'aggiornamento del paziente', type: 'error' });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const payload: Record<string, unknown> = {};
        if (formData.firstName.trim()) payload.firstName = formData.firstName.trim();
        if (formData.lastName.trim()) payload.lastName = formData.lastName.trim();
        if (formData.taxCode.trim()) payload.taxCode = formData.taxCode.trim().toUpperCase();
        if (formData.email.trim()) payload.email = formData.email.trim().toLowerCase();
        if (formData.phone.trim()) payload.phone = formData.phone.trim();
        if (formData.birthDate) payload.birthDate = formData.birthDate;
        if (formData.gender) payload.gender = formData.gender;
        if (formData.etnia.trim()) payload.etnia = formData.etnia.trim();
        if (formData.residenceAddress.trim()) payload.residenceAddress = formData.residenceAddress.trim();
        if (formData.residenceCity.trim()) payload.residenceCity = formData.residenceCity.trim();
        if (formData.postalCode.trim()) payload.postalCode = formData.postalCode.trim();
        if (formData.province.trim()) payload.province = formData.province.trim().toUpperCase();
        if (formData.numeroCi.trim()) payload.numeroCi = formData.numeroCi.trim().toUpperCase();
        if (formData.tipoCi) payload.tipoCi = formData.tipoCi;
        if (formData.altroDocumento.trim()) payload.altroDocumento = formData.altroDocumento.trim();
        payload.isMinore = formData.isMinore;
        payload.isNonAutonomo = formData.isNonAutonomo;

        updateMutation.mutate(payload as Partial<Paziente>);
    };

    const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target instanceof HTMLInputElement && e.target.type === 'checkbox'
            ? e.target.checked
            : e.target.value;
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const addGuardian = (guardian?: Paziente) => {
        const firstName = guardian?.firstName || guardian?.nome || formData.tutelanteNome;
        const lastName = guardian?.lastName || guardian?.cognome || formData.tutelanteCognome;
        const taxCode = guardian?.taxCode || guardian?.codiceFiscale || formData.tutelanteCF;
        if (!guardian?.id && (!firstName.trim() || !lastName.trim() || !taxCode.trim())) {
            showToast({ message: 'Inserisci cognome, nome e codice fiscale del tutelante.', type: 'warning' });
            return;
        }
        setFormData(prev => ({
            ...prev,
            tutelanti: [
                ...prev.tutelanti,
                {
                    tutelanteId: guardian?.id,
                    relazione: prev.tutelanteRelazione,
                    firstName,
                    lastName,
                    taxCode: taxCode.toUpperCase(),
                    isExisting: !!guardian?.id,
                },
            ],
            tutelanteNome: '',
            tutelanteCognome: '',
            tutelanteCF: '',
        }));
        setGuardianSearch('');
        setGuardianResults([]);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        );
    }

    if (!paziente) {
        return (
            <div className="max-w-3xl mx-auto py-8 px-4">
                <div className="text-center py-12">
                    <p className="text-gray-500">Paziente non trovato</p>
                    <button
                        onClick={() => navigate('/poliambulatorio/pazienti')}
                        className="mt-4 text-teal-600 hover:underline"
                    >
                        Torna alla lista
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-6 px-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(`/poliambulatorio/pazienti/${id}`)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Modifica Paziente</h1>
                        <p className="text-sm text-gray-500">
                            {paziente.lastName || paziente.cognome} {paziente.firstName || paziente.nome}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dati Anagrafici */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Dati Anagrafici</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cognome <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={handleChange('lastName')}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="Rossi"
                            />
                            {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={handleChange('firstName')}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="Mario"
                            />
                            {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
                            <input
                                type="text"
                                value={formData.taxCode}
                                onChange={handleChange('taxCode')}
                                maxLength={16}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 uppercase ${errors.taxCode ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="RSSMRA85M01H501Z"
                            />
                            {errors.taxCode && <p className="mt-1 text-sm text-red-500">{errors.taxCode}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data di Nascita</label>
                            <DatePickerElegante
                                value={formData.birthDate || null}
                                onChange={(d) => setFormData(prev => ({ ...prev, birthDate: d ? d.toISOString().split('T')[0] : '' }))}
                                theme="teal"
                                size="md"
                                placeholder="Seleziona data"
                                clearable
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sesso</label>
                            <select
                                value={formData.gender}
                                onChange={handleChange('gender')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="">Seleziona...</option>
                                <option value="MALE">Maschio</option>
                                <option value="FEMALE">Femmina</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Etnia</label>
                            <select
                                value={formData.etnia}
                                onChange={handleChange('etnia')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            >
                                {ETHNICITY_OPTIONS.map(option => (
                                    <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-teal-600" />
                        Documento e Tutela
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo documento</label>
                            <select
                                value={formData.tipoCi}
                                onChange={handleChange('tipoCi')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="CI">Carta d'identità</option>
                                <option value="PATENTE">Patente</option>
                                <option value="PASSAPORTO">Passaporto</option>
                                <option value="PERMESSO_SOGGIORNO">Permesso di soggiorno</option>
                                <option value="ALTRO">Altro documento</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Numero documento</label>
                            <input
                                type="text"
                                value={formData.numeroCi}
                                onChange={handleChange('numeroCi')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 uppercase"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Altro documento</label>
                            <input
                                type="text"
                                value={formData.altroDocumento}
                                onChange={handleChange('altroDocumento')}
                                disabled={formData.tipoCi !== 'ALTRO'}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
                            />
                        </div>
                    </div>

                    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="flex flex-wrap gap-5">
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={formData.isMinore} onChange={handleChange('isMinore')} className="rounded border-gray-300 text-teal-600" />
                                Minore
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={formData.isNonAutonomo} onChange={handleChange('isNonAutonomo')} className="rounded border-gray-300 text-teal-600" />
                                Disabile / non autonomo
                            </label>
                        </div>
                        {(formData.isMinore || formData.isNonAutonomo) && (
                            <div className="mt-4 space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {formData.tutelanti.map((tutelante, idx) => (
                                        <span key={`${tutelante.tutelanteId || tutelante.taxCode}-${idx}`} className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2 py-1 text-xs text-amber-800">
                                            {tutelante.relazione.replace(/_/g, ' ')} · {tutelante.lastName} {tutelante.firstName}
                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, tutelanti: prev.tutelanti.filter((_, i) => i !== idx) }))}>
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <select value={formData.tutelanteRelazione} onChange={handleChange('tutelanteRelazione')} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                        <option value="GENITORE">Genitore</option>
                                        <option value="TUTORE_LEGALE">Tutore legale</option>
                                        <option value="CURATORE">Curatore</option>
                                        <option value="NONNO">Nonno/a</option>
                                        <option value="ZIO">Zio/a</option>
                                        <option value="PARENTE">Altro parente</option>
                                        <option value="ALTRO">Altro</option>
                                    </select>
                                    <div className="md:col-span-3 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input value={guardianSearch} onChange={(e) => setGuardianSearch(e.target.value)} placeholder="Cerca tutelante tra i pazienti" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                        {(guardianResults.length > 0 || isSearchingGuardian) && (
                                            <div className="absolute z-[1500] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                                                {isSearchingGuardian && <div className="px-3 py-2 text-xs text-gray-500">Ricerca...</div>}
                                                {guardianResults.map(result => (
                                                    <button key={result.id} type="button" onClick={() => addGuardian(result)} className="block w-full px-3 py-2 text-left text-sm hover:bg-amber-50">
                                                        {result.lastName || result.cognome} {result.firstName || result.nome}
                                                        <span className="ml-2 text-xs text-gray-500">{result.taxCode || result.codiceFiscale || ''}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input value={formData.tutelanteCognome} onChange={handleChange('tutelanteCognome')} placeholder="Cognome nuovo tutelante" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    <input value={formData.tutelanteNome} onChange={handleChange('tutelanteNome')} placeholder="Nome" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    <input value={formData.tutelanteCF} onChange={handleChange('tutelanteCF')} placeholder="Codice fiscale" maxLength={16} className="px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase" />
                                </div>
                                <button type="button" onClick={() => addGuardian()} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100">
                                    <UserPlus className="h-4 w-4" />
                                    Aggiungi tutelante
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contatti */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Contatti</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={handleChange('email')}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="mario.rossi@email.com"
                            />
                            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange('phone')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="+39 333 1234567"
                            />
                        </div>
                    </div>
                </div>

                {/* Residenza */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Residenza</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                            <input
                                type="text"
                                value={formData.residenceAddress}
                                onChange={handleChange('residenceAddress')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="Via Roma 1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
                            <input
                                type="text"
                                value={formData.residenceCity}
                                onChange={handleChange('residenceCity')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="Roma"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
                                <input
                                    type="text"
                                    value={formData.postalCode}
                                    onChange={handleChange('postalCode')}
                                    maxLength={5}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    placeholder="00100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                                <input
                                    type="text"
                                    value={formData.province}
                                    onChange={handleChange('province')}
                                    maxLength={2}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 uppercase ${errors.province ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="RM"
                                />
                                {errors.province && <p className="mt-1 text-sm text-red-500">{errors.province}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pb-8">
                    <button
                        type="button"
                        onClick={() => navigate(`/poliambulatorio/pazienti/${id}`)}
                        className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                    >
                        {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Salva Modifiche
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PazienteFormPage;
