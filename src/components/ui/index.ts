// UI Components - Consolidated from shared/ui and ui
// Componenti UI generici e business-specific

// Generic UI Components
export { default as ErrorBoundary, withErrorBoundary } from './ErrorBoundary';
export { default as LoadingFallback } from './LoadingFallback';
export { default as TabPills } from './TabPills';

// Business-specific UI Components (moved from shared/ui)
export { default as ActionButton } from './ActionButton';
export { default as ActionMenu, createCrudActions } from './ActionMenu';
export { default as AddEntityDropdown } from './AddEntityDropdown';
export { default as BatchEditButton } from './BatchEditButton';
export { default as ColumnSelector } from './ColumnSelector';

// Validation Components
export {
    ValidationMessage,
    RequiredIndicator,
    FormLabel,
    ValidatedInputWrapper,
    ValidatedInput,
    ValidatedSelect,
    ValidatedTextarea,
} from './ValidationMessage';
export type {
    ValidationMessageProps,
    ValidationMessageType,
    FormLabelProps,
    ValidatedInputWrapperProps,
    ValidatedInputProps,
    ValidatedSelectProps,
    ValidatedTextareaProps,
} from './ValidationMessage';

// Re-export types
export type { ActionButtonProps, ActionButtonTheme } from './ActionButton';
export type { ActionMenuItem, ActionMenuProps, ActionMenuTheme } from './ActionMenu';
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