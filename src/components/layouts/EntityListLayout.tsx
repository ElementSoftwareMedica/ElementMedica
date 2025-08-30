import React from 'react';

export interface EntityListLayoutProps {
  title: string;
  subtitle?: string;
  extraControls?: React.ReactNode;
  headerContent?: React.ReactNode;
  searchBarContent?: React.ReactNode;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  children: React.ReactNode;
}

const EntityListLayout: React.FC<EntityListLayoutProps> = ({
  title,
  subtitle,
  extraControls,
  headerContent,
  searchBarContent,
  loading,
  error,
  onRefresh,
  children,
}) => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          {subtitle && <p className="text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex flex-row gap-2 items-center">
          {extraControls}
        </div>
      </div>
      
      {/* Header content (controls, filters, etc) */}
      {headerContent && <div className="mb-4">{headerContent}</div>}
      
      {/* Search bar */}
      {searchBarContent && <div className="mb-4">{searchBarContent}</div>}
      
      {/* Loading state */}
      {loading && <div className="p-4 text-center text-gray-500">Caricamento in corso...</div>}
      
      {/* Error state */}
      {error && (
        <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-md">
          <p>{error}</p>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-800 underline"
            >
              Riprova
            </button>
          )}
        </div>
      )}
      
      {/* Main content */}
      {!loading && !error && children}
      
      {/* If loading or error and no explicit children to show */}
      {(loading || error) && children}
    </div>
  );
};

export default EntityListLayout; 