import React, { useState, useEffect } from 'react';
import { GDPREntityTemplate } from '../../templates/gdpr-entity-page/GDPREntityTemplate';
import { DataTableColumn } from '../../components/shared/tables/DataTable';
import { Badge, Button } from '../../design-system';
import { 
  FileText, 
  Calendar, 
  Euro, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Send,
  Eye,
  ThumbsUp,
  Receipt,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { usePreventivi } from '../../hooks/finance/usePreventivi';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Preventivo {
  id: string;
  numero: string;
  dataEmissione: string;
  dataScadenza: string;
  stato: 'BOZZA' | 'INVIATO' | 'VISUALIZZATO' | 'ACCETTATO' | 'RIFIUTATO' | 'SCADUTO' | 'ANNULLATO' | 'FATTURATO';
  prezzoTotale: number;
  scontoTotale: number;
  imponibile: number;
  aliquotaIva: number;
  importoIva: number;
  importoFinale: number;
  tipoServizio: string;
  descrizione?: string;
  note?: string;
  personaId: string;
  aziendaId?: string;
  corsoId?: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  
  // Relazioni
  persona?: {
    id: string;
    nome: string;
    cognome: string;
  };
  azienda?: {
    id: string;
    ragioneSociale: string;
  };
  corso?: {
    id: string;
    nome: string;
  };
  sconti?: Array<{
    id: string;
    codiceSconto: string;
    importoSconto: number;
  }>;
}

// Configurazione colonne tabella
const getPreventiviColumns = (): DataTableColumn<Preventivo>[] => [
  {
    key: 'numero',
    label: 'Numero',
    sortable: true,
    renderCell: (preventivo: Preventivo) => (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-400" />
        <span className="font-mono font-semibold text-gray-900">{preventivo.numero}</span>
      </div>
    )
  },
  {
    key: 'persona',
    label: 'Cliente',
    sortable: true,
    renderCell: (preventivo: Preventivo) => (
      <div>
        <div className="font-medium text-gray-900">
          {preventivo.persona 
            ? `${preventivo.persona.nome} ${preventivo.persona.cognome}`
            : 'N/A'
          }
        </div>
        {preventivo.azienda && (
          <div className="text-xs text-gray-500 mt-1">
            {preventivo.azienda.ragioneSociale}
          </div>
        )}
      </div>
    )
  },
  {
    key: 'tipoServizio',
    label: 'Servizio',
    sortable: true,
    renderCell: (preventivo: Preventivo) => (
      <div>
        <div className="font-medium text-gray-900">{preventivo.tipoServizio}</div>
        {preventivo.corso && (
          <div className="text-xs text-gray-500 mt-1">
            {preventivo.corso.nome}
          </div>
        )}
      </div>
    )
  },
  {
    key: 'dataEmissione',
    label: 'Data',
    sortable: true,
    renderCell: (preventivo: Preventivo) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-400" />
        <div className="text-sm">
          <div>{format(new Date(preventivo.dataEmissione), 'dd MMM yyyy', { locale: it })}</div>
          <div className="text-gray-500 text-xs">
            Scad: {format(new Date(preventivo.dataScadenza), 'dd/MM/yy')}
          </div>
        </div>
      </div>
    )
  },
  {
    key: 'importoFinale',
    label: 'Importo',
    sortable: true,
    renderCell: (preventivo: Preventivo) => (
      <div className="flex items-center gap-2">
        <Euro className="h-4 w-4 text-gray-400" />
        <div>
          <div className="font-bold text-gray-900">
            € {preventivo.importoFinale.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">
            IVA {preventivo.aliquotaIva}%: € {preventivo.importoIva.toFixed(2)}
          </div>
        </div>
      </div>
    )
  },
  {
    key: 'scontoTotale',
    label: 'Sconto',
    sortable: true,
    renderCell: (preventivo: Preventivo) => (
      <div className="text-center">
        {preventivo.scontoTotale > 0 ? (
          <div>
            <div className="font-semibold text-green-600">
              - € {preventivo.scontoTotale.toFixed(2)}
            </div>
            {preventivo.sconti && preventivo.sconti.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {preventivo.sconti.length} {preventivo.sconti.length === 1 ? 'codice' : 'codici'}
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </div>
    )
  },
  {
    key: 'stato',
    label: 'Stato',
    sortable: true,
    renderCell: (preventivo: Preventivo) => {
      const statoConfig = {
        BOZZA: { 
          label: 'Bozza', 
          variant: 'secondary' as const, 
          icon: Clock 
        },
        INVIATO: { 
          label: 'Inviato', 
          variant: 'default' as const, 
          icon: Send 
        },
        VISUALIZZATO: { 
          label: 'Visualizzato', 
          variant: 'outline' as const, 
          icon: Eye 
        },
        ACCETTATO: { 
          label: 'Accettato', 
          variant: 'default' as const, 
          icon: ThumbsUp 
        },
        RIFIUTATO: { 
          label: 'Rifiutato', 
          variant: 'destructive' as const, 
          icon: XCircle 
        },
        SCADUTO: { 
          label: 'Scaduto', 
          variant: 'destructive' as const, 
          icon: AlertCircle 
        },
        ANNULLATO: { 
          label: 'Annullato', 
          variant: 'secondary' as const, 
          icon: XCircle 
        },
        FATTURATO: { 
          label: 'Fatturato', 
          variant: 'default' as const, 
          icon: Receipt 
        }
      };
      
      const config = statoConfig[preventivo.stato];
      const Icon = config.icon;
      
      return (
        <Badge variant={config.variant} className="flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      );
    }
  }
];

// Configurazione card per vista griglia
const getPreventivoCardConfig = () => ({
  titleField: 'numero' as keyof Preventivo,
  subtitleField: 'persona' as keyof Preventivo,
  badgeField: 'stato' as keyof Preventivo,
  
  title: (preventivo: Preventivo) => preventivo.numero,
  subtitle: (preventivo: Preventivo) => 
    preventivo.persona 
      ? `${preventivo.persona.nome} ${preventivo.persona.cognome}`
      : 'Cliente non specificato',
  badge: (preventivo: Preventivo) => {
    const statoConfig = {
      BOZZA: { label: 'Bozza', variant: 'secondary' as const },
      INVIATO: { label: 'Inviato', variant: 'default' as const },
      VISUALIZZATO: { label: 'Visualizzato', variant: 'outline' as const },
      ACCETTATO: { label: 'Accettato', variant: 'default' as const },
      RIFIUTATO: { label: 'Rifiutato', variant: 'destructive' as const },
      SCADUTO: { label: 'Scaduto', variant: 'destructive' as const },
      ANNULLATO: { label: 'Annullato', variant: 'secondary' as const },
      FATTURATO: { label: 'Fatturato', variant: 'default' as const }
    };
    const config = statoConfig[preventivo.stato];
    return { text: config.label, variant: config.variant };
  },
  icon: () => <FileText className="h-5 w-5" />,
  fields: [
    {
      label: 'Importo Finale',
      value: (preventivo: Preventivo) => `€ ${preventivo.importoFinale.toFixed(2)}`,
      icon: <Euro className="h-4 w-4" />
    },
    {
      label: 'Data Emissione',
      value: (preventivo: Preventivo) => 
        format(new Date(preventivo.dataEmissione), 'dd/MM/yyyy', { locale: it }),
      icon: <Calendar className="h-4 w-4" />
    },
    {
      label: 'Servizio',
      value: (preventivo: Preventivo) => preventivo.tipoServizio,
      icon: <FileText className="h-4 w-4" />
    },
    {
      label: 'Sconto',
      value: (preventivo: Preventivo) => 
        preventivo.scontoTotale > 0 
          ? `- € ${preventivo.scontoTotale.toFixed(2)}`
          : 'Nessuno',
      icon: <CheckCircle className="h-4 w-4" />
    }
  ],
  description: (preventivo: Preventivo) => 
    preventivo.descrizione || preventivo.corso?.nome
});

const PreventiviPage: React.FC = () => {
  const {
    preventivi,
    loading,
    error,
    pagination,
    fetchPreventivi,
    createPreventivo,
    updatePreventivo,
    deletePreventivo,
    bulkDelete,
    changeStato
  } = usePreventivi();

  const [filters, setFilters] = useState({
    stato: 'TUTTI',
    tipoServizio: 'TUTTI',
    search: ''
  });

  // Fetch iniziale
  useEffect(() => {
    fetchPreventivi();
  }, []);

  // Handlers
  const handleCreate = async (data: Partial<Preventivo>) => {
    try {
      await createPreventivo(data);
      fetchPreventivi();
    } catch (err) {
      console.error('Errore creazione preventivo:', err);
    }
  };

  const handleEdit = async (id: string, data: Partial<Preventivo>) => {
    try {
      await updatePreventivo(id, data);
      fetchPreventivi();
    } catch (err) {
      console.error('Errore modifica preventivo:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePreventivo(id);
      fetchPreventivi();
    } catch (err) {
      console.error('Errore eliminazione preventivo:', err);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await bulkDelete(ids);
      fetchPreventivi();
    } catch (err) {
      console.error('Errore eliminazione multipla:', err);
    }
  };

  // Filtri custom
  const filterOptions = [
    {
      label: 'Tutti gli stati',
      onClick: () => setFilters({ ...filters, stato: 'TUTTI' })
    },
    {
      label: 'Bozze',
      onClick: () => setFilters({ ...filters, stato: 'BOZZA' })
    },
    {
      label: 'Inviati',
      onClick: () => setFilters({ ...filters, stato: 'INVIATO' })
    },
    {
      label: 'Accettati',
      onClick: () => setFilters({ ...filters, stato: 'ACCETTATO' })
    },
    {
      label: 'Fatturati',
      onClick: () => setFilters({ ...filters, stato: 'FATTURATO' })
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Preventivi</h1>
        <p className="text-gray-600 mt-1">Gestisci preventivi e offerte per clienti e corsi</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Caricamento...</p>
          </div>
        ) : (
          <div className="p-4">
            <p className="text-gray-600">
              Trovati {preventivi.length} preventivi
            </p>
            {/* TODO: Implementare tabella/card view */}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreventiviPage;
