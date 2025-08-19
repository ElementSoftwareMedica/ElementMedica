import React, { useRef } from 'react';
import { Star, Edit, FileText, Presentation, ExternalLink, MoreVertical, Trash2 } from 'lucide-react';
import { TemplateActionDropdown } from './TemplateActionDropdown';
import { Template } from '../../../types/template';

interface TemplateCardProps {
  template: Template;
  isDefault: boolean;
  onEdit: (template: Template) => void;
  onSetAsDefault: (id: string, type: string) => void;
  onRemove: (id: string) => void;
  openDropdownId: string | null;
  toggleDropdown: (id: string) => void;
  dropdownRefs: React.MutableRefObject<{[key: string]: React.RefObject<HTMLButtonElement>}>;
  fetchTemplates: () => Promise<void>;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isDefault,
  onEdit,
  onSetAsDefault,
  onRemove,
  openDropdownId,
  toggleDropdown,
  dropdownRefs,
  fetchTemplates,
}) => {
  return (
    <div className={`border rounded-xl p-3 ${isDefault ? 'bg-yellow-50 border-yellow-200' : 'hover:shadow-sm transition-shadow'}`}>
      <div className="flex justify-between items-start">
        <div>
          <h5 className="font-medium">{template.name}</h5>
          <p className="text-xs text-gray-500">
            {template.fileFormat === 'pptx' ? 'Presentazione' : 'Documento'}
            {template.googleDocsUrl && ' • Google Docs'}
          </p>
          {isDefault && (
            <div className="flex items-center mt-1">
              <Star className="h-3 w-3 text-yellow-500 mr-1" />
              <span className="text-yellow-700 text-xs">Template predefinito</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center relative">
          <div className="relative">
            <button
              ref={el => {
                if (!dropdownRefs.current[template.id]) {
                  dropdownRefs.current[template.id] = React.createRef<HTMLButtonElement>();
                }
                if (el) {
                  // @ts-ignore
                  dropdownRefs.current[template.id].current = el;
                }
              }}
              onClick={() => toggleDropdown(template.id)}
              className="p-1 rounded text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            <TemplateActionDropdown
              template={template}
              isOpen={openDropdownId === template.id}
              toggleDropdown={() => toggleDropdown(template.id)}
              onEditContent={(template: Template) => onEdit(template)}
              onEditProperties={(template: Template) => onEdit(template)}
              onSetAsDefault={onSetAsDefault}
              onRemove={onRemove}
              reloadTemplates={fetchTemplates}
              buttonRef={dropdownRefs.current[template.id]}
            />
          </div>
          
          {!isDefault && (
            <button
              onClick={() => onSetAsDefault(template.id, template.type)}
              className="p-1 text-gray-400 hover:text-yellow-500 transition-colors ml-1"
              title="Imposta come predefinito"
            >
              <Star className="h-4 w-4" />
            </button>
          )}
          
          {template.googleDocsUrl && (
            <a
              href={template.googleDocsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-gray-400 hover:text-green-600 transition-colors ml-1"
              title="Apri in Google Docs"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};