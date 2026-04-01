/**
 * Common imports and utilities for Attestati routes
 * 
 * @module routes/attestati/common
 */

import express from 'express';
import prisma from '../../config/prisma-optimization.js';
import middleware from '../../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import logger from '../../utils/logger.js';
import { DocumentService } from '../../services/documentService.js';
import archiver from 'archiver';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import { detectDocumentType } from '../../utils/google-url-parser.js';
import path from 'path';
import { fileURLToPath } from 'url';
import googleDocsService from '../../services/google-docs-service.js';
import { getValidAccessToken } from '../../services/googleTokenService.js';
import qrCodeService from '../../services/qrCodeService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const documentService = new DocumentService();

const { authenticate: authenticateToken, requirePermission } = middleware;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date to dd/mm/yyyy
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Translate deliveryMode to Italian
 */
function translateDeliveryMode(mode) {
  const translations = {
    'IN_PERSON': 'In presenza',
    'ONLINE': 'Online',
    'HYBRID': 'Ibrida',
    'BLENDED': 'Mista',
    'SELF_PACED': 'Autoapprendimento'
  };
  return translations[mode] || mode || '';
}

/**
 * Translate riskLevel to Italian
 */
function translateRiskLevel(level) {
  const translations = {
    'ALTO': 'Alto',
    'MEDIO': 'Medio',
    'BASSO': 'Basso',
    'A': 'A',
    'B': 'B',
    'C': 'C'
  };
  return translations[level] || level || '';
}

/**
 * Translate courseType to Italian
 */
function translateCourseType(type) {
  const translations = {
    'PRIMO_CORSO': 'Primo Corso',
    'AGGIORNAMENTO': 'Aggiornamento'
  };
  return translations[type] || type || '';
}

/**
 * Get next progressive number for attestato
 */
async function getNextProgressiveNumber(tenantId, year) {
  const lastAttestato = await prisma.attestato.findFirst({
    where: {
      tenantId,
      annoProgressivo: year
    },
    orderBy: { numeroProgressivo: 'desc' }
  });
  return (lastAttestato?.numeroProgressivo || 0) + 1;
}

/**
 * Build template placeholders for attestato generation
 */
function buildTemplatePlaceholders(schedule, personData, attestatoData) {
  const course = schedule.course;
  const trainer = schedule.trainer;
  
  // Format attendance dates
  const attendanceDates = personData.presenze || [];
  const formattedDates = attendanceDates.map(formatDate).join(', ');
  
  return {
    // Person data
    '{{nome}}': personData.firstName || '',
    '{{cognome}}': personData.lastName || '',
    '{{nominativo}}': `${personData.firstName || ''} ${personData.lastName || ''}`.trim(),
    '{{cf}}': personData.taxCode || personData.cf || '',
    '{{codice_fiscale}}': personData.taxCode || personData.cf || '',
    '{{data_nascita}}': formatDate(personData.dateOfBirth),
    '{{luogo_nascita}}': personData.placeOfBirth || '',
    
    // Course data
    '{{corso}}': course?.title || '',
    '{{titolo_corso}}': course?.title || '',
    '{{codice_corso}}': course?.code || '',
    '{{durata}}': course?.duration?.toString() || '',
    '{{ore}}': course?.duration?.toString() || '',
    '{{categoria}}': course?.category || '',
    
    // Schedule data
    '{{data_inizio}}': formatDate(schedule.startDate),
    '{{data_fine}}': formatDate(schedule.endDate),
    '{{date_presenza}}': formattedDates,
    '{{sede}}': schedule.location || '',
    '{{modalita}}': translateDeliveryMode(schedule.deliveryMode),
    '{{livello_rischio}}': translateRiskLevel(schedule.riskLevel),
    '{{tipo_corso}}': translateCourseType(schedule.courseType),
    
    // Trainer data
    '{{formatore}}': trainer ? `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim() : '',
    '{{nome_formatore}}': trainer?.firstName || '',
    '{{cognome_formatore}}': trainer?.lastName || '',
    
    // Attestato data
    '{{numero}}': attestatoData.numero || '',
    '{{numero_attestato}}': attestatoData.numero || '',
    '{{data_emissione}}': formatDate(attestatoData.dataEmissione || new Date()),
    '{{data_scadenza}}': formatDate(attestatoData.dataScadenza),
    '{{codice_verifica}}': attestatoData.codiceVerifica || '',
    '{{qr_code}}': attestatoData.qrCodeUrl || ''
  };
}

/**
 * Check if user has employee-only access
 */
async function isEmployeeOnlyAccess(personId, tenantId) {
  const personRoles = await prisma.personRole.findMany({
    where: {
      personId,
      tenantId,
      isActive: true,
      deletedAt: null
    },
    select: { roleType: true }
  });

  const roleTypes = personRoles.map(pr => pr.roleType);
  return roleTypes.includes('EMPLOYEE') &&
    !roleTypes.some(r => ['ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER', 'TRAINER'].includes(r));
}

export {
  express,
  prisma,
  authenticateToken,
  requirePermission,
  body,
  validationResult,
  logger,
  documentService,
  archiver,
  fs,
  fsSync,
  detectDocumentType,
  path,
  __dirname,
  googleDocsService,
  getValidAccessToken,
  qrCodeService,
  formatDate,
  translateDeliveryMode,
  translateRiskLevel,
  translateCourseType,
  getNextProgressiveNumber,
  buildTemplatePlaceholders,
  isEmployeeOnlyAccess
};
