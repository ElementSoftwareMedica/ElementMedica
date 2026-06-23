/**
 * TariffariAziendePage
 * 
 * Pagina principale per la gestione dei Tariffari Aziende - Medicina del Lavoro
 * Accessibile da /poliambulatorio/mdl/tariffari-aziende
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Plus,
    Search,
    Filter,
    Building2,
    FileText,
    Calendar,
    Edit,
    Trash2,
    Copy,
    CheckCircle,
    XCircle,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Printer,
    Eye,
    Loader2
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { Input } from '../../../design-system/atoms/Input';
import { Badge } from '../../../design-system/atoms/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../design-system/molecules/Card';
import { Select } from '../../../design-system/atoms/Select';
import { ActionButton } from '../../../components/ui/ActionButton';
import { useToast } from '../../../hooks/useToast';
import { CRUDButton } from '../../../components/shared/CRUDButton';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import {
    tariffariAziendaliApi,
    TariffarioAziendaleListItem,
    TipoTariffario,
    TIPO_TARIFFARIO_LABELS
} from '../../../services/tariffarioAziendaleApi';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';

const TariffariAziendePage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();
    const [searchParams] = useSearchParams();

    // Read companyId from URL params
    const companyIdFromUrl = searchParams.get('companyId');

    // State
    const [tariffari, setTariffari] = useState<TariffarioAziendaleListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [companyFilter, setCompanyFilter] = useState<string>(companyIdFromUrl || '');
    // P59 Sprint 11: Default a 'BASE' per mostrare solo i tariffari template, non i cloni AZIENDALI
    const [tipoFilter, setTipoFilter] = useState<TipoTariffario | 'ALL'>('BASE');
    const [attivoFilter, setAttivoFilter] = useState<'ALL' | 'true' | 'false'>('ALL');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });

    // Fetch tariffari with tenant filter
    const fetchTariffari = useCallback(async () => {
        try {
            setLoading(true);

            // Get tenant filter params
            const tenantParams = getTenantFilterParams();

            const response = await tariffariAziendaliApi.getAll({
                attivo: attivoFilter === 'ALL' ? undefined : attivoFilter === 'true',
                search: searchQuery || undefined,
                page: pagination.page,
                limit: pagination.limit,
                tenantIds: tenantParams.tenantIds?.join(','),
                allTenants: tenantParams.allTenants
            });

            if (response.success) {
                setTariffari(response.data);
                setPagination(prev => ({
                    ...prev,
                    ...response.pagination
                }));
            }
        } catch (error) {
            showToast({ message: 'Errore nel caricamento dei tariffari', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [tipoFilter, attivoFilter, searchQuery, companyFilter, pagination.page, pagination.limit, getTenantFilterParams, tenantFilterKey]);

    useEffect(() => {
        if (isReady) {
            fetchTariffari();
        }
    }, [fetchTariffari, isReady]);

    // Handlers
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchTariffari();
    };

    const handleDelete = async (tariffario: TariffarioAziendaleListItem) => {
        if (!(await confirmDelete(tariffario.nome))) {
            return;
        }

        try {
            await tariffariAziendaliApi.delete(tariffario.id);
            showToast({ message: 'Tariffario eliminato con successo', type: 'success' });
            fetchTariffari();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { error?: string } } };
            const errorMessage = axiosError?.response?.data?.error || 'Errore durante l\'eliminazione';
            showToast({ message: errorMessage, type: 'error' });
        }
    };

    const handleClone = async (tariffario: TariffarioAziendaleListItem) => {
        try {
            const response = await tariffariAziendaliApi.clonaTariffario(tariffario.id);
            if (response.success) {
                showToast({ message: response.message || 'Tariffario clonato con successo', type: 'success' });
                navigate(`/poliambulatorio/mdl/tariffari-aziende/${response.data.id}`);
            }
        } catch (error: unknown) {
            const msg = 'Errore durante la clonazione';
            showToast({ message: msg, type: 'error' });
        }
    };

    // Stampa / scarica il PDF del tariffario
    const [printingId, setPrintingId] = useState<string | null>(null);
    const handlePrint = async (tariffario: TariffarioAziendaleListItem) => {
        try {
            setPrintingId(tariffario.id);
            await tariffariAziendaliApi.downloadPDF(tariffario.id, getTenantFilterParams());
            showToast({ message: 'PDF generato correttamente', type: 'success' });
        } catch {
            showToast({ message: 'Errore nella generazione del PDF', type: 'error' });
        } finally {
            setPrintingId(null);
        }
    };

    // Format date
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('it-IT');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardList className="h-6 w-6" />
                        Tariffari Aziende
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gestione tariffari Medicina del Lavoro per aziende
                    </p>
                </div>
                <CRUDButton
                    operation="create"
                    onClick={() => navigate('/poliambulatorio/mdl/tariffari-aziende/nuovo')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuovo Tariffario
                </CRUDButton>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Cerca per codice, nome..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <Select
                            value={tipoFilter}
                            onChange={(e) => {
                                setTipoFilter(e.target.value as TipoTariffario | 'ALL');
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            options={[
                                { value: 'ALL', label: 'Tutti i tipi' },
                                { value: 'BASE', label: 'Template Base' },
                                { value: 'AZIENDALE', label: 'Aziendale' }
                            ]}
                            className="w-[180px]"
                        />

                        <Select
                            value={attivoFilter}
                            onChange={(e) => {
                                setAttivoFilter(e.target.value as 'ALL' | 'true' | 'false');
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            options={[
                                { value: 'ALL', label: 'Tutti' },
                                { value: 'true', label: 'Attivi' },
                                { value: 'false', label: 'Non attivi' }
                            ]}
                            className="w-[150px]"
                        />

                        <Button type="submit" variant="secondary">
                            <Search className="h-4 w-4 mr-2" />
                            Cerca
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Totale Tariffari</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pagination.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Template Base</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {tariffari.filter(t => (t as unknown as { tipo?: string }).tipo === 'BASE').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Aziendali</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {tariffari.filter(t => (t as unknown as { tipo?: string }).tipo === 'AZIENDALE').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : tariffari.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <FileText className="h-12 w-12 mb-4 opacity-50" />
                            <p>Nessun tariffario trovato</p>
                            <CRUDButton
                                operation="create"
                                onClick={() => navigate('/poliambulatorio/mdl/tariffari-aziende/nuovo')}
                                className="text-primary mt-2 hover:underline"
                            >
                                Crea il primo tariffario
                            </CRUDButton>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-gray-50 dark:bg-gray-800">
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Codice</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nome</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tipo</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azienda</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Validità</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Voci</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Stato</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tariffari.map((tariffario) => (
                                        <tr
                                            key={tariffario.id}
                                            className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                            onClick={() => navigate(`/poliambulatorio/mdl/tariffari-aziende/${tariffario.id}`)}
                                        >
                                            <td className="px-4 py-3 text-sm font-mono">{tariffario.codice}</td>
                                            <td className="px-4 py-3 text-sm font-medium">{tariffario.nome}</td>
                                            <td className="px-4 py-3">
                                                {(() => {
                                                    const t = tariffario as unknown as { tipo?: string }; return (
                                                        <Badge variant={t.tipo === 'BASE' ? 'secondary' : 'default'}>
                                                            {t.tipo ? TIPO_TARIFFARIO_LABELS[t.tipo as keyof typeof TIPO_TARIFFARIO_LABELS] : '-'}
                                                        </Badge>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {(() => {
                                                    const t = tariffario as unknown as { company?: { ragioneSociale: string } }; return t.company ? (
                                                        <div className="flex items-center gap-1">
                                                            <Building2 className="h-4 w-4 text-gray-400" />
                                                            <span>{t.company.ragioneSociale}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex items-center gap-1 text-gray-500">
                                                    <Calendar className="h-4 w-4" />
                                                    {formatDate(tariffario.validoDa)}
                                                    {tariffario.validoA && ` - ${formatDate(tariffario.validoA)}`}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center">
                                                {tariffario._count?.voci || 0}
                                            </td>
                                            <td className="px-4 py-3">
                                                {tariffario.attivo ? (
                                                    <div className="flex items-center gap-1 text-green-600">
                                                        <CheckCircle className="h-4 w-4" />
                                                        <span className="text-sm">Attivo</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-gray-400">
                                                        <XCircle className="h-4 w-4" />
                                                        <span className="text-sm">Non attivo</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end">
                                                    <ActionButton
                                                        theme="teal"
                                                        actions={[
                                                            {
                                                                label: 'Visualizza dettaglio',
                                                                icon: <Eye className="h-4 w-4" />,
                                                                onClick: () => navigate(`/poliambulatorio/mdl/tariffari-aziende/${tariffario.id}`),
                                                            },
                                                            {
                                                                label: 'Modifica',
                                                                icon: <Edit className="h-4 w-4" />,
                                                                onClick: () => navigate(`/poliambulatorio/mdl/tariffari-aziende/${tariffario.id}/modifica`),
                                                            },
                                                            {
                                                                label: printingId === tariffario.id ? 'Generazione…' : 'Stampa tariffario',
                                                                icon: printingId === tariffario.id
                                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                    : <Printer className="h-4 w-4" />,
                                                                disabled: printingId === tariffario.id,
                                                                onClick: () => handlePrint(tariffario),
                                                            },
                                                            {
                                                                label: 'Clona per azienda',
                                                                icon: <Copy className="h-4 w-4" />,
                                                                onClick: () => handleClone(tariffario),
                                                            },
                                                            {
                                                                label: 'Elimina',
                                                                icon: <Trash2 className="h-4 w-4" />,
                                                                variant: 'danger',
                                                                onClick: () => handleDelete(tariffario),
                                                            },
                                                        ]}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Pagina {pagination.page} di {pagination.totalPages} ({pagination.total} totali)
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Precedente
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        >
                            Successivo
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TariffariAziendePage;
