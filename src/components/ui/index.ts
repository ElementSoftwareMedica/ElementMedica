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
export { default as DateFilterBar } from './DateFilterBar';
export type { DateFilterBarProps } from './DateFilterBar';

// CRUD Button Components (Tenant Mode integrated)
export { CRUDButton, CRUDPrimaryButton, CRUDDeleteButton } from '../shared/CRUDButton';

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
export { ComuneAutocomplete } from './ComuneAutocomplete';
export type { ComuneAutocompleteProps } from './ComuneAutocomplete';

// Theme Toggle (P60 Dark Mode)
export { ThemeToggle } from './ThemeToggle';

// Date Picker Components
export { DatePickerElegante, DateRangePicker } from './DatePickerElegante';
export type { DatePickerEleganteProps, DateRangePickerProps } from './DatePickerElegante';
export { DateRangeCalendar } from './DateRangeCalendar';
export type { DateRangeCalendarProps, DateRange } from './DateRangeCalendar';
export { TimeRangePicker } from './TimeRangePicker';
export type { TimeRangePickerProps, TimeRange } from './TimeRangePicker';
export { LocationSelector } from './LocationSelector';
export type { LocationSelectorProps, LocationSelection } from './LocationSelector';
export { PageFiltersBar } from './PageFiltersBar';
export type { PageFiltersBarProps, FilterOption } from './PageFiltersBar';

// Design System Re-exports
export { Card, CardContent, CardHeader, CardTitle } from './card';
export { Button } from './button';
export { Label } from './label';
export { Badge } from './badge';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Progress } from './progress';