import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table as TableIcon,
  Image as ImageIcon,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Type
} from 'lucide-react';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onInsertPlaceholder?: (placeholder: string) => void;
  editorRef?: React.MutableRefObject<any>;
  minHeight?: string;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  placeholder = 'Inizia a scrivere...',
  onInsertPlaceholder,
  editorRef,
  minHeight = '500px'
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({
        inline: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none p-4`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Expose editor instance via ref
  React.useEffect(() => {
    if (editorRef && editor) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    active, 
    disabled, 
    children, 
    title 
  }: { 
    onClick: () => void; 
    active?: boolean; 
    disabled?: boolean; 
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded hover:bg-slate-200 transition-colors ${
        active ? 'bg-slate-300' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      type="button"
    >
      {children}
    </button>
  );

  const addImage = () => {
    const url = window.prompt('URL immagine:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const setColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
  };

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="bg-slate-100 border-b border-slate-300 p-2 flex flex-wrap gap-1">
        {/* Text formatting */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
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
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Barrato"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Codice"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
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

        {/* Alignment */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
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
            title="Allinea al centro"
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
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
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
        </div>

        {/* Colors */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <ToolbarButton onClick={() => setColor('#000000')} title="Nero">
            <div className="w-4 h-4 rounded bg-black border border-slate-400" />
          </ToolbarButton>
          <ToolbarButton onClick={() => setColor('#ef4444')} title="Rosso">
            <div className="w-4 h-4 rounded bg-red-500 border border-slate-400" />
          </ToolbarButton>
          <ToolbarButton onClick={() => setColor('#3b82f6')} title="Blu">
            <div className="w-4 h-4 rounded bg-blue-500 border border-slate-400" />
          </ToolbarButton>
          <ToolbarButton onClick={() => setColor('#22c55e')} title="Verde">
            <div className="w-4 h-4 rounded bg-green-500 border border-slate-400" />
          </ToolbarButton>
          <ToolbarButton onClick={() => setColor('#eab308')} title="Giallo">
            <div className="w-4 h-4 rounded bg-yellow-500 border border-slate-400" />
          </ToolbarButton>
        </div>

        {/* Table & Image */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <ToolbarButton onClick={insertTable} title="Inserisci tabella">
            <TableIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={addImage} title="Inserisci immagine">
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1">
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
        </div>

      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default TipTapEditor;
