/**
 * Design System - Card Component (Molecule)
 * Week 8 Implementation - Component Library
 */

import React from 'react';
import { cn } from '../../utils';

// Card variants and sizes
export type CardVariant = 'default' | 'outlined' | 'elevated' | 'filled';
export type CardSize = 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card variant */
  variant?: CardVariant;
  /** Card size */
  size?: CardSize;
  /** Card header content */
  header?: React.ReactNode;
  /** Card footer content */
  footer?: React.ReactNode;
  /** Card title */
  title?: string;
  /** Card subtitle */
  subtitle?: string;
  /** Card image */
  image?: string;
  /** Image alt text */
  imageAlt?: string;
  /** Card actions */
  actions?: React.ReactNode;
  /** Clickable card */
  clickable?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Children content */
  children?: React.ReactNode;
}

// Variant styles
const variantStyles: Record<CardVariant, string> = {
  default: `
    bg-white border border-gray-200
    hover:shadow-md
  `,
  outlined: `
    bg-white border-2 border-gray-300
    hover:border-gray-400
  `,
  elevated: `
    bg-white shadow-lg border-0
    hover:shadow-xl
  `,
  filled: `
    bg-gray-50 border border-gray-200
    hover:bg-gray-100
  `,
};

// Size styles
const sizeStyles: Record<CardSize, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

// Base card styles
const baseStyles = `
  rounded-2xl
  transition-all duration-200
  overflow-hidden
`;

// Header styles
const headerStyles = `
  border-b border-gray-200 pb-4 mb-4
`;

// Footer styles
const footerStyles = `
  border-t border-gray-200 pt-4 mt-4
`;

// Title styles
const titleStyles = `
  text-lg font-semibold text-gray-900 mb-1
`;

// Subtitle styles
const subtitleStyles = `
  text-sm text-gray-600 mb-4
`;

// Loading skeleton
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded"></div>
      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      <div className="h-3 bg-gray-200 rounded w-4/6"></div>
    </div>
  </div>
);

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  size = 'md',
  header,
  footer,
  title,
  subtitle,
  image,
  imageAlt,
  actions,
  clickable = false,
  loading = false,
  className,
  children,
  onClick,
  ...props
}) => {
  const cardClasses = cn(
    baseStyles,
    variantStyles[variant],
    clickable && 'cursor-pointer hover:scale-[1.02]',
    className
  );

  const contentClasses = cn(
    sizeStyles[size]
  );

  const renderImage = () => {
    if (!image) return null;
    
    return (
      <div className="aspect-video w-full overflow-hidden">
        <img
          src={image}
          alt={imageAlt || 'Card image'}
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  const renderHeader = () => {
    if (!header && !title && !subtitle) return null;
    
    return (
      <div className={headerStyles}>
        {header && header}
        {title && <h3 className={titleStyles}>{title}</h3>}
        {subtitle && <p className={subtitleStyles}>{subtitle}</p>}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingSkeleton />;
    }
    
    return children;
  };

  const renderActions = () => {
    if (!actions) return null;
    
    return (
      <div className="flex items-center justify-end space-x-2 mt-4">
        {actions}
      </div>
    );
  };

  const renderFooter = () => {
    if (!footer) return null;
    
    return (
      <div className={footerStyles}>
        {footer}
      </div>
    );
  };

  return (
    <div
      className={cardClasses}
      onClick={clickable ? onClick : undefined}
      {...props}
    >
      {renderImage()}
      
      <div className={contentClasses}>
        {renderHeader()}
        {renderContent()}
        {renderActions()}
      </div>
      
      {renderFooter()}
    </div>
  );
};

Card.displayName = 'Card';

// Sub-components for flexible card composition
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ className, children, ...props }) => {
  return (
    <div className={cn(headerStyles, className)} {...props}>
      {children}
    </div>
  );
};

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({ className, children, ...props }) => {
  return (
    <h3 className={cn(titleStyles, className)} {...props}>
      {children}
    </h3>
  );
};

CardTitle.displayName = 'CardTitle';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ className, children, ...props }) => {
  return (
    <div className={cn('flex-1', className)} {...props}>
      {children}
    </div>
  );
};

CardContent.displayName = 'CardContent';

export default Card;