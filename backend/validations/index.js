/**
 * Index Validazioni Modulari
 * Generato automaticamente dalla Fase 8
 */

import coreValidations from './modules/core.js';
import usersValidations from './modules/users.js';
import companiesValidations from './modules/companies.js';
import coursesValidations from './modules/courses.js';
import attendanceValidations from './modules/attendance.js';
import documentsValidations from './modules/documents.js';
import billingValidations from './modules/billing.js';
import testingValidations from './modules/testing.js';
import auditValidations from './modules/audit.js';
import monitoringValidations from './modules/monitoring.js';

// === EXPORT UNIFICATO ===

export {
  coreValidations,
  usersValidations,
  companiesValidations,
  coursesValidations,
  attendanceValidations,
  documentsValidations,
  billingValidations,
  testingValidations,
  auditValidations,
  monitoringValidations
};

// === UTILITY FUNCTIONS ===

export function getValidationForModel(modelName) {
  const validationMap = {
    'Tenant': coreValidations.TenantSchema,
    'TenantConfiguration': coreValidations.TenantConfigurationSchema,
    'Permission': coreValidations.PermissionSchema,
    'RefreshToken': coreValidations.RefreshTokenSchema,
    'Person': usersValidations.PersonSchema,
    'PersonRole': usersValidations.PersonRoleSchema,
    'PersonSession': usersValidations.PersonSessionSchema,
    'CustomRole': usersValidations.CustomRoleSchema,
    'Company': companiesValidations.CompanySchema,
    'ScheduleCompany': companiesValidations.ScheduleCompanySchema,
    'Course': coursesValidations.CourseSchema,
    'CourseSchedule': coursesValidations.CourseScheduleSchema,
    'CourseEnrollment': coursesValidations.CourseEnrollmentSchema,
    'CourseSession': coursesValidations.CourseSessionSchema,
    'RegistroPresenze': attendanceValidations.RegistroPresenzeSchema,
    'RegistroPresenzePartecipante': attendanceValidations.RegistroPresenzePartecipanteSchema,
    'Attestato': documentsValidations.AttestatoSchema,
    'LetteraIncarico': documentsValidations.LetteraIncaricoSchema,
    'TemplateLink': documentsValidations.TemplateLinkSchema,
    'Preventivo': billingValidations.PreventivoSchema,
    'PreventivoPartecipante': billingValidations.PreventivoPartecipanteSchema,
    'Fattura': billingValidations.FatturaSchema,
    'TestDocument': testingValidations.TestDocumentSchema,
    'TestPartecipante': testingValidations.TestPartecipanteSchema,
    'ActivityLog': auditValidations.ActivityLogSchema,
    'GdprAuditLog': auditValidations.GdprAuditLogSchema,
    'ConsentRecord': auditValidations.ConsentRecordSchema,
    'TenantUsage': monitoringValidations.TenantUsageSchema
  };
  
  return validationMap[modelName];
}

export function validateModel(modelName, data) {
  const schema = getValidationForModel(modelName);
  if (!schema) {
    throw new Error(`No validation schema found for model: ${modelName}`);
  }
  
  return schema.parse(data);
}

export default {
  core: coreValidations,
  users: usersValidations,
  companies: companiesValidations,
  courses: coursesValidations,
  attendance: attendanceValidations,
  documents: documentsValidations,
  billing: billingValidations,
  testing: testingValidations,
  audit: auditValidations,
  monitoring: monitoringValidations,
  getValidationForModel,
  validateModel
};
