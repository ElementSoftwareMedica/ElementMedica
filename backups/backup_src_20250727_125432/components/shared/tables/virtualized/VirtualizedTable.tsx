// COMPONENTE TEMPORANEAMENTE DISABILITATO
// Questo componente dipende da react-window che non è installato
// e non è attualmente utilizzato nel progetto

// Esporto solo le interfacce necessarie per evitare errori di importazione
export interface VirtualizedTableColumn<T = any> {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  sortKey?: string;
  renderHeader?: (col: VirtualizedTableColumn<T>) => React.ReactNode;
  renderCell?: (row: T, rowIndex: number) => React.ReactNode;
}

const VirtualizedTable = () => {
  return <div>VirtualizedTable component is temporarily disabled</div>;
};

export default VirtualizedTable;