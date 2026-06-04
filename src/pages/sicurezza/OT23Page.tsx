/**
 * OT23 Management Page
 * Gestione Modello OT23 INAIL - Riduzione Tasso Medio Tariffa
 * 
 * @page OT23Page
 * @project P44 - ElementSicurezza
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calculator,
    Download,
    FileText,
    Plus,
    RefreshCw,
    Search,
    TrendingUp,
    Building2,
    Calendar,
    Check,
    X,
    AlertCircle,
    Clock,
    FileCheck,
    Euro,
    Target
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ResizableTable from '../../components/shared/ResizableTable';
import { ActionButton } from '@/components/ui';
import { CRUDPrimaryButton } from '../../components/shared/CRUDButton';
import { useToast } from '@/hooks/useToast';
import { useTenantFilter } from '@/context/TenantFilterContext';
import { useTenantMode } from '@/contexts/TenantModeContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { formatCurrency } from '../../utils/formatters';

import {
    ot23Api,
    type OT23,
    type StatoOT23,
    getOT23StatoColor,
    getOT23StatoLabel,
    canEditOT23
} from '@/services/sicurezzaApi';

import OT23CreateModal from './components/OT23CreateModal';
import OT23RisparmioCalculator from './components/OT23RisparmioCalculator';

// =====================================================
// STATO BADGE COMPONENT
// =====================================================

function StatoBadge({ stato }: { stato: StatoOT23 }) {
    const color = getOT23StatoColor(stato);
    const label = getOT23StatoLabel(stato);

    const colorClasses: Record<string, string> = {
        gray: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
        indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
        yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
        red: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
        orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
    };

    return (
        <Badge className={colorClasses[color] || colorClasses.gray}>
            {label}
        </Badge>
    );
}

// =====================================================
// DASHBOARD CARDS
// =====================================================

interface DashboardCardsProps {
    data: OT23[];
    anno: number;
}

function DashboardCards({ data, anno }: DashboardCardsProps) {
    const totale = data.length;
    const conRequisiti = data.filter(d => d.haRequisitiBeneficio).length;
    const approvate = data.filter(d => d.stato === 'APPROVATO').length;
    const risparmioTotale = data.reduce((sum, d) => sum + (Number(d.risparmioStimato) || 0), 0);

    const cards = [
        {
            title: 'Domande Totali',
            value: totale,
            icon: FileText,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20'
        },
        {
            title: 'Con Requisiti',
            value: conRequisiti,
            subtitle: `${totale > 0 ? Math.round((conRequisiti / totale) * 100) : 0}%`,
            icon: Target,
            color: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-900/20'
        },
        {
            title: 'Approvate',
            value: approvate,
            icon: FileCheck,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/20'
        },
        {
            title: 'Risparmio Stimato',
            value: formatCurrency(risparmioTotale),
            icon: Euro,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((card, index) => (
                <Card key={index}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
                                <p className="text-2xl font-bold mt-1">{card.value}</p>
                                {card.subtitle && (
                                    <p className="text-xs text-gray-400">{card.subtitle}</p>
                                )}
                            </div>
                            <div className={`p-3 rounded-full ${card.bgColor}`}>
                                <card.icon className={`w-6 h-6 ${card.color}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// =====================================================
// MAIN PAGE COMPONENT
// =====================================================

export default function OT23Page() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { confirmDelete } = useConfirmDialog();
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();
    const { getOperateHeaders } = useTenantMode();
    const operateHeaders = getOperateHeaders();

    // State
    const [anno, setAnno] = useState(new Date().getFullYear());
    const [search, setSearch] = useState('');
    const [statoFilter, setStatoFilter] = useState<StatoOT23 | ''>('');
    const [page, setPage] = useState(1);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const preselectedCompanyProfileId = searchParams.get('companyId') || undefined;

    useEffect(() => {
        if (location.pathname.endsWith('/sicurezza/ot23/nuovo')) {
            setIsCreateModalOpen(true);
        }
    }, [location.pathname]);

    // Query - Lista OT23
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['ot23', anno, statoFilter, page, tenantFilterKey, operateHeaders],
        queryFn: async () => {
            return await ot23Api.getAll({
                anno,
                stato: statoFilter || undefined,
                page,
                limit: 20
            }, { headers: operateHeaders });
        },
        enabled: isReady
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: (id: string) => ot23Api.delete(id, { headers: operateHeaders }),
        onSuccess: () => {
            showToast({ type: 'success', message: 'Domanda eliminata con successo' });
            queryClient.invalidateQueries({ queryKey: ['ot23'] });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore eliminazione' });
        }
    });

    // Filter data by search
    const filteredData = (data?.data || []).filter(ot23 => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        const companyName = ot23.companyTenantProfile?.company?.ragioneSociale?.toLowerCase() || '';
        return companyName.includes(searchLower) ||
            ot23.pat?.toLowerCase().includes(searchLower);
    });

    // Handlers
    const handleRowClick = (row: OT23) => {
        navigate(`/sicurezza/ot23/${row.id}`);
    };

    const handleDelete = async (id: string) => {
        if (await confirmDelete('questa domanda')) {
            deleteMutation.mutate(id);
        }
    };

    const handleDownloadXml = async (ot23: OT23) => {
        try {
            await ot23Api.downloadXml(ot23.id, `OT23_${ot23.anno}_${ot23.companyTenantProfile?.company?.ragioneSociale || 'export'}.xml`);
            showToast({ type: 'success', message: 'XML scaricato con successo' });
        } catch (error) {
            showToast({ type: 'error', message: 'Errore download XML' });
        }
    };

    // Table columns
    const columns = [
        {
            key: 'company',
            label: 'Azienda',
            renderCell: (row: OT23) => (
                <div>
                    <p className="font-medium">{row.companyTenantProfile?.company?.ragioneSociale || '-'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{row.companyTenantProfile?.company?.piva || '-'}</p>
                </div>
            ),
            minWidth: 200
        },
        {
            key: 'anno',
            label: 'Anno',
            renderCell: (row: OT23) => (
                <span className="font-mono">{row.anno}</span>
            ),
            minWidth: 80
        },
        {
            key: 'pat',
            label: 'PAT',
            renderCell: (row: OT23) => (
                <span className="font-mono text-sm">{row.pat || '-'}</span>
            ),
            minWidth: 100
        },
        {
            key: 'punteggio',
            label: 'Punteggio',
            renderCell: (row: OT23) => (
                <div className="flex items-center gap-2">
                    <span className={`font-bold ${row.haRequisitiBeneficio ? 'text-green-600' : 'text-gray-500'}`}>
                        {row.punteggioTotale}
                    </span>
                    <span className="text-xs text-gray-400">/ 100</span>
                    {row.haRequisitiBeneficio && (
                        <Check className="w-4 h-4 text-green-500" />
                    )}
                </div>
            ),
            minWidth: 120
        },
        {
            key: 'risparmio',
            label: 'Risparmio Stimato',
            renderCell: (row: OT23) => (
                <div className="text-right">
                    {row.risparmioStimato ? (
                        <>
                            <p className="font-medium text-green-600">
                                {formatCurrency(Number(row.risparmioStimato))}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                -{row.percentualeRiduzione}%
                            </p>
                        </>
                    ) : (
                        <span className="text-gray-400">-</span>
                    )}
                </div>
            ),
            minWidth: 130
        },
        {
            key: 'stato',
            label: 'Stato',
            renderCell: (row: OT23) => <StatoBadge stato={row.stato} />,
            minWidth: 140
        },
        {
            key: 'actions',
            label: '',
            renderCell: (row: OT23) => (
                <ActionButton
                    theme="blue"
                    actions={[
                        {
                            label: 'Visualizza',
                            icon: <FileText className="w-4 h-4" />,
                            onClick: () => handleRowClick(row)
                        },
                        {
                            label: 'Download XML',
                            icon: <Download className="w-4 h-4" />,
                            onClick: () => handleDownloadXml(row)
                        },
                        ...(canEditOT23(row.stato) ? [{
                            label: 'Elimina',
                            icon: <X className="w-4 h-4" />,
                            onClick: () => handleDelete(row.id),
                            variant: 'danger' as const
                        }] : [])
                    ]}
                />
            ),
            minWidth: 80
        }
    ];

    // Anno selector
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    return (
        <div className="container mx-auto p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">OT23 - Riduzione Tasso INAIL</h1>
                        <p className="text-gray-500 dark:text-gray-400">Gestione domande per riduzione tasso medio tariffa INAIL</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsCalculatorOpen(true)}
                    >
                        <Calculator className="w-4 h-4 mr-2" />
                        Calcolatore Risparmio
                    </Button>
                    <CRUDPrimaryButton onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuova Domanda
                    </CRUDPrimaryButton>
                </div>
            </div>

            {/* Dashboard Cards */}
            <DashboardCards data={data?.data || []} anno={anno} />

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Anno selector */}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <select
                                value={anno}
                                onChange={(e) => setAnno(Number(e.target.value))}
                                className="border rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-50"
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        {/* Stato filter */}
                        <div className="flex items-center gap-2">
                            <select
                                value={statoFilter}
                                onChange={(e) => setStatoFilter(e.target.value as StatoOT23 | '')}
                                className="border rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-50"
                            >
                                <option value="">Tutti gli stati</option>
                                <option value="BOZZA">Bozza</option>
                                <option value="PRONTO">Pronto per invio</option>
                                <option value="INVIATO">Inviato</option>
                                <option value="IN_VALUTAZIONE">In valutazione</option>
                                <option value="APPROVATO">Approvato</option>
                                <option value="RESPINTO">Respinto</option>
                            </select>
                        </div>

                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Cerca azienda o PAT..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Refresh */}
                        <Button variant="outline" onClick={() => refetch()}>
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <FileText className="w-12 h-12 mb-4 text-gray-300" />
                            <p>Nessuna domanda OT23 trovata</p>
                        </div>
                    ) : (
                        <>
                            <ResizableTable
                                data={filteredData}
                                columns={columns}
                                onRowClick={handleRowClick}
                            />
                            {/* Pagination */}
                            {data?.pagination && data.pagination.pages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {data.pagination.total} risultati totali
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            disabled={page === 1}
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                        >
                                            Precedente
                                        </Button>
                                        <span className="flex items-center px-4">
                                            {page} / {data.pagination.pages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            disabled={page === data.pagination.pages}
                                            onClick={() => setPage(p => p + 1)}
                                        >
                                            Successivo
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Info Panel */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-500" />
                        Informazioni OT23
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6 text-sm">
                        <div>
                            <h4 className="font-semibold mb-2">Cos'è l'OT23?</h4>
                            <p className="text-gray-600 dark:text-gray-400">
                                Il modello OT23 permette alle aziende di ottenere una riduzione del tasso medio
                                di tariffa INAIL dimostrando di aver attuato interventi per il miglioramento
                                delle condizioni di sicurezza e di igiene nei luoghi di lavoro, in aggiunta
                                a quelli minimi previsti dalla normativa.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Requisiti</h4>
                            <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    Punteggio totale ≥ 100 punti
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    Regolarità contributiva (DURC)
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    Adempimenti obbligatori D.Lgs 81/08
                                </li>
                                <li className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-amber-500" />
                                    Presentazione entro 28 febbraio
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Modals */}
            {isCreateModalOpen && (
                <OT23CreateModal
                    isOpen={isCreateModalOpen}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        if (location.pathname.endsWith('/sicurezza/ot23/nuovo')) {
                            navigate('/sicurezza/ot23', { replace: true });
                        }
                    }}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        if (location.pathname.endsWith('/sicurezza/ot23/nuovo')) {
                            navigate('/sicurezza/ot23', { replace: true });
                        }
                        refetch();
                    }}
                    defaultAnno={anno}
                    preselectedCompanyProfileId={preselectedCompanyProfileId}
                />
            )}

            {isCalculatorOpen && (
                <OT23RisparmioCalculator
                    isOpen={isCalculatorOpen}
                    onClose={() => setIsCalculatorOpen(false)}
                />
            )}
        </div>
    );
}
