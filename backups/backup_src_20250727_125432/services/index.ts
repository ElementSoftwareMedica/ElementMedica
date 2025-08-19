/**
 * API Services Export
 * 
 * This file exports all service functions to simplify imports.
 * Import services from this file instead of individual files:
 * 
 * import { getCompanies, getCourses } from '@/services';
 */

// Export shared types for convenience
// export * from '../../shared'; // Commented out - shared directory is empty

// Export the API client
export { default as apiClient, setupInterceptors } from './apiClient';

// Export all company services
export * from './companies';

// Export all course services
export * from './courses';

// Export all employee services
export * from './employees';

// Export all trainer services
export * from './trainers';