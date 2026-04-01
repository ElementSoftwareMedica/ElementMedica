/**
 * P68 - HR Personnel Management - Main Page
 * Dashboard principale per la gestione del personale interno
 * Vista duale: Manager (gestione team) vs Dipendente (self-service)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Users,
    Briefcase,
    Calendar,
    Clock,
    FileText,
    Building2,
    ChevronRight,
    UserCheck,
    CalendarClock,
    CalendarDays,
    ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { profiliHRApi, assenzeApi, cartelliniApi, disponibilitaApi, timbraturaApi } from './api';
import TimbraturaBadge from './components/TimbraturaBadge';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    href: string;
    description?: string;
    color: 'teal' | 'blue' | 'violet' | 'amber' | 'emerald' | 'rose';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, href, description, color }) => {
    const colorClasses = {
        teal: 'bg-teal-50 text-teal-600 border-teal-200',
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        violet: 'bg-violet-50 text-violet-600 border-violet-200',
        amber: 'bg-amber-50 text-amber-600 border-amber-200',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        rose: 'bg-rose-50 text-rose-600 border-rose-200',
    };

    return (
        <Link
            to={href}
            className={`block p-6 rounded-lg border-2 ${colorClasses[color]} hover:shadow-md transition-shadow`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium opacity-80">{title}</p>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                    {description && <p className="text-xs mt-1 opacity-70">{description}</p>}
                </div>
                <div className="opacity-80">{icon}</div>
            </div>
        </Link>
    );
};

interface QuickLinkProps {
    title: string;
    description: string;
    href: string;
    icon: React.ReactNode;
}

const QuickLink: React.FC<QuickLinkProps> = ({ title, description, href, icon }) => (
    <Link
        to={href}
        className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-violet-300 hover:shadow-sm transition-all"
    >
        <div className="flex-shrink-0 w-10 h-10 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center">
            {icon}
        </div>
        <div className="ml-4 flex-1">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
    </Link>
);

const HRDashboard: React.FC = () => {
    const { user } = useAuth();

    // Determina se l'utente è manager
    const isManager = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    // Manager: Fetch stats del team
    const { data: profiliData } = useQuery({
        queryKey: ['hr', 'profili', 'stats'],
        queryFn: () => profiliHRApi.list({ isActive: true, limit: 1 }),
        enabled: isManager,
    });

    const { data: assenzeData } = useQuery({
        queryKey: ['hr', 'assenze', 'pending'],
        queryFn: () => assenzeApi.list({ stato: 'INVIATA', limit: 1 }),
        enabled: isManager,
    });

    const currentDate = new Date();
    const { data: cartelliniData } = useQuery({
        queryKey: ['hr', 'cartellini', 'current'],
        queryFn: () => cartelliniApi.list({
            anno: currentDate.getFullYear(),
            mese: currentDate.getMonth() + 1,
        }),
        enabled: isManager,
    });

    // Employee: Fetch propri dati
    const { data: mieAssenzeData } = useQuery({
        queryKey: ['hr', 'assenze', 'mie'],
        queryFn: () => assenzeApi.getMie({}),
        enabled: !isManager,
    });

    const { data: mioCartellino } = useQuery({
        queryKey: ['hr', 'cartellino', 'mio'],
        queryFn: () => cartelliniApi.getMio({
            anno: currentDate.getFullYear(),
            mese: currentDate.getMonth() + 1,
        }),
        enabled: !isManager,
    });

    const { data: mieDisponibilita } = useQuery({
        queryKey: ['hr', 'disponibilita', 'mie', currentDate.getFullYear(), currentDate.getMonth() + 1],
        queryFn: () => disponibilitaApi.getMie({
            anno: currentDate.getFullYear(),
            mese: currentDate.getMonth() + 1,
        }),
        enabled: !isManager,
    });

    // Stats per manager
    const totalProfili = profiliData?.pagination?.total ?? 0;
    const assenzePendenti = assenzeData?.pagination?.total ?? 0;
    const cartelliniDaValidare = cartelliniData?.data?.filter(c => c.stato === 'BOZZA')?.length ?? 0;

    // Stats per employee
    const mieAssenzePending = mieAssenzeData?.data?.filter(a => a.stato === 'INVIATA' || a.stato === 'IN_VALUTAZIONE')?.length ?? 0;
    const mieDisponibilitaCount = mieDisponibilita?.data?.length ?? 0;

    // Render vista Employee
    if (!isManager) {
        return (
            <div className="space-y-8">
                {/* Header Employee */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Il Mio HR</h1>
                        <p className="text-gray-600 mt-1">
                            Gestisci le tue presenze, assenze e disponibilità
                        </p>
                    </div>
                </div>

                {/* Timbratura Badge */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-violet-500" />
                        Timbratura
                    </h2>
                    <TimbraturaBadge />
                </div>

                {/* Stats Employee */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                        title="Richieste Assenze"
                        value={mieAssenzePending}
                        icon={<CalendarClock className="w-8 h-8" />}
                        href="/management/hr/assenze"
                        description="In attesa di approvazione"
                        color="amber"
                    />
                    <StatCard
                        title="Cartellino"
                        value={mioCartellino?.data ? `${mioCartellino.data.percentualePresenza?.toFixed(0) || 0}%` : '-'}
                        icon={<FileText className="w-8 h-8" />}
                        href="/management/hr/cartellini"
                        description={`${currentDate.toLocaleDateString('it-IT', { month: 'long' })} ${currentDate.getFullYear()}`}
                        color="blue"
                    />
                    <StatCard
                        title="Disponibilità Inserite"
                        value={mieDisponibilitaCount}
                        icon={<CalendarDays className="w-8 h-8" />}
                        href="/management/hr/disponibilita"
                        description="Questo mese"
                        color="teal"
                    />
                </div>

                {/* Quick Links Employee */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesso Rapido</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <QuickLink
                            title="Richiedi Assenza"
                            description="Ferie, permessi, malattia"
                            href="/management/hr/assenze"
                            icon={<CalendarClock className="w-5 h-5" />}
                        />
                        <QuickLink
                            title="Le Mie Disponibilità"
                            description="Inserisci preferenze turni"
                            href="/management/hr/disponibilita"
                            icon={<CalendarDays className="w-5 h-5" />}
                        />
                        <QuickLink
                            title="I Miei Turni"
                            description="Visualizza turni assegnati"
                            href="/management/hr/turni"
                            icon={<Calendar className="w-5 h-5" />}
                        />
                        <QuickLink
                            title="Storico Timbrature"
                            description="Visualizza le tue timbrature"
                            href="/management/hr/timbrature"
                            icon={<Clock className="w-5 h-5" />}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Render vista Manager
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestione Personale</h1>
                    <p className="text-gray-600 mt-1">
                        Gestione del personale interno, turni, timbrature e cartellini
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Personale Attivo"
                    value={totalProfili}
                    icon={<Users className="w-8 h-8" />}
                    href="/management/hr/profili"
                    description="Profili HR configurati"
                    color="teal"
                />
                <StatCard
                    title="Richieste Assenze"
                    value={assenzePendenti}
                    icon={<CalendarClock className="w-8 h-8" />}
                    href="/management/hr/assenze"
                    description="Da approvare"
                    color="amber"
                />
                <StatCard
                    title="Cartellini da Validare"
                    value={cartelliniDaValidare}
                    icon={<FileText className="w-8 h-8" />}
                    href="/management/hr/cartellini"
                    description="Mese corrente"
                    color="blue"
                />
                <StatCard
                    title="Oggi"
                    value={new Date().toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })}
                    icon={<Calendar className="w-8 h-8" />}
                    href="/management/hr/turni"
                    description="Visualizza turni"
                    color="violet"
                />
            </div>

            {/* Quick Links */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesso Rapido</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickLink
                        title="Profili HR"
                        description="Gestisci i profili del personale"
                        href="/management/hr/profili"
                        icon={<UserCheck className="w-5 h-5" />}
                    />
                    <QuickLink
                        title="Mansioni Interne"
                        description="Definisci ruoli e responsabilità"
                        href="/management/hr/mansioni"
                        icon={<Briefcase className="w-5 h-5" />}
                    />
                    <QuickLink
                        title="Turni"
                        description="Gestione turni e calendario"
                        href="/management/hr/turni"
                        icon={<Calendar className="w-5 h-5" />}
                    />
                    <QuickLink
                        title="Disponibilità"
                        description="Calendario disponibilità team"
                        href="/management/hr/disponibilita"
                        icon={<CalendarDays className="w-5 h-5" />}
                    />
                    <QuickLink
                        title="Timbrature"
                        description="Visualizza timbrature personale"
                        href="/management/hr/timbrature"
                        icon={<Clock className="w-5 h-5" />}
                    />
                    <QuickLink
                        title="Assenze"
                        description="Ferie, permessi, malattie"
                        href="/management/hr/assenze"
                        icon={<CalendarClock className="w-5 h-5" />}
                    />
                    <QuickLink
                        title="Cartellini"
                        description="Report mensili presenze"
                        href="/management/hr/cartellini"
                        icon={<FileText className="w-5 h-5" />}
                    />
                    <QuickLink
                        title="La Mia Azienda"
                        description="Dati aziendali e sedi"
                        href="/management/hr/azienda"
                        icon={<Building2 className="w-5 h-5" />}
                    />
                </div>
            </div>
        </div>
    );
};

export default HRDashboard;
