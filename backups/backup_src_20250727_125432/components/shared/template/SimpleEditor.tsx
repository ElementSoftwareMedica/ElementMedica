import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../../design-system/atoms/Button';

/**
 * Common placeholders used in templates
 */
export const COMMON_PLACEHOLDERS = [
  { name: 'NOME', description: 'Nome del partecipante o formatore', example: 'Mario' },
  { name: 'COGNOME', description: 'Cognome del partecipante o formatore', example: 'Rossi' },
  { name: 'NOME_COMPLETO', description: 'Nome e cognome completi', example: 'Mario Rossi' },
  { name: 'CORSO', description: 'Titolo del corso', example: 'Sicurezza sul Lavoro' },
  { name: 'DATA_INIZIO', description: 'Data di inizio corso', example: '01/01/2023' },
  { name: 'DATA_FINE', description: 'Data di fine corso', example: '10/01/2023' },
  { name: 'DURATA', description: 'Durata del corso in ore', example: '8 ore' },
  { name: 'AZIENDA', description: 'Nome dell\'azienda', example: 'Acme S.r.l.' },
  { name: 'NUMERO', description: 'Numero progressivo del documento', example: '12/2023' },
  { name: 'DATA_RILASCIO', description: 'Data di rilascio', example: '15/01/2023' },
  { name: 'DATA_OGGI', description: 'Data odierna', example: 'oggi' },
];

/**
 * Color options for the text color picker
 */
const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

/**
 * Font size options for the font size picker
 */
const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];

interface SimpleEditorProps {
  /** Initial HTML content for the editor */
  initialContent?: string;
  /** Callback function when content changes */
  onContentChange: (content: string) => void;
  /** Additional style for the editor container */
  style?: React.CSSProperties;
  /** Custom placeholders to use */
  customPlaceholders?: Array<{ name: string, description: string, example?: string }>;
}

/**
 * A simple WYSIWYG editor component with support for text formatting and placeholders
 */
const SimpleEditor: React.FC<SimpleEditorProps> = ({ 
  initialContent = '<p>Inserisci il tuo contenuto qui...</p>', 
  onContentChange,
  style = {},
  customPlaceholders = []
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(initialContent);
  const [showPlaceholderMenu, setShowPlaceholderMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentTextColor, setCurrentTextColor] = useState('#000000');
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  
  // Combine common and custom placeholders
  const placeholders = [...COMMON_PLACEHOLDERS, ...customPlaceholders];
  
  // Initialize editor with content
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);
  
  // Set up editor listeners and controls
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    
    // Make the div editable
    editor.contentEditable = 'true';
    
    // Handle content changes
    const handleInput = () => {
      const newContent = editor.innerHTML;
      setContent(newContent);
      onContentChange(newContent);
    };
    
    editor.addEventListener('input', handleInput);
    
    // Clean up
    return () => {
      editor.removeEventListener('input', handleInput);
    };
  }, [onContentChange]);
  
  // Format text with document.execCommand
  const formatText = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      onContentChange(newContent);
      editorRef.current.focus();
    }
  };
  
  // Insert placeholder at cursor position
  const insertPlaceholder = (placeholder: string) => {
    formatText('insertHTML', `{{${placeholder}}}`);
    setShowPlaceholderMenu(false);
  };
  
  // Change text color
  const changeTextColor = (color: string) => {
    formatText('foreColor', color);
    setCurrentTextColor(color);
    setShowColorPicker(false);
  };
  
  // Change font size
  const changeFontSize = (size: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = size;
      range.surroundContents(span);
      
      // Update content
      if (editorRef.current) {
        const newContent = editorRef.current.innerHTML;
        setContent(newContent);
        onContentChange(newContent);
      }
    } else {
      // Fallback to the formatText method
      formatText('fontSize', '7'); // Maximum size
    }
    
    setShowFontSizeMenu(false);
  };
  
  // Handle image insertion
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          const imageTag = `<img src="${event.target.result}" alt="Immagine inserita" style="max-width: 100%;">`;
          formatText('insertHTML', imageTag);
        }
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPlaceholderMenu || showColorPicker || showFontSizeMenu) {
        const target = event.target as HTMLElement;
        const isClickInsideMenu = target.closest('.dropdown-menu') !== null;
        const isClickOnButton = target.closest('.dropdown-button') !== null;
        
        if (!isClickInsideMenu && !isClickOnButton) {
          setShowPlaceholderMenu(false);
          setShowColorPicker(false);
          setShowFontSizeMenu(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPlaceholderMenu, showColorPicker, showFontSizeMenu]);
  
  return (
    <div className="editor-container" style={{ 
      borderRadius: '0.5rem', 
      overflow: 'hidden', 
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid #e5e7eb',
      ...style 
    }}>
      {/* Styles for editor elements */}
      <style>{`
        .editor-btn {
          border-radius: 2rem !important;
        }
        
        .editor-btn:hover {
          background-color: rgba(241, 245, 249, 1);
        }
        
        .font-size-item:hover {
          background-color: #f3f4f6;
        }
        
        .color-btn:hover {
          transform: scale(1.1);
        }
        
        .placeholder-item:hover {
          background-color: #f3f4f6;
        }
        
        .custom-placeholder-btn {
          border-radius: 2rem !important;
        }
        
        .custom-placeholder-btn:hover {
          background-color: #2563eb;
        }
        
        .image-btn {
          border-radius: 2rem !important;
        }
        
        .image-btn:hover {
          background-color: #f3f4f6;
        }

        .dropdown-button {
          border-radius: 2rem !important;
        }
        
        .button-group {
          display: flex;
          gap: 0.25rem;
          background: white;
          padding: 0.25rem;
          border-radius: 2rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .dropdown-menu {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
      
      {/* Toolbar */}
      <div className="toolbar" style={{ 
        display: 'flex', 
        padding: '0.75rem', 
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        flexWrap: 'wrap',
        gap: '0.5rem',
        alignItems: 'center'
      }}>
        {/* Text formatting */}
        <div className="button-group">
          <Button
            variant={document.queryCommandState('bold') ? "default" : "ghost"}
            onClick={() => formatText('bold')}
            size="sm"
            title="Grassetto"
            className="editor-btn"
          >
            B
          </Button>
          <Button
            variant={document.queryCommandState('italic') ? "default" : "ghost"}
            onClick={() => formatText('italic')}
            size="sm"
            title="Corsivo"
            className="editor-btn"
          >
            I
          </Button>
          <Button
            variant={document.queryCommandState('underline') ? "default" : "ghost"}
            onClick={() => formatText('underline')}
            size="sm"
            title="Sottolineato"
            className="editor-btn"
          >
            U
          </Button>
        </div>
        
        {/* Headings */}
        <div className="button-group">
          <Button
            variant="ghost"
            onClick={() => formatText('formatBlock', 'h1')}
            size="sm"
            title="Titolo 1"
            className="editor-btn"
          >
            H1
          </Button>
          <Button
            variant="ghost"
            onClick={() => formatText('formatBlock', 'h2')}
            size="sm"
            title="Titolo 2"
            className="editor-btn"
          >
            H2
          </Button>
          <Button
            variant="ghost"
            onClick={() => formatText('formatBlock', 'p')}
            size="sm"
            title="Paragrafo"
            className="editor-btn"
          >
            P
          </Button>
        </div>
        
        {/* Lists */}
        <div className="button-group">
          <Button
            variant={document.queryCommandState('insertUnorderedList') ? "default" : "ghost"}
            onClick={() => formatText('insertUnorderedList')}
            size="sm"
            title="Elenco puntato"
            className="editor-btn"
          >
            • Lista
          </Button>
          <Button
            variant={document.queryCommandState('insertOrderedList') ? "default" : "ghost"}
            onClick={() => formatText('insertOrderedList')}
            size="sm"
            title="Elenco numerato"
            className="editor-btn"
          >
            1. Lista
          </Button>
        </div>
        
        {/* Alignment */}
        <div className="button-group">
          <Button
            variant={document.queryCommandState('justifyLeft') ? "default" : "ghost"}
            onClick={() => formatText('justifyLeft')}
            size="sm"
            title="Allinea a sinistra"
            className="editor-btn"
          >
            ←
          </Button>
          <Button
            variant={document.queryCommandState('justifyCenter') ? "default" : "ghost"}
            onClick={() => formatText('justifyCenter')}
            size="sm"
            title="Centra"
            className="editor-btn"
          >
            ↔
          </Button>
          <Button
            variant={document.queryCommandState('justifyRight') ? "default" : "ghost"}
            onClick={() => formatText('justifyRight')}
            size="sm" 
            title="Allinea a destra"
            className="editor-btn"
          >
            →
          </Button>
        </div>
        
        {/* Font Size Dropdown */}
        <div className="dropdown" style={{ position: 'relative' }}>
          <Button
            variant="ghost"
            onClick={() => setShowFontSizeMenu(!showFontSizeMenu)}
            className="dropdown-button"
            size="sm"
            title="Dimensione testo"
          >
            Aa <span style={{ marginLeft: '0.25rem', fontSize: '0.75rem' }}>▾</span>
          </Button>
          
          {showFontSizeMenu && (
            <div className="dropdown-menu" style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              left: '0',
              zIndex: 10,
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '0.5rem 0',
              width: '150px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {FONT_SIZES.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => changeFontSize(size)}
                  className="font-size-item"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: size,
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Text Color Picker */}
        <div className="dropdown" style={{ position: 'relative' }}>
          <Button
            variant="ghost"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="dropdown-button"
            size="sm"
            title="Colore testo"
            style={{ color: currentTextColor === '#ffffff' ? '#374151' : currentTextColor }}
          >
            <span style={{ 
              display: 'inline-block', 
              width: '16px', 
              height: '16px', 
              backgroundColor: currentTextColor,
              borderRadius: '4px',
              border: currentTextColor === '#ffffff' ? '1px solid #ddd' : 'none',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}></span>
            <span style={{ marginLeft: '0.25rem' }}>A</span>
          </Button>
          
          {showColorPicker && (
            <div className="dropdown-menu" style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              left: '0',
              zIndex: 10,
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '0.75rem',
              width: '210px'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(10, 1fr)', 
                gap: '4px' 
              }}>
                {TEXT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => changeTextColor(color)}
                    className="color-btn"
                    style={{
                      width: '18px',
                      height: '18px',
                      backgroundColor: color,
                      border: color === '#ffffff' ? '1px solid #ddd' : 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                      transition: 'transform 0.15s ease'
                    }}
                    title={color}
                  ></button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Placeholder Menu Dropdown */}
        <div className="dropdown" style={{ position: 'relative' }}>
          <Button
            variant="ghost"
            onClick={() => setShowPlaceholderMenu(!showPlaceholderMenu)}
            className="dropdown-button"
            size="sm"
            title="Inserisci Placeholder"
          >
            <span style={{ color: '#3b82f6' }}>{'{...}'}</span>
            <span style={{ fontSize: '0.75rem' }}>▾</span>
          </Button>
          
          {showPlaceholderMenu && (
            <div className="dropdown-menu" style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              left: '0',
              zIndex: 10,
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              width: '280px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <div style={{ 
                padding: '0.75rem 1rem', 
                borderBottom: '1px solid #e5e7eb', 
                fontWeight: 'bold',
                fontSize: '0.875rem',
                color: '#374151',
                backgroundColor: '#f9fafb' 
              }}>
                Placeholder Comuni
              </div>
              <div style={{ padding: '0.5rem 0' }}>
                {placeholders.map(placeholder => (
                  <button
                    key={placeholder.name}
                    type="button"
                    onClick={() => insertPlaceholder(placeholder.name)}
                    className="placeholder-item"
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <div style={{ 
                      fontWeight: 'bold', 
                      fontSize: '0.875rem',
                      color: '#3b82f6'
                    }}>{`{{${placeholder.name}}}`}</div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280',
                      marginTop: '0.25rem' 
                    }}>{placeholder.description}</div>
                  </button>
                ))}
              </div>
              <div style={{ 
                padding: '0.75rem', 
                borderTop: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb' 
              }}>
                <Button
                  variant="default"
                  onClick={() => {
                    const placeholder = prompt('Inserisci nome del placeholder:', 'NOME_PLACEHOLDER');
                    if (placeholder) {
                      insertPlaceholder(placeholder);
                    }
                  }}
                  className="custom-placeholder-btn w-full bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  Placeholder Personalizzato
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Image Uploader */}
        <label
          className="image-btn"
          style={{ 
            padding: '0.5rem', 
            border: 'none', 
            background: 'white', 
            borderRadius: '2rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#374151',
            transition: 'all 0.15s ease'
          }}
          title="Inserisci Immagine"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
        </label>
      </div>
      
      {/* Content area */}
      <div
        ref={editorRef}
        style={{ 
          minHeight: '450px', 
          padding: '1.5rem',
          outline: 'none',
          fontSize: '0.875rem',
          lineHeight: '1.6',
          backgroundColor: 'white',
          border: 'none',
          color: '#374151'
        }}
      />
    </div>
  );
};

export default SimpleEditor;