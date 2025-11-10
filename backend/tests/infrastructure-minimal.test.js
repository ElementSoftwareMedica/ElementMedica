/**
 * Infrastructure Tests - Minimal Version (No Redis Required)
 * 
 * Tests for:
 * - File storage (local)
 * - PDF generation (Puppeteer)
 * 
 * Note: Redis and Queue tests require Redis server running
 * Run full tests with: npm test -- tests/infrastructure.test.js
 */

import { describe, test, expect, afterAll } from '@jest/globals';
import storageService from '../services/storageService.js';
import pdfService from '../services/pdfService.js';

describe('Phase 0: Infrastructure Setup (Minimal - No Redis)', () => {
  
  afterAll(async () => {
    // Cleanup
    await pdfService.shutdown();
  });

  describe('Storage Service', () => {
    const testContent = Buffer.from('Test file content for template system');
    const testFilename = 'test-template.txt';
    let savedFile;

    test('should have correct storage mode', () => {
      const info = storageService.getStorageInfo();
      expect(['local', 's3']).toContain(info.mode);
      console.log('Storage mode:', info.mode);
    });

    test('should save file to storage', async () => {
      savedFile = await storageService.saveFile(testContent, testFilename, 'temp');
      
      expect(savedFile).toBeDefined();
      expect(savedFile.filename).toContain('test-template');
      expect(savedFile.fileSize).toBe(testContent.length);
      expect(savedFile.fileHash).toBeDefined();
      expect(savedFile.filepath).toBeDefined();
      expect(savedFile.fileUrl).toBeDefined();
      
      console.log('File saved:', {
        filename: savedFile.filename,
        size: savedFile.fileSize,
        hash: savedFile.fileHash.substring(0, 16) + '...',
      });
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

    test('should get correct content type for documents', () => {
      expect(storageService.getContentType('attestato.pdf')).toBe('application/pdf');
      expect(storageService.getContentType('lettera.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(storageService.getContentType('logo.png')).toBe('image/png');
      expect(storageService.getContentType('template.html')).toBe('text/html');
    });
  });

  describe('PDF Service', () => {
    test('should generate PDF from HTML template', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                padding: 40px;
                line-height: 1.6;
              }
              h1 { 
                color: #2c3e50;
                border-bottom: 3px solid #3498db;
                padding-bottom: 10px;
              }
              .info { 
                background: #ecf0f1; 
                padding: 15px; 
                border-radius: 5px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <h1>Attestato di Formazione</h1>
            <div class="info">
              <p><strong>Partecipante:</strong> Mario Rossi</p>
              <p><strong>Corso:</strong> Corso Antincendio Rischio Alto</p>
              <p><strong>Data:</strong> 04/11/2025</p>
            </div>
            <p>Si attesta che il partecipante ha completato con successo il corso.</p>
          </body>
        </html>
      `;

      const pdfBuffer = await pdfService.generatePDF(html);
      
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(2000); // PDF should be > 2KB
      
      // Check PDF header (magic bytes)
      const header = Buffer.from(pdfBuffer).slice(0, 5).toString();
      expect(header).toBe('%PDF-');
      
      console.log('PDF generated:', {
        size: `${(pdfBuffer.length / 1024).toFixed(2)}KB`,
        format: 'A4 Portrait',
      });
    }, 30000); // 30s timeout

    test('should generate landscape PDF (for Registro Presenze)', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial; padding: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #3498db; color: white; }
            </style>
          </head>
          <body>
            <h2>Registro Presenze - Corso Antincendio</h2>
            <table>
              <thead>
                <tr>
                  <th>Partecipante</th>
                  <th>Data</th>
                  <th>Ore</th>
                  <th>Firma</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mario Rossi</td>
                  <td>04/11/2025</td>
                  <td>8</td>
                  <td>_______________</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const pdfBuffer = await pdfService.generateLandscapePDF(html);
      
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      
      console.log('Landscape PDF generated:', {
        size: `${(pdfBuffer.length / 1024).toFixed(2)}KB`,
        format: 'A4 Landscape',
      });
    }, 30000);

    test('should get browser pool statistics', () => {
      const stats = pdfService.getPoolStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.available).toBe('number');
      expect(typeof stats.pending).toBe('number');
      expect(stats.max).toBeGreaterThanOrEqual(stats.min);
      
      console.log('Browser pool stats:', stats);
    });

    test('should generate PDF with custom margins', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial;">
            <h1>Lettera di Incarico</h1>
            <p>Spett.le Prof. Marco Neri,</p>
            <p>Con la presente Le confermiamo l'incarico per...</p>
          </body>
        </html>
      `;
      
      const pdfBuffer = await pdfService.generatePDF(html, {
        margin: {
          top: '25mm',
          right: '20mm',
          bottom: '25mm',
          left: '20mm',
        },
      });
      
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(0);
      
      console.log('PDF with custom margins generated successfully');
    }, 30000);
  });

  describe('Integration: Storage + PDF (Template System)', () => {
    test('should generate Attestato PDF and save to storage', async () => {
      const attestatoHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @page { margin: 0; }
              body { 
                margin: 0;
                padding: 60px;
                font-family: 'Georgia', serif;
                background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);
              }
              .certificate {
                border: 10px solid #2c3e50;
                padding: 40px;
                text-align: center;
              }
              h1 {
                font-size: 48px;
                color: #2c3e50;
                margin-bottom: 30px;
                text-transform: uppercase;
              }
              .participant {
                font-size: 32px;
                color: #3498db;
                font-weight: bold;
                margin: 30px 0;
              }
              .course-info {
                font-size: 18px;
                line-height: 1.8;
                margin: 20px 0;
              }
              .footer {
                margin-top: 60px;
                font-size: 14px;
                color: #7f8c8d;
              }
            </style>
          </head>
          <body>
            <div class="certificate">
              <h1>🎓 Attestato di Formazione</h1>
              <div class="course-info">
                <p>Si certifica che</p>
              </div>
              <div class="participant">Mario Rossi</div>
              <div class="course-info">
                <p>ha partecipato con successo al corso</p>
                <p><strong>ANTINCENDIO RISCHIO ALTO</strong></p>
                <p>della durata di <strong>16 ore</strong></p>
                <p>svoltosi dal <strong>15/10/2025</strong> al <strong>22/10/2025</strong></p>
              </div>
              <div class="footer">
                <p>Milano, 04 Novembre 2025</p>
                <p>Element Medica S.r.l.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Generate PDF
      const startTime = Date.now();
      const pdfBuffer = await pdfService.generatePDF(attestatoHTML, {
        format: 'A4',
        printBackground: true,
      });
      const generationTime = Date.now() - startTime;
      
      expect(pdfBuffer).toBeDefined();
      expect(generationTime).toBeLessThan(10000); // Should complete in < 10s
      
      console.log('PDF generation time:', `${generationTime}ms`);

      // Save to storage
      const savedFile = await storageService.saveFile(
        pdfBuffer,
        'attestato-001-2025.pdf',
        'attestati'
      );

      expect(savedFile.filename).toContain('attestato-001-2025');
      expect(savedFile.fileSize).toBe(pdfBuffer.length);
      expect(savedFile.fileHash).toBeDefined();
      
      console.log('Attestato saved:', {
        filename: savedFile.filename,
        size: `${(savedFile.fileSize / 1024).toFixed(2)}KB`,
        path: savedFile.filepath,
      });

      // Retrieve and verify integrity
      const retrievedPdf = await storageService.getFile(savedFile.filepath);
      expect(retrievedPdf.length).toBe(pdfBuffer.length);
      
      // Verify file hash
      const crypto = await import('crypto');
      const retrievedHash = crypto.createHash('sha256').update(retrievedPdf).digest('hex');
      expect(retrievedHash).toBe(savedFile.fileHash);
      
      console.log('File integrity verified ✓');

      // Cleanup
      await storageService.deleteFile(savedFile.filepath);
      console.log('Test file cleaned up');
    }, 40000); // 40s timeout for full integration test
  });

});
