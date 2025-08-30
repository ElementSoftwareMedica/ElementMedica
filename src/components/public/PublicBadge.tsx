import React from 'react';
import { getBadgeClasses, getStatusClasses } from '../../utils/colorUtils';

interface PublicBadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'purple' | 'green' | 'red' | 'yellow' | 'gray' | 'indigo' | 'pink';
  status?: 'active' | 'inactive' | 'pending' | 'error' | 'info' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Badge component per il frontend pubblico con colori ad alto contrasto
 * Risolve i problemi di accessibilità con combinazioni blu su blu
 */
export const PublicBadge: React.FC<PublicBadgeProps> = ({
  children,
  variant = 'blue',
  status,
  size = 'sm',
  className = ''
}) => {
  // Se è specificato uno status, usa le classi status, altrimenti usa variant
  const badgeClasses = status 
    ? getStatusClasses(status, size)
    : getBadgeClasses(variant, size);

  return (
    <span className={`${badgeClasses} ${className}`}>
      {children}
    </span>
  );
};

export default PublicBadge;