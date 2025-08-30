import React from 'react';

interface EntityProfileHeaderProps {
  avatarUrl?: string;
  initials?: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  extraInfo?: React.ReactNode;
  statusBadge?: React.ReactNode;
  actionButton?: React.ReactNode;
  bgGradient?: string; // Tailwind class for background
}

const EntityProfileHeader: React.FC<EntityProfileHeaderProps> = ({
  avatarUrl,
  initials,
  icon,
  title,
  subtitle,
  extraInfo,
  statusBadge,
  actionButton,
  bgGradient = 'from-blue-500 to-blue-600',
}) => {
  return (
    <div className="relative">
      {/* Blue background */}
      <div className={`bg-gradient-to-r ${bgGradient} h-28 rounded-t-lg`} />
      {/* White card overlay */}
      <div className="relative bg-white rounded-lg shadow-lg mx-4 -mt-12 p-6 flex items-center">
        {/* Avatar or Icon */}
        <div className="h-24 w-24 rounded-full bg-white p-1 shadow -mt-12 border-4 border-white flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover rounded-full" />
          ) : icon ? (
            <span className="text-4xl text-blue-500">{icon}</span>
          ) : initials ? (
            <span className="text-2xl font-bold text-blue-600">{initials}</span>
          ) : null}
        </div>
        {/* Name and details */}
        <div className="ml-6 flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          {subtitle && <div className="flex items-center mt-1 gap-2 flex-wrap text-gray-600">{subtitle}</div>}
          {extraInfo && <div className="text-xs text-gray-500 mt-1">{extraInfo}</div>}
        </div>
        {/* Status badge */}
        {statusBadge && <div className="ml-4">{statusBadge}</div>}
        {/* Action Button */}
        {actionButton && <div className="ml-4">{actionButton}</div>}
      </div>
    </div>
  );
};

export default EntityProfileHeader; 