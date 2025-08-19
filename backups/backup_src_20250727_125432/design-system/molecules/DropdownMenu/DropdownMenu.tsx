/**
 * Design System - DropdownMenu Component (Molecule)
 * GDPR Entity Page Implementation
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils';

export interface DropdownMenuProps {
  /** Dropdown content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
}

export interface DropdownMenuTriggerProps {
  /** Trigger content */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** As child component */
  asChild?: boolean;
}

export interface DropdownMenuContentProps {
  /** Content */
  children: React.ReactNode;
  /** Alignment */
  align?: 'start' | 'center' | 'end';
  /** Custom className */
  className?: string;
}

export interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Item content */
  children: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Custom className */
  className?: string;
}

// Context for dropdown state
const DropdownContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
}>({ 
  isOpen: false, 
  setIsOpen: () => {}, 
  triggerRef: { current: null } 
});

/**
 * Main DropdownMenu container
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      <div className={cn('relative inline-block', className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

/**
 * Dropdown trigger
 */
export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({
  children,
  className,
  asChild = false
}) => {
  const { setIsOpen, triggerRef } = React.useContext(DropdownContext);

  const handleClick = () => {
    setIsOpen(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: triggerRef,
      onClick: handleClick,
      className: cn(children.props.className, className)
    });
  }

  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      onClick={handleClick}
      className={cn('inline-flex items-center justify-center', className)}
    >
      {children}
    </button>
  );
};

/**
 * Dropdown content
 */
export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  children,
  align = 'start',
  className
}) => {
  const { isOpen, setIsOpen, triggerRef } = React.useContext(DropdownContext);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      let left = triggerRect.left + scrollLeft;
      
      if (align === 'end') {
        left = triggerRect.right + scrollLeft;
      } else if (align === 'center') {
        left = triggerRect.left + scrollLeft + triggerRect.width / 2;
      }
      
      setPosition({
        top: triggerRect.bottom + scrollTop + 4,
        left
      });
    }
  }, [isOpen, align]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen || !position) {
    return null;
  }

  const alignmentClass = align === 'end' ? '-translate-x-full' : 
                        align === 'center' ? '-translate-x-1/2' : 
                        '';

  return createPortal(
    <div
      ref={contentRef}
      className={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 shadow-md',
        'animate-in fade-in-0 zoom-in-95',
        alignmentClass,
        className
      )}
      style={{
        top: position.top,
        left: position.left
      }}
    >
      {children}
    </div>,
    document.body
  );
};

/**
 * Dropdown menu item
 */
export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  disabled = false,
  className,
  onClick,
  ...props
}) => {
  const { setIsOpen } = React.useContext(DropdownContext);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    onClick?.(event);
    setIsOpen(false);
  };

  return (
    <div
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'transition-colors focus:bg-gray-100 focus:text-gray-900',
        disabled ? 'pointer-events-none opacity-50' : 'hover:bg-gray-100',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default DropdownMenu;