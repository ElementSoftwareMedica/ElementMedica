/**
 * ContentEditableText - Controlled component that doesn't re-render on input
 * This prevents cursor jumping by not using dangerouslySetInnerHTML during editing
 */

import React, { useRef, useCallback, useEffect, memo } from 'react';
import { sanitizeRichHtml } from '@/utils/sanitize';

interface ContentEditableTextProps {
    elementId: string;
    initialContent: string;
    style?: {
        textAlign?: 'left' | 'center' | 'right';
    };
    onSave: (html: string) => void;
    onBlur: () => void;
    onMouseUp: () => void;
    onEscape: () => void;
}

const ContentEditableText = memo(({
    elementId,
    initialContent,
    style,
    onSave,
    onBlur,
    onMouseUp,
    onEscape
}: ContentEditableTextProps) => {
    const divRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<string>(initialContent);

    // Initialize content only once when component mounts
    useEffect(() => {
        if (divRef.current && divRef.current.innerHTML !== initialContent) {
            divRef.current.innerHTML = sanitizeRichHtml(initialContent);
        }
        // Focus after mount
        divRef.current?.focus();
    }, []); // Empty deps - run only on mount

    const handleInput = useCallback(() => {
        if (divRef.current) {
            contentRef.current = divRef.current.innerHTML;
        }
    }, []);

    const handleBlur = useCallback(() => {
        // Save content to parent state only on blur
        onSave(contentRef.current);
        onBlur();
    }, [onSave, onBlur]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Escape to exit editing
        if (e.key === 'Escape') {
            onSave(contentRef.current);
            onEscape();
            e.preventDefault();
            return;
        }
        // Handle Enter key to insert line break
        if (e.key === 'Enter') {
            e.preventDefault();
            // Use insertHTML with <br> tags for reliable line breaks
            // Double br creates a visible paragraph break
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();

                // Insert br element
                const br = document.createElement('br');
                range.insertNode(br);

                // If shift is pressed, add double br for paragraph break
                if (e.shiftKey) {
                    const br2 = document.createElement('br');
                    range.insertNode(br2);
                }

                // Move cursor after the br
                range.setStartAfter(br);
                range.setEndAfter(br);
                selection.removeAllRanges();
                selection.addRange(range);

                // Update content ref
                if (divRef.current) {
                    contentRef.current = divRef.current.innerHTML;
                }
            }
            return;
        }
        // Handle Ctrl+B/I/U for formatting
        if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
            e.stopPropagation();
            document.execCommand(
                e.key.toLowerCase() === 'b' ? 'bold' :
                    e.key.toLowerCase() === 'i' ? 'italic' : 'underline'
            );
            e.preventDefault();
        }
    }, [onSave, onEscape]);

    return (
        <div
            ref={divRef}
            contentEditable
            suppressContentEditableWarning
            data-element-id={elementId}
            onInput={handleInput}
            onBlur={handleBlur}
            onMouseUp={onMouseUp}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                font: 'inherit',
                color: 'inherit',
                textAlign: style?.textAlign || 'left',
                cursor: 'text',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}
        />
    );
});

ContentEditableText.displayName = 'ContentEditableText';

export type { ContentEditableTextProps };
export default ContentEditableText;
