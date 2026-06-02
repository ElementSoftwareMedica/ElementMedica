/**
 * useVisitaSidebar - Hook for sidebar state management
 * 
 * Manages sidebar sections, collapse state, and active section
 * 
 * @module pages/clinica/clinica/hooks/useVisitaSidebar
 * @project P52 - Clinical Visit Template System
 */

import { useState, useCallback, useMemo } from 'react';
import type { VisitTemplate, VisitField, VisitSidebarSection } from '../../../../services/clinicaApi';
import type { SidebarState, SectionFields, UseVisitaSidebarReturn } from '../types';

// Default section icons
const SECTION_ICONS: Record<string, string> = {
    anamnesi: '📋',
    vitali: '❤️',
    esame: '🩺',
    diagnosi: '🔍',
    terapia: '💊',
    followup: '📅',
    allegati: '📎',
    storia: '📚'
};

// Default section labels
const SECTION_LABELS: Record<string, string> = {
    anamnesi: 'Anamnesi',
    vitali: 'Parametri Vitali',
    esame: 'Esame Obiettivo',
    diagnosi: 'Diagnosi',
    terapia: 'Terapia',
    followup: 'Follow-up',
    allegati: 'Allegati',
    storia: 'Storia Clinica'
};

export function useVisitaSidebar(template: VisitTemplate | null): UseVisitaSidebarReturn {
    // Sidebar state
    const [state, setState] = useState<SidebarState>({
        activeSection: template?.sidebarConfig?.defaultTab || 'anamnesi',
        collapsedSections: new Set(template?.sidebarConfig?.defaultCollapsed || []),
        isMinimized: false
    });

    // Build sections from template
    const sections: SectionFields[] = useMemo(() => {
        if (!template?.fields) return [];

        // Get sidebar config
        const sidebarConfig = template.sidebarConfig || {
            collapsible: true,
            defaultTab: 'anamnesi',
            sections: []
        };

        // Group fields by section
        const fieldsBySection: Record<string, VisitField[]> = {};

        template.fields.forEach((field: VisitField) => {
            if (field.visible === false) return;

            const section = field.section || 'altro';
            if (!fieldsBySection[section]) {
                fieldsBySection[section] = [];
            }
            fieldsBySection[section].push(field);
        });

        // Sort fields within each section by order
        Object.keys(fieldsBySection).forEach(section => {
            fieldsBySection[section].sort((a, b) => (a.order || 0) - (b.order || 0));
        });

        // Build section array based on sidebar config
        const configuredSections = sidebarConfig.sections || [];
        const sectionOrder = configuredSections.map((s: VisitSidebarSection) => s.id);

        // Add any sections that have fields but aren't in config
        Object.keys(fieldsBySection).forEach(section => {
            if (!sectionOrder.includes(section)) {
                sectionOrder.push(section);
            }
        });

        // Build final sections array
        return sectionOrder
            .filter((sectionId: string) => {
                // Check if section is visible in config
                const configSection = configuredSections.find((s: VisitSidebarSection) => s.id === sectionId);
                if (configSection && !configSection.visible) return false;

                // Check if section has any fields
                return fieldsBySection[sectionId]?.length > 0;
            })
            .map((sectionId: string) => {
                const configSection = configuredSections.find((s: VisitSidebarSection) => s.id === sectionId);

                return {
                    section: sectionId,
                    label: configSection?.title || configSection?.label || SECTION_LABELS[sectionId] || sectionId,
                    icon: configSection?.icon || SECTION_ICONS[sectionId] || '📄',
                    fields: fieldsBySection[sectionId] || [],
                    isExpanded: configSection?.expandedByDefault ?? true
                };
            });
    }, [template]);

    // Toggle section collapse
    const toggleSection = useCallback((sectionId: string) => {
        setState(prev => {
            const newCollapsed = new Set(prev.collapsedSections);
            if (newCollapsed.has(sectionId)) {
                newCollapsed.delete(sectionId);
            } else {
                newCollapsed.add(sectionId);
            }
            return {
                ...prev,
                collapsedSections: newCollapsed
            };
        });
    }, []);

    // Set active section
    const setActiveSection = useCallback((sectionId: string) => {
        setState(prev => ({
            ...prev,
            activeSection: sectionId
        }));
    }, []);

    // Toggle minimize
    const toggleMinimize = useCallback(() => {
        setState(prev => ({
            ...prev,
            isMinimized: !prev.isMinimized
        }));
    }, []);

    return {
        state,
        sections,
        toggleSection,
        setActiveSection,
        toggleMinimize
    };
}
