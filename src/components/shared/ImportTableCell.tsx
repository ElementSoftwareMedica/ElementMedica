import React from 'react';
import DiffHighlighter from './DiffHighlighter';

interface ImportTableCellProps {
  item: Record<string, any>;
  column: string;
  dbRecord?: Record<string, any> | null;
  fieldMappings?: Record<string, string[]>;
  showDiff?: boolean;
}

/**
 * Componente cella per la tabella di importazione che mostra le differenze
 * tra i dati importati e quelli esistenti nel database
 */
const ImportTableCell: React.FC<ImportTableCellProps> = ({
  item,
  column,
  dbRecord,
  fieldMappings = {},
  showDiff = true
}) => {
  // Se non c'è record DB o non si vuole mostrare le differenze, mostra solo il valore
  if (!dbRecord || !showDiff) {
    return <span>{item[column] !== undefined ? String(item[column]) : ''}</span>;
  }

  // Ottieni il valore importato
  const importValue = item[column];
  
  // Ottieni possibili nomi di campi nel database per questa chiave CSV
  const possibleKeys = fieldMappings[column] || [column];
  
  // Cerca il valore corrispondente nel database
  let dbValue = undefined;
  for (const dbKey of possibleKeys) {
    if (dbRecord[dbKey] !== undefined) {
      dbValue = dbRecord[dbKey];
      break;
    }
  }

  // Mostra il valore con evidenziazione se diverso
  return (
    <DiffHighlighter 
      newValue={importValue} 
      oldValue={dbValue}
      showBoth={true}
    />
  );
};

export default ImportTableCell; 
import DiffHighlighter from './DiffHighlighter';

interface ImportTableCellProps {
  item: Record<string, any>;
  column: string;
  dbRecord?: Record<string, any> | null;
  fieldMappings?: Record<string, string[]>;
  showDiff?: boolean;
}

/**
 * Componente cella per la tabella di importazione che mostra le differenze
 * tra i dati importati e quelli esistenti nel database
 */
const ImportTableCell: React.FC<ImportTableCellProps> = ({
  item,
  column,
  dbRecord,
  fieldMappings = {},
  showDiff = true
}) => {
  // Se non c'è record DB o non si vuole mostrare le differenze, mostra solo il valore
  if (!dbRecord || !showDiff) {
    return <span>{item[column] !== undefined ? String(item[column]) : ''}</span>;
  }

  // Ottieni il valore importato
  const importValue = item[column];
  
  // Ottieni possibili nomi di campi nel database per questa chiave CSV
  const possibleKeys = fieldMappings[column] || [column];
  
  // Cerca il valore corrispondente nel database
  let dbValue = undefined;
  for (const dbKey of possibleKeys) {
    if (dbRecord[dbKey] !== undefined) {
      dbValue = dbRecord[dbKey];
      break;
    }
  }

  // Mostra il valore con evidenziazione se diverso
  return (
    <DiffHighlighter 
      newValue={importValue} 
      oldValue={dbValue}
      showBoth={true}
    />
  );
};

export default ImportTableCell; 
import DiffHighlighter from './DiffHighlighter';

interface ImportTableCellProps {
  item: Record<string, any>;
  column: string;
  dbRecord?: Record<string, any> | null;
  fieldMappings?: Record<string, string[]>;
  showDiff?: boolean;
}

/**
 * Componente cella per la tabella di importazione che mostra le differenze
 * tra i dati importati e quelli esistenti nel database
 */
const ImportTableCell: React.FC<ImportTableCellProps> = ({
  item,
  column,
  dbRecord,
  fieldMappings = {},
  showDiff = true
}) => {
  // Se non c'è record DB o non si vuole mostrare le differenze, mostra solo il valore
  if (!dbRecord || !showDiff) {
    return <span>{item[column] !== undefined ? String(item[column]) : ''}</span>;
  }

  // Ottieni il valore importato
  const importValue = item[column];
  
  // Ottieni possibili nomi di campi nel database per questa chiave CSV
  const possibleKeys = fieldMappings[column] || [column];
  
  // Cerca il valore corrispondente nel database
  let dbValue = undefined;
  for (const dbKey of possibleKeys) {
    if (dbRecord[dbKey] !== undefined) {
      dbValue = dbRecord[dbKey];
      break;
    }
  }

  // Mostra il valore con evidenziazione se diverso
  return (
    <DiffHighlighter 
      newValue={importValue} 
      oldValue={dbValue}
      showBoth={true}
    />
  );
};

export default ImportTableCell; 
import DiffHighlighter from './DiffHighlighter';

interface ImportTableCellProps {
  item: Record<string, any>;
  column: string;
  dbRecord?: Record<string, any> | null;
  fieldMappings?: Record<string, string[]>;
  showDiff?: boolean;
}

/**
 * Componente cella per la tabella di importazione che mostra le differenze
 * tra i dati importati e quelli esistenti nel database
 */
const ImportTableCell: React.FC<ImportTableCellProps> = ({
  item,
  column,
  dbRecord,
  fieldMappings = {},
  showDiff = true
}) => {
  // Se non c'è record DB o non si vuole mostrare le differenze, mostra solo il valore
  if (!dbRecord || !showDiff) {
    return <span>{item[column] !== undefined ? String(item[column]) : ''}</span>;
  }

  // Ottieni il valore importato
  const importValue = item[column];
  
  // Ottieni possibili nomi di campi nel database per questa chiave CSV
  const possibleKeys = fieldMappings[column] || [column];
  
  // Cerca il valore corrispondente nel database
  let dbValue = undefined;
  for (const dbKey of possibleKeys) {
    if (dbRecord[dbKey] !== undefined) {
      dbValue = dbRecord[dbKey];
      break;
    }
  }

  // Mostra il valore con evidenziazione se diverso
  return (
    <DiffHighlighter 
      newValue={importValue} 
      oldValue={dbValue}
      showBoth={true}
    />
  );
};

export default ImportTableCell; 
import DiffHighlighter from './DiffHighlighter';

interface ImportTableCellProps {
  item: Record<string, any>;
  column: string;
  dbRecord?: Record<string, any> | null;
  fieldMappings?: Record<string, string[]>;
  showDiff?: boolean;
}

/**
 * Componente cella per la tabella di importazione che mostra le differenze
 * tra i dati importati e quelli esistenti nel database
 */
const ImportTableCell: React.FC<ImportTableCellProps> = ({
  item,
  column,
  dbRecord,
  fieldMappings = {},
  showDiff = true
}) => {
  // Se non c'è record DB o non si vuole mostrare le differenze, mostra solo il valore
  if (!dbRecord || !showDiff) {
    return <span>{item[column] !== undefined ? String(item[column]) : ''}</span>;
  }

  // Ottieni il valore importato
  const importValue = item[column];
  
  // Ottieni possibili nomi di campi nel database per questa chiave CSV
  const possibleKeys = fieldMappings[column] || [column];
  
  // Cerca il valore corrispondente nel database
  let dbValue = undefined;
  for (const dbKey of possibleKeys) {
    if (dbRecord[dbKey] !== undefined) {
      dbValue = dbRecord[dbKey];
      break;
    }
  }

  // Mostra il valore con evidenziazione se diverso
  return (
    <DiffHighlighter 
      newValue={importValue} 
      oldValue={dbValue}
      showBoth={true}
    />
  );
};

export default ImportTableCell; 