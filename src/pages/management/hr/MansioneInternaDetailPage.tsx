/**
 * P68 - MansioneInterna Detail Page v2
 * Pagina dettaglio mansione con editing completo di tutti i campi:
 * - Informazioni generali (nome, descrizione, sigla, colore, area, livello)
 * - Orario settimanale (ore min/max)
 * - Fabbisogno per turno (mattina, pomeriggio, sera)
 * - Ruolo di default e permessi
 * - Lista dipendenti con questa mansione
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Save,
    Briefcase,
    Edit,
    Users,
    Clock,
    Trash2,
    AlertCircle,
    Loader2,
    Settings,
    Shield,
    Palette,
    Hash,
} from 'lucide-react';
import { CRUDPrimaryButton, CRUDButton } from '@/components/shared/CRUDButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { apiGet } from '@/services/api';
import {
    mansioniInterneApi,
    type MansioneInterna,
    type AreaAziendale,
    AREA_AZIENDALE_LABELS
} from './api';

// Area colors
const AREA_COLORS: Record<AreaAziendale, string> = {
    DIREZIONE: 'bg-violet-100 text-violet-700',
    AMMINISTRAZIONE: 'bg-blue-100 text-blue-700',
    CLINICA: 'bg-teal-100 text-teal-700',
    FORMAZIONE: 'bg-amber-100 text-amber-700',
    MEDICINA_LAVORO: 'bg-emerald-100 text-emerald-700',
    SEGRETERIA: 'bg-pink-100 text-pink-700',
    MARKETING: 'bg-orange-100 text-orange-700',
    ALTRO: 'bg-gray-100 text-gray-700',
};

interface FormState {
    nome: string;
    descrizione: string;
    sigla: string;
    colore: string;
    areaAziendale: AreaAziendale;
    livelloGerarchico: number;
    oreMinimeSettimanali: string;
    oreMassimeSettimanali: string;
    fabbisognoMattina: number;
    fabbisognoPomeriggio: number;
    fabbisognoSera: number;
    defaultRoleId: string;
    isActive: boolean;
}

const MansioneInternaDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<FormState>({
        nome: '',
        descrizione: '',
        sigla: '',
        colore: '#6366f1',
        areaAziendale: 'ALTRO',
        livelloGerarchico: 1,
        oreMinimeSettimanali: '',
        oreMassimeSettimanali: '',
        fabbisognoMattina: 0,
        fabbisognoPomeriggio: 0,
        fabbisognoSera: 0,
        defaultRoleId: '',
        isActive: true,
    });

    // Query: mansione data
    const { data: mansioneResponse, isLoading, error } = useQuery({
        queryKey: ['hr', 'mansioni', id],
        queryFn: () => mansioniInterneApi.get(id!),
        enabled: !!id,
    });

    const mansione = mansioneResponse?.data;

    // Query: custom roles for defaultRole dropdown (FK punta a CustomRole)
    const { data: rolesData } = useQuery({
        queryKey: ['roles', 'custom-for-mansioni'],
        queryFn: async () => {
            const result = await apiGet<{ data: Array<{ id: string; name: string; displayName?: string }> }>('/api/v1/roles/custom').catch(() => ({ data: [] }));
            return {
                data: (result?.data || []).map((r) => ({
                    id: r.id,
                    name: r.name,
                    displayName: r.displayName || r.name.replace(/_/g, ' ')
                }))
            };
        }
    });
    const allRoles = rolesData?.data ?? [];

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) => mansioniInterneApi.update(id!, data as Partial<MansioneInterna>),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'mansioni'] });
            setIsEditing(false);
            showToast({ message: 'Mansione aggiornata con successo', type: 'success' });
        },
        onError: (err: Error) => {
            showToast({ message: 'Errore aggiornamento', type: 'error' });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (reason: string) => mansioniInterneApi.delete(id!, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'mansioni'] });
            showToast({ message: 'Mansione eliminata', type: 'success' });
            navigate('/management/hr/mansioni');
        },
        onError: (err: Error) => {
            showToast({ message: 'Errore eliminazione', type: 'error' });
        },
    });

    // Initialize form when mansione loads
    useEffect(() => {
        if (mansione) {
            const requisiti = mansione.requisitiMinimi as {
                fabbisognoMattina?: number;
                fabbisognoPomeriggio?: number;
                fabbisognoSera?: number;
            } | undefined;
            setFormData({
                nome: mansione.nome,
                descrizione: mansione.descrizione ?? '',
                sigla: mansione.sigla ?? '',
                colore: mansione.colore ?? '#6366f1',
                areaAziendale: mansione.areaAziendale,
                livelloGerarchico: mansione.livelloGerarchico,
                oreMinimeSettimanali: mansione.oreMinimeSettimanali?.toString() ?? '',
                oreMassimeSettimanali: mansione.oreMassimeSettimanali?.toString() ?? '',
                fabbisognoMattina: requisiti?.fabbisognoMattina ?? 0,
                fabbisognoPomeriggio: requisiti?.fabbisognoPomeriggio ?? 0,
                fabbisognoSera: requisiti?.fabbisognoSera ?? 0,
                defaultRoleId: mansione.defaultRoleId ?? '',
                isActive: mansione.isActive,
            });
        }
    }, [mansione]);

    const handleEdit = () => setIsEditing(true);

    const handleSave = () => {
        if (!formData.nome.trim()) {
            showToast({ message: 'Il nome è obbligatorio', type: 'error' });
            return;
        }

        const payload: Record<string, unknown> = {
            nome: formData.nome.trim(),
            descrizione: formData.descrizione.trim() || undefined,
            areaAziendale: formData.areaAziendale,
            livelloGerarchico: formData.livelloGerarchico,
            oreMinimeSettimanali: formData.oreMinimeSettimanali ? parseFloat(formData.oreMinimeSettimanali) : undefined,
            oreMassimeSettimanali: formData.oreMassimeSettimanali ? parseFloat(formData.oreMassimeSettimanali) : undefined,
            sigla: formData.sigla.trim().toUpperCase() || undefined,
            colore: formData.colore || undefined,
            defaultRoleId: formData.defaultRoleId || undefined,
            isActive: formData.isActive,
            requisitiMinimi: {
                fabbisognoMattina: formData.fabbisognoMattina,
                fabbisognoPomeriggio: formData.fabbisognoPomeriggio,
                fabbisognoSera: formData.fabbisognoSera,
            },
        };

        updateMutation.mutate(payload);
    };

    const handleDelete = () => {
        const reason = prompt('Motivo eliminazione (min 10 caratteri):');
        if (reason && reason.length >= 10) {
            deleteMutation.mutate(reason);
        } else if (reason) {
            showToast({ message: 'Il motivo deve avere almeno 10 caratteri', type: 'error' });
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        // Reset form to original values
        if (mansione) {
            const requisiti = mansione.requisitiMinimi as {
                fabbisognoMattina?: number;
                fabbisognoPomeriggio?: number;
                fabbisognoSera?: number;
            } | undefined;
            setFormData({
                nome: mansione.nome,
                descrizione: mansione.descrizione ?? '',
                sigla: mansione.sigla ?? '',
                colore: mansione.colore ?? '#6366f1',
                areaAziendale: mansione.areaAziendale,
                livelloGerarchico: mansione.livelloGerarchico,
                oreMinimeSettimanali: mansione.oreMinimeSettimanali?.toString() ?? '',
                oreMassimeSettimanali: mansione.oreMassimeSettimanali?.toString() ?? '',
                fabbisognoMattina: requisiti?.fabbisognoMattina ?? 0,
                fabbisognoPomeriggio: requisiti?.fabbisognoPomeriggio ?? 0,
                fabbisognoSera: requisiti?.fabbisognoSera ?? 0,
                defaultRoleId: mansione.defaultRoleId ?? '',
                isActive: mansione.isActive,
            });
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                <span className="ml-2 text-gray-600">Caricamento...</span>
            </div>
        );
    }

    // Error state
    if (error || !mansione) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Mansione non trovata</h3>
                <button
                    onClick={() => navigate('/management/hr/mansioni')}
                    className="text-violet-600 hover:underline"
                >
                    Torna alla lista
                </button>
            </div>
        );
    }

    // Dipendenti con questa mansione
    const dipendenti = (mansione as MansioneInterna & {
        profiliHR?: Array<{
            id: string;
            personTenantProfile?: {
                person?: { id: string; firstName: string; lastName: string };
            };
        }>;
    }).profiliHR || [];

    return (
        <div className="space-y-6 max-w-5xl">
            {/* ============================================================ */}
            {/* HEADER                                                       */}
            {/* ============================================================ */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/management/hr/mansioni')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Torna alla lista"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
                            style={{ backgroundColor: isEditing ? formData.colore : (mansione.colore || '#6366f1') }}
                        >
                            {(isEditing ? formData.sigla : mansione.sigla) || <Briefcase className="w-6 h-6" />}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {isEditing ? formData.nome || 'Nuova Mansione' : mansione.nome}
                            </h1>
                            <Badge className={AREA_COLORS[isEditing ? formData.areaAziendale : mansione.areaAziendale]}>
                                {AREA_AZIENDALE_LABELS[isEditing ? formData.areaAziendale : mansione.areaAziendale]}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Action buttons - ALWAYS VISIBLE */}
                <div className="flex items-center gap-2">
                    {!isEditing ? (
                        <>
                            <CRUDButton onClick={handleEdit} variant="secondary">
                                <Edit className="w-4 h-4" />
                                Modifica
                            </CRUDButton>
                            <CRUDButton onClick={handleDelete} variant="danger">
                                <Trash2 className="w-4 h-4" />
                                Elimina
                            </CRUDButton>
                        </>
                    ) : (
                        <>
                            <CRUDButton onClick={handleCancel} variant="outline">
                                Annulla
                            </CRUDButton>
                            <CRUDPrimaryButton
                                theme="violet"
                                onClick={handleSave}
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Salva Modifiche
                            </CRUDPrimaryButton>
                        </>
                    )}
                </div>
            </div>

            {/* ============================================================ */}
            {/* CONTENT GRID                                                 */}
            {/* ============================================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ====== COLONNA SINISTRA: Info Generali ====== */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Card: Informazioni Generali */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-violet-600" />
                            Informazioni Generali
                        </h2>

                        {isEditing ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="nome">Nome Mansione *</Label>
                                        <Input
                                            id="nome"
                                            value={formData.nome}
                                            onChange={(e) => setFormData(f => ({ ...f, nome: e.target.value }))}
                                            placeholder="es. Responsabile Amministrativo"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="areaAziendale">Area Aziendale</Label>
                                        <Select
                                            value={formData.areaAziendale}
                                            onValueChange={(v) => setFormData(f => ({ ...f, areaAziendale: v as AreaAziendale }))}
                                        >
                                            <SelectTrigger id="areaAziendale">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(AREA_AZIENDALE_LABELS).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="descrizione">Descrizione</Label>
                                    <Textarea
                                        id="descrizione"
                                        value={formData.descrizione}
                                        onChange={(e) => setFormData(f => ({ ...f, descrizione: e.target.value }))}
                                        placeholder="Descrizione del ruolo e responsabilità..."
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <Label htmlFor="sigla">
                                            <Hash className="w-3 h-3 inline-block mr-1" />
                                            Sigla
                                        </Label>
                                        <Input
                                            id="sigla"
                                            value={formData.sigla}
                                            onChange={(e) => setFormData(f => ({ ...f, sigla: e.target.value.slice(0, 5) }))}
                                            placeholder="FO"
                                            maxLength={5}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="colore">
                                            <Palette className="w-3 h-3 inline-block mr-1" />
                                            Colore
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={formData.colore}
                                                onChange={(e) => setFormData(f => ({ ...f, colore: e.target.value }))}
                                                className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                                            />
                                            <Input
                                                value={formData.colore}
                                                onChange={(e) => setFormData(f => ({ ...f, colore: e.target.value }))}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="livello">Livello</Label>
                                        <Input
                                            id="livello"
                                            type="number"
                                            min={1}
                                            max={10}
                                            value={formData.livelloGerarchico}
                                            onChange={(e) => setFormData(f => ({ ...f, livelloGerarchico: parseInt(e.target.value) || 1 }))}
                                        />
                                        <p className="text-[10px] text-gray-500 mt-0.5">1=Direttore, 10=Stagista</p>
                                    </div>
                                    <div>
                                        <Label>Stato</Label>
                                        <Select
                                            value={formData.isActive ? 'true' : 'false'}
                                            onValueChange={(v) => setFormData(f => ({ ...f, isActive: v === 'true' }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">Attiva</SelectItem>
                                                <SelectItem value="false">Inattiva</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Sigla</p>
                                        <p className="font-medium text-gray-900">{mansione.sigla || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Livello</p>
                                        <p className="font-medium text-gray-900">Liv. {mansione.livelloGerarchico}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Colore</p>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded border border-gray-200"
                                                style={{ backgroundColor: mansione.colore || '#6366f1' }}
                                            />
                                            <span className="text-sm text-gray-600">{mansione.colore || '#6366f1'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Stato</p>
                                        <Badge variant={mansione.isActive ? 'default' : 'secondary'}>
                                            {mansione.isActive ? 'Attiva' : 'Inattiva'}
                                        </Badge>
                                    </div>
                                </div>
                                {mansione.descrizione && (
                                    <div>
                                        <p className="text-sm text-gray-500">Descrizione</p>
                                        <p className="text-gray-900 whitespace-pre-wrap">{mansione.descrizione}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Card: Orario e Turni */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-violet-600" />
                            Orario Settimanale
                        </h2>

                        {isEditing ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="oreMin">Ore Min. Settimanali</Label>
                                    <Input
                                        id="oreMin"
                                        type="number"
                                        step="0.5"
                                        value={formData.oreMinimeSettimanali}
                                        onChange={(e) => setFormData(f => ({ ...f, oreMinimeSettimanali: e.target.value }))}
                                        placeholder="es. 20"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="oreMax">Ore Max. Settimanali</Label>
                                    <Input
                                        id="oreMax"
                                        type="number"
                                        step="0.5"
                                        value={formData.oreMassimeSettimanali}
                                        onChange={(e) => setFormData(f => ({ ...f, oreMassimeSettimanali: e.target.value }))}
                                        placeholder="es. 40"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Min. Settimanali</p>
                                    <p className="font-medium text-gray-900">{mansione.oreMinimeSettimanali ? `${mansione.oreMinimeSettimanali}h` : '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Max. Settimanali</p>
                                    <p className="font-medium text-gray-900">{mansione.oreMassimeSettimanali ? `${mansione.oreMassimeSettimanali}h` : '-'}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Card: Fabbisogno per Turno */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-violet-600" />
                            Fabbisogno Personale per Turno
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Quante persone con questa mansione servono per ogni fascia oraria
                        </p>

                        {isEditing ? (
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label className="flex items-center gap-1">
                                        <span className="w-3 h-3 rounded bg-yellow-400 inline-block"></span>
                                        Mattina
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.fabbisognoMattina}
                                        onChange={(e) => setFormData(f => ({ ...f, fabbisognoMattina: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div>
                                    <Label className="flex items-center gap-1">
                                        <span className="w-3 h-3 rounded bg-orange-400 inline-block"></span>
                                        Pomeriggio
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.fabbisognoPomeriggio}
                                        onChange={(e) => setFormData(f => ({ ...f, fabbisognoPomeriggio: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div>
                                    <Label className="flex items-center gap-1">
                                        <span className="w-3 h-3 rounded bg-indigo-400 inline-block"></span>
                                        Sera
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.fabbisognoSera}
                                        onChange={(e) => setFormData(f => ({ ...f, fabbisognoSera: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                            </div>
                        ) : (
                            (() => {
                                const requisiti = mansione.requisitiMinimi as {
                                    fabbisognoMattina?: number;
                                    fabbisognoPomeriggio?: number;
                                    fabbisognoSera?: number;
                                } | undefined;
                                return (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                            <div className="text-2xl font-bold text-yellow-700">
                                                {requisiti?.fabbisognoMattina ?? 0}
                                            </div>
                                            <p className="text-sm text-yellow-600">Mattina</p>
                                        </div>
                                        <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                                            <div className="text-2xl font-bold text-orange-700">
                                                {requisiti?.fabbisognoPomeriggio ?? 0}
                                            </div>
                                            <p className="text-sm text-orange-600">Pomeriggio</p>
                                        </div>
                                        <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                                            <div className="text-2xl font-bold text-indigo-700">
                                                {requisiti?.fabbisognoSera ?? 0}
                                            </div>
                                            <p className="text-sm text-indigo-600">Sera</p>
                                        </div>
                                    </div>
                                );
                            })()
                        )}
                    </div>
                </div>

                {/* ====== COLONNA DESTRA: Sidebar ====== */}
                <div className="space-y-6">

                    {/* Card: Ruolo di Default */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-violet-600" />
                            Ruolo Permessi
                        </h3>

                        {isEditing ? (
                            <div>
                                <Label>Ruolo di Default</Label>
                                <Select
                                    value={formData.defaultRoleId || '_none'}
                                    onValueChange={(v) => setFormData(f => ({ ...f, defaultRoleId: v === '_none' ? '' : v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona ruolo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">Nessun ruolo</SelectItem>
                                        {allRoles.map((role) => (
                                            <SelectItem key={role.id} value={role.id}>
                                                {role.displayName || role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 mt-2">
                                    Chi ha questa mansione erediterà automaticamente i permessi del ruolo selezionato
                                </p>
                            </div>
                        ) : (
                            <div>
                                {mansione.defaultRole ? (
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-violet-100 text-violet-700">
                                            {mansione.defaultRole.displayName || mansione.defaultRole.name}
                                        </Badge>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Nessun ruolo assegnato</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Card: Dipendenti */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-violet-600" />
                            Dipendenti ({dipendenti.length})
                        </h3>
                        {dipendenti.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">Nessun dipendente con questa mansione</p>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {dipendenti.map((d) => (
                                    <div
                                        key={d.id}
                                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                        onClick={() => navigate(`/management/hr/personale/${d.id}`)}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold">
                                            {d.personTenantProfile?.person?.lastName?.charAt(0) || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {d.personTenantProfile?.person?.lastName} {d.personTenantProfile?.person?.firstName}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Card: Metadata */}
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                        <div className="text-xs text-gray-500 space-y-1">
                            <p>ID: <span className="font-mono">{mansione.id?.substring(0, 8)}...</span></p>
                            <p>Creato: {new Date(mansione.createdAt).toLocaleDateString('it-IT', {
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}</p>
                            {mansione.updatedAt && (
                                <p>Aggiornato: {new Date(mansione.updatedAt).toLocaleDateString('it-IT', {
                                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MansioneInternaDetailPage;
