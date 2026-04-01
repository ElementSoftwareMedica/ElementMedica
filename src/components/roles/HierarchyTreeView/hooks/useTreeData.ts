import { useState, useEffect } from 'react';
import { getRoleHierarchy } from '../../../../services/roles';
import { isAuthenticated } from '../../../../services/auth';
import type { RoleHierarchy as RoleHierarchyType } from '../../../../services/roles';
import type { TreeNode } from '../types';

interface UseTreeDataOptions {
  externalHierarchy?: RoleHierarchyType;
}

interface UseTreeDataReturn {
  hierarchy: RoleHierarchyType;
  treeData: TreeNode[];
  loading: boolean;
  error: string | null;
  reloadHierarchy: () => Promise<void>;
}

/**
 * Hook per la gestione del caricamento e della struttura dei dati della gerarchia
 * Gestisce il fetch della gerarchia e la costruzione della struttura ad albero
 */
export const useTreeData = ({ externalHierarchy }: UseTreeDataOptions): UseTreeDataReturn => {
  const [hierarchy, setHierarchy] = useState<RoleHierarchyType>({});
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildTreeStructure = (hierarchyData: RoleHierarchyType): TreeNode[] => {
    // Controllo se hierarchyData è valido
    if (!hierarchyData || typeof hierarchyData !== 'object') {
      return [];
    }

    const nodes: { [key: string]: TreeNode } = {};
    const rootNodes: TreeNode[] = [];

    // Crea tutti i nodi
    Object.entries(hierarchyData).forEach(([roleType, data]) => {
      const node: TreeNode = {
        id: roleType,
        name: data.name,
        description: data.description,
        level: data.level,
        roleType: roleType,
        children: [],
        permissions: data.permissions || [],
        assignableRoles: data.assignableRoles || [],
        parentId: undefined
      };
      nodes[roleType] = node;
    });

    // Determina le relazioni parent-child basandosi sui livelli
    // Un nodo è figlio del nodo di livello immediatamente superiore più vicino
    Object.values(nodes).forEach(node => {
      if (node.level === 0) {
        // Livello 0 è sempre root
        rootNodes.push(node);
      } else {
        // Trova il parent con il livello immediatamente superiore
        const potentialParents = Object.values(nodes).filter(
          parent => parent.level === node.level - 1
        );
        
        if (potentialParents.length > 0) {
          // Se ci sono più potenziali parent dello stesso livello, 
          // usa il primo o implementa una logica più specifica
          const parent = potentialParents[0];
          node.parentId = parent.id;
          parent.children.push(node);
        } else {
          // Se non trova un parent del livello immediatamente superiore,
          // cerca il parent di livello più alto disponibile
          const allPotentialParents = Object.values(nodes).filter(
            parent => parent.level < node.level
          );
          
          if (allPotentialParents.length > 0) {
            // Ordina per livello decrescente e prendi il primo
            allPotentialParents.sort((a, b) => b.level - a.level);
            const parent = allPotentialParents[0];
            node.parentId = parent.id;
            parent.children.push(node);
          } else {
            // Se non trova nessun parent, è un root node
            rootNodes.push(node);
          }
        }
      }
    });

    // Ordina per livello e nome
    const sortNodes = (nodeArray: TreeNode[]) => {
      nodeArray.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
      });
      nodeArray.forEach(node => sortNodes(node.children));
    };

    sortNodes(rootNodes);
    return rootNodes;
  };

  const loadHierarchyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!isAuthenticated()) {
        setError('Accesso non autorizzato. Effettua il login per visualizzare la gerarchia dei ruoli.');
        return;
      }
      
      const hierarchyData = await getRoleHierarchy();
      
      // Controllo se i dati della gerarchia sono validi
      if (!hierarchyData) {
        setError('Nessun dato di gerarchia disponibile. Verifica la configurazione dei ruoli.');
        return;
      }
      
      setHierarchy(hierarchyData);
      
      // Converti i dati della gerarchia in struttura ad albero
      const tree = buildTreeStructure(hierarchyData);
      setTreeData(tree);
      
    } catch (err: unknown) {
      setError('Errore nel caricamento della gerarchia dei ruoli. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (externalHierarchy && Object.keys(externalHierarchy).length > 0) {
      // Usa la gerarchia fornita come prop
      setHierarchy(externalHierarchy);
      const tree = buildTreeStructure(externalHierarchy);
      setTreeData(tree);
      setLoading(false);
    } else {
      // Carica la gerarchia internamente se non fornita
      loadHierarchyData();
    }
  }, [externalHierarchy]);

  return {
    hierarchy,
    treeData,
    loading,
    error,
    reloadHierarchy: loadHierarchyData
  };
};
