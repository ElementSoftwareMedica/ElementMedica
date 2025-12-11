import React from 'react';
import { Select } from '../../design-system/atoms/Select/Select';
import { HelpCircle } from 'lucide-react';
import { 
  getFieldTypeIcon, 
  getFieldTypeLabel, 
  FIELD_TYPE_GROUPS 
} from '../../utils/formFieldIcons';

export interface FieldTypeInfo {
  value: string;
  label: string;
  description: string;
  hasOptions: boolean; // Se richiede FieldOptionsEditor
  supportCapacityLimit: boolean; // Se supporta limiti di capacità
  supportCorrectAnswer: boolean; // Se supporta quiz/test
  supportScoring: boolean; // Se supporta punti
  icon?: string;
}

export const FIELD_TYPES: FieldTypeInfo[] = [
  {
    value: 'text',
    label: 'Testo breve',
    description: 'Campo testo singola riga',
    hasOptions: false,
    supportCapacityLimit: false,
    supportCorrectAnswer: false,
    supportScoring: false,
    icon: '📝'
  },
  {
    value: 'email',
    label: 'Email',
    description: 'Campo email con validazione',
    hasOptions: false,
    supportCapacityLimit: false,
    supportCorrectAnswer: false,
    supportScoring: false,
    icon: '📧'
  },
  {
    value: 'tel',
    label: 'Telefono',
    description: 'Numero di telefono',
    hasOptions: false,
    supportCapacityLimit: false,
    supportCorrectAnswer: false,
    supportScoring: false,
    icon: '📞'
  },
  {
    value: 'textarea',
    label: 'Testo lungo',
    description: 'Area di testo multi-riga',
    hasOptions: false,
    supportCapacityLimit: false,
    supportCorrectAnswer: false,
    supportScoring: false,
    icon: '📄'
  },
  {
    value: 'number',
    label: 'Numero',
    description: 'Campo numerico',
    hasOptions: false,
    supportCapacityLimit: false,
    supportCorrectAnswer: false,
    supportScoring: false,
    icon: '🔢'
  },
  {
    value: 'date',
    label: 'Data',
    description: 'Selezione data',
    hasOptions: false,
    supportCapacityLimit: false,
    supportCorrectAnswer: false,
    supportScoring: false,
    icon: '📅'
  },
  {
    value: 'select',
    label: 'Menu a tendina',
    description: 'Selezione singola da lista (dropdown)',
    hasOptions: true,
    supportCapacityLimit: true, // Es. posti disponibili per data
    supportCorrectAnswer: false,
    supportScoring: false,
    icon: '⬇️'
  },
  {
    value: 'radio',
    label: 'Scelta singola (Radio)',
    description: 'Opzioni visibili, una sola selezione',
    hasOptions: true,
    supportCapacityLimit: false,
    supportCorrectAnswer: true, // Per quiz
    supportScoring: true,
    icon: '🔘'
  },
  {
    value: 'checkbox',
    label: 'Scelta multipla (Checkbox)',
    description: 'Opzioni visibili, selezione multipla',
    hasOptions: true,
    supportCapacityLimit: false,
    supportCorrectAnswer: true, // Per quiz (multiple corrette)
    supportScoring: true,
    icon: '☑️'
  },
  {
    value: 'multiple_choice',
    label: 'Domanda Quiz',
    description: 'Domanda quiz con risposta corretta unica',
    hasOptions: true,
    supportCapacityLimit: false,
    supportCorrectAnswer: true, // Sempre per quiz
    supportScoring: true, // Sempre per quiz
    icon: '❓'
  },
  {
    value: 'file',
    label: 'Caricamento file',
    description: 'Upload file/documento',
    hasOptions: false,
    supportCapacityLimit: false,
    supportCorrectAnswer: false,
    supportScoring: false,
    icon: '📎'
  }
];

interface FieldTypeSelectorProps {
  value: string;
  onChange: (type: string) => void;
  showDescription?: boolean;
}

/**
 * Componente per selezionare tipo di campo con info aggiuntive
 */
export const FieldTypeSelector: React.FC<FieldTypeSelectorProps> = ({
  value,
  onChange,
  showDescription = false
}) => {
  const selectedType = FIELD_TYPES.find(t => t.value === value);

  return (
    <div className="space-y-2">
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={FIELD_TYPES.map(type => ({
          value: type.value,
          label: getFieldTypeLabel(type.value as any) || type.label
        }))}
      />

      {/* Info box removed per user request */}
    </div>
  );
};

/**
 * Utility per ottenere info tipo campo
 */
export const getFieldTypeInfo = (type: string): FieldTypeInfo | undefined => {
  return FIELD_TYPES.find(t => t.value === type);
};

export default FieldTypeSelector;
