import { useState, useEffect, useMemo } from 'react';
import type { TreeNode } from '../types';

interface UseTreeNavigationOptions {
  treeData: TreeNode[];
  autoExpandLevels?: number;
}

interface UseTreeNavigationReturn {
  expandedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
}

/**
 * Hook per la gestione della navigazione nell'albero (expand/collapse)
 * Gestisce lo stato di espansione dei nodi e le operazioni di navigazione
 */
export const useTreeNavigation = ({
  treeData,
  autoExpandLevels = 2
}: UseTreeNavigationOptions): UseTreeNavigationReturn => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const expandChildrenRecursively = (node: TreeNode, expanded: Set<string>, maxLevel: number) => {
    if (node.level < maxLevel) {
      node.children.forEach(child => {
        expanded.add(child.id);
        expandChildrenRecursively(child, expanded, maxLevel);
      });
    }
  };

  const getAllNodeIds = (nodes: TreeNode[]): string[] => {
    const ids: string[] = [];
    const traverse = (nodeArray: TreeNode[]) => {
      nodeArray.forEach(node => {
        ids.push(node.id);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return ids;
  };

  // Create a stable key from treeData to prevent infinite loops
  const treeDataKey = useMemo(() => {
    const getIds = (nodes: TreeNode[]): string => {
      return nodes.map(n => `${n.id}:${getIds(n.children)}`).join(',');
    };
    return getIds(treeData);
  }, [treeData]);

  // Inizializza l'espansione dei primi livelli
  useEffect(() => {
    if (treeData.length > 0) {
      const initialExpanded = new Set<string>();
      treeData.forEach(node => {
        if (node.level <= autoExpandLevels) {
          initialExpanded.add(node.id);
          expandChildrenRecursively(node, initialExpanded, autoExpandLevels + 1);
        }
      });
      setExpandedNodes(initialExpanded);
    }
  }, [treeDataKey, autoExpandLevels]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    newExpanded.add(nodeId);
    setExpandedNodes(newExpanded);
  };

  const collapseNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    newExpanded.delete(nodeId);
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = getAllNodeIds(treeData);
    setExpandedNodes(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  return {
    expandedNodes,
    toggleNode,
    expandNode,
    collapseNode,
    expandAll,
    collapseAll
  };
};
