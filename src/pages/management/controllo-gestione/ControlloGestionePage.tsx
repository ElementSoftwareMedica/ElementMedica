import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Building2, Download, LineChart, Stethoscope, TrendingUp } from 'lucide-react';
import { apiGet } from '../../../services/api';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { useTenantFilter } from '../../../context/TenantFilterContext';

interface FilterOption {
  id: string;
  label: string;
  piva?: string | null;
}

interface PivotRow {
  companyTenantProfileId: string | null;
  azienda: string;
  medicoId: string | null;
  medico: string;
  prestazioneId: string;
  prestazione: string;
  codice?: string | null;
  count: number;
  importoNetto: number;
  importoLordo: number;
}

interface ChartItem {
  id: string;
  label: string;
  count: number;
  importoNetto: number;
}

interface ControlloGestioneResponse {
  success: boolean;
  data: {
    totals: { prestazioni: number; importoNetto: number; aziende: number; medici: number };
    rows: PivotRow[];
    charts: { byPrestazione: ChartItem[]; byMedico: ChartItem[]; byAzienda: ChartItem[]; trend: ChartItem[] };
    filters: { medici: FilterOption[]; aziende: FilterOption[] };
  };
}

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

const currency = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
const StatIcon = ({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) => (
  <Icon className="h-4 w-4 text-violet-500" />
);

function ToggleList({
  label,
  placeholder,
  options,
  selected,
  onChange,
  icon: Icon
}: {
  label: string;
  placeholder: string;
  options: FilterOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedLabels = selected
    .map(id => options.find(option => option.id === id)?.label)
    .filter(Boolean);
  const filteredOptions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(option => option.label.toLowerCase().includes(needle) || option.piva?.toLowerCase().includes(needle));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-violet-500" />
          <span className="truncate">
            {selectedLabels.length ? selectedLabels.join(', ') : placeholder}
          </span>
        </span>
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
          {selected.length || 'Tutti'}
        </span>
      </button>
      {open && (
        <div className="absolute z-[80] mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca..."
            className="mb-2 h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          />
          <div className="mb-1 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => onChange(options.map(option => option.id))}
              className="rounded-md px-2 py-1.5 text-left text-xs font-semibold text-violet-700 hover:bg-violet-50"
            >
              Seleziona tutti
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-md px-2 py-1.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Deseleziona tutti
            </button>
          </div>
          {filteredOptions.map(option => {
            const checked = selected.includes(option.id);
            return (
              <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? selected.filter(id => id !== option.id) : [...selected, option.id])}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{option.label}</span>
              </label>
            );
          })}
          {filteredOptions.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-slate-400">Nessun risultato</p>
          )}
        </div>
      )}
    </div>
  );
}

function MiniChart({ title, items }: { title: string; items: ChartItem[] }) {
  const max = Math.max(...items.map(item => item.count), 1);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Nessun dato nel periodo</p>
        ) : items.map(item => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-slate-600">{item.label}</span>
              <span className="font-semibold text-slate-900">{item.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(6, (item.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const typeOptions = [
  { id: 'ALL', label: 'Tutto' },
  { id: 'PRIVATE', label: 'Prestazioni private' },
  { id: 'MDL', label: 'Medicina del lavoro' }
];

function Segmented({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${value === option.id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const ControlloGestionePage: React.FC = () => {
  const [dataDa, setDataDa] = useState(firstDay);
  const [dataA, setDataA] = useState(lastDay);
  const [medicoIds, setMedicoIds] = useState<string[]>([]);
  const [companyTenantProfileIds, setCompanyTenantProfileIds] = useState<string[]>([]);
  const [tipoPrestazioni, setTipoPrestazioni] = useState('ALL');
  const [includeMovimentiAziendali, setIncludeMovimentiAziendali] = useState(false);
  const [trendGranularity, setTrendGranularity] = useState('settimana');
  const { getTenantFilterParams, tenantFilterKey, isReady: tenantFilterReady } = useTenantFilter();

  const queryParams = useMemo(() => ({
    dataDa,
    dataA,
    trendGranularity,
    ...(tipoPrestazioni !== 'ALL' ? { tipoPrestazioni } : {}),
    ...(includeMovimentiAziendali ? { includeMovimentiAziendali: 'true' } : {}),
    ...(medicoIds.length ? { medicoIds: medicoIds.join(',') } : {}),
    ...(companyTenantProfileIds.length ? { companyTenantProfileIds: companyTenantProfileIds.join(',') } : {}),
    ...(getTenantFilterParams().tenantIds?.length ? { tenantIds: getTenantFilterParams().tenantIds!.join(',') } : {}),
    ...(getTenantFilterParams().allTenants ? { allTenants: 'true' } : {})
  }), [companyTenantProfileIds, dataA, dataDa, getTenantFilterParams, includeMovimentiAziendali, medicoIds, tenantFilterKey, tipoPrestazioni, trendGranularity]);

  const { data, isLoading } = useQuery({
    queryKey: ['controllo-gestione-prestazioni', queryParams],
    queryFn: () => apiGet<ControlloGestioneResponse>('/api/v1/management/controllo-gestione/prestazioni', queryParams).then(res => res.data),
    enabled: tenantFilterReady,
    staleTime: 60_000
  });

  const rows = data?.rows || [];
  const totals = data?.totals || { prestazioni: 0, importoNetto: 0, aziende: 0, medici: 0 };
  const filters = data?.filters || { medici: [], aziende: [] };
  const charts = data?.charts || { byPrestazione: [], byMedico: [], byAzienda: [], trend: [] };

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <LineChart className="h-6 w-6 text-violet-600" />
            Controllo di Gestione
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Prestazioni eseguite per medico competente, azienda, periodo e tipologia.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Esporta
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid items-end gap-3 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">Da</label>
            <DatePickerElegante value={dataDa} onChange={(date) => setDataDa(date ? date.toISOString().split('T')[0] : '')} theme="violet" size="sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">A</label>
            <DatePickerElegante value={dataA} onChange={(date) => setDataA(date ? date.toISOString().split('T')[0] : '')} theme="violet" size="sm" />
          </div>
          <ToggleList label="Medici" placeholder="Tutti i medici" options={filters.medici} selected={medicoIds} onChange={setMedicoIds} icon={Stethoscope} />
          <ToggleList label="Aziende" placeholder="Tutte le aziende" options={filters.aziende} selected={companyTenantProfileIds} onChange={setCompanyTenantProfileIds} icon={Building2} />
        </div>
        <div className="mt-3 grid items-end gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">Ambito</label>
            <Segmented value={tipoPrestazioni} onChange={setTipoPrestazioni} options={typeOptions} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">Andamento</label>
            <Segmented
              value={trendGranularity}
              onChange={setTrendGranularity}
              options={[
                { id: 'giorno', label: 'Giorno' },
                { id: 'settimana', label: 'Settimana' },
                { id: 'mese', label: 'Mese' }
              ]}
            />
          </div>
          <label className="flex h-10 cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm">
            <span>Includi corsi, nomine e movimenti aziendali</span>
            <input
              type="checkbox"
              checked={includeMovimentiAziendali}
              onChange={(event) => setIncludeMovimentiAziendali(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'Prestazioni', value: totals.prestazioni, icon: BarChart3 },
          { label: 'Valore netto', value: currency.format(totals.importoNetto), icon: TrendingUp },
          { label: 'Aziende', value: totals.aziende, icon: Building2 },
          { label: 'Medici', value: totals.medici, icon: Stethoscope }
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-slate-400">{stat.label}</p>
              <StatIcon icon={stat.icon} />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <MiniChart title={`Andamento per ${trendGranularity}`} items={charts.trend} />
        <MiniChart title="Prestazioni più eseguite" items={charts.byPrestazione} />
        <MiniChart title="Per medico" items={charts.byMedico} />
        <MiniChart title="Per azienda" items={charts.byAzienda} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Tabella pivot prestazioni</h2>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Azienda</th>
                <th className="px-4 py-3 text-left">Medico</th>
                <th className="px-4 py-3 text-left">Prestazione</th>
                <th className="px-4 py-3 text-right">Qtà</th>
                <th className="px-4 py-3 text-right">Netto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Caricamento dati...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nessuna prestazione trovata nel periodo.</td></tr>
              ) : rows.map(row => (
                <tr key={`${row.companyTenantProfileId}-${row.medicoId}-${row.prestazioneId}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.azienda}</td>
                  <td className="px-4 py-3 text-slate-600">{row.medico}</td>
                  <td className="px-4 py-3 text-slate-600">{row.prestazione}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{row.count}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{currency.format(row.importoNetto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ControlloGestionePage;
