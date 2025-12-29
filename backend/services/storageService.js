/**
 * Storage Service - Gestione file storage unificata
 * 
 * Supporta:
 * - Local file system (default)
 * - AWS S3 (optional)
 * 
 * GDPR Compliant:
 * - File encryption at rest (configurabile)
 * - Audit trail per operazioni
 * - Supporto per data retention policies
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger.js';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurazione storage mode
const STORAGE_MODE = process.env.STORAGE_MODE || 'local'; // 'local' or 's3'
// Use absolute path relative to backend folder (services/../uploads = backend/uploads)
const UPLOAD_PATH = process.env.UPLOAD_PATH || path.resolve(__dirname, '..', 'uploads');

// S3 Client configuration (opzionale)
let s3Client = null;
const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.AWS_REGION || 'eu-central-1';

if (STORAGE_MODE === 's3' && process.env.AWS_ACCESS_KEY_ID) {
  s3Client = new S3Client({
    region: S3_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  logger.info('S3 storage initialized', {
    service: 'storageService',
    bucket: S3_BUCKET,
    region: S3_REGION,
  });
}

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Generate file hash for integrity check
 */
function generateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

class StorageService {
  constructor() {
    this.mode = STORAGE_MODE;
    this.uploadPath = UPLOAD_PATH;
    this.s3Client = s3Client;
    this.s3Bucket = S3_BUCKET;

    // Inizializza directory locali se mode = local
    if (this.mode === 'local') {
      this.initializeLocalDirectories();
    }
  }

  /**
   * Initialize local storage directories
   */
  async initializeLocalDirectories() {
    const dirs = [
      'documents',
      'templates',
      'temp',
      'lettere-incarico',
      'registri-presenze',
      'attestati',
    ];

    try {
      for (const dir of dirs) {
        const dirPath = path.join(this.uploadPath, dir);
        await ensureDir(dirPath);
      }
      logger.info('Local storage directories initialized', {
        service: 'storageService',
        path: this.uploadPath,
      });
    } catch (error) {
      logger.error('Failed to initialize local directories', {
        service: 'storageService',
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Save file to storage
   * 
   * @param {Buffer} buffer - File content
   * @param {string} filename - Filename with extension
   * @param {string} directory - Subdirectory (documents, templates, etc.)
   * @param {object} metadata - Optional metadata
   * @returns {Promise<object>} - File info (filepath, url, size, hash)
   */
  async saveFile(buffer, filename, directory = 'documents', metadata = {}) {
    try {
      // Generate hash for integrity
      const fileHash = generateFileHash(buffer);
      const fileSize = buffer.length;

      // Add timestamp to filename to avoid conflicts
      const timestamp = Date.now();
      const ext = path.extname(filename);
      const basename = path.basename(filename, ext);
      const uniqueFilename = `${basename}-${timestamp}${ext}`;

      let result;

      if (this.mode === 's3') {
        result = await this.saveFileS3(buffer, uniqueFilename, directory, metadata);
      } else {
        result = await this.saveFileLocal(buffer, uniqueFilename, directory);
      }

      logger.info('File saved successfully', {
        service: 'storageService',
        mode: this.mode,
        filename: uniqueFilename,
        directory,
        size: fileSize,
        hash: fileHash,
      });

      return {
        ...result,
        fileSize,
        fileHash,
        originalFilename: filename,
      };
    } catch (error) {
      logger.error('Failed to save file', {
        service: 'storageService',
        filename,
        directory,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Save file to local filesystem
   */
  async saveFileLocal(buffer, filename, directory) {
    const dirPath = path.join(this.uploadPath, directory);
    await ensureDir(dirPath);

    const filepath = path.join(dirPath, filename);
    await fs.writeFile(filepath, buffer);

    // Generate URL (with /uploads prefix for correct path resolution)
    const fileUrl = `/uploads/${directory}/${filename}`;

    return {
      filepath,
      fileUrl,
      filename,
    };
  }

  /**
   * Save file to AWS S3
   */
  async saveFileS3(buffer, filename, directory, metadata = {}) {
    if (!this.s3Client || !this.s3Bucket) {
      throw new Error('S3 client not configured');
    }

    const key = `${directory}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: this.getContentType(filename),
      Metadata: {
        ...metadata,
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);

    // Generate pre-signed URL (valid for 7 days)
    const getCommand = new GetObjectCommand({
      Bucket: this.s3Bucket,
      Key: key,
    });
    const fileUrl = await getSignedUrl(this.s3Client, getCommand, { expiresIn: 604800 });

    return {
      filepath: key,
      fileUrl,
      filename,
      bucket: this.s3Bucket,
    };
  }

  /**
   * Get file from storage
   * 
   * @param {string} filepath - File path or S3 key
   * @returns {Promise<Buffer>} - File content
   */
  async getFile(filepath) {
    try {
      if (this.mode === 's3') {
        return await this.getFileS3(filepath);
      } else {
        return await this.getFileLocal(filepath);
      }
    } catch (error) {
      logger.error('Failed to get file', {
        service: 'storageService',
        filepath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get file from local filesystem
   */
  async getFileLocal(filepath) {
    // Se filepath è relativo, usa uploadPath
    const fullPath = path.isAbsolute(filepath) ? filepath : path.join(this.uploadPath, filepath);
    return await fs.readFile(fullPath);
  }

  /**
   * Get file from S3
   */
  async getFileS3(key) {
    if (!this.s3Client || !this.s3Bucket) {
      throw new Error('S3 client not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.s3Bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const chunks = [];

    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Delete file from storage
   * 
   * @param {string} filepath - File path or S3 key
   */
  async deleteFile(filepath) {
    try {
      if (this.mode === 's3') {
        await this.deleteFileS3(filepath);
      } else {
        await this.deleteFileLocal(filepath);
      }

      logger.info('File deleted successfully', {
        service: 'storageService',
        filepath,
      });
    } catch (error) {
      logger.error('Failed to delete file', {
        service: 'storageService',
        filepath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete file from local filesystem
   */
  async deleteFileLocal(filepath) {
    const fullPath = path.isAbsolute(filepath) ? filepath : path.join(this.uploadPath, filepath);
    await fs.unlink(fullPath);
  }

  /**
   * Delete file from S3
   */
  async deleteFileS3(key) {
    if (!this.s3Client || !this.s3Bucket) {
      throw new Error('S3 client not configured');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.s3Bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Check if file exists
   */
  async fileExists(filepath) {
    try {
      if (this.mode === 's3') {
        // Try to get metadata
        const command = new GetObjectCommand({
          Bucket: this.s3Bucket,
          Key: filepath,
        });
        await this.s3Client.send(command);
        return true;
      } else {
        const fullPath = path.isAbsolute(filepath) ? filepath : path.join(this.uploadPath, filepath);
        await fs.access(fullPath);
        return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get content type from filename
   */
  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const types = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.html': 'text/html',
      '.json': 'application/json',
    };
    return types[ext] || 'application/octet-stream';
  }

  /**
   * Get storage info
   */
  getStorageInfo() {
    return {
      mode: this.mode,
      uploadPath: this.mode === 'local' ? this.uploadPath : null,
      s3Bucket: this.mode === 's3' ? this.s3Bucket : null,
      s3Region: this.mode === 's3' ? S3_REGION : null,
    };
  }
}

// Export singleton instance
export default new StorageService();
