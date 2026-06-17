import React, { useState } from 'react';
import { Download, Eye, FileText, ShieldCheck, ChevronDown, PenTool } from 'lucide-react';
import { getToken } from '../../services/auth';
import { clinicaApi, type GiudizioIdoneita } from '../../services/clinicaApi';
import GiudizioFirmaModal from '../../pages/clinica/mdl/components/GiudizioFirmaModal';

interface GiudizioDoc {
  id: string;
  tipoGiudizio?: string;
  stato?: string;
  dataEmissione?: string | null;
  person?: { firstName?: string; lastName?: string } | null;
  firmaLavoratore?: { createdAt: string } | null;
}

interface DocumentItem {
  id: string;
  type: string;
  category: 'sicurezza' | 'mdl' | 'amministrazione';
  title: string;
  subtitle?: string;
  documentUrl?: string | null;
  documentName?: string | null;
  /** Per i giudizi: id giudizio + destinatario per apertura PDF on-demand */
  giudizioId?: string;
  /** Giudizio non ancora firmato dal lavoratore → mostra azione Firma */
  giudizioNeedsFirma?: boolean;
  giudizioRef?: GiudizioDoc;
}

interface CompanyDocumentsSummaryCardProps {
  dvrs?: Array<{
    id: string;
    documentoUrl?: string | null;
    documentoNome?: string | null;
    site?: { siteName?: string | null } | null;
    dataEsecuzione?: string | null;
  }>;
  sopralluoghi?: Array<{
    id: string;
    documentoUrl?: string | null;
    documentoNome?: string | null;
    site?: { siteName?: string | null } | null;
    dataEsecuzione?: string | null;
  }>;
  tariffario?: {
    id: string;
    nome?: string | null;
    codice?: string | null;
  } | null;
  nomine?: Array<{
    id: string;
    tipoRuolo?: string | null;
    persona?: { fullName?: string | null } | null;
    dataInizio?: string | null;
  }>;
  mdlDocuments?: Array<{
    filename: string;
    originalName: string;
    url: string;
    createdAt?: string;
    signedOnline?: boolean;
    documentType?: string;
  }>;
  giudizi?: GiudizioDoc[];
  preventivi?: Array<{
    id: string;
    numero?: string | null;
    numeroProgressivo?: number | null;
    stato?: string;
    tipoServizio?: string;
    dataEmissione?: string | null;
  }>;
  /** Ricarica i dati dopo una firma */
  onRefresh?: () => void;
}

const GIUDIZIO_LABELS: Record<string, string> = {
  IDONEO: 'Idoneo',
  IDONEO_CON_PRESCRIZIONI: 'Idoneo con prescrizioni',
  IDONEO_CON_LIMITAZIONI: 'Idoneo con limitazioni',
  IDONEO_CON_LIMITAZIONI_PRESCRIZIONI: 'Idoneo con limitazioni e prescrizioni',
  NON_IDONEO_TEMPORANEO: 'Temporaneamente non idoneo',
  NON_IDONEO_PERMANENTE: 'Non idoneo',
};

const roleLabel = (role?: string | null) => {
  const labels: Record<string, string> = {
    MEDICO_COMPETENTE: 'Nomina Medico Competente',
    MEDICO_COMPETENTE_COORDINATO: 'Nomina Medico Competente Coordinato',
    RSPP: 'Nomina RSPP',
    RLS: 'Nomina RLS',
  };
  return role ? labels[role] || role.replace(/_/g, ' ') : 'Nomina';
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('it-IT');
};

const CATEGORIES: Array<{ key: DocumentItem['category']; title: string; description: string }> = [
  { key: 'sicurezza', title: 'Sicurezza e nomine', description: 'DVR, sopralluoghi, nomine MC/RSPP/RLS e documenti collegati.' },
  { key: 'mdl', title: 'Medicina del lavoro e INAIL', description: 'Tariffari MDL, Allegati 3B, relazioni annuali e documenti INAIL disponibili.' },
  { key: 'amministrazione', title: 'Amministrazione', description: 'Preventivi, fatture e altri PDF amministrativi associati all\'azienda.' },
];

const CompanyDocumentsSummaryCard: React.FC<CompanyDocumentsSummaryCardProps> = ({
  dvrs = [],
  sopralluoghi = [],
  tariffario,
  nomine = [],
  mdlDocuments = [],
  giudizi = [],
  preventivi = [],
  onRefresh,
}) => {
  const [firmaGiudizio, setFirmaGiudizio] = useState<GiudizioDoc | null>(null);
  const documents: DocumentItem[] = [
    ...dvrs.map(dvr => ({
      id: `dvr-${dvr.id}`,
      type: 'DVR',
      category: 'sicurezza' as const,
      title: dvr.documentoNome || 'Documento DVR',
      subtitle: [dvr.site?.siteName, formatDate(dvr.dataEsecuzione)].filter(Boolean).join(' · '),
      documentUrl: dvr.documentoUrl,
      documentName: dvr.documentoNome,
    })),
    ...sopralluoghi.map(sopralluogo => ({
      id: `sopralluogo-${sopralluogo.id}`,
      type: 'Sopralluogo',
      category: 'sicurezza' as const,
      title: sopralluogo.documentoNome || 'Verbale sopralluogo',
      subtitle: [sopralluogo.site?.siteName, formatDate(sopralluogo.dataEsecuzione)].filter(Boolean).join(' · '),
      documentUrl: sopralluogo.documentoUrl,
      documentName: sopralluogo.documentoNome,
    })),
    ...(tariffario ? [{
      id: `tariffario-${tariffario.id}`,
      type: 'Tariffario',
      category: 'mdl' as const,
      title: tariffario.nome || 'Tariffario MDL',
      subtitle: tariffario.codice || '',
      documentUrl: null,
      documentName: null,
    }] : []),
    ...nomine.map(nomina => ({
      id: `nomina-${nomina.id}`,
      type: 'Nomina',
      category: 'sicurezza' as const,
      title: roleLabel(nomina.tipoRuolo),
      subtitle: [nomina.persona?.fullName, formatDate(nomina.dataInizio)].filter(Boolean).join(' · '),
      documentUrl: null,
      documentName: null,
    })),
    ...mdlDocuments.map(document => ({
      id: `mdl-${document.filename}`,
      type: document.documentType === 'tariffario' ? 'Tariffario firmato' : 'Nomina firmata',
      category: document.documentType === 'tariffario' ? 'mdl' as const : 'sicurezza' as const,
      title: document.originalName || document.filename,
      subtitle: [
        document.signedOnline ? 'Firma online' : 'Upload cartaceo',
        formatDate(document.createdAt)
      ].filter(Boolean).join(' · '),
      documentUrl: document.url,
      documentName: document.originalName || document.filename,
    })),
    ...giudizi.map(g => ({
      id: `giudizio-${g.id}`,
      type: 'Giudizio idoneità',
      category: 'mdl' as const,
      title: `${g.person?.lastName || ''} ${g.person?.firstName || ''}`.trim() || 'Giudizio di idoneità',
      subtitle: [
        GIUDIZIO_LABELS[g.tipoGiudizio || ''] || g.tipoGiudizio,
        formatDate(g.dataEmissione),
        g.firmaLavoratore ? 'Firmato' : 'Da firmare'
      ].filter(Boolean).join(' · '),
      documentUrl: null,
      documentName: null,
      giudizioId: g.id,
      giudizioNeedsFirma: !g.firmaLavoratore,
      giudizioRef: g,
    })),
    ...preventivi.map(p => ({
      id: `preventivo-${p.id}`,
      type: 'Preventivo',
      category: 'amministrazione' as const,
      title: `Preventivo ${p.numero || (p.numeroProgressivo != null ? `#${p.numeroProgressivo}` : p.id.slice(0, 8))}`,
      subtitle: [p.tipoServizio?.replace(/_/g, ' '), p.stato, formatDate(p.dataEmissione)].filter(Boolean).join(' · '),
      documentUrl: `/api/v1/preventivi/${p.id}/pdf`,
      documentName: `preventivo_${p.numero || p.id.slice(0, 8)}.pdf`,
    })),
  ];

  // Sezioni collassabili (tutte aperte di default)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleCategory = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const openDocument = async (document: DocumentItem, download = false) => {
    if (!document.documentUrl) return;
    const token = getToken();
    const response = await fetch(document.documentUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    if (download) {
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.documentName || 'documento.pdf';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const openGiudizioPdf = async (giudizioId: string) => {
    try {
      const blob = await clinicaApi.giudiziIdoneita.fetchPdfBlob(giudizioId, 'lavoratore');
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) setTimeout(() => URL.revokeObjectURL(url), 60000);
      else URL.revokeObjectURL(url);
    } catch {
      /* errore apertura PDF giudizio */
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-600" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Documenti aziendali</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Archivio PDF diviso per categoria documentale.</p>
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {documents.length}
        </span>
      </div>
      <div className="space-y-5 p-5">
        {CATEGORIES.map(category => {
          const categoryDocuments = documents.filter(document => document.category === category.key);
          const isCollapsed = collapsed[category.key];
          return (
            <section key={category.key} className="rounded-2xl border border-gray-100 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/20">
              <button
                type="button"
                onClick={() => toggleCategory(category.key)}
                className="flex w-full flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 text-left dark:border-gray-700"
                aria-expanded={!isCollapsed}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{category.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{category.description}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300">
                  {categoryDocuments.length}
                </span>
              </button>
              <div className={`divide-y divide-gray-100 dark:divide-gray-700/60 ${isCollapsed ? 'hidden' : ''}`}>
                {categoryDocuments.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-gray-400 dark:text-gray-500">
                    Nessun PDF disponibile in questa categoria.
                  </div>
                ) : categoryDocuments.map(document => (
                  <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-teal-50 p-2 text-teal-600 dark:bg-teal-900/20 dark:text-teal-300">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{document.title}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {document.type}
                          </span>
                        </div>
                        {document.subtitle && (
                          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{document.subtitle}</p>
                        )}
                      </div>
                    </div>
                    {document.giudizioId ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openGiudizioPdf(document.giudizioId!)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-900/20"
                          title="Apri PDF giudizio"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {document.giudizioNeedsFirma && (
                          <button
                            type="button"
                            onClick={() => setFirmaGiudizio(document.giudizioRef!)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300"
                            title="Firma del lavoratore"
                          >
                            <PenTool className="h-3.5 w-3.5" />
                            Firma
                          </button>
                        )}
                      </div>
                    ) : document.documentUrl ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openDocument(document)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-900/20"
                          title="Quick look"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDocument(document, true)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-700"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                        PDF non caricato
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {firmaGiudizio && (
        <GiudizioFirmaModal
          isOpen={!!firmaGiudizio}
          giudizio={firmaGiudizio as unknown as GiudizioIdoneita}
          onClose={() => setFirmaGiudizio(null)}
          onSuccess={() => { setFirmaGiudizio(null); onRefresh?.(); }}
        />
      )}
    </div>
  );
};

export default CompanyDocumentsSummaryCard;
