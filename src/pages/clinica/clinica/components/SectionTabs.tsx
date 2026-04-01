/**
 * SectionTabs - Alternative tab-based section navigation
 * 
 * Provides horizontal tab navigation as an alternative to the sidebar.
 * Configured via template sidebarConfig.sectionLayout: 'tabs'
 * 
 * @module pages/clinica/clinica/components/SectionTabs
 * @project P52 - Clinical Visit Template System
 */

import React from 'react';
import type { SectionFields } from '../types';
import { IconRenderer } from '../utils/iconMapper';

interface SectionTabsProps {
    sections: SectionFields[];
    activeSection: string;
    onSectionClick: (sectionId: string) => void;
    className?: string;
}

export const SectionTabs: React.FC<SectionTabsProps> = ({
    sections,
    activeSection,
    onSectionClick,
    className = ''
}) => {
    if (sections.length === 0) {
        return null;
    }

    return (
        <div className={`bg-white border-b border-gray-200 ${className}`}>
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <nav className="flex space-x-1 overflow-x-auto py-2" aria-label="Sections">
                    {sections.map((section) => {
                        const isActive = activeSection === section.section;

                        return (
                            <button
                                key={section.section}
                                onClick={() => onSectionClick(section.section)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium 
                                    whitespace-nowrap transition-all duration-200
                                    ${isActive
                                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                `}
                            >
                                {/* Icon */}
                                <IconRenderer icon={section.icon} className="w-4 h-4" />

                                {/* Label */}
                                <span>{section.label}</span>

                                {/* Field count badge */}
                                <span className={`
                                    px-1.5 py-0.5 rounded text-xs font-medium
                                    ${isActive
                                        ? 'bg-teal-100 text-teal-600'
                                        : 'bg-gray-100 text-gray-500'
                                    }
                                `}>
                                    {section.fields.length}
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};

export default SectionTabs;
