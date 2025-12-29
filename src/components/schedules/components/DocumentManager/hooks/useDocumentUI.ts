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
  showRegistriModal: boolean;
  showLettereModal: boolean;
  editingPreventivo: any | null;
  openRegenerateModal: () => void;
  closeRegenerateModal: () => void;
  openPreventiviModal: (preventivo?: any) => void;
  closePreventiviModal: () => void;
  openRegistriModal: () => void;
  closeRegistriModal: () => void;
  openLettereModal: () => void;
  closeLettereModal: () => void;
}

/**
 * Custom hook for UI state management
 * Manages modal visibility and editing state
 */
export const useDocumentUI = (): UseDocumentUIReturn => {
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showPreventiviModal, setShowPreventiviModal] = useState(false);
  const [showRegistriModal, setShowRegistriModal] = useState(false);
  const [showLettereModal, setShowLettereModal] = useState(false);
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

  /**
   * Open registri presenze modal
   */
  const openRegistriModal = () => {
    setShowRegistriModal(true);
  };

  /**
   * Close registri presenze modal
   */
  const closeRegistriModal = () => {
    setShowRegistriModal(false);
  };

  /**
   * Open lettere di incarico modal
   */
  const openLettereModal = () => {
    console.log('🔵 openLettereModal called, setting showLettereModal to true');
    setShowLettereModal(true);
  };

  /**
   * Close lettere di incarico modal
   */
  const closeLettereModal = () => {
    setShowLettereModal(false);
  };

  return {
    showRegenerateModal,
    showPreventiviModal,
    showRegistriModal,
    showLettereModal,
    editingPreventivo,
    openRegenerateModal,
    closeRegenerateModal,
    openPreventiviModal,
    closePreventiviModal,
    openRegistriModal,
    closeRegistriModal,
    openLettereModal,
    closeLettereModal
  };
};
