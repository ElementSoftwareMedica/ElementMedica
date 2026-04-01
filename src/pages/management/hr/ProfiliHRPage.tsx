/**
 * P68 - Profili HR Page
 * Lista e gestione dei profili HR del personale
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Clock, Eye } from 'lucide-react';
import { CRUDPrimaryButton, CRUDButton } from '@/components/shared/CRUDButton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ResizableTable from '@/components/shared/ResizableTable';
import { useToast } from '@/hooks/useToast';
import { ActionButton } from '@/components/ui/ActionButton';
import { useTenantFilter } from '@/context/TenantFilterContext';
import {
    profiliHRApi,
    ProfiloHR,
    TIPO_CONTRATTO_LABELS,
    TIPO_COLLABORATORE_LABELS,
} from './api';

const ProfiliHRPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    // P69 Session 5.10: Add tenant filter to prevent cross-tenant data leakage
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    const { data, isLoading } = useQuery({
        queryKey: ['hr', 'profili', tenantFilterKey, { page, limit: 20 }],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            const params: Record<string, unknown> = { page, limit: 20 };
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            if (tenantParams.allTenants) {
                params.allTenants = true;
            }
            return profiliHRApi.list(params);
        },
        enabled: isReady,
    });

    const deleteMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            profiliHRApi.delete(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'profili'] });
            showToast({
                message: 'Profilo HR eliminato correttamente',
                type: 'success',
            });
        },
        onError: () => {
            showToast({
                message: 'Impossibile eliminare il profilo',
                type: 'error',
            });
        },
    });

    const handleDelete = (profilo: ProfiloHR) => {
        const reason = prompt('Motivo eliminazione (min 10 caratteri):');
        if (reason && reason.length >= 10) {
            deleteMutation.mutate({ id: profilo.id, reason });
        } else if (reason) {
            showToast({
                message: 'Il motivo deve avere almeno 10 caratteri',
                type: 'error',
            });
        }
    };

    const profili = data?.data ?? [];
    const filteredProfili = profili.filter(p => {
        const fullName = `${p.personTenantProfile?.person?.firstName} ${p.personTenantProfile?.person?.lastName}`.toLowerCase();
        return fullName.includes(search.toLowerCase());
    });

    const columns = [
        {
            key: 'persona',
            label: 'Persona',
            renderCell: (row: ProfiloHR) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {row.personTenantProfile?.person?.firstName?.[0]}
                        {row.personTenantProfile?.person?.lastName?.[0]}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">
                            {row.personTenantProfile?.person?.firstName} {row.personTenantProfile?.person?.lastName}
                        </p>
                        {row.matricola && (
                            <p className="text-xs text-gray-500">Mat. {row.matricola}</p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'mansione',
            label: 'Mansione',
            renderCell: (row: ProfiloHR) => (
                <span className="text-gray-700">
                    {row.mansioneInterna?.nome ?? '-'}
                </span>
            ),
        },
        {
            key: 'contratto',
            label: 'Contratto',
            renderCell: (row: ProfiloHR) => {
                const tipoContratto = row.personTenantProfile?.tipoContratto;
                return tipoContratto ? (
                    <Badge variant="outline">
                        {TIPO_CONTRATTO_LABELS[tipoContratto]}
                    </Badge>
                ) : (
                    <span className="text-gray-400">-</span>
                );
            },
        },
        {
            key: 'tipoCollaboratore',
            label: 'Tipo',
            renderCell: (row: ProfiloHR) => {
                const tipo = row.personTenantProfile?.tipoCollaboratore;
                return tipo ? (
                    <span className="text-gray-600">
                        {TIPO_COLLABORATORE_LABELS[tipo]}
                    </span>
                ) : (
                    <span className="text-gray-400">-</span>
                );
            },
        },
        {
            key: 'ore',
            label: 'Ore/Sett.',
            renderCell: (row: ProfiloHR) => (
                <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{row.oreSettimanaliContrattuali}h</span>
                </div>
            ),
        },
        {
            key: 'saldi',
            label: 'Ferie/Permessi',
            renderCell: (row: ProfiloHR) => (
                <div className="text-sm">
                    <span className="text-emerald-600">{row.saldoFerie}g ferie</span>
                    <span className="text-gray-400 mx-1">|</span>
                    <span className="text-blue-600">{row.saldoPermessi}h perm.</span>
                </div>
            ),
        },
        {
            key: 'stato',
            label: 'Stato',
            renderCell: (row: ProfiloHR) => (
                <Badge variant={row.isActive ? 'default' : 'secondary'}>
                    {row.isActive ? 'Attivo' : 'Inattivo'}
                </Badge>
            ),
        },
        {
            key: 'azioni',
            label: '',
            renderCell: (row: ProfiloHR) => (
                <ActionButton
                    theme="violet"
                    actions={[
                        {
                            label: 'Visualizza',
                            icon: <Eye className="w-4 h-4" />,
                            onClick: () => navigate(`/management/hr/profili/${row.id}`),
                        },
                        {
                            label: 'Modifica',
                            icon: <Edit className="w-4 h-4" />,
                            onClick: () => navigate(`/management/hr/profili/${row.id}?mode=edit`),
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
                    <h1 className="text-2xl font-bold text-gray-900">Profili HR</h1>
                    <p className="text-gray-600">Gestione profili lavorativi del personale</p>
                </div>
                <CRUDPrimaryButton
                    theme="violet"
                    onClick={() => navigate('/management/hr/profili/nuovo')}
                >
                    <Plus className="w-4 h-4" />
                    Nuovo Profilo
                </CRUDPrimaryButton>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Cerca per nome..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Table */}
            <ResizableTable
                columns={columns}
                data={filteredProfili}
                onRowClick={(row) => navigate(`/management/hr/profili/${row.id}`)}
            />

            {/* Pagination */}
            {data?.pagination && data.pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <CRUDButton
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Precedente
                    </CRUDButton>
                    <span className="text-sm text-gray-600">
                        Pagina {page} di {data.pagination.pages}
                    </span>
                    <CRUDButton
                        onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                        disabled={page === data.pagination.pages}
                    >
                        Successiva
                    </CRUDButton>
                </div>
            )}
        </div>
    );
};

export default ProfiliHRPage;
