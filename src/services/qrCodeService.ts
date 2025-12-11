/**
 * QR Code Service
 * 
 * Servizio centralizzato per la generazione di QR code.
 * Utilizza qr-code-styling per generare QR code lato frontend.
 * Può essere utilizzato per:
 * - Condivisione form
 * - Verifica attestati
 * - Link pubblici
 */

import QRCodeStyling, { Options as QRCodeOptions } from 'qr-code-styling';

export interface QRCodeConfig {
    data: string;
    size?: number;
    type?: 'svg' | 'canvas';
    primaryColor?: string;
    backgroundColor?: string;
    logoUrl?: string;
    logoSize?: number;
    dotsStyle?: 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
    cornersStyle?: 'dot' | 'square' | 'extra-rounded';
}

export interface GeneratedQRCode {
    instance: QRCodeStyling;
    dataUrl: Promise<string>;
    blob: Promise<Blob>;
}

/**
 * Default configuration for QR codes
 */
const DEFAULT_CONFIG: Partial<QRCodeConfig> = {
    size: 256,
    type: 'svg',
    primaryColor: '#1d4ed8',
    backgroundColor: '#ffffff',
    dotsStyle: 'rounded',
    cornersStyle: 'extra-rounded',
};

/**
 * Creates a QR code instance with the given configuration
 */
export function createQRCode(config: QRCodeConfig): QRCodeStyling {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    const options: QRCodeOptions = {
        width: mergedConfig.size,
        height: mergedConfig.size,
        type: mergedConfig.type,
        data: mergedConfig.data,
        dotsOptions: {
            color: mergedConfig.primaryColor,
            type: mergedConfig.dotsStyle,
        },
        backgroundOptions: {
            color: mergedConfig.backgroundColor,
        },
        cornersSquareOptions: {
            type: mergedConfig.cornersStyle,
            color: mergedConfig.primaryColor,
        },
        cornersDotOptions: {
            type: 'dot',
            color: mergedConfig.primaryColor,
        },
        imageOptions: {
            crossOrigin: 'anonymous',
            margin: 5,
        },
    };

    // Add logo if provided
    if (mergedConfig.logoUrl) {
        options.image = mergedConfig.logoUrl;
        options.imageOptions = {
            ...options.imageOptions,
            imageSize: mergedConfig.logoSize || 0.4,
        };
    }

    return new QRCodeStyling(options);
}

/**
 * Generates a QR code and returns it as a data URL (base64)
 */
export async function generateQRCodeDataUrl(config: QRCodeConfig): Promise<string> {
    const qrCode = createQRCode(config);
    const rawData = await qrCode.getRawData('png');

    if (!rawData) {
        throw new Error('Failed to generate QR code blob');
    }

    // Handle both Blob and Buffer types
    let blob: Blob;
    if (rawData instanceof Blob) {
        blob = rawData;
    } else {
        // Buffer type - convert via unknown to avoid type issues
        const arrayBuffer = (rawData as unknown as ArrayBuffer);
        const uint8Array = new Uint8Array(arrayBuffer);
        blob = new Blob([uint8Array], { type: 'image/png' });
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Generates a QR code and returns it as a Blob
 */
export async function generateQRCodeBlob(config: QRCodeConfig, format: 'png' | 'jpeg' | 'webp' = 'png'): Promise<Blob> {
    const qrCode = createQRCode(config);
    const rawData = await qrCode.getRawData(format);

    if (!rawData) {
        throw new Error('Failed to generate QR code blob');
    }

    // Handle both Blob and Buffer types
    if (rawData instanceof Blob) {
        return rawData;
    }

    // Buffer type - convert via unknown to avoid type issues
    const arrayBuffer = (rawData as unknown as ArrayBuffer);
    const uint8Array = new Uint8Array(arrayBuffer);
    return new Blob([uint8Array], { type: `image/${format}` });
}

/**
 * Generates a QR code and appends it to a DOM element
 */
export function appendQRCodeToElement(config: QRCodeConfig, element: HTMLElement): QRCodeStyling {
    const qrCode = createQRCode(config);
    element.innerHTML = '';
    qrCode.append(element);
    return qrCode;
}

/**
 * Downloads a QR code as a file
 */
export async function downloadQRCode(
    config: QRCodeConfig,
    filename: string,
    extension: 'png' | 'jpeg' | 'webp' | 'svg' = 'png'
): Promise<void> {
    const qrCode = createQRCode(config);
    await qrCode.download({
        name: filename,
        extension,
    });
}

/**
 * Generates a QR code for certificate/attestato verification
 */
export async function generateVerificationQRCode(
    attestatoNumber: string,
    baseUrl: string = window.location.origin
): Promise<string> {
    const verifyUrl = `${baseUrl}/verify/${encodeURIComponent(attestatoNumber)}`;

    return generateQRCodeDataUrl({
        data: verifyUrl,
        size: 150,
        primaryColor: '#1d4ed8',
        dotsStyle: 'rounded',
        cornersStyle: 'extra-rounded',
    });
}

/**
 * Generates a QR code for form sharing
 */
export async function generateFormShareQRCode(
    formUrl: string,
    options?: Partial<QRCodeConfig>
): Promise<string> {
    return generateQRCodeDataUrl({
        data: formUrl,
        size: 256,
        primaryColor: '#1d4ed8',
        dotsStyle: 'rounded',
        cornersStyle: 'extra-rounded',
        ...options,
    });
}

/**
 * Generates an SVG string for a QR code (useful for server-side rendering)
 * Note: This requires the QR code to be rendered first
 */
export async function generateQRCodeSVG(config: QRCodeConfig): Promise<string> {
    const qrCode = createQRCode({ ...config, type: 'svg' });

    // Create a temporary container
    const container = document.createElement('div');
    qrCode.append(container);

    // Wait for SVG to be rendered
    await new Promise(resolve => setTimeout(resolve, 100));

    const svg = container.querySelector('svg');
    if (!svg) {
        throw new Error('Failed to generate QR code SVG');
    }

    const svgString = svg.outerHTML;
    container.remove();

    return svgString;
}

// Export default instance for convenience
export default {
    create: createQRCode,
    toDataUrl: generateQRCodeDataUrl,
    toBlob: generateQRCodeBlob,
    appendTo: appendQRCodeToElement,
    download: downloadQRCode,
    forVerification: generateVerificationQRCode,
    forFormShare: generateFormShareQRCode,
    toSVG: generateQRCodeSVG,
};
