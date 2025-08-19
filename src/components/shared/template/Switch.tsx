import React from 'react';

interface SwitchProps {
  isChecked: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Switch: React.FC<SwitchProps> = ({ 
  isChecked, 
  onChange, 
  disabled = false,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-8',
    md: 'h-6 w-11',
    lg: 'h-8 w-14'
  };

  const thumbSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6'
  };

  const translateClasses = {
    sm: isChecked ? 'translate-x-4' : 'translate-x-0.5',
    md: isChecked ? 'translate-x-6' : 'translate-x-1',
    lg: isChecked ? 'translate-x-7' : 'translate-x-1'
  };

  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex ${sizeClasses[size]} items-center rounded-full transition-colors ${
        isChecked ? 'bg-blue-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block ${thumbSizeClasses[size]} transform rounded-full bg-white transition-transform ${translateClasses[size]}`}
      />
    </button>
  );
};