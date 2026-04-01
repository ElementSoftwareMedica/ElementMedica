/**
 * VisitSidebar - Sidebar navigation for visit sections
 * 
 * Displays all configurable sections with their visibility
 * and allows quick navigation between sections
 * 
 * @module pages/clinica/clinica/components/VisitSidebar
 * @project P52 - Clinical Visit Template System
 */

import React from 'react';
import { ChevronLeft, ChevronRight as Expand } from 'lucide-react';
import type { SidebarProps } from '../types';
import { IconRenderer } from '../utils/iconMapper';

export const VisitSidebar: React.FC<SidebarProps> = ({
    sections,
    activeSection,
    collapsedSections,
    onSectionClick,
    onToggleCollapse,
    isMinimized = false,
    onToggleMinimize
}) => {
    if (isMinimized) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2">
                <div className="flex items-center gap-1 overflow-x-auto">
                    {sections.map((section) => (
                        <button
                            key={section.section}
                            onClick={() => {
                                onSectionClick(section.section);
                                if (onToggleMinimize) onToggleMinimize();
                            }}
                            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors text-lg ${activeSection === section.section
                                ? 'bg-teal-50 text-teal-600'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                }`}
                            title={section.label}
                        >
                            <IconRenderer icon={section.icon} className="w-4 h-4" />
                        </button>
                    ))}
                    <button
                        onClick={onToggleMinimize}
                        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-teal-600 hover:bg-gray-50 rounded-lg transition-colors ml-auto"
                        title="Espandi sezioni visita"
                    >
                        <Expand className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">Sezioni Visita</h3>
                {onToggleMinimize && (
                    <button
                        onClick={onToggleMinimize}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                        title="Riduci sezioni visita"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Sections List */}
            <nav className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {sections.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                        Nessuna sezione configurata
                    </p>
                ) : (
                    <ul className="space-y-1">
                        {sections.map((section) => {
                            const isActive = activeSection === section.section;
                            const isCollapsed = collapsedSections.has(section.section);

                            return (
                                <li key={section.section}>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => onSectionClick(section.section)}
                                        onKeyDown={(e) => e.key === 'Enter' && onSectionClick(section.section)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                                                  transition-all duration-200 text-left group cursor-pointer ${isActive
                                                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                            }`}
                                    >
                                        {/* Icon */}
                                        <IconRenderer icon={section.icon} className="w-5 h-5" />

                                        {/* Label & Count */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${isActive ? 'text-teal-700' : 'text-gray-700'
                                                }`}>
                                                {section.label}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {section.fields.length} campi
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </nav>

            {/* Footer with stats */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{sections.length} sezioni</span>
                    <span>
                        {sections.reduce((sum, s) => sum + s.fields.length, 0)} campi totali
                    </span>
                </div>
            </div>
        </div>
    );
};

export default VisitSidebar;
