/**
 * PlaceholderPanel Component
 * Pannello organizzato con tutti i placeholder disponibili divisi per entità
 * Supporta sia template HTML (lowercase nested) che Google Docs/Slides (UPPERCASE flat)
 */

import React, { useState } from 'react';
import { User, Building, GraduationCap, Calendar, Globe, FileText, ChevronDown, Copy, Check, FileCode, FileSpreadsheet } from 'lucide-react';

interface PlaceholderItem {
  marker: string;
  googleMarker?: string; // UPPERCASE version for Google Docs
  description: string;
}

interface PlaceholderGroup {
  category: string;
  icon: React.ReactNode;
  color: string;
  placeholders: PlaceholderItem[];
}

type TemplateFormat = 'html' | 'google';

const PLACEHOLDER_GROUPS: PlaceholderGroup[] = [
  {
    category: 'Persona',
    icon: <User className="w-5 h-5" />,
    color: 'blue',
    placeholders: [
      { marker: 'person.id', description: 'ID persona' },
      { marker: 'person.fullName', googleMarker: 'NOME_COMPLETO', description: 'Nome completo' },
      { marker: 'person.firstName', googleMarker: 'NOME', description: 'Nome' },
      { marker: 'person.lastName', googleMarker: 'COGNOME', description: 'Cognome' },
      { marker: 'person.email', googleMarker: 'EMAIL', description: 'Email' },
      { marker: 'person.cf', googleMarker: 'CODICE_FISCALE', description: 'Codice fiscale' },
      { marker: 'person.phone', googleMarker: 'TELEFONO', description: 'Telefono' },
      { marker: 'person.birthDate', googleMarker: 'DATA_NASCITA', description: 'Data di nascita' },
      { marker: 'person.birthPlace', googleMarker: 'LUOGO_NASCITA', description: 'Luogo di nascita' },
      { marker: 'person.title', googleMarker: 'PROFILO_PROFESSIONALE', description: 'Profilo professionale / Titolo' },
      { marker: 'person.address.street', googleMarker: 'INDIRIZZO_VIA', description: 'Via' },
      { marker: 'person.address.city', googleMarker: 'INDIRIZZO_CITTA', description: 'Città' },
      { marker: 'person.address.province', googleMarker: 'INDIRIZZO_PROVINCIA', description: 'Provincia' },
      { marker: 'person.address.postalCode', googleMarker: 'INDIRIZZO_CAP', description: 'CAP' },
      { marker: 'person.address.country', googleMarker: 'INDIRIZZO_PAESE', description: 'Paese' },
      { marker: 'person.address.full', googleMarker: 'INDIRIZZO_COMPLETO', description: 'Indirizzo completo' }
    ]
  },
  {
    category: 'Azienda',
    icon: <Building className="w-5 h-5" />,
    color: 'green',
    placeholders: [
      { marker: 'company.id', description: 'ID azienda' },
      { marker: 'company.name', googleMarker: 'AZIENDA_RAGIONE_SOCIALE', description: 'Ragione sociale' },
      { marker: 'company.vatNumber', googleMarker: 'AZIENDA_PIVA', description: 'Partita IVA' },
      { marker: 'company.fiscalCode', googleMarker: 'AZIENDA_CF', description: 'Codice fiscale' },
      { marker: 'company.codiceAteco', googleMarker: 'AZIENDA_CODICE_ATECO', description: 'Codice ATECO' },
      { marker: 'company.address.street', googleMarker: 'AZIENDA_VIA', description: 'Via' },
      { marker: 'company.address.city', googleMarker: 'AZIENDA_CITTA', description: 'Città' },
      { marker: 'company.address.province', googleMarker: 'AZIENDA_PROVINCIA', description: 'Provincia' },
      { marker: 'company.address.postalCode', googleMarker: 'AZIENDA_CAP', description: 'CAP' },
      { marker: 'company.address.full', googleMarker: 'AZIENDA_INDIRIZZO', description: 'Indirizzo completo' },
      { marker: 'company.legalRepresentative', googleMarker: 'AZIENDA_RAPPRESENTANTE', description: 'Rappresentante legale' },
      { marker: 'company.email', googleMarker: 'AZIENDA_EMAIL', description: 'Email' },
      { marker: 'company.phone', googleMarker: 'AZIENDA_TELEFONO', description: 'Telefono' }
    ]
  },
  {
    category: 'Corso',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'purple',
    placeholders: [
      { marker: 'course.id', description: 'ID corso' },
      { marker: 'course.title', googleMarker: 'CORSO_TITOLO', description: 'Titolo corso' },
      { marker: 'course.code', googleMarker: 'CORSO_CODICE', description: 'Codice corso' },
      { marker: 'course.duration', googleMarker: 'CORSO_DURATA', description: 'Durata (ore)' },
      { marker: 'course.validityYears', googleMarker: 'CORSO_VALIDITA_ANNI', description: 'Anni validità' },
      { marker: 'course.category', googleMarker: 'CORSO_CATEGORIA', description: 'Categoria' },
      { marker: 'course.regulation', googleMarker: 'CORSO_NORMATIVA', description: 'Normativa' },
      { marker: 'course.description', googleMarker: 'CORSO_DESCRIZIONE', description: 'Descrizione' },
      { marker: 'course.objectives', googleMarker: 'CORSO_OBIETTIVI', description: 'Obiettivi' },
      { marker: 'course.topics', googleMarker: 'CORSO_ARGOMENTI', description: 'Argomenti' },
      { marker: 'course.riskLevel', googleMarker: 'CORSO_LIVELLO_RISCHIO', description: 'Livello di rischio (Alto/Medio/Basso)' },
      { marker: 'course.courseType', googleMarker: 'CORSO_TIPOLOGIA', description: 'Tipologia corso (Primo Corso/Aggiornamento)' }
    ]
  },
  {
    category: 'Programmazione',
    icon: <Calendar className="w-5 h-5" />,
    color: 'amber',
    placeholders: [
      { marker: 'schedule.id', description: 'ID programmazione' },
      { marker: 'schedule.code', googleMarker: 'CODICE_EDIZIONE', description: 'Codice edizione' },
      { marker: 'schedule.startDate', googleMarker: 'DATA_INIZIO', description: 'Data inizio' },
      { marker: 'schedule.endDate', googleMarker: 'DATA_FINE', description: 'Data fine' },
      { marker: 'schedule.location', googleMarker: 'SEDE_CORSO', description: 'Sede' },
      { marker: 'schedule.address', googleMarker: 'INDIRIZZO_SEDE', description: 'Indirizzo sede' },
      { marker: 'schedule.deliveryMode', googleMarker: 'MODALITA_EROGAZIONE', description: 'Modalità erogazione (aula/videoconferenza/e-learning)' },
      { marker: 'schedule.maxParticipants', googleMarker: 'MAX_PARTECIPANTI', description: 'Numero max partecipanti' },
      { marker: 'schedule.sessionsCount', googleMarker: 'NUMERO_SESSIONI', description: 'Numero sessioni' },
      { marker: 'schedule.totalHours', googleMarker: 'ORE_TOTALI', description: 'Ore totali' },
      { marker: 'schedule.status', googleMarker: 'STATO_PROGRAMMAZIONE', description: 'Stato' }
    ]
  },
  {
    category: 'Docente',
    icon: <User className="w-5 h-5" />,
    color: 'indigo',
    placeholders: [
      { marker: 'trainer.id', description: 'ID docente' },
      { marker: 'trainer.fullName', googleMarker: 'FORMATORE_COMPLETO', description: 'Nome completo docente' },
      { marker: 'trainer.firstName', googleMarker: 'NOME_FORMATORE', description: 'Nome docente' },
      { marker: 'trainer.lastName', googleMarker: 'COGNOME_FORMATORE', description: 'Cognome docente' },
      { marker: 'trainer.email', googleMarker: 'EMAIL_FORMATORE', description: 'Email docente' },
      { marker: 'trainer.phone', googleMarker: 'TELEFONO_FORMATORE', description: 'Telefono docente' },
      { marker: 'trainer.totalHours', googleMarker: 'ORE_FORMATORE', description: 'Ore totali del formatore nel corso' },
      { marker: 'trainer.hourlyRate', googleMarker: 'TARIFFA_ORARIA', description: 'Tariffa oraria concordata (€/h)' },
      { marker: 'trainer.expenses', googleMarker: 'RIMBORSO_SPESE', description: 'Rimborso spese in € (numero)' },
      { marker: 'trainer.expensesText', googleMarker: 'RIMBORSO_SPESE_TESTO', description: 'Rimborso spese (testo: importo o "senza alcun rimborso spese")' },
      { marker: 'trainer.totalCompensation', googleMarker: 'COMPENSO_TOTALE', description: 'Compenso totale (tariffa × ore + spese)' },
      { marker: 'trainer.qualifications', googleMarker: 'QUALIFICHE_FORMATORE', description: 'Qualifiche' },
      { marker: 'trainer.certifications', googleMarker: 'CERTIFICAZIONI_FORMATORE', description: 'Certificazioni' },
      { marker: 'trainer.specialties', googleMarker: 'SPECIALIZZAZIONI_FORMATORE', description: 'Specializzazioni' }
    ]
  },
  {
    category: 'Sistema',
    icon: <Globe className="w-5 h-5" />,
    color: 'gray',
    placeholders: [
      { marker: 'current.date', googleMarker: 'DATA_CORRENTE', description: 'Data corrente' },
      { marker: 'current.year', googleMarker: 'ANNO', description: 'Anno corrente' },
      { marker: 'current.time', googleMarker: 'ORA_CORRENTE', description: 'Ora corrente' },
      { marker: 'tenant.id', description: 'ID tenant' },
      { marker: 'tenant.name', googleMarker: 'ENTE_NOME', description: 'Nome ente' },
      { marker: 'tenant.logo', googleMarker: 'ENTE_LOGO', description: 'Logo ente' },
      { marker: 'tenant.address', googleMarker: 'ENTE_INDIRIZZO', description: 'Indirizzo ente' },
      { marker: 'tenant.phone', googleMarker: 'ENTE_TELEFONO', description: 'Telefono ente' },
      { marker: 'tenant.email', googleMarker: 'ENTE_EMAIL', description: 'Email ente' },
      { marker: 'tenant.website', googleMarker: 'ENTE_SITO', description: 'Sito web ente' }
    ]
  },
  {
    category: 'Documento',
    icon: <FileText className="w-5 h-5" />,
    color: 'red',
    placeholders: [
      { marker: 'document.id', description: 'ID documento' },
      { marker: 'document.number', googleMarker: 'NUMERO_PROGRESSIVO', description: 'Numero progressivo' },
      { marker: 'document.type', googleMarker: 'TIPO_DOCUMENTO', description: 'Tipo documento' },
      { marker: 'document.date', googleMarker: 'DATA_GENERAZIONE', description: 'Data emissione' },
      { marker: 'certificate.registrationNumber', googleMarker: 'NUMERO_ATTESTATO', description: 'Numero attestato (ATT/ANNO/000001)' },
      { marker: 'certificate.validUntil', googleMarker: 'DATA_SCADENZA', description: 'Data scadenza certificato' },
      { marker: 'letteraIncarico.number', googleMarker: 'NUMERO_LETTERA_INCARICO', description: 'Numero lettera di incarico' },
      { marker: 'document.qrCode', googleMarker: 'QR_CODE_VERIFICA', description: 'QR code verifica autenticità' },
      { marker: 'document.pageNumber', googleMarker: 'PAGINA_CORRENTE', description: 'Numero pagina corrente (es. 1/3)' },
      { marker: 'document.totalPages', googleMarker: 'PAGINE_TOTALI', description: 'Numero totale pagine' },
      { marker: 'document.currentPage', googleMarker: 'NUMERO_PAGINA', description: 'Numero pagina corrente' }
    ]
  },
  {
    category: 'Tabelle',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    color: 'teal',
    placeholders: [
      { marker: 'table.attendance', googleMarker: 'TABELLA_PRESENZE', description: 'Tabella presenze (sessioni × partecipanti)' },
      { marker: 'table.sessions', googleMarker: 'TABELLA_SESSIONI', description: 'Elenco sessioni del corso' },
      { marker: 'table.participants', googleMarker: 'TABELLA_PARTECIPANTI', description: 'Elenco partecipanti' },
      { marker: 'table.sessionsInfo', googleMarker: 'TABELLA_INFO_SESSIONI', description: 'Informazioni sessioni (Data, Ora, Durata, Docente)' },
      { marker: 'table.attendanceSession1', googleMarker: 'TABELLA_PRESENTI_SESSIONE_1', description: 'Tabella presenti sessione 1 (Cognome, Nome, Firma In, Firma Out)' },
      { marker: 'table.attendanceSession2', googleMarker: 'TABELLA_PRESENTI_SESSIONE_2', description: 'Tabella presenti sessione 2 (Cognome, Nome, Firma In, Firma Out)' },
      { marker: 'table.attendanceSession3', googleMarker: 'TABELLA_PRESENTI_SESSIONE_3', description: 'Tabella presenti sessione 3 (Cognome, Nome, Firma In, Firma Out)' },
      { marker: 'table.attendanceSession4', googleMarker: 'TABELLA_PRESENTI_SESSIONE_4', description: 'Tabella presenti sessione 4 (Cognome, Nome, Firma In, Firma Out)' }
    ]
  },
  {
    category: 'Sessione',
    icon: <Calendar className="w-5 h-5" />,
    color: 'cyan',
    placeholders: [
      { marker: 'session.number', googleMarker: 'SESSIONE_NUMERO', description: 'Numero sessione (1, 2, 3...)' },
      { marker: 'session.date', googleMarker: 'SESSIONE_DATA', description: 'Data della sessione' },
      { marker: 'session.startTime', googleMarker: 'SESSIONE_ORA_INIZIO', description: 'Ora inizio sessione' },
      { marker: 'session.endTime', googleMarker: 'SESSIONE_ORA_FINE', description: 'Ora fine sessione' },
      { marker: 'session.duration', googleMarker: 'SESSIONE_DURATA', description: 'Durata sessione in ore' },
      { marker: 'session.location', googleMarker: 'SESSIONE_SEDE', description: 'Sede della sessione' },
      { marker: 'session.trainer.fullName', googleMarker: 'SESSIONE_FORMATORE', description: 'Nome completo formatore sessione' },
      { marker: 'session.participantCompanies', googleMarker: 'AZIENDE_PARTECIPANTI', description: 'Elenco ragioni sociali aziende partecipanti' },
      { marker: 'table.sessionAttendance', googleMarker: 'TABELLA_PRESENZE_SESSIONE', description: 'Tabella presenze sessione (Cognome, Nome, Firma In, Firma Out)' },
      { marker: 'session.participantsCount', googleMarker: 'SESSIONE_NUM_PARTECIPANTI', description: 'Numero partecipanti sessione' }
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
  },
  teal: {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-700',
    hover: 'hover:bg-teal-100'
  },
  cyan: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    hover: 'hover:bg-cyan-100'
  }
};

interface PlaceholderPanelProps {
  onInsert?: (placeholder: string) => void;
  templateFormat?: TemplateFormat;
}

export const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({ onInsert, templateFormat: initialFormat }) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Persona', 'Corso']));
  const [copiedMarker, setCopiedMarker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [format, setFormat] = useState<TemplateFormat>(initialFormat || 'html');

  const toggleGroup = (category: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedGroups(newExpanded);
  };

  const copyToClipboard = async (marker: string, googleMarker?: string) => {
    // Use the appropriate marker based on format
    const markerToUse = format === 'google' && googleMarker ? googleMarker : marker;
    const formatted = `{{${markerToUse}}}`;
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

        {/* Format Toggle */}
        <div className="flex items-center gap-2 mb-3 p-2 bg-gray-100 rounded-lg">
          <button
            onClick={() => setFormat('html')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${format === 'html'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <FileCode className="w-4 h-4" />
            HTML
          </button>
          <button
            onClick={() => setFormat('google')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${format === 'google'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Google Docs/Slides
          </button>
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
                    const displayMarker = format === 'google' && placeholder.googleMarker
                      ? placeholder.googleMarker
                      : placeholder.marker;
                    const hasGoogleMarker = !!placeholder.googleMarker;

                    return (
                      <button
                        key={placeholder.marker}
                        onClick={() => copyToClipboard(placeholder.marker, placeholder.googleMarker)}
                        className={`w-full p-2 rounded-md border ${colors.border} bg-white hover:bg-opacity-80 transition-colors flex items-center justify-between group ${format === 'google' && !hasGoogleMarker ? 'opacity-50' : ''
                          }`}
                        disabled={format === 'google' && !hasGoogleMarker}
                        title={format === 'google' && !hasGoogleMarker ? 'Non disponibile per Google Docs' : ''}
                      >
                        <div className="text-left flex-1">
                          <div className="font-mono text-xs text-gray-600">
                            {`{{${displayMarker}}}`}
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
      <div className={`p-3 border-t ${format === 'google' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
        <p className={`text-xs ${format === 'google' ? 'text-green-800' : 'text-blue-800'}`}>
          {format === 'google' ? (
            <>
              <strong>📄 Google Docs/Slides:</strong> I placeholder usano formato UPPERCASE (es. {'{{NOME}}'}).
              Nel template Google scrivi esattamente il placeholder come mostrato qui.
            </>
          ) : (
            <>
              <strong>💡 Template HTML:</strong> I placeholder usano formato nested (es. {'{{person.firstName}}'}).
              Clicca su un segnaposto per copiarlo negli appunti.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default PlaceholderPanel;
