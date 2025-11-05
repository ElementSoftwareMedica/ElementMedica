/**
 * EditorToolbar Component
 * Toolbar with formatting options for Tiptap editor
 */

import React from 'react';
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
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor;
  onInsertMarker?: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, onInsertMarker }) => {
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
      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
        isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );

  const ToolbarDivider = () => <div className="w-px h-6 bg-gray-300 mx-1" />;

  return (
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

      {/* Image */}
      <ToolbarButton
        onClick={() => {
          const url = window.prompt('URL immagine:');
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }}
        title="Inserisci immagine"
      >
        <Image size={18} />
      </ToolbarButton>

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
  );
};

export default EditorToolbar;
