import React from 'react';
import { cn } from '../../design-system/utils';

interface PublicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

/**
 * Pulsante pubblico per Element Formazione
 * Design a pillola full-rounded secondo le specifiche
 */
export const PublicButton: React.FC<PublicButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium transition-all duration-200',
    'rounded-full', // Full-rounded pill shape
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'hover:transform hover:scale-105 active:scale-95' // Subtle animation
  ];

  const variantClasses = {
    primary: [
      'bg-primary-600 text-white',
      'hover:bg-primary-700',
      'focus:ring-primary-500',
      'shadow-md hover:shadow-lg'
    ],
    secondary: [
      'bg-secondary-600 text-white',
      'hover:bg-secondary-700',
      'focus:ring-secondary-500',
      'shadow-md hover:shadow-lg'
    ],
    outline: [
      'border-2 border-primary-600 text-primary-600 bg-transparent',
      'hover:bg-primary-600 hover:text-white',
      'focus:ring-primary-500'
    ],
    ghost: [
      'text-primary-600 bg-transparent',
      'hover:bg-primary-50',
      'focus:ring-primary-500'
    ]
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  return (
    <button
      className={classes}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default PublicButton;