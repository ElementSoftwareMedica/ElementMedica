/**
 * ActionMenu Component
 * 
 * Dropdown menu a forma di pillola per azioni su entità.
 * Supporta temi diversi per ElementMedica (teal), ElementSicurezza (blue) e Management (violet).
 * Usa React Portal per garantire visibilità corretta del dropdown.
 * 
 * @module components/ui/ActionMenu
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Eye, Edit, Trash2, type LucideIcon } from 'lucide-react';

export interface ActionMenuItem {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: 'default' | 'danger';
    disabled?: boolean;
    hidden?: boolean;
}

export type ActionMenuTheme = 'teal' | 'blue' | 'violet';

interface ActionMenuProps {
    actions: ActionMenuItem[];
    /** Posizione del menu rispetto al trigger */
    position?: 'left' | 'right';
    /** Dimensione del trigger */
    size?: 'sm' | 'md';
    /** Label del pulsante (default: "Azioni") */
    label?: string;
    /** Tema colore: 'teal' (ElementMedica), 'blue' (ElementSicurezza), 'violet' (Management) */
    theme?: ActionMenuTheme;
}

// Theme configurations
const THEME_CLASSES: Record<ActionMenuTheme, {
    button: string;
    hoverItem: string;
    iconHover: string;
    ring: string;
}> = {
    teal: {
        button: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200 hover:border-teal-300',
        hoverItem: 'hover:bg-teal-50 hover:text-teal-700',
        iconHover: 'group-hover:text-teal-600',
        ring: 'focus:ring-teal-500'
    },
    blue: {
        button: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 hover:border-blue-300',
        hoverItem: 'hover:bg-blue-50 hover:text-blue-700',
        iconHover: 'group-hover:text-blue-600',
        ring: 'focus:ring-blue-500'
    },
    violet: {
        button: 'bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200 hover:border-violet-300',
        hoverItem: 'hover:bg-violet-50 hover:text-violet-700',
        iconHover: 'group-hover:text-violet-600',
        ring: 'focus:ring-violet-500'
    }
};

const ActionMenu: React.FC<ActionMenuProps> = ({
    actions,
    position = 'left',
    size = 'md',
    label = 'Azioni',
    theme = 'teal'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const themeConfig = THEME_CLASSES[theme];

    // Calculate and update menu position
    const updateMenuPosition = useCallback(() => {
        if (!buttonRef.current || !isOpen) return;

        const buttonRect = buttonRef.current.getBoundingClientRect();
        const menuHeight = 200; // Approximate menu height
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;

        // Determine if menu should open upward
        const openUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;

        let top: number;
        if (openUpward) {
            top = buttonRect.top + window.scrollY - menuHeight - 4;
        } else {
            top = buttonRect.bottom + window.scrollY + 4;
        }

        let left: number;
        if (position === 'left') {
            left = buttonRect.right - 160; // min-w-[160px]
        } else {
            left = buttonRect.left;
        }

        // Ensure menu stays within viewport horizontally
        left = Math.max(8, Math.min(left, window.innerWidth - 168));

        setMenuPosition({ top, left });
    }, [isOpen, position]);

    // Update position on open and scroll/resize
    useEffect(() => {
        if (isOpen) {
            updateMenuPosition();
            window.addEventListener('scroll', updateMenuPosition, true);
            window.addEventListener('resize', updateMenuPosition);
        }

        return () => {
            window.removeEventListener('scroll', updateMenuPosition, true);
            window.removeEventListener('resize', updateMenuPosition);
        };
    }, [isOpen, updateMenuPosition]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                menuRef.current && !menuRef.current.contains(target) &&
                buttonRef.current && !buttonRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Close menu on escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const visibleActions = actions.filter(action => !action.hidden);

    if (visibleActions.length === 0) {
        return null;
    }

    const sizeClasses = {
        sm: 'px-2.5 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm'
    };

    const iconSizeClasses = {
        sm: 'h-3.5 w-3.5',
        md: 'h-4 w-4'
    };

    const dropdownMenu = isOpen && menuPosition && createPortal(
        <div
            ref={menuRef}
            className="fixed z-[99999] min-w-[160px] rounded-lg bg-white border border-gray-200 shadow-xl py-1"
            style={{
                top: menuPosition.top,
                left: menuPosition.left,
            }}
        >
            {visibleActions.map((action, index) => {
                const Icon = action.icon;
                const isDisabled = action.disabled;
                const isDanger = action.variant === 'danger';

                return (
                    <button
                        key={index}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isDisabled) {
                                action.onClick();
                                setIsOpen(false);
                            }
                        }}
                        disabled={isDisabled}
                        className={`
                            w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left
                            transition-colors duration-100
                            ${isDisabled
                                ? 'text-gray-400 cursor-not-allowed'
                                : isDanger
                                    ? 'text-red-600 hover:bg-red-50'
                                    : `text-gray-700 ${themeConfig.hoverItem}`
                            }
                        `}
                    >
                        {Icon && (
                            <Icon className={`${iconSizeClasses[size]} ${isDisabled
                                ? 'text-gray-400'
                                : isDanger
                                    ? 'text-red-500'
                                    : `text-gray-500 ${themeConfig.iconHover}`
                                }`} />
                        )}
                        <span>{action.label}</span>
                    </button>
                );
            })}
        </div>,
        document.body
    );

    return (
        <div className="relative inline-block">
            {/* Trigger Button - Pill shaped */}
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`
                    inline-flex items-center gap-1.5 rounded-full
                    ${themeConfig.button}
                    border font-medium transition-all duration-150
                    focus:outline-none focus:ring-2 ${themeConfig.ring} focus:ring-offset-1
                    ${sizeClasses[size]}
                `}
            >
                <span>{label}</span>
                <ChevronDown className={`${iconSizeClasses[size]} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownMenu}
        </div>
    );
};

export { ActionMenu };
export default ActionMenu;

// Helper function to create standard CRUD actions
// Supports both object and positional parameters for backward compatibility
export const createCrudActions = (
    onViewOrOptions: (() => void) | { onView?: () => void; onEdit?: () => void; onDelete?: () => void },
    onEdit?: () => void,
    onDelete?: () => void
): ActionMenuItem[] => {
    // Handle object parameter
    if (typeof onViewOrOptions === 'object') {
        const { onView, onEdit: editFn, onDelete: deleteFn } = onViewOrOptions;
        const actions: ActionMenuItem[] = [];
        if (onView) actions.push({ label: 'Visualizza', icon: Eye, onClick: onView });
        if (editFn) actions.push({ label: 'Modifica', icon: Edit, onClick: editFn });
        if (deleteFn) actions.push({ label: 'Elimina', icon: Trash2, onClick: deleteFn, variant: 'danger' });
        return actions;
    }

    // Handle positional parameters
    const actions: ActionMenuItem[] = [];
    if (onViewOrOptions) actions.push({ label: 'Visualizza', icon: Eye, onClick: onViewOrOptions });
    if (onEdit) actions.push({ label: 'Modifica', icon: Edit, onClick: onEdit });
    if (onDelete) actions.push({ label: 'Elimina', icon: Trash2, onClick: onDelete, variant: 'danger' });
    return actions;
};

// Re-export types for convenience
export type { ActionMenuProps };
