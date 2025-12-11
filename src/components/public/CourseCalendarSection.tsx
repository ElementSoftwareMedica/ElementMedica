/**
 * CourseCalendarSection
 * 
 * Componente elegante per visualizzare il calendario dei corsi pubblici programmati.
 * Mostra i prossimi corsi in un formato visivamente accattivante con date, orari e dettagli.
 */

import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, MapPin, Users, ChevronRight,
    BookOpen, Award, Monitor, Building2, Loader2,
    CalendarDays, ArrowRight
} from 'lucide-react';
import { PublicButton } from './PublicButton';

interface CourseSchedule {
    id: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    location: string;
    mode: 'aula' | 'videoconferenza' | 'e-learning' | 'blended';
    availableSeats: number;
    totalSeats: number;
    price: number;
    course: {
        id: string;
        title: string;
        category: string;
        duration: number;
        certifications: string[];
    };
}

interface CourseCalendarSectionProps {
    tenantId: string;
    maxItems?: number;
}

const modeIcons: Record<string, React.ElementType> = {
    'aula': Building2,
    'videoconferenza': Monitor,
    'e-learning': Monitor,
    'blended': BookOpen
};

const modeLabels: Record<string, string> = {
    'aula': 'In Aula',
    'videoconferenza': 'Videoconferenza',
    'e-learning': 'E-Learning',
    'blended': 'Blended'
};

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    'sicurezza-base': { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-400/30' },
    'sicurezza-specifica': { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-400/30' },
    'antincendio': { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-400/30' },
    'primo-soccorso': { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-400/30' },
    'rspp': { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-400/30' },
    'rls': { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-400/30' },
    'default': { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-400/30' }
};

export const CourseCalendarSection: React.FC<CourseCalendarSectionProps> = ({
    tenantId,
    maxItems = 6
}) => {
    const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>('all');

    useEffect(() => {
        fetchSchedules();
    }, [tenantId]);

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            // Use the public schedules endpoint with from/to dates
            const fromDate = new Date().toISOString();
            const toDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // +3 months

            const response = await fetch(`/api/public/schedules?from=${fromDate}&to=${toDate}&limit=${maxItems * 2}`);

            if (!response.ok) {
                // If endpoint doesn't exist or no data, show placeholders
                setSchedules([]);
                return;
            }

            const result = await response.json();

            if (result.success && result.data) {
                // Map API response to CourseSchedule format
                const mappedSchedules: CourseSchedule[] = result.data.map((item: any) => ({
                    id: item.id,
                    startDate: item.startDate,
                    endDate: item.endDate,
                    startTime: new Date(item.startDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
                    endTime: new Date(item.endDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
                    location: item.location || 'Da definire',
                    mode: mapDeliveryMode(item.deliveryMode),
                    availableSeats: item.availableSpots ?? item.maxParticipants ?? 20,
                    totalSeats: item.maxParticipants ?? 20,
                    price: item.course?.price || 0,
                    course: {
                        id: item.course?.id || '',
                        title: item.course?.title || 'Corso',
                        category: item.course?.category || 'formazione',
                        duration: item.course?.duration || 8,
                        certifications: item.course?.certifications || ['D.Lgs. 81/08']
                    }
                }));
                setSchedules(mappedSchedules);
            } else {
                setSchedules([]);
            }
        } catch (err) {
            console.error('Error fetching course schedules:', err);
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    };

    // Map delivery mode from DB to component format
    const mapDeliveryMode = (mode: string | null): 'aula' | 'videoconferenza' | 'e-learning' | 'blended' => {
        if (!mode) return 'aula';
        const modeMap: Record<string, 'aula' | 'videoconferenza' | 'e-learning' | 'blended'> = {
            'IN_PERSON': 'aula',
            'ONLINE': 'videoconferenza',
            'HYBRID': 'blended',
            'ELEARNING': 'e-learning',
            'E_LEARNING': 'e-learning'
        };
        return modeMap[mode] || 'aula';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
            day: date.getDate(),
            month: date.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase(),
            weekday: date.toLocaleDateString('it-IT', { weekday: 'short' }),
            full: date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
        };
    };

    const getCategoryColor = (category: string) => {
        const normalizedCategory = category?.toLowerCase().replace(/\s+/g, '-') || 'default';
        return categoryColors[normalizedCategory] || categoryColors.default;
    };

    // Demo data per quando non ci sono schedules reali
    const demoSchedules: CourseSchedule[] = [
        {
            id: 'demo-1',
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            startTime: '09:00',
            endTime: '18:00',
            location: 'Milano',
            mode: 'aula',
            availableSeats: 8,
            totalSeats: 15,
            price: 150,
            course: {
                id: 'c1',
                title: 'Formazione Generale Lavoratori',
                category: 'sicurezza-base',
                duration: 4,
                certifications: ['D.Lgs. 81/08']
            }
        },
        {
            id: 'demo-2',
            startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
            startTime: '09:00',
            endTime: '13:00',
            location: 'Online',
            mode: 'videoconferenza',
            availableSeats: 20,
            totalSeats: 30,
            price: 180,
            course: {
                id: 'c2',
                title: 'Formazione Specifica Rischio Medio',
                category: 'sicurezza-specifica',
                duration: 8,
                certifications: ['D.Lgs. 81/08', 'Accordo Stato-Regioni']
            }
        },
        {
            id: 'demo-3',
            startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            startTime: '14:00',
            endTime: '18:00',
            location: 'Roma',
            mode: 'aula',
            availableSeats: 5,
            totalSeats: 12,
            price: 120,
            course: {
                id: 'c3',
                title: 'Antincendio Rischio Basso',
                category: 'antincendio',
                duration: 4,
                certifications: ['DM 10/03/1998']
            }
        },
        {
            id: 'demo-4',
            startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
            startTime: '09:00',
            endTime: '18:00',
            location: 'Online',
            mode: 'videoconferenza',
            availableSeats: 15,
            totalSeats: 25,
            price: 350,
            course: {
                id: 'c4',
                title: 'Primo Soccorso Gruppo B-C',
                category: 'primo-soccorso',
                duration: 12,
                certifications: ['DM 388/2003']
            }
        },
        {
            id: 'demo-5',
            startDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            startTime: '09:00',
            endTime: '18:00',
            location: 'Milano',
            mode: 'blended',
            availableSeats: 10,
            totalSeats: 20,
            price: 800,
            course: {
                id: 'c5',
                title: 'RSPP Datore di Lavoro - Rischio Medio',
                category: 'rspp',
                duration: 32,
                certifications: ['D.Lgs. 81/08', 'Accordo Stato-Regioni']
            }
        },
        {
            id: 'demo-6',
            startDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
            startTime: '09:00',
            endTime: '18:00',
            location: 'Torino',
            mode: 'aula',
            availableSeats: 12,
            totalSeats: 15,
            price: 450,
            course: {
                id: 'c6',
                title: 'RLS - Rappresentante dei Lavoratori',
                category: 'rls',
                duration: 32,
                certifications: ['D.Lgs. 81/08']
            }
        }
    ];

    const displaySchedules = schedules.length > 0 ? schedules : demoSchedules;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="ml-3 text-blue-200">Caricamento calendario...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header con filtri mese */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-6 h-6 text-cyan-400" />
                    <span className="text-lg font-semibold text-white">
                        {displaySchedules.length} corsi in programmazione
                    </span>
                </div>

                {/* Month Pills */}
                <div className="flex flex-wrap gap-2">
                    {['all', 'dicembre', 'gennaio', 'febbraio'].map((month) => (
                        <button
                            key={month}
                            onClick={() => setSelectedMonth(month)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedMonth === month
                                    ? 'bg-cyan-500 text-white'
                                    : 'bg-white/10 text-blue-200 hover:bg-white/20'
                                }`}
                        >
                            {month === 'all' ? 'Tutti' : month.charAt(0).toUpperCase() + month.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Course Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displaySchedules.slice(0, maxItems).map((schedule) => {
                    const dateInfo = formatDate(schedule.startDate);
                    const ModeIcon = modeIcons[schedule.mode] || Monitor;
                    const colors = getCategoryColor(schedule.course.category);
                    const seatsPercentage = ((schedule.totalSeats - schedule.availableSeats) / schedule.totalSeats) * 100;

                    return (
                        <div
                            key={schedule.id}
                            className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                        >
                            {/* Date Header */}
                            <div className="flex items-stretch">
                                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-4 flex flex-col items-center justify-center min-w-[80px]">
                                    <span className="text-3xl font-bold text-white">{dateInfo.day}</span>
                                    <span className="text-sm font-medium text-cyan-100">{dateInfo.month}</span>
                                </div>
                                <div className="flex-1 p-4">
                                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border} mb-2`}>
                                        {schedule.course.category.replace(/-/g, ' ')}
                                    </div>
                                    <h3 className="font-semibold text-white text-lg leading-tight group-hover:text-cyan-300 transition-colors">
                                        {schedule.course.title}
                                    </h3>
                                </div>
                            </div>

                            {/* Course Details */}
                            <div className="p-4 pt-0 space-y-3">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center text-blue-200">
                                        <Clock className="w-4 h-4 mr-2 text-cyan-400" />
                                        {schedule.startTime} - {schedule.endTime}
                                    </div>
                                    <div className="flex items-center text-blue-200">
                                        <BookOpen className="w-4 h-4 mr-2 text-cyan-400" />
                                        {schedule.course.duration}h totali
                                    </div>
                                    <div className="flex items-center text-blue-200">
                                        <ModeIcon className="w-4 h-4 mr-2 text-cyan-400" />
                                        {modeLabels[schedule.mode]}
                                    </div>
                                    <div className="flex items-center text-blue-200">
                                        <MapPin className="w-4 h-4 mr-2 text-cyan-400" />
                                        {schedule.location}
                                    </div>
                                </div>

                                {/* Seats Progress */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-blue-300">
                                            <Users className="w-3 h-3 inline mr-1" />
                                            {schedule.availableSeats} posti disponibili
                                        </span>
                                        <span className="text-blue-300">{schedule.totalSeats} totali</span>
                                    </div>
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${schedule.availableSeats <= 3 ? 'bg-orange-500' : 'bg-cyan-500'
                                                }`}
                                            style={{ width: `${seatsPercentage}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Price and CTA */}
                                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                    <div>
                                        <span className="text-2xl font-bold text-white">€{schedule.price}</span>
                                        <span className="text-blue-300 text-sm ml-1">+ IVA</span>
                                    </div>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium transition-colors">
                                        Prenota
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Certifications */}
                                {schedule.course.certifications && schedule.course.certifications.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-2">
                                        {schedule.course.certifications.map((cert, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center text-xs text-green-300 bg-green-500/10 px-2 py-0.5 rounded"
                                            >
                                                <Award className="w-3 h-3 mr-1" />
                                                {cert}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* View All CTA */}
            <div className="text-center pt-8">
                <PublicButton
                    variant="outline"
                    size="lg"
                    to="/contatti"
                    className="border-white/30 text-white hover:bg-white/10"
                >
                    Richiedi Calendario Completo
                    <ArrowRight className="w-5 h-5 ml-2" />
                </PublicButton>
                <p className="text-blue-300 text-sm mt-3">
                    Contattaci per ricevere il calendario aggiornato e prenotare il tuo posto
                </p>
            </div>
        </div>
    );
};

export default CourseCalendarSection;
