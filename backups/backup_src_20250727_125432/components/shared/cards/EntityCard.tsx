import React from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';

interface DataItem {
  label: string;
  value: string;
}

interface CardAction {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
}

interface CardDetail {
  icon: React.ReactNode;
  text: string;
}

interface EntityCardProps {
  id?: string;
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  extraInfo?: React.ReactNode;
  statusBadge?: React.ReactNode;
  actionButton?: React.ReactNode;
  bgGradient?: string;
  gradientHeight?: number;
  detailUrl?: string;
  onClick?: () => void;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
  selectionMode?: boolean;
  onViewDetails?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  data?: DataItem[];
  /** Azioni che appaiono nel menu a comparsa */
  actions?: CardAction[];
  /** Righe di dettaglio che appaiono alla base della card */
  details?: CardDetail[];
  /** Colore di sfondo dell'icona */
  iconBgColor?: string;
}

const EntityCard: React.FC<EntityCardProps> = ({
  id,
  title,
  subtitle,
  icon,
  extraInfo,
  statusBadge,
  actionButton,
  bgGradient = 'from-blue-500 to-blue-600',
  gradientHeight = 40,
  detailUrl,
  onClick,
  selected = false,
  onSelect,
  selectionMode = false,
  onViewDetails,
  onEdit,
  onDelete,
  data,
  actions,
  details,
  iconBgColor = 'bg-blue-500',
}) => {
  const [showActions, setShowActions] = React.useState(false);
  
  const toggleActions = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowActions(!showActions);
  };
  
  const cardContent = (
    <div 
      className={`relative bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${
        selected ? 'ring-2 ring-blue-400 shadow-md' : ''
      }`}
    >
      {/* Top gradient (mostrato solo se gradientHeight > 0) */}
      {gradientHeight > 0 && (
        <div 
          className={`w-full bg-gradient-to-r ${bgGradient}`} 
          style={{ height: `${gradientHeight}px` }} 
        />
      )}
      
      {/* Selection checkbox */}
      {selectionMode && onSelect && (
        <div 
          className="absolute top-2 right-2 z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect();
          }}
        >
          <input 
            type="checkbox" 
            checked={selected} 
            onChange={() => {}} 
            className="w-4 h-4 accent-blue-600"
          />
        </div>
      )}
      
      {/* Azioni dropdown */}
      {actions && actions.length > 0 && (
        <div className="absolute top-2 right-2 z-10">
          <button 
            onClick={toggleActions}
            className="p-1 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900 focus:outline-none"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          
          {/* Menu azioni */}
          {showActions && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
              <div className="py-1" role="menu" aria-orientation="vertical">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    className="flex w-full items-center px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      action.onClick(e);
                      setShowActions(false);
                    }}
                  >
                    {action.icon && <span className="mr-3">{action.icon}</span>}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className={`shrink-0 flex items-center justify-center p-2 rounded-md ${iconBgColor} text-white h-10 w-10`}>
              {icon}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-800 truncate">{title}</h3>
            
            {subtitle && (
              <div className="mt-1 text-gray-600 truncate">
                {subtitle}
              </div>
            )}
            
            {extraInfo && (
              <div className="mt-2 text-sm text-gray-600">
                {extraInfo}
              </div>
            )}
            
            {/* Dati con etichette e valori */}
            {data && data.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {data.map((item, index) => (
                  <div key={index} className="flex items-baseline text-sm">
                    <span className="font-medium text-gray-500 w-20">{item.label}:</span>
                    <span className="text-gray-700 truncate">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {statusBadge && (
            <div className="shrink-0 ml-auto">
              {statusBadge}
            </div>
          )}
        </div>
        
        {/* Dettagli */}
        {details && details.length > 0 && (
          <div className="mt-3 space-y-1.5 pt-3 border-t border-gray-100">
            {details.map((detail, index) => (
              <div key={index} className="flex items-center text-sm text-gray-600">
                {detail.icon && <span className="mr-2 text-gray-400">{detail.icon}</span>}
                <span className="truncate">{detail.text}</span>
              </div>
            ))}
          </div>
        )}
        
        {actionButton && (
          <div className="mt-4 flex justify-end">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
  
  if (detailUrl) {
    return (
      <Link 
        to={detailUrl} 
        className="block"
        onClick={(e) => {
          if (selectionMode && onSelect) {
            e.preventDefault();
            onSelect();
          } else if (onClick) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {cardContent}
      </Link>
    );
  }
  
  return (
    <div 
      onClick={onClick} 
      className={onClick ? "cursor-pointer" : ""}
    >
      {cardContent}
    </div>
  );
};

export default EntityCard; 