import React from 'react';
import { 
  Building2,
  Calendar,
  Users,
  GraduationCap
} from 'lucide-react';
import { StatCard } from './StatCard';
import { DashboardCounters } from '../hooks/useDashboardData';

interface DashboardStatsProps {
  counters: DashboardCounters;
  futureCoursesCount: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  counters,
  futureCoursesCount
}) => {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      <StatCard 
        title="Totale Aziende" 
        value={counters.companies.toString()} 
        icon={<Building2 className="h-7 w-7 text-blue-500" />} 
        trend=""
        trendDirection="up"
      />
      <StatCard 
        title="Totale Dipendenti" 
        value={counters.employees.toString()} 
        icon={<Users className="h-7 w-7 text-green-500" />} 
        trend=""
        trendDirection="up"
      />
      <StatCard 
        title="Corsi Programmati Futuri" 
        value={futureCoursesCount.toString()}
        icon={<GraduationCap className="h-7 w-7 text-amber-500" />} 
        trend=""
        trendDirection="up"
      />
      <StatCard 
        title="Corsi in Scadenza" 
        value="0" 
        icon={<Calendar className="h-7 w-7 text-red-500" />} 
        trend=""
        trendDirection="up"
      />
    </div>
  );
};