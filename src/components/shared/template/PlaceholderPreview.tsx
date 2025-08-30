import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface PlaceholderPreviewProps {
  content: string;
  values: Record<string, string>;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const PlaceholderPreview: React.FC<PlaceholderPreviewProps> = ({
  content,
  values,
  isOpen,
  onClose,
  title = 'Anteprima Documento'
}) => {
  const [processedContent, setProcessedContent] = useState<string>('');
  
  useEffect(() => {
    if (isOpen) {
      // Replace all placeholders with their values
      let result = content;
      
      // Find all placeholders in the format {{PLACEHOLDER}}
      const placeholderRegex = /{{([A-Za-z0-9_]+)}}/g;
      let match;
      
      while ((match = placeholderRegex.exec(content)) !== null) {
        const fullMatch = match[0]; // {{PLACEHOLDER}}
        const placeholderName = match[1]; // PLACEHOLDER
        
        const value = values[placeholderName] || `[${placeholderName}]`;
        
        // Replace all instances of this placeholder
        result = result.replace(new RegExp(fullMatch, 'g'), value);
      }
      
      setProcessedContent(result);
    }
  }, [content, values, isOpen]);
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Preview content */}
        <div className="p-6 overflow-auto flex-grow">
          <div className="prose max-w-none">
            {processedContent.split('\n').map((line, index) => (
              <React.Fragment key={index}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-between items-center bg-gray-50">
          <div className="text-sm text-gray-500">
            I valori dei placeholder sono indicativi e possono differire dai dati reali
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPreview;