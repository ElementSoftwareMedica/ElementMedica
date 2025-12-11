/**
 * UnifiedTemplateToolbar - Toolbar unificata per Template Editor
 * 
 * Una singola toolbar che controlla l'editor attivo (header/content/footer)
 * con tutte le funzionalità di formattazione, immagini, tabelle, etc.
 */

import React, { useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    List, ListOrdered, Table as TableIcon, Image as ImageIcon,
    Heading1, Heading2, Heading3, Undo, Redo, Type,
    Link as LinkIcon, Highlighter, RotateCcw, ChevronDown,
    Minus, Plus, Trash2, FileText, Space, MoveVertical
} from 'lucide-react';
import MediaPickerModal from '../../pages/settings/templates/components/editor/MediaPickerModal';

interface UnifiedTemplateToolbarProps {
    activeEditor: Editor | null;
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

const LINE_HEIGHTS = [
    { value: '1', label: 'Singola' },
    { value: '1.15', label: '1.15' },
    { value: '1.5', label: '1.5' },
    { value: '2', label: 'Doppia' },
    { value: '2.5', label: '2.5' },
    { value: '3', label: 'Tripla' },
];

const PARAGRAPH_SPACING = [
    { value: '0', label: 'Nessuno' },
    { value: '0.5em', label: 'Piccolo' },
    { value: '1em', label: 'Normale' },
    { value: '1.5em', label: 'Grande' },
    { value: '2em', label: 'Molto grande' },
];

const COLORS = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

const UnifiedTemplateToolbar: React.FC<UnifiedTemplateToolbarProps> = ({
    activeEditor,
    className
}) => {
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
    const [showFontFamilyMenu, setShowFontFamilyMenu] = useState(false);
    const [showTableMenu, setShowTableMenu] = useState(false);
    const [showLineHeightMenu, setShowLineHeightMenu] = useState(false);
    const [showSpacingMenu, setShowSpacingMenu] = useState(false);

    const handleImageSelect = useCallback((url: string, alt?: string) => {
        if (activeEditor) {
            activeEditor.chain().focus().setImage({ src: url, alt: alt || 'Image' }).run();
        }
        setShowMediaPicker(false);
    }, [activeEditor]);

    const insertTable = useCallback((rows: number, cols: number) => {
        if (activeEditor) {
            activeEditor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
        }
        setShowTableMenu(false);
    }, [activeEditor]);

    const addLink = useCallback(() => {
        const url = window.prompt('Inserisci URL:');
        if (url && activeEditor) {
            // @ts-ignore
            activeEditor.chain().focus().setLink({ href: url }).run();
        }
    }, [activeEditor]);

    // Insert page break - useful for multi-page documents
    // SEMPLIFICATO: usa data-page-break per identificazione univoca
    const insertPageBreak = useCallback(() => {
        if (activeEditor) {
            // Page break semplificato:
            // - data-page-break="true" per identificazione univoca nel backend
            // - Stili visuali nell'editor
            // - Il backend sostituirà con CSS page-break-after puro
            const pageBreakHtml = `
        <div data-page-break="true" class="page-break-visual" style="margin: 30px 0; padding: 10px 0; border-top: 2px dashed #2563eb; border-bottom: 2px dashed #2563eb; text-align: center; background: #f0f9ff;">
          <span style="color: #2563eb; font-size: 12px; font-weight: 500;">— INTERRUZIONE DI PAGINA —</span>
        </div>
        <p></p>
      `.replace(/\n\s+/g, '');
            activeEditor.chain().focus().insertContent(pageBreakHtml).run();
        }
    }, [activeEditor]);

    // Close dropdowns on click outside
    React.useEffect(() => {
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
            disabled={disabled || !activeEditor}
            title={title}
            type="button"
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${active ? 'bg-blue-100 text-blue-700' : 'text-slate-700'
                } ${disabled || !activeEditor ? 'opacity-40 cursor-not-allowed' : ''} ${btnClass}`}
        >
            {children}
        </button>
    );

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
            className={`absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto ${dropClass}`}
            style={{ zIndex: 9999 }}
            onClick={e => e.stopPropagation()}
        >
            {children}
        </div>
    ) : null;

    const Separator = () => <div className="w-px h-6 bg-slate-300 mx-1" />;

    return (
        <div className={`bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 ${className || ''}`} style={{ overflow: 'visible' }}>
            {/* Toolbar Info Bar */}
            {!activeEditor && (
                <div className="flex items-center justify-center px-4 py-2 border-b border-slate-200 bg-amber-50">
                    <span className="text-xs text-amber-600">
                        Clicca su una sezione per attivare la modifica
                    </span>
                </div>
            )}

            {/* Main Toolbar */}
            <div className="p-2" style={{ overflow: 'visible' }}>
                {/* Row 1: Font & Text formatting */}
                <div className="flex flex-wrap items-center gap-0.5 mb-1">
                    {/* Font Family */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowFontFamilyMenu(!showFontFamilyMenu); }}
                            disabled={!activeEditor}
                            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 text-sm min-w-[100px] disabled:opacity-40"
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
                                        // @ts-ignore
                                        activeEditor?.chain().focus().setFontFamily(font.value).run();
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
                            disabled={!activeEditor}
                            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 text-sm min-w-[60px] disabled:opacity-40"
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
                                        activeEditor?.chain().focus().setMark('textStyle', { fontSize: size }).run();
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
                        onClick={() => activeEditor?.chain().focus().toggleBold().run()}
                        active={activeEditor?.isActive('bold')}
                        title="Grassetto (Ctrl+B)"
                    >
                        <Bold className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().toggleItalic().run()}
                        active={activeEditor?.isActive('italic')}
                        title="Corsivo (Ctrl+I)"
                    >
                        <Italic className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => {
                            // @ts-ignore
                            activeEditor?.chain().focus().toggleUnderline().run();
                        }}
                        active={activeEditor?.isActive('underline')}
                        title="Sottolineato (Ctrl+U)"
                    >
                        <UnderlineIcon className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().toggleStrike().run()}
                        active={activeEditor?.isActive('strike')}
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
                                <div className="w-4 h-1 rounded-sm mt-0.5" style={{ backgroundColor: activeEditor?.getAttributes('textStyle').color || '#000' }} />
                            </div>
                        </ToolbarButton>
                        <Dropdown show={showColorPicker} className="p-2 w-52">
                            <div className="grid grid-cols-10 gap-1">
                                {COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => { activeEditor?.chain().focus().setColor(color).run(); setShowColorPicker(false); }}
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
                            active={activeEditor?.isActive('highlight')}
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
                                            // @ts-ignore
                                            activeEditor?.chain().focus().toggleHighlight({ color }).run();
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
                                    // @ts-ignore
                                    activeEditor?.chain().focus().unsetHighlight().run();
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
                        onClick={() => activeEditor?.chain().focus().setParagraph().run()}
                        active={activeEditor?.isActive('paragraph')}
                        title="Paragrafo"
                    >
                        <Type className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().toggleHeading({ level: 1 }).run()}
                        active={activeEditor?.isActive('heading', { level: 1 })}
                        title="Titolo 1"
                    >
                        <Heading1 className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().toggleHeading({ level: 2 }).run()}
                        active={activeEditor?.isActive('heading', { level: 2 })}
                        title="Titolo 2"
                    >
                        <Heading2 className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().toggleHeading({ level: 3 }).run()}
                        active={activeEditor?.isActive('heading', { level: 3 })}
                        title="Titolo 3"
                    >
                        <Heading3 className="w-4 h-4" />
                    </ToolbarButton>
                </div>

                {/* Row 2: Alignment, Lists, Table, Image */}
                <div className="flex flex-wrap items-center gap-0.5">
                    {/* Alignment */}
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().setTextAlign('left').run()}
                        active={activeEditor?.isActive({ textAlign: 'left' })}
                        title="Allinea a sinistra"
                    >
                        <AlignLeft className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().setTextAlign('center').run()}
                        active={activeEditor?.isActive({ textAlign: 'center' })}
                        title="Centra"
                    >
                        <AlignCenter className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().setTextAlign('right').run()}
                        active={activeEditor?.isActive({ textAlign: 'right' })}
                        title="Allinea a destra"
                    >
                        <AlignRight className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().setTextAlign('justify').run()}
                        active={activeEditor?.isActive({ textAlign: 'justify' })}
                        title="Giustifica"
                    >
                        <AlignJustify className="w-4 h-4" />
                    </ToolbarButton>

                    <Separator />

                    {/* Line Height - Interlinea (spazio tra righe) */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowLineHeightMenu(!showLineHeightMenu); }}
                            disabled={!activeEditor}
                            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 text-sm disabled:opacity-40"
                            title="Interlinea (spazio tra righe)"
                        >
                            <MoveVertical className="w-3.5 h-3.5" />
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        <Dropdown show={showLineHeightMenu} className="w-32">
                            <div className="p-1 text-xs text-slate-500 font-medium border-b">Interlinea</div>
                            {LINE_HEIGHTS.map(lh => (
                                <button
                                    key={lh.value}
                                    onClick={() => {
                                        if (activeEditor) {
                                            // Usa setMark con TextStyle per applicare line-height
                                            // Questo preserva la formattazione esistente
                                            activeEditor.chain().focus()
                                                .setMark('textStyle', { lineHeight: lh.value })
                                                .run();
                                        }
                                        setShowLineHeightMenu(false);
                                    }}
                                    className="block w-full px-3 py-1.5 text-left hover:bg-slate-100 text-sm"
                                >
                                    {lh.label}
                                </button>
                            ))}
                        </Dropdown>
                    </div>

                    {/* Paragraph Spacing - NON usato per margini pagina, rinominato */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowSpacingMenu(!showSpacingMenu); }}
                            disabled={!activeEditor}
                            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 text-sm disabled:opacity-40"
                            title="Spaziatura tra paragrafi"
                        >
                            <Space className="w-3.5 h-3.5" />
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        <Dropdown show={showSpacingMenu} className="w-40">
                            <div className="p-1 text-xs text-slate-500 font-medium border-b">Spazio dopo paragrafo</div>
                            {PARAGRAPH_SPACING.map(sp => (
                                <button
                                    key={sp.value}
                                    onClick={() => {
                                        if (activeEditor) {
                                            // Inserisci un div con margin-bottom dopo il paragrafo corrente
                                            activeEditor.chain().focus()
                                                .insertContent(`<div style="margin-bottom: ${sp.value};"></div>`)
                                                .run();
                                        }
                                        setShowSpacingMenu(false);
                                    }}
                                    className="block w-full px-3 py-1.5 text-left hover:bg-slate-100 text-sm"
                                >
                                    {sp.label}
                                </button>
                            ))}
                        </Dropdown>
                    </div>

                    <Separator />

                    {/* Lists */}
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().toggleBulletList().run()}
                        active={activeEditor?.isActive('bulletList')}
                        title="Elenco puntato"
                    >
                        <List className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().toggleOrderedList().run()}
                        active={activeEditor?.isActive('orderedList')}
                        title="Elenco numerato"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </ToolbarButton>

                    <Separator />

                    {/* Table */}
                    <div className="relative">
                        <ToolbarButton
                            onClick={(e) => { e.stopPropagation(); setShowTableMenu(!showTableMenu); }}
                            active={activeEditor?.isActive('table')}
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
                            {activeEditor?.isActive('table') && (
                                <div className="border-t border-slate-200 pt-2 mt-2">
                                    <p className="text-xs text-slate-500 mb-2 font-medium">Modifica tabella</p>
                                    <div className="flex flex-wrap gap-1">
                                        <button
                                            onClick={() => activeEditor?.chain().focus().addColumnAfter().run()}
                                            className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Colonna
                                        </button>
                                        <button
                                            onClick={() => activeEditor?.chain().focus().addRowAfter().run()}
                                            className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Riga
                                        </button>
                                        <button
                                            onClick={() => activeEditor?.chain().focus().deleteColumn().run()}
                                            className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded flex items-center gap-1"
                                        >
                                            <Minus className="w-3 h-3" /> Colonna
                                        </button>
                                        <button
                                            onClick={() => activeEditor?.chain().focus().deleteRow().run()}
                                            className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded flex items-center gap-1"
                                        >
                                            <Minus className="w-3 h-3" /> Riga
                                        </button>
                                        <button
                                            onClick={() => activeEditor?.chain().focus().deleteTable().run()}
                                            className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3 h-3" /> Elimina
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Dropdown>
                    </div>

                    {/* Image - Opens Media Picker */}
                    <ToolbarButton
                        onClick={() => setShowMediaPicker(true)}
                        title="Inserisci immagine dalla Media Library"
                    >
                        <ImageIcon className="w-4 h-4" />
                    </ToolbarButton>

                    {/* Link */}
                    <ToolbarButton
                        onClick={addLink}
                        active={activeEditor?.isActive('link')}
                        title="Inserisci link"
                    >
                        <LinkIcon className="w-4 h-4" />
                    </ToolbarButton>

                    {/* Page Break */}
                    <ToolbarButton
                        onClick={insertPageBreak}
                        title="Inserisci interruzione di pagina"
                    >
                        <FileText className="w-4 h-4" />
                    </ToolbarButton>

                    <Separator />

                    {/* Undo/Redo */}
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().undo().run()}
                        disabled={!activeEditor?.can().undo()}
                        title="Annulla (Ctrl+Z)"
                    >
                        <Undo className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().redo().run()}
                        disabled={!activeEditor?.can().redo()}
                        title="Ripeti (Ctrl+Y)"
                    >
                        <Redo className="w-4 h-4" />
                    </ToolbarButton>

                    <Separator />

                    {/* Clear formatting */}
                    <ToolbarButton
                        onClick={() => activeEditor?.chain().focus().clearNodes().unsetAllMarks().run()}
                        title="Rimuovi formattazione"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </ToolbarButton>
                </div>
            </div>

            {/* Media Picker Modal */}
            <MediaPickerModal
                isOpen={showMediaPicker}
                onClose={() => setShowMediaPicker(false)}
                onSelect={handleImageSelect}
                title="Seleziona Immagine dalla Media Library"
            />
        </div>
    );
};

export default UnifiedTemplateToolbar;
