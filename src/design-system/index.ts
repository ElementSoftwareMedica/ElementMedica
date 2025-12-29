/**
 * Design System - Main Index
 * Week 8 Implementation - Component Library
 */

// Export all design system components
export * from './atoms';
export * from './molecules';
export * from './organisms';
export * from './tokens';
export * from './themes';
export * from './utils';

// Theme and utilities
export { theme, designTokens, applyDesignTokens } from './tokens';

// Re-export components for easier imports
export { Badge } from './atoms/Badge';
export { Button } from './atoms/Button';
export { Input } from './atoms/Input';
export { Select } from './atoms/Select';
export { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from './molecules/Breadcrumb';
export { Card } from './molecules/Card';
export { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from './molecules/DropdownMenu';
export { FormField } from './molecules/FormField';
export { Modal, ConfirmModal } from './molecules/Modal';
export { SearchBox } from './molecules/SearchBox';
export { SearchBar } from './molecules/SearchBar';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './molecules/Tabs';

// Types from atoms
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
} from './atoms/Button';

export type {
  InputProps,
  InputVariant,
  InputSize,
  InputState,
} from './atoms/Input';

export type {
  CardProps,
  CardVariant,
  CardSize,
} from './molecules/Card';

// Token types
export type {
  ColorToken,
  ColorShade,
  FontFamily,
  FontSize,
  FontWeight,
  LineHeight,
  LetterSpacing,
  TextStyle,
  Spacing,
  SemanticSpacing,
  Sizing,
  BorderRadius,
  Shadow,
  ZIndex,
  Theme,
  ThemeColors,
  ThemeFontSizes,
  ThemeSpacing,
} from './tokens';