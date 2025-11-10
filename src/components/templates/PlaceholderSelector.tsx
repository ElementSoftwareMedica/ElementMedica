/**
 * Placeholder Selector Component
 * Displays available placeholders matching backend MarkerResolver definitions
 * 
 * IMPORTANT: Placeholders must match backend/services/markerResolver.js
 * Format: {{category.property}} or {{category.property|formatter:args}}
 */

import React, { useState } from 'react';
import { Search, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface Placeholder {
  key: string;
  label: string;
  description: string;
  example?: string;
}

interface PlaceholderCategory {
  name: string;
  icon: string;
  placeholders: Placeholder[];
}

// ✅ Placeholder definitions matching backend/services/markerResolver.js
const PLACEHOLDER_CATEGORIES: PlaceholderCategory[] = [
  {
    name: 'Persona (Partecipante/Dipendente)',
    icon: '👤',
    placeholders: [
      { key: 'person.fullName', label: 'Nome Completo', description: 'Nome e cognome completo', example: 'Mario Rossi' },
      { key: 'person.firstName', label: 'Nome', description: 'Nome della persona', example: 'Mario' },
      { key: 'person.lastName', label: 'Cognome', description: 'Cognome della persona', example: 'Rossi' },
      { key: 'person.email', label: 'Email', description: 'Indirizzo email', example: 'mario.rossi@example.com' },
      { key: 'person.cf', label: 'Codice Fiscale', description: 'Codice fiscale', example: 'RSSMRA80A01H501U' },
      { key: 'person.phone', label: 'Telefono', description: 'Numero di telefono', example: '333 1234567' },
      { key: 'person.birthDate', label: 'Data di Nascita', description: 'Data di nascita (usa |date:DD/MM/YYYY per formattare)', example: '01/01/1980' },
      { key: 'person.birthPlace', label: 'Luogo di Nascita', description: 'Luogo di nascita', example: 'Milano' },
      { key: 'person.address.street', label: 'Via', description: 'Via e numero civico', example: 'Via Roma 123' },
      { key: 'person.address.city', label: 'Città', description: 'Città di residenza', example: 'Milano' },
      { key: 'person.address.province', label: 'Provincia', description: 'Sigla provincia', example: 'MI' },
      { key: 'person.address.postalCode', label: 'CAP', description: 'Codice postale', example: '20100' },
      { key: 'person.address.full', label: 'Indirizzo Completo', description: 'Indirizzo completo', example: 'Via Roma 123, 20100 Milano (MI)' },
    ]
  },
  {
    name: 'Corso',
    icon: '📚',
    placeholders: [
      { key: 'course.title', label: 'Titolo Corso', description: 'Titolo del corso', example: 'Sicurezza sul Lavoro' },
      { key: 'course.code', label: 'Codice Corso', description: 'Codice identificativo', example: 'SSL-001' },
      { key: 'course.duration', label: 'Durata (ore)', description: 'Durata in ore', example: '16' },
      { key: 'course.validityYears', label: 'Anni Validità', description: 'Anni di validità', example: '5' },
      { key: 'course.category', label: 'Categoria', description: 'Categoria del corso', example: 'Sicurezza' },
      { key: 'course.regulation', label: 'Normativa', description: 'Riferimento normativo', example: 'D.Lgs. 81/2008' },
      { key: 'course.description', label: 'Descrizione', description: 'Descrizione del corso', example: 'Corso di formazione...' },
      { key: 'course.objectives', label: 'Obiettivi', description: 'Obiettivi formativi', example: 'Fornire competenze...' },
      { key: 'course.topics', label: 'Argomenti', description: 'Argomenti trattati', example: 'Rischi, Prevenzione...' },
    ]
  },
  {
    name: 'Programmazione (Schedule)',
    icon: '📅',
    placeholders: [
      { key: 'schedule.startDate', label: 'Data Inizio', description: 'Data di inizio (usa |date:DD/MM/YYYY)', example: '01/02/2025' },
      { key: 'schedule.endDate', label: 'Data Fine', description: 'Data di fine (usa |date:DD/MM/YYYY)', example: '15/02/2025' },
      { key: 'schedule.location', label: 'Sede', description: 'Luogo del corso', example: 'Milano' },
      { key: 'schedule.address', label: 'Indirizzo Sede', description: 'Indirizzo completo sede', example: 'Via Verdi 10, Milano' },
      { key: 'schedule.maxParticipants', label: 'Max Partecipanti', description: 'Numero massimo partecipanti', example: '15' },
      { key: 'schedule.sessionsCount', label: 'Numero Sessioni', description: 'Numero di sessioni', example: '4' },
      { key: 'schedule.totalHours', label: 'Ore Totali', description: 'Ore totali programmate', example: '16' },
      { key: 'schedule.status', label: 'Stato', description: 'Stato della programmazione', example: 'Completato' },
      { key: 'schedule.code', label: 'Codice Edizione', description: 'Codice dell\'edizione', example: 'SSL-001-2025-01' },
    ]
  },
  {
    name: 'Azienda',
    icon: '🏢',
    placeholders: [
      { key: 'company.name', label: 'Ragione Sociale', description: 'Nome dell\'azienda', example: 'Acme SRL' },
      { key: 'company.vatNumber', label: 'Partita IVA', description: 'Partita IVA', example: '12345678901' },
      { key: 'company.fiscalCode', label: 'Codice Fiscale', description: 'Codice fiscale', example: '12345678901' },
      { key: 'company.address.street', label: 'Via', description: 'Via e numero civico', example: 'Via Milano 50' },
      { key: 'company.address.city', label: 'Città', description: 'Città', example: 'Roma' },
      { key: 'company.address.province', label: 'Provincia', description: 'Sigla provincia', example: 'RM' },
      { key: 'company.address.postalCode', label: 'CAP', description: 'Codice postale', example: '00100' },
      { key: 'company.address.full', label: 'Indirizzo Completo', description: 'Indirizzo completo', example: 'Via Milano 50, 00100 Roma (RM)' },
      { key: 'company.legalRepresentative', label: 'Legale Rappresentante', description: 'Nome rappresentante legale', example: 'Giulia Bianchi' },
      { key: 'company.email', label: 'Email', description: 'Email aziendale', example: 'info@acme.it' },
      { key: 'company.phone', label: 'Telefono', description: 'Telefono aziendale', example: '06 12345678' },
    ]
  },
  {
    name: 'Docente/Formatore',
    icon: '👨‍🏫',
    placeholders: [
      { key: 'trainer.fullName', label: 'Nome Completo', description: 'Nome completo docente', example: 'Prof. Giovanni Verdi' },
      { key: 'trainer.firstName', label: 'Nome', description: 'Nome del docente', example: 'Giovanni' },
      { key: 'trainer.lastName', label: 'Cognome', description: 'Cognome del docente', example: 'Verdi' },
      { key: 'trainer.email', label: 'Email', description: 'Email del docente', example: 'g.verdi@example.com' },
      { key: 'trainer.phone', label: 'Telefono', description: 'Telefono del docente', example: '340 1234567' },
      { key: 'trainer.qualifications', label: 'Qualifiche', description: 'Qualifiche professionali', example: 'Ingegnere, Formatore certificato' },
      { key: 'trainer.certifications', label: 'Certificazioni', description: 'Certificazioni possedute', example: 'ISO 9001, RSPP' },
      { key: 'trainer.specialties', label: 'Specializzazioni', description: 'Aree di specializzazione', example: 'Sicurezza, Ambiente' },
    ]
  },
  {
    name: 'Documento',
    icon: '📄',
    placeholders: [
      { key: 'document.number', label: 'Numero Documento', description: 'Numero progressivo', example: '001/2025' },
      { key: 'document.type', label: 'Tipo Documento', description: 'Tipologia documento', example: 'Attestato' },
      { key: 'document.date', label: 'Data Emissione', description: 'Data di emissione (usa |date:DD/MM/YYYY)', example: '06/11/2025' },
      { key: 'document.id', label: 'ID Documento', description: 'Identificativo univoco', example: 'DOC-2025-001' },
    ]
  },
  {
    name: 'Sistema/Tenant',
    icon: '⚙️',
    placeholders: [
      { key: 'current.date', label: 'Data Corrente', description: 'Data odierna (usa |date:DD/MM/YYYY)', example: '06/11/2025' },
      { key: 'current.year', label: 'Anno Corrente', description: 'Anno corrente', example: '2025' },
      { key: 'current.time', label: 'Ora Corrente', description: 'Ora attuale', example: '14:30' },
      { key: 'tenant.name', label: 'Nome Ente', description: 'Nome dell\'ente/organizzazione', example: 'ElementMedica' },
      { key: 'tenant.logo', label: 'Logo Ente', description: 'Logo dell\'ente', example: '[LOGO]' },
      { key: 'tenant.address', label: 'Indirizzo Ente', description: 'Indirizzo dell\'ente', example: 'Via Roma 1, Milano' },
      { key: 'tenant.phone', label: 'Telefono Ente', description: 'Telefono dell\'ente', example: '02 12345678' },
      { key: 'tenant.email', label: 'Email Ente', description: 'Email dell\'ente', example: 'info@ente.it' },
      { key: 'tenant.website', label: 'Sito Web Ente', description: 'Sito web dell\'ente', example: 'www.ente.it' },
    ]
  }
];

interface PlaceholderSelectorProps {
  onSelect: (placeholder: string) => void;
  selectedPlaceholders?: string[];
}

const PlaceholderSelector: React.FC<PlaceholderSelectorProps> = ({
  onSelect,
  selectedPlaceholders = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(PLACEHOLDER_CATEGORIES.map(cat => cat.name))
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCopy = async (placeholder: string) => {
    const formattedPlaceholder = `{{${placeholder}}}`;
    try {
      await navigator.clipboard.writeText(formattedPlaceholder);
      setCopiedKey(placeholder);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleInsert = (placeholder: string) => {
    const formattedPlaceholder = `{{${placeholder}}}`;
    onSelect(formattedPlaceholder);
  };

  // Filter placeholders based on search
  const filteredCategories = PLACEHOLDER_CATEGORIES.map(category => ({
    ...category,
    placeholders: category.placeholders.filter(p =>
      searchTerm === '' ||
      p.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.placeholders.length > 0);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm max-h-[800px] overflow-y-auto">
      {/* Search bar */}
      <div className="sticky top-0 bg-white border-b border-slate-200 p-3 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca segnaposto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="divide-y divide-slate-200">
        {filteredCategories.map((category) => (
          <div key={category.name}>
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category.name)}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{category.icon}</span>
                <span className="font-medium text-slate-700">{category.name}</span>
                <span className="text-xs text-slate-500">
                  ({category.placeholders.length})
                </span>
              </div>
              {expandedCategories.has(category.name) ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {/* Placeholders list */}
            {expandedCategories.has(category.name) && (
              <div className="px-3 pb-3 space-y-2">
                {category.placeholders.map((placeholder) => (
                  <div
                    key={placeholder.key}
                    className="border border-slate-200 rounded-md p-3 hover:border-blue-400 hover:shadow-sm transition-all bg-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                            {'{{'}{placeholder.key}{'}}'}
                          </code>
                        </div>
                        <div className="text-sm font-medium text-slate-800 mb-1">
                          {placeholder.label}
                        </div>
                        <div className="text-xs text-slate-600 mb-1">
                          {placeholder.description}
                        </div>
                        {placeholder.example && (
                          <div className="text-xs text-slate-500 italic">
                            Es: {placeholder.example}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        {/* Insert button */}
                        <button
                          onClick={() => handleInsert(placeholder.key)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Inserisci nell'editor"
                        >
                          <span className="text-lg">➕</span>
                        </button>

                        {/* Copy button */}
                        <button
                          onClick={() => handleCopy(placeholder.key)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          title="Copia negli appunti"
                        >
                          {copiedKey === placeholder.key ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="p-8 text-center text-slate-500">
          <p>Nessun segnaposto trovato per "{searchTerm}"</p>
        </div>
      )}

      {/* Helper text */}
      <div className="border-t border-slate-200 p-3 bg-slate-50">
        <div className="text-xs text-slate-600 space-y-1">
          <p className="font-medium">💡 Formattatori disponibili:</p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li><code className="bg-slate-200 px-1">|date:DD/MM/YYYY</code> - Formatta date</li>
            <li><code className="bg-slate-200 px-1">|uppercase</code> - Maiuscolo</li>
            <li><code className="bg-slate-200 px-1">|lowercase</code> - Minuscolo</li>
            <li><code className="bg-slate-200 px-1">|currency:€</code> - Valuta</li>
          </ul>
          <p className="mt-2">
            Esempio: <code className="bg-slate-200 px-1">{'{{'} person.birthDate|date:DD/MM/YYYY {'}}'}</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderSelector;
