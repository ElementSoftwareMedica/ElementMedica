/**
 * Utility helpers for HierarchyTreeView component
 * Contains reusable helper functions for tree operations
 */

/**
 * Log dei permessi per debugging
 */
export const logPermissionCheck = (
  nodeName: string,
  roleType: string,
  canEdit: boolean,
  canCreate: boolean,
  canDelete: boolean,
  hasChildren: boolean,
  currentUserHierarchy: any
) => {
  console.log(`🔍 Debug pulsanti per nodo ${nodeName} (${roleType}):`);
  console.log(`  - canEdit: ${canEdit}`);
  console.log(`  - canCreate: ${canCreate}`);
  console.log(`  - canDelete: ${canDelete}`);
  console.log(`  - hasChildren: ${hasChildren}`);
  console.log(`  - currentUserHierarchy:`, currentUserHierarchy);
};

/**
 * Ottiene le classi CSS per i pulsanti in base allo stato
 */
export const getButtonClasses = (
  isEnabled: boolean,
  enabledColor: string = 'blue'
): string => {
  const colorMap: Record<string, { enabled: string; disabled: string }> = {
    blue: { 
      enabled: 'text-blue-600 hover:bg-blue-100 cursor-pointer',
      disabled: 'text-gray-400 opacity-50 cursor-not-allowed'
    },
    green: { 
      enabled: 'text-green-600 hover:bg-green-100 cursor-pointer',
      disabled: 'text-gray-400 opacity-50 cursor-not-allowed'
    },
    red: { 
      enabled: 'text-red-600 hover:bg-red-100 cursor-pointer',
      disabled: 'text-gray-400 opacity-50 cursor-not-allowed'
    },
    amber: { 
      enabled: 'text-amber-600 hover:bg-amber-100 cursor-move',
      disabled: 'text-gray-400 opacity-50 cursor-not-allowed'
    }
  };

  const colors = colorMap[enabledColor] || colorMap.blue;
  const baseClasses = 'p-1 transition-colors rounded bg-transparent border-0 shadow-none';
  
  return `${baseClasses} ${isEnabled ? colors.enabled : colors.disabled}`;
};

/**
 * Ottiene il messaggio di tooltip per i pulsanti
 */
export const getButtonTooltip = (
  action: 'create' | 'edit' | 'delete' | 'move',
  canPerform: boolean,
  hasChildren?: boolean
): string => {
  if (action === 'delete' && !canPerform && hasChildren) {
    return 'Non puoi eliminare un ruolo con sotto-ruoli';
  }

  const tooltips = {
    create: {
      enabled: 'Aggiungi sotto-ruolo',
      disabled: 'Non hai permessi per creare ruoli'
    },
    edit: {
      enabled: 'Modifica',
      disabled: 'Non hai permessi per modificare questo ruolo'
    },
    delete: {
      enabled: 'Elimina',
      disabled: 'Non hai permessi per eliminare questo ruolo'
    },
    move: {
      enabled: 'Trascina per riordinare',
      disabled: 'Non hai permessi per riordinare'
    }
  };

  return canPerform ? tooltips[action].enabled : tooltips[action].disabled;
};
