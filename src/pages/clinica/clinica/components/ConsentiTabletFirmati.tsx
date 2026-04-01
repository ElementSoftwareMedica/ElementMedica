import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSignature, ChevronDown, ChevronUp, Printer, AlertCircle, Clock } from 'lucide-react';
import { apiGet } from '../../../../services/api';
import { formatDate } from '../../../../utils/dateUtils';
import { formatMedicoName } from '../../../../utils/textFormatters';

// ============================================
// TYPES
// ============================================

interface MedicoInfo {
    firstName: string;
    lastName: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null;
}

interface FirmaToken {
    id: string;
    token: string;
    documentiDaMostrare: string[];
    firmatoAt: string;
    firmatoConsensi: string[];
    firmatoPazienteNome: string | null;
    firmaImmagine: string;
    expiresAt: string;
    createdAt: string;
    appuntamento: {
        id: string;
        dataOra: string;
        prestazione: { nome: string } | null;
        medico: MedicoInfo | null;
    };
}

const DOC_LABELS: Record<string, string> = {
    gdpr: 'Privacy GDPR',
    sanitari: 'Consenso Trattamento Dati Sanitari',
    prestazione: 'Consenso Informato Prestazione',
    chirurgico: 'Consenso Intervento Chirurgico',
};

// ============================================
// SUB-COMPONENTS
// ============================================

interface FirmaRowProps {
    firma: FirmaToken;
    isOpen: boolean;
    onToggle: () => void;
}

const FirmaRow: React.FC<FirmaRowProps> = ({ firma, isOpen, onToggle }) => {
    const handlePrint = useCallback(() => {
        const docsHtml = firma.firmatoConsensi.map(d => `<li>${DOC_LABELS[d] || d}</li>`).join('');
        const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>Consenso firmato - ${firma.firmatoPazienteNome || ''}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .sub { color: #555; font-size: 13px; margin-bottom: 24px; }
    .section { margin-bottom: 20px; }
    .label { font-size: 12px; color: #777; text-transform: uppercase; letter-spacing: 0.05em; }
    .value { font-size: 15px; margin-top: 2px; }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 4px; }
    .firma-img { border: 1px solid #ccc; border-radius: 4px; max-width: 320px; margin-top: 8px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>Consenso Informato Firmato</h1>
  <div class="sub">Generato il ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
  <div class="section">
    <div class="label">Paziente</div>
    <div class="value">${firma.firmatoPazienteNome || '—'}</div>
  </div>
  <div class="section">
    <div class="label">Data firma</div>
    <div class="value">${new Date(firma.firmatoAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
  </div>
  ${firma.appuntamento?.prestazione?.nome ? `
  <div class="section">
    <div class="label">Prestazione</div>
    <div class="value">${firma.appuntamento.prestazione.nome}</div>
  </div>` : ''}
  ${firma.appuntamento?.medico ? `
  <div class="section">
    <div class="label">Medico</div>
    <div class="value">${formatMedicoName(firma.appuntamento.medico)}</div>
  </div>` : ''}
  <div class="section">
    <div class="label">Documenti firmati</div>
    <ul>${docsHtml}</ul>
  </div>
  <div class="section">
    <div class="label">Firma autografa</div>
    ${firma.firmaImmagine ? `<img class="firma-img" src="${firma.firmaImmagine}" alt="Firma" />` : '<div class="value">Non disponibile</div>'}
  </div>
</body>
</html>`;

        const w = window.open('', '_blank', 'width=700,height=900');
        if (!w) return;
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
    }, [firma]);

    const prestazione = firma.appuntamento?.prestazione?.nome || '—';
    const medico = firma.appuntamento?.medico
        ? formatMedicoName(firma.appuntamento.medico)
        : '—';

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header row */}
            <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    <FileSignature className="h-4 w-4 text-teal-600 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-gray-800">{prestazione}</p>
                        <p className="text-xs text-gray-500">
                            {formatDate(firma.firmatoAt)} · {medico}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5">
                        {firma.firmatoConsensi.length} doc
                    </span>
                    {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                </div>
            </button>

            {/* Expanded detail */}
            {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                            <p className="text-xs text-gray-500">Firmato da</p>
                            <p className="font-medium text-gray-800">{firma.firmatoPazienteNome || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Prestazione</p>
                            <p className="font-medium text-gray-800">{prestazione}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Medico</p>
                            <p className="font-medium text-gray-800">{medico}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 mb-1">Documenti firmati</p>
                        <div className="flex flex-wrap gap-1.5">
                            {firma.firmatoConsensi.map(d => (
                                <span
                                    key={d}
                                    className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-700"
                                >
                                    {DOC_LABELS[d] || d}
                                </span>
                            ))}
                        </div>
                    </div>

                    {firma.firmaImmagine && (
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Firma autografa</p>
                            <img
                                src={firma.firmaImmagine}
                                alt="Firma"
                                className="border border-gray-200 rounded bg-white max-w-[240px] h-16 object-contain"
                            />
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-800 bg-white border border-teal-200 hover:border-teal-300 rounded-lg px-3 py-1.5 transition-colors"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            Stampa certificato
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

interface ConsentiTabletFirmatiProps {
    pazienteId: string;
}

const ConsentiTabletFirmati: React.FC<ConsentiTabletFirmatiProps> = ({ pazienteId }) => {
    const [openId, setOpenId] = React.useState<string | null>(null);

    const { data, isLoading, isError } = useQuery<FirmaToken[]>({
        queryKey: ['consensi-firmati', pazienteId],
        queryFn: async () => {
            const res = await apiGet<{ success: boolean; data: FirmaToken[] }>(
                `/api/v1/clinica/pazienti/${pazienteId}/consensi-firmati`
            );
            return res.data ?? [];
        },
        enabled: !!pazienteId,
        staleTime: 60_000,
    });

    const handleToggle = useCallback((id: string) => {
        setOpenId(prev => (prev === id ? null : id));
    }, []);

    return (
        <div className="mt-8 space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-teal-600" />
                Firme Elettroniche da Tablet
            </h4>

            {isLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                    <Clock className="h-4 w-4 animate-spin" />
                    Caricamento...
                </div>
            )}

            {isError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Errore nel caricamento delle firme.
                </div>
            )}

            {!isLoading && !isError && (!data || data.length === 0) && (
                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-4 border border-gray-200">
                    Nessun consenso firmato tramite tablet per questo paziente.
                </div>
            )}

            {data && data.length > 0 && (
                <div className="space-y-2">
                    {data.map(firma => (
                        <FirmaRow
                            key={firma.id}
                            firma={firma}
                            isOpen={openId === firma.id}
                            onToggle={() => handleToggle(firma.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ConsentiTabletFirmati;
