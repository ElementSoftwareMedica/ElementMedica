/**
 * PreviewPane Component
 * 
 * Displays live preview of template with resolved markers using mock data.
 * Shows validation errors and allows switching between header/content/footer sections.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Eye, EyeOff, RefreshCw, Users, BookOpen, Calendar, Building2, UserCog } from 'lucide-react';
import { templateService } from '../../services/templateService';
import type { MarkerPreviewResult, MarkerValidationResult } from '../../types/templates';

interface PreviewPaneProps {
  templateId?: string;
  header: string;
  content: string;
  footer: string;
  onValidationChange?: (isValid: boolean) => void;
  className?: string;
}

type PreviewSection = 'all' | 'header' | 'content' | 'footer';
type MockDataType = 'person' | 'course' | 'schedule' | 'company' | 'trainer';

// Mock data definitions for different entity types
const MOCK_DATA: Record<MockDataType, Record<string, any>> = {
  person: {
    person: {
      id: 'PERS001',
      firstName: 'Mario',
      lastName: 'Rossi',
      fullName: 'Mario Rossi',
      email: 'mario.rossi@example.com',
      cf: 'RSSMRA80A01H501Z',
      phone: '+39 345 6789012',
      birthDate: '1980-01-01',
      birthPlace: 'Roma',
      address: {
        street: 'Via Roma, 123',
        city: 'Milano',
        province: 'MI',
        postalCode: '20100',
        country: 'Italia',
        full: 'Via Roma, 123 - 20100 Milano (MI)'
      }
    },
    current: {
      date: new Date().toLocaleDateString('it-IT'),
      year: new Date().getFullYear().toString(),
      time: new Date().toLocaleTimeString('it-IT')
    },
    document: {
      id: 'DOC001',
      number: '2025/001',
      type: 'Certificato',
      date: new Date().toLocaleDateString('it-IT')
    }
  },
  course: {
    course: {
      id: 'CRS001',
      title: 'Corso di Formazione sulla Sicurezza',
      code: 'SEC-2025-01',
      duration: 16,
      validityYears: 5,
      category: 'Sicurezza sul Lavoro',
      regulation: 'D.Lgs 81/2008',
      description: 'Corso completo sulla sicurezza nei luoghi di lavoro',
      objectives: 'Acquisire competenze in materia di sicurezza e prevenzione',
      topics: 'Normativa, rischi, dispositivi di protezione, procedure di emergenza'
    },
    current: {
      date: new Date().toLocaleDateString('it-IT'),
      year: new Date().getFullYear().toString(),
      time: new Date().toLocaleTimeString('it-IT')
    },
    document: {
      id: 'DOC002',
      number: '2025/002',
      type: 'Programma Corso',
      date: new Date().toLocaleDateString('it-IT')
    }
  },
  schedule: {
    schedule: {
      id: 'SCH001',
      code: 'PROG-2025-01',
      startDate: '2025-01-15',
      endDate: '2025-01-18',
      location: 'Sede Milano',
      address: 'Via della Formazione, 45 - 20100 Milano',
      maxParticipants: 20,
      sessionsCount: 4,
      totalHours: 16,
      status: 'Programmato'
    },
    course: {
      title: 'Corso di Formazione sulla Sicurezza',
      code: 'SEC-2025-01'
    },
    current: {
      date: new Date().toLocaleDateString('it-IT'),
      year: new Date().getFullYear().toString(),
      time: new Date().toLocaleTimeString('it-IT')
    },
    document: {
      id: 'DOC003',
      number: '2025/003',
      type: 'Registro Presenze',
      date: new Date().toLocaleDateString('it-IT')
    }
  },
  company: {
    company: {
      id: 'COM001',
      name: 'Acme S.r.l.',
      vatNumber: 'IT12345678901',
      fiscalCode: '12345678901',
      legalRepresentative: 'Giuseppe Verdi',
      email: 'info@acme.it',
      phone: '+39 02 12345678',
      address: {
        street: 'Via Industria, 100',
        city: 'Milano',
        province: 'MI',
        postalCode: '20100',
        full: 'Via Industria, 100 - 20100 Milano (MI)'
      }
    },
    current: {
      date: new Date().toLocaleDateString('it-IT'),
      year: new Date().getFullYear().toString(),
      time: new Date().toLocaleTimeString('it-IT')
    },
    document: {
      id: 'DOC004',
      number: '2025/004',
      type: 'Lettera di Incarico',
      date: new Date().toLocaleDateString('it-IT')
    }
  },
  trainer: {
    trainer: {
      id: 'TRN001',
      firstName: 'Laura',
      lastName: 'Bianchi',
      fullName: 'Laura Bianchi',
      email: 'laura.bianchi@example.com',
      phone: '+39 348 1234567',
      qualifications: 'Laurea in Ingegneria della Sicurezza',
      certifications: 'Certificato Formatore Sicurezza, RSPP',
      specialties: 'Sicurezza sul lavoro, Prevenzione incendi, Primo soccorso'
    },
    current: {
      date: new Date().toLocaleDateString('it-IT'),
      year: new Date().getFullYear().toString(),
      time: new Date().toLocaleTimeString('it-IT')
    },
    document: {
      id: 'DOC005',
      number: '2025/005',
      type: 'Incarico Docente',
      date: new Date().toLocaleDateString('it-IT')
    }
  }
};

const PreviewPane: React.FC<PreviewPaneProps> = ({
  templateId,
  header,
  content,
  footer,
  onValidationChange,
  className = ''
}) => {
  const [previewSection, setPreviewSection] = useState<PreviewSection>('all');
  const [mockDataType, setMockDataType] = useState<MockDataType>('person');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [validation, setValidation] = useState<MarkerValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  /**
   * Generate preview HTML
   */
  const generatePreview = useCallback(async () => {
    if (!templateId) {
      // For unsaved templates, just show raw HTML
      const html = previewSection === 'all'
        ? `${header}\n\n${content}\n\n${footer}`
        : previewSection === 'header'
        ? header
        : previewSection === 'content'
        ? content
        : footer;
      
      setPreviewHtml(html || '<p class="text-gray-400 italic">Nessun contenuto da visualizzare</p>');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get mock data for selected type
      const mockData = MOCK_DATA[mockDataType];

      // Call preview API
      const result: MarkerPreviewResult = await templateService.preview(templateId, mockData);
      
      // Extract HTML based on section
      let html = result.html;
      if (previewSection === 'header') {
        // Extract header section (if backend splits it)
        html = header; // Fallback to raw header
      } else if (previewSection === 'content') {
        html = content;
      } else if (previewSection === 'footer') {
        html = footer;
      }

      setPreviewHtml(html || '<p class="text-gray-400 italic">Nessun contenuto da visualizzare</p>');

      // Also validate markers
      const validationResult = await templateService.validate(templateId, mockData);
      setValidation(validationResult);
      
      if (onValidationChange) {
        onValidationChange(validationResult.valid);
      }

    } catch (err: any) {
      setError(err.message || 'Errore durante la generazione dell\'anteprima');
      setPreviewHtml('<p class="text-red-500">Errore nel caricamento dell\'anteprima</p>');
    } finally {
      setLoading(false);
    }
  }, [templateId, header, content, footer, previewSection, mockDataType, onValidationChange]);

  /**
   * Auto-refresh effect
   */
  useEffect(() => {
    if (autoRefresh) {
      generatePreview();
    }
  }, [header, content, footer, autoRefresh, generatePreview]);

  /**
   * Initial load
   */
  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  /**
   * Get icon for mock data type
   */
  const getMockDataIcon = (type: MockDataType) => {
    switch (type) {
      case 'person': return <Users className="w-4 h-4" />;
      case 'course': return <BookOpen className="w-4 h-4" />;
      case 'schedule': return <Calendar className="w-4 h-4" />;
      case 'company': return <Building2 className="w-4 h-4" />;
      case 'trainer': return <UserCog className="w-4 h-4" />;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Header Controls */}
      <div className="flex-shrink-0 bg-white border-b p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Anteprima Live</h3>
          
          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                autoRefresh
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={autoRefresh ? 'Disabilita aggiornamento automatico' : 'Abilita aggiornamento automatico'}
            >
              {autoRefresh ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            {/* Manual refresh */}
            <button
              onClick={generatePreview}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Aggiorna
            </button>
          </div>
        </div>

        {/* Section selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewSection('all')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              previewSection === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Completo
          </button>
          <button
            onClick={() => setPreviewSection('header')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              previewSection === 'header'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Header
          </button>
          <button
            onClick={() => setPreviewSection('content')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              previewSection === 'content'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Contenuto
          </button>
          <button
            onClick={() => setPreviewSection('footer')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              previewSection === 'footer'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Footer
          </button>
        </div>

        {/* Mock data selector */}
        <div className="flex gap-2">
          <span className="text-sm text-gray-600 self-center">Dati di test:</span>
          {(['person', 'course', 'schedule', 'company', 'trainer'] as MockDataType[]).map((type) => (
            <button
              key={type}
              onClick={() => setMockDataType(type)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                mockDataType === type
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={type}
            >
              {getMockDataIcon(type)}
              {type === 'person' && 'Persona'}
              {type === 'course' && 'Corso'}
              {type === 'schedule' && 'Programmazione'}
              {type === 'company' && 'Azienda'}
              {type === 'trainer' && 'Docente'}
            </button>
          ))}
        </div>

        {/* Validation status */}
        {validation && (
          <div className={`p-2 rounded flex items-start gap-2 text-sm ${
            validation.valid
              ? 'bg-green-50 text-green-800'
              : 'bg-yellow-50 text-yellow-800'
          }`}>
            {validation.valid ? (
              <>
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Template valido - {validation.markerCount} marker{validation.markerCount !== 1 ? 's' : ''} trovati
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium mb-1">
                    {validation.errors.length} errore{validation.errors.length !== 1 ? 'i' : ''} trovato
                  </div>
                  {validation.errors.slice(0, 3).map((err, idx) => (
                    <div key={idx} className="text-xs ml-2">
                      • <code className="bg-yellow-100 px-1 rounded">{err.marker}</code> - {err.message}
                      {err.suggestion && err.suggestion.length > 0 && (
                        <div className="ml-4 text-yellow-600">
                          Suggerimento: {err.suggestion.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                  {validation.errors.length > 3 && (
                    <div className="text-xs ml-2 mt-1 text-yellow-600">
                      ... e altri {validation.errors.length - 3} errori
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading && !previewHtml && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">Generazione anteprima...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">Errore</div>
                <div className="text-sm mt-1">{error}</div>
                <button
                  onClick={generatePreview}
                  className="mt-2 text-sm underline hover:no-underline"
                >
                  Riprova
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && previewHtml && (
          <div className="bg-white rounded-lg shadow-sm border min-h-full">
            {/* A4 page simulation */}
            <div className="max-w-4xl mx-auto p-8">
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPane;
