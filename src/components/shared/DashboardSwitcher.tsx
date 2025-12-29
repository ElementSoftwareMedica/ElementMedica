/**
 * Dashboard Switcher Component
 * 
 * Permette agli utenti con accesso a più moduli (Formazione, Poliambulatorio)
 * di passare rapidamente tra le diverse dashboard.
 * 
 * Features:
 * - Dropdown elegante con icone distintive
 * - Mostra solo le dashboard a cui l'utente ha accesso
 * - Indica la dashboard attualmente attiva
 * - Animazioni smooth
 * - Responsive (si adatta a mobile)
 * 
 * @module components/shared/DashboardSwitcher
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    GraduationCap,
    Stethoscope,
    ChevronDown,
    Check,
    LayoutDashboard,
    Settings2
} from 'lucide-react';
import { useAuth } from '../../hooks/auth/useAuth';

interface DashboardOption {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
    color: string;
    bgColor: string;
    hoverColor: string;
    /** Se true, visibile solo per admin */
    adminOnly?: boolean;
}

// Configurazione delle dashboard disponibili
const dashboardOptions: DashboardOption[] = [
    {
        id: 'formazione',
        label: 'Formazione',
        description: 'Gestione corsi e formazione',
        icon: GraduationCap,
        path: '/dashboard',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        hoverColor: 'hover:bg-blue-100'
    },
    {
        id: 'poliambulatorio',
        label: 'Poliambulatorio',
        description: 'Gestione clinica e visite',
        icon: Stethoscope,
        path: '/clinica',
        color: 'text-teal-600',
        bgColor: 'bg-teal-50',
        hoverColor: 'hover:bg-teal-100'
    },
    {
        id: 'management',
        label: 'Management',
        description: 'Gestione tenant, ruoli e utenti',
        icon: Settings2,
        path: '/management',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        hoverColor: 'hover:bg-purple-100',
        adminOnly: true
    }
];

interface DashboardSwitcherProps {
    /** Variante di stile: full (dropdown), compact (solo icona), inline */
    variant?: 'full' | 'compact' | 'inline';
    /** Classi CSS aggiuntive */
    className?: string;
    /** Callback quando si cambia dashboard */
    onSwitch?: (dashboardId: string) => void;
}

/**
 * DashboardSwitcher Component
 */
export const DashboardSwitcher: React.FC<DashboardSwitcherProps> = ({
    variant = 'full',
    className = '',
    onSwitch
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Verifica se utente è admin
    const isAdmin = user?.role === 'Admin' || 
                    user?.role === 'ADMIN' ||
                    user?.role === 'SUPER_ADMIN' ||
                    user?.roleType === 'ADMIN' ||
                    user?.roleType === 'SUPER_ADMIN' ||
                    user?.globalRole === 'ADMIN' ||
                    user?.globalRole === 'SUPER_ADMIN' ||
                    user?.roles?.includes('ADMIN') || 
                    user?.roles?.includes('SUPER_ADMIN');

    // Filtra opzioni in base ai permessi
    const availableOptions = dashboardOptions.filter(option => {
        if (option.adminOnly && !isAdmin) return false;
        return true;
    });

    // Determina quale dashboard è attualmente attiva
    const getCurrentDashboard = (): DashboardOption | undefined => {
        const path = location.pathname;

        if (path.startsWith('/management')) {
            return availableOptions.find(d => d.id === 'management');
        }

        if (path.startsWith('/clinica')) {
            return availableOptions.find(d => d.id === 'poliambulatorio');
        }

        // Default: formazione (includes /dashboard, /companies, /courses, etc.)
        return availableOptions.find(d => d.id === 'formazione');
    };

    const currentDashboard = getCurrentDashboard();

    // Chiudi dropdown quando si clicca fuori
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Chiudi con Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const handleSelect = (option: DashboardOption) => {
        setIsOpen(false);
        if (onSwitch) {
            onSwitch(option.id);
        }
        navigate(option.path);
    };

    // Variante Inline - Solo bottoni affiancati
    if (variant === 'inline') {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                {availableOptions.map((option) => {
                    const isActive = currentDashboard?.id === option.id;
                    const Icon = option.icon;

                    return (
                        <button
                            key={option.id}
                            onClick={() => handleSelect(option)}
                            className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isActive
                                    ? `${option.bgColor} ${option.color} ring-2 ring-offset-1 ring-${option.color.replace('text-', '')}`
                                    : `text-gray-600 hover:bg-gray-100`
                                }
              `}
                            title={option.description}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{option.label}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    // Variante Compact - Solo icona con menu
    if (variant === 'compact') {
        const Icon = currentDashboard?.icon || LayoutDashboard;

        return (
            <div ref={dropdownRef} className={`relative ${className}`}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
            p-2 rounded-lg transition-all duration-200
            ${currentDashboard ? `${currentDashboard.bgColor} ${currentDashboard.color}` : 'bg-gray-100 text-gray-600'}
            hover:shadow-md
          `}
                    title={`Dashboard: ${currentDashboard?.label || 'Seleziona'}`}
                >
                    <Icon className="h-5 w-5" />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Cambia Dashboard
                        </div>
                        {availableOptions.map((option) => {
                            const isActive = currentDashboard?.id === option.id;
                            const Icon = option.icon;

                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleSelect(option)}
                                    className={`
                    w-full flex items-center gap-3 px-3 py-2.5 text-left
                    transition-colors duration-150
                    ${isActive ? option.bgColor : 'hover:bg-gray-50'}
                  `}
                                >
                                    <div className={`p-2 rounded-lg ${option.bgColor}`}>
                                        <Icon className={`h-4 w-4 ${option.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium ${isActive ? option.color : 'text-gray-900'}`}>
                                            {option.label}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {option.description}
                                        </p>
                                    </div>
                                    {isActive && (
                                        <Check className={`h-4 w-4 ${option.color}`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // Variante Full - Bottone completo con dropdown
    const CurrentIcon = currentDashboard?.icon || LayoutDashboard;

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          flex items-center gap-3 px-4 py-2.5 rounded-xl
          transition-all duration-200
          ${currentDashboard
                        ? `${currentDashboard.bgColor} ${currentDashboard.hoverColor}`
                        : 'bg-gray-100 hover:bg-gray-200'
                    }
          shadow-sm hover:shadow-md
        `}
            >
                <div className={`p-1.5 rounded-lg ${currentDashboard ? 'bg-white/50' : 'bg-white'}`}>
                    <CurrentIcon className={`h-5 w-5 ${currentDashboard?.color || 'text-gray-600'}`} />
                </div>
                <div className="text-left">
                    <p className={`text-sm font-semibold ${currentDashboard?.color || 'text-gray-700'}`}>
                        {currentDashboard?.label || 'Seleziona'}
                    </p>
                    <p className="text-xs text-gray-500">
                        Dashboard
                    </p>
                </div>
                <ChevronDown
                    className={`
            h-4 w-4 text-gray-400 transition-transform duration-200
            ${isOpen ? 'transform rotate-180' : ''}
          `}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="
            absolute top-full left-0 mt-2 w-72 
            bg-white rounded-xl shadow-xl border border-gray-200 
            py-2 z-50 
            animate-in fade-in slide-in-from-top-2 duration-200
          "
                >
                    <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Cambia Dashboard
                        </p>
                    </div>

                    <div className="p-2">
                        {availableOptions.map((option) => {
                            const isActive = currentDashboard?.id === option.id;
                            const Icon = option.icon;

                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleSelect(option)}
                                    className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left
                    transition-all duration-150
                    ${isActive
                                            ? `${option.bgColor} ring-1 ring-inset ring-${option.color.replace('text-', '')}/20`
                                            : 'hover:bg-gray-50'
                                        }
                  `}
                                >
                                    <div className={`
                    p-2.5 rounded-xl 
                    ${isActive ? 'bg-white shadow-sm' : option.bgColor}
                  `}>
                                        <Icon className={`h-5 w-5 ${option.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`
                      text-sm font-semibold 
                      ${isActive ? option.color : 'text-gray-900'}
                    `}>
                                            {option.label}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {option.description}
                                        </p>
                                    </div>
                                    {isActive && (
                                        <div className={`p-1 rounded-full ${option.bgColor}`}>
                                            <Check className={`h-4 w-4 ${option.color}`} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="px-4 py-2 border-t border-gray-100">
                        <p className="text-xs text-gray-400 text-center">
                            Premi ESC per chiudere
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardSwitcher;
