import React from 'react';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  trendDirection: 'up' | 'down' | 'neutral';
  to?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendDirection,
  to
}) => {
  const CardInner = (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {trend && (
          <p
            className={`text-sm ${
              trendDirection === 'up'
                ? 'text-green-600'
                : trendDirection === 'down'
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {trend}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{icon}</div>
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label={`Vai a ${title}`}
        className="bg-white rounded-2xl shadow p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 block cursor-pointer"
      >
        {CardInner}
      </Link>
    );
  }

  return <div className="bg-white rounded-2xl shadow p-6">{CardInner}</div>;
};