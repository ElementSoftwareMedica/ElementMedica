import React from 'react';
import { 
  ChevronDown,
  FileOutput,
  Plus,
  Star
} from 'lucide-react';
import { Template } from '../../../types/template';
import { TemplateCard } from './TemplateCard';
import { NewTemplateDropdown } from './NewTemplateDropdown';

interface TemplateTypeCardProps {
  templateType: {
    value: string;
    label: string;
  };
  templates: Template[];
  openDropdownId: string | null;
  dropdownRefs: React.MutableRefObject<{[key: string]: React.RefObject<HTMLButtonElement>}>;
  onToggleDropdown: (id: string) => void;
  onCreateNew: (templateType: string) => void;
  onDocxImport: (templateType: string) => void;
  onAddGoogleDocs: (templateType: string) => void;
  onAddGoogleSlides: (templateType: string) => void;
  onEditTemplate: (template: Template) => void;
  onSetAsDefault: (templateId: string) => void;
  onRemoveTemplate: (templateId: string) => Promise<void>;
  fetchTemplates: () => Promise<void>;
}

export const TemplateTypeCard: React.FC<TemplateTypeCardProps> = ({
  templateType,
  templates,
  openDropdownId,
  dropdownRefs,
  onToggleDropdown,
  onCreateNew,
  onDocxImport,
  onAddGoogleDocs,
  onAddGoogleSlides,
  onEditTemplate,
  onSetAsDefault,
  onRemoveTemplate,
  fetchTemplates
}) => {
  const defaultTemplate = templates.find(t => t.isDefault);
  const otherTemplates = templates.filter(t => !t.isDefault);
  const dropdownId = `dropdown-${templateType.value}`;

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="bg-blue-50 p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium text-blue-800 flex items-center">
          <FileOutput className="w-5 h-5 mr-2 text-blue-600" />
          {templateType.label}
        </h3>
        <div className="relative">
          <button
            ref={dropdownRefs.current[dropdownId]}
            onClick={() => onToggleDropdown(dropdownId)}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo</span>
            <ChevronDown className="w-3 h-3 ml-1" />
          </button>
          
          <NewTemplateDropdown 
            isOpen={openDropdownId === dropdownId}
            toggleDropdown={() => onToggleDropdown(dropdownId)}
            onCreateNew={() => onCreateNew(templateType.value)}
            onImportDocx={() => onDocxImport(templateType.value)}
            onAddGoogleDocs={templateType.value !== 'slide' ? () => onAddGoogleDocs(templateType.value) : undefined}
            onAddGoogleSlides={templateType.value === 'slide' ? () => onAddGoogleSlides(templateType.value) : undefined}
            onCreateDeckDeckGo={templateType.value === 'slide' ? () => onCreateNew(templateType.value) : undefined}
            onCreateWithEtherpad={() => onAddGoogleDocs(templateType.value)}
            templateType={templateType.value}
            buttonRef={dropdownRefs.current[dropdownId]}
          />
        </div>
      </div>

      <div className="p-4">
        {/* Default Template Section */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
            <Star className="h-4 w-4 mr-1 text-yellow-500" />
            Template Predefinito
          </h4>
          
          {defaultTemplate ? (
            <TemplateCard
              template={defaultTemplate}
              isDefault={true}
              onEdit={onEditTemplate}
              onSetAsDefault={onSetAsDefault}
              onRemove={onRemoveTemplate}
              openDropdownId={openDropdownId}
              toggleDropdown={onToggleDropdown}
              dropdownRefs={dropdownRefs}
              fetchTemplates={fetchTemplates}
            />
          ) : (
            <div className="border rounded-xl p-3 bg-gray-50 border-gray-200 text-center">
              <p className="text-xs text-gray-500">Nessun template predefinito</p>
            </div>
          )}
        </div>
        
        {/* Other Templates */}
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Altri Template</h4>
          
          {otherTemplates.length === 0 ? (
            <div className="border rounded-xl p-3 bg-gray-50 border-gray-200 text-center">
              <p className="text-xs text-gray-500">Nessun altro template disponibile</p>
            </div>
          ) : (
            <div className="space-y-2">
              {otherTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isDefault={false}
                  onEdit={onEditTemplate}
                  onSetAsDefault={onSetAsDefault}
                  onRemove={onRemoveTemplate}
                  openDropdownId={openDropdownId}
                  toggleDropdown={onToggleDropdown}
                  dropdownRefs={dropdownRefs}
                  fetchTemplates={fetchTemplates}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};