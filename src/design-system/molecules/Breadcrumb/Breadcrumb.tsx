/**
 * Design System - Breadcrumb Component (Molecule)
 * GDPR Entity Page Implementation
 */

import React from 'react';
import { cn } from '../../utils';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  /** Breadcrumb content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
}

export interface BreadcrumbListProps extends React.HTMLAttributes<HTMLOListElement> {
  /** Breadcrumb list content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
}

export interface BreadcrumbItemProps extends React.HTMLAttributes<HTMLLIElement> {
  /** Breadcrumb item content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
}

export interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Link content */
  children: React.ReactNode;
  /** Link href */
  href?: string;
  /** Custom className */
  className?: string;
}

export interface BreadcrumbPageProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Page content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
}

export interface BreadcrumbSeparatorProps extends React.HTMLAttributes<HTMLLIElement> {
  /** Custom className */
  className?: string;
}

/**
 * Main Breadcrumb container
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <nav
      aria-label="breadcrumb"
      className={cn('flex', className)}
      {...props}
    >
      {children}
    </nav>
  );
};

/**
 * Breadcrumb list container
 */
export const BreadcrumbList: React.FC<BreadcrumbListProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <ol
      className={cn(
        'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5',
        className
      )}
      {...props}
    >
      {children}
    </ol>
  );
};

/**
 * Individual breadcrumb item
 */
export const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <li
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    >
      {children}
    </li>
  );
};

/**
 * Breadcrumb link
 */
export const BreadcrumbLink: React.FC<BreadcrumbLinkProps> = ({
  className,
  children,
  href,
  ...props
}) => {
  return (
    <a
      href={href}
      className={cn(
        'transition-colors hover:text-foreground text-gray-600 hover:text-gray-900',
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
};

/**
 * Current page in breadcrumb
 */
export const BreadcrumbPage: React.FC<BreadcrumbPageProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <span
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('font-normal text-foreground text-gray-900', className)}
      {...props}
    >
      {children}
    </span>
  );
};

/**
 * Breadcrumb separator
 */
export const BreadcrumbSeparator: React.FC<BreadcrumbSeparatorProps> = ({
  className,
  ...props
}) => {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      className={cn('[&>svg]:size-3.5', className)}
      {...props}
    >
      <ChevronRightIcon className="h-4 w-4" />
    </li>
  );
};

// Alias for compatibility
export const BreadcrumbItemComponent = BreadcrumbItem;

export default Breadcrumb;