/**
 * TiptapEditor Component
 * WYSIWYG editor for template content
 */

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import EditorToolbar from './EditorToolbar';
import './TiptapEditor.css';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  onInsertMarker?: () => void;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  placeholder = 'Inizia a scrivere il tuo template...',
  editable = true,
  className = '',
  onInsertMarker,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Table,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-gray-500">Caricamento editor...</div>
      </div>
    );
  }

  return (
    <div className={`tiptap-editor border border-gray-300 rounded-lg bg-white ${className}`}>
      <EditorToolbar editor={editor} onInsertMarker={onInsertMarker} />
      <EditorContent editor={editor} className="tiptap-content" />
    </div>
  );
};

export default TiptapEditor;
