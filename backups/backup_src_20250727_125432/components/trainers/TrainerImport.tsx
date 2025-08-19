import React from 'react';
import GenericImport from '../shared/GenericImport';

interface TrainerImportProps {
  onImport: (trainers: any[], overwriteIds?: string[]) => Promise<void>;
  onClose: () => void;
  existingTrainers?: any[];
}

// Definizione della mappatura dei campi CSV
const csvHeaderMap: Record<string, string> = {
  'Nome': 'nome',
  'Cognome': 'cognome',
  'Codice Fiscale': 'codice_fiscale',
  'Email': 'email',
  'Telefono': 'telefono',
  'Specializzazioni': 'specialties',
  'Tariffa Oraria': 'tariffa_oraria',
  'Indirizzo': 'indirizzo',
  'Città': 'citta',
  'Provincia': 'provincia',
  'CAP': 'cap',
  'Data Nascita': 'data_nascita',
  'Luogo Nascita': 'luogo_nascita',
  'Note': 'note',
};

// Validazione personalizzata per i formatori
const validateTrainer = (trainer: any): string[] => {
  const errors: string[] = [];
  
  if (!trainer.nome) {
    errors.push('Nome obbligatorio');
  }
  
  if (!trainer.cognome) {
    errors.push('Cognome obbligatorio');
  }
  
  if (!trainer.codice_fiscale) {
    errors.push('Codice Fiscale obbligatorio');
  } else if (trainer.codice_fiscale.length !== 16) {
    errors.push('Codice Fiscale deve essere di 16 caratteri');
  }
  
  if (trainer.tariffa_oraria && isNaN(Number(trainer.tariffa_oraria))) {
    errors.push('Tariffa oraria deve essere un numero');
  }
  
  return errors;
};

/**
 * Componente per l'importazione di formatori da file CSV
 */
const TrainerImport: React.FC<TrainerImportProps> = ({
  onImport,
  onClose,
  existingTrainers = []
}) => {
  return (
    <GenericImport
      entityType="formatori"
      uniqueField="codice_fiscale"
      onImport={onImport}
      onClose={onClose}
      existingEntities={existingTrainers}
      csvHeaderMap={csvHeaderMap}
      title="Importa Formatori"
      subtitle="Carica un file CSV con i dati dei formatori da importare"
      customValidation={validateTrainer}
      csvDelimiter=";"
    />
  );
};

export default TrainerImport; 