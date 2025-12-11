/**
 * RichTextEditor - Componente per editing rich text inline
 * 
 * Supporta:
 * - Selezione testo
 * - Grassetto/Corsivo/Sottolineato per singole parole
 * - Cambio colore per selezioni
 * - ContentEditable per editing naturale
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    onBlur?: () => void;
    style?: React.CSSProperties;
    className?: string;
    placeholder?: string;
}

// Toolbar per formattazione testo
const FormattingToolbar: React.FC<{
    onBold: () => void;
    onItalic: () => void;
    onUnderline: () => void;
    onColor: (color: string) => void;
    position: { x: number; y: number } | null;
}> = ({ onBold, onItalic, onUnderline, onColor, position }) => {
    if (!position) return null;

    return (
        <div
            className="fixed z-50 flex items-center gap-1 p-1 bg-white rounded-lg shadow-lg border border-slate-200"
            style={{
                left: position.x,
                top: position.y - 45,
                transform: 'translateX(-50%)',
            }}
            onMouseDown={(e) => e.preventDefault()} // Prevent blur
        >
            <button
                onClick={onBold}
                className="p-1.5 hover:bg-slate-100 rounded"
                title="Grassetto (Ctrl+B)"
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                onClick={onItalic}
                className="p-1.5 hover:bg-slate-100 rounded"
                title="Corsivo (Ctrl+I)"
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                onClick={onUnderline}
                className="p-1.5 hover:bg-slate-100 rounded"
                title="Sottolineato (Ctrl+U)"
            >
                <Underline className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <input
                type="color"
                defaultValue="#1e293b"
                onChange={(e) => onColor(e.target.value)}
                className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                title="Colore testo"
            />
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
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [toolbarPosition, setToolbarPosition] = React.useState<{ x: number; y: number } | null>(null);

    // Sync content to editor
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== content) {
            editorRef.current.innerHTML = content || '';
        }
    }, [content]);

    // Handle selection change to show/hide toolbar
    const handleSelectionChange = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !editorRef.current?.contains(selection.anchorNode)) {
            setToolbarPosition(null);
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setToolbarPosition({
            x: rect.left + rect.width / 2,
            y: rect.top,
        });
    }, []);

    useEffect(() => {
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [handleSelectionChange]);

    // Apply formatting
    const applyFormat = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        // Trigger onChange after format
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

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

    return (
        <>
            <FormattingToolbar
                position={toolbarPosition}
                onBold={() => applyFormat('bold')}
                onItalic={() => applyFormat('italic')}
                onUnderline={() => applyFormat('underline')}
                onColor={(color) => applyFormat('foreColor', color)}
            />
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    setToolbarPosition(null);
                    onBlur?.();
                }}
                className={className}
                style={{
                    ...style,
                    outline: 'none',
                    cursor: 'text',
                    minHeight: '1em',
                }}
                data-placeholder={placeholder}
            />
        </>
    );
};

export default RichTextEditor;
