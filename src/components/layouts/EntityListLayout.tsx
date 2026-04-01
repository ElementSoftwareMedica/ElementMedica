import React from 'react';

export interface EntityListLayoutProps {
  title: string;
  subtitle?: string;
  /** Icon shown left of the title */
  icon?: React.ReactNode;
  /** Count badge shown next to the title */
  count?: number;
  extraControls?: React.ReactNode;
  headerContent?: React.ReactNode;
  searchBarContent?: React.ReactNode;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  children: React.ReactNode;
  /** Brand accent color class (default: 'bg-blue-600') */
  accentColor?: string;
}

const EntityListLayout: React.FC<EntityListLayoutProps> = ({
  title,
  subtitle,
  icon,
  count,
  extraControls,
  headerContent,
  searchBarContent,
  loading,
  error,
  onRefresh,
  children,
  accentColor = 'bg-blue-600',
}) => {
  return (
    <div className="p-5 lg:p-6 space-y-4 flex flex-col">
      {/* Brand accent stripe */}
      <div className={`h-0.5 w-full ${accentColor} opacity-80 -mt-5 lg:-mt-6`} />

      {/* Header card */}
      <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Left: optional icon + title + count badge + subtitle */}
          <div className="flex items-center gap-3.5 min-w-0">
            {icon && (
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex-shrink-0">
                <span className="block text-blue-600 dark:text-blue-400">{icon}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {title}
                </h1>
                {count !== undefined && !loading && (
                  <span className="inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums flex-shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {count}
                  </span>
                )}
                {loading && (
                  <div className="h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right: extraControls (view toggle, add button, etc.) */}
          {extraControls && (
            <div className="flex flex-row gap-2 items-center flex-shrink-0">
              {extraControls}
            </div>
          )}
        </div>

        {/* Header content (search bar, filters) inside card */}
        {(headerContent || searchBarContent) && (
          <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            {headerContent}
            {searchBarContent}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          Caricamento in corso...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-md">
          <p>{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
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
