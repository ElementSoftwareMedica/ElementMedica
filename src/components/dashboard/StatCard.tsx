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
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{value}</h3>
        </div>
        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl">{icon}</div>
      </div>
      <div className="flex items-center mt-4">
        {trendDirection === 'up' ? (
          <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400 mr-1" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400 mr-1" />
        )}
        <span className={`text-xs font-medium ${trendColor || (trendDirection === 'up' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400')}`}>
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow dark:shadow-gray-900/20 p-6 transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/30 hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 block cursor-pointer border border-gray-200 dark:border-gray-700"
      >
        {CardContent}
      </Link>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow dark:shadow-gray-900/20 p-6 transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/30 hover:translate-y-[-2px] border border-gray-200 dark:border-gray-700">
      {CardContent}
    </div>
  );
};

export default StatCard;