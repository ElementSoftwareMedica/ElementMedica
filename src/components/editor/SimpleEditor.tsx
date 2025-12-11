/**
 * SimpleEditor - Editor TipTap senza toolbar
 * 
 * Usato nelle sezioni template dove la toolbar è unificata esternamente.
 * Espone l'editor instance tramite ref per controllo esterno.
 */

import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
// @ts-ignore
import FontFamily from '@tiptap/extension-font-family';
// @ts-ignore
import Underline from '@tiptap/extension-underline';
// @ts-ignore
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
// @ts-ignore - Using resizable image extension instead of standard Image
import ImageResize from 'tiptap-extension-resize-image';
// @ts-ignore
import Link from '@tiptap/extension-link';

// Custom FontSize extension
const FontSize = TextStyle.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            fontSize: {
                default: null,
                parseHTML: element => element.style.fontSize?.replace(/['"]\+/g, ''),
                renderHTML: attributes => {
                    if (!attributes.fontSize) return {};
                    return { style: `font-size: ${attributes.fontSize}` };
                },
            },
        };
    },
});

// Custom LineHeight extension - per interlinea
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

interface SimpleEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: string;
    className?: string;
    onFocus?: () => void;
    onEditorReady?: (editor: Editor | null) => void;
}

export interface SimpleEditorRef {
    editor: Editor | null;
}

const SimpleEditor = forwardRef<SimpleEditorRef, SimpleEditorProps>(({
    content,
    onChange,
    placeholder = 'Inizia a scrivere...',
    minHeight = '100px',
    className = '',
    onFocus,
    onEditorReady
}, ref) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: {
                    keepMarks: true,
                    keepAttributes: true,
                    HTMLAttributes: {
                        class: 'list-disc pl-6 space-y-1',
                    },
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: true,
                    HTMLAttributes: {
                        class: 'list-decimal pl-6 space-y-1',
                    },
                },
                listItem: {
                    HTMLAttributes: {
                        class: 'pl-1',
                    },
                },
            }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
                alignments: ['left', 'center', 'right', 'justify'],
            }),
            TextStyle,
            FontSize,
            LineHeight,
            Color,
            FontFamily.configure({
                types: ['textStyle'],
            }),
            Underline,
            Highlight.configure({
                multicolor: true,
            }),
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'border-collapse border border-slate-300',
                },
            }),
            TableRow,
            TableCell.configure({
                HTMLAttributes: {
                    class: 'border border-slate-300 p-2',
                },
            }),
            TableHeader.configure({
                HTMLAttributes: {
                    class: 'border border-slate-300 p-2 bg-slate-100 font-semibold',
                },
            }),
            ImageResize.configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: {
                    class: 'inline-image',
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline hover:text-blue-800',
                },
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        onFocus: () => {
            onFocus?.();
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none',
                style: `min-height: ${minHeight}`,
            },
        },
    });

    // Expose editor instance via ref
    useImperativeHandle(ref, () => ({
        editor
    }), [editor]);

    // Notify parent when editor is ready
    useEffect(() => {
        onEditorReady?.(editor);
    }, [editor, onEditorReady]);

    // Sync content from prop
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    // Cleanup
    useEffect(() => {
        return () => {
            editor?.destroy();
        };
    }, [editor]);

    return (
        <div className={`simple-editor ${className}`}>
            <EditorContent editor={editor} />

            {/* Editor Styles */}
            <style>{`
        .simple-editor .ProseMirror {
          min-height: ${minHeight};
          outline: none;
        }
        
        .simple-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          height: 0;
          float: left;
        }

        /* Lists styling */
        .simple-editor .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .simple-editor .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .simple-editor .ProseMirror li {
          padding-left: 0.25rem;
          margin: 0.25rem 0;
        }

        .simple-editor .ProseMirror li p {
          margin: 0;
        }

        /* Tables styling */
        .simple-editor .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }

        .simple-editor .ProseMirror th,
        .simple-editor .ProseMirror td {
          border: 1px solid #cbd5e1;
          padding: 0.5rem;
          text-align: left;
        }

        .simple-editor .ProseMirror th {
          background-color: #f1f5f9;
          font-weight: 600;
        }

        .simple-editor .ProseMirror tr:nth-child(even) td {
          background-color: #f8fafc;
        }

        /* Image styling - Resizable images */
        .simple-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          cursor: pointer;
        }

        /* Inline image support - allows text to flow around image */
        .simple-editor .ProseMirror img.inline-image {
          display: inline-block;
          vertical-align: middle;
          margin: 0 0.5rem;
        }

        /* Block image (centered) */
        .simple-editor .ProseMirror img:not(.inline-image) {
          display: block;
          margin: 0.5rem auto;
        }

        .simple-editor .ProseMirror img.ProseMirror-selectednode {
          outline: 2px solid #3b82f6;
        }

        /* Image resize handles */
        .simple-editor .ProseMirror .image-resizer {
          display: inline-flex;
          position: relative;
          flex-grow: 0;
          cursor: pointer;
        }

        .simple-editor .ProseMirror .image-resizer .resize-trigger {
          position: absolute;
          right: -6px;
          bottom: -6px;
          opacity: 0;
          transition: opacity 0.3s ease;
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 2px;
          cursor: nwse-resize;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .simple-editor .ProseMirror .image-resizer:hover .resize-trigger,
        .simple-editor .ProseMirror .image-resizer.resizing .resize-trigger {
          opacity: 1;
        }

        .simple-editor .ProseMirror .image-resizer.resizing {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        /* Headings */
        .simple-editor .ProseMirror h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem;
        }

        .simple-editor .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0.875rem 0 0.5rem;
        }

        .simple-editor .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem;
        }

        /* Links */
        .simple-editor .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
        }

        .simple-editor .ProseMirror a:hover {
          color: #1d4ed8;
        }
      `}</style>
        </div>
    );
});

SimpleEditor.displayName = 'SimpleEditor';

export default SimpleEditor;
