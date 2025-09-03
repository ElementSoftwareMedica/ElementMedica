import React, { useEffect, useMemo, useState } from 'react';
import { getLogs } from '../../services/logs';
import type { ActivityLog } from '../../types';
import { RefreshCw } from 'lucide-react';

const ActivityLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getLogs({ resource: 'public', action: 'cta_click' }, 100, 0);
      setLogs(resp.logs || []);
    } catch (e) {
      setError('Impossibile caricare i log delle attività.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLogs = useMemo(() => {
    if (!search) return logs;
    const q = search.toLowerCase();
    return logs.filter(l => {
      const fields = [l.resource, l.action, l.user?.username, l.user?.email, l.details, l.ipAddress].filter(Boolean).join(' ').toLowerCase();
      return fields.includes(q);
    });
  }, [logs, search]);

  const parseDetails = (details?: string): Record<string, unknown> => {
    if (!details) return {};
    try {
      return JSON.parse(details);
    } catch {
      return { message: details };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-medium text-gray-900">Log degli Eventi CTA</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Cerca per utente, azione, dettagli..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50"
            title="Ricarica"
          >
            <RefreshCw className="w-4 h-4" />
            Aggiorna
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading && (
          <div className="p-6 text-gray-600">Caricamento in corso…</div>
        )}
        {error && (
          <div className="p-6 text-red-600">{error}</div>
        )}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azione</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dettagli</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      Nessun evento trovato.
                    </td>
                  </tr>
                )}
                {filteredLogs.map((log) => {
                  const d = parseDetails(log.details);
                  const label = (d?.label as string) || (d?.message as string) || '';
                  const href = (d?.href as string) || '';
                  const section = (d?.section as string) || '';
                  const title = (d?.title as string) || '';

                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{log.user?.username || log.user?.email || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{log.resource} · {log.action}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="space-y-0.5">
                          {label && <div><span className="text-gray-500">Label:</span> {label}</div>}
                          {title && <div><span className="text-gray-500">Titolo:</span> {title}</div>}
                          {section && <div><span className="text-gray-500">Sezione:</span> {section}</div>}
                          {href && <div><span className="text-gray-500">URL:</span> {href}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{log.ipAddress || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogsTab;