import React, { useState, useEffect } from 'react';
import { getLogs, LogsResponse } from '../../services/logs';
import { getUsers } from '../../services/users';
import { ActivityLog, ActivityLogFilters, User } from '../../types';
import { format } from 'date-fns';
import { Search, Filter, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';

const RESOURCE_TYPES = ['users', 'roles', 'courses', 'companies', 'employees', 'trainers', 'schedules', 'auth'];
const ACTION_TYPES = ['create', 'read', 'update', 'delete', 'login'];

const ActivityLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Filtri
  const [filters, setFilters] = useState<ActivityLogFilters>({
    userId: '',
    resource: '',
    action: '',
    startDate: '',
    endDate: ''
  });

  // Carica i log e gli utenti
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Carica gli utenti solo la prima volta
        if (users.length === 0) {
          try {
            const usersData = await getUsers();
            setUsers(usersData || []);
          } catch (err) {
            console.error('Error loading users:', err);
            setUsers([]);
          }
        }

        // Carica i log con i filtri correnti
        console.log('Fetching logs with URL:', API_ENDPOINTS.ACTIVITY_LOGS);
        try {
          const response: LogsResponse = await getLogs(
            filters, 
            pageSize, 
            page * pageSize
          );
          
          console.log('Logs response:', response);
          setLogs(response?.logs || []);
          setTotalLogs(response?.total || 0);
          setError(null);
        } catch (err: any) {
          console.error('Error loading logs:', err);
          setError('Errore nel caricamento dei log: ' + (err.message || ''));
          setLogs([]);
          setTotalLogs(0);
        }
      } catch (err: any) {
        console.error('General error:', err);
        setError(err.message || 'Errore nel caricamento dei dati');
        setLogs([]);
        setTotalLogs(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [page, pageSize, filters, users.length]);

  // Gestisce il cambio dei filtri
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
    // Resetta la pagina quando si cambiano i filtri
    setPage(0);
  };

  // Resetta tutti i filtri
  const resetFilters = () => {
    setFilters({
      userId: '',
      resource: '',
      action: '',
      startDate: '',
      endDate: ''
    });
    setPage(0);
  };

  // Calcola il numero totale di pagine
  const totalPages = totalLogs > 0 ? Math.ceil(totalLogs / pageSize) : 0;

  // Formatta il valore del dettaglio come JSON
  const formatDetails = (details: string | undefined): string => {
    if (!details) return '';
    try {
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch (e) {
      return details;
    }
  };

  // Ottenere il nome dell'utente dal suo ID
  const getUserName = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    if (user) {
      if (user.firstName || user.lastName) {
        return `${user.firstName || ''} ${user.lastName || ''} (@${user.username})`;
      }
      return user.username;
    }
    return userId;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium text-gray-900">Log delle Attività</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtri {showFilters ? '↑' : '↓'}
          </button>
          <button
            onClick={() => {
              setPage(0);
              getLogs(filters, pageSize, 0).then(response => {
                setLogs(response.logs);
                setTotalLogs(response.total);
              });
            }}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showFilters && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utente
              </label>
              <select
                name="userId"
                value={filters.userId || ''}
                onChange={handleFilterChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              >
                <option value="">Tutti gli utenti</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName || user.lastName 
                      ? `${user.firstName || ''} ${user.lastName || ''} (${user.username})`
                      : user.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Risorsa
              </label>
              <select
                name="resource"
                value={filters.resource || ''}
                onChange={handleFilterChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              >
                <option value="">Tutte le risorse</option>
                {RESOURCE_TYPES.map(resource => (
                  <option key={resource} value={resource}>
                    {resource.charAt(0).toUpperCase() + resource.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Azione
              </label>
              <select
                name="action"
                value={filters.action || ''}
                onChange={handleFilterChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              >
                <option value="">Tutte le azioni</option>
                {ACTION_TYPES.map(action => (
                  <option key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data inizio
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate || ''}
                  onChange={handleFilterChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-10 pr-3"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data fine
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate || ''}
                  onChange={handleFilterChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-10 pr-3"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Reimposta filtri
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="p-4 flex justify-center">Caricamento...</div>
      ) : (
        <div className="bg-white overflow-hidden shadow-sm sm:rounded-2xl">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data e ora
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utente
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azione
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risorsa
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dettagli
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!logs || logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Nessun log trovato
                  </td>
                </tr>
              ) : (
                logs?.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.user?.username || getUserName(log.userId)}
                      </div>
                      {log.ipAddress && (
                        <div className="text-xs text-gray-500">
                          {log.ipAddress}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${log.action === 'create' ? 'bg-green-100 text-green-800' : ''}
                        ${log.action === 'update' ? 'bg-blue-100 text-blue-800' : ''}
                        ${log.action === 'delete' ? 'bg-red-100 text-red-800' : ''}
                        ${log.action === 'read' ? 'bg-gray-100 text-gray-800' : ''}
                        ${log.action === 'login' ? 'bg-yellow-100 text-yellow-800' : ''}
                      `}>
                        {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <span className="capitalize">{log.resource}</span>
                        {log.resourceId && (
                          <span className="text-xs ml-1">({log.resourceId.substring(0, 6)}...)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {log.details ? (
                        <details>
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Dettagli</summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                            {formatDetails(log.details)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Paginazione */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Precedente
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Successivo
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrati <span className="font-medium">{logs.length}</span> di <span className="font-medium">{totalLogs}</span> risultati
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Precedente</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Numeri di pagina */}
                  {totalPages > 0 && [...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNumber;
                    
                    if (totalPages <= 5) {
                      // Se ci sono 5 o meno pagine, mostra tutte
                      pageNumber = i;
                    } else if (page < 3) {
                      // Se si è all'inizio, mostra le prime 5 pagine
                      pageNumber = i;
                    } else if (page >= totalPages - 3) {
                      // Se si è alla fine, mostra le ultime 5 pagine
                      pageNumber = totalPages - 5 + i;
                    } else {
                      // Altrimenti mostra 2 pagine prima e 2 dopo quella corrente
                      pageNumber = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setPage(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                          ${page === pageNumber 
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' 
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                      >
                        {pageNumber + 1}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Successivo</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogsTab;