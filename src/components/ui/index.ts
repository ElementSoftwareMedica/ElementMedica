// UI Components - Consolidated from shared/ui and ui
// Componenti UI generici e business-specific

// Generic UI Components
export { default as ErrorBoundary, withErrorBoundary } from './ErrorBoundary';
export { default as LoadingFallback } from './LoadingFallback';
export { default as TabPills } from './TabPills';

// Business-specific UI Components (moved from shared/ui)
export { default as ActionButton } from './ActionButton';
export { default as AddEntityDropdown } from './AddEntityDropdown';
export { default as BatchEditButton } from './BatchEditButton';
export { default as ColumnSelector } from './ColumnSelector';

// Re-export types
export type { ActionButtonProps } from './ActionButton';
export type { AddEntityDropdownProps } from './AddEntityDropdown';
export type { BatchEditButtonProps } from './BatchEditButton';

// Shadcn UI Components
export { Alert, AlertDescription } from './alert';
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select';
export { Separator } from './separator';
export { Switch } from './switch';
export { Input } from './input';
export { Textarea } from './textarea';
export { ImageUpload } from './image-upload';

// Design System Re-exports
export { Card, CardContent, CardHeader, CardTitle } from './card';
export { Button } from './button';
export { Label } from './label';
export { Badge } from './badge';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Progress } from './progress';