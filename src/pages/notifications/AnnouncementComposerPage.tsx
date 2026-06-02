/**
 * AnnouncementComposerPage
 *
 * Pagina per la creazione di avvisi/annunci da parte degli admin tenant.
 * Supporta targeting per ruolo, per persona singola, per dipendenti azienda o tutti.
 * Supporta avvisi in-app (bell), popup overlay e popup con conferma obbligatoria.
 * Supporta timing immediato, al prossimo login, inizio settimana, inizio mese o data custom.
 *
 * @module pages/notifications/AnnouncementComposerPage
 */

import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Megaphone, Bell, AlertTriangle, CheckCircle2, Info,
    Users, User, Building2, ChevronDown,
    Calendar, Clock, Send, X, Search, Plus, Minus,
    Loader2, ArrowLeft
} from 'lucide-react';
import { apiGet, apiPost } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';
import { CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { cn } from '@/design-system/utils';

// ─── Tipi ────────────────────────────────────────────────────────────────────

type NotifType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'REMINDER' | 'ACTION';
type NotifPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL_P';
type NotifCategory = 'SYSTEM' | 'APPOINTMENT' | 'VISIT' | 'DOCUMENT' | 'INVOICE' | 'TRAINING' | 'GDPR' | 'SECURITY' | 'MARKETING' | 'CUSTOM';
type TargetType = 'ALL_TENANT' | 'ROLES' | 'INDIVIDUAL' | 'COMPANY_EMPLOYEES';
type DisplayMode = 'NOTIFICATION' | 'POPUP' | 'POPUP_CONFIRM';
type TimingMode = 'IMMEDIATE' | 'NEXT_LOGIN' | 'WEEK_START' | 'MONTH_START' | 'CUSTOM';

interface PersonResult {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
}

// ─── Costanti UI ─────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: NotifType; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'INFO', label: 'Informazione', icon: <Info className="w-4 h-4" />, color: 'text-blue-600' },
    { value: 'SUCCESS', label: 'Successo', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-600' },
    { value: 'WARNING', label: 'Avviso', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-amber-600' },
    { value: 'ERROR', label: 'Errore', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600' },
    { value: 'CRITICAL', label: 'Critico', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-700' },
    { value: 'REMINDER', label: 'Promemoria', icon: <Clock className="w-4 h-4" />, color: 'text-purple-600' },
    { value: 'ACTION', label: 'Azione richiesta', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-orange-600' },
];

const CATEGORY_OPTIONS: { value: NotifCategory; label: string }[] = [
    { value: 'SYSTEM', label: 'Sistema' },
    { value: 'APPOINTMENT', label: 'Appuntamenti' },
    { value: 'VISIT', label: 'Visite cliniche' },
    { value: 'DOCUMENT', label: 'Documenti' },
    { value: 'INVOICE', label: 'Fatturazione' },
    { value: 'TRAINING', label: 'Formazione' },
    { value: 'GDPR', label: 'GDPR / Privacy' },
    { value: 'SECURITY', label: 'Sicurezza' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'CUSTOM', label: 'Altro' },
];

// Gruppi ruolo per UX (raggruppati semanticamente)
const ROLE_GROUPS = [
    { label: 'Medici', roles: ['MEDICO', 'MEDICO_COMPETENTE'], color: 'bg-teal-50 border-teal-200 text-teal-800' },
    { label: 'Infermieri', roles: ['INFERMIERE'], color: 'bg-cyan-50 border-cyan-200 text-cyan-800' },
    { label: 'Segreteria', roles: ['SEGRETERIA_CLINICA'], color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
    { label: 'Formatori', roles: ['TRAINER', 'SENIOR_TRAINER', 'TRAINER_COORDINATOR', 'EXTERNAL_TRAINER'], color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { label: 'Team Sicurezza', roles: ['RSPP', 'ASPP', 'TECNICO_SICUREZZA', 'CONSULENTE_SICUREZZA'], color: 'bg-orange-50 border-orange-200 text-orange-800' },
    { label: 'Dipendenti', roles: ['EMPLOYEE', 'MANAGER', 'DEPARTMENT_HEAD', 'HR_MANAGER'], color: 'bg-gray-50 border-gray-200 text-gray-800' },
    { label: 'Amministratori', roles: ['ADMIN', 'TENANT_ADMIN', 'CLINIC_ADMIN', 'TRAINING_ADMIN'], color: 'bg-violet-50 border-violet-200 text-violet-800' },
    { label: 'Ospiti / Consulenti', roles: ['GUEST', 'CONSULTANT', 'AUDITOR', 'VIEWER'], color: 'bg-slate-50 border-slate-200 text-slate-700' },
    { label: 'Pazienti', roles: ['PAZIENTE'], color: 'bg-pink-50 border-pink-200 text-pink-800' },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AnnouncementComposerPage() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Form state
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [type, setType] = useState<NotifType>('INFO');
    const [priority, setPriority] = useState<NotifPriority>('NORMAL');
    const [category, setCategory] = useState<NotifCategory>('SYSTEM');
    const [displayMode, setDisplayMode] = useState<DisplayMode>('NOTIFICATION');
    const [timing, setTiming] = useState<TimingMode>('IMMEDIATE');
    const [customDate, setCustomDate] = useState<Date | null>(null);
    const [targetType, setTargetType] = useState<TargetType>('ALL_TENANT');
    const [selectedRoleGroups, setSelectedRoleGroups] = useState<string[]>([]);
    const [selectedPersons, setSelectedPersons] = useState<PersonResult[]>([]);
    const [personSearch, setPersonSearch] = useState('');
    const [personResults, setPersonResults] = useState<PersonResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Ricerca persone ──────────────────────────────────────────────────────
    const searchPersons = useCallback(async (query: string) => {
        if (query.trim().length < 2) {
            setPersonResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const res = await apiGet<{ data?: { items?: PersonResult[]; persons?: PersonResult[] } }>(`/api/v1/persons?search=${encodeURIComponent(query)}&limit=15`);
            const items: PersonResult[] = res?.data?.items ?? res?.data?.persons ?? (res as unknown as { data: PersonResult[] })?.data ?? [];
            setPersonResults(items.filter(p => !selectedPersons.some(s => s.id === p.id)));
        } catch {
            setPersonResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, [selectedPersons]);

    const handlePersonSearchChange = useCallback((value: string) => {
        setPersonSearch(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => searchPersons(value), 400);
    }, [searchPersons]);

    const addPerson = useCallback((person: PersonResult) => {
        setSelectedPersons(prev => prev.some(p => p.id === person.id) ? prev : [...prev, person]);
        setPersonResults(prev => prev.filter(p => p.id !== person.id));
        setPersonSearch('');
    }, []);

    const removePerson = useCallback((id: string) => {
        setSelectedPersons(prev => prev.filter(p => p.id !== id));
    }, []);

    // ── Ruoli ────────────────────────────────────────────────────────────────
    const toggleRoleGroup = useCallback((label: string) => {
        setSelectedRoleGroups(prev =>
            prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
        );
    }, []);

    const getSelectedRoles = useCallback((): string[] => {
        return ROLE_GROUPS
            .filter(g => selectedRoleGroups.includes(g.label))
            .flatMap(g => g.roles);
    }, [selectedRoleGroups]);

    // ── Invio ────────────────────────────────────────────────────────────────
    const handleSend = useCallback(async () => {
        if (!title.trim() || !body.trim()) {
            showToast({ message: 'Titolo e testo sono obbligatori.', type: 'error' });
            return;
        }
        if (timing === 'CUSTOM' && !customDate) {
            showToast({ message: 'Seleziona la data e ora di invio.', type: 'error' });
            return;
        }
        if (targetType === 'ROLES' && selectedRoleGroups.length === 0) {
            showToast({ message: 'Seleziona almeno un gruppo di ruoli.', type: 'error' });
            return;
        }
        if (targetType === 'INDIVIDUAL' && selectedPersons.length === 0) {
            showToast({ message: 'Seleziona almeno una persona.', type: 'error' });
            return;
        }

        setSending(true);
        try {
            const forcePopup = displayMode === 'POPUP' || displayMode === 'POPUP_CONFIRM';
            const requiresConfirmation = displayMode === 'POPUP_CONFIRM';

            const payload: Record<string, unknown> = {
                title: title.trim(),
                body: body.trim(),
                type,
                priority: displayMode === 'POPUP_CONFIRM' ? 'URGENT' : priority,
                category,
                forcePopup,
                requiresConfirmation,
                timing,
                ...(timing === 'CUSTOM' && customDate && { scheduledAt: customDate.toISOString() }),
                targetType,
                ...(targetType === 'ROLES' && { targetRoles: getSelectedRoles() }),
                ...(targetType === 'INDIVIDUAL' && { targetPersonIds: selectedPersons.map(p => p.id) }),
            };

            await apiPost('/api/v1/notifications/advanced/broadcast', payload);
            showToast({ message: 'Avviso creato e inviato con successo.', type: 'success' });
            navigate('/management/notifiche');
        } catch {
            showToast({ message: 'Errore durante l\'invio dell\'avviso.', type: 'error' });
        } finally {
            setSending(false);
        }
    }, [title, body, type, priority, category, displayMode, timing, customDate, targetType, selectedRoleGroups, selectedPersons, getSelectedRoles, showToast, navigate]);

    // ── Helper UI ────────────────────────────────────────────────────────────
    const selectedTypeOption = TYPE_OPTIONS.find(o => o.value === type);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/management/notifiche')}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                        <Megaphone className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Crea Avviso</h1>
                        <p className="text-sm text-gray-500">Invia notifiche al personale o a gruppi specifici</p>
                    </div>
                </div>
            </div>

            {/* Contenuto */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
                {/* Titolo e testo */}
                <div className="space-y-4">
                    <SectionTitle>Messaggio</SectionTitle>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Titolo <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            maxLength={200}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Es. Riunione obbligatoria venerdì 18 aprile"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                        <div className="text-xs text-gray-400 text-right mt-0.5">{title.length}/200</div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Testo <span className="text-red-500">*</span></label>
                        <textarea
                            rows={4}
                            maxLength={5000}
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            placeholder="Scrivi il testo completo dell'avviso..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y"
                        />
                        <div className="text-xs text-gray-400 text-right mt-0.5">{body.length}/5000</div>
                    </div>
                </div>

                {/* Tipo + Priorità + Categoria */}
                <div className="space-y-4 border-t border-gray-100 pt-6">
                    <SectionTitle>Classificazione</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                            <div className="relative">
                                <select
                                    value={type}
                                    onChange={e => setType(e.target.value as NotifType)}
                                    className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none bg-white"
                                >
                                    {TYPE_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                            {selectedTypeOption && (
                                <div className={cn('flex items-center gap-1 mt-1 text-xs font-medium', selectedTypeOption.color)}>
                                    {selectedTypeOption.icon}
                                    {selectedTypeOption.label}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priorità</label>
                            <div className="relative">
                                <select
                                    value={priority}
                                    onChange={e => setPriority(e.target.value as NotifPriority)}
                                    className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none bg-white"
                                >
                                    <option value="LOW">Bassa</option>
                                    <option value="NORMAL">Normale</option>
                                    <option value="HIGH">Alta</option>
                                    <option value="URGENT">Urgente</option>
                                    <option value="CRITICAL_P">Critica</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                            <div className="relative">
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value as NotifCategory)}
                                    className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none bg-white"
                                >
                                    {CATEGORY_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modalità di visualizzazione */}
                <div className="space-y-3 border-t border-gray-100 pt-6">
                    <SectionTitle>Come appare ai destinatari</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <DisplayModeCard
                            mode="NOTIFICATION"
                            selected={displayMode === 'NOTIFICATION'}
                            onClick={() => setDisplayMode('NOTIFICATION')}
                            icon={<Bell className="w-5 h-5 text-blue-600" />}
                            title="Solo notifica"
                            desc="Appare nella campanella — l'utente la legge quando vuole."
                        />
                        <DisplayModeCard
                            mode="POPUP"
                            selected={displayMode === 'POPUP'}
                            onClick={() => setDisplayMode('POPUP')}
                            icon={<Megaphone className="w-5 h-5 text-amber-600" />}
                            title="Popup overlay"
                            desc="Si mostra in evidenza sullo schermo. L'utente può chiuderlo."
                        />
                        <DisplayModeCard
                            mode="POPUP_CONFIRM"
                            selected={displayMode === 'POPUP_CONFIRM'}
                            onClick={() => setDisplayMode('POPUP_CONFIRM')}
                            icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                            title="Popup + conferma"
                            desc="Popup bloccante — richiede che l'utente confermi esplicitamente la lettura."
                        />
                    </div>
                </div>

                {/* Timing */}
                <div className="space-y-3 border-t border-gray-100 pt-6">
                    <SectionTitle>Quando inviare</SectionTitle>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {(
                            [
                                { v: 'IMMEDIATE', label: 'Subito', sub: 'Inviato immediatamente', icon: <Send className="w-4 h-4" /> },
                                { v: 'NEXT_LOGIN', label: 'Prossimo login', sub: 'Visibile al prossimo accesso', icon: <User className="w-4 h-4" /> },
                                { v: 'WEEK_START', label: 'Lun. 8:00', sub: 'Inizio settimana prossima', icon: <Calendar className="w-4 h-4" /> },
                                { v: 'MONTH_START', label: '1° del mese', sub: 'Inizio del prossimo mese', icon: <Calendar className="w-4 h-4" /> },
                                { v: 'CUSTOM', label: 'Data custom', sub: 'Scegli data e ora', icon: <Clock className="w-4 h-4" /> },
                            ] as { v: TimingMode; label: string; sub: string; icon: React.ReactNode }[]
                        ).map(opt => (
                            <button
                                key={opt.v}
                                onClick={() => setTiming(opt.v)}
                                className={cn(
                                    'flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-center text-xs font-medium transition-all',
                                    timing === opt.v
                                        ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                )}
                            >
                                <span className={timing === opt.v ? 'text-violet-600' : 'text-gray-400'}>{opt.icon}</span>
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                    {timing === 'CUSTOM' && (
                        <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data e ora di invio</label>
                            <DatePickerElegante
                                value={customDate}
                                onChange={d => setCustomDate(d)}
                                theme="violet"
                                size="sm"
                                placeholder="Seleziona data..."
                                minDate={new Date()}
                                clearable
                            />
                        </div>
                    )}
                    {(timing === 'WEEK_START' || timing === 'MONTH_START') && (
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            La notifica viene creata ora e consegnata automaticamente all'orario pianificato. Gli utenti la vedranno alla prima apertura dell'applicazione dopo quell'orario.
                        </p>
                    )}
                </div>

                {/* Target */}
                <div className="space-y-4 border-t border-gray-100 pt-6">
                    <SectionTitle>Destinatari</SectionTitle>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(
                            [
                                { v: 'ALL_TENANT', label: 'Tutti', sub: 'Tutti gli utenti attivi', icon: <Users className="w-5 h-5" /> },
                                { v: 'ROLES', label: 'Per ruolo', sub: 'Seleziona categorie', icon: <ChevronDown className="w-5 h-5" /> },
                                { v: 'INDIVIDUAL', label: 'Personale', sub: 'Cerca persone specifiche', icon: <User className="w-5 h-5" /> },
                                { v: 'COMPANY_EMPLOYEES', label: 'Azienda', sub: 'Dipendenti di un\'azienda', icon: <Building2 className="w-5 h-5" /> },
                            ] as { v: TargetType; label: string; sub: string; icon: React.ReactNode }[]
                        ).map(opt => (
                            <button
                                key={opt.v}
                                onClick={() => setTargetType(opt.v)}
                                className={cn(
                                    'flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-center text-xs font-medium transition-all',
                                    targetType === opt.v
                                        ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                )}
                            >
                                <span className={targetType === opt.v ? 'text-violet-600' : 'text-gray-400'}>{opt.icon}</span>
                                <span className="font-semibold">{opt.label}</span>
                                <span className={cn('text-xs', targetType === opt.v ? 'text-violet-500' : 'text-gray-400')}>{opt.sub}</span>
                            </button>
                        ))}
                    </div>

                    {/* Selezione ruoli */}
                    {targetType === 'ROLES' && (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-500">Seleziona uno o più gruppi di ruoli:</p>
                            <div className="flex flex-wrap gap-2">
                                {ROLE_GROUPS.map(group => {
                                    const sel = selectedRoleGroups.includes(group.label);
                                    return (
                                        <button
                                            key={group.label}
                                            onClick={() => toggleRoleGroup(group.label)}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                                                sel
                                                    ? `${group.color} border-current`
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                            )}
                                        >
                                            {sel ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                            {group.label}
                                            <span className="opacity-60">({group.roles.length})</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {selectedRoleGroups.length > 0 && (
                                <p className="text-xs text-violet-600 font-medium">
                                    {selectedRoleGroups.length} gruppo{selectedRoleGroups.length > 1 ? 'i' : ''} selezionato{selectedRoleGroups.length > 1 ? 'i' : ''} · {getSelectedRoles().length} ruoli totali
                                </p>
                            )}
                        </div>
                    )}

                    {/* Selezione persone individuali */}
                    {targetType === 'INDIVIDUAL' && (
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={personSearch}
                                    onChange={e => handlePersonSearchChange(e.target.value)}
                                    placeholder="Cerca per nome o cognome..."
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                                {searchLoading && (
                                    <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 animate-spin" />
                                )}
                            </div>
                            {personResults.length > 0 && (
                                <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                    {personResults.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => addPerson(p)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-violet-50 text-left transition-colors"
                                        >
                                            <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <User className="w-3.5 h-3.5 text-violet-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</div>
                                                {p.email && <div className="text-xs text-gray-500">{p.email}</div>}
                                            </div>
                                            <Plus className="w-4 h-4 text-violet-500 ml-auto flex-shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedPersons.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-600">{selectedPersons.length} destinatar{selectedPersons.length > 1 ? 'i' : 'io'} selezionat{selectedPersons.length > 1 ? 'i' : 'o'}:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedPersons.map(p => (
                                            <div key={p.id} className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-800 text-xs px-2.5 py-1 rounded-full font-medium">
                                                {p.firstName} {p.lastName}
                                                <button onClick={() => removePerson(p.id)} className="hover:text-violet-600 transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {targetType === 'COMPANY_EMPLOYEES' && (
                        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Il targeting per azienda è gestito tramite i <strong>Gruppi</strong> nella sezione Gruppi Notifiche. Vai in <strong>Notifiche → Gruppi</strong> e crea un gruppo di tipo "Azienda".
                        </div>
                    )}
                </div>

                {/* Preview */}
                <div className="space-y-2 border-t border-gray-100 pt-6">
                    <SectionTitle>Anteprima</SectionTitle>
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                        <div className={cn(
                            'flex gap-3 rounded-xl p-4 border',
                            type === 'INFO' && 'bg-blue-50 border-blue-200',
                            type === 'SUCCESS' && 'bg-green-50 border-green-200',
                            type === 'WARNING' && 'bg-amber-50 border-amber-200',
                            (type === 'ERROR' || type === 'CRITICAL') && 'bg-red-50 border-red-200',
                            type === 'REMINDER' && 'bg-purple-50 border-purple-200',
                            type === 'ACTION' && 'bg-orange-50 border-orange-200',
                        )}>
                            <div className={cn(
                                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                                type === 'INFO' && 'bg-blue-100',
                                type === 'SUCCESS' && 'bg-green-100',
                                type === 'WARNING' && 'bg-amber-100',
                                (type === 'ERROR' || type === 'CRITICAL') && 'bg-red-100',
                                type === 'REMINDER' && 'bg-purple-100',
                                type === 'ACTION' && 'bg-orange-100',
                            )}>
                                <span className={cn(selectedTypeOption?.color)}>{selectedTypeOption?.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-gray-900 truncate">{title || 'Titolo avviso...'}</h4>
                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{body || 'Testo del messaggio...'}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    {displayMode !== 'NOTIFICATION' && (
                                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                            {displayMode === 'POPUP_CONFIRM' ? 'Richiede conferma' : 'Popup'}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400">Adesso · {CATEGORY_OPTIONS.find(c => c.value === category)?.label}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer con invio */}
            <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <button
                    onClick={() => navigate('/management/notifiche')}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    Annulla
                </button>
                <CRUDPrimaryButton
                    onClick={handleSend}
                    disabled={sending || !title.trim() || !body.trim()}
                >
                    {sending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Invio in corso...</>
                    ) : (
                        <><Send className="w-4 h-4 mr-2" />Invia Avviso</>
                    )}
                </CRUDPrimaryButton>
            </div>
        </div>
    );
}

// ─── Sotto-componenti ─────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="text-sm font-semibold text-gray-800">{children}</h3>;
}

function DisplayModeCard({
    selected, onClick, icon, title, desc,
}: {
    mode: DisplayMode;
    selected: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    desc: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all',
                selected
                    ? 'border-violet-500 bg-violet-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            )}
        >
            <div className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center',
                selected ? 'bg-violet-100' : 'bg-gray-100'
            )}>
                {icon}
            </div>
            <div>
                <div className={cn('text-sm font-semibold', selected ? 'text-violet-700' : 'text-gray-800')}>{title}</div>
                <div className="text-xs text-gray-500 leading-relaxed mt-0.5">{desc}</div>
            </div>
        </button>
    );
}
