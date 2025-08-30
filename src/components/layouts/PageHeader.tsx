import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowUpDown,
  CheckSquare,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Search
} from 'lucide-react';

export interface PageHeaderProps {
  /** Main page title */
  title: string;
  /** Subtitle/description text */
  subtitle: string;
  /** View mode: 'table' or 'grid' */
  viewMode: 'table' | 'grid';
  /** Function to toggle between view modes */
  onViewModeChange: (mode: 'table' | 'grid') => void;
  /** Whether the page is in selection mode */
  selectionMode: boolean;
  /** Function to toggle selection mode */
  onToggleSelectionMode: () => void;
  /** Current search value */
  searchValue: string;
  /** Function to handle search value changes */
  onSearchChange: (value: string) => void;
  /** Whether any filters are active */
  filtersActive?: boolean;
  /** Primary action button text (Add, Create, etc.) */
  primaryActionText?: string;
  /** Primary action function */
  onPrimaryAction?: () => void;
  /** Primary action button icon */
  primaryActionIcon?: React.ReactNode;
  /** Primary action dropdown options */
  primaryActionDropdownOptions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }>;
  /** Content for the selection mode toolbar */
  selectionToolbar?: React.ReactNode;
  /** Additional filter components */
  filterComponents?: React.ReactNode;
  /** Function to handle sorting */
  onSort?: () => void;
  /** Sort options for dropdown menu */
  sortOptions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  /** Filter options for dropdown menu */
  filterOptions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  /** Function to toggle filters */
  onToggleFilters?: () => void;
  description?: string;
  children?: React.ReactNode;
}

/**
 * Standardized page header component with consistent styling
 * Includes title, description, view controls, search, and primary action
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  viewMode,
  onViewModeChange,
  selectionMode,
  onToggleSelectionMode,
  searchValue,
  onSearchChange,
  filtersActive = false,
  primaryActionText = 'Aggiungi',
  onPrimaryAction,
  primaryActionIcon = <Plus className="h-5 w-5" />,
  primaryActionDropdownOptions,
  selectionToolbar,
  filterComponents,
  onSort,
  sortOptions,
  description,
  children,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    };
    
    if (dropdownOpen || sortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, sortDropdownOpen]);
  
  return (
    <div className="space-y-4 mb-6">
      {/* Title row with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          {description && (
            <p className="text-gray-500">{description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Selection Mode Toggle (Modify) */}
          <button
            onClick={onToggleSelectionMode}
            className={`px-4 h-10 rounded-full border flex items-center gap-2 transition ${
              selectionMode ? 'bg-blue-100 text-blue-700 border-blue-400' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            Modifica
          </button>
          
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-full p-1 relative h-10 w-40">
            <button
              className={`flex-1 h-8 z-10 relative transition-colors duration-300 flex items-center justify-center gap-1.5 ${viewMode === 'grid' ? 'text-blue-700' : 'text-gray-600'}`}
              onClick={() => onViewModeChange('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="text-xs font-medium">Card</span>
            </button>
            <button
              className={`flex-1 h-8 z-10 relative transition-colors duration-300 flex items-center justify-center gap-1.5 ${viewMode === 'table' ? 'text-blue-700' : 'text-gray-600'}`}
              onClick={() => onViewModeChange('table')}
            >
              <List className="h-4 w-4" />
              <span className="text-xs font-medium">Table</span>
            </button>
            <span
              className={`absolute top-1 bottom-1 h-8 bg-white rounded-full shadow transition-transform duration-300 ${
                viewMode === 'table' ? 'right-1 left-[50%]' : 'left-1 right-[50%]'
              }`}
              style={{ zIndex: 0 }}
            />
          </div>
          
          {/* Primary Action Button/Dropdown */}
          {(onPrimaryAction || primaryActionDropdownOptions) && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={primaryActionDropdownOptions ? () => setDropdownOpen(!dropdownOpen) : onPrimaryAction}
                className="px-4 h-10 rounded-full bg-blue-600 text-white flex items-center gap-2 shadow-sm hover:bg-blue-700 focus:outline-none"
              >
                {primaryActionIcon}
                {primaryActionText}
                {primaryActionDropdownOptions && (
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              
              {dropdownOpen && primaryActionDropdownOptions && (
                <div className="absolute right-0 mt-2 py-2 w-56 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                  {primaryActionDropdownOptions.map((option, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      onClick={() => { setDropdownOpen(false); option.onClick(); }}
                    >
                      {option.icon}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Search and filters row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-grow">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cerca..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          {searchValue && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => onSearchChange('')}
            >
              ×
            </button>
          )}
        </div>
        
        {onSort && (
          <div className="relative" ref={sortDropdownRef}>
            <button 
              onClick={sortOptions ? () => setSortDropdownOpen(!sortDropdownOpen) : onSort} 
              className="px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort By
              {sortOptions && (
                <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
            
            {sortDropdownOpen && sortOptions && (
              <div className="absolute right-0 mt-2 py-2 w-40 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                {sortOptions.map((option, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => { 
                      setSortDropdownOpen(false); 
                      option.onClick(); 
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        <button 
          className={`px-3 py-1.5 rounded-full ${filtersActive 
            ? 'bg-blue-100 text-blue-700' 
            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'} flex items-center gap-1.5`}
        >
          <Filter className="h-3.5 w-3.5" />
          {filtersActive ? 'Filtri attivi' : 'Filters'}
        </button>
        
        {filterComponents}
      </div>
      
      {/* Selection mode toolbar - shown right below the search bar */}
      {selectionMode && selectionToolbar}
      
      {children && <div className="mt-3 sm:mt-0">{children}</div>}
    </div>
  );
};

export default PageHeader;