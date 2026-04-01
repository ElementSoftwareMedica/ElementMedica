/**
 * ParticipantCredentialsModal Component
 * 
 * Modal per gestire le credenziali dei partecipanti con tabella full-width:
 * - Visualizzazione completa dati partecipanti
 * - Editing inline di email/cellulare
 * - Checkbox per selezione batch
 * - Azioni batch: download card, invio email
 * 
 * @module components/schedules/ParticipantCredentialsModal
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    KeyRound,
    Download,
    Mail,
    Phone,
    Send,
    Users,
    CheckCircle,
    AlertCircle,
    Loader2,
    RefreshCw,
    Edit2,
    Save,
    X,
    MessageCircle,
    Check
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/design-system/atoms/Button';
import { Checkbox } from '@/components/ui/checkbox';
import { ActionButton } from '@/components/ui/ActionButton';
import { useToast } from '@/hooks/useToast';
import api from '@/services/api';

interface Participant {
    id: string;
    personId: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    hasLoggedIn: boolean;
    mustChangePassword: boolean;
    createdAt?: string;
}

interface ParticipantCredentialsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scheduleId: string | number;
    enrollments?: Array<{
        id?: string;
        person: {
            id: string;
            firstName: string;
            lastName: string;
            email?: string | null;
        };
    }>;
    onUpdate?: () => void;
}

export const ParticipantCredentialsModal: React.FC<ParticipantCredentialsModalProps> = ({
    open,
    onOpenChange,
    scheduleId,
    enrollments = [],
    onUpdate
}) => {
    const [loading, setLoading] = useState(false);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{ email?: string; phone?: string }>({});
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [downloadingBatch, setDownloadingBatch] = useState(false);
    const [sendingBatch, setSendingBatch] = useState(false);
    const { showToast } = useToast();

    // Carica lo stato di login dei partecipanti
    const loadParticipantsStatus = useCallback(async () => {
        if (!scheduleId || enrollments.length === 0) return;

        setLoading(true);
        try {
            const personIds = enrollments.map(e => e.person.id);
            const response = await api.post('/api/v1/credentials/participants-status', { personIds });

            if (response.data?.success) {
                const statusMap = new Map(
                    response.data.data.map((p: any) => [p.personId, p])
                );

                const mapped = enrollments.map(e => {
                    const status = statusMap.get(e.person.id) || {};
                    return {
                        id: e.id || e.person.id,
                        personId: e.person.id,
                        firstName: e.person.firstName,
                        lastName: e.person.lastName,
                        email: (status as any).email || e.person.email,
                        phone: (status as any).phone || null,
                        hasLoggedIn: (status as any).hasLoggedIn || false,
                        mustChangePassword: (status as any).mustChangePassword || false,
                        createdAt: (status as any).createdAt
                    };
                });

                setParticipants(mapped);

                // Pre-seleziona solo chi non ha fatto login
                const withoutLogin = mapped.filter(p => !p.hasLoggedIn).map(p => p.personId);
                setSelectedIds(new Set(withoutLogin));
            }
        } catch (error) {
            const mapped = enrollments.map(e => ({
                id: e.id || e.person.id,
                personId: e.person.id,
                firstName: e.person.firstName,
                lastName: e.person.lastName,
                email: e.person.email,
                phone: null,
                hasLoggedIn: false,
                mustChangePassword: true,
                createdAt: undefined
            }));
            setParticipants(mapped);
            setSelectedIds(new Set(mapped.map(p => p.personId)));
        } finally {
            setLoading(false);
        }
    }, [scheduleId, enrollments]);

    useEffect(() => {
        if (open) {
            loadParticipantsStatus();
        }
    }, [open, loadParticipantsStatus]);

    // Filtra partecipanti
    const participantsWithoutLogin = useMemo(() =>
        participants.filter(p => !p.hasLoggedIn), [participants]);
    const participantsWithLogin = useMemo(() =>
        participants.filter(p => p.hasLoggedIn), [participants]);

    // Gestione selezione
    const toggleSelection = (personId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(personId)) {
                next.delete(personId);
            } else {
                next.add(personId);
            }
            return next;
        });
    };

    const toggleAllSelection = () => {
        if (selectedIds.size === participants.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(participants.map(p => p.personId)));
        }
    };

    const selectOnlyWithoutLogin = () => {
        setSelectedIds(new Set(participantsWithoutLogin.map(p => p.personId)));
    };

    // Verifica se ci sono utenti attivi selezionati
    const hasActiveUsersSelected = useMemo(() => {
        return participantsWithLogin.some(p => selectedIds.has(p.personId));
    }, [participantsWithLogin, selectedIds]);

    // Selezionati con email
    const selectedWithEmail = useMemo(() => {
        return participants.filter(p => selectedIds.has(p.personId) && p.email);
    }, [participants, selectedIds]);

    // Salva email/phone per un partecipante
    const handleSaveContact = async (participantId: string) => {
        try {
            const participant = participants.find(p => p.personId === participantId);
            if (!participant) return;

            await api.patch(`/api/v1/persons/${participantId}/contact`, {
                email: editValues.email !== undefined ? editValues.email : participant.email,
                phone: editValues.phone !== undefined ? editValues.phone : participant.phone
            });

            showToast({
                message: `Contatti aggiornati per ${participant.firstName} ${participant.lastName}`,
                type: 'success'
            });

            setEditingId(null);
            setEditValues({});
            loadParticipantsStatus();
        } catch (error) {
            showToast({
                message: 'Impossibile aggiornare i dati di contatto',
                type: 'error'
            });
        }
    };

    // Download batch di card
    const handleDownloadBatch = async () => {
        const selected = Array.from(selectedIds);
        if (selected.length === 0) {
            showToast({ message: 'Seleziona almeno un partecipante', type: 'error' });
            return;
        }

        setDownloadingBatch(true);
        try {
            const response = await api.post('/api/v1/credentials/batch-cards',
                { personIds: selected },
                { responseType: 'blob' }
            );

            const blob = new Blob([response.data], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `credenziali-corso-${scheduleId}.html`;
            a.click();
            window.URL.revokeObjectURL(url);

            showToast({
                message: `${selected.length} card credenziali scaricate. Apri il file e stampa.`,
                type: 'success'
            });
        } catch (error) {
            showToast({
                message: 'Impossibile scaricare le card',
                type: 'error'
            });
        } finally {
            setDownloadingBatch(false);
        }
    };

    // Invia credenziali batch
    const handleSendBatch = async () => {
        if (selectedWithEmail.length === 0) {
            showToast({ message: 'Nessun partecipante selezionato ha un indirizzo email', type: 'error' });
            return;
        }

        setSendingBatch(true);
        try {
            const personIds = selectedWithEmail.map(p => p.personId);
            const response = await api.post('/api/v1/credentials/send-batch-welcome', { personIds });

            if (response.data?.success) {
                const sent = response.data.data?.sent || personIds.length;
                showToast({
                    message: `Credenziali inviate a ${sent} partecipanti`,
                    type: 'success'
                });
                loadParticipantsStatus();
            }
        } catch (error) {
            showToast({
                message: 'Impossibile inviare le credenziali',
                type: 'error'
            });
        } finally {
            setSendingBatch(false);
        }
    };

    // Invia singola email
    const handleSendSingle = async (participantId: string) => {
        const participant = participants.find(p => p.personId === participantId);
        if (!participant?.email) {
            showToast({ message: 'Inserisci prima un indirizzo email', type: 'error' });
            return;
        }

        try {
            await api.post(`/api/v1/credentials/send-welcome/${participantId}`);
            showToast({
                message: `Credenziali inviate a ${participant.firstName} ${participant.lastName}`,
                type: 'success'
            });
            loadParticipantsStatus();
        } catch (error) {
            showToast({ message: 'Impossibile inviare le credenziali', type: 'error' });
        }
    };

    // Reset password
    const handleResetPassword = async (participantId: string) => {
        try {
            await api.post(`/api/v1/credentials/reset/${participantId}`);
            const participant = participants.find(p => p.personId === participantId);
            showToast({
                message: `Nuova password generata per ${participant?.firstName || 'utente'}`,
                type: 'success'
            });
            loadParticipantsStatus();
        } catch (error) {
            showToast({ message: 'Impossibile resettare la password', type: 'error' });
        }
    };

    // Download singola card
    const handleDownloadCard = async (participantId: string) => {
        try {
            const response = await api.get(`/api/v1/credentials/card/${participantId}`, {
                responseType: 'blob'
            });
            const participant = participants.find(p => p.personId === participantId);

            const blob = new Blob([response.data], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `credenziali-${participant?.lastName || participantId}.html`;
            a.click();
            window.URL.revokeObjectURL(url);

            showToast({
                message: 'Card credenziali scaricata. Apri il file e stampa.',
                type: 'success'
            });
        } catch (error) {
            showToast({ message: 'Impossibile scaricare la card', type: 'error' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col dark:bg-gray-800 dark:border-gray-700">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 dark:text-gray-50">
                        <KeyRound className="h-5 w-5" />
                        Gestione Credenziali Partecipanti
                    </DialogTitle>
                    <DialogDescription className="dark:text-gray-400">
                        Gestisci email, telefoni e invia credenziali ai partecipanti del corso
                    </DialogDescription>
                </DialogHeader>

                {/* Statistiche e azioni */}
                <div className="flex flex-col sm:flex-row gap-4 py-4 border-b border-gray-200 dark:border-gray-700">
                    {/* Stats */}
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="dark:text-gray-300">{participants.length} totali</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span className="dark:text-gray-300">{participantsWithoutLogin.length} mai loggati</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="dark:text-gray-300">{participantsWithLogin.length} attivi</span>
                        </div>
                    </div>

                    {/* Selezione rapida */}
                    <div className="flex items-center gap-2 ml-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={selectOnlyWithoutLogin}
                            className="text-xs"
                        >
                            Seleziona solo nuovi
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadParticipantsStatus}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Warning utenti attivi selezionati */}
                {hasActiveUsersSelected && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-amber-700 dark:text-amber-300 text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>
                            Attenzione: hai selezionato utenti già attivi. Invierai loro un reset password.
                        </span>
                    </div>
                )}

                {/* Tabella partecipanti */}
                <div className="flex-1 overflow-auto min-h-[300px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                    ) : participants.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                            <p>Nessun partecipante iscritto a questo corso</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <Checkbox
                                            checked={selectedIds.size === participants.length}
                                            onCheckedChange={toggleAllSelection}
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Partecipante
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Cellulare
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Stato
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Azioni
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {participants.map((participant) => {
                                    const isEditing = editingId === participant.personId;
                                    const isSelected = selectedIds.has(participant.personId);
                                    const rowBg = participant.hasLoggedIn
                                        ? 'bg-green-50/50 dark:bg-green-900/10'
                                        : '';

                                    return (
                                        <tr key={participant.personId} className={`${rowBg} hover:bg-gray-50 dark:hover:bg-gray-700/30`}>
                                            <td className="px-4 py-3">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelection(participant.personId)}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                                    {participant.firstName} {participant.lastName}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <input
                                                        type="email"
                                                        value={editValues.email ?? participant.email ?? ''}
                                                        onChange={(e) => setEditValues(v => ({ ...v, email: e.target.value }))}
                                                        className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                                                        placeholder="email@esempio.it"
                                                    />
                                                ) : participant.email ? (
                                                    <span className="text-sm text-gray-600 dark:text-gray-300">{participant.email}</span>
                                                ) : (
                                                    <span className="text-sm text-orange-500 italic">Non impostata</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <input
                                                        type="tel"
                                                        value={editValues.phone ?? participant.phone ?? ''}
                                                        onChange={(e) => setEditValues(v => ({ ...v, phone: e.target.value }))}
                                                        className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                                                        placeholder="+39 333 1234567"
                                                    />
                                                ) : participant.phone ? (
                                                    <span className="text-sm text-gray-600 dark:text-gray-300">{participant.phone}</span>
                                                ) : (
                                                    <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {participant.hasLoggedIn ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        <Check className="h-3 w-3" />
                                                        Attivo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Mai loggato
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleSaveContact(participant.personId)}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                                                                title="Salva"
                                                            >
                                                                <Save className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => { setEditingId(null); setEditValues({}); }}
                                                                className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                                title="Annulla"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <ActionButton
                                                            theme="blue"
                                                            actions={[
                                                                {
                                                                    label: 'Modifica contatti',
                                                                    icon: <Edit2 className="h-4 w-4" />,
                                                                    onClick: () => {
                                                                        setEditingId(participant.personId);
                                                                        setEditValues({
                                                                            email: participant.email || '',
                                                                            phone: participant.phone || ''
                                                                        });
                                                                    }
                                                                },
                                                                {
                                                                    label: 'Scarica card',
                                                                    icon: <Download className="h-4 w-4" />,
                                                                    onClick: () => handleDownloadCard(participant.personId)
                                                                },
                                                                ...(participant.email ? [{
                                                                    label: 'Invia credenziali via email',
                                                                    icon: <Send className="h-4 w-4" />,
                                                                    onClick: () => handleSendSingle(participant.personId)
                                                                }] : []),
                                                                ...(participant.phone ? [{
                                                                    label: 'Contatta su WhatsApp',
                                                                    icon: <MessageCircle className="h-4 w-4" />,
                                                                    onClick: () => window.open(`https://wa.me/${participant.phone!.replace(/\D/g, '')}`, '_blank')
                                                                }] : []),
                                                                {
                                                                    label: 'Genera nuova password',
                                                                    icon: <RefreshCw className="h-4 w-4" />,
                                                                    onClick: () => handleResetPassword(participant.personId)
                                                                }
                                                            ]}
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer con azioni batch */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedIds.size > 0 ? (
                            <>
                                <span className="font-medium text-gray-900 dark:text-gray-100">{selectedIds.size}</span>
                                {' '}selezionati
                                {selectedWithEmail.length > 0 && (
                                    <span> ({selectedWithEmail.length} con email)</span>
                                )}
                            </>
                        ) : (
                            'Seleziona partecipanti per azioni batch'
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Chiudi
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleDownloadBatch}
                            disabled={selectedIds.size === 0 || downloadingBatch}
                            className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                            {downloadingBatch
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Download className="h-4 w-4" />}
                            Scarica card ({selectedIds.size})
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleSendBatch}
                            disabled={selectedWithEmail.length === 0 || sendingBatch}
                            className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
                        >
                            {sendingBatch
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Mail className="h-4 w-4" />}
                            Invia email ({selectedWithEmail.length})
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ParticipantCredentialsModal;
