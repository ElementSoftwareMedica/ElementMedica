/**
 * Templates Module Exports
 * Settings/Templates Redesign Project
 */

// Pages
export { default as TemplateEditor } from './TemplateEditor';

// Components
export { default as TiptapEditor } from './components/editor/TiptapEditor';
export { default as EditorToolbar } from './components/editor/EditorToolbar';

// Hooks
export { useTemplateEditor } from './hooks/useTemplateEditor';

// Services
export { default as templateService } from './services/templateService';

// Types
export * from './types/template.types';
export * from './types/editor.types';

// Utils
export * from './utils/constants';
