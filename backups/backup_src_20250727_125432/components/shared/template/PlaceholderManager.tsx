import React, { useState, useEffect } from 'react';
import { X, Plus, FileText, HelpCircle, Tag } from 'lucide-react';

// Define placeholder categories and their placeholders
export interface PlaceholderCategory {
  name: string;
  description: string;
  icon?: React.ReactNode;
  color?: string;
  placeholders: Placeholder[];
}

export interface Placeholder {
  tag: string;
  description: string;
  example?: string;
  category: string;
}

// Props interface
interface PlaceholderManagerProps {
  documentType: 'attestato' | 'lettera_incarico' | 'fattura' | 'preventivo' | 'registro_presenze' | string;
  initialContent?: string;
  onChange?: (content: string) => void;
  onPreview?: (content: string, values: Record<string, string>) => void;
  previewData?: Record<string, string>;
}

const PlaceholderManager: React.FC<PlaceholderManagerProps> = ({
  documentType,
  initialContent = '',
  onChange,
  onPreview,
  previewData = {}
}) => {
  const [content, setContent] = useState(initialContent);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Update content when initialContent prop changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);
  
  // Define standard placeholders by category
  const placeholderCategories: PlaceholderCategory[] = [
    {
      name: 'Partecipante',
      description: 'Informazioni sulla persona',
      icon: <Tag size={16} />,
      color: 'bg-blue-100',
      placeholders: [
        { tag: '{{NOME}}', description: 'Nome del partecipante', example: 'Mario', category: 'Partecipante' },
        { tag: '{{COGNOME}}', description: 'Cognome del partecipante', example: 'Rossi', category: 'Partecipante' },
        { tag: '{{NOME_COMPLETO}}', description: 'Nome e cognome completi', example: 'Mario Rossi', category: 'Partecipante' },
        { tag: '{{CODICE_FISCALE}}', description: 'Codice fiscale', example: 'RSSMRA80A01H501Z', category: 'Partecipante' },
        { tag: '{{DATA_NASCITA}}', description: 'Data di nascita', example: '01/01/1980', category: 'Partecipante' },
        { tag: '{{LUOGO_NASCITA}}', description: 'Luogo di nascita', example: 'Roma', category: 'Partecipante' },
        { tag: '{{EMAIL}}', description: 'Indirizzo email', example: 'mario.rossi@example.com', category: 'Partecipante' },
        { tag: '{{TELEFONO}}', description: 'Numero di telefono', example: '+39 123 456 7890', category: 'Partecipante' }
      ]
    },
    {
      name: 'Azienda',
      description: 'Informazioni sull\'azienda cliente',
      icon: <FileText size={16} />,
      color: 'bg-green-100',
      placeholders: [
        { tag: '{{AZIENDA}}', description: 'Nome dell\'azienda', example: 'Acme Srl', category: 'Azienda' },
        { tag: '{{RAGIONE_SOCIALE}}', description: 'Ragione sociale completa', example: 'Acme Società a Responsabilità Limitata', category: 'Azienda' },
        { tag: '{{PARTITA_IVA}}', description: 'Partita IVA', example: '12345678901', category: 'Azienda' },
        { tag: '{{INDIRIZZO_AZIENDA}}', description: 'Indirizzo sede legale', example: 'Via Roma 123, 00100 Roma', category: 'Azienda' },
        { tag: '{{TELEFONO_AZIENDA}}', description: 'Telefono aziendale', example: '+39 06 12345678', category: 'Azienda' },
        { tag: '{{EMAIL_AZIENDA}}', description: 'Email aziendale', example: 'info@acmesrl.it', category: 'Azienda' },
        { tag: '{{PEC_AZIENDA}}', description: 'PEC aziendale', example: 'acmesrl@pec.it', category: 'Azienda' },
        { tag: '{{SDI_AZIENDA}}', description: 'Codice SDI', example: 'ABC1234', category: 'Azienda' }
      ]
    },
    {
      name: 'Corso',
      description: 'Informazioni sul corso di formazione',
      icon: <HelpCircle size={16} />,
      color: 'bg-purple-100',
      placeholders: [
        { tag: '{{CORSO}}', description: 'Titolo del corso', example: 'Sicurezza sul lavoro', category: 'Corso' },
        { tag: '{{DURATA}}', description: 'Durata del corso in ore', example: '8 ore', category: 'Corso' },
        { tag: '{{DATA_INIZIO}}', description: 'Data di inizio', example: '01/01/2023', category: 'Corso' },
        { tag: '{{DATA_FINE}}', description: 'Data di fine', example: '05/01/2023', category: 'Corso' },
        { tag: '{{SEDE}}', description: 'Sede del corso', example: 'Milano, Via Manzoni 123', category: 'Corso' },
        { tag: '{{FORMATORI}}', description: 'Nomi dei formatori', example: 'Dott. Mario Bianchi, Ing. Laura Verdi', category: 'Corso' },
        { tag: '{{ARGOMENTI}}', description: 'Argomenti trattati', example: 'Normativa, Procedure, Esercitazioni', category: 'Corso' },
        { tag: '{{OBIETTIVI}}', description: 'Obiettivi del corso', example: 'Formare il personale sui rischi specifici', category: 'Corso' }
      ]
    },
    {
      name: 'Attestato',
      description: 'Informazioni specifiche dell\'attestato',
      icon: <FileText size={16} />,
      color: 'bg-yellow-100',
      placeholders: [
        { tag: '{{NUMERO}}', description: 'Numero progressivo attestato', example: '123/2023', category: 'Attestato' },
        { tag: '{{DATA_RILASCIO}}', description: 'Data di rilascio attestato', example: '10/01/2023', category: 'Attestato' },
        { tag: '{{VALIDITA}}', description: 'Periodo di validità', example: '5 anni', category: 'Attestato' },
        { tag: '{{SCADENZA}}', description: 'Data di scadenza', example: '10/01/2028', category: 'Attestato' },
        { tag: '{{FIRMA_DIGITALE}}', description: 'URL firma digitale', example: '[URL FIRMA]', category: 'Attestato' }
      ]
    },
    {
      name: 'Documento',
      description: 'Informazioni generali del documento',
      icon: <FileText size={16} />,
      color: 'bg-red-100',
      placeholders: [
        { tag: '{{DATA_OGGI}}', description: 'Data odierna', example: '15/07/2023', category: 'Documento' },
        { tag: '{{ANNO_CORRENTE}}', description: 'Anno corrente', example: '2023', category: 'Documento' },
        { tag: '{{PROTOCOLLO}}', description: 'Numero protocollo', example: 'PROT-2023-1234', category: 'Documento' }
      ]
    }
  ];
  
  // Filter placeholders based on document type
  const getPlaceholdersForDocumentType = () => {
    // Base placeholders for all document types
    const basePlaceholders = ['Partecipante', 'Azienda', 'Documento'];
    
    switch(documentType) {
      case 'attestato':
        return [...basePlaceholders, 'Corso', 'Attestato'];
      case 'lettera_incarico':
        return [...basePlaceholders, 'Corso'];
      case 'registro_presenze':
        return [...basePlaceholders, 'Corso'];
      case 'fattura':
      case 'preventivo':
        return [...basePlaceholders, 'Corso'];
      default:
        return basePlaceholders;
    }
  };
  
  // Filter categories based on document type
  const filteredCategories = placeholderCategories.filter(category => 
    getPlaceholdersForDocumentType().includes(category.name)
  );
  
  // Filter placeholders based on search query
  const filterPlaceholders = (placeholders: Placeholder[]) => {
    if (!searchQuery) return placeholders;
    
    return placeholders.filter(placeholder => 
      placeholder.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      placeholder.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };
  
  // Handle inserting a placeholder into the content
  const handleInsertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const textBefore = content.substring(0, start);
      const textAfter = content.substring(end);
      
      const newContent = `${textBefore}${placeholder}${textAfter}`;
      
      setContent(newContent);
      onChange?.(newContent);
      
      // Re-focus and set cursor position after placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 10);
    } else {
      // If no textarea found, just append
      const newContent = `${content}${placeholder}`;
      setContent(newContent);
      onChange?.(newContent);
    }
  };
  
  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onChange?.(e.target.value);
  };
  
  // Handle preview with placeholder substitution
  const handlePreview = () => {
    if (onPreview) {
      onPreview(content, previewData);
    }
  };
  
  // Generate placeholder values for preview
  const generatePreviewValues = () => {
    const allPlaceholders: Placeholder[] = placeholderCategories.flatMap(category => category.placeholders);
    const previewValues: Record<string, string> = {};
    
    allPlaceholders.forEach(placeholder => {
      // Use provided preview data if available, otherwise use example
      const placeholderName = placeholder.tag.replace(/[{}]/g, '');
      previewValues[placeholderName] = 
        previewData[placeholderName] || 
        placeholder.example || 
        `[${placeholderName}]`;
    });
    
    return previewValues;
  };
  
  return (
    <div className="border border-gray-200 rounded-md shadow-sm">
      {/* Editor section */}
      <div className="p-4">
        <textarea
          id="content-editor"
          value={content}
          onChange={handleContentChange}
          className="w-full min-h-[200px] p-3 border border-gray-300 rounded-md"
          placeholder="Inserisci il testo del template qui. Puoi aggiungere placeholder come {{NOME}} dal pannello placeholders."
        />
      </div>
      
      {/* Placeholder panel toggle */}
      <div className="border-t border-gray-200 p-3 flex justify-between items-center bg-gray-50">
        <button 
          onClick={() => setShowPlaceholders(!showPlaceholders)}
          className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          {showPlaceholders ? (
            <>
              <X size={16} className="mr-1" /> Nascondi placeholder
            </>
          ) : (
            <>
              <Plus size={16} className="mr-1" /> Mostra placeholder
            </>
          )}
        </button>
        
        {onPreview && (
          <button 
            onClick={handlePreview}
            className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
          >
            Anteprima
          </button>
        )}
      </div>
      
      {/* Placeholder panel */}
      {showPlaceholders && (
        <div className="border-t border-gray-200 p-4">
          <div className="mb-3">
            <input
              type="text"
              placeholder="Cerca placeholder..."
              className="w-full p-2 border border-gray-300 rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              className={`text-xs px-3 py-1 rounded-full ${
                selectedCategory === null 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              Tutti
            </button>
            
            {filteredCategories.map(category => (
              <button
                key={category.name}
                className={`text-xs px-3 py-1 rounded-full ${
                  selectedCategory === category.name 
                    ? 'bg-blue-100 text-blue-700' 
                    : `${category.color || 'bg-gray-100'} text-gray-700 hover:bg-gray-200`
                }`}
                onClick={() => setSelectedCategory(category.name)}
              >
                {category.icon && <span className="mr-1">{category.icon}</span>}
                {category.name}
              </button>
            ))}
          </div>
          
          {/* Placeholders list */}
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placeholder</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrizione</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Esempio</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Inserisci</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCategories
                  .filter(category => selectedCategory === null || category.name === selectedCategory)
                  .flatMap(category => filterPlaceholders(category.placeholders))
                  .map((placeholder, idx) => (
                    <tr key={`${placeholder.tag}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-mono text-gray-900">
                        {placeholder.tag}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-800">
                        {placeholder.description}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500 italic">
                        {placeholder.example || ''}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        {placeholder.category}
                      </td>
                      <td className="px-3 py-2 text-sm text-center">
                        <button
                          onClick={() => handleInsertPlaceholder(placeholder.tag)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title={`Inserisci ${placeholder.tag}`}
                        >
                          <Plus size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaceholderManager; 