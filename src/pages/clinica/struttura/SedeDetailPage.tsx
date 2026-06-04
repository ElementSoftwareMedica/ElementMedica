/**
 * SedeDetailPage
 * 
 * Pagina di visualizzazione dettaglio sede (read-only).
 * Mostra tutte le informazioni in modo elegante senza possibilità di modifica.
 * 
 * @module pages/poliambulatorio/struttura/SedeDetailPage
 */

import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    ArrowLeft,
    Edit,
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle,
    Hash,
    Calendar,
    User,
    Star,
    Stethoscope,
    Clock,
    CalendarX,
    DoorOpen,
    Plus,
    X
} from 'lucide-react';
import { clinicaApi, type ChiusuraSpecialeSedeInput } from '../../../services/clinicaApi';
import { formatMedicoName } from '../../../utils/textFormatters';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { TimePickerElegante } from '../../../components/ui/TimePickerElegante';
import { useToast } from '../../../hooks/useToast';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

const SedeDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { id } = useParams<{ id: string }>();
    const [showChiusuraModal, setShowChiusuraModal] = useState(false);
    const [chiusuraForm, setChiusuraForm] = useState({
        nome: '',
        tipo: 'STRAORDINARIA',
        descrizione: '',
        dataInizio: '',
        dataFine: '',
        isParziale: false,
        oraInizio: '',
        oraFine: '',
        ricorrente: false,
    });

    // Load sede data
    const { data: sede, isLoading, error } = useQuery({
        queryKey: ['sede', id],
        queryFn: () => clinicaApi.sedi.getById(id!),
        enabled: Boolean(id)
    });

    const addChiusuraMutation = useMutation({
        mutationFn: async () => {
            if (!id || !sede) throw new Error('Sede non disponibile');
            if (!chiusuraForm.nome || !chiusuraForm.dataInizio) throw new Error('Nome e data inizio sono obbligatori');
            const normalizeDate = (value: string) => value ? value.split('T')[0] : '';
            const existingChiusure: ChiusuraSpecialeSedeInput[] = (sede.chiusureSpeciali || []).map(c => ({
                id: c.id,
                tipo: c.tipo,
                nome: c.nome,
                descrizione: c.descrizione || undefined,
                dataInizio: normalizeDate(c.dataInizio),
                dataFine: normalizeDate(c.dataFine || c.dataInizio),
                oraInizio: c.isParziale ? c.oraInizio : undefined,
                oraFine: c.isParziale ? c.oraFine : undefined,
                isParziale: Boolean(c.isParziale),
                ricorrente: Boolean(c.ricorrente),
                annoRiferimento: c.annoRiferimento,
                attivo: c.attivo !== false,
            }));
            return clinicaApi.sedi.update(id, {
                chiusureSpeciali: [
                    ...existingChiusure,
                    {
                        tipo: chiusuraForm.tipo as any,
                        nome: chiusuraForm.nome.trim(),
                        descrizione: chiusuraForm.descrizione.trim() || undefined,
                        dataInizio: chiusuraForm.dataInizio,
                        dataFine: chiusuraForm.dataFine || chiusuraForm.dataInizio,
                        oraInizio: chiusuraForm.isParziale ? chiusuraForm.oraInizio || undefined : undefined,
                        oraFine: chiusuraForm.isParziale ? chiusuraForm.oraFine || undefined : undefined,
                        isParziale: chiusuraForm.isParziale,
                        ricorrente: chiusuraForm.ricorrente,
                        annoRiferimento: chiusuraForm.ricorrente && chiusuraForm.dataInizio ? new Date(`${chiusuraForm.dataInizio}T00:00:00`).getFullYear() : undefined,
                        attivo: true,
                    }
                ]
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sede', id] });
            setChiusuraForm({
                nome: '',
                tipo: 'STRAORDINARIA',
                descrizione: '',
                dataInizio: '',
                dataFine: '',
                isParziale: false,
                oraInizio: '',
                oraFine: '',
                ricorrente: false,
            });
            showToast({ type: 'success', message: 'Chiusura speciale aggiunta. Puoi inserirne un’altra.' });
        },
        onError: (err: unknown) => {
            showToast({ type: 'error', message: err instanceof Error ? err.message : 'Errore aggiunta chiusura' });
        }
    });

    if (isLoading) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Caricamento...</span>
                </div>
            </div>
        );
    }

    if (error || !sede) {
        return (
            <div className="p-6 clinica-theme">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-red-700 mb-2">
                        Errore nel caricamento
                    </h3>
                    <p className="text-red-600 text-sm mb-4">
                        {'Sede non trovata'}
                    </p>
                    <button
                        onClick={() => navigate('/poliambulatorio/sedi')}
                        className="btn-clinica-secondary"
                    >
                        Torna alla lista
                    </button>
                </div>
            </div>
        );
    }

    const isActive = sede.isAttiva;

    // Info Card Component
    const InfoCard: React.FC<{
        icon: React.ElementType;
        label: string;
        value?: string | null;
        className?: string;
    }> = ({ icon: Icon, label, value, className = '' }) => {
        if (!value) return null;
        return (
            <div className={`flex items-start gap-3 ${className}`}>
                <div className="p-2 rounded-lg bg-gray-50">
                    <Icon className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="text-gray-900 font-medium">{value}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/poliambulatorio/sedi')}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-teal-100">
                            <Building2 className="h-8 w-8 text-teal-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {sede.nome}
                                </h1>
                                {sede.isPrincipale && (
                                    <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                )}
                            </div>
                            {sede.codice && (
                                <p className="text-gray-500">{sede.codice}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {isActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {isActive ? 'Attiva' : 'Inattiva'}
                    </span>
                    <button
                        onClick={() => navigate(`/poliambulatorio/sedi/${id}/modifica`)}
                        className="btn-clinica-primary inline-flex items-center gap-2"
                    >
                        <Edit className="h-4 w-4" />
                        Modifica
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info Card */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-teal-600" />
                        Informazioni Generali
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoCard icon={Hash} label="Codice" value={sede.codice} />
                        {sede.isPrincipale && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-amber-50">
                                    <Star className="h-4 w-4 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Tipo</p>
                                    <p className="text-amber-700 font-medium">Sede Principale</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Phone className="h-5 w-5 text-teal-600" />
                        Contatti
                    </h2>

                    <div className="space-y-4">
                        <InfoCard icon={Phone} label="Telefono" value={sede.telefono} />
                        <InfoCard icon={Mail} label="Email" value={sede.email} />
                    </div>
                </div>

                {/* Address Card */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-teal-600" />
                        Indirizzo
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sede.indirizzo && (
                            <div className="md:col-span-2">
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Indirizzo</p>
                                <p className="text-gray-900 font-medium">{sede.indirizzo}</p>
                            </div>
                        )}
                        {sede.citta && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Città</p>
                                <p className="text-gray-900 font-medium">{sede.citta}</p>
                            </div>
                        )}
                        <div className="flex gap-6">
                            {sede.cap && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">CAP</p>
                                    <p className="text-gray-900 font-medium">{sede.cap}</p>
                                </div>
                            )}
                            {sede.provincia && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Provincia</p>
                                    <p className="text-gray-900 font-medium">{sede.provincia}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Direttore Sanitario Card */}
                {sede.direttoreSanitario && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                            <User className="h-5 w-5 text-teal-600" />
                            Direttore Sanitario
                        </h2>

                        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50">
                            <div className="p-2.5 rounded-full bg-teal-100">
                                <User className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">
                                    {formatMedicoName(sede.direttoreSanitario)}
                                </p>
                                {sede.direttoreSanitario.email && (
                                    <p className="text-sm text-gray-500">{sede.direttoreSanitario.email}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Metadata Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-teal-600" />
                        Metadati
                    </h2>

                    <div className="space-y-4 text-sm">
                        {sede.createdAt && (
                            <div>
                                <p className="text-gray-500">Creato il</p>
                                <p className="text-gray-900 font-medium">
                                    {new Date(sede.createdAt).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        )}
                        {sede.updatedAt && (
                            <div>
                                <p className="text-gray-500">Ultima modifica</p>
                                <p className="text-gray-900 font-medium">
                                    {new Date(sede.updatedAt).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Orari Settimanali Card */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 h-[400px] flex flex-col">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2 flex-shrink-0">
                        <Clock className="h-5 w-5 text-teal-600" />
                        Orari di Apertura
                    </h2>

                    {sede.orariSettimanali && sede.orariSettimanali.length > 0 ? (
                        <div className="space-y-3">
                            {(() => {
                                const DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
                                const groupedByDay = sede.orariSettimanali.reduce((acc: Record<number, typeof sede.orariSettimanali>, orario) => {
                                    if (!acc[orario.giornoSettimana]) acc[orario.giornoSettimana] = [];
                                    acc[orario.giornoSettimana]!.push(orario);
                                    return acc;
                                }, {} as Record<number, typeof sede.orariSettimanali>);

                                // Sort days starting from Monday (1) to Sunday (0)
                                const sortedDays = [1, 2, 3, 4, 5, 6, 0].filter(d => groupedByDay[d]);

                                return sortedDays.map(dayNum => {
                                    const orari = groupedByDay[dayNum];
                                    const allClosed = orari?.every(o => o.isChiuso);
                                    return (
                                        <div key={dayNum} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                            <span className="font-medium text-gray-700 w-28">{DAYS[dayNum]}</span>
                                            <div className="flex-1 flex flex-wrap gap-2 justify-end">
                                                {allClosed ? (
                                                    <span className="text-red-500 text-sm font-medium">Chiuso</span>
                                                ) : (
                                                    orari?.filter(o => !o.isChiuso).map((o, idx) => (
                                                        <span key={idx} className="bg-teal-50 text-teal-700 text-sm px-2 py-1 rounded">
                                                            {o.oraInizio} - {o.oraFine}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">Nessun orario configurato</p>
                    )}
                </div>

                {/* Chiusure Speciali Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 h-[400px] flex flex-col">
                    <div className="mb-6 flex flex-shrink-0 items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <CalendarX className="h-5 w-5 text-teal-600" />
                            Chiusure Speciali
                        </h2>
                        <button
                            onClick={() => setShowChiusuraModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Aggiungi
                        </button>
                    </div>

                    {sede.chiusureSpeciali && sede.chiusureSpeciali.filter(c => c.attivo).length > 0 ? (
                        <div className="space-y-3 overflow-y-auto flex-1">
                            {sede.chiusureSpeciali.filter(c => c.attivo).map(chiusura => (
                                <div key={chiusura.id} className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium text-amber-800">{chiusura.nome}</p>
                                            <p className="text-sm text-amber-600">
                                                {new Date(chiusura.dataInizio).toLocaleDateString('it-IT')}
                                                {chiusura.dataFine !== chiusura.dataInizio && (
                                                    <> - {new Date(chiusura.dataFine).toLocaleDateString('it-IT')}</>
                                                )}
                                            </p>
                                            {chiusura.descrizione && (
                                                <p className="text-xs text-amber-500 mt-1">{chiusura.descrizione}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            {chiusura.isParziale && (
                                                <span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded">Parziale</span>
                                            )}
                                            {chiusura.ricorrente && (
                                                <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded">Ricorrente</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">Nessuna chiusura programmata</p>
                    )}
                </div>

                {/* Ambulatori Card */}
                <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <DoorOpen className="h-5 w-5 text-teal-600" />
                            Ambulatori ({sede.ambulatori?.length || 0})
                        </h2>
                        <Link
                            to={`/poliambulatorio/ambulatori?sede=${id}`}
                            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                        >
                            Vedi tutti →
                        </Link>
                    </div>

                    {sede.ambulatori && sede.ambulatori.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sede.ambulatori.map(amb => (
                                <Link
                                    key={amb.id}
                                    to={`/poliambulatorio/ambulatori/${amb.id}`}
                                    className="p-4 rounded-lg border border-gray-200 hover:border-teal-300 hover:shadow-sm transition-all group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                                            style={{ backgroundColor: amb.colore || '#14B8A6' }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate group-hover:text-teal-700">
                                                {amb.nome}
                                            </p>
                                            <p className="text-sm text-gray-500">{amb.codice}</p>
                                            {amb.specializzazione && (
                                                <p className="text-xs text-gray-400 mt-1">{amb.specializzazione}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${amb.stato === 'ATTIVO' ? 'bg-emerald-100 text-emerald-700' :
                                                    amb.stato === 'MANUTENZIONE' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {amb.stato}
                                                </span>
                                                {amb.piano && (
                                                    <span className="text-xs text-gray-400">Piano {amb.piano}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Nessun ambulatorio associato a questa sede</p>
                            <Link
                                to={`/poliambulatorio/ambulatori/nuovo?sede=${id}`}
                                className="mt-3 inline-block text-sm text-teal-600 hover:text-teal-700 font-medium"
                            >
                                + Aggiungi ambulatorio
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {showChiusuraModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowChiusuraModal(false)} />
                    <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Nuova chiusura speciale</h3>
                                <p className="text-sm text-gray-500">Aggiungi rapidamente una chiusura senza entrare nella modifica completa della sede.</p>
                            </div>
                            <button onClick={() => setShowChiusuraModal(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto bg-gray-50/70 p-5 sm:grid-cols-2">
                            <label className="sm:col-span-2 text-sm font-medium text-gray-700">
                                Nome chiusura
                                <input
                                    value={chiusuraForm.nome}
                                    onChange={e => setChiusuraForm(f => ({ ...f, nome: e.target.value }))}
                                    placeholder="Es. Ponte 2 giugno"
                                    className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Tipo
                                <div className="relative">
                                    <select
                                        value={chiusuraForm.tipo}
                                        onChange={e => setChiusuraForm(f => ({ ...f, tipo: e.target.value }))}
                                        className="mt-1 h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm font-medium text-gray-800 shadow-sm outline-none transition-all hover:border-teal-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option value="FESTIVITA">Festività</option>
                                        <option value="PONTE">Ponte</option>
                                        <option value="FERIE_ESTIVE">Ferie estive</option>
                                        <option value="FERIE_NATALIZIE">Ferie natalizie</option>
                                        <option value="FERIE_PASQUALI">Ferie pasquali</option>
                                        <option value="STRAORDINARIA">Straordinaria</option>
                                        <option value="FORMAZIONE">Formazione</option>
                                        <option value="EVENTO">Evento</option>
                                        <option value="ALTRO">Altro</option>
                                    </select>
                                </div>
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Data inizio
                                <DatePickerElegante
                                    value={chiusuraForm.dataInizio}
                                    onChange={date => setChiusuraForm(f => ({
                                        ...f,
                                        dataInizio: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '',
                                        dataFine: f.dataFine || (date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '')
                                    }))}
                                    placeholder="Seleziona data"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700">
                                Data fine
                                <DatePickerElegante
                                    value={chiusuraForm.dataFine}
                                    onChange={date => setChiusuraForm(f => ({
                                        ...f,
                                        dataFine: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : ''
                                    }))}
                                    placeholder="Uguale a inizio"
                                />
                            </label>
                            <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={chiusuraForm.isParziale}
                                    onChange={e => setChiusuraForm(f => ({ ...f, isParziale: e.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                Solo fascia oraria
                            </label>
                            <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={chiusuraForm.ricorrente}
                                    onChange={e => setChiusuraForm(f => ({ ...f, ricorrente: e.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                Ricorrente ogni anno
                            </label>
                            {chiusuraForm.isParziale && (
                                <>
                                    <label className="text-sm font-medium text-gray-700">
                                        Ora inizio
                                        <TimePickerElegante
                                            value={chiusuraForm.oraInizio}
                                            onChange={value => setChiusuraForm(f => ({ ...f, oraInizio: value }))}
                                            minuteStep={5}
                                            placeholder="Ora inizio"
                                            className="mt-1"
                                        />
                                    </label>
                                    <label className="text-sm font-medium text-gray-700">
                                        Ora fine
                                        <TimePickerElegante
                                            value={chiusuraForm.oraFine}
                                            onChange={value => setChiusuraForm(f => ({ ...f, oraFine: value }))}
                                            minuteStep={5}
                                            placeholder="Ora fine"
                                            className="mt-1"
                                        />
                                    </label>
                                </>
                            )}
                            <label className="sm:col-span-2 text-sm font-medium text-gray-700">
                                Note
                                <textarea
                                    value={chiusuraForm.descrizione}
                                    onChange={e => setChiusuraForm(f => ({ ...f, descrizione: e.target.value }))}
                                    rows={3}
                                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                                />
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
                            <button onClick={() => setShowChiusuraModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Annulla</button>
                            <button
                                onClick={() => addChiusuraMutation.mutate()}
                                disabled={addChiusuraMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                            >
                                {addChiusuraMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Salva e aggiungi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SedeDetailPage;
