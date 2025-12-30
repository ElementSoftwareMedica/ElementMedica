/**
 * SlideEditor Types - Types, interfaces and constants
 */

// Types
export interface SlideElement {
    id: string;
    type: 'text' | 'image' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'qrcode';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    content?: string;
    src?: string;
    style?: SlideElementStyle;
    locked?: boolean;
    zIndex: number;
}

export interface SlideElementStyle {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    lineWidth?: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    arrowSize?: number;
}

export interface MarginsConfig {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface SlideEditorProps {
    width: string;
    height: string;
    elements: SlideElement[];
    onChange: (elements: SlideElement[]) => void;
    className?: string;
    orientation?: 'portrait' | 'landscape';
    showPrintArea?: boolean;
    margins?: MarginsConfig;
    onMarginsChange?: (margins: MarginsConfig) => void;
}

// Constants

// Print area margins (in pixels, for A4 at 96dpi)
export const PRINT_MARGINS = {
    portrait: { top: 38, right: 38, bottom: 38, left: 38 },
    landscape: { top: 38, right: 38, bottom: 38, left: 38 }
};

// Default margins in pixels (10mm at 96dpi = ~38px)
export const DEFAULT_MARGINS: MarginsConfig = { top: 38, right: 38, bottom: 38, left: 38 };

// Default styles for new elements
export const DEFAULT_STYLES: Record<SlideElement['type'], Partial<SlideElementStyle>> = {
    text: {
        backgroundColor: 'transparent',
        borderColor: '#e2e8f0',
        borderWidth: 0,
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#1e293b',
        textAlign: 'left' as const,
    },
    image: {
        borderColor: '#e2e8f0',
        borderWidth: 0,
        borderRadius: 0,
    },
    rectangle: {
        backgroundColor: '#3b82f6',
        borderColor: '#1d4ed8',
        borderWidth: 2,
        borderRadius: 4,
    },
    ellipse: {
        backgroundColor: '#10b981',
        borderColor: '#059669',
        borderWidth: 2,
    },
    line: {
        borderColor: '#1e293b',
        lineWidth: 2,
        lineStyle: 'solid' as const,
    },
    arrow: {
        borderColor: '#1e293b',
        lineWidth: 2,
        lineStyle: 'solid' as const,
        arrowSize: 10,
    },
    qrcode: {
        backgroundColor: 'transparent',
        borderColor: '#e2e8f0',
        borderWidth: 1,
    },
};

// Helper to generate unique IDs
export const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Font options for text elements
export const FONT_OPTIONS = {
    sansSerif: [
        { value: 'Arial', label: 'Arial' },
        { value: 'Helvetica', label: 'Helvetica' },
        { value: 'Verdana', label: 'Verdana' },
        { value: 'Tahoma', label: 'Tahoma' },
        { value: 'Trebuchet MS', label: 'Trebuchet MS' },
        { value: 'Open Sans', label: 'Open Sans' },
        { value: 'Roboto', label: 'Roboto' },
        { value: 'Lato', label: 'Lato' },
        { value: 'Montserrat', label: 'Montserrat' },
        { value: 'Poppins', label: 'Poppins' },
        { value: 'Inter', label: 'Inter' },
    ],
    serif: [
        { value: 'Times New Roman', label: 'Times New Roman' },
        { value: 'Georgia', label: 'Georgia' },
        { value: 'Palatino', label: 'Palatino' },
        { value: 'Book Antiqua', label: 'Book Antiqua' },
        { value: 'Garamond', label: 'Garamond' },
        { value: 'Playfair Display', label: 'Playfair Display' },
        { value: 'Merriweather', label: 'Merriweather' },
    ],
    monospace: [
        { value: 'Courier New', label: 'Courier New' },
        { value: 'Consolas', label: 'Consolas' },
        { value: 'Monaco', label: 'Monaco' },
        { value: 'Fira Code', label: 'Fira Code' },
    ],
    decorative: [
        { value: 'Comfortaa, cursive', label: 'Comfortaa' },
        { value: 'Pacifico, cursive', label: 'Pacifico' },
        { value: 'Dancing Script, cursive', label: 'Dancing Script' },
        { value: 'Lobster, cursive', label: 'Lobster' },
        { value: 'Satisfy, cursive', label: 'Satisfy' },
    ],
};

// Line thickness options
export const LINE_THICKNESS_OPTIONS = [1, 2, 4, 6, 8];

// Resize handles configuration
export const RESIZE_HANDLES = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'] as const;
