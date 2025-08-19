import React from 'react';
import { Clock, Building2} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'employee' | 'company' | 'course' | 'schedule';
  title: string;
  description: string;
  timestamp: string;
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'employee',
    title: 'Nuovo dipendente aggiunto',
    description: 'Mario Rossi è stato aggiunto al sistema',
    timestamp: '2 ore fa'
  },
  {
    id: '2',
    type: 'course',
    title: 'Corso completato',
    description: 'Sicurezza sul lavoro - Base completato da 15 dipendenti',
    timestamp: '4 ore fa'
  },
  {
    id: '3',
    type: 'company',
    title: 'Nuova azienda registrata',
    description: 'TechCorp S.r.l. è stata aggiunta al sistema',
    timestamp: '1 giorno fa'
  },
  {
    id: '4',
    type: 'schedule',
    title: 'Pianificazione creata',
    description: 'Nuovo corso programmato per la prossima settimana',
    timestamp: '2 giorni fa'
  }
];

const getIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'employee':
      return <User className="h-4 w-4 text-blue-500" />;
    case 'company':
      return <Building2 className="h-4 w-4 text-green-500" />;
    case 'course':
      return <GraduationCap className="h-4 w-4 text-purple-500" />;
    case 'schedule':
      return <Clock className="h-4 w-4 text-orange-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

export const RecentActivity: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
      <div className="space-y-4">
        {mockActivities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{activity.title}</p>
              <p className="text-sm text-gray-500">{activity.description}</p>
              <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};