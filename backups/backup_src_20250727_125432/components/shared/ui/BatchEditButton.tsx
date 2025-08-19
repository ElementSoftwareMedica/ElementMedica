import React from 'react';
import { Pencil, ChevronDown, Check } from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { Dropdown } from '../../../design-system/molecules/Dropdown';
import { cn } from '../../../design-system/utils';

export interface BatchEditButtonProps {
  /** Whether selection mode is active */
  selectionMode: boolean;
  /** Function called when the button is clicked to toggle selection mode */
  onToggleSelectionMode: () => void;
  /** Number of selected items */
  selectedCount?: number;
  /** Actions to show in the dropdown when items are selected */
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'primary' | 'secondary';
  }>;
  /** Additional CSS classes */
  className?: string;
  /** Button variant style */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
}

/**
 * A button that toggles selection mode and transforms into a dropdown
 * with actions when items are selected
 */
export const BatchEditButton: React.FC<BatchEditButtonProps> = ({
  selectionMode,
  onToggleSelectionMode,
  selectedCount = 0,
  actions = [],
  className = '',
  variant = 'outline',
}) => {
  if (selectionMode && selectedCount > 0) {
    return (
      <Dropdown
        variant="outline"
        label={`${selectedCount} selezionati`}
        icon={<Check className="h-4 w-4" />}
        actions={actions}
        className={cn("bg-blue-50 text-blue-700 border-blue-300", className)}
      />
    );
  }

  return (
    <Button 
      variant={variant}
      size="sm" 
      leftIcon={<Pencil className="h-4 w-4" />}
      onClick={onToggleSelectionMode}
      className={cn(
        "h-10 px-4 min-w-[100px] whitespace-nowrap",
        selectionMode ? "bg-blue-50 text-blue-700 border-blue-300" : "",
        className
      )}
    >
      Modifica
    </Button>
  );
};

export default BatchEditButton;