import React, { ReactNode } from 'react';

interface EntityFormGridProps {
  /** Contenuto del form (campi) */
  children: ReactNode;
  /** Numero di colonne su desktop */
  columns?: 1 | 2 | 3 | 4;
  /** Spaziatura tra colonne e righe */
  gap?: 'sm' | 'md' | 'lg';
  /** Classi CSS aggiuntive */
  className?: string;
}

/**
 * Grid layout responsivo per i campi del form
 */
const EntityFormGrid: React.FC<EntityFormGridProps> = ({
  children,
  columns = 2,
  gap = 'md',
  className = '',
}) => {
  // Classi per il numero di colonne
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  // Classi per lo spazio tra le colonne
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-5',
    lg: 'gap-6',
  };

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Componente per campi che occupano più colonne
 */
export const EntityFormFullWidthField: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`col-span-full ${className}`}>
      {children}
    </div>
  );
};

/**
 * Componente per creare una sezione nel form con titolo - stile elegante
 */
export const EntityFormSection: React.FC<{
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}> = ({ title, description, children, className = '' }) => {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="mb-5 pb-3 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      <div className="bg-gradient-to-br from-gray-50/30 to-blue-50/20 rounded-2xl p-5 border border-gray-100/50">
        {children}
      </div>
    </div>
  );
};

export default EntityFormGrid; 