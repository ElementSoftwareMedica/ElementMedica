/**
 * DoctorName Component
 * Displays doctor name with correct Italian honorific (Dott./Dott.ssa)
 * Derives gender from Italian tax code (codice fiscale)
 * 
 * @module components/common/DoctorName
 */

import React from 'react';
import { formatDoctorName, extractGenderFromTaxCode } from '../../utils/codiceFiscale';

interface DoctorNameProps {
    /** First name */
    firstName?: string;
    /** Last name */
    lastName?: string;
    /** Tax code (codice fiscale) - used to derive gender */
    taxCode?: string | null;
    /** Explicit gender override - if not provided, derived from taxCode */
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null;
    /** Whether to show the title (Dott./Dott.ssa) */
    showTitle?: boolean;
    /** Order of name display */
    nameOrder?: 'firstLast' | 'lastFirst';
    /** CSS class name */
    className?: string;
    /** Display style */
    variant?: 'full' | 'compact' | 'titleOnly';
}

/**
 * Component for displaying doctor names with proper Italian honorific
 * 
 * @example
 * // Full name with title derived from tax code
 * <DoctorName firstName="Mario" lastName="Rossi" taxCode="RSSMRA80A01H501Z" />
 * // Output: Dott. Mario Rossi
 * 
 * @example
 * // Last name first (common in lists)
 * <DoctorName firstName="Maria" lastName="Bianchi" taxCode="BNCMRA80A41H501Z" nameOrder="lastFirst" />
 * // Output: Dott.ssa Bianchi Maria
 */
export const DoctorName: React.FC<DoctorNameProps> = ({
    firstName = '',
    lastName = '',
    taxCode,
    gender,
    showTitle = true,
    nameOrder = 'lastFirst',
    className = '',
    variant = 'full'
}) => {
    // Determine gender from explicit prop or tax code
    let derivedGender: 'MALE' | 'FEMALE' | null = null;

    if (gender === 'MALE' || gender === 'FEMALE') {
        derivedGender = gender;
    } else if (taxCode) {
        derivedGender = extractGenderFromTaxCode(taxCode);
    }

    // Get title
    const getTitle = (): string => {
        if (!showTitle) return '';
        if (derivedGender === 'FEMALE') return 'Dott.ssa';
        if (derivedGender === 'MALE') return 'Dott.';
        return 'Dott.'; // Default to masculine if unknown
    };

    // Format the full name
    const getFullName = (): string => {
        const title = getTitle();
        const name = nameOrder === 'lastFirst'
            ? `${lastName} ${firstName}`.trim()
            : `${firstName} ${lastName}`.trim();

        switch (variant) {
            case 'titleOnly':
                return title;
            case 'compact':
                return showTitle ? `${title} ${lastName}`.trim() : lastName;
            case 'full':
            default:
                return showTitle ? `${title} ${name}`.trim() : name;
        }
    };

    return <span className={className}>{getFullName()}</span>;
};

/**
 * Hook to get doctor display name
 * Useful when you need the string value without a component
 */
export const useDoctorName = (props: Omit<DoctorNameProps, 'className'>) => {
    const {
        firstName = '',
        lastName = '',
        taxCode,
        gender,
        showTitle = true,
        nameOrder = 'lastFirst',
        variant = 'full'
    } = props;

    // Determine gender
    let derivedGender: 'MALE' | 'FEMALE' | null = null;

    if (gender === 'MALE' || gender === 'FEMALE') {
        derivedGender = gender;
    } else if (taxCode) {
        derivedGender = extractGenderFromTaxCode(taxCode);
    }

    const title = derivedGender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';

    const name = nameOrder === 'lastFirst'
        ? `${lastName} ${firstName}`.trim()
        : `${firstName} ${lastName}`.trim();

    switch (variant) {
        case 'titleOnly':
            return showTitle ? title : '';
        case 'compact':
            return showTitle ? `${title} ${lastName}`.trim() : lastName;
        case 'full':
        default:
            return showTitle ? `${title} ${name}`.trim() : name;
    }
};

export default DoctorName;
