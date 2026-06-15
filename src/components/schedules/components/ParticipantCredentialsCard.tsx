/**
 * ParticipantCredentialsCard Component
 * 
 * Card compatta per gestire le credenziali dei partecipanti al corso.
 * Mostra un riepilogo con pulsante per aprire il modal completo.
 * 
 * @module components/schedules/ParticipantCredentialsCard
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    KeyRound,
    Users,
    CheckCircle,
    AlertCircle,
    Loader2,
    Settings
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import api from '../../../services/api';
import { ParticipantCredentialsModal } from './ParticipantCredentialsModal';

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

interface ParticipantCredentialsCardProps {
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

export const ParticipantCredentialsCard: React.FC<ParticipantCredentialsCardProps> = ({
    scheduleId,
    enrollments = [],
    onUpdate
}) => {
    const [loading, setLoading] = useState(false);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [modalOpen, setModalOpen] = useState(false);

    // Stabilize enrollments by storing in ref - only update when IDs actually change
    const enrollmentsRef = useRef(enrollments);
    const currentIds = useMemo(() =>
        enrollments.map(e => e.person.id).sort().join(','),
        [enrollments]
    );
    const prevIdsRef = useRef<string>('');

    // Only update ref when IDs actually change
    if (currentIds !== prevIdsRef.current) {
        enrollmentsRef.current = enrollments;
        prevIdsRef.current = currentIds;
    }

    // Track if initial load is done to prevent StrictMode double call
    const isLoadingRef = useRef(false);
    const lastLoadedIdsRef = useRef<string>('');

    // Carica lo stato di login dei partecipanti
    const loadParticipantsStatus = useCallback(async (forceReload = false) => {
        const stableEnrollments = enrollmentsRef.current;
        const stableIds = prevIdsRef.current;

        if (!scheduleId || stableEnrollments.length === 0) {
            return;
        }

        // Prevent concurrent calls and duplicate calls for same data
        if (isLoadingRef.current) {
            return;
        }

        if (!forceReload && lastLoadedIdsRef.current === stableIds) {
            return;
        }

        isLoadingRef.current = true;
        setLoading(true);

        try {
            const personIds = stableEnrollments.map(e => e.person.id);
            const response = await api.post('/api/v1/credentials/participants-status', { personIds });

            if (response.data?.success) {
                const statusMap = new Map(
                    response.data.data.map((p: any) => [p.personId, p])
                );

                const mapped = stableEnrollments.map(e => {
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
                lastLoadedIdsRef.current = stableIds;
            }
        } catch (error) {
            const mapped = stableEnrollments.map(e => ({
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
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [scheduleId]); // Only scheduleId - enrollments accessed via ref

    // Load on mount or when currentIds change (actual data change)
    useEffect(() => {
        if (currentIds && currentIds !== lastLoadedIdsRef.current) {
            loadParticipantsStatus();
        }
    }, [currentIds, loadParticipantsStatus]);

    // Statistiche
    const participantsWithoutLogin = participants.filter(p => !p.hasLoggedIn);
    const participantsWithLogin = participants.filter(p => p.hasLoggedIn);
    const participantsWithEmail = participants.filter(p => p.email);

    // Non mostrare la card se non ci sono partecipanti
    if (participants.length === 0 && !loading) {
        return null;
    }

    const handleModalClose = (open: boolean) => {
        setModalOpen(open);
        if (!open) {
            // Force reload when modal closes
            loadParticipantsStatus(true);
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30">
                {/* Header compatto */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-50 flex items-center">
                            <KeyRound className="h-5 w-5 mr-2" />
                            Credenziali Partecipanti
                        </h2>
                    </div>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            {/* Statistiche inline */}
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            {participants.length}
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                                            partecipanti
                                        </span>
                                    </div>
                                </div>

                                {participantsWithoutLogin.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-orange-500" />
                                        <div>
                                            <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                                {participantsWithoutLogin.length}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                                                da attivare
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {participantsWithLogin.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <div>
                                            <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                                {participantsWithLogin.length}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                                                attivi
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pulsante gestione */}
                            <Button
                                variant="primary"
                                onClick={() => setModalOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                Gestisci Credenziali
                            </Button>
                        </div>
                    )}

                    {/* Info aggiuntiva se ci sono partecipanti senza email */}
                    {!loading && participantsWithoutLogin.length > 0 && (
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                <AlertCircle className="h-4 w-4 inline mr-1" />
                                {participantsWithoutLogin.length === 1
                                    ? '1 partecipante non ha ancora effettuato il primo accesso.'
                                    : `${participantsWithoutLogin.length} partecipanti non hanno ancora effettuato il primo accesso.`
                                }
                                {' '}
                                {participantsWithEmail.length < participants.length && (
                                    <span>
                                        {participants.length - participantsWithEmail.length === 1
                                            ? '1 utente è senza email configurata.'
                                            : `${participants.length - participantsWithEmail.length} utenti sono senza email configurata.`
                                        }
                                    </span>
                                )}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal gestione completa */}
            <ParticipantCredentialsModal
                open={modalOpen}
                onOpenChange={handleModalClose}
                scheduleId={scheduleId}
                enrollments={enrollments}
                onUpdate={onUpdate}
            />
        </>
    );
};

export default ParticipantCredentialsCard;
