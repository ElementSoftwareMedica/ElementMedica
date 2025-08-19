import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../../design-system/utils';

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onClear?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value = '',
  onChange,
  placeholder = 'Cerca...',
  className,
  disabled = false,
  onClear
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleClear = () => {
    onChange?.('');
    onClear?.();
  };

  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md',
          'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          'sm:text-sm'
        )}
      />
      
      {value && (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 disabled:cursor-not-allowed"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;