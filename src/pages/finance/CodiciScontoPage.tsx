import React, { useState, useEffect } from 'react';
import { GDPREntityTemplate } from '../../templates/gdpr-entity-page/GDPREntityTemplate';
import { DataTableColumn } from '../../components/shared/tables/DataTable';
import { Badge, Button } from '../../design-system';
import { Percent, Calendar, Tag, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useCodiciSconto } from '../../hooks/finance/useCodiciSconto';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface CodiceSconto {
  id: string;
  codice: string;
  descrizione?: string;
  tipo: 'PERCENTUALE' | 'VALORE_ASSOLUTO';
  valore: number;
  valoreMinimo?: number;
  valoreMax?: number;
  dataInizio: string;
  dataFine: string;
  stato: 'ATTIVO' | 'DISABILITATO' | 'SCADUTO' | 'ESAURITO';
  utilizzoMax?: number;
  utilizzoCorrente: number;
  utilizzoMaxPerUtente?: number;
  cumulabile: boolean;
  tipoServizio?: string;
  tipoCliente?: string;
  corsoId?: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  
  // Campi relazione (opzionali)
  corso?: {
    id: string;
    nome: string;
  };
}

// Configurazione colonne tabella
const getCodiciScontoColumns = (): DataTableColumn<CodiceSconto>[] => [
  {
    key: 'codice',
    label: 'Codice',
    sortable: true,
    renderCell: (codice: CodiceSconto) => (
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-gray-400" />
        <span className="font-mono font-semibold text-gray-900">{codice.codice}</span>
      </div>
    )
  },
  {
    key: 'descrizione',
    label: 'Descrizione',
    sortable: true,
    renderCell: (codice: CodiceSconto) => (
      <div>
        <div className="font-medium text-gray-900">{codice.descrizione || 'N/A'}</div>
        {codice.corso && (
          <div className="text-xs text-gray-500 mt-1">
            Corso: {codice.corso.nome}
          </div>
        )}
      </div>
    )
  },
  {
    key: 'tipo',
    label: 'Tipo Sconto',
    sortable: true,
    renderCell: (codice: CodiceSconto) => (
      <div className="flex items-center gap-2">
        <Percent className="h-4 w-4 text-gray-400" />
        <div>
          <div className="font-semibold text-gray-900">
            {codice.tipo === 'PERCENTUALE' 
              ? `${codice.valore}%` 
              : `€ ${codice.valore.toFixed(2)}`
            }
          </div>
          <div className="text-xs text-gray-500">
            {codice.tipo === 'PERCENTUALE' ? 'Percentuale' : 'Valore Fisso'}
          </div>
        </div>
      </div>
    )
  },
  {
    key: 'dataInizio',
    label: 'Validità',
    sortable: true,
    renderCell: (codice: CodiceSconto) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-400" />
        <div className="text-sm">
          <div>{format(new Date(codice.dataInizio), 'dd MMM yyyy', { locale: it })}</div>
          <div className="text-gray-500">
            → {format(new Date(codice.dataFine), 'dd MMM yyyy', { locale: it })}
          </div>
        </div>
      </div>
    )
  },
  {
    key: 'utilizzoCorrente',
    label: 'Utilizzo',
    sortable: true,
    renderCell: (codice: CodiceSconto) => {
      const percentualeUtilizzo = codice.utilizzoMax 
        ? Math.round((codice.utilizzoCorrente / codice.utilizzoMax) * 100)
        : 0;
      
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {codice.utilizzoCorrente} {codice.utilizzoMax ? `/ ${codice.utilizzoMax}` : ''}
            </div>
            {codice.utilizzoMax && (
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div 
                  className={`h-1.5 rounded-full ${
                    percentualeUtilizzo >= 90 ? 'bg-red-500' :
                    percentualeUtilizzo >= 70 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(percentualeUtilizzo, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      );
    }
  },
  {
    key: 'stato',
    label: 'Stato',
    sortable: true,
    renderCell: (codice: CodiceSconto) => {
      const statoConfig = {
        ATTIVO: { 
          label: 'Attivo', 
          variant: 'default' as const, 
          icon: CheckCircle 
        },
        DISABILITATO: { 
          label: 'Disabilitato', 
          variant: 'secondary' as const, 
          icon: XCircle 
        },
        SCADUTO: { 
          label: 'Scaduto', 
          variant: 'destructive' as const, 
          icon: AlertCircle 
        },
        ESAURITO: { 
          label: 'Esaurito', 
          variant: 'outline' as const, 
          icon: Clock 
        }
      };
      
      const config = statoConfig[codice.stato];
      const Icon = config.icon;
      
      return (
        <Badge variant={config.variant} className="flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      );
    }
  },
  {
    key: 'cumulabile',
    label: 'Cumulabile',
    sortable: false,
    renderCell: (codice: CodiceSconto) => (
      <div className="flex items-center justify-center">
        {codice.cumulabile ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-gray-400" />
        )}
      </div>
    )
  }
];

// Configurazione card per vista griglia
const getCodiceCardConfig = () => ({
  titleField: 'codice' as keyof CodiceSconto,
  subtitleField: 'descrizione' as keyof CodiceSconto,
  badgeField: 'stato' as keyof CodiceSconto,
  
  title: (codice: CodiceSconto) => codice.codice,
  subtitle: (codice: CodiceSconto) => codice.descrizione || 'Nessuna descrizione',
  badge: (codice: CodiceSconto) => {
    const statoConfig = {
      ATTIVO: { label: 'Attivo', variant: 'default' as const },
      DISABILITATO: { label: 'Disabilitato', variant: 'secondary' as const },
      SCADUTO: { label: 'Scaduto', variant: 'destructive' as const },
      ESAURITO: { label: 'Esaurito', variant: 'outline' as const }
    };
    const config = statoConfig[codice.stato];
    return { text: config.label, variant: config.variant };
  },
  icon: () => <Tag className="h-5 w-5" />,
  fields: [
    {
      label: 'Sconto',
      value: (codice: CodiceSconto) => 
        codice.tipo === 'PERCENTUALE' 
          ? `${codice.valore}%` 
          : `€ ${codice.valore.toFixed(2)}`,
      icon: <Percent className="h-4 w-4" />
    },
    {
      label: 'Validità',
      value: (codice: CodiceSconto) => 
        `${format(new Date(codice.dataInizio), 'dd/MM/yy')} - ${format(new Date(codice.dataFine), 'dd/MM/yy')}`,
      icon: <Calendar className="h-4 w-4" />
    },
    {
      label: 'Utilizzi',
      value: (codice: CodiceSconto) => 
        codice.utilizzoMax 
          ? `${codice.utilizzoCorrente} / ${codice.utilizzoMax}`
          : `${codice.utilizzoCorrente} (illimitati)`,
      icon: <Tag className="h-4 w-4" />
    }
  ],
  description: (codice: CodiceSconto) => 
    codice.corso ? `Corso: ${codice.corso.nome}` : undefined
});

const CodiciScontoPage: React.FC = () => {
  const {
    codici,
    loading,
    error,
    pagination,
    fetchCodici,
    createCodice,
    updateCodice,
    deleteCodice,
    bulkDelete
  } = useCodiciSconto();

  const [filters, setFilters] = useState({
    stato: 'TUTTI',
    tipo: 'TUTTI',
    search: ''
  });

  // Fetch iniziale
  useEffect(() => {
    fetchCodici();
  }, []);

  // Handlers
  const handleCreate = async (data: Partial<CodiceSconto>) => {
    try {
      await createCodice(data);
      fetchCodici(); // Refresh lista
    } catch (err) {
      console.error('Errore creazione codice:', err);
    }
  };

  const handleEdit = async (id: string, data: Partial<CodiceSconto>) => {
    try {
      await updateCodice(id, data);
      fetchCodici();
    } catch (err) {
      console.error('Errore modifica codice:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCodice(id);
      fetchCodici();
    } catch (err) {
      console.error('Errore eliminazione codice:', err);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await bulkDelete(ids);
      fetchCodici();
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
      label: 'Attivi',
      onClick: () => setFilters({ ...filters, stato: 'ATTIVO' })
    },
    {
      label: 'Scaduti',
      onClick: () => setFilters({ ...filters, stato: 'SCADUTO' })
    },
    {
      label: 'Disabilitati',
      onClick: () => setFilters({ ...filters, stato: 'DISABILITATO' })
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Codici Sconto</h1>
        <p className="text-gray-600 mt-1">Gestisci i codici sconto per preventivi e ordini</p>
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
              Trovati {codici.length} codici sconto
            </p>
            {/* TODO: Implementare tabella/card view */}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodiciScontoPage;
