/**
 * QR Code Service - Backend
 * 
 * Servizio per la generazione di QR code lato backend.
 * Utilizza la libreria 'qrcode' per generare QR code come:
 * - Data URL (base64) per embedding in HTML/PDF
 * - Buffer PNG per salvataggio file
 * - SVG string per template
 * 
 * Sostituisce l'uso di Google Chart API per i QR code.
 */

import QRCode from 'qrcode';
import logger from '../utils/logger.js';

/**
 * QR Code Options
 */
const DEFAULT_OPTIONS = {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 1,
    width: 150,
    color: {
        dark: '#000000',  // Changed from blue (#1d4ed8) to black
        light: '#ffffff'
    }
};

/**
 * Genera un QR code come Data URL (base64)
 * Usabile direttamente come src di un tag <img>
 * 
 * @param {string} data - Dati da codificare nel QR
 * @param {Object} options - Opzioni di generazione
 * @returns {Promise<string>} - Data URL (es: data:image/png;base64,...)
 */
export async function generateQRCodeDataUrl(data, options = {}) {
    try {
        const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
        const dataUrl = await QRCode.toDataURL(data, mergedOptions);
        logger.debug('QR Code generated as Data URL', { dataLength: data.length });
        return dataUrl;
    } catch (error) {
        logger.error('Failed to generate QR code Data URL', { error: error.message });
        throw error;
    }
}

/**
 * Genera un QR code come Buffer PNG
 * Usabile per salvataggio su file system
 * 
 * @param {string} data - Dati da codificare nel QR
 * @param {Object} options - Opzioni di generazione
 * @returns {Promise<Buffer>} - Buffer PNG
 */
export async function generateQRCodeBuffer(data, options = {}) {
    try {
        const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
        const buffer = await QRCode.toBuffer(data, mergedOptions);
        logger.debug('QR Code generated as Buffer', { dataLength: data.length, bufferSize: buffer.length });
        return buffer;
    } catch (error) {
        logger.error('Failed to generate QR code Buffer', { error: error.message });
        throw error;
    }
}

/**
 * Genera un QR code come stringa SVG
 * Usabile per embedding inline in HTML
 * 
 * @param {string} data - Dati da codificare nel QR
 * @param {Object} options - Opzioni di generazione
 * @returns {Promise<string>} - Stringa SVG
 */
export async function generateQRCodeSVG(data, options = {}) {
    try {
        const mergedOptions = {
            ...DEFAULT_OPTIONS,
            ...options,
            type: 'svg'
        };
        const svg = await QRCode.toString(data, mergedOptions);
        logger.debug('QR Code generated as SVG', { dataLength: data.length });
        return svg;
    } catch (error) {
        logger.error('Failed to generate QR code SVG', { error: error.message });
        throw error;
    }
}

/**
 * Genera un QR code per la verifica di un attestato
 * 
 * @param {string} attestatoNumber - Numero attestato (es: ATT/2024/000001)
 * @param {string} baseUrl - URL base per la verifica (default: PUBLIC_URL)
 * @param {Object} options - Opzioni di generazione
 * @returns {Promise<string>} - Data URL del QR code
 */
export async function generateVerificationQRCode(attestatoNumber, baseUrl = null, options = {}) {
    const publicUrl = baseUrl || process.env.PUBLIC_URL || 'https://app.elementmedica.it';
    const verifyUrl = `${publicUrl}/verify/${encodeURIComponent(attestatoNumber)}`;

    logger.info('Generating verification QR code', { attestatoNumber, verifyUrl });

    return generateQRCodeDataUrl(verifyUrl, {
        width: 150,
        margin: 1,
        color: {
            dark: '#1d4ed8',
            light: '#ffffff'
        },
        ...options
    });
}

/**
 * Genera un QR code per la condivisione di un form
 * 
 * @param {string} formUrl - URL del form da condividere
 * @param {Object} options - Opzioni di generazione
 * @returns {Promise<string>} - Data URL del QR code
 */
export async function generateFormShareQRCode(formUrl, options = {}) {
    logger.info('Generating form share QR code', { formUrl });

    return generateQRCodeDataUrl(formUrl, {
        width: 256,
        margin: 2,
        color: {
            dark: '#1d4ed8',
            light: '#ffffff'
        },
        ...options
    });
}

/**
 * Genera un tag HTML img con il QR code embedded
 * Utile per inserimento diretto nei template HTML
 * 
 * @param {string} data - Dati da codificare nel QR
 * @param {Object} options - Opzioni di generazione
 * @param {string} alt - Testo alternativo per l'immagine
 * @returns {Promise<string>} - Tag HTML img completo
 */
export async function generateQRCodeImgTag(data, options = {}, alt = 'QR Code') {
    const dataUrl = await generateQRCodeDataUrl(data, options);
    const width = options.width || DEFAULT_OPTIONS.width;
    const height = options.height || width;

    return `<img src="${dataUrl}" alt="${alt}" width="${width}" height="${height}" style="display: block;" />`;
}

// Export default object with all methods
export default {
    toDataUrl: generateQRCodeDataUrl,
    toBuffer: generateQRCodeBuffer,
    toSVG: generateQRCodeSVG,
    forVerification: generateVerificationQRCode,
    forFormShare: generateFormShareQRCode,
    toImgTag: generateQRCodeImgTag
};
