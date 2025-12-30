/**
 * PersonDetails Module - Central Exports
 * 
 * Modular structure for Person entity management page.
 * 
 * @module pages/management/persons/person-details
 */

// Main component
export { default } from './PersonDetails';
export { default as PersonDetails } from './PersonDetails';

// Sub-components
export { default as ProfileHeader } from './ProfileHeader';
export {
    PersonalInfoCard,
    ContactInfoCard,
    WorkInfoCard,
    FinancialInfoCard,
    CompetenciesCard,
} from './InfoCards';
export { default as SystemRolesCard } from './SystemRolesCard';
export { default as MultiTenantAccessSection } from './MultiTenantAccessSection';
export { GdprSection, NotesSection, Timestamps } from './GdprNotesSection';

// Types
export type {
    PersonRole,
    TenantAccess,
    Company,
    Site,
    Tenant,
    PersonData,
    AccessLevel,
    NewTenantAccess,
} from './types';

// Constants
export {
    ROLE_TYPES,
    STATUS_OPTIONS,
    ROLE_LABELS,
    ROLE_COLORS,
    STATUS_COLORS,
    ACCESS_LEVEL_COLORS,
    ACCESS_LEVEL_LABELS,
} from './types';

// Utilities
export {
    formatDate,
    formatDateTime,
    formatDateForInput,
    getRoleBadgeColor,
    getRoleLabel,
    getStatusBadgeColor,
    getAccessLevelColor,
    getAccessLevelLabel,
    getStatusBadge,
    getInitials,
    isValidEmail,
    formatCurrency,
    parseArrayField,
    joinArrayField,
} from './utils';
