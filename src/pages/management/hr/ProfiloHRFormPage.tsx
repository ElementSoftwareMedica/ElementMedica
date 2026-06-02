/**
 * P68 - Profilo HR Form Page
 * Form per creazione e modifica profili HR
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Save,
    User,
    Briefcase,
    Calendar,
    Clock,
    Info,
    Wallet,
} from 'lucide-react';
import { CRUDPrimaryButton, CRUDButton } from '@/components/shared/CRUDButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DatePickerElegante from '@/components/ui/DatePickerElegante';
import { useToast } from '@/hooks/useToast';
import { useTenantFilter } from '@/context/TenantFilterContext';
import { apiGet } from '@/services/api';
import {
    profiliHRApi,
    mansioniInterneApi,
    type ProfiloHR,
    type MansioneInterna,
} from './api';

const ProfiloHRFormPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id && id !== 'nuovo';
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // P69: Tenant filter for employees
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    // Form state
    const [formData, setFormData] = useState({
        personTenantProfileId: '',
        mansioneInternaId: '',
        matricola: '',
        dataAssunzione: '',
        dataFineContratto: '',
        oreSettimanaliContrattuali: 40,
        oreGiornaliereStandard: 8,
        pausaPranzoMinuti: 60,
        flexibilityMinuti: 15,
        isTimbraturaPbligatoria: true,
        canAccessTimbratura: true,
        saldoFerie: 0,
        saldoPermessi: 0,
        saldoROL: 0,
        noteContrattuali: '',
        supervisoreId: '',
    });
    const [employeeSearch, setEmployeeSearch] = useState('');

    // Query: profilo esistente (se edit)
    const { data: profiloData, isLoading: isLoadingProfilo } = useQuery({
        queryKey: ['hr', 'profili', id],
        queryFn: () => profiliHRApi.get(id!),
        enabled: isEdit,
    });

    // Query: mansioni interne per select - P69 Session 5.9: Filter by tenant selector
    const { data: mansioniData } = useQuery({
        queryKey: ['hr', 'mansioni-interne', 'list', tenantFilterKey],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            const params: Record<string, string | boolean> = { isActive: true };

            // P69: Convert tenantIds array to comma-separated string for backend
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            if (tenantParams.allTenants) {
                params.allTenants = true;
            }

            return mansioniInterneApi.list(params as { isActive?: boolean });
        },
        enabled: isReady,
    });

    // Query: PersonTenantProfiles disponibili per questo tenant - P69: Filter by tenant selector
    const { data: personTenantProfilesData } = useQuery({
        queryKey: ['personTenantProfiles', 'forHR', tenantFilterKey],
        queryFn: async () => {
            // Usa l'API employees che restituisce persone con i loro PersonTenantProfile
            const tenantParams = getTenantFilterParams();
            const params: Record<string, string | number> = { limit: 500 };

            // P69: Convert tenantIds array to comma-separated string for backend
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            if (tenantParams.allTenants) {
                params.allTenants = 'true';
            }

            const response = await apiGet<{
                data: Array<{
                    id: string;
                    firstName: string;
                    lastName: string;
                    taxCode?: string;
                    email?: string;
                    phone?: string;
                    status?: string;
                    company?: { ragioneSociale?: string };
                    tenantProfiles?: Array<{ id: string; tenantId: string }>;
                }>
            }>('/api/v1/employees', params);
            return response;
        },
        enabled: isReady,
    });

    // Query: profili HR esistenti per escluderli dalla selezione
    const { data: existingProfiles } = useQuery({
        queryKey: ['hr', 'profili', 'all'],
        queryFn: () => profiliHRApi.list({ limit: 1000 }),
    });

    // Filtra le persone che già hanno un profilo HR
    // L'API employees restituisce Person con tenantProfiles[0].id come personTenantProfileId
    const availablePersons = React.useMemo(() => {
        const employees = personTenantProfilesData?.data || [];
        const existingProfileIds = new Set(
            (existingProfiles?.data || []).map(p => p.personTenantProfileId)
        );

        // Mappa employees al formato atteso con personTenantProfileId
        return employees
            .map(emp => ({
                id: emp.id, // Person ID
                personTenantProfileId: emp.tenantProfiles?.[0]?.id || '', // PersonTenantProfile ID
                firstName: emp.firstName,
                lastName: emp.lastName,
                taxCode: emp.taxCode,
                email: emp.email,
                company: emp.company,
            }))
            .filter(p =>
                p.personTenantProfileId && (
                    !existingProfileIds.has(p.personTenantProfileId) ||
                    (isEdit && profiloData?.data?.personTenantProfileId === p.personTenantProfileId)
                )
            )
            .filter((p) => {
                const searchText = employeeSearch.trim().toLowerCase();
                if (!searchText) return true;
                return [
                    p.lastName,
                    p.firstName,
                    p.taxCode,
                    p.email,
                    p.company?.ragioneSociale,
                ].filter(Boolean).join(' ').toLowerCase().includes(searchText);
            })
            .sort((a, b) =>
                `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(
                    `${b.lastName || ''} ${b.firstName || ''}`,
                    'it',
                    { sensitivity: 'base' }
                )
            );
    }, [personTenantProfilesData, existingProfiles, isEdit, profiloData, employeeSearch]);

    // Popola form se edit
    useEffect(() => {
        if (profiloData?.data) {
            const p = profiloData.data;
            setFormData({
                personTenantProfileId: p.personTenantProfileId || '',
                mansioneInternaId: p.mansioneInternaId || '',
                matricola: p.matricola || '',
                dataAssunzione: p.dataAssunzione ? p.dataAssunzione.split('T')[0] : '',
                dataFineContratto: p.dataFineContratto ? p.dataFineContratto.split('T')[0] : '',
                oreSettimanaliContrattuali: p.oreSettimanaliContrattuali ?? 40,
                oreGiornaliereStandard: p.oreGiornaliereStandard ?? 8,
                pausaPranzoMinuti: p.pausaPranzoMinuti ?? 60,
                flexibilityMinuti: p.flexibilityMinuti ?? 15,
                isTimbraturaPbligatoria: p.isTimbraturaPbligatoria ?? true,
                canAccessTimbratura: p.canAccessTimbratura ?? true,
                saldoFerie: p.saldoFerie ?? 0,
                saldoPermessi: p.saldoPermessi ?? 0,
                saldoROL: p.saldoROL ?? 0,
                noteContrattuali: p.noteContrattuali || '',
                supervisoreId: p.supervisoreId || '',
            });
        }
    }, [profiloData]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Partial<ProfiloHR>) => profiliHRApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'profili'] });
            showToast({ message: 'Profilo HR creato con successo', type: 'success' });
            navigate('/management/hr/profili');
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: Partial<ProfiloHR>) => profiliHRApi.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'profili'] });
            showToast({ message: 'Profilo HR aggiornato', type: 'success' });
            navigate('/management/hr/profili');
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.personTenantProfileId) {
            showToast({ message: 'Seleziona una persona', type: 'error' });
            return;
        }

        const payload = {
            ...formData,
            dataAssunzione: formData.dataAssunzione ? new Date(formData.dataAssunzione).toISOString() : undefined,
            dataFineContratto: formData.dataFineContratto ? new Date(formData.dataFineContratto).toISOString() : undefined,
            mansioneInternaId: formData.mansioneInternaId || undefined,
            supervisoreId: formData.supervisoreId || undefined,
            matricola: formData.matricola || undefined,
        };

        if (isEdit) {
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleChange = (field: string, value: string | number | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const mansioni = mansioniData?.data || [];
    const isSaving = createMutation.isPending || updateMutation.isPending;

    if (isLoadingProfilo && isEdit) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/management/hr/profili')}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEdit ? 'Modifica Profilo HR' : 'Nuovo Profilo HR'}
                    </h1>
                    <p className="text-gray-600">
                        {isEdit
                            ? 'Modifica i dati del profilo HR'
                            : 'Crea un nuovo profilo HR per un dipendente'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Selezione Persona */}
                <div className="bg-white rounded-lg border p-6 space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <User className="w-5 h-5 text-violet-600" />
                        Persona
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="personTenantProfileId">Seleziona Dipendente *</Label>
                        <Input
                            value={employeeSearch}
                            onChange={(e) => setEmployeeSearch(e.target.value)}
                            placeholder="Cerca per cognome, nome, codice fiscale, email o azienda"
                            disabled={isEdit}
                        />
                        <select
                            id="personTenantProfileId"
                            value={formData.personTenantProfileId}
                            onChange={(e) => handleChange('personTenantProfileId', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            disabled={isEdit}
                            required
                        >
                            <option value="">-- Seleziona una persona --</option>
                            {availablePersons.map((p) => (
                                <option key={p.personTenantProfileId} value={p.personTenantProfileId}>
                                    {p.lastName} {p.firstName}
                                    {p.email ? ` (${p.email})` : ''}
                                    {p.company?.ragioneSociale
                                        ? ` - ${p.company.ragioneSociale}`
                                        : ''}
                                </option>
                            ))}
                        </select>
                        {availablePersons.length === 0 && (
                            <p className="text-sm text-amber-600 flex items-center gap-1">
                                <Info className="w-4 h-4" />
                                Nessuna persona disponibile. Aggiungi prima dipendenti in
                                <button
                                    type="button"
                                    onClick={() => navigate('/employees')}
                                    className="text-violet-600 underline hover:text-violet-700"
                                >
                                    Dipendenti
                                </button>
                            </p>
                        )}
                    </div>
                </div>

                {/* Mansione e Matricola */}
                <div className="bg-white rounded-lg border p-6 space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <Briefcase className="w-5 h-5 text-violet-600" />
                        Ruolo e Identificazione
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="mansioneInternaId">Mansione Interna</Label>
                            <select
                                id="mansioneInternaId"
                                value={formData.mansioneInternaId}
                                onChange={(e) => handleChange('mansioneInternaId', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            >
                                <option value="">-- Nessuna mansione --</option>
                                {mansioni.map((m: MansioneInterna) => (
                                    <option key={m.id} value={m.id}>
                                        {m.nome} ({m.areaAziendale})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="matricola">Matricola</Label>
                            <Input
                                id="matricola"
                                value={formData.matricola}
                                onChange={(e) => handleChange('matricola', e.target.value)}
                                placeholder="es. MAT001"
                            />
                        </div>
                    </div>
                </div>

                {/* Date Contratto */}
                <div className="bg-white rounded-lg border p-6 space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <Calendar className="w-5 h-5 text-violet-600" />
                        Date Contrattuali
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <DatePickerElegante
                                label="Data Assunzione"
                                value={formData.dataAssunzione ? new Date(formData.dataAssunzione) : null}
                                onChange={(date) => handleChange('dataAssunzione', date ? date.toISOString().split('T')[0] : '')}
                                theme="violet"
                                clearable
                                placeholder="Seleziona data..."
                            />
                        </div>

                        <div className="space-y-2">
                            <DatePickerElegante
                                label="Data Fine Contratto"
                                value={formData.dataFineContratto ? new Date(formData.dataFineContratto) : null}
                                onChange={(date) => handleChange('dataFineContratto', date ? date.toISOString().split('T')[0] : '')}
                                theme="violet"
                                clearable
                                placeholder="Tempo indeterminato..."
                                minDate={formData.dataAssunzione ? new Date(formData.dataAssunzione) : undefined}
                            />
                            <p className="text-xs text-gray-500">Lasciare vuoto per contratto a tempo indeterminato</p>
                        </div>
                    </div>
                </div>

                {/* Orario di Lavoro */}
                <div className="bg-white rounded-lg border p-6 space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <Clock className="w-5 h-5 text-violet-600" />
                        Orario di Lavoro
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="oreSettimanaliContrattuali">Ore/Settimana</Label>
                            <Input
                                id="oreSettimanaliContrattuali"
                                type="number"
                                min="0"
                                max="60"
                                value={formData.oreSettimanaliContrattuali}
                                onChange={(e) => handleChange('oreSettimanaliContrattuali', parseInt(e.target.value) || 0)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="oreGiornaliereStandard">Ore/Giorno</Label>
                            <Input
                                id="oreGiornaliereStandard"
                                type="number"
                                min="0"
                                max="12"
                                value={formData.oreGiornaliereStandard}
                                onChange={(e) => handleChange('oreGiornaliereStandard', parseInt(e.target.value) || 0)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pausaPranzoMinuti">Pausa (min)</Label>
                            <Input
                                id="pausaPranzoMinuti"
                                type="number"
                                min="0"
                                max="120"
                                value={formData.pausaPranzoMinuti}
                                onChange={(e) => handleChange('pausaPranzoMinuti', parseInt(e.target.value) || 0)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="flexibilityMinuti">Flessibilità (min)</Label>
                            <Input
                                id="flexibilityMinuti"
                                type="number"
                                min="0"
                                max="60"
                                value={formData.flexibilityMinuti}
                                onChange={(e) => handleChange('flexibilityMinuti', parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isTimbraturaPbligatoria}
                                onChange={(e) => handleChange('isTimbraturaPbligatoria', e.target.checked)}
                                className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                            />
                            <span className="text-sm text-gray-700">Timbratura obbligatoria</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.canAccessTimbratura}
                                onChange={(e) => handleChange('canAccessTimbratura', e.target.checked)}
                                className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                            />
                            <span className="text-sm text-gray-700">Può timbrare</span>
                        </label>
                    </div>
                </div>

                {/* Saldi Ferie/Permessi */}
                <div className="bg-white rounded-lg border p-6 space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <Wallet className="w-5 h-5 text-violet-600" />
                        Saldi Ferie e Permessi
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="saldoFerie">Ferie (giorni)</Label>
                            <Input
                                id="saldoFerie"
                                type="number"
                                min="0"
                                step="0.5"
                                value={formData.saldoFerie}
                                onChange={(e) => handleChange('saldoFerie', parseFloat(e.target.value) || 0)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="saldoPermessi">Permessi (ore)</Label>
                            <Input
                                id="saldoPermessi"
                                type="number"
                                min="0"
                                step="0.5"
                                value={formData.saldoPermessi}
                                onChange={(e) => handleChange('saldoPermessi', parseFloat(e.target.value) || 0)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="saldoROL">ROL (ore)</Label>
                            <Input
                                id="saldoROL"
                                type="number"
                                min="0"
                                step="0.5"
                                value={formData.saldoROL}
                                onChange={(e) => handleChange('saldoROL', parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </div>

                {/* Note */}
                <div className="bg-white rounded-lg border p-6 space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <Info className="w-5 h-5 text-violet-600" />
                        Note Contrattuali
                    </div>

                    <textarea
                        value={formData.noteContrattuali}
                        onChange={(e) => handleChange('noteContrattuali', e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        placeholder="Note aggiuntive sul contratto o condizioni particolari..."
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <CRUDButton
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/management/hr/profili')}
                    >
                        Annulla
                    </CRUDButton>
                    <CRUDPrimaryButton theme="violet" type="submit" disabled={isSaving}>
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Salvataggio...' : isEdit ? 'Salva Modifiche' : 'Crea Profilo'}
                    </CRUDPrimaryButton>
                </div>
            </form>
        </div>
    );
};

export default ProfiloHRFormPage;
