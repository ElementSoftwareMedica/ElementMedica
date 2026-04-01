/**
 * Cross-Tenant Approvals Page
 * 
 * Pagina admin per gestire le richieste di condivisione dati cross-tenant.
 * Permette di approvare o rifiutare richieste di condivisione Person/Company.
 * 
 * @project P58 - Feature Completion
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    CheckCircle,
    XCircle,
    Clock,
    Users,
    Building2,
    FileText,
    RefreshCw,
    Eye,
    History,
    AlertCircle
} from 'lucide-react';
import { apiGet, apiPost } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';
import { Badge } from '../../../components/ui/badge';
import ResizableTable from '../../../components/shared/ResizableTable';
import { ActionButton } from '../../../components/ui';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { formatDate } from '../../../utils/dateUtils';

// ============================================
// TYPES
// ============================================

interface ApprovalRequest {
    id: string;
    personId?: string;
    companyId?: string;
    sourceTenantId: string;
    targetTenantId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    sharedDataTypes: string[];
    requestNotes?: string;
    rejectionReason?: string;
    requestedBy: string;
    requestedAt: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    // Relations
    person?: {
        id: string;
        firstName: string;
        lastName: string;
        taxCode?: string;
    };
    company?: {
        id: string;
        ragioneSociale: string;
        piva?: string;
    };
    sourceTenant?: {
        id: string;
        name: string;
    };
    targetTenant?: {
        id: string;
        name: string;
    };
    requestedByPerson?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

interface PendingApprovalsData {
    personRequests: ApprovalRequest[];
    companyRequests: ApprovalRequest[];
}

interface HistoryData {
    data: ApprovalRequest[];
    total: number;
    page: number;
    limit: number;
}

// ============================================
// API FUNCTIONS
// ============================================

const fetchPendingApprovals = async (): Promise<PendingApprovalsData> => {
    const response = await apiGet<{ data: PendingApprovalsData }>('/api/v1/cross-tenant-approvals/pending');
    return response.data;
};

const fetchApprovalHistory = async (page: number, limit: number, status?: string): Promise<HistoryData> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    const response = await apiGet<{ data: HistoryData }>(`/api/v1/cross-tenant-approvals/history?${params}`);
    return response.data;
};

const approveRequest = async (type: 'person' | 'company', consentId: string): Promise<void> => {
    await apiPost(`/api/v1/cross-tenant-approvals/${type}/${consentId}/approve`, {});
};

const rejectRequest = async (type: 'person' | 'company', consentId: string, rejectionReason: string): Promise<void> => {
    await apiPost(`/api/v1/cross-tenant-approvals/${type}/${consentId}/reject`, { rejectionReason });
};

// ============================================
// COMPONENTS
// ============================================

const StatusBadge: React.FC<{ status: ApprovalRequest['status'] }> = ({ status }) => {
    const config = {
        PENDING: { color: 'warning', label: 'In Attesa', icon: Clock },
        APPROVED: { color: 'success', label: 'Approvata', icon: CheckCircle },
        REJECTED: { color: 'destructive', label: 'Rifiutata', icon: XCircle },
    };

    const { color, label, icon: Icon } = config[status];

    return (
        <Badge variant={color as 'warning' | 'success' | 'destructive'} className="flex items-center gap-1">
            <Icon className="w-3 h-3" />
            {label}
        </Badge>
    );
};

const DataTypesBadges: React.FC<{ types: string[] }> = ({ types }) => {
    const typeLabels: Record<string, string> = {
        ANAGRAFICA: 'Anagrafica',
        CONTATTI: 'Contatti',
        VISITE: 'Visite',
        DOCUMENTI: 'Documenti',
        FATTURAZIONE: 'Fatturazione',
        FORMAZIONE: 'Formazione',
        ALL: 'Tutti i dati',
    };

    return (
        <div className="flex flex-wrap gap-1">
            {types.map(type => (
                <Badge key={type} variant="outline" className="text-xs">
                    {typeLabels[type] || type}
                </Badge>
            ))}
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const CrossTenantApprovalsPage: React.FC = () => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // State
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [historyPage, setHistoryPage] = useState(1);
    const [historyFilter, setHistoryFilter] = useState<string | undefined>();

    // Queries
    const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
        queryKey: ['cross-tenant-approvals', 'pending'],
        queryFn: fetchPendingApprovals,
        refetchInterval: 30000, // Refresh ogni 30 secondi
    });

    const { data: historyData, isLoading: historyLoading } = useQuery({
        queryKey: ['cross-tenant-approvals', 'history', historyPage, historyFilter],
        queryFn: () => fetchApprovalHistory(historyPage, 20, historyFilter),
        enabled: activeTab === 'history',
    });

    // Mutations
    const approveMutation = useMutation({
        mutationFn: ({ type, consentId }: { type: 'person' | 'company'; consentId: string }) =>
            approveRequest(type, consentId),
        onSuccess: () => {
            showToast({ message: 'Richiesta approvata con successo', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['cross-tenant-approvals'] });
            setSelectedRequest(null);
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore durante l\'approvazione', type: 'error' });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ type, consentId, reason }: { type: 'person' | 'company'; consentId: string; reason: string }) =>
            rejectRequest(type, consentId, reason),
        onSuccess: () => {
            showToast({ message: 'Richiesta rifiutata', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['cross-tenant-approvals'] });
            setRejectModalOpen(false);
            setRejectionReason('');
            setSelectedRequest(null);
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore durante il rifiuto', type: 'error' });
        },
    });

    // Handlers
    const handleApprove = useCallback((request: ApprovalRequest) => {
        const type = request.personId ? 'person' : 'company';
        approveMutation.mutate({ type, consentId: request.id });
    }, [approveMutation]);

    const handleRejectClick = useCallback((request: ApprovalRequest) => {
        setSelectedRequest(request);
        setRejectModalOpen(true);
    }, []);

    const handleRejectConfirm = useCallback(() => {
        if (!selectedRequest || !rejectionReason.trim()) return;
        const type = selectedRequest.personId ? 'person' : 'company';
        rejectMutation.mutate({ type, consentId: selectedRequest.id, reason: rejectionReason });
    }, [selectedRequest, rejectionReason, rejectMutation]);

    // Combined pending data
    const allPendingRequests = useMemo(() => {
        if (!pendingData) return [];
        return [
            ...(pendingData.personRequests || []).map(r => ({ ...r, _type: 'person' as const })),
            ...(pendingData.companyRequests || []).map(r => ({ ...r, _type: 'company' as const })),
        ].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }, [pendingData]);

    // Table columns for pending
    const pendingColumns = useMemo(() => [
        {
            key: 'type',
            label: 'Tipo',
            width: 100,
            renderCell: (row: ApprovalRequest & { _type: 'person' | 'company' }) => (
                <div className="flex items-center gap-2">
                    {row._type === 'person' ? (
                        <Users className="w-4 h-4 text-violet-600" />
                    ) : (
                        <Building2 className="w-4 h-4 text-violet-600" />
                    )}
                    <span className="capitalize">{row._type === 'person' ? 'Persona' : 'Azienda'}</span>
                </div>
            ),
        },
        {
            key: 'entity',
            label: 'Entità',
            width: 200,
            renderCell: (row: ApprovalRequest) => (
                <div>
                    {row.person ? (
                        <div>
                            <div className="font-medium">{row.person.lastName} {row.person.firstName}</div>
                            {row.person.taxCode && (
                                <div className="text-xs text-gray-500">{row.person.taxCode}</div>
                            )}
                        </div>
                    ) : row.company ? (
                        <div>
                            <div className="font-medium">{row.company.ragioneSociale}</div>
                            {row.company.piva && (
                                <div className="text-xs text-gray-500">P.IVA: {row.company.piva}</div>
                            )}
                        </div>
                    ) : '-'}
                </div>
            ),
        },
        {
            key: 'sourceTenant',
            label: 'Tenant Origine',
            width: 150,
            renderCell: (row: ApprovalRequest) => (
                <span className="text-sm">{row.sourceTenant?.name || row.sourceTenantId}</span>
            ),
        },
        {
            key: 'dataTypes',
            label: 'Dati Richiesti',
            width: 200,
            renderCell: (row: ApprovalRequest) => <DataTypesBadges types={row.sharedDataTypes} />,
        },
        {
            key: 'requestedBy',
            label: 'Richiesto Da',
            width: 150,
            renderCell: (row: ApprovalRequest) => (
                <div className="text-sm">
                    {row.requestedByPerson ? (
                        `${row.requestedByPerson.lastName} ${row.requestedByPerson.firstName}`
                    ) : '-'}
                </div>
            ),
        },
        {
            key: 'requestedAt',
            label: 'Data Richiesta',
            width: 130,
            renderCell: (row: ApprovalRequest) => (
                <span className="text-sm">{formatDate(row.requestedAt)}</span>
            ),
        },
        {
            key: 'actions',
            label: 'Azioni',
            width: 120,
            renderCell: (row: ApprovalRequest & { _type: 'person' | 'company' }) => (
                <ActionButton
                    theme="violet"
                    actions={[
                        {
                            label: 'Approva',
                            icon: <CheckCircle className="w-4 h-4" />,
                            onClick: () => handleApprove(row),
                        },
                        {
                            label: 'Rifiuta',
                            icon: <XCircle className="w-4 h-4" />,
                            onClick: () => handleRejectClick(row),
                            variant: 'danger',
                        },
                        {
                            label: 'Dettagli',
                            icon: <Eye className="w-4 h-4" />,
                            onClick: () => setSelectedRequest(row),
                        },
                    ]}
                />
            ),
        },
    ], [handleApprove, handleRejectClick]);

    // Table columns for history
    const historyColumns = useMemo(() => [
        {
            key: 'status',
            label: 'Stato',
            width: 120,
            renderCell: (row: ApprovalRequest) => <StatusBadge status={row.status} />,
        },
        {
            key: 'type',
            label: 'Tipo',
            width: 100,
            renderCell: (row: ApprovalRequest) => (
                <div className="flex items-center gap-2">
                    {row.personId ? (
                        <Users className="w-4 h-4 text-violet-600" />
                    ) : (
                        <Building2 className="w-4 h-4 text-violet-600" />
                    )}
                    <span>{row.personId ? 'Persona' : 'Azienda'}</span>
                </div>
            ),
        },
        {
            key: 'entity',
            label: 'Entità',
            width: 200,
            renderCell: (row: ApprovalRequest) => (
                <div>
                    {row.person ? (
                        `${row.person.lastName} ${row.person.firstName}`
                    ) : row.company ? (
                        row.company.ragioneSociale
                    ) : '-'}
                </div>
            ),
        },
        {
            key: 'dataTypes',
            label: 'Dati',
            width: 180,
            renderCell: (row: ApprovalRequest) => <DataTypesBadges types={row.sharedDataTypes} />,
        },
        {
            key: 'processedAt',
            label: 'Data Elaborazione',
            width: 130,
            renderCell: (row: ApprovalRequest) => (
                <span className="text-sm">
                    {row.approvedAt ? formatDate(row.approvedAt) :
                        row.rejectedAt ? formatDate(row.rejectedAt) : '-'}
                </span>
            ),
        },
        {
            key: 'notes',
            label: 'Note',
            width: 150,
            renderCell: (row: ApprovalRequest) => (
                <span className="text-sm text-gray-500 truncate block max-w-[150px]" title={row.rejectionReason || row.requestNotes}>
                    {row.rejectionReason || row.requestNotes || '-'}
                </span>
            ),
        },
    ], []);

    const pendingCount = allPendingRequests.length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 rounded-lg">
                        <FileText className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Approvazioni Cross-Tenant</h1>
                        <p className="text-sm text-gray-500">Gestisci le richieste di condivisione dati tra tenant</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={() => refetchPending()}
                    disabled={pendingLoading}
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${pendingLoading ? 'animate-spin' : ''}`} />
                    Aggiorna
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'history')}>
                <TabsList>
                    <TabsTrigger value="pending" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        In Attesa
                        {pendingCount > 0 && (
                            <Badge variant="destructive" className="ml-1">{pendingCount}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Storico
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-4">
                    {pendingLoading ? (
                        <div className="flex justify-center py-12">
                            <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
                        </div>
                    ) : allPendingRequests.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                            <p className="text-lg font-medium">Nessuna richiesta in attesa</p>
                            <p className="text-sm">Tutte le richieste sono state elaborate</p>
                        </div>
                    ) : (
                        <ResizableTable
                            columns={pendingColumns}
                            data={allPendingRequests}
                        />
                    )}
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                    {/* Filter buttons */}
                    <div className="flex gap-2 mb-4">
                        <Button
                            variant={!historyFilter ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setHistoryFilter(undefined)}
                        >
                            Tutti
                        </Button>
                        <Button
                            variant={historyFilter === 'APPROVED' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setHistoryFilter('APPROVED')}
                        >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approvate
                        </Button>
                        <Button
                            variant={historyFilter === 'REJECTED' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setHistoryFilter('REJECTED')}
                        >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rifiutate
                        </Button>
                    </div>

                    {historyLoading ? (
                        <div className="flex justify-center py-12">
                            <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
                        </div>
                    ) : !historyData?.data?.length ? (
                        <div className="text-center py-12 text-gray-500">
                            <History className="w-12 h-12 mx-auto mb-4" />
                            <p>Nessuna richiesta nello storico</p>
                        </div>
                    ) : (
                        <>
                            <ResizableTable
                                columns={historyColumns}
                                data={historyData.data}
                            />
                            {/* Pagination */}
                            {historyData.total > 20 && (
                                <div className="flex justify-center gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={historyPage === 1}
                                        onClick={() => setHistoryPage(p => p - 1)}
                                    >
                                        Precedente
                                    </Button>
                                    <span className="px-4 py-2 text-sm">
                                        Pagina {historyPage} di {Math.ceil(historyData.total / 20)}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={historyPage >= Math.ceil(historyData.total / 20)}
                                        onClick={() => setHistoryPage(p => p + 1)}
                                    >
                                        Successiva
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </TabsContent>
            </Tabs>

            {/* Reject Modal */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            Rifiuta Richiesta
                        </DialogTitle>
                        <DialogDescription>
                            Stai per rifiutare la richiesta di condivisione dati.
                            Inserisci una motivazione per il rifiuto.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Textarea
                            placeholder="Motivazione del rifiuto..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={4}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRejectModalOpen(false);
                                setRejectionReason('');
                            }}
                        >
                            Annulla
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectConfirm}
                            disabled={!rejectionReason.trim() || rejectMutation.isPending}
                        >
                            {rejectMutation.isPending ? 'Rifiuto in corso...' : 'Rifiuta'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Modal */}
            <Dialog open={!!selectedRequest && !rejectModalOpen} onOpenChange={() => setSelectedRequest(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Dettagli Richiesta</DialogTitle>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-gray-500">Tipo</div>
                                    <div className="font-medium flex items-center gap-2">
                                        {selectedRequest.personId ? (
                                            <>
                                                <Users className="w-4 h-4" />
                                                Persona
                                            </>
                                        ) : (
                                            <>
                                                <Building2 className="w-4 h-4" />
                                                Azienda
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-gray-500">Stato</div>
                                    <StatusBadge status={selectedRequest.status} />
                                </div>

                                <div>
                                    <div className="text-gray-500">Entità</div>
                                    <div className="font-medium">
                                        {selectedRequest.person
                                            ? `${selectedRequest.person.lastName} ${selectedRequest.person.firstName}`
                                            : selectedRequest.company?.ragioneSociale
                                        }
                                    </div>
                                </div>

                                <div>
                                    <div className="text-gray-500">Tenant Origine</div>
                                    <div className="font-medium">
                                        {selectedRequest.sourceTenant?.name || selectedRequest.sourceTenantId}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-gray-500">Data Richiesta</div>
                                    <div>{formatDate(selectedRequest.requestedAt)}</div>
                                </div>

                                <div>
                                    <div className="text-gray-500">Richiesto Da</div>
                                    <div>
                                        {selectedRequest.requestedByPerson
                                            ? `${selectedRequest.requestedByPerson.lastName} ${selectedRequest.requestedByPerson.firstName}`
                                            : '-'
                                        }
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="text-gray-500 text-sm mb-2">Dati Richiesti</div>
                                <DataTypesBadges types={selectedRequest.sharedDataTypes} />
                            </div>

                            {selectedRequest.requestNotes && (
                                <div>
                                    <div className="text-gray-500 text-sm mb-1">Note Richiesta</div>
                                    <div className="bg-gray-50 p-3 rounded text-sm">
                                        {selectedRequest.requestNotes}
                                    </div>
                                </div>
                            )}

                            {selectedRequest.rejectionReason && (
                                <div>
                                    <div className="text-gray-500 text-sm mb-1">Motivo Rifiuto</div>
                                    <div className="bg-red-50 p-3 rounded text-sm text-red-700">
                                        {selectedRequest.rejectionReason}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                            Chiudi
                        </Button>
                        {selectedRequest?.status === 'PENDING' && (
                            <>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleRejectClick(selectedRequest)}
                                >
                                    Rifiuta
                                </Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApprove(selectedRequest)}
                                    disabled={approveMutation.isPending}
                                >
                                    {approveMutation.isPending ? 'Approvazione...' : 'Approva'}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CrossTenantApprovalsPage;
