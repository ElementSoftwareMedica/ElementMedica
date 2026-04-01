/**
 * P68 - Assenze Page
 * Gestione richieste ferie, permessi, malattie
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantFilter } from '@/context/TenantFilterContext';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
    CalendarDays,
    Check,
    X,
    Clock,
    Filter,
    Plus,
} from 'lucide-react';
import { CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { ActionButton } from '@/components/ui/ActionButton';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';
import ResizableTable from '@/components/shared/ResizableTable';
import { useToast } from '@/hooks/useToast';
import {
    assenzeApi,
    profiliHRApi,
    Assenza,
    TipoAssenza,
    StatoRichiestaHR,
    TIPO_ASSENZA_LABELS,
    STATO_RICHIESTA_LABELS,
} from './api';

const STATO_COLORS: Record<StatoRichiestaHR, string> = {
    BOZZA: 'bg-gray-100 text-gray-700',
    INVIATA: 'bg-blue-100 text-blue-700',
    IN_VALUTAZIONE: 'bg-amber-100 text-amber-700',
    IN_ATTESA: 'bg-yellow-100 text-yellow-700',
    APPROVATA: 'bg-emerald-100 text-emerald-700',
    RIFIUTATA: 'bg-rose-100 text-rose-700',
    ANNULLATA: 'bg-gray-100 text-gray-500',
};

const AssenzePage: React.FC = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [page, setPage] = useState(1);
    const [filterStato, setFilterStato] = useState<StatoRichiestaHR | 'ALL'>('ALL');
    const [filterTipo, setFilterTipo] = useState<TipoAssenza | 'ALL'>('ALL');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedAssenza, setSelectedAssenza] = useState<Assenza | null>(null);
    const [approvalNote, setApprovalNote] = useState('');
    const [showApprovalDialog, setShowApprovalDialog] = useState<'approve' | 'reject' | null>(null);

    const [formData, setFormData] = useState({
        profiloHRId: '',
        tipo: 'FERIE' as TipoAssenza,
        dataInizio: format(new Date(), 'yyyy-MM-dd'),
        dataFine: format(new Date(), 'yyyy-MM-dd'),
        isGiornataIntera: true,
        oraInizio: '09:00',
        oraFine: '18:00',
        motivazione: '',
    });

    // Tenant filter for multi-tenant data isolation
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    const { data: profiliData } = useQuery({
        queryKey: ['hr', 'profili', 'list', tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            const params: Record<string, unknown> = { isActive: true, limit: 200 };
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

    const { data: assenzeData, isLoading } = useQuery({
        queryKey: ['hr', 'assenze', tenantFilterKey, { page, filterStato, filterTipo }],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            const params: Record<string, unknown> = {
                page,
                limit: 20,
                ...(filterStato !== 'ALL' && { stato: filterStato }),
                ...(filterTipo !== 'ALL' && { tipo: filterTipo }),
            };
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            if (tenantParams.allTenants) {
                params.allTenants = true;
            }
            return assenzeApi.list(params);
        },
        enabled: isReady,
    });

    const createMutation = useMutation({
        mutationFn: assenzeApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'assenze'] });
            showToast({ message: 'Richiesta di assenza inviata', type: 'success' });
            setIsDialogOpen(false);
        },
        onError: (error: Error) => {
            showToast({ message: 'Impossibile creare la richiesta', type: 'error' });
        },
    });

    const approvaMutation = useMutation({
        mutationFn: ({ id, note }: { id: string; note?: string }) => assenzeApi.approva(id, note),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'assenze'] });
            showToast({ message: 'Richiesta approvata', type: 'success' });
            setShowApprovalDialog(null);
            setApprovalNote('');
        },
        onError: () => {
            showToast({ message: 'Impossibile approvare', type: 'error' });
        },
    });

    const rifiutaMutation = useMutation({
        mutationFn: ({ id, note }: { id: string; note: string }) => assenzeApi.rifiuta(id, note),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'assenze'] });
            showToast({ message: 'Richiesta rifiutata', type: 'success' });
            setShowApprovalDialog(null);
            setApprovalNote('');
        },
        onError: () => {
            showToast({ message: 'Impossibile rifiutare', type: 'error' });
        },
    });

    const handleOpenApproval = (assenza: Assenza, action: 'approve' | 'reject') => {
        setSelectedAssenza(assenza);
        setShowApprovalDialog(action);
        setApprovalNote('');
    };

    const handleApprovalSubmit = () => {
        if (!selectedAssenza) return;
        if (showApprovalDialog === 'approve') {
            approvaMutation.mutate({ id: selectedAssenza.id, note: approvalNote || undefined });
        } else {
            if (!approvalNote.trim()) {
                showToast({ message: 'Motivo del rifiuto obbligatorio', type: 'error' });
                return;
            }
            rifiutaMutation.mutate({ id: selectedAssenza.id, note: approvalNote });
        }
    };

    const handleCreateSubmit = () => {
        if (!formData.profiloHRId) {
            showToast({ message: 'Seleziona un collaboratore', type: 'error' });
            return;
        }
        createMutation.mutate({
            profiloHRId: formData.profiloHRId,
            tipo: formData.tipo,
            dataInizio: formData.dataInizio,
            dataFine: formData.dataFine,
            isGiornataIntera: formData.isGiornataIntera,
            motivazione: formData.motivazione || undefined,
        });
    };

    const profili = profiliData?.data ?? [];
    const assenze = assenzeData?.data ?? [];

    const columns = [
        {
            key: 'persona',
            label: 'Persona',
            renderCell: (row: Assenza) => (
                <span className="font-medium text-gray-900">
                    {row.profiloHR?.personTenantProfile?.person?.firstName}{' '}
                    {row.profiloHR?.personTenantProfile?.person?.lastName}
                </span>
            ),
        },
        {
            key: 'tipo',
            label: 'Tipo',
            renderCell: (row: Assenza) => (
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    <span>{TIPO_ASSENZA_LABELS[row.tipo]}</span>
                </div>
            ),
        },
        {
            key: 'periodo',
            label: 'Periodo',
            renderCell: (row: Assenza) => (
                <div className="text-sm">
                    <p className="font-medium">
                        {format(parseISO(row.dataInizio), 'd MMM', { locale: it })} -{' '}
                        {format(parseISO(row.dataFine), 'd MMM yyyy', { locale: it })}
                    </p>
                    <p className="text-gray-500">
                        {row.giorniTotali} {row.giorniTotali === 1 ? 'giorno' : 'giorni'}
                        {!row.isGiornataIntera && ` (${row.oreTotali}h)`}
                    </p>
                </div>
            ),
        },
        {
            key: 'stato',
            label: 'Stato',
            renderCell: (row: Assenza) => (
                <Badge className={STATO_COLORS[row.stato]}>
                    {STATO_RICHIESTA_LABELS[row.stato]}
                </Badge>
            ),
        },
        {
            key: 'azioni',
            label: '',
            renderCell: (row: Assenza) => {
                if (row.stato !== 'INVIATA' && row.stato !== 'IN_VALUTAZIONE') return null;
                return (
                    <ActionButton
                        theme="violet"
                        actions={[
                            {
                                label: 'Approva',
                                icon: <Check className="w-4 h-4" />,
                                variant: 'primary',
                                onClick: () => handleOpenApproval(row, 'approve'),
                            },
                            {
                                label: 'Rifiuta',
                                icon: <X className="w-4 h-4" />,
                                variant: 'danger',
                                onClick: () => handleOpenApproval(row, 'reject'),
                            },
                        ]}
                    />
                );
            },
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestione Assenze</h1>
                    <p className="text-gray-600">Ferie, permessi, malattie e congedi</p>
                </div>
                <CRUDPrimaryButton theme="violet" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Nuova Richiesta
                </CRUDPrimaryButton>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600">In Attesa</p>
                    <p className="text-2xl font-bold text-blue-700">
                        {assenze.filter(a => a.stato === 'INVIATA' || a.stato === 'IN_VALUTAZIONE').length}
                    </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                    <p className="text-sm text-emerald-600">Approvate</p>
                    <p className="text-2xl font-bold text-emerald-700">
                        {assenze.filter(a => a.stato === 'APPROVATA').length}
                    </p>
                </div>
                <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
                    <p className="text-sm text-rose-600">Rifiutate</p>
                    <p className="text-2xl font-bold text-rose-700">
                        {assenze.filter(a => a.stato === 'RIFIUTATA').length}
                    </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-600">Giorni Totali</p>
                    <p className="text-2xl font-bold text-amber-700">
                        {assenze.filter(a => a.stato === 'APPROVATA').reduce((sum, a) => sum + a.giorniTotali, 0)}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Filtri:</span>
                </div>
                <Select value={filterStato} onValueChange={(v) => setFilterStato(v as StatoRichiestaHR | 'ALL')}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Tutti gli stati" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tutti gli stati</SelectItem>
                        {Object.entries(STATO_RICHIESTA_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={filterTipo} onValueChange={(v) => setFilterTipo(v as TipoAssenza | 'ALL')}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Tutti i tipi" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tutti i tipi</SelectItem>
                        {Object.entries(TIPO_ASSENZA_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <ResizableTable
                columns={columns}
                data={assenze}
            />

            {/* Create Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Nuova Richiesta Assenza</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Collaboratore *</Label>
                            <Select value={formData.profiloHRId} onValueChange={(v) => setFormData({ ...formData, profiloHRId: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona collaboratore" />
                                </SelectTrigger>
                                <SelectContent>
                                    {profili.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.personTenantProfile?.person?.firstName} {p.personTenantProfile?.person?.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Tipo Assenza *</Label>
                            <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v as TipoAssenza })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(TIPO_ASSENZA_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Data Inizio *</Label>
                                <DatePickerElegante
                                    value={formData.dataInizio}
                                    onChange={(date) => setFormData({ ...formData, dataInizio: date ? date.toISOString().split('T')[0] : '' })}
                                    theme="blue"
                                />
                            </div>
                            <div>
                                <Label>Data Fine *</Label>
                                <DatePickerElegante
                                    value={formData.dataFine}
                                    onChange={(date) => setFormData({ ...formData, dataFine: date ? date.toISOString().split('T')[0] : '' })}
                                    theme="blue"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="giornataIntera"
                                checked={formData.isGiornataIntera}
                                onCheckedChange={(checked) => setFormData({ ...formData, isGiornataIntera: !!checked })}
                            />
                            <Label htmlFor="giornataIntera">Giornata intera</Label>
                        </div>
                        {!formData.isGiornataIntera && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Ora Inizio</Label>
                                    <Input
                                        type="time"
                                        value={formData.oraInizio}
                                        onChange={(e) => setFormData({ ...formData, oraInizio: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Ora Fine</Label>
                                    <Input
                                        type="time"
                                        value={formData.oraFine}
                                        onChange={(e) => setFormData({ ...formData, oraFine: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <Label>Motivazione</Label>
                            <Textarea
                                value={formData.motivazione}
                                onChange={(e) => setFormData({ ...formData, motivazione: e.target.value })}
                                placeholder="Motivo della richiesta..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <CRUDPrimaryButton theme="violet" onClick={handleCreateSubmit} disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Invio...' : 'Invia Richiesta'}
                        </CRUDPrimaryButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approval Dialog */}
            <Dialog open={showApprovalDialog !== null} onOpenChange={() => setShowApprovalDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {showApprovalDialog === 'approve' ? 'Approva Richiesta' : 'Rifiuta Richiesta'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        {selectedAssenza && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <p className="font-medium">
                                    {selectedAssenza.profiloHR?.personTenantProfile?.person?.firstName}{' '}
                                    {selectedAssenza.profiloHR?.personTenantProfile?.person?.lastName}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {TIPO_ASSENZA_LABELS[selectedAssenza.tipo]} -{' '}
                                    {format(parseISO(selectedAssenza.dataInizio), 'd MMM', { locale: it })} -{' '}
                                    {format(parseISO(selectedAssenza.dataFine), 'd MMM yyyy', { locale: it })}
                                </p>
                            </div>
                        )}
                        <Label>{showApprovalDialog === 'reject' ? 'Motivo Rifiuto *' : 'Note (opzionale)'}</Label>
                        <Textarea
                            value={approvalNote}
                            onChange={(e) => setApprovalNote(e.target.value)}
                            placeholder={showApprovalDialog === 'reject' ? 'Inserisci il motivo del rifiuto...' : 'Note aggiuntive...'}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <CRUDPrimaryButton
                            onClick={handleApprovalSubmit}
                            disabled={approvaMutation.isPending || rifiutaMutation.isPending}
                            className={showApprovalDialog === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : ''}
                        >
                            {showApprovalDialog === 'approve' ? 'Approva' : 'Rifiuta'}
                        </CRUDPrimaryButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssenzePage;
