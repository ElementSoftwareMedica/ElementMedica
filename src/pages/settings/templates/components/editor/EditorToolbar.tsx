/**
 * EditorToolbar Component
 * Toolbar with formatting options for Tiptap editor
 * Extended with Logo, Signature, Header, Footer, Page Break
 * Logo picker supports tenant + branch logos (MEDICA, FORMAZIONE, MDL)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Table,
  Image,
  Undo,
  Redo,
  Hash,
  FileImage,
  PenTool,
  LayoutTemplate,
  LayoutPanelTop,
  Minus,
  ChevronDown,
  Building2,
  Stethoscope,
  GraduationCap,
  Briefcase,
  ImagePlus,
} from 'lucide-react';
import MediaPickerModal from './MediaPickerModal';
import { useTenant } from '../../../../../context/TenantContext';

interface BranchLogoOption {
  key: string;
  label: string;
  icon: React.ReactNode;
  logoUrl: string | undefined;
  color: string;
}

interface EditorToolbarProps {
  editor: Editor;
  onInsertMarker?: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, onInsertMarker }) => {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<'logo' | 'signature' | 'image'>('image');
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showLogoMenu, setShowLogoMenu] = useState(false);
  const logoMenuRef = useRef<HTMLDivElement>(null);
  const { tenant } = useTenant();

  // Close logo menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (logoMenuRef.current && !logoMenuRef.current.contains(e.target as Node)) {
        setShowLogoMenu(false);
      }
    };
    if (showLogoMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogoMenu]);

  // Build branch logo options from tenant settings
  const settings = (tenant?.settings || {}) as Record<string, unknown>;
  const branches = (settings.branches || {}) as Record<string, { logo?: string; name?: string }>;

  const logoOptions: BranchLogoOption[] = [
    {
      key: 'tenant',
      label: 'Logo Ente',
      icon: <Building2 size={16} className="text-gray-600" />,
      logoUrl: (settings.logoUrl as string) || undefined,
      color: 'bg-gray-50'
    },
    {
      key: 'medica',
      label: branches.MEDICA?.name || 'ElementMedica',
      icon: <Stethoscope size={16} className="text-teal-600" />,
      logoUrl: branches.MEDICA?.logo || undefined,
      color: 'bg-teal-50'
    },
    {
      key: 'formazione',
      label: branches.FORMAZIONE?.name || 'ElementSicurezza',
      icon: <GraduationCap size={16} className="text-blue-600" />,
      logoUrl: branches.FORMAZIONE?.logo || undefined,
      color: 'bg-blue-50'
    },
    {
      key: 'mdl',
      label: branches.MDL?.name || 'Medicina del Lavoro',
      icon: <Briefcase size={16} className="text-violet-600" />,
      logoUrl: branches.MDL?.logo || undefined,
      color: 'bg-violet-50'
    },
  ];

  // Insert a logo directly by URL
  const insertLogoByUrl = (url: string, alt: string) => {
    const logoHtml = `<div class="logo-container" style="text-align: center; margin: 10px 0;"><img src="${url}" alt="${alt}" style="max-height: 80px; max-width: 200px; object-fit: contain;" /></div>`;
    editor.chain().focus().insertContent(logoHtml).run();
    setShowLogoMenu(false);
  };

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded hover:bg-gray-100 transition-colors ${isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );

  const ToolbarDivider = () => <div className="w-px h-6 bg-gray-300 mx-1" />;

  // Insert Logo — show branch picker dropdown
  const handleInsertLogo = () => {
    setShowLogoMenu(!showLogoMenu);
  };

  // Open media library for logo selection
  const handleInsertLogoFromLibrary = () => {
    setMediaPickerMode('logo');
    setShowMediaPicker(true);
    setShowLogoMenu(false);
  };

  // Insert Signature from Media Library
  const handleInsertSignature = () => {
    setMediaPickerMode('signature');
    setShowMediaPicker(true);
  };

  // Handle media selection
  const handleMediaSelect = (url: string, alt?: string) => {
    if (mediaPickerMode === 'logo') {
      // Insert logo with specific styling
      const logoHtml = `<div class="logo-container" style="text-align: center; margin: 10px 0;"><img src="${url}" alt="${alt || 'Logo'}" style="max-height: 80px; max-width: 200px; object-fit: contain;" /></div>`;
      editor.chain().focus().insertContent(logoHtml).run();
    } else if (mediaPickerMode === 'signature') {
      // Insert signature with specific styling
      const signatureHtml = `<div class="signature-container" style="text-align: center; margin: 15px 0;"><img src="${url}" alt="${alt || 'Firma'}" style="max-height: 60px; max-width: 150px; object-fit: contain;" /></div>`;
      editor.chain().focus().insertContent(signatureHtml).run();
    } else {
      // Regular image
      editor.chain().focus().setImage({ src: url, alt }).run();
    }
    setShowMediaPicker(false);
  };

  // Insert 3-column header
  const insertHeader = () => {
    const headerHtml = `
<table class="header-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #ccc;">
  <tr>
    <td style="width: 25%; border: 1px solid #ccc; padding: 10px; text-align: center; vertical-align: middle;">
      <div style="font-size: 10px; color: #666;">LOGO</div>
    </td>
    <td style="width: 50%; border: 1px solid #ccc; padding: 10px; text-align: center; vertical-align: middle;">
      <div style="font-size: 16px; font-weight: bold;">TITOLO DOCUMENTO</div>
      <div style="font-size: 12px; color: #666;">Sottotitolo</div>
    </td>
    <td style="width: 25%; border: 1px solid #ccc; padding: 10px; text-align: right; vertical-align: middle; font-size: 10px;">
      <div><strong>Cod:</strong> {{document.number}}</div>
      <div><strong>Rev:</strong> 01</div>
      <div><strong>Data:</strong> {{current.date}}</div>
    </td>
  </tr>
</table>`;
    editor.chain().focus().insertContent(headerHtml).run();
    setShowInsertMenu(false);
  };

  // Insert footer with company info
  const insertFooter = () => {
    const footerHtml = `
<hr style="margin: 30px 0 15px 0; border: none; border-top: 1px solid #ccc;" />
<table class="footer-table" style="width: 100%; font-size: 9px; color: #666;">
  <tr>
    <td style="width: 33%; vertical-align: top;">
      <strong>{{tenant.name}}</strong><br/>
      P.IVA: {{company.vatNumber}}<br/>
      C.F.: {{company.fiscalCode}}
    </td>
    <td style="width: 34%; text-align: center; vertical-align: top;">
      {{company.address.full}}<br/>
      Tel: {{company.phone}}<br/>
      Email: {{company.email}}
    </td>
    <td style="width: 33%; text-align: right; vertical-align: top;">
      Pag. <span class="page-number">1</span> di <span class="page-total">1</span><br/>
      {{current.date}}
    </td>
  </tr>
</table>`;
    editor.chain().focus().insertContent(footerHtml).run();
    setShowInsertMenu(false);
  };

  // Insert page break
  const insertPageBreak = () => {
    const pageBreakHtml = `<div class="page-break" style="page-break-after: always; border-top: 2px dashed #ccc; margin: 30px 0; position: relative;"><span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: white; padding: 0 10px; font-size: 10px; color: #999;">INTERRUZIONE PAGINA</span></div>`;
    editor.chain().focus().insertContent(pageBreakHtml).run();
    setShowInsertMenu(false);
  };

  return (
    <>
      <div className="border-b border-gray-300 p-2 flex flex-wrap gap-1 items-center bg-gray-50">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Annulla"
        >
          <Undo size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Ripeti"
        >
          <Redo size={18} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Grassetto"
        >
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Corsivo"
        >
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Barrato"
        >
          <Strikethrough size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Codice"
        >
          <Code size={18} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Titolo 1"
        >
          <span className="font-bold text-lg">H1</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Titolo 2"
        >
          <span className="font-bold">H2</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Titolo 3"
        >
          <span className="font-semibold text-sm">H3</span>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Elenco puntato"
        >
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Elenco numerato"
        >
          <ListOrdered size={18} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Table */}
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Inserisci tabella"
        >
          <Table size={18} />
        </ToolbarButton>

        {/* Image from URL */}
        <ToolbarButton
          onClick={() => {
            setMediaPickerMode('image');
            setShowMediaPicker(true);
          }}
          title="Inserisci immagine"
        >
          <Image size={18} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* === NEW ADVANCED FEATURES === */}

        {/* Logo Dropdown */}
        <div className="relative" ref={logoMenuRef}>
          <button
            onClick={handleInsertLogo}
            className="flex items-center gap-1 p-2 rounded hover:bg-gray-100 transition-colors text-gray-700"
            title="Inserisci Logo (Ente / Sede)"
          >
            <FileImage size={18} />
            <ChevronDown size={12} />
          </button>

          {showLogoMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[220px]">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Logo Rapido
              </div>
              {logoOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => opt.logoUrl ? insertLogoByUrl(opt.logoUrl, opt.label) : undefined}
                  disabled={!opt.logoUrl}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${opt.logoUrl
                    ? `hover:${opt.color} cursor-pointer`
                    : 'opacity-40 cursor-not-allowed'
                    }`}
                >
                  {opt.icon}
                  <span className="flex-1">{opt.label}</span>
                  {opt.logoUrl && (
                    <img
                      src={opt.logoUrl}
                      alt=""
                      className="h-5 w-8 object-contain rounded"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  {!opt.logoUrl && (
                    <span className="text-xs text-gray-400">Non configurato</span>
                  )}
                </button>
              ))}
              <hr className="my-1" />
              <button
                onClick={handleInsertLogoFromLibrary}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-left"
              >
                <ImagePlus size={16} className="text-gray-500" />
                Dalla libreria media...
              </button>
            </div>
          )}
        </div>

        {/* Signature */}
        <ToolbarButton
          onClick={handleInsertSignature}
          title="Inserisci Firma"
        >
          <PenTool size={18} />
        </ToolbarButton>

        {/* Insert Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowInsertMenu(!showInsertMenu)}
            className="flex items-center gap-1 px-2 py-2 rounded hover:bg-gray-100 transition-colors text-gray-700"
            title="Inserisci elementi struttura"
          >
            <LayoutTemplate size={18} />
            <ChevronDown size={14} />
          </button>

          {showInsertMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[180px]">
              <button
                onClick={insertHeader}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-left"
              >
                <LayoutPanelTop size={16} className="text-blue-600" />
                Header 3 colonne
              </button>
              <button
                onClick={insertFooter}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-left"
              >
                <LayoutPanelTop size={16} className="text-green-600 rotate-180" />
                Footer aziendale
              </button>
              <hr className="my-1" />
              <button
                onClick={insertPageBreak}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-left"
              >
                <Minus size={16} className="text-gray-500" />
                Interruzione pagina
              </button>
            </div>
          )}
        </div>

        <ToolbarDivider />

        {/* Marker Insertion */}
        {onInsertMarker && (
          <ToolbarButton
            onClick={onInsertMarker}
            title="Inserisci marker dinamico"
          >
            <Hash size={18} />
            <span className="ml-1 text-sm font-medium">Marker</span>
          </ToolbarButton>
        )}
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        title={
          mediaPickerMode === 'logo'
            ? 'Seleziona Logo'
            : mediaPickerMode === 'signature'
              ? 'Seleziona Firma'
              : 'Seleziona Immagine'
        }
      />
    </>
  );
};

export default EditorToolbar;
