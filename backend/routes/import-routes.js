/**
 * @file import-routes.js
 * @description Routes per gestione import CSV (Company, Employee, Trainer)
 * Espone i services CompanyImportService, EmployeeImportService, TrainerImportService
 */

import express from 'express';
import middleware from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import CompanyImportService from '../services/import/company/CompanyImportService.js';
import EmployeeImportService from '../services/import/employee/EmployeeImportService.js';
import TrainerImportService from '../services/import/trainer/TrainerImportService.js';

const router = express.Router();
const { authenticate: authenticateToken, requirePermission } = middleware;

// ===== COMPANY IMPORT ROUTES =====

/**
 * POST /api/import/companies/validate
 * Valida aziende da CSV senza importare
 */
router.post('/companies/validate',
  authenticateToken,
  requirePermission('companies:import'),
  auditLog('VALIDATE_COMPANY_IMPORT'),
  async (req, res) => {
    try {
      const { companies } = req.body;
      const tenantId = getEffectiveTenantId(req);

      if (!companies || !Array.isArray(companies)) {
        return res.status(400).json({
          success: false,
          message: 'Array companies richiesto'
        });
      }

      // Valida companies
      const validation = await CompanyImportService.validateCompanies(companies, tenantId);

      // Rileva duplicati e conflitti
      const { duplicates, conflicts } = await CompanyImportService.detectDuplicatesAndConflicts(
        validation.validatedCompanies,
        tenantId
      );

      logger.info('[IMPORT_ROUTES] Company validation completed', {
        total: companies.length,
        valid: validation.validatedCompanies.length,
        errors: validation.errors.length,
        duplicates: duplicates.length,
        conflicts: conflicts.size,
        tenantId
      });

      res.json({
        success: validation.valid,
        total: companies.length,
        valid: validation.validatedCompanies.length,
        errors: validation.errors,
        duplicates,
        conflicts: Array.from(conflicts.entries()).map(([index, conflict]) => ({
          index,
          ...conflict
        }))
      });
    } catch (error) {
      logger.error('[IMPORT_ROUTES] Company validation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Errore durante validazione',
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * POST /api/import/companies
 * Import aziende da CSV
 */
router.post('/companies',
  authenticateToken,
  requirePermission('companies:import'),
  auditLog('IMPORT_COMPANIES'),
  async (req, res) => {
    try {
      const { companies, overwriteIds = [] } = req.body;
      const tenantId = getEffectiveTenantId(req);

      if (!companies || !Array.isArray(companies)) {
        return res.status(400).json({
          success: false,
          message: 'Array companies richiesto'
        });
      }

      // Valida prima di importare
      const validation = await CompanyImportService.validateCompanies(companies, tenantId);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Errori di validazione',
          errors: validation.errors
        });
      }

      // Import
      const result = await CompanyImportService.importCompanies(
        validation.validatedCompanies,
        tenantId,
        overwriteIds
      );

      logger.info('[IMPORT_ROUTES] Company import completed', {
        ...result,
        tenantId,
        userId: req.person.id
      });

      res.json(result);
    } catch (error) {
      logger.error('[IMPORT_ROUTES] Company import failed:', error);
      res.status(500).json({
        success: false,
        message: 'Errore durante import',
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * POST /api/import/companies/:companyId/sites
 * Crea nuova sede per un'azienda
 */
router.post('/companies/:companyId/sites',
  authenticateToken,
  requirePermission('companies:manage'),
  auditLog('CREATE_COMPANY_SITE'),
  async (req, res) => {
    try {
      const { companyId } = req.params;
      const siteData = req.body;
      const tenantId = getEffectiveTenantId(req);

      const site = await CompanyImportService.createCompanySite(companyId, siteData, tenantId);

      logger.info('[IMPORT_ROUTES] Company site created', {
        companyId,
        siteId: site.id,
        tenantId,
        userId: req.person.id
      });

      res.json({
        success: true,
        site
      });
    } catch (error) {
      logger.error('[IMPORT_ROUTES] Company site creation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Errore creazione sede',
        error: 'Errore interno del server'
      });
    }
  }
);

// ===== EMPLOYEE IMPORT ROUTES =====

/**
 * POST /api/import/employees/validate
 * Valida dipendenti da CSV senza importare
 */
router.post('/employees/validate',
  authenticateToken,
  requirePermission('persons:import'),
  auditLog('VALIDATE_EMPLOYEE_IMPORT'),
  async (req, res) => {
    try {
      const { employees } = req.body;
      const tenantId = getEffectiveTenantId(req);

      if (!employees || !Array.isArray(employees)) {
        return res.status(400).json({
          success: false,
          message: 'Array employees richiesto'
        });
      }

      // Valida employees
      const validation = await EmployeeImportService.validateEmployees(employees, tenantId);

      // Rileva duplicati e conflitti
      const { duplicates, conflicts } = await EmployeeImportService.detectDuplicatesAndConflicts(
        validation.validatedEmployees,
        tenantId
      );

      logger.info('[IMPORT_ROUTES] Employee validation completed', {
        total: employees.length,
        valid: validation.validatedEmployees.length,
        errors: validation.errors.length,
        duplicates: duplicates.length,
        conflicts: conflicts.size,
        tenantId,
        sampleConflict: conflicts.size > 0 ? Array.from(conflicts.values())[0] : null
      });

      res.json({
        success: validation.valid,
        total: employees.length,
        valid: validation.validatedEmployees.length,
        errors: validation.errors,
        duplicates,
        conflicts: Array.from(conflicts.entries()).map(([index, conflict]) => ({
          index,
          taxCode: conflict.conflictValue || conflict.newItem?.taxCode, // Use conflictValue as primary
          existingPerson: conflict.existingItem,
          newItem: conflict.newItem,
          conflictKey: conflict.conflictKey,
          conflictValue: conflict.conflictValue
        }))
      });
    } catch (error) {
      logger.error('[IMPORT_ROUTES] Employee validation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Errore durante validazione',
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * POST /api/import/employees
 * Import dipendenti da CSV
 */
router.post('/employees',
  authenticateToken,
  requirePermission('persons:import'),
  auditLog('IMPORT_EMPLOYEES'),
  async (req, res) => {
    try {
      const { employees, overwriteIds = [], defaultCompanyTenantProfileId = null } = req.body;
      const tenantId = getEffectiveTenantId(req);

      if (!employees || !Array.isArray(employees)) {
        return res.status(400).json({
          success: false,
          message: 'Array employees richiesto'
        });
      }

      // Valida prima di importare
      const validation = await EmployeeImportService.validateEmployees(employees, tenantId);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Errori di validazione',
          errors: validation.errors
        });
      }

      // Import con bulk company assignment
      const result = await EmployeeImportService.importEmployees(
        validation.validatedEmployees,
        tenantId,
        defaultCompanyTenantProfileId,
        overwriteIds
      );

      logger.info('[IMPORT_ROUTES] Employee import completed', {
        ...result,
        defaultCompanyTenantProfileId,
        tenantId,
        userId: req.person.id
      });

      res.json(result);
    } catch (error) {
      logger.error('[IMPORT_ROUTES] Employee import failed:', error);
      res.status(500).json({
        success: false,
        message: 'Errore durante import',
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * POST /api/import/employees/bulk-assign
 * Assegna multiple persone ad un'azienda
 */
router.post('/employees/bulk-assign',
  authenticateToken,
  requirePermission('companies:manage'),
  auditLog('BULK_ASSIGN_EMPLOYEES'),
  async (req, res) => {
    try {
      const { personIds, companyId } = req.body;
      const tenantId = getEffectiveTenantId(req);

      if (!personIds || !Array.isArray(personIds) || !companyId) {
        return res.status(400).json({
          success: false,
          message: 'personIds (array) e companyId richiesti'
        });
      }

      const result = await EmployeeImportService.bulkAssignToCompany(personIds, companyId, tenantId);

      logger.info('[IMPORT_ROUTES] Bulk assignment completed', {
        ...result,
        companyId,
        userId: req.person.id
      });

      res.json(result);
    } catch (error) {
      logger.error('[IMPORT_ROUTES] Bulk assignment failed:', error);
      res.status(500).json({
        success: false,
        message: 'Errore bulk assignment',
        error: 'Errore interno del server'
      });
    }
  }
);

// ===== TRAINER IMPORT ROUTES =====

/**
 * POST /api/import/trainers/validate
 * Valida formatori da CSV senza importare
 */
router.post('/trainers/validate',
  authenticateToken,
  requirePermission('persons:import'),
  auditLog('VALIDATE_TRAINER_IMPORT'),
  async (req, res) => {
    try {
      const { trainers } = req.body;
      const tenantId = getEffectiveTenantId(req);

      if (!trainers || !Array.isArray(trainers)) {
        return res.status(400).json({
          success: false,
          message: 'Array trainers richiesto'
        });
      }

      // Valida trainers
      const validation = await TrainerImportService.validateTrainers(trainers, tenantId);

      // Rileva duplicati e conflitti
      const { duplicates, conflicts } = await TrainerImportService.detectDuplicatesAndConflicts(
        validation.validatedTrainers,
        tenantId
      );

      logger.info('[IMPORT_ROUTES] Trainer validation completed', {
        total: trainers.length,
        valid: validation.validatedTrainers.length,
        errors: validation.errors.length,
        duplicates: duplicates.length,
        conflicts: conflicts.size,
        tenantId
      });

      res.json({
        success: validation.valid,
        total: trainers.length,
        valid: validation.validatedTrainers.length,
        errors: validation.errors,
        duplicates,
        conflicts: Array.from(conflicts.entries()).map(([index, conflict]) => ({
          index,
          ...conflict
        }))
      });
    } catch (error) {
      logger.error('[IMPORT_ROUTES] Trainer validation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Errore durante validazione',
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * POST /api/import/trainers
 * Import formatori da CSV con creazione account
 */
router.post('/trainers',
  authenticateToken,
  requirePermission('persons:import'),
  auditLog('IMPORT_TRAINERS'),
  async (req, res) => {
    try {
      const { trainers, overwriteIds = [], createAccounts = true } = req.body;
      const tenantId = getEffectiveTenantId(req);

      if (!trainers || !Array.isArray(trainers)) {
        return res.status(400).json({
          success: false,
          message: 'Array trainers richiesto'
        });
      }

      // Valida prima di importare
      const validation = await TrainerImportService.validateTrainers(trainers, tenantId);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Errori di validazione',
          errors: validation.errors
        });
      }

      // Import con creazione account automatica
      const result = await TrainerImportService.importTrainers(
        validation.validatedTrainers,
        tenantId,
        overwriteIds,
        createAccounts
      );

      logger.info('[IMPORT_ROUTES] Trainer import completed', {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        accountsCreated: result.credentials.length,
        tenantId,
        userId: req.person.id
      });

      res.json(result);
    } catch (error) {
      logger.error('[IMPORT_ROUTES] Trainer import failed:', error);
      res.status(500).json({
        success: false,
        message: 'Errore durante import',
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * POST /api/import/trainers/credentials-csv
 * Genera CSV con credenziali trainers
 */
router.post('/trainers/credentials-csv',
  authenticateToken,
  requirePermission('persons:import'),
  auditLog('EXPORT_TRAINER_CREDENTIALS'),
  async (req, res) => {
    try {
      const { credentials } = req.body;

      if (!credentials || !Array.isArray(credentials)) {
        return res.status(400).json({
          success: false,
          message: 'Array credentials richiesto'
        });
      }

      const csv = TrainerImportService.generateCredentialsCSV(credentials);

      logger.info('[IMPORT_ROUTES] Trainer credentials CSV generated', {
        count: credentials.length,
        userId: req.person.id
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=trainer_credentials.csv');
      res.send(csv);
    } catch (error) {
      logger.error('[IMPORT_ROUTES] Credentials CSV generation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Errore generazione CSV',
        error: 'Errore interno del server'
      });
    }
  }
);

export default router;
