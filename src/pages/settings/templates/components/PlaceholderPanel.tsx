/**
 * PlaceholderPanel Component
 * Pannello organizzato con tutti i placeholder disponibili divisi per entità
 */

import React, { useState } from 'react';
import { User, Building, GraduationCap, Calendar, Globe, FileText, ChevronDown, Copy, Check } from 'lucide-react';

interface PlaceholderGroup {
  category: string;
  icon: React.ReactNode;
  color: string;
  placeholders: Array<{ marker: string; description: string }>;
}

const PLACEHOLDER_GROUPS: PlaceholderGroup[] = [
  {
    category: 'Persona',
    icon: <User className="w-5 h-5" />,
    color: 'blue',
    placeholders: [
      { marker: 'person.id', description: 'ID persona' },
      { marker: 'person.fullName', description: 'Nome completo' },
      { marker: 'person.firstName', description: 'Nome' },
      { marker: 'person.lastName', description: 'Cognome' },
      { marker: 'person.email', description: 'Email' },
      { marker: 'person.cf', description: 'Codice fiscale' },
      { marker: 'person.phone', description: 'Telefono' },
      { marker: 'person.birthDate', description: 'Data di nascita' },
      { marker: 'person.birthPlace', description: 'Luogo di nascita' },
      { marker: 'person.address.street', description: 'Via' },
      { marker: 'person.address.city', description: 'Città' },
      { marker: 'person.address.province', description: 'Provincia' },
      { marker: 'person.address.postalCode', description: 'CAP' },
      { marker: 'person.address.country', description: 'Paese' },
      { marker: 'person.address.full', description: 'Indirizzo completo' }
    ]
  },
  {
    category: 'Azienda',
    icon: <Building className="w-5 h-5" />,
    color: 'green',
    placeholders: [
      { marker: 'company.id', description: 'ID azienda' },
      { marker: 'company.name', description: 'Ragione sociale' },
      { marker: 'company.vatNumber', description: 'Partita IVA' },
      { marker: 'company.fiscalCode', description: 'Codice fiscale' },
      { marker: 'company.address.street', description: 'Via' },
      { marker: 'company.address.city', description: 'Città' },
      { marker: 'company.address.province', description: 'Provincia' },
      { marker: 'company.address.postalCode', description: 'CAP' },
      { marker: 'company.address.full', description: 'Indirizzo completo' },
      { marker: 'company.legalRepresentative', description: 'Rappresentante legale' },
      { marker: 'company.email', description: 'Email' },
      { marker: 'company.phone', description: 'Telefono' }
    ]
  },
  {
    category: 'Corso',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'purple',
    placeholders: [
      { marker: 'course.id', description: 'ID corso' },
      { marker: 'course.title', description: 'Titolo corso' },
      { marker: 'course.code', description: 'Codice corso' },
      { marker: 'course.duration', description: 'Durata (ore)' },
      { marker: 'course.validityYears', description: 'Anni validità' },
      { marker: 'course.category', description: 'Categoria' },
      { marker: 'course.regulation', description: 'Normativa' },
      { marker: 'course.description', description: 'Descrizione' },
      { marker: 'course.objectives', description: 'Obiettivi' },
      { marker: 'course.topics', description: 'Argomenti' }
    ]
  },
  {
    category: 'Programmazione',
    icon: <Calendar className="w-5 h-5" />,
    color: 'amber',
    placeholders: [
      { marker: 'schedule.id', description: 'ID programmazione' },
      { marker: 'schedule.code', description: 'Codice edizione' },
      { marker: 'schedule.startDate', description: 'Data inizio' },
      { marker: 'schedule.endDate', description: 'Data fine' },
      { marker: 'schedule.location', description: 'Sede' },
      { marker: 'schedule.address', description: 'Indirizzo sede' },
      { marker: 'schedule.maxParticipants', description: 'Numero max partecipanti' },
      { marker: 'schedule.sessionsCount', description: 'Numero sessioni' },
      { marker: 'schedule.totalHours', description: 'Ore totali' },
      { marker: 'schedule.status', description: 'Stato' }
    ]
  },
  {
    category: 'Docente',
    icon: <User className="w-5 h-5" />,
    color: 'indigo',
    placeholders: [
      { marker: 'trainer.id', description: 'ID docente' },
      { marker: 'trainer.fullName', description: 'Nome completo docente' },
      { marker: 'trainer.firstName', description: 'Nome docente' },
      { marker: 'trainer.lastName', description: 'Cognome docente' },
      { marker: 'trainer.email', description: 'Email docente' },
      { marker: 'trainer.phone', description: 'Telefono docente' },
      { marker: 'trainer.qualifications', description: 'Qualifiche' },
      { marker: 'trainer.certifications', description: 'Certificazioni' },
      { marker: 'trainer.specialties', description: 'Specializzazioni' }
    ]
  },
  {
    category: 'Sistema',
    icon: <Globe className="w-5 h-5" />,
    color: 'gray',
    placeholders: [
      { marker: 'current.date', description: 'Data corrente' },
      { marker: 'current.year', description: 'Anno corrente' },
      { marker: 'current.time', description: 'Ora corrente' },
      { marker: 'tenant.id', description: 'ID tenant' },
      { marker: 'tenant.name', description: 'Nome ente' },
      { marker: 'tenant.logo', description: 'Logo ente' },
      { marker: 'tenant.address', description: 'Indirizzo ente' },
      { marker: 'tenant.phone', description: 'Telefono ente' },
      { marker: 'tenant.email', description: 'Email ente' },
      { marker: 'tenant.website', description: 'Sito web ente' }
    ]
  },
  {
    category: 'Documento',
    icon: <FileText className="w-5 h-5" />,
    color: 'red',
    placeholders: [
      { marker: 'document.id', description: 'ID documento' },
      { marker: 'document.number', description: 'Numero progressivo' },
      { marker: 'document.type', description: 'Tipo documento' },
      { marker: 'document.date', description: 'Data emissione' }
    ]
  }
];

const COLOR_CLASSES = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    hover: 'hover:bg-blue-100'
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    hover: 'hover:bg-green-100'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    hover: 'hover:bg-purple-100'
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    hover: 'hover:bg-amber-100'
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    hover: 'hover:bg-indigo-100'
  },
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    hover: 'hover:bg-gray-100'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    hover: 'hover:bg-red-100'
  }
};

interface PlaceholderPanelProps {
  onInsert?: (placeholder: string) => void;
}

export const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({ onInsert }) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Persona', 'Corso']));
  const [copiedMarker, setCopiedMarker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleGroup = (category: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedGroups(newExpanded);
  };

  const copyToClipboard = async (marker: string) => {
    const formatted = `{{${marker}}}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedMarker(marker);
      setTimeout(() => setCopiedMarker(null), 2000);
      
      // Notify parent if onInsert callback exists
      if (onInsert) {
        onInsert(formatted);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Filter placeholders by search query
  const filteredGroups = PLACEHOLDER_GROUPS.map(group => ({
    ...group,
    placeholders: group.placeholders.filter(p => 
      searchQuery === '' || 
      p.marker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.placeholders.length > 0);

  const totalPlaceholders = PLACEHOLDER_GROUPS.reduce((sum, g) => sum + g.placeholders.length, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Segnaposto Disponibili</h3>
          <span className="text-sm text-gray-500">{totalPlaceholders} totali</span>
        </div>
        
        {/* Search */}
        <input
          type="text"
          placeholder="Cerca segnaposto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Groups */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.category);
          const colors = COLOR_CLASSES[group.color as keyof typeof COLOR_CLASSES];
          
          return (
            <div key={group.category}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.category)}
                className={`w-full p-3 flex items-center justify-between transition-colors ${colors.hover}`}
              >
                <div className="flex items-center">
                  <span className={`${colors.text} mr-2`}>
                    {group.icon}
                  </span>
                  <span className="font-medium text-gray-900">{group.category}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    ({group.placeholders.length})
                  </span>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} 
                />
              </button>

              {/* Placeholders List */}
              {isExpanded && (
                <div className={`p-3 ${colors.bg} space-y-1`}>
                  {group.placeholders.map((placeholder) => {
                    const isCopied = copiedMarker === placeholder.marker;
                    
                    return (
                      <button
                        key={placeholder.marker}
                        onClick={() => copyToClipboard(placeholder.marker)}
                        className={`w-full p-2 rounded-md border ${colors.border} bg-white hover:bg-opacity-80 transition-colors flex items-center justify-between group`}
                      >
                        <div className="text-left flex-1">
                          <div className="font-mono text-xs text-gray-600">
                            {`{{${placeholder.marker}}}`}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {placeholder.description}
                          </div>
                        </div>
                        <div className={`ml-2 ${colors.text}`}>
                          {isCopied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-blue-50 border-t border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>💡 Suggerimento:</strong> Clicca su un segnaposto per copiarlo negli appunti. 
          I segnaposto vengono sostituiti automaticamente durante la generazione del documento.
        </p>
      </div>
    </div>
  );
};

export default PlaceholderPanel;
