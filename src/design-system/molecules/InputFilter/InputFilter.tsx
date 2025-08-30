import React from 'react';
import { cn } from '../../utils';

export interface InputFilterProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const InputFilter: React.FC<InputFilterProps> = ({
  name,
  value,
  onChange,
  placeholder,
  icon,
  className
}) => (
  <div className={cn("flex items-center gap-2 bg-white rounded-full shadow px-4 py-2", className)}>
    {icon}
    <input
      type="text"
      name={name}
      placeholder={placeholder}
      className="flex-1 border-0 focus:ring-0 text-gray-700 bg-transparent"
      value={value}
      onChange={onChange}
    />
  </div>
);