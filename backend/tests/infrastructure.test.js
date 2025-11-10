/**
 * Infrastructure Tests
 * 
 * Test setup Phase 0:
 * - Redis connection
 * - Queue system (Bull)
 * - File storage (local + S3)
 * - PDF generation (Puppeteer)
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { RedisService } from '../services/redis.js';
import { documentQueue, emailQueue, getQueuesHealth, closeQueues } from '../services/queueService.js';
import storageService from '../services/storageService.js';
import pdfService from '../services/pdfService.js';

// Initialize Redis
const redisService = new RedisService();

describe('Phase 0: Infrastructure Setup', () => {
  
  beforeAll(async () => {
    // Connect Redis
    await redisService.connect();
  });

  afterAll(async () => {
    // Cleanup
    await closeQueues();
    await redisService.disconnect();
    await pdfService.shutdown();
  });

  describe('Redis Service', () => {
    test('should connect to Redis', async () => {
      expect(redisService.isHealthy()).toBe(true);
    });

    test('should ping Redis', async () => {
      const result = await redisService.ping();
      expect(result).toBe('PONG');
    });

    test('should set and get value', async () => {
      await redisService.setex('test-key', 60, 'test-value');
      const value = await redisService.get('test-key');
      expect(value).toBe('test-value');
    });

    test('should delete key', async () => {
      await redisService.setex('test-key-delete', 60, 'test');
      await redisService.del('test-key-delete');
      const exists = await redisService.exists('test-key-delete');
      expect(exists).toBe(0);
    });
  });

  describe('Queue Service', () => {
    test('should have document queue initialized', () => {
      expect(documentQueue).toBeDefined();
      expect(documentQueue.name).toBe('document-generation');
    });

    test('should have email queue initialized', () => {
      expect(emailQueue).toBeDefined();
      expect(emailQueue.name).toBe('email-sending');
    });

    test('should add job to document queue', async () => {
      const job = await documentQueue.add('test-job', {
        type: 'test',
        data: { foo: 'bar' },
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.type).toBe('test');

      // Remove job
      await job.remove();
    });

    test('should get queue health status', async () => {
      const health = await getQueuesHealth();
      
      expect(health.healthy).toBe(true);
      expect(health.documentQueue).toBeDefined();
      expect(health.emailQueue).toBeDefined();
      expect(typeof health.documentQueue.waiting).toBe('number');
      expect(typeof health.emailQueue.waiting).toBe('number');
    });
  });

  describe('Storage Service', () => {
    const testContent = Buffer.from('Test file content');
    const testFilename = 'test-file.txt';
    let savedFile;

    test('should have correct storage mode', () => {
      const info = storageService.getStorageInfo();
      expect(['local', 's3']).toContain(info.mode);
    });

    test('should save file to storage', async () => {
      savedFile = await storageService.saveFile(testContent, testFilename, 'temp');
      
      expect(savedFile).toBeDefined();
      expect(savedFile.filename).toContain('test-file');
      expect(savedFile.fileSize).toBe(testContent.length);
      expect(savedFile.fileHash).toBeDefined();
      expect(savedFile.filepath).toBeDefined();
      expect(savedFile.fileUrl).toBeDefined();
    });

    test('should check if file exists', async () => {
      const exists = await storageService.fileExists(savedFile.filepath);
      expect(exists).toBe(true);
    });

    test('should retrieve file from storage', async () => {
      const retrievedContent = await storageService.getFile(savedFile.filepath);
      expect(retrievedContent.toString()).toBe(testContent.toString());
    });

    test('should delete file from storage', async () => {
      await storageService.deleteFile(savedFile.filepath);
      const exists = await storageService.fileExists(savedFile.filepath);
      expect(exists).toBe(false);
    });

    test('should get correct content type', () => {
      expect(storageService.getContentType('test.pdf')).toBe('application/pdf');
      expect(storageService.getContentType('test.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(storageService.getContentType('test.jpg')).toBe('image/jpeg');
    });
  });

  describe('PDF Service', () => {
    test('should generate PDF from simple HTML', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1>Test PDF Document</h1>
            <p>This is a test PDF generated from HTML.</p>
          </body>
        </html>
      `;

      const pdfBuffer = await pdfService.generatePDF(html);
      
      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(1000); // PDF should be > 1KB
      
      // Check PDF header
      const header = pdfBuffer.slice(0, 5).toString();
      expect(header).toBe('%PDF-');
    }, 30000); // 30s timeout for PDF generation

    test('should generate landscape PDF', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <h1>Landscape PDF</h1>
          </body>
        </html>
      `;

      const pdfBuffer = await pdfService.generateLandscapePDF(html);
      
      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    }, 30000);

    test('should get pool statistics', () => {
      const stats = pdfService.getPoolStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.available).toBe('number');
      expect(typeof stats.pending).toBe('number');
      expect(stats.max).toBeGreaterThanOrEqual(stats.min);
    });

    test('should generate PDF with custom margins', async () => {
      const html = '<html><body><h1>Custom Margins</h1></body></html>';
      
      const pdfBuffer = await pdfService.generatePDF(html, {
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });
      
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Integration: Storage + PDF', () => {
    test('should generate PDF and save to storage', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <h1>Integration Test</h1>
            <p>Testing PDF generation + storage</p>
          </body>
        </html>
      `;

      // Generate PDF
      const pdfBuffer = await pdfService.generatePDF(html);
      expect(pdfBuffer).toBeDefined();

      // Save to storage
      const savedFile = await storageService.saveFile(
        pdfBuffer,
        'integration-test.pdf',
        'temp'
      );

      expect(savedFile.filename).toContain('integration-test');
      expect(savedFile.fileSize).toBe(pdfBuffer.length);

      // Retrieve and verify
      const retrievedPdf = await storageService.getFile(savedFile.filepath);
      expect(retrievedPdf.length).toBe(pdfBuffer.length);

      // Cleanup
      await storageService.deleteFile(savedFile.filepath);
    }, 30000);
  });

});
