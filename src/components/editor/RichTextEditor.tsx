/**
 * RichTextEditor - Componente per editing rich text inline
 * 
 * Supporta:
 * - Grassetto/Corsivo/Sottolineato/Barrato
 * - Liste puntate e numerate
 * - Allineamento testo
 * - Heading e paragrafi
 * - Cambio colore testo e sfondo
 * - ContentEditable per editing naturale
 * - Active state tracking per bottoni toolbar
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Heading1,
    Heading2,
    Minus,
    Undo,
    Redo,
    RemoveFormatting,
    Palette,
    Highlighter
} from 'lucide-react';
import { sanitizeRichHtml } from '@/utils/sanitize';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    onBlur?: () => void;
    style?: React.CSSProperties;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
}

// Bottone toolbar riutilizzabile con active state
const ToolbarButton: React.FC<{
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    isActive?: boolean;
    className?: string;
}> = ({ onClick, title, children, isActive = false, className = '' }) => (
    <button
        onClick={onClick}
        onMouseDown={(e) => e.preventDefault()}
        className={`p-1 rounded transition-all duration-150 ${isActive
            ? 'bg-teal-100 text-teal-700 shadow-sm'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            } ${className}`}
        title={title}
        type="button"
    >
        {children}
    </button>
);

// Gruppo di bottoni con sfondo sottile
const ToolbarGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center gap-0.5 px-1 py-0.5 bg-gray-50 rounded-md">
        {children}
    </div>
);

// Toolbar per formattazione testo - design moderno e compatto
const FormattingToolbar: React.FC<{
    onFormat: (command: string, value?: string) => void;
    activeFormats: Set<string>;
}> = ({ onFormat, activeFormats }) => {
    return (
        <div
            className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-white border-b border-gray-200"
            onMouseDown={(e) => e.preventDefault()} // Prevent blur
        >
            {/* Undo/Redo */}
            <ToolbarGroup>
                <ToolbarButton onClick={() => onFormat('undo')} title="Annulla (Ctrl+Z)">
                    <Undo className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => onFormat('redo')} title="Ripristina (Ctrl+Y)">
                    <Redo className="w-3.5 h-3.5" />
                </ToolbarButton>
            </ToolbarGroup>

            {/* Formattazione base */}
            <ToolbarGroup>
                <ToolbarButton onClick={() => onFormat('bold')} title="Grassetto (Ctrl+B)" isActive={activeFormats.has('bold')}>
                    <Bold className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => onFormat('italic')} title="Corsivo (Ctrl+I)" isActive={activeFormats.has('italic')}>
                    <Italic className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => onFormat('underline')} title="Sottolineato (Ctrl+U)" isActive={activeFormats.has('underline')}>
                    <Underline className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => onFormat('strikeThrough')} title="Barrato" isActive={activeFormats.has('strikeThrough')}>
                    <Strikethrough className="w-3.5 h-3.5" />
                </ToolbarButton>
            </ToolbarGroup>

            {/* Heading */}
            <ToolbarGroup>
                <ToolbarButton onClick={() => onFormat('formatBlock', 'h1')} title="Titolo 1">
                    <Heading1 className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => onFormat('formatBlock', 'h2')} title="Titolo 2">
                    <Heading2 className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => onFormat('formatBlock', 'p')} title="Paragrafo">
                    <span className="text-[11px] font-semibold w-3.5 h-3.5 flex items-center justify-center">P</span>
                </ToolbarButton>
            </ToolbarGroup>

            {/* Liste */}
            <ToolbarGroup>
                <ToolbarButton onClick={() => onFormat('insertUnorderedList')} title="Elenco puntato" isActive={activeFormats.has('insertUnorderedList')}>
                    <List className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => onFormat('insertOrderedList')} title="Elenco numerato" isActive={activeFormats.has('insertOrderedList')}>
                    <ListOrdered className="w-3.5 h-3.5" />
                </ToolbarButton>
            </ToolbarGroup>

            {/* Allineamento */}
            <ToolbarGroup>
                <ToolbarButton onClick={() => onFormat('justifyLeft')} title="Allinea a sinistra">
                    <AlignLeft className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => onFormat('justifyCenter')} title="Allinea al centro">
                    <AlignCenter className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => onFormat('justifyRight')} title="Allinea a destra">
                    <AlignRight className="w-3.5 h-3.5" />
                </ToolbarButton>
            </ToolbarGroup>

            {/* Utilities */}
            <ToolbarGroup>
                <ToolbarButton onClick={() => onFormat('insertHorizontalRule')} title="Linea orizzontale">
                    <Minus className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton onClick={() => onFormat('removeFormat')} title="Rimuovi formattazione">
                    <RemoveFormatting className="w-3.5 h-3.5" />
                </ToolbarButton>
            </ToolbarGroup>

            {/* Colore testo */}
            <ToolbarGroup>
                <label className="relative flex items-center gap-0.5 p-1 rounded cursor-pointer text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all" title="Colore testo">
                    <Palette className="w-3.5 h-3.5" />
                    <input
                        type="color"
                        defaultValue="#1e293b"
                        onChange={(e) => onFormat('foreColor', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </label>
                <label className="relative flex items-center gap-0.5 p-1 rounded cursor-pointer text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all" title="Evidenziatore">
                    <Highlighter className="w-3.5 h-3.5" />
                    <input
                        type="color"
                        defaultValue="#fef08a"
                        onChange={(e) => onFormat('hiliteColor', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </label>
            </ToolbarGroup>
        </div>
    );
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    content,
    onChange,
    onBlur,
    style,
    className,
    placeholder = 'Clicca per modificare...',
    disabled = false,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
    const [isFocused, setIsFocused] = useState(false);

    // Sync content to editor
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== content) {
            editorRef.current.innerHTML = sanitizeRichHtml(content);
        }
    }, [content]);

    // Check active formatting at current selection
    const updateActiveFormats = useCallback(() => {
        const formats = new Set<string>();
        try {
            if (document.queryCommandState('bold')) formats.add('bold');
            if (document.queryCommandState('italic')) formats.add('italic');
            if (document.queryCommandState('underline')) formats.add('underline');
            if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');
            if (document.queryCommandState('insertUnorderedList')) formats.add('insertUnorderedList');
            if (document.queryCommandState('insertOrderedList')) formats.add('insertOrderedList');
        } catch {
            // queryCommandState can throw in some browsers
        }
        setActiveFormats(formats);
    }, []);

    // Apply formatting
    const applyFormat = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        // Trigger onChange after format
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
        // Update active formats after applying
        requestAnimationFrame(updateActiveFormats);
    }, [onChange, updateActiveFormats]);

    // Keyboard shortcuts
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') {
                e.preventDefault();
                applyFormat('bold');
            } else if (e.key === 'i') {
                e.preventDefault();
                applyFormat('italic');
            } else if (e.key === 'u') {
                e.preventDefault();
                applyFormat('underline');
            }
        }
    }, [applyFormat]);

    // Handle input
    const handleInput = useCallback(() => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    // Update active formats on selection change
    const handleSelect = useCallback(() => {
        updateActiveFormats();
    }, [updateActiveFormats]);

    // Track selection changes
    useEffect(() => {
        document.addEventListener('selectionchange', handleSelect);
        return () => document.removeEventListener('selectionchange', handleSelect);
    }, [handleSelect]);

    return (
        <div className={`flex flex-col h-full rounded-lg overflow-hidden transition-all duration-200 ${isFocused
            ? 'ring-2 ring-teal-500/40 border border-teal-400 shadow-sm shadow-teal-500/10'
            : 'border border-gray-200 hover:border-gray-300'
            }`}>
            <div
                ref={editorRef}
                contentEditable={!disabled}
                suppressContentEditableWarning
                onInput={disabled ? undefined : handleInput}
                onKeyDown={disabled ? undefined : handleKeyDown}
                onFocus={disabled ? undefined : () => setIsFocused(true)}
                onBlur={disabled ? undefined : () => {
                    setIsFocused(false);
                    onBlur?.();
                }}
                className={`flex-1 p-3 outline-none overflow-auto text-sm leading-relaxed ${disabled ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white'} ${className || ''}`}
                style={{
                    ...style,
                    cursor: disabled ? 'not-allowed' : 'text',
                    minHeight: '80px',
                }}
                data-placeholder={placeholder}
            />
            {!disabled && isFocused && <FormattingToolbar onFormat={applyFormat} activeFormats={activeFormats} />}
        </div>
    );
};

export default RichTextEditor;
