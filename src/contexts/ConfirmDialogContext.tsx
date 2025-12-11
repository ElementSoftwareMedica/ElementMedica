/**
 * ConfirmDialog Context
 * 
 * Provides a centralized way to show confirm dialogs throughout the app
 * replacing native browser confirm() with elegant centered modals.
 * 
 * Usage:
 * const { confirm } = useConfirmDialog();
 * const result = await confirm({
 *   title: 'Conferma eliminazione',
 *   message: 'Sei sicuro di voler eliminare questo elemento?',
 *   variant: 'danger'
 * });
 * if (result) { // User confirmed
 *   await deleteItem();
 * }
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ConfirmModal, type ModalSize } from '../design-system/molecules/Modal/Modal';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
    /** Dialog title */
    title: string;
    /** Dialog message */
    message: string;
    /** Confirm button label (default: 'Conferma') */
    confirmLabel?: string;
    /** Cancel button label (default: 'Annulla') */
    cancelLabel?: string;
    /** Visual variant for the confirm button */
    variant?: ConfirmVariant;
    /** Modal size */
    size?: ModalSize;
}

interface ConfirmDialogContextType {
    /** Shows a confirm dialog and returns a promise that resolves to true if confirmed, false if cancelled */
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    /** Shows a quick confirm dialog with danger variant for deletions */
    confirmDelete: (itemName?: string) => Promise<boolean>;
    /** Shows a quick confirm dialog with warning variant */
    confirmWarning: (title: string, message: string) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

interface DialogState extends ConfirmOptions {
    isOpen: boolean;
}

const initialState: DialogState = {
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Conferma',
    cancelLabel: 'Annulla',
    variant: 'info',
    size: 'sm'
};

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dialogState, setDialogState] = useState<DialogState>(initialState);
    const [loading, setLoading] = useState(false);

    // Use refs to store the resolve function for the current promise
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setDialogState({
                isOpen: true,
                title: options.title,
                message: options.message,
                confirmLabel: options.confirmLabel || 'Conferma',
                cancelLabel: options.cancelLabel || 'Annulla',
                variant: options.variant || 'info',
                size: options.size || 'sm'
            });
        });
    }, []);

    const confirmDelete = useCallback((itemName?: string): Promise<boolean> => {
        const message = itemName
            ? `Sei sicuro di voler eliminare "${itemName}"? L'operazione non può essere annullata.`
            : 'Sei sicuro di voler eliminare questo elemento? L\'operazione non può essere annullata.';

        return confirm({
            title: 'Conferma eliminazione',
            message,
            confirmLabel: 'Elimina',
            cancelLabel: 'Annulla',
            variant: 'danger'
        });
    }, [confirm]);

    const confirmWarning = useCallback((title: string, message: string): Promise<boolean> => {
        return confirm({
            title,
            message,
            confirmLabel: 'Conferma',
            cancelLabel: 'Annulla',
            variant: 'warning'
        });
    }, [confirm]);

    const handleConfirm = useCallback(() => {
        if (resolveRef.current) {
            resolveRef.current(true);
            resolveRef.current = null;
        }
        setDialogState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleCancel = useCallback(() => {
        if (resolveRef.current) {
            resolveRef.current(false);
            resolveRef.current = null;
        }
        setDialogState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const contextValue: ConfirmDialogContextType = {
        confirm,
        confirmDelete,
        confirmWarning
    };

    return (
        <ConfirmDialogContext.Provider value={contextValue}>
            {children}
            <ConfirmModal
                open={dialogState.isOpen}
                onCancel={handleCancel}
                onConfirm={handleConfirm}
                title={dialogState.title}
                message={dialogState.message}
                confirmLabel={dialogState.confirmLabel}
                cancelLabel={dialogState.cancelLabel}
                variant={dialogState.variant}
                size={dialogState.size}
                loading={loading}
            />
        </ConfirmDialogContext.Provider>
    );
};

/**
 * Hook to access the confirm dialog functionality
 * 
 * @example
 * const { confirm, confirmDelete } = useConfirmDialog();
 * 
 * // Custom confirm
 * const proceed = await confirm({
 *   title: 'Conferma azione',
 *   message: 'Vuoi procedere?',
 *   variant: 'warning'
 * });
 * 
 * // Quick delete confirm
 * const shouldDelete = await confirmDelete('documento.pdf');
 * if (shouldDelete) {
 *   await deleteDocument();
 * }
 */
export const useConfirmDialog = (): ConfirmDialogContextType => {
    const context = useContext(ConfirmDialogContext);
    if (!context) {
        throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
    }
    return context;
};

export default ConfirmDialogContext;
