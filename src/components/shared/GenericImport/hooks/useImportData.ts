/**
 * @file useImportData.ts
 * @description Hook for CSV file processing and data loading
 */

import { useState, useCallback } from 'react';
import { defaultProcessFile, normalizeItemFields, normalizeString } from '../utils/csvHelpers';
import { normalizeCourseFields } from '../utils/validationHelpers';

interface UseImportDataProps<T> {
  entityType: string;
  uniqueField: keyof T | string;
  existingEntities: T[];
  csvHeaderMap: Record<string, string>;
  csvDelimiter: string;
  customProcessFile?: (file: File) => Promise<any[]>;
  normalizeKey?: (value: any) => string;
  initialPreviewData?: any[];
}

export const useImportData = <T extends Record<string, any>>({
  entityType,
  uniqueField,
  existingEntities,
  csvHeaderMap,
  csvDelimiter,
  customProcessFile,
  normalizeKey,
  initialPreviewData,
}: UseImportDataProps<T>) => {
  const [previewData, setPreviewData] = useState<any[]>(initialPreviewData || []);
  const norm = normalizeKey || normalizeString;

  /**
   * Process uploaded CSV file
   */
  const processFile = useCallback(async (file: File): Promise<any[]> => {
    // Use custom processor if provided
    if (customProcessFile) {
      const data = await customProcessFile(file);
      setPreviewData(data);
      return data;
    }
    
    // Default CSV processing
    const mappedEntities = await defaultProcessFile(file, csvHeaderMap, csvDelimiter);

    // Add IDs of existing entities for merge-based import
    const processedData = mappedEntities.map(entity => {
      if (!entity[String(uniqueField)]) return entity;
      
      // Normalize unique field value for comparison
      const normalizedValue = norm(entity[String(uniqueField)]);
      
      // Find existing entity with same normalized unique field
      const existingEntity = existingEntities.find(existing => {
        const existingValue = existing[uniqueField];
        const existingNormalizedValue = norm(existingValue as any);
        return existingNormalizedValue === normalizedValue;
      });
      
      if (existingEntity) {
        // Keep original ID to allow overwrite
        return { ...entity, id: existingEntity.id, _isExisting: true };
      }
      
      return entity;
    });
    
    setPreviewData(processedData);
    return processedData;
  }, [customProcessFile, csvHeaderMap, csvDelimiter, existingEntities, uniqueField, norm]);

  /**
   * Process and classify import data
   */
  const processImportData = useCallback((
    dataToProcess: any[],
    idsToOverwrite: string[]
  ) => {
    const newEntities: any[] = [];
    const updateEntities: any[] = [];
    const skippedEntities: any[] = [];
    const finalPayload: any[] = [];
    
    // Create map for faster lookups
    const existingEntitiesMap = new Map(
      existingEntities
        .filter(entity => entity[uniqueField as keyof T] !== undefined && entity[uniqueField as keyof T] !== null)
        .map(entity => [
          norm(entity[uniqueField as keyof T] as any),
          entity
        ])
    );
    
    // Process each entity
    for (let i = 0; i < dataToProcess.length; i++) {
      try {
        // Normalize fields according to CSV mapping
        const rawData = dataToProcess[i];
        const cleanData: Record<string, any> = normalizeItemFields(rawData, csvHeaderMap);
        
        // Special handling for courses
        if (entityType === 'corsi') {
          Object.assign(cleanData, normalizeCourseFields(cleanData));
        }

        // Check if entity exists based on unique field
        let existingEntity = null;
        const uniqueFieldStr = String(uniqueField);
        const uniqueValue = cleanData[uniqueFieldStr];
        
        if (uniqueValue !== undefined && uniqueValue !== null && uniqueValue !== '') {
          const uniqueValueNormalized = norm(uniqueValue as any);
          existingEntity = existingEntitiesMap.get(uniqueValueNormalized);
          
          if (existingEntity) {
            if (idsToOverwrite.includes(existingEntity.id)) {
              // Add existing ID to identify update
              cleanData.id = existingEntity.id;
              updateEntities.push(cleanData);
              finalPayload.push(cleanData);
            } else {
              // Skip entity (don't overwrite)
              skippedEntities.push(cleanData);
            }
          } else {
            // No existing entity with this unique value, add as new
            newEntities.push(cleanData);
            finalPayload.push(cleanData);
          }
        } else {
          // Unique field missing or empty, treat as new entity
          newEntities.push(cleanData);
          finalPayload.push(cleanData);
        }
      } catch (error) {
        // Ignore errors and continue with next entity
      }
    }
    
    return {
      newEntities,
      updateEntities,
      skippedEntities,
      finalPayload,
      idsToOverwrite,
    };
  }, [entityType, existingEntities, uniqueField, csvHeaderMap, norm]);

  /**
   * Update preview data (e.g., from parent component)
   */
  const updatePreviewData = useCallback((data: any[]) => {
    setPreviewData([...data]);
  }, []);

  return {
    previewData,
    processFile,
    processImportData,
    updatePreviewData,
    setPreviewData,
  };
};
