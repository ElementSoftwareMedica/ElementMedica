import React, { ReactNode } from 'react';
import { cn } from '../../../design-system/utils';

interface EntityListLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  sidebarWidth?: number;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
  className?: string;
}

export const EntityListLayout: React.FC<EntityListLayoutProps> = ({
  children,
  sidebar,
  sidebarWidth = 300,
  sidebarCollapsed = false,
  onSidebarToggle,
  className
}) => {
  return (
    <div className={cn('flex h-full', className)}>
      {sidebar && (
        <div 
          className={cn(
            'transition-all duration-300 border-r border-gray-200',
            sidebarCollapsed ? 'w-0 overflow-hidden' : 'flex-shrink-0'
          )}
          style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
        >
          <div className="h-full overflow-y-auto p-4">
            {sidebar}
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default EntityListLayout;