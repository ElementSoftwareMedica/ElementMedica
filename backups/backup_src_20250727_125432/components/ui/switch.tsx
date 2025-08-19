import React from 'react';
import { cn } from '../../design-system/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = event.target.checked;
      onCheckedChange?.(newChecked);
      onChange?.(event);
    };

    return (
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            checked ? 'bg-blue-600' : 'bg-gray-200',
            'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
            className
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              checked ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </div>
      </label>
    );
  }
);
Switch.displayName = 'Switch';