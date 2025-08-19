import { Template } from '../../../types/template';

/**
 * Function to merge local and server templates, giving priority to newer versions
 */
export const mergeTemplates = (localTemplates: Template[], serverTemplates: Template[]): Template[] => {
  const mergedMap = new Map<string, Template>();
  
  // Add all server templates first
  serverTemplates.forEach(template => {
    mergedMap.set(template.id, {...template, source: 'server'});
  });
  
  // Then add/override with local templates that don't exist on server or are newer
  localTemplates.forEach(localTemplate => {
    // For temp/local templates without a server counterpart
    if (localTemplate.id.startsWith('temp_') || localTemplate.id.startsWith('local_')) {
      mergedMap.set(localTemplate.id, {...localTemplate, source: 'local'});
    } else {
      // For templates that exist on both server and local
      const existingTemplate = mergedMap.get(localTemplate.id);
      if (!existingTemplate || (localTemplate.updatedAt && existingTemplate.updatedAt && 
          new Date(localTemplate.updatedAt) > new Date(existingTemplate.updatedAt))) {
        mergedMap.set(localTemplate.id, {...localTemplate, source: 'local'});
      }
    }
  });
  
  return Array.from(mergedMap.values());
};

/**
 * Filter templates by type
 */
export const getTemplatesByType = (templates: Template[], templateType: string): Template[] => {
  return templates.filter(t => t.type === templateType);
};