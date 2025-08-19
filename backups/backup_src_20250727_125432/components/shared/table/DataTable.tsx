import React from 'react';
import BaseDataTable, { DataTableColumn } from '../tables/DataTable';

// Re-export del componente DataTable esistente per compatibilità con il path del template GDPR
export { DataTableColumn };
export const DataTable = BaseDataTable;
export default DataTable;