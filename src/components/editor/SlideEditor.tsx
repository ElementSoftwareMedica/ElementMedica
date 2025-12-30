/**
 * SlideEditor - Re-export from modular structure
 * 
 * @see ./slide-editor/SlideEditor.tsx for main implementation
 * @see ./slide-editor/README.md for documentation
 */

export { 
    default,
    SlideEditor,
    ContentEditableText,
    EditorToolbar,
    PropertiesPanel,
    MarginsPanel,
    SlideElementRenderer,
    renderLineElement,
    useSlideEditorState,
    useSlideEditorEvents,
    PRINT_MARGINS,
    DEFAULT_MARGINS,
    DEFAULT_STYLES,
    FONT_OPTIONS,
    LINE_THICKNESS_OPTIONS,
    RESIZE_HANDLES,
    generateId,
} from './slide-editor';

export type {
    SlideElement,
    SlideElementStyle,
    MarginsConfig,
    SlideEditorProps,
} from './slide-editor';
