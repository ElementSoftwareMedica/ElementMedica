import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '../../design-system/utils';

export interface ElegantSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Etichetta di categoria: opzioni con lo stesso `group` vengono raccolte sotto un'intestazione */
  group?: string;
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
        {options.some(o => o.group) ? (
          // Render raggruppato: intestazione di categoria + opzioni
          (() => {
            const groups: { name: string; items: ElegantSelectOption[] }[] = [];
            for (const o of options) {
              const g = o.group || '';
              let bucket = groups.find(x => x.name === g);
              if (!bucket) { bucket = { name: g, items: [] }; groups.push(bucket); }
              bucket.items.push(o);
            }
            return groups.map((grp, gi) => (
              <React.Fragment key={grp.name || `__g${gi}`}>
                {grp.name && (
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {grp.name}
                  </div>
                )}
                {grp.items.map(option => (
                  <SelectItem key={option.value || '__empty'} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </React.Fragment>
            ));
          })()
        ) : (
          options.map(option => (
            <SelectItem key={option.value || '__empty'} value={option.value}>
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  </div>
);

export default ElegantSelect;
