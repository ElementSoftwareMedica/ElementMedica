import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Copy, Move, Maximize2 } from 'lucide-react';

// Definizione marker organizzati per categoria (allineato con backend markerResolver.js)
const MARKER_CATEGORIES = {
  person: {
    label: 'Persona',
    icon: '👤',
    markers: [
      { key: 'person.id', label: 'ID persona', example: '{{person.id}}' },
      { key: 'person.fullName', label: 'Nome completo', example: '{{person.fullName}}' },
      { key: 'person.firstName', label: 'Nome', example: '{{person.firstName}}' },
      { key: 'person.lastName', label: 'Cognome', example: '{{person.lastName}}' },
      { key: 'person.email', label: 'Email', example: '{{person.email}}' },
      { key: 'person.cf', label: 'Codice fiscale', example: '{{person.cf|uppercase}}' },
      { key: 'person.phone', label: 'Telefono', example: '{{person.phone}}' },
      { key: 'person.birthDate', label: 'Data di nascita', example: '{{person.birthDate|date:DD/MM/YYYY}}' },
      { key: 'person.birthPlace', label: 'Luogo di nascita', example: '{{person.birthPlace}}' },
    ]
  },
  personAddress: {
    label: 'Indirizzo Persona',
    icon: '🏠',
    markers: [
      { key: 'person.address.street', label: 'Via', example: '{{person.address.street}}' },
      { key: 'person.address.city', label: 'Città', example: '{{person.address.city}}' },
      { key: 'person.address.province', label: 'Provincia', example: '{{person.address.province}}' },
      { key: 'person.address.postalCode', label: 'CAP', example: '{{person.address.postalCode}}' },
      { key: 'person.address.country', label: 'Paese', example: '{{person.address.country}}' },
      { key: 'person.address.full', label: 'Indirizzo completo', example: '{{person.address.full}}' },
    ]
  },
  course: {
    label: 'Corso',
    icon: '📚',
    markers: [
      { key: 'course.id', label: 'ID corso', example: '{{course.id}}' },
      { key: 'course.title', label: 'Titolo corso', example: '{{course.title}}' },
      { key: 'course.code', label: 'Codice corso', example: '{{course.code}}' },
      { key: 'course.duration', label: 'Durata (ore)', example: '{{course.duration}} ore' },
      { key: 'course.validityYears', label: 'Anni validità', example: '{{course.validityYears}}' },
      { key: 'course.category', label: 'Categoria', example: '{{course.category}}' },
      { key: 'course.regulation', label: 'Normativa', example: '{{course.regulation}}' },
      { key: 'course.description', label: 'Descrizione', example: '{{course.description|truncate:200}}' },
      { key: 'course.objectives', label: 'Obiettivi', example: '{{course.objectives}}' },
      { key: 'course.topics', label: 'Argomenti', example: '{{course.topics}}' },
    ]
  },
  schedule: {
    label: 'Programmazione',
    icon: '📅',
    markers: [
      { key: 'schedule.id', label: 'ID programmazione', example: '{{schedule.id}}' },
      { key: 'schedule.code', label: 'Codice edizione', example: '{{schedule.code}}' },
      { key: 'schedule.startDate', label: 'Data inizio', example: '{{schedule.startDate|date:DD/MM/YYYY}}' },
      { key: 'schedule.endDate', label: 'Data fine', example: '{{schedule.endDate|date:DD/MM/YYYY}}' },
      { key: 'schedule.location', label: 'Sede', example: '{{schedule.location}}' },
      { key: 'schedule.address', label: 'Indirizzo sede', example: '{{schedule.address}}' },
      { key: 'schedule.maxParticipants', label: 'Max partecipanti', example: '{{schedule.maxParticipants}}' },
      { key: 'schedule.sessionsCount', label: 'Numero sessioni', example: '{{schedule.sessionsCount}}' },
      { key: 'schedule.totalHours', label: 'Ore totali', example: '{{schedule.totalHours}} ore' },
      { key: 'schedule.status', label: 'Stato', example: '{{schedule.status}}' },
    ]
  },
  company: {
    label: 'Azienda',
    icon: '🏢',
    markers: [
      { key: 'company.id', label: 'ID azienda', example: '{{company.id}}' },
      { key: 'company.name', label: 'Ragione sociale', example: '{{company.name}}' },
      { key: 'company.vatNumber', label: 'Partita IVA', example: '{{company.vatNumber}}' },
      { key: 'company.fiscalCode', label: 'Codice fiscale', example: '{{company.fiscalCode|uppercase}}' },
      { key: 'company.legalRepresentative', label: 'Rappresentante legale', example: '{{company.legalRepresentative}}' },
      { key: 'company.email', label: 'Email', example: '{{company.email}}' },
      { key: 'company.phone', label: 'Telefono', example: '{{company.phone}}' },
    ]
  },
  companyAddress: {
    label: 'Indirizzo Azienda',
    icon: '🏢',
    markers: [
      { key: 'company.address.street', label: 'Via', example: '{{company.address.street}}' },
      { key: 'company.address.city', label: 'Città', example: '{{company.address.city}}' },
      { key: 'company.address.province', label: 'Provincia', example: '{{company.address.province}}' },
      { key: 'company.address.postalCode', label: 'CAP', example: '{{company.address.postalCode}}' },
      { key: 'company.address.full', label: 'Indirizzo completo', example: '{{company.address.full}}' },
    ]
  },
  trainer: {
    label: 'Docente/Formatore',
    icon: '👨‍🏫',
    markers: [
      { key: 'trainer.id', label: 'ID docente', example: '{{trainer.id}}' },
      { key: 'trainer.fullName', label: 'Nome completo', example: '{{trainer.fullName}}' },
      { key: 'trainer.firstName', label: 'Nome', example: '{{trainer.firstName}}' },
      { key: 'trainer.lastName', label: 'Cognome', example: '{{trainer.lastName}}' },
      { key: 'trainer.email', label: 'Email', example: '{{trainer.email}}' },
      { key: 'trainer.phone', label: 'Telefono', example: '{{trainer.phone}}' },
      { key: 'trainer.qualifications', label: 'Qualifiche', example: '{{trainer.qualifications}}' },
      { key: 'trainer.certifications', label: 'Certificazioni', example: '{{trainer.certifications}}' },
      { key: 'trainer.specialties', label: 'Specializzazioni', example: '{{trainer.specialties}}' },
    ]
  },
  // P65: Categoria firma per tutti i tipi di firmatari
  signatures: {
    label: 'Firme Digitali',
    icon: '✍️',
    markers: [
      { key: 'dipendente.firma', label: 'Firma Dipendente (immagine)', example: '{{{dipendente.firma}}}' },
      { key: 'formatore.firma', label: 'Firma Formatore (immagine)', example: '{{{formatore.firma}}}' },
      { key: 'datore.firma', label: 'Firma Datore Lavoro (immagine)', example: '{{{datore.firma}}}' },
      // P65 Fase 2: Nuovi ruoli sicurezza sul lavoro
      { key: 'rspp.firma', label: 'Firma RSPP (immagine)', example: '{{{rspp.firma}}}' },
      { key: 'mc.firma', label: 'Firma Medico Competente (immagine)', example: '{{{mc.firma}}}' },
      { key: 'rls.firma', label: 'Firma RLS (immagine)', example: '{{{rls.firma}}}' },
      { key: 'partecipante.firma', label: 'Firma Partecipante (immagine)', example: '{{{partecipante.firma}}}' },
      { key: 'operatore.firma', label: 'Firma Operatore (immagine)', example: '{{{operatore.firma}}}' },
      { key: 'cliente.firma', label: 'Firma Cliente (immagine)', example: '{{{cliente.firma}}}' },
    ]
  },
  system: {
    label: 'Sistema',
    icon: '⚙️',
    markers: [
      { key: 'current.date', label: 'Data corrente', example: '{{current.date|date:DD/MM/YYYY}}' },
      { key: 'current.year', label: 'Anno corrente', example: '{{current.year}}' },
      { key: 'current.time', label: 'Ora corrente', example: '{{current.time}}' },
      { key: 'document.id', label: 'ID documento', example: '{{document.id}}' },
      { key: 'document.number', label: 'Numero progressivo', example: '{{document.number}}' },
      { key: 'document.type', label: 'Tipo documento', example: '{{document.type}}' },
      { key: 'document.date', label: 'Data emissione', example: '{{document.date|date:DD/MM/YYYY}}' },
    ]
  },
  tenant: {
    label: 'Ente/Organizzazione',
    icon: '🏛️',
    markers: [
      { key: 'tenant.id', label: 'ID tenant', example: '{{tenant.id}}' },
      { key: 'tenant.name', label: 'Nome ente', example: '{{tenant.name}}' },
      { key: 'tenant.logo', label: 'Logo ente (per img src)', example: '{{tenant.logo}}' },
      { key: 'tenant.logoHtml', label: 'Logo ente (tag HTML)', example: '{{tenant.logoHtml}}' },
      { key: 'tenant.branchLogo', label: 'Logo sede (per img src)', example: '{{tenant.branchLogo}}' },
      { key: 'tenant.branchLogoHtml', label: 'Logo sede (tag HTML)', example: '{{tenant.branchLogoHtml}}' },
      { key: 'tenant.address', label: 'Indirizzo ente', example: '{{tenant.address}}' },
      { key: 'tenant.phone', label: 'Telefono ente', example: '{{tenant.phone}}' },
      { key: 'tenant.email', label: 'Email ente', example: '{{tenant.email}}' },
      { key: 'tenant.website', label: 'Sito web ente', example: '{{tenant.website}}' },
    ]
  }
};

const FORMATTERS = [
  { key: 'date', label: 'Data', description: 'Formatta date (DD/MM/YYYY, YYYY-MM-DD, etc.)', example: '|date:DD/MM/YYYY' },
  { key: 'currency', label: 'Valuta', description: 'Formatta importi (€, $, etc.)', example: '|currency:€' },
  { key: 'uppercase', label: 'Maiuscolo', description: 'Converte in maiuscolo', example: '|uppercase' },
  { key: 'lowercase', label: 'Minuscolo', description: 'Converte in minuscolo', example: '|lowercase' },
  { key: 'capitalize', label: 'Capitalize', description: 'Prima lettera maiuscola', example: '|capitalize' },
  { key: 'capitalizeWords', label: 'Capitalize Words', description: 'Prima lettera di ogni parola maiuscola', example: '|capitalizeWords' },
  { key: 'number', label: 'Numero', description: 'Formatta numeri (1.234,56)', example: '|number:2' },
  { key: 'truncate', label: 'Tronca', description: 'Tronca testo lungo', example: '|truncate:50:...' },
  { key: 'default', label: 'Default', description: 'Valore di fallback se vuoto', example: '|default:N/A' },
];

/**
 * Placeholder visivi — blocchi HTML con dimensioni configurabili
 * per firme, logo e QR code. Vengono inseriti come HTML nel template
 * e rendono visibile l'ingombro nel PDF.
 */
const VISUAL_PLACEHOLDERS = [
  {
    key: 'firma-medico',
    label: 'Firma Medico',
    icon: '✍️',
    description: 'Blocco visivo firma medico con dimensione configurabile',
    defaultWidth: 200,
    defaultHeight: 80,
    getHtml: (w: number, h: number) =>
      `<div class="placeholder-firma" style="width:${w}px;height:${h}px;border:1px dashed #999;display:inline-block;text-align:center;line-height:${h}px;font-size:10px;color:#999;overflow:hidden;"><img src="{{firma.medico}}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Firma medico"></div>`
  },
  {
    key: 'firma-paziente',
    label: 'Firma Paziente',
    icon: '✍️',
    description: 'Blocco visivo firma paziente con dimensione configurabile',
    defaultWidth: 200,
    defaultHeight: 80,
    getHtml: (w: number, h: number) =>
      `<div class="placeholder-firma" style="width:${w}px;height:${h}px;border:1px dashed #999;display:inline-block;text-align:center;line-height:${h}px;font-size:10px;color:#999;overflow:hidden;"><img src="{{firma.paziente}}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Firma paziente"></div>`
  },
  {
    key: 'tenant-logo',
    label: 'Logo Ente',
    icon: '🏛️',
    description: 'Blocco visivo logo ente con dimensione configurabile',
    defaultWidth: 150,
    defaultHeight: 80,
    getHtml: (w: number, h: number) =>
      `<div class="placeholder-logo" style="width:${w}px;height:${h}px;border:1px dashed #999;display:inline-block;text-align:center;line-height:${h}px;font-size:10px;color:#999;overflow:hidden;"><img src="{{tenant.logo}}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Logo ente"></div>`
  },
  {
    key: 'branch-logo',
    label: 'Logo Sede',
    icon: '🏢',
    description: 'Blocco visivo logo sede (branch) con dimensione configurabile',
    defaultWidth: 150,
    defaultHeight: 80,
    getHtml: (w: number, h: number) =>
      `<div class="placeholder-logo-branch" style="width:${w}px;height:${h}px;border:1px dashed #0d9488;display:inline-block;text-align:center;line-height:${h}px;font-size:10px;color:#0d9488;overflow:hidden;"><img src="{{tenant.branchLogo}}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Logo sede"></div>`
  },
  {
    key: 'qr-code',
    label: 'QR Code',
    icon: '📱',
    description: 'Blocco visivo QR code con dimensione configurabile',
    defaultWidth: 100,
    defaultHeight: 100,
    getHtml: (w: number, h: number) =>
      `<div class="placeholder-qrcode" style="width:${w}px;height:${h}px;border:1px dashed #999;display:inline-block;text-align:center;line-height:${h}px;font-size:10px;color:#999;overflow:hidden;"><img src="{{document.qrCode}}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="QR Code"></div>`
  }
];

interface MarkerPickerProps {
  onInsert: (marker: string) => void;
  className?: string;
}

const MarkerPicker: React.FC<MarkerPickerProps> = ({ onInsert, className = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['person']));
  const [showFormatters, setShowFormatters] = useState(false);
  const [showVisualPlaceholders, setShowVisualPlaceholders] = useState(false);
  const [placeholderSizes, setPlaceholderSizes] = useState<Record<string, { w: number; h: number }>>(
    () => Object.fromEntries(VISUAL_PLACEHOLDERS.map(p => [p.key, { w: p.defaultWidth, h: p.defaultHeight }]))
  );

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  const handleInsert = (example: string) => {
    onInsert(example);

    // Visual feedback
    navigator.clipboard.writeText(example);
  };

  // Filter markers based on search
  const filteredCategories = Object.entries(MARKER_CATEGORIES).map(([key, category]) => ({
    key,
    category,
    markers: category.markers.filter(m =>
      searchTerm === '' ||
      m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.key.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(c => c.markers.length > 0);

  return (
    <div className={`bg-white border-l flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold mb-2">Marker Disponibili</h3>
        <p className="text-sm text-gray-600 mb-3">
          Clicca su un marker per inserirlo nel template
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca marker..."
            className="w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Markers List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredCategories.map(({ key, category, markers }) => (
          <div key={key} className="border rounded-md">
            <button
              onClick={() => toggleCategory(key)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span>{category.icon}</span>
                <span className="font-medium">{category.label}</span>
                <span className="text-xs text-gray-500">({markers.length})</span>
              </div>
              {expandedCategories.has(key) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {expandedCategories.has(key) && (
              <div className="border-t">
                {markers.map((marker) => (
                  <button
                    key={marker.key}
                    onClick={() => handleInsert(marker.example)}
                    className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900">
                          {marker.label}
                        </div>
                        <code className="text-xs text-blue-600 break-all">
                          {marker.example}
                        </code>
                      </div>
                      <Copy className="h-4 w-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Formatters Section */}
      <div className="border-t">
        <button
          onClick={() => setShowFormatters(!showFormatters)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <span>🎨</span>
            <span className="font-medium">Formattatori</span>
          </div>
          {showFormatters ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {showFormatters && (
          <div className="border-t max-h-64 overflow-y-auto">
            {FORMATTERS.map((formatter) => (
              <div
                key={formatter.key}
                className="p-3 border-b last:border-b-0 hover:bg-gray-50"
              >
                <div className="font-medium text-sm text-gray-900">
                  {formatter.label}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {formatter.description}
                </div>
                <code className="text-xs text-blue-600 mt-1 block">
                  {formatter.example}
                </code>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visual Placeholders Section */}
      <div className="border-t">
        <button
          onClick={() => setShowVisualPlaceholders(!showVisualPlaceholders)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-teal-600" />
            <span className="font-medium">Placeholder Visivi</span>
            <span className="text-xs text-gray-400">(ridimensionabili)</span>
          </div>
          {showVisualPlaceholders ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {showVisualPlaceholders && (
          <div className="border-t max-h-96 overflow-y-auto">
            <div className="p-3 bg-teal-50 text-xs text-teal-700 border-b">
              <p className="font-medium flex items-center gap-1">
                <Move className="h-3 w-3" />
                Imposta le dimensioni e clicca per inserire
              </p>
              <p className="mt-1 text-teal-600">
                Nel PDF il blocco conterrà l'immagine reale. Modifica larghezza/altezza direttamente nell'HTML dopo l'inserimento.
              </p>
            </div>
            {VISUAL_PLACEHOLDERS.map((placeholder) => {
              const size = placeholderSizes[placeholder.key] || { w: placeholder.defaultWidth, h: placeholder.defaultHeight };
              return (
                <div key={placeholder.key} className="p-3 border-b last:border-b-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{placeholder.icon}</span>
                    <span className="font-medium text-sm text-gray-900">{placeholder.label}</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{placeholder.description}</div>
                  {/* Size inputs */}
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs text-gray-600">L:</label>
                    <input
                      type="number"
                      value={size.w}
                      onChange={(e) => setPlaceholderSizes(prev => ({
                        ...prev,
                        [placeholder.key]: { ...prev[placeholder.key], w: Math.max(30, Number(e.target.value) || 30) }
                      }))}
                      className="w-16 px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                      min={30}
                      max={600}
                    />
                    <span className="text-xs text-gray-400">px</span>
                    <label className="text-xs text-gray-600 ml-2">A:</label>
                    <input
                      type="number"
                      value={size.h}
                      onChange={(e) => setPlaceholderSizes(prev => ({
                        ...prev,
                        [placeholder.key]: { ...prev[placeholder.key], h: Math.max(20, Number(e.target.value) || 20) }
                      }))}
                      className="w-16 px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                      min={20}
                      max={400}
                    />
                    <span className="text-xs text-gray-400">px</span>
                  </div>
                  {/* Preview + insert button */}
                  <div className="flex items-center gap-2">
                    <div
                      className="border border-dashed border-gray-400 bg-gray-50 flex items-center justify-center text-[9px] text-gray-400 flex-shrink-0"
                      style={{
                        width: `${Math.min(size.w, 120)}px`,
                        height: `${Math.min(size.h, 50)}px`
                      }}
                    >
                      {size.w}×{size.h}
                    </div>
                    <button
                      onClick={() => {
                        const html = placeholder.getHtml(size.w, size.h);
                        onInsert(html);
                        navigator.clipboard.writeText(html);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium
                               bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      Inserisci
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="p-4 bg-blue-50 border-t text-xs text-gray-700">
        <p className="font-medium mb-1">💡 Suggerimento:</p>
        <p>I marker vengono sostituiti con dati reali durante la generazione del documento. Puoi combinarli con formattatori per personalizzare il formato.</p>
      </div>
    </div>
  );
};

export default MarkerPicker;
