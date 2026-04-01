/**
 * SignaturePlaceholderService
 * 
 * P65: Servizio per gestire i placeholder firma nei template.
 * Integra FirmaDigitaleService con il sistema di generazione documenti.
 * 
 * Supporta:
 * - {{FIRMA_MEDICO}} - Firma del medico
 * - {{FIRMA_PAZIENTE}} - Firma del paziente
 * - {{FIRMA_DIPENDENTE}} - Firma del dipendente (MDL)
 * - {{FIRMA_FORMATORE}} - Firma del formatore (corsi)
 * - {{FIRMA_DATORE}} - Firma del datore di lavoro
 * 
 * @module services/signature/SignaturePlaceholderService
 * @project P65 - FSE Integration
 */

import optimizedPrisma from '../../config/database.js';
import FirmaDigitaleService from './FirmaDigitaleService.js';
import logger from '../../utils/logger.js';

const prisma = optimizedPrisma.getClient();

/**
 * Stili default per rendering firma in HTML/PDF
 */
const SIGNATURE_STYLES = {
    container: `
    display: inline-block;
    max-width: 200px;
    max-height: 80px;
    margin: 5px 0;
  `,
    image: `
    max-width: 100%;
    max-height: 80px;
    object-fit: contain;
  `,
    placeholder: `
    display: inline-block;
    width: 200px;
    height: 60px;
    border-bottom: 1px solid #333;
    margin: 5px 0;
  `,
    label: `
    font-size: 10px;
    color: #666;
    text-align: center;
    margin-top: 2px;
  `
};

/**
 * Mappa tipo firmatario -> path firma nel context
 */
const SIGNATURE_PATH_MAP = {
    MEDICO: 'medico.firma',
    PAZIENTE: 'paziente.firma',
    DIPENDENTE: 'dipendente.firma',
    FORMATORE: 'formatore.firma',
    DATORE_LAVORO: 'datore.firma',
    OPERATORE: 'operatore.firma',
    RAPPRESENTANTE_LEGALE: 'rappresentante.firma',
    // P65 Fase 2: Nuovi ruoli
    RSPP: 'rspp.firma',
    MEDICO_COMPETENTE: 'mc.firma',
    RLS: 'rls.firma',
    PREPOSTO: 'preposto.firma',
    PARTECIPANTE: 'partecipante.firma',
    CLIENTE: 'cliente.firma'
};

class SignaturePlaceholderService {
    /**
     * Ottieni HTML per placeholder firma
     * Se la firma esiste, renderizza immagine. Altrimenti, placeholder vuoto.
     * 
     * @param {Object} params
     * @param {string} params.tipoFirmatario - MEDICO, PAZIENTE, DIPENDENTE, FORMATORE, DATORE_LAVORO
     * @param {string|null} params.firmaImageUrl - URL o base64 immagine firma
     * @param {string|null} params.firmaImageBase64 - Base64 immagine firma alternativo
     * @param {boolean} params.renderEmpty - Se true, renderizza placeholder vuoto. Default: true
     * @param {string} params.label - Label sotto la firma
     * @returns {string} HTML della firma
     */
    static renderSignatureHtml({
        tipoFirmatario,
        firmaImageUrl = null,
        firmaImageBase64 = null,
        renderEmpty = true,
        label = null
    }) {
        const imageSource = firmaImageUrl || (firmaImageBase64 ? `data:image/png;base64,${firmaImageBase64}` : null);
        const defaultLabel = this._getDefaultLabel(tipoFirmatario);
        const finalLabel = label || defaultLabel;

        if (imageSource) {
            // Firma presente - renderizza immagine
            return `
        <div style="${SIGNATURE_STYLES.container}">
          <img src="${imageSource}" alt="Firma ${finalLabel}" style="${SIGNATURE_STYLES.image}" />
          <div style="${SIGNATURE_STYLES.label}">${finalLabel}</div>
        </div>
      `.trim();
        }

        if (renderEmpty) {
            // Placeholder vuoto per firma manuale
            return `
        <div style="${SIGNATURE_STYLES.container}">
          <div style="${SIGNATURE_STYLES.placeholder}"></div>
          <div style="${SIGNATURE_STYLES.label}">${finalLabel}</div>
        </div>
      `.trim();
        }

        return '';
    }

    /**
     * Ottieni label default per tipo firmatario
     * @private
     */
    static _getDefaultLabel(tipoFirmatario) {
        const labels = {
            MEDICO: 'Il Medico',
            PAZIENTE: 'Il Paziente',
            DIPENDENTE: 'Il Dipendente',
            FORMATORE: 'Il Formatore',
            DATORE_LAVORO: 'Il Datore di Lavoro',
            OPERATORE: "L'Operatore",
            RAPPRESENTANTE_LEGALE: 'Il Rappresentante Legale',
            // P65 Fase 2: Nuovi ruoli
            RSPP: 'RSPP',
            MEDICO_COMPETENTE: 'Medico Competente',
            RLS: 'RLS',
            PREPOSTO: 'Il Preposto',
            PARTECIPANTE: 'Il Partecipante',
            CLIENTE: 'Il Cliente'
        };
        return labels[tipoFirmatario] || 'Firma';
    }

    /**
     * Popola il context con i dati firma per tutti i firmatari
     * 
     * @param {Object} params
     * @param {Object} params.context - Context da popolarecon i dati firma
     * @param {string} params.documentId - ID documento (DocumentoCompilato, Attestato, etc.)
     * @param {string} params.documentType - Tipo documento (REFERTO, CONSENSO, ATTESTATO, etc.)
     * @param {string} params.tenantId - ID tenant
     * @returns {Promise<Object>} Context arricchito con dati firma
     */
    static async enrichContextWithSignatures({
        context,
        documentId,
        documentType,
        tenantId
    }) {
        try {
            // Carica firme associate al documento
            const signatures = await prisma.firmaDigitale.findMany({
                where: {
                    tenantId,
                    documentoId: documentId,
                    documentType,
                    stato: 'FIRMATO',
                    deletedAt: null
                },
                include: {
                    firmatario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });

            // Popola context per ogni tipo firmatario
            for (const firma of signatures) {
                const firmatarioPath = SIGNATURE_PATH_MAP[firma.firmatarioRole];
                if (firmatarioPath) {
                    const pathParts = firmatarioPath.split('.');
                    const category = pathParts[0];

                    // Assicura che la categoria esista
                    if (!context[category]) {
                        context[category] = {};
                    }

                    // Aggiungi firma HTML renderizzato
                    context[category].firma = this.renderSignatureHtml({
                        tipoFirmatario: firma.firmatarioRole,
                        firmaImageUrl: firma.firmaImageUrl
                    });

                    // Aggiungi anche dati raw per uso avanzato
                    context[category].firmaRaw = firma.firmaImageUrl;
                    context[category].firmaAt = firma.createdAt;
                    context[category].firmaTipo = firma.tipoFirma;
                }
            }

            return context;
        } catch (error) {
            logger.error('Errore enrichContextWithSignatures:', error);
            return context;
        }
    }

    /**
     * Popola context con firme da DocumentoCompilato
     * 
     * @param {Object} params
     * @param {Object} params.context - Context da popolare
     * @param {Object} params.documento - DocumentoCompilato record
     * @returns {Object} Context arricchito
     */
    static enrichContextFromDocumentoCompilato({ context, documento }) {
        // Firma Paziente
        if (documento.firmaPaziente) {
            if (!context.paziente) context.paziente = {};
            context.paziente.firma = this.renderSignatureHtml({
                tipoFirmatario: 'PAZIENTE',
                firmaImageUrl: documento.firmaPaziente
            });
            context.paziente.firmaRaw = documento.firmaPaziente;
            context.paziente.firmaAt = documento.firmaPazienteAt;
        }

        // Firma Medico
        if (documento.firmaMedico) {
            if (!context.medico) context.medico = {};
            context.medico.firma = this.renderSignatureHtml({
                tipoFirmatario: 'MEDICO',
                firmaImageUrl: documento.firmaMedico
            });
            context.medico.firmaRaw = documento.firmaMedico;
            context.medico.firmaAt = documento.firmaMedicoAt;
        }

        // Firma Dipendente
        if (documento.firmaDipendente) {
            if (!context.dipendente) context.dipendente = {};
            context.dipendente.firma = this.renderSignatureHtml({
                tipoFirmatario: 'DIPENDENTE',
                firmaImageUrl: documento.firmaDipendente
            });
            context.dipendente.firmaRaw = documento.firmaDipendente;
            context.dipendente.firmaAt = documento.firmaDipendenteAt;
        }

        // Firma Formatore
        if (documento.firmaFormatore) {
            if (!context.formatore) context.formatore = {};
            context.formatore.firma = this.renderSignatureHtml({
                tipoFirmatario: 'FORMATORE',
                firmaImageUrl: documento.firmaFormatore
            });
            context.formatore.firmaRaw = documento.firmaFormatore;
            context.formatore.firmaAt = documento.firmaFormatoreAt;
        }

        // Firma Datore
        if (documento.firmaDatore) {
            if (!context.datore) context.datore = {};
            context.datore.firma = this.renderSignatureHtml({
                tipoFirmatario: 'DATORE_LAVORO',
                firmaImageUrl: documento.firmaDatore
            });
            context.datore.firmaRaw = documento.firmaDatore;
            context.datore.firmaAt = documento.firmaDatoreAt;
        }

        return context;
    }

    /**
     * Popola context con firme da Attestato
     * 
     * @param {Object} params
     * @param {Object} params.context - Context da popolare
     * @param {Object} params.attestato - Attestato record
     * @returns {Object} Context arricchito
     */
    static enrichContextFromAttestato({ context, attestato }) {
        // Firma Formatore
        if (attestato.firmaFormatore) {
            if (!context.formatore) context.formatore = {};
            context.formatore.firma = this.renderSignatureHtml({
                tipoFirmatario: 'FORMATORE',
                firmaImageUrl: attestato.firmaFormatore
            });
            context.formatore.firmaRaw = attestato.firmaFormatore;
            context.formatore.firmaAt = attestato.firmaFormatoreAt;
        }

        // Firma Partecipante (come paziente/dipendente)
        if (attestato.firmaPartecipante) {
            if (!context.paziente) context.paziente = {};
            context.paziente.firma = this.renderSignatureHtml({
                tipoFirmatario: 'DIPENDENTE',
                firmaImageUrl: attestato.firmaPartecipante,
                label: 'Il Partecipante'
            });
            context.paziente.firmaRaw = attestato.firmaPartecipante;
            context.paziente.firmaAt = attestato.firmaPartecipanteAt;

            // Alias anche per dipendente
            if (!context.dipendente) context.dipendente = {};
            context.dipendente.firma = context.paziente.firma;
            context.dipendente.firmaRaw = context.paziente.firmaRaw;
            context.dipendente.firmaAt = context.paziente.firmaAt;
        }

        return context;
    }

    /**
     * Popola context con firme da LetteraIncarico
     * 
     * @param {Object} params
     * @param {Object} params.context - Context da popolare
     * @param {Object} params.lettera - LetteraIncarico record
     * @returns {Object} Context arricchito
     */
    static enrichContextFromLetteraIncarico({ context, lettera }) {
        // Firma Formatore (trainer che accetta incarico)
        if (lettera.firmaFormatore) {
            if (!context.formatore) context.formatore = {};
            context.formatore.firma = this.renderSignatureHtml({
                tipoFirmatario: 'FORMATORE',
                firmaImageUrl: lettera.firmaFormatore,
                label: 'Il Formatore'
            });
            context.formatore.firmaRaw = lettera.firmaFormatore;
            context.formatore.firmaAt = lettera.firmaFormatoreAt;
        }

        // Firma Datore Lavoro (chi conferisce incarico)
        if (lettera.firmaDatoreLavoro) {
            if (!context.datore) context.datore = {};
            context.datore.firma = this.renderSignatureHtml({
                tipoFirmatario: 'DATORE_LAVORO',
                firmaImageUrl: lettera.firmaDatoreLavoro
            });
            context.datore.firmaRaw = lettera.firmaDatoreLavoro;
            context.datore.firmaAt = lettera.firmaDatoreLavoroAt;
        }

        return context;
    }

    /**
     * Popola context con firme da DVR
     * 
     * @param {Object} params
     * @param {Object} params.context - Context da popolare
     * @param {Object} params.dvr - DVR record
     * @returns {Object} Context arricchito
     */
    static enrichContextFromDVR({ context, dvr }) {
        // Firma RSPP
        if (dvr.firmaRspp) {
            if (!context.rspp) context.rspp = {};
            context.rspp.firma = this.renderSignatureHtml({
                tipoFirmatario: 'RSPP',
                firmaImageUrl: dvr.firmaRspp,
                label: 'RSPP'
            });
            context.rspp.firmaRaw = dvr.firmaRspp;
            context.rspp.firmaAt = dvr.firmaRsppAt;
        }

        // Firma Medico Competente
        if (dvr.firmaMc) {
            if (!context.mc) context.mc = {};
            context.mc.firma = this.renderSignatureHtml({
                tipoFirmatario: 'MEDICO_COMPETENTE',
                firmaImageUrl: dvr.firmaMc,
                label: 'Medico Competente'
            });
            context.mc.firmaRaw = dvr.firmaMc;
            context.mc.firmaAt = dvr.firmaMcAt;
        }

        // Firma Datore di Lavoro
        if (dvr.firmaDatore) {
            if (!context.datore) context.datore = {};
            context.datore.firma = this.renderSignatureHtml({
                tipoFirmatario: 'DATORE_LAVORO',
                firmaImageUrl: dvr.firmaDatore,
                label: 'Il Datore di Lavoro'
            });
            context.datore.firmaRaw = dvr.firmaDatore;
            context.datore.firmaAt = dvr.firmaDatoreAt;
        }

        // Firma RLS
        if (dvr.firmaRls) {
            if (!context.rls) context.rls = {};
            context.rls.firma = this.renderSignatureHtml({
                tipoFirmatario: 'RLS',
                firmaImageUrl: dvr.firmaRls,
                label: 'RLS'
            });
            context.rls.firmaRaw = dvr.firmaRls;
            context.rls.firmaAt = dvr.firmaRlsAt;
        }

        return context;
    }

    /**
     * Popola context con firme da Sopralluogo
     * 
     * @param {Object} params
     * @param {Object} params.context - Context da popolare
     * @param {Object} params.sopralluogo - Sopralluogo record
     * @returns {Object} Context arricchito
     */
    static enrichContextFromSopralluogo({ context, sopralluogo }) {
        // Firma Medico Competente
        if (sopralluogo.firmaMc) {
            if (!context.mc) context.mc = {};
            context.mc.firma = this.renderSignatureHtml({
                tipoFirmatario: 'MEDICO_COMPETENTE',
                firmaImageUrl: sopralluogo.firmaMc,
                label: 'Medico Competente'
            });
            context.mc.firmaRaw = sopralluogo.firmaMc;
            context.mc.firmaAt = sopralluogo.firmaMcAt;
        }

        // Firma RSPP
        if (sopralluogo.firmaRspp) {
            if (!context.rspp) context.rspp = {};
            context.rspp.firma = this.renderSignatureHtml({
                tipoFirmatario: 'RSPP',
                firmaImageUrl: sopralluogo.firmaRspp,
                label: 'RSPP'
            });
            context.rspp.firmaRaw = sopralluogo.firmaRspp;
            context.rspp.firmaAt = sopralluogo.firmaRsppAt;
        }

        // Firma Datore di Lavoro
        if (sopralluogo.firmaDatore) {
            if (!context.datore) context.datore = {};
            context.datore.firma = this.renderSignatureHtml({
                tipoFirmatario: 'DATORE_LAVORO',
                firmaImageUrl: sopralluogo.firmaDatore,
                label: 'Il Datore di Lavoro'
            });
            context.datore.firmaRaw = sopralluogo.firmaDatore;
            context.datore.firmaAt = sopralluogo.firmaDatoreAt;
        }

        return context;
    }

    /**
     * Popola context con firme da Preventivo
     * 
     * @param {Object} params
     * @param {Object} params.context - Context da popolare
     * @param {Object} params.preventivo - Preventivo record
     * @returns {Object} Context arricchito
     */
    static enrichContextFromPreventivo({ context, preventivo }) {
        // Firma Operatore
        if (preventivo.firmaOperatore) {
            if (!context.operatore) context.operatore = {};
            context.operatore.firma = this.renderSignatureHtml({
                tipoFirmatario: 'OPERATORE',
                firmaImageUrl: preventivo.firmaOperatore,
                label: "L'Operatore"
            });
            context.operatore.firmaRaw = preventivo.firmaOperatore;
            context.operatore.firmaAt = preventivo.firmaOperatoreAt;
        }

        // Firma Cliente
        if (preventivo.firmaCliente) {
            if (!context.cliente) context.cliente = {};
            context.cliente.firma = this.renderSignatureHtml({
                tipoFirmatario: 'CLIENTE',
                firmaImageUrl: preventivo.firmaCliente,
                label: 'Il Cliente'
            });
            context.cliente.firmaRaw = preventivo.firmaCliente;
            context.cliente.firmaAt = preventivo.firmaClienteAt;
        }

        return context;
    }

    /**
     * Popola context con firme da RegistroPresenze
     * 
     * @param {Object} params
     * @param {Object} params.context - Context da popolare
     * @param {Object} params.registro - RegistroPresenze record
     * @returns {Object} Context arricchito
     */
    static enrichContextFromRegistroPresenze({ context, registro }) {
        // Firma Formatore
        if (registro.firmaFormatore) {
            if (!context.formatore) context.formatore = {};
            context.formatore.firma = this.renderSignatureHtml({
                tipoFirmatario: 'FORMATORE',
                firmaImageUrl: registro.firmaFormatore,
                label: 'Il Formatore'
            });
            context.formatore.firmaRaw = registro.firmaFormatore;
            context.formatore.firmaAt = registro.firmaFormatoreAt;
        }

        return context;
    }

    /**
     * Determina quali firme sono richieste per un template
     * 
     * @param {Object} template - DocumentoTemplate record
     * @returns {Array<string>} Lista tipi firmatario richiesti
     */
    static getRequiredSignatures(template) {
        const required = [];

        if (template.richiedeFirma) required.push('PAZIENTE');
        if (template.richiedeFirmaMedico) required.push('MEDICO');
        if (template.richiedeFirmaDipendente) required.push('DIPENDENTE');
        if (template.richiedeFirmaFormatore) required.push('FORMATORE');
        if (template.richiedeFirmaDatore) required.push('DATORE_LAVORO');

        return required;
    }

    /**
     * Verifica se tutte le firme richieste sono presenti
     * 
     * @param {Object} params
     * @param {Object} params.template - DocumentoTemplate record
     * @param {Object} params.documento - DocumentoCompilato record
     * @returns {Object} { complete: boolean, missing: string[] }
     */
    static validateSignatures({ template, documento }) {
        const required = this.getRequiredSignatures(template);
        const missing = [];

        const signatureFields = {
            PAZIENTE: 'firmaPaziente',
            MEDICO: 'firmaMedico',
            DIPENDENTE: 'firmaDipendente',
            FORMATORE: 'firmaFormatore',
            DATORE_LAVORO: 'firmaDatore'
        };

        for (const tipo of required) {
            const field = signatureFields[tipo];
            if (field && !documento[field]) {
                missing.push(tipo);
            }
        }

        return {
            complete: missing.length === 0,
            missing,
            required
        };
    }

    /**
     * Estrai placeholder firma da template HTML
     * 
     * @param {string} templateHtml - Contenuto HTML del template
     * @returns {Array<string>} Lista placeholder firma trovati (es: ['FIRMA_MEDICO', 'FIRMA_PAZIENTE'])
     */
    static extractSignaturePlaceholders(templateHtml) {
        if (!templateHtml) return [];

        const regex = /\{\{(FIRMA_[A-Z_]+)\}\}/g;
        const placeholders = new Set();
        let match;

        while ((match = regex.exec(templateHtml)) !== null) {
            placeholders.add(match[1]);
        }

        // Converti in array e mappa a tipi firmatario
        return Array.from(placeholders);
    }

    /**
     * Mappa placeholder a tipo firmatario
     * 
     * @param {string} placeholder - Es: 'FIRMA_MEDICO'
     * @returns {string|null} Tipo firmatario corrispondente
     */
    static placeholderToTipoFirmatario(placeholder) {
        const map = {
            'FIRMA_MEDICO': 'MEDICO',
            'FIRMA_PAZIENTE': 'PAZIENTE',
            'FIRMA_DIPENDENTE': 'DIPENDENTE',
            'FIRMA_FORMATORE': 'FORMATORE',
            'FIRMA_DATORE': 'DATORE_LAVORO',
            'FIRMA_DATORE_LAVORO': 'DATORE_LAVORO',
            // P65 Fase 2: Nuovi placeholder
            'FIRMA_RSPP': 'RSPP',
            'FIRMA_MC': 'MEDICO_COMPETENTE',
            'FIRMA_MEDICO_COMPETENTE': 'MEDICO_COMPETENTE',
            'FIRMA_RLS': 'RLS',
            'FIRMA_PREPOSTO': 'PREPOSTO',
            'FIRMA_PARTECIPANTE': 'PARTECIPANTE',
            'FIRMA_CLIENTE': 'CLIENTE',
            'FIRMA_OPERATORE': 'OPERATORE'
        };
        return map[placeholder] || null;
    }

    /**
     * Genera riepilogo firme per visualizzazione UI
     * 
     * @param {Object} documento - Record documento con firme
     * @returns {Array<Object>} Lista firme con stato e metadata
     */
    static getSignaturesSummary(documento) {
        const signatures = [];

        const check = (field, tipo, label) => {
            if (documento[field]) {
                signatures.push({
                    tipo,
                    label,
                    firmato: true,
                    firmaAt: documento[`${field}At`],
                    firmaImageUrl: documento[field]
                });
            } else if (documento[`richiede${tipo.charAt(0) + tipo.slice(1).toLowerCase()}`]) {
                signatures.push({
                    tipo,
                    label,
                    firmato: false,
                    required: true
                });
            }
        };

        check('firmaPaziente', 'PAZIENTE', 'Paziente');
        check('firmaMedico', 'MEDICO', 'Medico');
        check('firmaDipendente', 'DIPENDENTE', 'Dipendente');
        check('firmaFormatore', 'FORMATORE', 'Formatore');
        check('firmaDatore', 'DATORE_LAVORO', 'Datore di Lavoro');

        return signatures;
    }
}

export default SignaturePlaceholderService;
