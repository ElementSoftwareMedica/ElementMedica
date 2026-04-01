/**
 * P68 - Turni Page
 * Gestione turni assegnati al personale
 * - Visualizzazione calendario turni
 * - Assegnazione turni (manager)
 * - Templates turni
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Filter,
    Plus,
    AlertCircle,
    Clock,
    X,
    Save,
    User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { useTenantFilter } from '@/context/TenantFilterContext';
import { CRUDButton, CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import {
    turniApi,
    profiliHRApi,
    type TurnoAssegnato,
    type TurnoTemplate,
    type ProfiloHR,
    type StatoTurno,
    TIPO_TURNO_LABELS,
    STATO_TURNO_LABELS,
} from './api';

// Helper per i colori dei tipi turno
const TURNO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    MATTINA: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    POMERIGGIO: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    GIORNATA: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    NOTTURNO: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
    SPEZZATO: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    REPERIBILITA: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
    STRAORDINARIO: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};

// Helper per generare i giorni del mese
function getDaysInMonth(year: number, month: number): Date[] {
    const days: Date[] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
    }

    return days;
}

// Modal per assegnare un turno
interface AssegnaTurnoModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: Date;
    profili: ProfiloHR[];
    templates: TurnoTemplate[];
    onSave: (turno: Partial<TurnoAssegnato>) => void;
}

const AssegnaTurnoModal: React.FC<AssegnaTurnoModalProps> = ({
    isOpen,
    onClose,
    data,
    profili,
    templates,
    onSave,
}) => {
    const [profiloHRId, setProfiloHRId] = useState('');
    const [turnoTemplateId, setTurnoTemplateId] = useState('');
    const [oraInizio, setOraInizio] = useState('09:00');
    const [oraFine, setOraFine] = useState('18:00');
    const [note, setNote] = useState('');

    if (!isOpen) return null;

    const selectedTemplate = templates.find((t) => t.id === turnoTemplateId);

    const handleTemplateChange = (templateId: string) => {
        setTurnoTemplateId(templateId);
        const template = templates.find((t) => t.id === templateId);
        if (template) {
            setOraInizio(template.oraInizio);
            setOraFine(template.oraFine);
        }
    };

    const handleSave = () => {
        if (!profiloHRId) return;

        onSave({
            profiloHRId,
            turnoTemplateId: turnoTemplateId || undefined,
            data: data.toISOString().split('T')[0],
            oraInizio,
            oraFine,
            stato: 'PROGRAMMATO' as StatoTurno,
            note: note || undefined,
            orePreviste: calculateHours(oraInizio, oraFine),
        });
    };

    const calculateHours = (start: string, end: string): number => {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        return (eh * 60 + em - sh * 60 - sm) / 60;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Assegna Turno - {data.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Dipendente */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Dipendente *
                        </label>
                        <select
                            value={profiloHRId}
                            onChange={(e) => setProfiloHRId(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="">Seleziona dipendente</option>
                            {profili.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.personTenantProfile?.person?.firstName} {p.personTenantProfile?.person?.lastName}
                                    {p.mansioneInterna ? ` - ${p.mansioneInterna.nome}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Template turno */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo turno (opzionale)
                        </label>
                        <select
                            value={turnoTemplateId}
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="">Personalizzato</option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.nome} ({t.oraInizio} - {t.oraFine})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Orari */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ora inizio
                            </label>
                            <input
                                type="time"
                                value={oraInizio}
                                onChange={(e) => setOraInizio(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ora fine
                            </label>
                            <input
                                type="time"
                                value={oraFine}
                                onChange={(e) => setOraFine(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Note (opzionale)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                            placeholder="Es: turno aggiuntivo per copertura"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <CRUDButton variant="outline" onClick={onClose}>
                        Annulla
                    </CRUDButton>
                    <CRUDPrimaryButton theme="violet" onClick={handleSave} disabled={!profiloHRId}>
                        <Save className="w-4 h-4" />
                        Assegna
                    </CRUDPrimaryButton>
                </div>
            </div>
        </div>
    );
};

// Componente principale
const TurniPage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // P69 Session 5.10: Add tenant filter to prevent cross-tenant data leakage
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    // State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedMansione, setSelectedMansione] = useState<string>('');
    const [modalData, setModalData] = useState<{ isOpen: boolean; data: Date | null }>({
        isOpen: false,
        data: null,
    });

    // Determina se l'utente è manager
    const isManager = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    const anno = currentDate.getFullYear();
    const mese = currentDate.getMonth() + 1;
    const dataInizio = new Date(anno, mese - 1, 1).toISOString().split('T')[0];
    const dataFine = new Date(anno, mese, 0).toISOString().split('T')[0];

    // P69 Session 5.10: Add tenant filter to profili query
    const { data: profiliData } = useQuery({
        queryKey: ['hr', 'profili', 'list', tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            const params: Record<string, unknown> = { isActive: true };
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            return profiliHRApi.list(params);
        },
        enabled: isManager && isReady,
    });

    // Fetch templates turni
    const { data: templatesData } = useQuery({
        queryKey: ['hr', 'turni', 'templates', tenantFilterKey],
        queryFn: () => turniApi.listTemplates({ isActive: true }),
        enabled: isManager && isReady,
    });

    // P69 Session 5.10: Add tenant filter to turni calendario query
    const { data: turniData, isLoading } = useQuery({
        queryKey: ['hr', 'turni', 'calendario', tenantFilterKey, anno, mese],
        queryFn: () => turniApi.getCalendario({ dataInizio, dataFine }),
        enabled: isReady,
    });

    // Mutation per creare turno
    const createTurnoMutation = useMutation({
        mutationFn: (data: Partial<TurnoAssegnato>) => turniApi.createTurno(data),
        onSuccess: () => {
            showToast({ message: 'Turno assegnato', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['hr', 'turni'] });
            setModalData({ isOpen: false, data: null });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        },
    });

    // Dati per il calendario
    const days = useMemo(() => getDaysInMonth(anno, mese - 1), [anno, mese]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // P69 Session 5.10: turniData.data.calendario è un oggetto { [date: string]: TurnoAssegnato[] }
    // Il backend restituisce già i dati raggruppati per data
    const turniMap = useMemo(() => {
        const map = new Map<string, TurnoAssegnato[]>();
        // turniData.data è { dataInizio, dataFine, calendario, totale }
        const calendario = turniData?.data?.calendario;
        if (calendario && typeof calendario === 'object') {
            Object.entries(calendario).forEach(([dateKey, turni]) => {
                if (Array.isArray(turni)) {
                    map.set(dateKey, turni as TurnoAssegnato[]);
                }
            });
        }
        return map;
    }, [turniData]);

    // Navigazione mese
    const goToPrevMonth = () => {
        setCurrentDate(new Date(anno, mese - 2, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(anno, mese, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Handler salvataggio
    const handleSaveTurno = (turno: Partial<TurnoAssegnato>) => {
        createTurnoMutation.mutate(turno);
    };

    // Render legenda
    const renderLegenda = () => (
        <div className="flex flex-wrap gap-3 text-sm">
            {Object.entries(TIPO_TURNO_LABELS).map(([key, label]) => {
                const colors = TURNO_COLORS[key] || { bg: 'bg-gray-100', text: 'text-gray-800' };
                return (
                    <div key={key} className="flex items-center gap-1">
                        <div className={`w-4 h-4 rounded ${colors.bg}`} />
                        <span className="text-gray-600">{label}</span>
                    </div>
                );
            })}
        </div>
    );

    // Render cella turno
    const renderTurnoCell = (turni: TurnoAssegnato[]) => {
        if (!turni?.length) return null;

        return turni.map((turno) => {
            const tipoTurno = turno.turnoTemplate?.tipoTurno || 'GIORNATA';
            const colors = TURNO_COLORS[tipoTurno] || TURNO_COLORS.GIORNATA;
            const nome = turno.profiloHR?.personTenantProfile?.person;

            return (
                <div
                    key={turno.id}
                    className={`text-xs p-1 mb-1 rounded ${colors.bg} ${colors.text} truncate`}
                    title={`${nome?.firstName} ${nome?.lastName} - ${turno.oraInizio}-${turno.oraFine}`}
                >
                    <span className="font-medium">{nome?.firstName?.charAt(0)}{nome?.lastName?.charAt(0)}</span>
                    <span className="ml-1">{turno.oraInizio?.slice(0, 5)}</span>
                </div>
            );
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestione Turni</h1>
                    <p className="text-gray-600 mt-1">
                        Pianifica e gestisci i turni del personale
                    </p>
                </div>
                {isManager && (
                    <CRUDPrimaryButton theme="violet" onClick={() => setModalData({ isOpen: true, data: new Date() })}>
                        <Plus className="w-4 h-4" />
                        Assegna Turno
                    </CRUDPrimaryButton>
                )}
            </div>

            {/* Navigazione mese */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <CRUDButton variant="secondary" onClick={goToPrevMonth}>
                            <ChevronLeft className="w-5 h-5" />
                        </CRUDButton>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                        </h2>
                        <CRUDButton variant="secondary" onClick={goToNextMonth}>
                            <ChevronRight className="w-5 h-5" />
                        </CRUDButton>
                        <CRUDButton variant="secondary" onClick={goToToday}>
                            Oggi
                        </CRUDButton>
                    </div>
                </div>
            </div>

            {/* Legenda */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Legenda Turni</span>
                </div>
                {renderLegenda()}
            </div>

            {/* Calendario */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-7 gap-1">
                        {/* Header giorni settimana */}
                        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
                            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                {day}
                            </div>
                        ))}

                        {/* Celle vuote per allineare */}
                        {Array.from({ length: (days[0]?.getDay() || 7) - 1 }).map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-[100px] bg-gray-50 rounded-lg" />
                        ))}

                        {/* Giorni del mese */}
                        {days.map((day) => {
                            const dateKey = day.toISOString().split('T')[0];
                            const turniGiorno = turniMap.get(dateKey) || [];
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                            const isToday = day.getTime() === today.getTime();

                            return (
                                <div
                                    key={dateKey}
                                    onClick={() => {
                                        if (isManager) {
                                            setModalData({ isOpen: true, data: day });
                                        }
                                    }}
                                    className={`
                    min-h-[100px] p-2 rounded-lg border-2 cursor-pointer transition-all
                    ${isWeekend ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}
                    ${isToday ? 'ring-2 ring-violet-500' : ''}
                    ${isManager ? 'hover:border-violet-300 hover:shadow-sm' : ''}
                  `}
                                >
                                    <div className="text-sm font-medium text-gray-700 mb-1">
                                        {day.getDate()}
                                    </div>
                                    <div className="space-y-1">
                                        {renderTurnoCell(turniGiorno)}
                                    </div>
                                    {isManager && turniGiorno.length === 0 && (
                                        <div className="text-xs text-gray-400 flex items-center justify-center h-8">
                                            <Plus className="w-3 h-3 mr-1" />
                                            Aggiungi
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal assegnazione turno */}
            {modalData.data && isManager && (
                <AssegnaTurnoModal
                    isOpen={modalData.isOpen}
                    onClose={() => setModalData({ isOpen: false, data: null })}
                    data={modalData.data}
                    profili={profiliData?.data || []}
                    templates={templatesData?.data || []}
                    onSave={handleSaveTurno}
                />
            )}
        </div>
    );
};

export default TurniPage;
