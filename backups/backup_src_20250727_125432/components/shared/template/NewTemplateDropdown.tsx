import React, { useEffect, useRef } from 'react';
import { FileText, Presentation, Upload, ExternalLink, Layout, Edit } from 'lucide-react';

interface NewTemplateDropdownProps {
  isOpen: boolean;
  toggleDropdown: () => void;
  onCreateNew: () => void;
  onImportDocx: () => void;
  onAddGoogleDocs?: () => void;
  onAddGoogleSlides?: () => void;
  onCreateDeckDeckGo?: () => void;
  onCreateWithEtherpad?: () => void;
  templateType: string;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export const NewTemplateDropdown: React.FC<NewTemplateDropdownProps> = ({
  isOpen,
  toggleDropdown,
  onCreateNew,
  onImportDocx,
  onAddGoogleDocs,
  onAddGoogleSlides,
  onCreateDeckDeckGo,
  onCreateWithEtherpad,
  templateType,
  buttonRef
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        toggleDropdown();
      }
    };

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);

    // Clean up event listeners
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, toggleDropdown, buttonRef]);

  if (!isOpen) return null;
  
  return (
    <div 
      ref={dropdownRef}
      data-testid="dropdown-content"
      className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg py-1 w-56 z-50"
    >
      <div className="py-1">
        <button
          onClick={() => {
            onCreateNew();
            toggleDropdown();
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <FileText className="w-4 h-4 mr-2 text-blue-500" />
          Crea Documento
        </button>
        
        {templateType === 'slide' && (
          <button
            onClick={() => {
              onCreateNew();
              toggleDropdown();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <Presentation className="w-4 h-4 mr-2 text-green-500" />
            Crea Slides
          </button>
        )}
        
        <button
          onClick={() => {
            onImportDocx();
            toggleDropdown();
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <Upload className="w-4 h-4 mr-2 text-purple-500" />
          Importa DOCX
        </button>
        
        {onAddGoogleDocs && (
          <button
            onClick={() => {
              onAddGoogleDocs();
              toggleDropdown();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <ExternalLink className="w-4 h-4 mr-2 text-red-500" />
            Importa Google Docs
          </button>
        )}
        
        {onAddGoogleSlides && (
          <button
            onClick={() => {
              onAddGoogleSlides();
              toggleDropdown();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <ExternalLink className="w-4 h-4 mr-2 text-orange-500" />
            Importa Google Slides
          </button>
        )}
        
        {onCreateDeckDeckGo && (
          <button
            onClick={() => {
              onCreateDeckDeckGo();
              toggleDropdown();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <Layout className="w-4 h-4 mr-2 text-indigo-500" />
            Crea DeckDeckGo
          </button>
        )}
        
        {onCreateWithEtherpad && (
          <button
            onClick={() => {
              onCreateWithEtherpad();
              toggleDropdown();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <Edit className="w-4 h-4 mr-2 text-teal-500" />
            Crea con Etherpad
          </button>
        )}
      </div>
    </div>
  );
}; 