import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { FileText, Upload, X, Download } from 'lucide-react';

// Tipi semplificati per i documenti
interface Document {
  id: string;
  name: string;
  type: string;
  size?: number;
  url?: string;
  required?: boolean;
}

interface StepDocumentsSimpleProps {
  documents: Document[];
  selectedDocuments: string[];
  onDocumentToggle: (documentId: string) => void;
  onDocumentUpload: (file: File) => void;
  onDocumentRemove: (documentId: string) => void;
  className?: string;
}

const StepDocumentsSimple: React.FC<StepDocumentsSimpleProps> = ({
  documents = [],
  selectedDocuments = [],
  onDocumentToggle,
  onDocumentUpload,
  onDocumentRemove,
  className = ''
}) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onDocumentUpload(file);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Sezione Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Carica Documenti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="document-upload">Seleziona file da caricare</Label>
              <Input
                id="document-upload"
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                className="mt-1"
              />
            </div>
            <p className="text-sm text-gray-500">
              Formati supportati: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista Documenti Disponibili */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documenti Disponibili ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nessun documento disponibile
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => {
                const isSelected = selectedDocuments.includes(document.id);
                return (
                  <div
                    key={document.id}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onDocumentToggle(document.id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {document.name}
                          </span>
                          {document.required && (
                            <Badge variant="destructive" className="text-xs">
                              Obbligatorio
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-500">
                            {document.type.toUpperCase()}
                          </span>
                          {document.size && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-sm text-gray-500">
                                {formatFileSize(document.size)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {document.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(document.url, '_blank')}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDocumentRemove(document.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documenti Selezionati */}
      {selectedDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-700">
              Documenti Selezionati ({selectedDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedDocuments.map((docId) => {
                const document = documents.find(d => d.id === docId);
                if (!document) return null;
                return (
                  <Badge
                    key={docId}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {document.name}
                    <button
                      onClick={() => onDocumentToggle(docId)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StepDocumentsSimple;
export type { StepDocumentsSimpleProps, Document };