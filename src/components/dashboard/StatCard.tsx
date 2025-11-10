import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  trendDirection: 'up' | 'down';
  trendColor?: string;
  to?: string; // optional navigation link
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  trendDirection,
  trendColor,
  to
}) => {
  const CardContent = (
    <>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        </div>
        <div className="p-2 bg-gray-50 rounded-xl">{icon}</div>
      </div>
      <div className="flex items-center mt-4">
        {trendDirection === 'up' ? (
          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
        )}
        <span className={`text-xs font-medium ${trendColor || (trendDirection === 'up' ? 'text-green-500' : 'text-red-500')}`}>
          {trend} from last month
        </span>
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label={`Vai a ${title}`}
        className="bg-white rounded-2xl shadow p-6 transition-all duration-200 hover:shadow-md hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 block cursor-pointer"
      >
        {CardContent}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 transition-all duration-200 hover:shadow-md hover:translate-y-[-2px]">
      {CardContent}
    </div>
  );
};

export default StatCard;