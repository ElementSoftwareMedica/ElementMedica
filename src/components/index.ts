/**
 * Main Components Export
 * 
 * This file exports layout and top-level components to simplify imports.
 * Import components from this file instead of individual files:
 * 
 * import { Layout, Header, Sidebar } from '@/components';
 */

// Export layout components
export { Layout, Header, Sidebar } from './layouts';

// Export basic UI components from design-system
// Note: These are re-exported for backward compatibility
// Consider importing directly from design-system in new code
export { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell
} from '../design-system/molecules/Table';

export { Input } from '../design-system/atoms/Input';
export { Label } from '../design-system/atoms/Label';
export { Select } from '../design-system/atoms/Select';
export { buttonVariants } from '../design-system/atoms/Button';

// Export business-specific shared UI components
export {
  ActionButton,
  AddEntityDropdown,
  BatchEditButton,
  ColumnSelector
} from './ui';

// Note: Dialog has been migrated to design-system/molecules/Modal
// Import Modal directly from design-system instead

// Note: Design system components should be imported directly from design-system
// Example: import { Button, ViewModeToggle } from '../design-system';
// Do NOT re-export design system components from here to maintain clear separation