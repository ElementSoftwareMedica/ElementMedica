/**
 * Template-related components export
 * 
 * This file exports all template-related components for easier importing:
 * import { PlaceholderManager, GoogleTemplateProvider } from '@/components/shared/template';
 */

export { default as PlaceholderManager } from './PlaceholderManager';
export { default as PlaceholderPreview } from './PlaceholderPreview';
export { default as PlaceholderDemo } from './PlaceholderDemo'; 
export { default as GoogleTemplateProvider } from './GoogleTemplateProvider';
export { default as GoogleDocsPreview } from './GoogleDocsPreview';

// New modular components
export { TemplateCard } from './TemplateCard';
export { TemplateActionDropdown } from './TemplateActionDropdown';
export { NewTemplateDropdown } from './NewTemplateDropdown';
export { PlaceholdersLegend } from './PlaceholdersLegend';
export { TemplateFormModal } from './TemplateFormModal';
export { TemplateTypeCard } from './TemplateTypeCard';
export { NotificationBanner } from './NotificationBanner';
export { Switch } from './Switch';
export { Toast, useToast } from './Toast';

// Constants and utilities
export * from './constants';
export * from './templateExamples';
export * from './templateUtils';