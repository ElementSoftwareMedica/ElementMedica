/**
 * P68 - Mansioni Interne Page
 * Gestione delle mansioni/ruoli interni all'azienda
 * Include definizione fabbisogno personale per turno
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Briefcase, Users, Clock, Eye } from 'lucide-react';
import { CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { ActionButton } from '@/components/ui/ActionButton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/services/api';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ResizableTable from '@/components/shared/ResizableTable';
import { useToast } from '@/hooks/useToast';
import { useTenantFilter } from '@/context/TenantFilterContext';
import {
    mansioniInterneApi,
    MansioneInterna,
    AreaAziendale,
    AREA_AZIENDALE_LABELS,
} from './api';

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

const MansioniInternePage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [filterArea, setFilterArea] = useState<AreaAziendale | 'ALL'>('ALL');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMansione, setEditingMansione] = useState<MansioneInterna | null>(null);

    // P69 Session 5.10: Add tenant filter to prevent cross-tenant data leakage
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    const [formData, setFormData] = useState({
        nome: '',
        descrizione: '',
        areaAziendale: 'ALTRO' as AreaAziendale,
        livelloGerarchico: 1,
        oreMinimeSettimanali: '',
        oreMassimeSettimanali: '',
        sigla: '', // Sigla breve per calendario (es. FO, AM, ES)
        colore: '#6366f1', // Colore per UI
        defaultRoleId: '', // P68: Ruolo di default per questa mansione
        // Fabbisogno personale per turno
        fabbisognoMattina: 0,
        fabbisognoPomeriggio: 0,
        fabbisognoSera: 0,
    });

    // P68: Carica tutti i ruoli (system + custom) per l'associazione mansione-ruolo
    // P69: Solo CustomRole (FK defaultRoleId punta a custom_roles)
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

    // P69 Session 5.10: Add tenant filter to mansioni query
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['hr', 'mansioni', tenantFilterKey, { filterArea }],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            const params: Record<string, unknown> = {};
            if (filterArea !== 'ALL') {
                params.areaAziendale = filterArea;
            }
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            if (tenantParams.allTenants) {
                params.allTenants = true;
            }
            return mansioniInterneApi.list(Object.keys(params).length > 0 ? params : undefined);
        },
        enabled: isReady,
    });

    const createMutation = useMutation({
        mutationFn: mansioniInterneApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'mansioni'] });
            refetch();
            showToast({ message: 'Mansione creata e salvata', type: 'success' });
            handleCloseDialog();
        },
        onError: () => {
            showToast({ message: 'Impossibile salvare la mansione', type: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<MansioneInterna> }) =>
            mansioniInterneApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'mansioni'] });
            refetch();
            showToast({ message: 'Mansione aggiornata', type: 'success' });
            handleCloseDialog();
        },
        onError: () => {
            showToast({ message: 'Impossibile aggiornare la mansione', type: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            mansioniInterneApi.delete(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'mansioni'] });
            refetch();
            showToast({ message: 'Mansione eliminata', type: 'success' });
        },
        onError: () => {
            showToast({ message: 'Impossibile eliminare la mansione', type: 'error' });
        },
    });

    const handleOpenCreate = () => {
        setEditingMansione(null);
        setFormData({
            nome: '',
            descrizione: '',
            areaAziendale: 'ALTRO',
            livelloGerarchico: 1,
            oreMinimeSettimanali: '',
            oreMassimeSettimanali: '',
            sigla: '',
            colore: '#6366f1',
            defaultRoleId: '',
            fabbisognoMattina: 0,
            fabbisognoPomeriggio: 0,
            fabbisognoSera: 0,
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (mansione: MansioneInterna) => {
        setEditingMansione(mansione);
        const requisiti = mansione.requisitiMinimi as { fabbisognoMattina?: number; fabbisognoPomeriggio?: number; fabbisognoSera?: number } | undefined;
        setFormData({
            nome: mansione.nome,
            descrizione: mansione.descrizione ?? '',
            areaAziendale: mansione.areaAziendale,
            livelloGerarchico: mansione.livelloGerarchico,
            oreMinimeSettimanali: mansione.oreMinimeSettimanali?.toString() ?? '',
            oreMassimeSettimanali: mansione.oreMassimeSettimanali?.toString() ?? '',
            sigla: mansione.sigla ?? '',
            colore: mansione.colore ?? '#6366f1',
            defaultRoleId: mansione.defaultRoleId ?? '',
            fabbisognoMattina: requisiti?.fabbisognoMattina ?? 0,
            fabbisognoPomeriggio: requisiti?.fabbisognoPomeriggio ?? 0,
            fabbisognoSera: requisiti?.fabbisognoSera ?? 0,
        });
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingMansione(null);
    };

    const handleSubmit = () => {
        if (!formData.nome.trim()) {
            showToast({ message: 'Il nome è obbligatorio', type: 'error' });
            return;
        }

        const payload = {
            nome: formData.nome.trim(),
            descrizione: formData.descrizione.trim() || undefined,
            areaAziendale: formData.areaAziendale,
            livelloGerarchico: formData.livelloGerarchico,
            oreMinimeSettimanali: formData.oreMinimeSettimanali ? parseFloat(formData.oreMinimeSettimanali) : undefined,
            oreMassimeSettimanali: formData.oreMassimeSettimanali ? parseFloat(formData.oreMassimeSettimanali) : undefined,
            sigla: formData.sigla.trim().toUpperCase() || undefined,
            colore: formData.colore || undefined,
            defaultRoleId: formData.defaultRoleId || undefined,
            requisitiMinimi: {
                fabbisognoMattina: formData.fabbisognoMattina,
                fabbisognoPomeriggio: formData.fabbisognoPomeriggio,
                fabbisognoSera: formData.fabbisognoSera,
            },
        };

        if (editingMansione) {
            updateMutation.mutate({ id: editingMansione.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleDelete = (mansione: MansioneInterna) => {
        const reason = prompt('Motivo eliminazione (min 10 caratteri):');
        if (reason && reason.length >= 10) {
            deleteMutation.mutate({ id: mansione.id, reason });
        } else if (reason) {
            showToast({ message: 'Il motivo deve avere almeno 10 caratteri', type: 'error' });
        }
    };

    const mansioni = data?.data ?? [];
    const filteredMansioni = mansioni.filter(m =>
        m.nome.toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        {
            key: 'nome',
            label: 'Mansione',
            width: 200,
            renderCell: (row: MansioneInterna) => (
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: row.colore || '#6366f1' }}
                    >
                        {row.sigla || <Briefcase className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{row.nome}</p>
                        {row.descrizione && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{row.descrizione}</p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'area',
            label: 'Area',
            width: 150,
            renderCell: (row: MansioneInterna) => (
                <Badge className={AREA_COLORS[row.areaAziendale]}>
                    {AREA_AZIENDALE_LABELS[row.areaAziendale]}
                </Badge>
            ),
        },
        {
            key: 'livello',
            label: 'Livello',
            renderCell: (row: MansioneInterna) => (
                <span className="text-gray-600">Liv. {row.livelloGerarchico}</span>
            ),
        },
        {
            key: 'ore',
            label: 'Ore Settimanali',
            renderCell: (row: MansioneInterna) => (
                <span className="text-gray-600">
                    {row.oreMinimeSettimanali && row.oreMassimeSettimanali
                        ? `${row.oreMinimeSettimanali} - ${row.oreMassimeSettimanali}h`
                        : row.oreMinimeSettimanali
                            ? `Min ${row.oreMinimeSettimanali}h`
                            : row.oreMassimeSettimanali
                                ? `Max ${row.oreMassimeSettimanali}h`
                                : '-'}
                </span>
            ),
        },
        {
            key: 'fabbisogno',
            label: 'Fabbisogno/Turno',
            renderCell: (row: MansioneInterna) => {
                const requisiti = row.requisitiMinimi as { fabbisognoMattina?: number; fabbisognoPomeriggio?: number; fabbisognoSera?: number } | undefined;
                if (!requisiti || (!requisiti.fabbisognoMattina && !requisiti.fabbisognoPomeriggio && !requisiti.fabbisognoSera)) {
                    return <span className="text-gray-400">-</span>;
                }
                return (
                    <div className="flex items-center gap-2 text-xs">
                        {requisiti.fabbisognoMattina ? (
                            <Badge className="bg-yellow-100 text-yellow-700">M: {requisiti.fabbisognoMattina}</Badge>
                        ) : null}
                        {requisiti.fabbisognoPomeriggio ? (
                            <Badge className="bg-orange-100 text-orange-700">P: {requisiti.fabbisognoPomeriggio}</Badge>
                        ) : null}
                        {requisiti.fabbisognoSera ? (
                            <Badge className="bg-indigo-100 text-indigo-700">S: {requisiti.fabbisognoSera}</Badge>
                        ) : null}
                    </div>
                );
            },
        },
        {
            key: 'stato',
            label: 'Stato',
            renderCell: (row: MansioneInterna) => (
                <Badge variant={row.isActive ? 'default' : 'secondary'}>
                    {row.isActive ? 'Attiva' : 'Inattiva'}
                </Badge>
            ),
        },
        {
            key: 'azioni',
            label: '',
            renderCell: (row: MansioneInterna) => (
                <ActionButton
                    theme="violet"
                    actions={[
                        {
                            label: 'Visualizza',
                            icon: <Eye className="w-4 h-4" />,
                            onClick: () => handleOpenEdit(row),
                        },
                        {
                            label: 'Modifica',
                            icon: <Edit className="w-4 h-4" />,
                            onClick: () => handleOpenEdit(row),
                        },
                        {
                            label: 'Elimina',
                            icon: <Trash2 className="w-4 h-4" />,
                            variant: 'danger',
                            onClick: () => handleDelete(row),
                        },
                    ]}
                />
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mansioni Interne</h1>
                    <p className="text-gray-600">Definizione ruoli e responsabilità</p>
                </div>
                <CRUDPrimaryButton theme="violet" onClick={handleOpenCreate}>
                    <Plus className="w-4 h-4" />
                    Nuova Mansione
                </CRUDPrimaryButton>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Cerca mansione..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={filterArea} onValueChange={(v) => setFilterArea(v as AreaAziendale | 'ALL')}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Tutte le aree" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tutte le aree</SelectItem>
                        {Object.entries(AREA_AZIENDALE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <ResizableTable
                columns={columns}
                data={filteredMansioni}
                onRowClick={(row) => navigate(`/management/hr/mansioni/${row.id}`)}
            />

            {/* Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingMansione ? 'Modifica Mansione' : 'Nuova Mansione'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Nome *</Label>
                            <Input
                                value={formData.nome}
                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                placeholder="es. Responsabile Amministrativo"
                            />
                        </div>
                        <div>
                            <Label>Descrizione</Label>
                            <Textarea
                                value={formData.descrizione}
                                onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                                placeholder="Descrizione del ruolo..."
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Area Aziendale</Label>
                                <Select
                                    value={formData.areaAziendale}
                                    onValueChange={(v) => setFormData({ ...formData, areaAziendale: v as AreaAziendale })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(AREA_AZIENDALE_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Livello Gerarchico</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={formData.livelloGerarchico}
                                    onChange={(e) => setFormData({ ...formData, livelloGerarchico: parseInt(e.target.value) || 1 })}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    1 = più alto (es. Direttore), 10 = più basso (es. Stagista)
                                </p>
                            </div>
                        </div>

                        {/* Sigla e Colore per calendario */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Sigla Calendario</Label>
                                <Input
                                    value={formData.sigla}
                                    onChange={(e) => setFormData({ ...formData, sigla: e.target.value.slice(0, 5) })}
                                    placeholder="es. FO, AM, ES"
                                    maxLength={5}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Sigla breve (max 5 caratteri) per il calendario turni
                                </p>
                            </div>
                            <div>
                                <Label>Colore</Label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={formData.colore}
                                        onChange={(e) => setFormData({ ...formData, colore: e.target.value })}
                                        className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                                    />
                                    <Input
                                        value={formData.colore}
                                        onChange={(e) => setFormData({ ...formData, colore: e.target.value })}
                                        placeholder="#6366f1"
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* P68: Ruolo di default per questa mansione */}
                        <div>
                            <Label>Ruolo di Default</Label>
                            <Select
                                value={formData.defaultRoleId || '_none'}
                                onValueChange={(v) => setFormData({ ...formData, defaultRoleId: v === '_none' ? '' : v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona ruolo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none">Nessun ruolo</SelectItem>
                                    {allRoles.length === 0 ? (
                                        <SelectItem value="_loading">Caricamento ruoli...</SelectItem>
                                    ) : (
                                        allRoles.map((role: { id: string; displayName?: string; name: string }) => (
                                            <SelectItem key={role.id} value={role.id}>
                                                {role.displayName || role.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                                Chi ha questa mansione erediterà i permessi del ruolo selezionato
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Ore Min. Settimanali</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={formData.oreMinimeSettimanali}
                                    onChange={(e) => setFormData({ ...formData, oreMinimeSettimanali: e.target.value })}
                                    placeholder="es. 20"
                                />
                            </div>
                            <div>
                                <Label>Ore Max. Settimanali</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={formData.oreMassimeSettimanali}
                                    onChange={(e) => setFormData({ ...formData, oreMassimeSettimanali: e.target.value })}
                                    placeholder="es. 40"
                                />
                            </div>
                        </div>

                        {/* Fabbisogno personale per turno */}
                        <div className="border-t pt-4 mt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="w-4 h-4 text-violet-500" />
                                <Label className="text-base font-medium">Fabbisogno Personale per Turno</Label>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">
                                Indica quante persone con questa mansione sono necessarie per ogni turno
                            </p>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label className="flex items-center gap-1">
                                        <span className="w-3 h-3 rounded bg-yellow-400"></span>
                                        Mattina
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.fabbisognoMattina}
                                        onChange={(e) => setFormData({ ...formData, fabbisognoMattina: parseInt(e.target.value) || 0 })}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <Label className="flex items-center gap-1">
                                        <span className="w-3 h-3 rounded bg-orange-400"></span>
                                        Pomeriggio
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.fabbisognoPomeriggio}
                                        onChange={(e) => setFormData({ ...formData, fabbisognoPomeriggio: parseInt(e.target.value) || 0 })}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <Label className="flex items-center gap-1">
                                        <span className="w-3 h-3 rounded bg-indigo-400"></span>
                                        Sera
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.fabbisognoSera}
                                        onChange={(e) => setFormData({ ...formData, fabbisognoSera: parseInt(e.target.value) || 0 })}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <CRUDPrimaryButton
                            theme="violet"
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {createMutation.isPending || updateMutation.isPending ? 'Salvataggio...' : 'Salva'}
                        </CRUDPrimaryButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MansioniInternePage;
