/**
 * ViewModeToggle Component
 * 
 * Toggle button per passare tra visualizzazione griglia e lista.
 * Stile coerente con Element Medica.
 * 
 * @module components/clinica/ViewModeToggle
 */

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import type { ViewMode } from '../../hooks/useViewMode';

interface ViewModeToggleProps {
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    /** Dimensione del toggle */
    size?: 'sm' | 'md';
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
    viewMode,
    onViewModeChange,
    size = 'md'
}) => {
    const sizeClasses = {
        sm: 'p-1.5',
        md: 'p-2'
    };

    const iconSizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5'
    };

    return (
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
                onClick={() => onViewModeChange('grid')}
                className={`
                    ${sizeClasses[size]} rounded-md transition-all duration-150
                    ${viewMode === 'grid'
                        ? 'bg-white shadow text-teal-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }
                `}
                title="Visualizzazione griglia"
            >
                <LayoutGrid className={iconSizeClasses[size]} />
            </button>
            <button
                onClick={() => onViewModeChange('list')}
                className={`
                    ${sizeClasses[size]} rounded-md transition-all duration-150
                    ${viewMode === 'list'
                        ? 'bg-white shadow text-teal-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }
                `}
                title="Visualizzazione lista"
            >
                <List className={iconSizeClasses[size]} />
            </button>
        </div>
    );
};

export { ViewModeToggle };
export default ViewModeToggle;
