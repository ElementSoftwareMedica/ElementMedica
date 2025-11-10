/**
 * useDocumentUI hook
 * 
 * Manages UI state for modals and menus.
 * Handles modal visibility and editing state for preventivi.
 */

import { useState } from 'react';

export interface UseDocumentUIReturn {
  showRegenerateModal: boolean;
  showPreventiviModal: boolean;
  editingPreventivo: any | null;
  openRegenerateModal: () => void;
  closeRegenerateModal: () => void;
  openPreventiviModal: (preventivo?: any) => void;
  closePreventiviModal: () => void;
}

/**
 * Custom hook for UI state management
 * Manages modal visibility and editing state
 */
export const useDocumentUI = (): UseDocumentUIReturn => {
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showPreventiviModal, setShowPreventiviModal] = useState(false);
  const [editingPreventivo, setEditingPreventivo] = useState<any>(null);

  /**
   * Open regenerate attestati modal
   */
  const openRegenerateModal = () => {
    setShowRegenerateModal(true);
  };

  /**
   * Close regenerate attestati modal
   */
  const closeRegenerateModal = () => {
    setShowRegenerateModal(false);
  };

  /**
   * Open preventivi modal (for creation or editing)
   * 
   * @param preventivo - Optional preventivo object for editing mode
   */
  const openPreventiviModal = (preventivo?: any) => {
    setEditingPreventivo(preventivo || null);
    setShowPreventiviModal(true);
  };

  /**
   * Close preventivi modal and reset editing state
   */
  const closePreventiviModal = () => {
    setShowPreventiviModal(false);
    setEditingPreventivo(null);
  };

  return {
    showRegenerateModal,
    showPreventiviModal,
    editingPreventivo,
    openRegenerateModal,
    closeRegenerateModal,
    openPreventiviModal,
    closePreventiviModal
  };
};
