import { useState } from 'react';
import type { TreeActionCallbacks } from '../types';

interface UseTreeDragDropOptions {
  hasPermission: (permission: string) => boolean;
  callbacks?: TreeActionCallbacks;
  onReload?: () => Promise<void>;
}

interface UseTreeDragDropReturn {
  draggedNode: string | null;
  handleDragStart: (nodeId: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, targetNodeId: string | null) => Promise<void>;
}

/**
 * Hook per la gestione del drag and drop dei ruoli
 * Permette di riorganizzare i ruoli trascinandoli nella gerarchia
 */
export const useTreeDragDrop = ({
  hasPermission,
  callbacks,
  onReload
}: UseTreeDragDropOptions): UseTreeDragDropReturn => {
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  const handleDragStart = (nodeId: string) => {
    setDraggedNode(nodeId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetNodeId: string | null) => {
    e.preventDefault();

    if (!draggedNode || !hasPermission('hierarchy:update')) return;

    try {
      if (callbacks?.onMove) {
        await callbacks.onMove(draggedNode, targetNodeId);
      }
      if (onReload) {
        await onReload();
      }
    } catch (error) {
    } finally {
      setDraggedNode(null);
    }
  };

  return {
    draggedNode,
    handleDragStart,
    handleDragOver,
    handleDrop
  };
};
