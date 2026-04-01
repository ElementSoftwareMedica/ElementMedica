/**
 * Icon Mapper - Maps string icon names to Lucide React components
 * 
 * Used to convert icon names stored in database (as strings) to actual React components
 * 
 * @module pages/clinica/clinica/utils/iconMapper
 * @project P52 - Clinical Visit Template System
 */

import React from 'react';
import {
    ClipboardList,
    Activity,
    Stethoscope,
    FileText,
    Pill,
    Calendar,
    UserCheck,
    Heart,
    Thermometer,
    Eye,
    Ear,
    Shield,
    AlertCircle,
    CheckCircle,
    Clock,
    Folder,
    FileCheck,
    Brain,
    Bone,
    Droplet,
    Wind,
    Zap,
    Settings,
    Plus,
    type LucideIcon
} from 'lucide-react';

// Map of icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
    ClipboardList,
    Activity,
    Stethoscope,
    FileText,
    Pill,
    Calendar,
    UserCheck,
    Heart,
    Thermometer,
    Eye,
    Ear,
    Shield,
    AlertCircle,
    CheckCircle,
    Clock,
    Folder,
    FileCheck,
    Brain,
    Bone,
    Droplet,
    Wind,
    Zap,
    Settings,
    Plus,
};

/**
 * Get a Lucide icon component from its string name
 * 
 * @param iconName - The name of the icon (e.g., 'ClipboardList', 'Activity')
 * @param className - Optional CSS classes to apply
 * @returns React element for the icon, or a default icon if not found
 */
export const getIconByName = (
    iconName: string | undefined,
    className: string = 'w-5 h-5'
): React.ReactElement => {
    if (!iconName) {
        return <FileText className={className} />;
    }

    const IconComponent = iconMap[iconName];

    if (IconComponent) {
        return <IconComponent className={className} />;
    }

    // If icon name not found, return the string as fallback (for emoji icons)
    // Check if it's an emoji by looking for emoji characters
    const emojiPattern = /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F700}-\u{1F77F}|\u{1F780}-\u{1F7FF}|\u{1F800}-\u{1F8FF}|\u{1F900}-\u{1F9FF}|\u{1FA00}-\u{1FA6F}|\u{1FA70}-\u{1FAFF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/u;

    if (emojiPattern.test(iconName)) {
        return <span className={className}>{iconName}</span>;
    }

    // Default fallback icon
    return <FileText className={className} />;
};

/**
 * Icon Renderer component for use in JSX
 */
export const IconRenderer: React.FC<{
    icon: string | undefined;
    className?: string;
}> = ({ icon, className = 'w-5 h-5' }) => {
    return getIconByName(icon, className);
};

export default iconMap;
