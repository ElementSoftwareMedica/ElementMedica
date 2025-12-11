/**
 * AdvancedTipTapEditor - Editor WYSIWYG avanzato per template HTML
 * 
 * Features:
 * - Toolbar unificata ed elegante con tutte le opzioni
 * - Integrazione Media Library per immagini/loghi
 * - Supporto tabelle, liste, colori, font size
 * - Configurabile per diverse sezioni (header, content, footer)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
// @ts-ignore - Types exist but TS may not detect them
import FontFamily from '@tiptap/extension-font-family';
// @ts-ignore - Types exist but TS may not detect them
import Underline from '@tiptap/extension-underline';
// @ts-ignore - Types exist but TS may not detect them
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
// @ts-ignore - Types exist but TS may not detect them
import Link from '@tiptap/extension-link';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    List, ListOrdered, Table as TableIcon, Image as ImageIcon,
    Heading1, Heading2, Heading3, Undo, Redo, Type,
    Link as LinkIcon, Highlighter, RotateCcw,
    ChevronDown
} from 'lucide-react';
import MediaPickerModal from '../../pages/settings/templates/components/editor/MediaPickerModal';

// Custom FontSize extension
const FontSize = TextStyle.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            fontSize: {
                default: null,
                parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
                renderHTML: attributes => {
                    if (!attributes.fontSize) return {};
                    return { style: `font-size: ${attributes.fontSize}` };
                },
            },
        };
    },
});

// Custom LineHeight extension
const LineHeight = TextStyle.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            lineHeight: {
                default: null,
                parseHTML: element => element.style.lineHeight,
                renderHTML: attributes => {
                    if (!attributes.lineHeight) return {};
                    return { style: `line-height: ${attributes.lineHeight}` };
                },
            },
        };
    },
});

interface AdvancedTipTapEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    editorRef?: React.MutableRefObject<any>;
    minHeight?: string;
    showToolbar?: boolean;
    toolbarPosition?: 'top' | 'floating';
    className?: string;
}

const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px', '48px'];
const FONT_FAMILIES = [
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Times New Roman, serif', label: 'Times New Roman' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: 'Courier New, monospace', label: 'Courier' },
    { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet' },
];

const COLORS = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

const AdvancedTipTapEditor: React.FC<AdvancedTipTapEditorProps> = ({
    content,
    onChange,
    placeholder = 'Inizia a scrivere...',
    editorRef,
    minHeight = '300px',
    showToolbar = true,
    toolbarPosition = 'top',
    className = ''
}) => {
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
    const [showFontFamilyMenu, setShowFontFamilyMenu] = useState(false);
    const [showTableMenu, setShowTableMenu] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4, 5, 6] },
                bulletList: { keepMarks: true, keepAttributes: true },
                orderedList: { keepMarks: true, keepAttributes: true },
            }),
            Placeholder.configure({ placeholder }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle,
            FontSize,
            LineHeight,
            FontFamily,
            Color,
            Underline,
            Highlight.configure({ multicolor: true }),
            Table.configure({
                resizable: true,
                HTMLAttributes: { class: 'border-collapse border border-slate-300' },
            }),
            TableRow,
            TableCell.configure({
                HTMLAttributes: { class: 'border border-slate-300 p-2 min-w-[100px]' },
            }),
            TableHeader.configure({
                HTMLAttributes: { class: 'border border-slate-300 p-2 bg-slate-100 font-semibold' },
            }),
            Image.configure({
                inline: false,
                allowBase64: true,
                HTMLAttributes: { class: 'max-w-full h-auto rounded' },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'text-blue-600 underline hover:text-blue-800' },
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none p-4',
                style: `min-height: ${minHeight}`,
            },
        },
    });

    // Expose editor instance via ref
    useEffect(() => {
        if (editorRef && editor) {
            editorRef.current = editor;
        }
    }, [editor, editorRef]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = () => {
            setShowColorPicker(false);
            setShowHighlightPicker(false);
            setShowFontSizeMenu(false);
            setShowFontFamilyMenu(false);
            setShowTableMenu(false);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleImageSelect = useCallback((url: string, alt?: string) => {
        if (editor) {
            editor.chain().focus().setImage({ src: url, alt: alt || 'Image' }).run();
        }
        setShowMediaPicker(false);
    }, [editor]);

    const insertTable = useCallback((rows: number, cols: number) => {
        if (editor) {
            editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
        }
        setShowTableMenu(false);
    }, [editor]);

    const addLink = useCallback(() => {
        const url = window.prompt('Inserisci URL:');
        if (url && editor) {
            // @ts-ignore - Link extension adds this method
            editor.chain().focus().setLink({ href: url }).run();
        }
    }, [editor]);

    if (!editor) return null;

    // Toolbar Button Component
    const ToolbarButton = ({
        onClick,
        active,
        disabled,
        children,
        title,
        className: btnClass = ''
    }: {
        onClick: (e: React.MouseEvent) => void;
        active?: boolean;
        disabled?: boolean;
        children: React.ReactNode;
        title?: string;
        className?: string;
    }) => (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(e); }}
            disabled={disabled}
            title={title}
            type="button"
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${active ? 'bg-blue-100 text-blue-700' : 'text-slate-700'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${btnClass}`}
        >
            {children}
        </button>
    );

    // Dropdown Component
    const Dropdown = ({
        show,
        children,
        className: dropClass = ''
    }: {
        show: boolean;
        children: React.ReactNode;
        className?: string;
    }) => show ? (
        <div
            className={`absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 ${dropClass}`}
            onClick={e => e.stopPropagation()}
        >
            {children}
        </div>
    ) : null;

    const Separator = () => <div className="w-px h-6 bg-slate-300 mx-1" />;

    return (
        <div className={`border border-slate-300 rounded-lg overflow-hidden bg-white ${className}`}>
            {/* Unified Toolbar */}
            {showToolbar && (
                <div className="bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-300 p-2">
                    {/* Row 1: Text formatting */}
                    <div className="flex flex-wrap items-center gap-0.5 mb-1">
                        {/* Font Family */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowFontFamilyMenu(!showFontFamilyMenu); }}
                                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 text-sm min-w-[100px]"
                                title="Font"
                            >
                                <Type className="w-3.5 h-3.5" />
                                <span className="truncate">Font</span>
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            <Dropdown show={showFontFamilyMenu} className="w-44">
                                {FONT_FAMILIES.map(font => (
                                    <button
                                        key={font.value}
                                        onClick={() => {
                                            // @ts-ignore - FontFamily extension adds this method
                                            editor.chain().focus().setFontFamily(font.value).run();
                                            setShowFontFamilyMenu(false);
                                        }}
                                        className="block w-full px-3 py-2 text-left hover:bg-slate-100 text-sm"
                                        style={{ fontFamily: font.value }}
                                    >
                                        {font.label}
                                    </button>
                                ))}
                            </Dropdown>
                        </div>

                        <Separator />

                        {/* Font Size */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowFontSizeMenu(!showFontSizeMenu); }}
                                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 text-sm min-w-[60px]"
                                title="Dimensione"
                            >
                                <span>16</span>
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            <Dropdown show={showFontSizeMenu} className="w-20 max-h-48 overflow-y-auto">
                                {FONT_SIZES.map(size => (
                                    <button
                                        key={size}
                                        onClick={() => {
                                            editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
                                            setShowFontSizeMenu(false);
                                        }}
                                        className="block w-full px-3 py-1.5 text-left hover:bg-slate-100 text-sm"
                                    >
                                        {size}
                                    </button>
                                ))}
                            </Dropdown>
                        </div>

                        <Separator />

                        {/* Basic Formatting */}
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            active={editor.isActive('bold')}
                            title="Grassetto (Ctrl+B)"
                        >
                            <Bold className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            active={editor.isActive('italic')}
                            title="Corsivo (Ctrl+I)"
                        >
                            <Italic className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => {
                                // @ts-ignore - Underline extension adds this method
                                editor.chain().focus().toggleUnderline().run();
                            }}
                            active={editor.isActive('underline')}
                            title="Sottolineato (Ctrl+U)"
                        >
                            <UnderlineIcon className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            active={editor.isActive('strike')}
                            title="Barrato"
                        >
                            <Strikethrough className="w-4 h-4" />
                        </ToolbarButton>

                        <Separator />

                        {/* Text Color */}
                        <div className="relative">
                            <ToolbarButton
                                onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
                                title="Colore Testo"
                            >
                                <div className="flex flex-col items-center">
                                    <Type className="w-4 h-4" />
                                    <div className="w-4 h-1 bg-current rounded-sm mt-0.5" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000' }} />
                                </div>
                            </ToolbarButton>
                            <Dropdown show={showColorPicker} className="p-2 w-52">
                                <div className="grid grid-cols-10 gap-1">
                                    {COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => { editor.chain().focus().setColor(color).run(); setShowColorPicker(false); }}
                                            className="w-4 h-4 rounded border border-slate-300 hover:scale-125 transition-transform"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </Dropdown>
                        </div>

                        {/* Highlight */}
                        <div className="relative">
                            <ToolbarButton
                                onClick={(e) => { e.stopPropagation(); setShowHighlightPicker(!showHighlightPicker); }}
                                active={editor.isActive('highlight')}
                                title="Evidenzia"
                            >
                                <Highlighter className="w-4 h-4" />
                            </ToolbarButton>
                            <Dropdown show={showHighlightPicker} className="p-2 w-52">
                                <div className="grid grid-cols-10 gap-1">
                                    {COLORS.slice(0, 20).map(color => (
                                        <button
                                            key={color}
                                            onClick={() => {
                                                // @ts-ignore - Highlight extension adds this method
                                                editor.chain().focus().toggleHighlight({ color }).run();
                                                setShowHighlightPicker(false);
                                            }}
                                            className="w-4 h-4 rounded border border-slate-300 hover:scale-125 transition-transform"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        // @ts-ignore - Highlight extension adds this method
                                        editor.chain().focus().unsetHighlight().run();
                                        setShowHighlightPicker(false);
                                    }}
                                    className="mt-2 w-full text-xs text-slate-600 hover:text-red-600"
                                >
                                    Rimuovi evidenziazione
                                </button>
                            </Dropdown>
                        </div>

                        <Separator />

                        {/* Headings */}
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setParagraph().run()}
                            active={editor.isActive('paragraph')}
                            title="Paragrafo"
                        >
                            <Type className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            active={editor.isActive('heading', { level: 1 })}
                            title="Titolo 1"
                        >
                            <Heading1 className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            active={editor.isActive('heading', { level: 2 })}
                            title="Titolo 2"
                        >
                            <Heading2 className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                            active={editor.isActive('heading', { level: 3 })}
                            title="Titolo 3"
                        >
                            <Heading3 className="w-4 h-4" />
                        </ToolbarButton>
                    </div>

                    {/* Row 2: Alignment, Lists, Insert */}
                    <div className="flex flex-wrap items-center gap-0.5">
                        {/* Alignment */}
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign('left').run()}
                            active={editor.isActive({ textAlign: 'left' })}
                            title="Allinea a sinistra"
                        >
                            <AlignLeft className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign('center').run()}
                            active={editor.isActive({ textAlign: 'center' })}
                            title="Centra"
                        >
                            <AlignCenter className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign('right').run()}
                            active={editor.isActive({ textAlign: 'right' })}
                            title="Allinea a destra"
                        >
                            <AlignRight className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                            active={editor.isActive({ textAlign: 'justify' })}
                            title="Giustifica"
                        >
                            <AlignJustify className="w-4 h-4" />
                        </ToolbarButton>

                        <Separator />

                        {/* Lists */}
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            active={editor.isActive('bulletList')}
                            title="Elenco puntato"
                        >
                            <List className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            active={editor.isActive('orderedList')}
                            title="Elenco numerato"
                        >
                            <ListOrdered className="w-4 h-4" />
                        </ToolbarButton>

                        <Separator />

                        {/* Table */}
                        <div className="relative">
                            <ToolbarButton
                                onClick={(e) => { e.stopPropagation(); setShowTableMenu(!showTableMenu); }}
                                active={editor.isActive('table')}
                                title="Tabella"
                            >
                                <TableIcon className="w-4 h-4" />
                            </ToolbarButton>
                            <Dropdown show={showTableMenu} className="p-3 w-64">
                                <p className="text-xs text-slate-500 mb-2 font-medium">Inserisci tabella</p>
                                <div className="grid grid-cols-4 gap-1 mb-3">
                                    {[2, 3, 4, 5].map(rows => (
                                        [2, 3, 4, 5].map(cols => (
                                            <button
                                                key={`${rows}-${cols}`}
                                                onClick={() => insertTable(rows, cols)}
                                                className="w-7 h-7 border border-slate-300 rounded text-xs hover:bg-blue-100 hover:border-blue-400"
                                                title={`${rows} × ${cols}`}
                                            >
                                                {rows}×{cols}
                                            </button>
                                        ))
                                    )).flat()}
                                </div>
                                {editor.isActive('table') && (
                                    <>
                                        <div className="border-t border-slate-200 pt-2 mt-2">
                                            <p className="text-xs text-slate-500 mb-2 font-medium">Modifica tabella</p>
                                            <div className="flex flex-wrap gap-1">
                                                <button
                                                    onClick={() => editor.chain().focus().addColumnAfter().run()}
                                                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                                                >
                                                    + Colonna
                                                </button>
                                                <button
                                                    onClick={() => editor.chain().focus().addRowAfter().run()}
                                                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                                                >
                                                    + Riga
                                                </button>
                                                <button
                                                    onClick={() => editor.chain().focus().deleteColumn().run()}
                                                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                                                >
                                                    - Colonna
                                                </button>
                                                <button
                                                    onClick={() => editor.chain().focus().deleteRow().run()}
                                                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                                                >
                                                    - Riga
                                                </button>
                                                <button
                                                    onClick={() => editor.chain().focus().deleteTable().run()}
                                                    className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
                                                >
                                                    Elimina tabella
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </Dropdown>
                        </div>

                        {/* Image */}
                        <ToolbarButton
                            onClick={() => setShowMediaPicker(true)}
                            title="Inserisci immagine dalla Media Library"
                        >
                            <ImageIcon className="w-4 h-4" />
                        </ToolbarButton>

                        {/* Link */}
                        <ToolbarButton
                            onClick={addLink}
                            active={editor.isActive('link')}
                            title="Inserisci link"
                        >
                            <LinkIcon className="w-4 h-4" />
                        </ToolbarButton>

                        <Separator />

                        {/* Undo/Redo */}
                        <ToolbarButton
                            onClick={() => editor.chain().focus().undo().run()}
                            disabled={!editor.can().undo()}
                            title="Annulla (Ctrl+Z)"
                        >
                            <Undo className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().redo().run()}
                            disabled={!editor.can().redo()}
                            title="Ripeti (Ctrl+Y)"
                        >
                            <Redo className="w-4 h-4" />
                        </ToolbarButton>

                        <Separator />

                        {/* Clear formatting */}
                        <ToolbarButton
                            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                            title="Rimuovi formattazione"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </ToolbarButton>
                    </div>
                </div>
            )}

            {/* Editor Content */}
            <EditorContent editor={editor} className="template-editor-content" />

            {/* Media Picker Modal */}
            <MediaPickerModal
                isOpen={showMediaPicker}
                onClose={() => setShowMediaPicker(false)}
                onSelect={handleImageSelect}
                title="Seleziona Immagine"
            />

            {/* Custom styles for lists and tables */}
            <style>{`
        .template-editor-content .ProseMirror {
          min-height: ${minHeight};
        }
        .template-editor-content .ProseMirror ul {
          list-style-type: disc !important;
          padding-left: 1.5em !important;
          margin: 0.5em 0 !important;
        }
        .template-editor-content .ProseMirror ol {
          list-style-type: decimal !important;
          padding-left: 1.5em !important;
          margin: 0.5em 0 !important;
        }
        .template-editor-content .ProseMirror li {
          display: list-item !important;
        }
        .template-editor-content .ProseMirror li p {
          margin: 0 !important;
        }
        .template-editor-content .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        .template-editor-content .ProseMirror th,
        .template-editor-content .ProseMirror td {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          text-align: left;
        }
        .template-editor-content .ProseMirror th {
          background-color: #f1f5f9;
          font-weight: 600;
        }
        .template-editor-content .ProseMirror img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1em auto;
        }
        .template-editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
      `}</style>
        </div>
    );
};

export default AdvancedTipTapEditor;
