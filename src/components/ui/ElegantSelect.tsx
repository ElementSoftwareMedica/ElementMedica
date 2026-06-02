import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '../../design-system/utils';

export interface ElegantSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ElegantSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: ElegantSelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export const ElegantSelect: React.FC<ElegantSelectProps> = ({
  value = '',
  onChange,
  options,
  placeholder = 'Seleziona...',
  className,
  triggerClassName,
  disabled,
}) => (
  <div className={cn('w-full', className)}>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        disabled={disabled}
        className={cn(
          'h-10 rounded-xl border-gray-200 bg-white text-left text-sm font-medium text-gray-800 shadow-sm',
          'hover:border-teal-300 focus:ring-teal-500 focus:ring-offset-0 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
          triggerClassName
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value || '__empty'} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default ElegantSelect;
