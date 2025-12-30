/**
 * ExpiringCoursesSection - Module Exports
 * 
 * Central export point for all expiring courses components.
 */

// Types
export * from './types';

// Components
export { DownloadDropdown, ImportDropdown } from './DropdownComponents';
export { GroupedCourseDetails } from './GroupedCourseDetails';
export { ImportExpiringCoursesModal } from './ImportExpiringCoursesModal';
export { AddExternalCourseModal } from './AddExternalCourseModal';
export { getSourceBadge, getStatusBadge, getScheduledBadge } from './StatusBadges';

// Main component
export { default as ExpiringCoursesSection } from './ExpiringCoursesSection';
export { default } from './ExpiringCoursesSection';
