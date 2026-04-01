/**
 * Multer Configuration Module
 * Centralizes file upload configuration with environment-specific settings
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

/**
 * Default configuration for file uploads
 */
const defaultConfig = {
  destination: 'uploads',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 10,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  preserveExtension: true,
  addTimestamp: true
};

/**
 * Environment-specific configurations
 */
const environmentConfig = {
  development: {
    maxFileSize: 100 * 1024 * 1024, // 100MB for development
    destination: 'uploads/dev'
  },
  production: {
    maxFileSize: 25 * 1024 * 1024, // 25MB for production
    destination: 'uploads/prod'
  },
  test: {
    maxFileSize: 5 * 1024 * 1024, // 5MB for testing
    destination: 'uploads/test'
  }
};

/**
 * Predefined upload configurations for different use cases
 */
const uploadTypes = {
  images: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    destination: 'uploads/images'
  },
  documents: {
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    maxFileSize: 25 * 1024 * 1024, // 25MB
    destination: 'uploads/documents'
  },
  spreadsheets: {
    allowedMimeTypes: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    maxFileSize: 15 * 1024 * 1024, // 15MB
    destination: 'uploads/spreadsheets'
  },
  attestati: {
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxFileSize: 20 * 1024 * 1024, // 20MB
    destination: 'uploads/attestati'
  },
  templates: {
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    destination: 'uploads/templates'
  },
  clinical: {
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/dicom',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    maxFileSize: 50 * 1024 * 1024, // 50MB per file clinici (DICOM, radiografie)
    destination: 'uploads/clinical'
  }
};

/**
 * Ensure upload directory exists
 * @param {string} uploadPath - Path to upload directory
 */
const ensureUploadDir = (uploadPath) => {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
};

/**
 * Generate unique filename
 * @param {object} file - Multer file object
 * @param {boolean} addTimestamp - Whether to add timestamp
 * @param {boolean} preserveExtension - Whether to preserve original extension
 * @returns {string} Generated filename
 */
const generateFilename = (file, addTimestamp = true, preserveExtension = true) => {
  const timestamp = addTimestamp ? Date.now() : '';
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  const extension = preserveExtension ? path.extname(file.originalname) : '';

  const baseName = path.basename(file.originalname, extension)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50); // Limit base name length

  return `${file.fieldname}-${baseName}-${timestamp}-${randomSuffix}${extension}`;
};

/**
 * Create storage configuration
 * @param {object} options - Storage options
 * @returns {object} Multer storage configuration
 */
const createStorage = (options = {}) => {
  const config = { ...defaultConfig, ...options };

  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.resolve(process.cwd(), config.destination);
      ensureUploadDir(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const filename = generateFilename(
        file,
        config.addTimestamp,
        config.preserveExtension
      );
      cb(null, filename);
    }
  });
};

/**
 * Safe file extensions mapped to their allowed MIME types.
 * Extensions NOT in this map are always rejected regardless of MIME type.
 * This prevents extension spoofing (e.g. sending .html with MIME image/jpeg).
 */
const SAFE_EXTENSIONS = new Map([
  ['.jpg', ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
  ['.png', ['image/png']],
  ['.gif', ['image/gif']],
  ['.webp', ['image/webp']],
  ['.pdf', ['application/pdf']],
  ['.txt', ['text/plain']],
  ['.csv', ['text/csv', 'application/vnd.ms-excel', 'text/plain']],
  ['.xls', ['application/vnd.ms-excel']],
  ['.xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']],
  ['.doc', ['application/msword']],
  ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
  ['.dcm', ['application/dicom', 'application/octet-stream']],
]);

/**
 * File filter function — validates both MIME type (server-side) and file extension.
 * Double validation prevents extension spoofing attacks where a malicious file
 * (e.g. shell.html) is uploaded with a spoofed MIME type (e.g. image/jpeg).
 *
 * @param {array} allowedMimeTypes - Array of allowed MIME types
 * @returns {function} Multer file filter function
 */
const createFileFilter = (allowedMimeTypes = defaultConfig.allowedMimeTypes) => {
  return (req, file, cb) => {
    // 1. MIME type check (Content-Type header — client-supplied but first gate)
    if (!allowedMimeTypes.includes(file.mimetype)) {
      const error = new Error(`Tipo di file ${file.mimetype} non consentito`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }

    // 2. Extension check — prevent stored XSS / extension spoofing
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ext || !SAFE_EXTENSIONS.has(ext)) {
      const error = new Error(`Estensione file ${ext || '(nessuna)'} non consentita`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }

    // 3. Cross-check: extension must be consistent with the MIME type
    const extAllowedMimes = SAFE_EXTENSIONS.get(ext);
    if (!extAllowedMimes.includes(file.mimetype)) {
      const error = new Error(`Estensione file ${ext} non corrisponde al tipo MIME ${file.mimetype}`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }

    cb(null, true);
  };
};

/**
 * Create Multer configuration
 * @param {object} options - Custom configuration options
 * @param {string} environment - Environment name
 * @returns {object} Configured Multer instance
 */
export const createMulterConfig = (options = {}, environment = process.env.NODE_ENV || 'development') => {
  const envConfig = environmentConfig[environment] || environmentConfig.development;
  const config = { ...defaultConfig, ...envConfig, ...options };

  return multer({
    storage: createStorage(config),
    fileFilter: createFileFilter(config.allowedMimeTypes),
    limits: {
      fileSize: config.maxFileSize,
      files: config.maxFiles
    }
  });
};

/**
 * Create predefined upload configurations
 * @param {string} type - Upload type (images, documents, etc.)
 * @param {object} customOptions - Custom options to override defaults
 * @returns {object} Configured Multer instance
 */
export const createUploadConfig = (type, customOptions = {}) => {
  const typeConfig = uploadTypes[type];
  if (!typeConfig) {
    throw new Error(`Unknown upload type: ${type}`);
  }

  const config = { ...typeConfig, ...customOptions };
  return createMulterConfig(config);
};

/**
 * Create single file upload middleware
 * @param {string} fieldName - Form field name
 * @param {object} options - Upload options
 * @returns {function} Express middleware
 */
export const createSingleUpload = (fieldName, options = {}) => {
  const upload = createMulterConfig(options);
  return upload.single(fieldName);
};

/**
 * Create multiple files upload middleware
 * @param {string} fieldName - Form field name
 * @param {number} maxCount - Maximum number of files
 * @param {object} options - Upload options
 * @returns {function} Express middleware
 */
export const createMultipleUpload = (fieldName, maxCount = 10, options = {}) => {
  const upload = createMulterConfig({ ...options, maxFiles: maxCount });
  return upload.array(fieldName, maxCount);
};

/**
 * Create fields upload middleware for multiple field names
 * @param {array} fields - Array of field configurations
 * @param {object} options - Upload options
 * @returns {function} Express middleware
 */
export const createFieldsUpload = (fields, options = {}) => {
  const upload = createMulterConfig(options);
  return upload.fields(fields);
};

/**
 * Error handler for Multer errors
 * @param {Error} err - Multer error
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
export const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          error: 'File troppo grande',
          message: 'La dimensione del file supera il limite consentito'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Troppi file',
          message: 'Il numero di file supera il limite consentito'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'File imprevisto',
          message: 'Campo file imprevisto'
        });
      default:
        return res.status(400).json({
          error: 'Errore di caricamento',
          message: 'Si è verificato un errore durante il caricamento del file'
        });
    }
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      error: 'Tipo di file non valido',
      message: 'Il tipo di file caricato non è consentito'
    });
  }

  next(err);
};

/**
 * Validate upload configuration
 * @param {object} config - Configuration to validate
 * @returns {boolean} True if configuration is valid
 */
export const validateUploadConfig = (config) => {
  const requiredFields = ['destination', 'maxFileSize', 'allowedMimeTypes'];

  return requiredFields.every(field => config.hasOwnProperty(field)) &&
    Array.isArray(config.allowedMimeTypes) &&
    typeof config.maxFileSize === 'number' &&
    config.maxFileSize > 0;
};

/**
 * Get file info helper
 * @param {object} file - Multer file object
 * @returns {object} File information
 */
export const getFileInfo = (file) => {
  if (!file) return null;

  return {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    uploadDate: new Date().toISOString()
  };
};

export default {
  createMulterConfig,
  createUploadConfig,
  createSingleUpload,
  createMultipleUpload,
  createFieldsUpload,
  multerErrorHandler,
  validateUploadConfig,
  getFileInfo,
  uploadTypes,
  defaultConfig,
  environmentConfig
};