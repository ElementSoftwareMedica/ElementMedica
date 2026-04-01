/**
 * DisponibilitaPage - Gestione disponibilità medici (versione ristrutturata)
 * 
 * Visualizzazione a griglia di card dei medici con preview delle disponibilità.
 * Click su una card apre la vista dettaglio del medico.
 * Supporta URL-based navigation: /disponibilita/:medicoId
 * 
 * @module pages/clinica/agenda/disponibilita
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw, Users } from 'lucide-react';
import { MediciGrid } from './components/MediciGrid';
import { MedicoDetail } from './components/MedicoDetail';
import { useDisponibilitaData } from './hooks/useDisponibilitaData';
import { disponibilitaApi } from '../../../../services/clinicaApi';
import type { MedicoWithStats, ViewMode } from './types';

export const DisponibilitaPage: React.FC = () => {
    const { medicoId } = useParams<{ medicoId?: string }>();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [selectedMedico, setSelectedMedico] = useState<MedicoWithStats | null>(null);

    // Data hook
    const {
        mediciWithStats,
        ambulatori,
        isLoading,
        isReady,
        getDisponibilitaByMedico,
        getSlotsByMedico,
        getFerieByMedico,
        createSlot,
        updateSlot,
        deleteSlot,
        createSingleSlot,
        deleteSingleSlot,
        createFerie,
        deleteFerie,
        isCreating,
        isDeleting
    } = useDisponibilitaData();

    // Auto-select medico when URL has :medicoId param
    useEffect(() => {
        if (isReady && medicoId && mediciWithStats.length > 0) {
            const medico = mediciWithStats.find(m => m.id === medicoId);
            if (medico) {
                setSelectedMedico(medico);
                setViewMode('detail');
            }
        }
    }, [isReady, medicoId, mediciWithStats]);

    // Handle medico selection
    const handleSelectMedico = (medico: MedicoWithStats) => {
        setSelectedMedico(medico);
        setViewMode('detail');
        // Update URL for sharing/bookmarking
        navigate(`/poliambulatorio/disponibilita/${medico.id}`, { replace: true });
    };

    // Handle back to grid
    const handleBack = () => {
        setSelectedMedico(null);
        setViewMode('grid');
        // Remove medicoId from URL
        navigate('/poliambulatorio/disponibilita', { replace: true });
    };

    // Get data for selected medico
    const selectedMedicoData = useMemo(() => {
        if (!selectedMedico) return null;

        return {
            disponibilita: getDisponibilitaByMedico(selectedMedico.id),
            slots: getSlotsByMedico(selectedMedico.id),
            ferie: getFerieByMedico(selectedMedico.id)
        };
    }, [selectedMedico, getDisponibilitaByMedico, getSlotsByMedico, getFerieByMedico]);

    // Loading state
    if (!isReady) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header - only show in grid mode */}
            {viewMode === 'grid' && (
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
                                <Calendar className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Disponibilità Medici
                                </h1>
                                <p className="text-gray-500 text-sm">
                                    Gestisci orari e assenze del personale medico
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-5 w-5" />
                        <span className="font-medium">{mediciWithStats.length}</span>
                        <span>medici</span>
                    </div>
                </div>
            )}

            {/* Content */}
            {viewMode === 'grid' ? (
                <MediciGrid
                    medici={mediciWithStats}
                    onSelectMedico={handleSelectMedico}
                    selectedMedicoId={selectedMedico?.id}
                    isLoading={isLoading}
                />
            ) : selectedMedico && selectedMedicoData ? (
                <MedicoDetail
                    medico={selectedMedico}
                    disponibilita={selectedMedicoData.disponibilita}
                    slots={selectedMedicoData.slots}
                    ferie={selectedMedicoData.ferie}
                    ambulatori={ambulatori}
                    onBack={handleBack}
                    onCreateSlot={(data) => createSlot(data as unknown as Parameters<typeof createSlot>[0])}
                    onUpdateSlot={(id, data) => updateSlot(id, data as unknown as Parameters<typeof updateSlot>[1])}
                    onDeleteSlot={deleteSlot}
                    onCreateSingleSlot={(data) => createSingleSlot(data as unknown as Parameters<typeof createSingleSlot>[0])}
                    onDeleteSingleSlot={deleteSingleSlot}
                    onCreateFerie={createFerie}
                    onDeleteFerie={deleteFerie}
                    onGenerateSlots={async (medicoId, dataInizio, dataFine) => {
                        return disponibilitaApi.generateSlots(medicoId, dataInizio, dataFine);
                    }}
                    isLoading={isCreating || isDeleting}
                />
            ) : null}
        </div>
    );
};

// Re-export for backward compatibility
export default DisponibilitaPage;
