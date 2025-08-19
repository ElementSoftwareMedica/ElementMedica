/**
 * Design System - Icon Component
 * Week 8 Implementation - Component Library
 */

import React from 'react';
import { cn } from '../../utils';

// Icon size variants
export type IconSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';

// Icon color variants
export type IconColor = 
  | 'primary' 
  | 'secondary' 
  | 'muted' 
  | 'error' 
  | 'warning' 
  | 'success' 
  | 'info'
  | 'inherit';

// Common icon names (can be extended)
export type IconName = 
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'arrow-down'
  | 'arrow-up'
  | 'arrow-left'
  | 'arrow-right'
  | 'plus'
  | 'minus'
  | 'x'
  | 'check'
  | 'search'
  | 'filter'
  | 'edit'
  | 'delete'
  | 'trash'
  | 'eye'
  | 'eye-off'
  | 'heart'
  | 'star'
  | 'bookmark'
  | 'share'
  | 'download'
  | 'upload'
  | 'copy'
  | 'external-link'
  | 'home'
  | 'user'
  | 'users'
  | 'settings'
  | 'bell'
  | 'mail'
  | 'phone'
  | 'calendar'
  | 'clock'
  | 'map-pin'
  | 'globe'
  | 'lock'
  | 'unlock'
  | 'key'
  | 'shield'
  | 'alert-circle'
  | 'alert-triangle'
  | 'info'
  | 'help-circle'
  | 'question-mark'
  | 'loading'
  | 'refresh';

export interface IconProps {
  /** Icon name or custom SVG element */
  name?: IconName;
  /** Custom SVG element (overrides name) */
  children?: React.ReactNode;
  /** Icon size */
  size?: IconSize;
  /** Icon color */
  color?: IconColor;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Whether the icon is clickable */
  clickable?: boolean;
  /** Accessibility label */
  'aria-label'?: string;
  /** Whether to add rotation animation */
  spin?: boolean;
  /** Custom rotation angle */
  rotate?: number;
}

// Size mappings
const sizeClasses: Record<IconSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  base: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-10 h-10'
};

// Color mappings
const colorClasses: Record<IconColor, string> = {
  primary: 'text-primary-600',
  secondary: 'text-gray-600',
  muted: 'text-gray-400',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  success: 'text-green-600',
  info: 'text-primary-500',
  inherit: 'text-inherit'
};

// SVG icon definitions
const iconPaths: Record<IconName, string> = {
  'chevron-down': 'M19.5 8.25l-7.5 7.5-7.5-7.5',
  'chevron-up': 'M4.5 15.75l7.5-7.5 7.5 7.5',
  'chevron-left': 'M15.75 19.5L8.25 12l7.5-7.5',
  'chevron-right': 'M8.25 4.5l7.5 7.5-7.5 7.5',
  'arrow-down': 'M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75',
  'arrow-up': 'M12 19.5V4.5m0 0l6.75 6.75M12 4.5l-6.75 6.75',
  'arrow-left': 'M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75',
  'arrow-right': 'M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75',
  'plus': 'M12 4.5v15m7.5-7.5h-15',
  'minus': 'M19.5 12h-15',
  'x': 'M6 18L18 6M6 6l12 12',
  'check': 'M4.5 12.75l6 6 9-13.5',
  'search': 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  'filter': 'M3 4.5h18M7.5 9h9M10.5 13.5h3',
  'edit': 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  'delete': 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  'trash': 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  'eye': 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  'eye-off': 'M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88',
  'heart': 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z',
  'star': 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  'bookmark': 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z',
  'share': 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
  'download': 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
  'upload': 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
  'copy': 'M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184',
  'external-link': 'M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25',
  'home': 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  'user': 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  'users': 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  'settings': 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  'bell': 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7C18 6.279 15.726 4 12.857 4-.696 4-3.178 6.279-3.178 9.05v.7a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
  'mail': 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
  'phone': 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
  'calendar': 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  'clock': 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  'map-pin': 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
  'globe': 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',
  'lock': 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
  'unlock': 'M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
  'key': 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z',
  'shield': 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6C3.052 6.82 2.25 8.51 2.25 10.5c0 5.196 3.131 9.718 8.163 11.654.982.377 1.992.377 2.975 0a13.21 13.21 0 005.402-3.708c1.183-1.447 1.885-3.266 1.885-5.196C20.675 8.51 19.873 6.82 19.327 6c-1.425-.776-3.071-1.236-4.827-1.286z',
  'alert-circle': 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
  'alert-triangle': 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  'info': 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
  'help-circle': 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z',
  'question-mark': 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z',
  'loading': 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
  'refresh': 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99'
};

/**
 * Icon component for displaying SVG icons with consistent styling
 */
export const Icon: React.FC<IconProps> = ({
  name,
  children,
  size = 'base',
  color = 'inherit',
  className,
  onClick,
  clickable = false,
  'aria-label': ariaLabel,
  spin = false,
  rotate,
  ...props
}) => {
  const isClickable = clickable || !!onClick;
  
  const iconClasses = cn(
    'inline-block flex-shrink-0',
    sizeClasses[size],
    colorClasses[color],
    {
      'cursor-pointer hover:opacity-75 transition-opacity': isClickable,
      'animate-spin': spin,
    },
    className
  );

  const style = rotate ? { transform: `rotate(${rotate}deg)` } : undefined;

  // If children are provided, use them instead of the name
  if (children) {
    return (
      <span
        className={iconClasses}
        onClick={onClick}
        style={style}
        aria-label={ariaLabel}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        {...props}
      >
        {children}
      </span>
    );
  }

  // If no name is provided, return null
  if (!name) {
    return null;
  }

  const pathData = iconPaths[name];
  
  if (!pathData) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <svg
      className={iconClasses}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
      style={style}
      aria-label={ariaLabel}
      role={isClickable ? 'button' : 'img'}
      tabIndex={isClickable ? 0 : undefined}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={pathData}
      />
    </svg>
  );
};

// Convenience components for common icons
export const ChevronDownIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="chevron-down" {...props} />
);

export const ChevronUpIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="chevron-up" {...props} />
);

export const ChevronLeftIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="chevron-left" {...props} />
);

export const ChevronRightIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="chevron-right" {...props} />
);

export const PlusIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="plus" {...props} />
);

export const XIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="x" {...props} />
);

export const CheckIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="check" {...props} />
);

export const SearchIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="search" {...props} />
);

export const EditIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="edit" {...props} />
);

export const DeleteIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="delete" {...props} />
);

export const LoadingIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="loading" spin {...props} />
);

export const HomeIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="home" {...props} />
);

export const UserIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="user" {...props} />
);

export const SettingsIcon: React.FC<Omit<IconProps, 'name'>> = (props) => (
  <Icon name="settings" {...props} />
);

export default Icon;