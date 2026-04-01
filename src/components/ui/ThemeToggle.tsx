/**
 * ThemeToggle - Componente per switch tra temi
 * P60: Design System Unificato e Dark Mode
 * 
 * Varianti:
 * - button: semplice toggle (click per cambiare)
 * - dropdown: selettore con auto/light/dark
 */

import React from 'react';
import { Moon, Sun, Monitor, ChevronDown, Check } from 'lucide-react';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { cn } from '../../design-system/utils';

interface ThemeToggleProps {
    /** Variante del componente */
    variant?: 'button' | 'dropdown';
    /** Dimensione */
    size?: 'sm' | 'md' | 'lg';
    /** Classe CSS aggiuntiva */
    className?: string;
    /** Mostra label testuale */
    showLabel?: boolean;
}

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
    { value: 'auto', label: 'Sistema', icon: <Monitor className="w-4 h-4" /> },
    { value: 'light', label: 'Chiaro', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Scuro', icon: <Moon className="w-4 h-4" /> },
];

const SIZE_CLASSES = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
};

const ICON_SIZE_CLASSES = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
};

/**
 * Toggle semplice - un click per cambiare tema
 */
function ThemeToggleButton({ size = 'md', className }: Omit<ThemeToggleProps, 'variant'>) {
    const { toggleTheme, isDark, isAuto, resolvedTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={cn(
                'rounded-lg transition-all duration-200',
                'bg-gray-100 dark:bg-gray-800',
                'hover:bg-gray-200 dark:hover:bg-gray-700',
                'text-gray-600 dark:text-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'dark:focus:ring-offset-gray-900',
                SIZE_CLASSES[size],
                className
            )}
            title={`Tema attuale: ${isAuto ? 'Sistema' : isDark ? 'Scuro' : 'Chiaro'}. Clicca per cambiare.`}
            aria-label="Cambia tema"
        >
            <span className="relative flex items-center justify-center">
                {/* Sun icon - visibile in dark mode */}
                <Sun
                    className={cn(
                        ICON_SIZE_CLASSES[size],
                        'transition-all duration-300',
                        isDark
                            ? 'rotate-0 scale-100 opacity-100'
                            : 'rotate-90 scale-0 opacity-0 absolute'
                    )}
                />
                {/* Moon icon - visibile in light mode */}
                <Moon
                    className={cn(
                        ICON_SIZE_CLASSES[size],
                        'transition-all duration-300',
                        !isDark
                            ? 'rotate-0 scale-100 opacity-100'
                            : '-rotate-90 scale-0 opacity-0 absolute'
                    )}
                />
            </span>
        </button>
    );
}

/**
 * Dropdown con opzioni auto/light/dark
 */
function ThemeToggleDropdown({ size = 'md', className, showLabel }: Omit<ThemeToggleProps, 'variant'>) {
    const { mode, setMode, isDark, resolvedTheme } = useTheme();
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Chiudi dropdown quando si clicca fuori
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentOption = THEME_OPTIONS.find(opt => opt.value === mode);
    const CurrentIcon = isDark ? Moon : Sun;

    return (
        <div ref={dropdownRef} className={cn('relative', className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'flex items-center gap-2 rounded-lg transition-all duration-200',
                    'bg-gray-100 dark:bg-gray-800',
                    'hover:bg-gray-200 dark:hover:bg-gray-700',
                    'text-gray-700 dark:text-gray-200',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    'dark:focus:ring-offset-gray-900',
                    SIZE_CLASSES[size],
                    showLabel && 'px-3'
                )}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <CurrentIcon className={ICON_SIZE_CLASSES[size]} />
                {showLabel && (
                    <span className="text-sm font-medium">{currentOption?.label}</span>
                )}
                <ChevronDown className={cn(
                    'w-3 h-3 transition-transform duration-200',
                    isOpen && 'rotate-180'
                )} />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className={cn(
                    'absolute right-0 mt-2 w-40 py-1 z-50',
                    'bg-white dark:bg-gray-800',
                    'border border-gray-200 dark:border-gray-700',
                    'rounded-lg shadow-lg',
                    'animate-in fade-in-0 zoom-in-95 duration-150'
                )}>
                    <ul role="listbox" className="py-1">
                        {THEME_OPTIONS.map((option) => (
                            <li key={option.value}>
                                <button
                                    role="option"
                                    aria-selected={mode === option.value}
                                    onClick={() => {
                                        setMode(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2 text-sm',
                                        'transition-colors duration-150',
                                        mode === option.value
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    )}
                                >
                                    {option.icon}
                                    <span className="flex-1 text-left">{option.label}</span>
                                    {mode === option.value && (
                                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

/**
 * Componente principale ThemeToggle
 */
export function ThemeToggle({
    variant = 'button',
    size = 'md',
    className,
    showLabel = false
}: ThemeToggleProps) {
    if (variant === 'dropdown') {
        return <ThemeToggleDropdown size={size} className={className} showLabel={showLabel} />;
    }
    return <ThemeToggleButton size={size} className={className} />;
}

export default ThemeToggle;
