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
import { ArrowLeft, Save, Loader2, User } from 'lucide-react';
import { pazientiApi, type Paziente } from '../../../services/clinicaApi';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { useToast } from '../../../hooks/useToast';

interface FormData {
    firstName: string;
    lastName: string;
    taxCode: string;
    email: string;
    phone: string;
    birthDate: string;
    gender: string;
    residenceAddress: string;
    residenceCity: string;
    postalCode: string;
    province: string;
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
    residenceAddress: '',
    residenceCity: '',
    postalCode: '',
    province: '',
});

const PazienteFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [formData, setFormData] = useState<FormData>(getInitialFormData());
    const [errors, setErrors] = useState<FormErrors>({});

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
            residenceAddress: paziente.residenceAddress || paziente.indirizzo || '',
            residenceCity: paziente.residenceCity || paziente.comune || '',
            postalCode: paziente.postalCode || paziente.cap || '',
            province: paziente.province || paziente.provincia || '',
        });
    }, [paziente]);

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
        mutationFn: (data: Partial<Paziente>) => pazientiApi.update(id!, data),
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

        const payload: Record<string, string | undefined> = {};
        if (formData.firstName.trim()) payload.firstName = formData.firstName.trim();
        if (formData.lastName.trim()) payload.lastName = formData.lastName.trim();
        if (formData.taxCode.trim()) payload.taxCode = formData.taxCode.trim().toUpperCase();
        if (formData.email.trim()) payload.email = formData.email.trim().toLowerCase();
        if (formData.phone.trim()) payload.phone = formData.phone.trim();
        if (formData.birthDate) payload.birthDate = formData.birthDate;
        if (formData.gender) payload.gender = formData.gender;
        if (formData.residenceAddress.trim()) payload.residenceAddress = formData.residenceAddress.trim();
        if (formData.residenceCity.trim()) payload.residenceCity = formData.residenceCity.trim();
        if (formData.postalCode.trim()) payload.postalCode = formData.postalCode.trim();
        if (formData.province.trim()) payload.province = formData.province.trim().toUpperCase();

        updateMutation.mutate(payload as Partial<Paziente>);
    };

    const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
        if (errors[field as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
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
