import React, { useState } from 'react';
import GenericImport, { defaultProcessFile } from '../shared/GenericImport';
import { applyTitleCaseToFields } from '../../utils/textFormatters';
import type { Course } from '../../types/courses';
import { useToast } from '../../hooks/useToast';

interface CourseImportData extends Partial<Course> {
  _isExisting?: boolean;
}

interface CourseImportProps {
  onImport: (courses: CourseImportData[], overwriteIds?: string[]) => Promise<void>;
  onClose: () => void;
  existingCourses?: Course[];
}

// Definizione della mappatura dei campi CSV
const csvHeaderMap: Record<string, string> = {
  'Corso': 'title',
  'DurataCorso': 'duration',
  'AnniValidita': 'validityYears',
  'DurataCorsoAggiornamento': 'renewalDuration',
  'EuroPersona': 'pricePerPerson',
  'Certificazioni': 'certifications',
  'MaxPersone': 'maxPeople',
  'Normativa': 'regulation',
  'Contenuti': 'contents',
  'Codice': 'code',
  'Descrizione': 'description',
  'Categoria': 'category',
};

// Campi da formattare in title case
const titleCaseFields = [
  'title',
  'description',
  'category'
];

// Campi numerici che richiedono conversione
const numericFields = [
  'duration',
  'validityYears',
  'pricePerPerson',
  'maxPeople',
  'price'
];

// Normalizza un valore numerico, gestendo vari formati di input
const normalizeNumericValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  
  // Converti in stringa
  let strValue = String(value).trim();
  
  // Gestisci formati con virgola come separatore decimale (es. "1,5")
  if (/^\d+,\d+$/.test(strValue)) {
    strValue = strValue.replace(',', '.');
  }
  
  // Rimuovi caratteri non numerici (eccetto punto decimale)
  strValue = strValue.replace(/[^\d.]/g, '');
  
  return strValue;
};

// Validazione personalizzata per i corsi
const validateCourse = (course: CourseImportData): string[] => {
  const errors: string[] = [];
  
  if (!course.title || (typeof course.title === 'string' && course.title.trim() === '')) {
    errors.push('Il titolo del corso è obbligatorio');
  }
  
  if (!course.code || (typeof course.code === 'string' && course.code.trim() === '')) {
    errors.push('Il codice del corso è obbligatorio');
  }
  
  // Verifica per i campi numerici
  numericFields.forEach(field => {
    if (course[field as keyof CourseImportData] && isNaN(Number(normalizeNumericValue(course[field as keyof CourseImportData])))) {
      errors.push(`${field} deve essere un numero`);
    }
  });
  
  return errors;
};

/**
 * Componente per l'importazione di corsi da file CSV
 */
const CourseImport: React.FC<CourseImportProps> = ({
  onImport,
  onClose,
  existingCourses = []
}) => {
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Funzione personalizzata per processare il file CSV
  const customProcessFile = async (file: File): Promise<CourseImportData[]> => {
    try {
      // Processa il file e ottieni i dati grezzi
      const processedData = await defaultProcessFile(file, csvHeaderMap);
      
      // Converti i campi numerici in formato standard
      const dataWithNormalizedNumbers = processedData.map(course => {
        const normalized = { ...course };
        
        // Normalizza i campi numerici
        numericFields.forEach(field => {
          if (normalized[field] !== undefined && normalized[field] !== null && normalized[field] !== '') {
            const normalizedValue = normalizeNumericValue(normalized[field]);
            if (normalizedValue && !isNaN(Number(normalizedValue))) {
              normalized[field] = normalizedValue;
            }
          }
        });
        
        return normalized;
      });
      
      // Applica il Title Case ai campi specificati
      const formattedData = dataWithNormalizedNumbers.map(course => {
        // Crea una copia dell'oggetto corso
        return applyTitleCaseToFields({ ...course }, titleCaseFields);
      });
      
      // Cerca corrispondenze con corsi esistenti tramite il codice (uniqueField)
      const dataWithIds = formattedData.map(course => {
        // Se il corso ha un codice, cerca corrispondenze
        if (course.code && typeof course.code === 'string') {
          const normalizedCode = course.code.trim().toLowerCase();
          const existingByCode = existingCourses?.find(existing => 
            existing.code && existing.code.trim().toLowerCase() === normalizedCode
          );
          
          if (existingByCode) {
            return { ...course, id: existingByCode.id, _isExisting: true };
          }
        }
        
        return course;
      });
      
      return dataWithIds;
    } catch (error) {
      showToast({
        message: `Errore durante il processing del file: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        type: 'error'
      });
      throw error;
    }
  };

  // Handler personalizzato per l'importazione
  const handleImport = async (data: CourseImportData[], overwriteIds?: string[]): Promise<void> => {
    if (isProcessing) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Verifica che i dati siano validi
      if (!Array.isArray(data) || data.length === 0) {
        showToast({
          message: "Nessun dato da importare",
          type: "warning"
        });
        setIsProcessing(false);
        return;
      }
      
      // Processa i dati per assicurarsi che i campi numerici siano numeri
      const processedData = data.map(course => {
        // Create completely new object to avoid reference issues
        const cleanCourse: Partial<Course> = {};
        
        // Copy all non-numeric fields as is
        Object.keys(course).forEach(key => {
          if (key !== 'validityYears' && 
              key !== 'price' && 
              key !== 'pricePerPerson' && 
              key !== 'maxPeople') {
            (cleanCourse as Record<string, unknown>)[key] = (course as Record<string, unknown>)[key];
          }
        });
        
        // Handle numeric fields with proper null checking
         if (course.validityYears !== undefined && course.validityYears !== null) {
           const numValue = parseFloat(String(course.validityYears));
           cleanCourse.validityYears = isNaN(numValue) ? undefined : numValue;
         }
         
         if (course.duration !== undefined && course.duration !== null) {
           cleanCourse.duration = String(course.duration).replace(/[^\d]/g, '');
         }
         
         if (course.price !== undefined && course.price !== null) {
           const numValue = parseFloat(String(course.price));
           cleanCourse.price = isNaN(numValue) ? undefined : numValue;
         }
         
         if (course.pricePerPerson !== undefined && course.pricePerPerson !== null) {
           const numValue = parseFloat(String(course.pricePerPerson));
           cleanCourse.pricePerPerson = isNaN(numValue) ? undefined : numValue;
         }
         
         if (course.maxPeople !== undefined && course.maxPeople !== null) {
           const numValue = parseFloat(String(course.maxPeople));
           cleanCourse.maxPeople = isNaN(numValue) ? undefined : numValue;
         }
        
        // renewalDuration should remain a string
        if (course.renewalDuration !== undefined) {
          cleanCourse.renewalDuration = String(course.renewalDuration);
        }
        
        return cleanCourse;
      });
      
      // Passa i dati processati alla funzione di import
      await onImport(processedData, overwriteIds);
      
      showToast({
        message: "Importazione completata con successo",
        type: "success"
      });
      
      onClose();
    } catch (error) {
      showToast({
        message: `Errore durante l'importazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        type: "error"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <GenericImport
      entityType="corsi"
      uniqueField="code"
      onImport={handleImport}
      onClose={onClose}
      existingEntities={existingCourses || []}
      csvHeaderMap={csvHeaderMap}
      title="Importa Corsi"
      subtitle="Carica un file CSV con i dati dei corsi da importare"
      customValidation={validateCourse}
      csvDelimiter=";"
      customProcessFile={customProcessFile}
    />
  );
};

export default CourseImport;