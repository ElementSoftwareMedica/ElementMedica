/**
 * GDT 2.1 File Generator
 * 
 * Generates GDT (Gerätedatentransfer) 2.1 compliant files for medical device communication.
 * Used to send patient data from the PVS (webapp) to medical devices.
 * 
 * GDT Line Format: LLL FFFF Content \r\n
 * - LLL: 3-digit line length (including length digits, field ID, content, CRLF)
 * - FFFF: 4-digit field ID (Feldkennung)
 * - Content: variable-length data
 * - \r\n: CRLF line terminator
 * 
 * Encoding: ISO-8859-1 (charset code 3)
 * 
 * @module gdt/generator
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import * as iconv from 'iconv-lite';
import logger from '../utils/logger.js';
import type { PatientData, DeviceConfig, BridgeConfig, GdtGender } from '../types/index.js';

/**
 * GDT Field IDs (Feldkennungen)
 */
const GDT_FIELDS = {
    // Header / Control
    SATZKENNUNG: '8000',     // Record type
    SATZLAENGE: '8100',      // Record length
    GDT_EMPFAENGER: '8315',  // Receiver ID (device)
    GDT_SENDER: '8316',      // Sender ID (PVS)
    GDT_VERSION: '9218',     // GDT version
    ZEICHENSATZ: '9206',     // Character set

    // Patient Data
    PATIENT_ID: '3000',      // Patient number
    NACHNAME: '3101',        // Last name
    VORNAME: '3102',         // First name
    GEBURTSDATUM: '3103',    // Date of birth (DDMMYYYY)
    TITEL: '3104',           // Title
    VERSICHERTENNR: '3105',  // Insurance number
    GESCHLECHT: '3110',      // Gender (1=M, 2=F)
    GROESSE: '3622',         // Height in cm
    GEWICHT: '3623',         // Weight in kg

    // Examination
    TAG_ERHEBUNG: '6200',    // Date of examination
    UHRZEIT_ERHEBUNG: '6201', // Time of examination
    BEFUNDTEXT: '6220',      // Finding text
    GERAETE_KENNFELD: '6302', // Device procedure ID
    VERFAHRENSBEZEICHNUNG: '6303', // Procedure name
} as const;

/**
 * Record types (Satzarten)
 */
const RECORD_TYPES = {
    /** Request examination (PVS → Device) */
    UNTERSUCHUNG_ANFORDERN: '6300',
    /** Examination data (Device → PVS) */
    UNTERSUCHUNG_UEBERMITTELN: '6301',
    /** Show data request */
    DATEN_ZEIGEN: '6302',
    /** Show examination data */
    DATEN_ZEIGEN_UEBERMITTELN: '6310',
    /** New examination request */
    NEUE_UNTERSUCHUNG: '6311',
} as const;

/**
 * Create a single GDT line
 * Format: LLL + FFFF + content + \r\n
 * LLL = 3 + 4 + content.length + 2
 */
function gdtLine(fieldId: string, content: string): string {
    const lineContent = `${fieldId}${content}\r\n`;
    const length = String(lineContent.length + 3).padStart(3, '0');
    return `${length}${lineContent}`;
}

/**
 * Convert ISO date (YYYY-MM-DD) to GDT date format (DDMMYYYY)
 */
function toGdtDate(isoDate: string): string {
    const parts = isoDate.split('-');
    if (parts.length !== 3) {
        throw new Error(`Invalid date format: ${isoDate}. Expected YYYY-MM-DD`);
    }
    return `${parts[2]}${parts[1]}${parts[0]}`;
}

/**
 * Get current date in GDT format (DDMMYYYY)
 */
function currentGdtDate(): string {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    return `${dd}${mm}${yyyy}`;
}

/**
 * Get current time in GDT format (HHMMSS)
 */
function currentGdtTime(): string {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${hh}${mm}${ss}`;
}

/**
 * Map webapp gender to GDT gender code
 */
function mapGender(gender: PatientData['gender']): GdtGender {
    return gender === 'MALE' ? '1' : '2';
}

/**
 * Generate a GDT 2.1 exam request file (Satzart 6300)
 * This file is written to the device's input directory
 * 
 * @param patient Patient data from the webapp
 * @param device Device configuration
 * @param config Bridge configuration
 * @returns GDT file content as ISO-8859-1 Buffer
 */
export function generateExamRequest(
    patient: PatientData,
    device: DeviceConfig,
    config: BridgeConfig
): Buffer {
    const lines: string[] = [];

    // Record type: Request examination
    lines.push(gdtLine(GDT_FIELDS.SATZKENNUNG, RECORD_TYPES.UNTERSUCHUNG_ANFORDERN));

    // Placeholder for record length — will be calculated
    const lengthPlaceholderIndex = lines.length;
    lines.push(''); // Will be replaced

    // GDT header
    lines.push(gdtLine(GDT_FIELDS.GDT_EMPFAENGER, device.gdtId));
    lines.push(gdtLine(GDT_FIELDS.GDT_SENDER, config.gdtSenderId));
    lines.push(gdtLine(GDT_FIELDS.GDT_VERSION, config.gdtVersion));
    lines.push(gdtLine(GDT_FIELDS.ZEICHENSATZ, String(config.gdtCharset)));

    // Patient data
    lines.push(gdtLine(GDT_FIELDS.PATIENT_ID, patient.patientId));
    lines.push(gdtLine(GDT_FIELDS.NACHNAME, patient.lastName));
    lines.push(gdtLine(GDT_FIELDS.VORNAME, patient.firstName));
    lines.push(gdtLine(GDT_FIELDS.GEBURTSDATUM, toGdtDate(patient.dateOfBirth)));
    lines.push(gdtLine(GDT_FIELDS.GESCHLECHT, mapGender(patient.gender)));

    // Optional patient data
    if (patient.taxCode) {
        lines.push(gdtLine(GDT_FIELDS.VERSICHERTENNR, patient.taxCode));
    }
    if (patient.heightCm) {
        lines.push(gdtLine(GDT_FIELDS.GROESSE, String(patient.heightCm)));
    }
    if (patient.weightKg) {
        lines.push(gdtLine(GDT_FIELDS.GEWICHT, String(Math.round(patient.weightKg))));
    }

    // Examination date/time
    lines.push(gdtLine(GDT_FIELDS.TAG_ERHEBUNG, currentGdtDate()));
    lines.push(gdtLine(GDT_FIELDS.UHRZEIT_ERHEBUNG, currentGdtTime()));

    // Calculate total record length (excluding the 8100 line itself)
    const contentWithoutLength = lines.filter((_, i) => i !== lengthPlaceholderIndex).join('');
    const totalLength = contentWithoutLength.length;
    const lengthLine = gdtLine(GDT_FIELDS.SATZLAENGE, String(totalLength).padStart(5, '0'));

    // The total must include the 8100 line itself
    const finalTotalLength = totalLength + lengthLine.length;
    lines[lengthPlaceholderIndex] = gdtLine(GDT_FIELDS.SATZLAENGE, String(finalTotalLength).padStart(5, '0'));

    const gdtContent = lines.join('');

    // Encode as ISO-8859-1
    return iconv.encode(gdtContent, 'iso-8859-1');
}

/**
 * Write GDT file to the device's input directory
 * 
 * @param content GDT file content as Buffer
 * @param device Device configuration
 * @param sessionId Session ID for unique filename
 * @returns Full path of the written file
 */
export async function writeGdtFile(
    content: Buffer,
    device: DeviceConfig,
    sessionId: string
): Promise<string> {
    // Ensure input directory exists
    if (!existsSync(device.gdtInputDir)) {
        await mkdir(device.gdtInputDir, { recursive: true });
    }

    // Generate filename: deviceid_sessionid.gdt
    const filename = `${device.gdtId}_${sessionId.substring(0, 8)}.gdt`;
    const filePath = join(device.gdtInputDir, filename);

    await writeFile(filePath, content);

    logger.info('GDT file written', {
        device: device.type,
        path: filePath,
        size: content.length,
        sessionId,
    });

    return filePath;
}

export { GDT_FIELDS, RECORD_TYPES, gdtLine, toGdtDate, currentGdtDate, currentGdtTime };
