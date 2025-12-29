/**
 * ActionMenu Component - Re-export from UI
 * 
 * This file re-exports the ActionMenu from @/components/ui/ActionMenu
 * for backward compatibility with existing imports from this location.
 * 
 * @deprecated Use import from '@/components/ui' instead:
 * import { ActionMenu, createCrudActions } from '@/components/ui';
 * 
 * @module components/clinica/ActionMenu
 */

export {
    ActionMenu,
    createCrudActions,
    type ActionMenuItem,
    type ActionMenuProps,
    type ActionMenuTheme
} from '../ui/ActionMenu';
export { default } from '../ui/ActionMenu';
