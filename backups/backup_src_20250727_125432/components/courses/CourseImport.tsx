import React, { useState } from 'react';
import GenericImport, { defaultProcessFile } from '../shared/GenericImport';
import { applyTitleCaseToFields } from '../../utils/textFormatters';
import type { Course } from '../../types/courses';
import { useToast } from '../../hooks/useToast';

interface CourseImportProps {
  onImport: (courses: any[], overwriteIds?: string[]) => Promise<void>;
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
const normalizeNumericValue = (value: any): string => {
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
const validateCourse = (course: any): string[] => {
  const errors: string[] = [];
  
  if (!course.title) {
    errors.push('Nome del corso obbligatorio');
  }
  
  // Verifica per i campi numerici
  numericFields.forEach(field => {
    if (course[field] && isNaN(Number(normalizeNumericValue(course[field])))) {
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
  const customProcessFile = async (file: File): Promise<any[]> => {
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
        if (course.code) {
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
  const handleImport = async (data: any[], overwriteIds?: string[]): Promise<void> => {
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
        const cleanCourse: Record<string, any> = {};
        
        // Copy all non-numeric fields as is
        Object.keys(course).forEach(key => {
          if (key !== 'validityYears' && 
              key !== 'price' && 
              key !== 'pricePerPerson' && 
              key !== 'maxPeople') {
            cleanCourse[key] = course[key];
          }
        });
        
        // Handle numeric fields explicitly
        // validityYears: MUST be a number for Prisma
        if (course.validityYears !== undefined) {
          const validityYearsStr = String(course.validityYears);
          const cleanValidityYears = validityYearsStr.replace(/[^\d]/g, '');
          cleanCourse.validityYears = cleanValidityYears ? parseInt(cleanValidityYears, 10) : null;
        }
        
        // duration: String in the DB, but needs to be a valid number string
        if (course.duration !== undefined) {
          cleanCourse.duration = String(course.duration).replace(/[^\d]/g, '');
        }
        
        // price: Should be a number
        if (course.price !== undefined) {
          const priceStr = String(course.price);
          const cleanPrice = priceStr.replace(/[^\d.]/g, '');
          cleanCourse.price = cleanPrice ? parseFloat(cleanPrice) : null;
        }
        
        // pricePerPerson: Should be a number
        if (course.pricePerPerson !== undefined) {
          const pricePerPersonStr = String(course.pricePerPerson);
          const cleanPricePerPerson = pricePerPersonStr.replace(/[^\d.]/g, '');
          cleanCourse.pricePerPerson = cleanPricePerPerson ? parseFloat(cleanPricePerPerson) : null;
        }
        
        // maxPeople: Should be a number
        if (course.maxPeople !== undefined) {
          const maxPeopleStr = String(course.maxPeople);
          const cleanMaxPeople = maxPeopleStr.replace(/[^\d]/g, '');
          cleanCourse.maxPeople = cleanMaxPeople ? parseInt(cleanMaxPeople, 10) : null;
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