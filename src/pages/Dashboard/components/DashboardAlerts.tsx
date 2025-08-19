import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Certificazioni in scadenza',
    message: '5 dipendenti hanno certificazioni che scadranno nei prossimi 30 giorni',
    timestamp: '1 ora fa'
  },
  {
    id: '2',
    type: 'info',
    title: 'Aggiornamento sistema',
    message: 'Manutenzione programmata per domenica alle 02:00',
    timestamp: '3 ore fa'
  },
  {
    id: '3',
    type: 'success',
    title: 'Backup completato',
    message: 'Backup automatico dei dati completato con successo',
    timestamp: '6 ore fa'
  }
];

const getIcon = (type: Alert['type']) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
};

const getAlertStyle = (type: Alert['type']) => {
  switch (type) {
    case 'warning':
      return 'border-l-yellow-500 bg-yellow-50';
    case 'info':
      return 'border-l-blue-500 bg-blue-50';
    case 'success':
      return 'border-l-green-500 bg-green-50';
    case 'error':
      return 'border-l-red-500 bg-red-50';
    default:
      return 'border-l-gray-500 bg-gray-50';
  }
};

export const DashboardAlerts: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Alerts</h2>
      <div className="space-y-3">
        {mockAlerts.map((alert) => (
          <div 
            key={alert.id} 
            className={`border-l-4 p-3 rounded-r-lg ${getAlertStyle(alert.type)}`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-2">{alert.timestamp}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};