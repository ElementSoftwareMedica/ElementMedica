import React, { useEffect, useRef } from 'react';
import { 
  Edit,
  FileOutput,
  FileText,
  Settings,
  Star,
  Trash2
} from 'lucide-react';
import { Template } from '../../../types/template';

interface TemplateActionDropdownProps {
  template: Template;
  isOpen: boolean;
  toggleDropdown: () => void;
  onEditContent: (template: Template) => void;
  onEditProperties: (template: Template) => void;
  onSetAsDefault: (id: string, type: string) => void;
  onRemove: (id: string) => void;
  onExportPdf?: (template: Template) => void;
  onExportDocx?: (template: Template) => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export const TemplateActionDropdown: React.FC<TemplateActionDropdownProps> = ({
  template,
  isOpen,
  toggleDropdown,
  onEditContent,
  onEditProperties,
  onSetAsDefault,
  onRemove,
  onExportPdf,
  onExportDocx,
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
            onEditContent(template);
            toggleDropdown();
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <Edit className="w-4 h-4 mr-2 text-blue-500" />
          Modifica Contenuto
        </button>
        
        <button
          onClick={() => {
            onEditProperties(template);
            toggleDropdown();
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <Settings className="w-4 h-4 mr-2 text-gray-500" />
          Modifica Proprietà
        </button>
        
        <button
          onClick={() => {
            onSetAsDefault(template.id, template.type);
            toggleDropdown();
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <Star className="w-4 h-4 mr-2 text-yellow-500" />
          Imposta come Predefinito
        </button>
        
        {onExportPdf && (
          <button
            onClick={() => {
              onExportPdf(template);
              toggleDropdown();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <FileOutput className="w-4 h-4 mr-2 text-red-500" />
            Esporta PDF
          </button>
        )}
        
        {onExportDocx && (
          <button
            onClick={() => {
              onExportDocx(template);
              toggleDropdown();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <FileText className="w-4 h-4 mr-2 text-blue-500" />
            Esporta DOCX
          </button>
        )}
        
        <button
          onClick={() => {
            onRemove(template.id);
            toggleDropdown();
          }}
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Elimina
        </button>
      </div>
    </div>
  );
};