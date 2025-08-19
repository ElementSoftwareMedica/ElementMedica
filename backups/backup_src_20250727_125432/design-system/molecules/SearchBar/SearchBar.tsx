import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '../../atoms/Input';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { cn } from '../../utils/index';

export interface SearchBarProps {
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Initial value for the search input */
  value?: string;
  /** Callback fired when search is performed */
  onSearch?: (value: string) => void;
  /** Callback fired when input value changes */
  onChange?: (value: string) => void;
  /** Whether to show the search button */
  showButton?: boolean;
  /** Whether to search on every keystroke */
  searchOnType?: boolean;
  /** Debounce delay for search on type (ms) */
  debounceMs?: number;
  /** Whether the search bar is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show clear button when there's text */
  showClearButton?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Cerca...',
  value: controlledValue,
  onSearch,
  onChange,
  showButton = true,
  searchOnType = false,
  debounceMs = 300,
  disabled = false,
  className,
  size = 'md',
  showClearButton = true,
}) => {
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const isControlled = controlledValue !== undefined;
  const searchValue = isControlled ? controlledValue : internalValue;

  const handleSearch = useCallback(() => {
    if (onSearch && searchValue.trim()) {
      onSearch(searchValue.trim());
    }
  }, [onSearch, searchValue]);

  const handleInputChange = useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      
      onChange?.(newValue);

      if (searchOnType && onSearch) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        const timer = setTimeout(() => {
          if (newValue.trim()) {
            onSearch(newValue.trim());
          }
        }, debounceMs);

        setDebounceTimer(timer);
      }
    },
    [isControlled, onChange, searchOnType, onSearch, debounceMs, debounceTimer]
  );

  const handleClear = useCallback(() => {
    const newValue = '';
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  }, [isControlled, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
  };

  return (
    <div className={cn('relative flex items-center', sizeClasses[size], className)}>
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'pr-8',
            showButton && 'rounded-r-none border-r-0',
            size === 'sm' && 'text-sm',
            size === 'lg' && 'text-lg'
          )}
        />
        
        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon name="search" size={size === 'sm' ? 'sm' : 'md'} />
        </div>

        {/* Clear Button */}
        {showClearButton && searchValue && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <Icon name="x" size="sm" />
          </button>
        )}
      </div>

      {/* Search Button */}
      {showButton && (
        <Button
          type="button"
          onClick={handleSearch}
          disabled={disabled || !searchValue.trim()}
          size={size}
          className="rounded-l-none border-l-0"
        >
          <Icon name="search" size={size === 'sm' ? 'sm' : 'md'} />
        </Button>
      )}
    </div>
  );
};

SearchBar.displayName = 'SearchBar';

export default SearchBar;