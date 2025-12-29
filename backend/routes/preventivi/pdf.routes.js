/**
 * Preventivi PDF Routes
 * 
 * Generazione PDF preventivi:
 * - GET /:id/pdf - Genera e scarica PDF
 * 
 * @module routes/preventivi/pdf.routes
 */

import {
  express,
  param,
  prisma,
  authenticate,
  requirePermissions,
  logger,
  preventiviService,
  validate
} from './common.js';

const router = express.Router();

/**
 * GET /api/preventivi/:id/pdf
 * Genera e scarica PDF preventivo
 * 
 * Utilizza il template "Preventivo" configurato nel sistema.
 * Il PDF viene generato on-demand e il buffer restituito.
 * I metadati (dataGenerazione, fileUrl, fileName, fileSize) vengono
 * salvati nel preventivo per tracciabilità.
 */
router.get('/:id/pdf',
  authenticate,
  requirePermissions(['preventivi:read']),
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.person;
      const { id } = req.params;

      // Verifica esistenza preventivo
      const preventivo = await prisma.preventivo.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!preventivo) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Genera PDF
      const { buffer, filename, fileUrl, documentId } = await preventiviService.generatePDF({
        preventivoId: id,
        userId,
        tenantId
      });

      // Salva dataGenerazione e fileUrl nel preventivo
      await prisma.preventivo.update({
        where: { id },
        data: {
          dataGenerazione: new Date(),
          fileUrl: fileUrl || filename,
          fileName: filename,
          fileSize: buffer.length
        }
      });

      // Imposta headers per download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      // Invia buffer
      res.send(buffer);

      logger.info('PDF generated and sent', {
        component: 'preventivi-routes',
        action: 'pdf',
        preventivoId: id,
        numero: preventivo.numeroProgressivo,
        filename,
        fileSize: buffer.length,
        fileUrl,
        documentId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to generate PDF', {
        component: 'preventivi-routes',
        action: 'pdf',
        preventivoId: req.params.id,
        error: error.message,
        stack: error.stack
      });

      // Errore specifico per template mancante
      if (error.message.includes('Template "Preventivo" non trovato')) {
        return res.status(404).json({
          success: false,
          error: 'Template "Preventivo" non configurato',
          message: 'Creare template di tipo PREVENTIVO prima di generare PDF'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Errore generazione PDF',
        message: error.message
      });
    }
  }
);

export default router;
