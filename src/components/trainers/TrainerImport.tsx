import React from 'react';
import GenericImport, { defaultProcessFile } from '../shared/GenericImport';

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
  'Stato': 'status',
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
  
  // Validazione del campo status
  if (trainer.status) {
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING'];
    const upperStatusValue = trainer.status.toString().trim().toUpperCase();
    if (!validStatuses.includes(upperStatusValue)) {
      errors.push(`Stato non valido: ${trainer.status}. Valori consentiti: ${validStatuses.join(', ')}`);
    }
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
  // Funzione personalizzata per processare il file CSV
  const customProcessFile = async (file: File): Promise<any[]> => {
    // Processa il file e ottieni i dati grezzi
    const processedData = await defaultProcessFile(file, csvHeaderMap);
    
    // Processa ogni riga per gestire il campo status
    const processedRows = processedData.map((trainer: any) => {
      // Gestione speciale per il campo status
      if (trainer.status !== undefined) {
        const statusValue = trainer.status?.toString().trim();
        if (!statusValue || statusValue === '') {
          trainer.status = 'ACTIVE';
        } else {
          // Verifica che il valore sia uno dei valori validi dell'enum PersonStatus
          const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING'];
          const upperStatusValue = statusValue.toUpperCase();
          if (validStatuses.includes(upperStatusValue)) {
            trainer.status = upperStatusValue;
          } else {
    
            trainer.status = 'ACTIVE';
          }
        }
      } else {
        // Se il campo status non è presente nel CSV, imposta il default
        trainer.status = 'ACTIVE';
      }
      
      return trainer;
    });
    
    return processedRows;
  };

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
      customProcessFile={customProcessFile}
    />
  );
};

export default TrainerImport;