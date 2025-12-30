/**
 * SlideEditor Module - Central exports
 * 
 * Editor per creare slide/presentazioni con elementi posizionabili.
 * 
 * @module slide-editor
 */

// Main component
export { default as SlideEditor } from './SlideEditor';
export { default } from './SlideEditor';

// Sub-components
export { default as ContentEditableText } from './ContentEditableText';
export { default as EditorToolbar } from './EditorToolbar';
export { default as PropertiesPanel } from './PropertiesPanel';
export { default as MarginsPanel } from './MarginsPanel';
export { default as SlideElementRenderer, renderLineElement } from './SlideElementRenderer';

// Hooks
export { useSlideEditorState } from './useSlideEditorState';
export { useSlideEditorEvents } from './useSlideEditorEvents';

// Types and constants
export type {
    SlideElement,
    SlideElementStyle,
    MarginsConfig,
    SlideEditorProps,
} from './types';

export {
    PRINT_MARGINS,
    DEFAULT_MARGINS,
    DEFAULT_STYLES,
    FONT_OPTIONS,
    LINE_THICKNESS_OPTIONS,
    RESIZE_HANDLES,
    generateId,
} from './types';
