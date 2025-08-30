import React from 'react';

interface DiffHighlighterProps {
  newValue: any;
  oldValue: any;
  showBoth?: boolean;
}

/**
 * Componente che evidenzia le differenze tra due valori
 * mostrando il valore nuovo evidenziato se diverso dal valore esistente
 */
const DiffHighlighter: React.FC<DiffHighlighterProps> = ({
  newValue,
  oldValue,
  showBoth = false
}) => {
  // Se i valori sono identici o non ci sono differenze, mostra solo il valore nuovo
  if (newValue === oldValue || 
      (newValue === undefined && oldValue === undefined) || 
      (newValue === null && oldValue === null) ||
      (newValue === '' && oldValue === '')) {
    return <span>{newValue !== undefined && newValue !== null ? String(newValue) : ''}</span>;
  }

  // Normalizza i valori per il confronto
  const normalizedNewValue = newValue !== undefined && newValue !== null ? String(newValue) : '';
  const normalizedOldValue = oldValue !== undefined && oldValue !== null ? String(oldValue) : '';

  // Se ci sono differenze, evidenzia il valore nuovo
  return (
    <div className="flex flex-col">
      <span className="bg-yellow-100 text-yellow-800 px-1 rounded">
        {normalizedNewValue}
      </span>
      {showBoth && oldValue !== undefined && oldValue !== null && oldValue !== '' && (
        <span className="text-xs text-gray-500 mt-1">
          Attuale: {normalizedOldValue}
        </span>
      )}
    </div>
  );
};

export default DiffHighlighter; 

interface DiffHighlighterProps {
  newValue: any;
  oldValue: any;
  showBoth?: boolean;
}

/**
 * Componente che evidenzia le differenze tra due valori
 * mostrando il valore nuovo evidenziato se diverso dal valore esistente
 */
const DiffHighlighter: React.FC<DiffHighlighterProps> = ({
  newValue,
  oldValue,
  showBoth = false
}) => {
  // Se i valori sono identici o non ci sono differenze, mostra solo il valore nuovo
  if (newValue === oldValue || 
      (newValue === undefined && oldValue === undefined) || 
      (newValue === null && oldValue === null) ||
      (newValue === '' && oldValue === '')) {
    return <span>{newValue !== undefined && newValue !== null ? String(newValue) : ''}</span>;
  }

  // Normalizza i valori per il confronto
  const normalizedNewValue = newValue !== undefined && newValue !== null ? String(newValue) : '';
  const normalizedOldValue = oldValue !== undefined && oldValue !== null ? String(oldValue) : '';

  // Se ci sono differenze, evidenzia il valore nuovo
  return (
    <div className="flex flex-col">
      <span className="bg-yellow-100 text-yellow-800 px-1 rounded">
        {normalizedNewValue}
      </span>
      {showBoth && oldValue !== undefined && oldValue !== null && oldValue !== '' && (
        <span className="text-xs text-gray-500 mt-1">
          Attuale: {normalizedOldValue}
        </span>
      )}
    </div>
  );
};

export default DiffHighlighter; 

interface DiffHighlighterProps {
  newValue: any;
  oldValue: any;
  showBoth?: boolean;
}

/**
 * Componente che evidenzia le differenze tra due valori
 * mostrando il valore nuovo evidenziato se diverso dal valore esistente
 */
const DiffHighlighter: React.FC<DiffHighlighterProps> = ({
  newValue,
  oldValue,
  showBoth = false
}) => {
  // Se i valori sono identici o non ci sono differenze, mostra solo il valore nuovo
  if (newValue === oldValue || 
      (newValue === undefined && oldValue === undefined) || 
      (newValue === null && oldValue === null) ||
      (newValue === '' && oldValue === '')) {
    return <span>{newValue !== undefined && newValue !== null ? String(newValue) : ''}</span>;
  }

  // Normalizza i valori per il confronto
  const normalizedNewValue = newValue !== undefined && newValue !== null ? String(newValue) : '';
  const normalizedOldValue = oldValue !== undefined && oldValue !== null ? String(oldValue) : '';

  // Se ci sono differenze, evidenzia il valore nuovo
  return (
    <div className="flex flex-col">
      <span className="bg-yellow-100 text-yellow-800 px-1 rounded">
        {normalizedNewValue}
      </span>
      {showBoth && oldValue !== undefined && oldValue !== null && oldValue !== '' && (
        <span className="text-xs text-gray-500 mt-1">
          Attuale: {normalizedOldValue}
        </span>
      )}
    </div>
  );
};

export default DiffHighlighter; 

interface DiffHighlighterProps {
  newValue: any;
  oldValue: any;
  showBoth?: boolean;
}

/**
 * Componente che evidenzia le differenze tra due valori
 * mostrando il valore nuovo evidenziato se diverso dal valore esistente
 */
const DiffHighlighter: React.FC<DiffHighlighterProps> = ({
  newValue,
  oldValue,
  showBoth = false
}) => {
  // Se i valori sono identici o non ci sono differenze, mostra solo il valore nuovo
  if (newValue === oldValue || 
      (newValue === undefined && oldValue === undefined) || 
      (newValue === null && oldValue === null) ||
      (newValue === '' && oldValue === '')) {
    return <span>{newValue !== undefined && newValue !== null ? String(newValue) : ''}</span>;
  }

  // Normalizza i valori per il confronto
  const normalizedNewValue = newValue !== undefined && newValue !== null ? String(newValue) : '';
  const normalizedOldValue = oldValue !== undefined && oldValue !== null ? String(oldValue) : '';

  // Se ci sono differenze, evidenzia il valore nuovo
  return (
    <div className="flex flex-col">
      <span className="bg-yellow-100 text-yellow-800 px-1 rounded">
        {normalizedNewValue}
      </span>
      {showBoth && oldValue !== undefined && oldValue !== null && oldValue !== '' && (
        <span className="text-xs text-gray-500 mt-1">
          Attuale: {normalizedOldValue}
        </span>
      )}
    </div>
  );
};

export default DiffHighlighter; 

interface DiffHighlighterProps {
  newValue: any;
  oldValue: any;
  showBoth?: boolean;
}

/**
 * Componente che evidenzia le differenze tra due valori
 * mostrando il valore nuovo evidenziato se diverso dal valore esistente
 */
const DiffHighlighter: React.FC<DiffHighlighterProps> = ({
  newValue,
  oldValue,
  showBoth = false
}) => {
  // Se i valori sono identici o non ci sono differenze, mostra solo il valore nuovo
  if (newValue === oldValue || 
      (newValue === undefined && oldValue === undefined) || 
      (newValue === null && oldValue === null) ||
      (newValue === '' && oldValue === '')) {
    return <span>{newValue !== undefined && newValue !== null ? String(newValue) : ''}</span>;
  }

  // Normalizza i valori per il confronto
  const normalizedNewValue = newValue !== undefined && newValue !== null ? String(newValue) : '';
  const normalizedOldValue = oldValue !== undefined && oldValue !== null ? String(oldValue) : '';

  // Se ci sono differenze, evidenzia il valore nuovo
  return (
    <div className="flex flex-col">
      <span className="bg-yellow-100 text-yellow-800 px-1 rounded">
        {normalizedNewValue}
      </span>
      {showBoth && oldValue !== undefined && oldValue !== null && oldValue !== '' && (
        <span className="text-xs text-gray-500 mt-1">
          Attuale: {normalizedOldValue}
        </span>
      )}
    </div>
  );
};

export default DiffHighlighter; 