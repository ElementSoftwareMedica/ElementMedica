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
 * Device-specific behaviour:
 *  EDAN ECG        — 6300 request, receiver+sender+charset+version, ECG exam item, date/time included
 *  Oscilla AudioConsole — 6302 request (device uses its own convention), sender+version only (no receiver,
 *                     no charset field), AUDI exam item, no software/accession/date fields,
 *                     patient ID ≤ 15 chars, version must be "02.10" (spec §1.3)
 *  MIR WinspiroPRO — 6301 request, version only (no receiver/sender/charset), no exam type field,
 *                     height+weight included, exam date only (no time, no software, no accession),
 *                     GDT version "2.00" (spec §3)
 *
 * @module gdt/generator
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import * as iconv from 'iconv-lite';
import logger from '../utils/logger.js';
import type { PatientData, DeviceConfig, BridgeConfig, GdtGender } from '../types/index.js';

// ────────────────────────── GDT field IDs ──────────────────────────

const GDT_FIELDS = {
    // Header / Control
    SATZKENNUNG: '8000',      // Record type
    SATZLAENGE: '8100',       // Record length
    GDT_EMPFAENGER: '8315',  // Receiver ID (device)
    GDT_SENDER: '8316',       // Sender ID (PVS)
    GDT_VERSION: '9218',      // GDT version
    ZEICHENSATZ: '9206',      // Character set
    SOFTWARE_NAME: '0103',    // PVS software name
    SOFTWARE_VERSION: '0132', // PVS software version

    // Patient Data
    PATIENT_ID: '3000',       // Patient number
    ANREDE: '3100',           // Prefix/title
    NACHNAME: '3101',         // Last name
    VORNAME: '3102',          // First name
    GEBURTSDATUM: '3103',     // Date of birth (DDMMYYYY)
    TITEL: '3104',            // Title
    VERSICHERTENNR: '3105',   // Insurance number
    WOHNORT: '3106',          // Residence/postal data
    STRASSE: '3107',          // Street
    VERSICHERTENSTATUS: '3108',// Insurance status
    GESCHLECHT: '3110',       // Gender (1=M, 2=F)
    GROESSE: '3622',          // Height in cm
    GEWICHT: '3623',          // Weight in kg
    MUTTERSPRACHE: '3628',    // Language

    // Examination
    AUFTRAGSNUMMER: '0102',   // Accession/request number
    TAG_ERHEBUNG: '6200',     // Date of examination
    UHRZEIT_ERHEBUNG: '6201', // Time of examination
    BEFUNDTEXT: '6220',       // Finding text
    GERAETE_KENNFELD: '6302', // Device procedure ID
    VERFAHRENSBEZEICHNUNG: '6303', // Procedure name
    UNTERSUCHUNGSGRUPPE: '8402',   // Exam item/group
} as const;

// ────────────────────────── Record types ──────────────────────────

const RECORD_TYPES = {
    /** Standard examination request PVS → Device (EDAN ECG) */
    UNTERSUCHUNG_ANFORDERN: '6300',
    /** MIR WinspiroPRO examination request (per MIR GDT spec §3) */
    MIR_EXAM_REQUEST: '6301',
    /** New Test Request — Oscilla AudioConsole uses this for its input (non-standard) */
    OSCILLA_NEW_TEST: '6302',
    /** Show examination data (device → PVS, standard result record) */
    DATEN_ZEIGEN_UEBERMITTELN: '6310',
    /** New examination request */
    NEUE_UNTERSUCHUNG: '6311',
} as const;

// ────────────────────────── Low-level helpers ─────────────────────

/**
 * Create a single GDT line.
 * Format: LLL + FFFF + content + \r\n  where LLL = total byte count including LLL itself.
 */
function gdtLine(fieldId: string, content: string): string {
    const lineContent = `${fieldId}${content}\r\n`;
    const length = String(lineContent.length + 3).padStart(3, '0');
    return `${length}${lineContent}`;
}

/** Convert ISO date YYYY-MM-DD → GDT format DDMMYYYY */
function toGdtDate(isoDate: string): string {
    const parts = isoDate.split('-');
    if (parts.length !== 3) throw new Error(`Invalid date format: ${isoDate}. Expected YYYY-MM-DD`);
    return `${parts[2]}${parts[1]}${parts[0]}`;
}

function currentGdtDate(): string {
    const now = new Date();
    return (
        String(now.getDate()).padStart(2, '0') +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getFullYear())
    );
}

function currentGdtTime(): string {
    const now = new Date();
    return (
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0')
    );
}

function mapGender(gender: PatientData['gender']): GdtGender {
    return gender === 'MALE' ? '1' : '2';
}

// ────────────────────────── Device helpers ─────────────────────────

function isEdanEcg(device: DeviceConfig): boolean {
    return device.type === 'edan-ecg' || device.examType === 'ecg';
}

function isOscillaAudiometer(device: DeviceConfig): boolean {
    return device.type === 'oscilla-audiometer' || device.examType === 'audiometry';
}

function isMirSpirometer(device: DeviceConfig): boolean {
    return device.type === 'mir-spirometer' || device.examType === 'spirometry';
}

/**
 * GDT version string — device-specific.
 * Oscilla spec (§1.3) requires "02.10" with leading zero.
 * MIR WinspiroPRO spec (§3) requires "2.00".
 * EDAN and generic devices use config value (default "2.10").
 */
function resolveGdtVersion(device: DeviceConfig, config: BridgeConfig): string {
    if (isOscillaAudiometer(device)) return '02.10';
    if (isMirSpirometer(device)) return '2.00';
    return config.gdtVersion;
}

function resolveReceiverId(device: DeviceConfig): string {
    if (isEdanEcg(device) && (!device.gdtId || device.gdtId === 'EDAN_ECG')) return 'EKG';
    return device.gdtId;
}

function resolveSenderId(device: DeviceConfig, config: BridgeConfig): string {
    if (isEdanEcg(device) && (!config.gdtSenderId || config.gdtSenderId === 'ELEM_MED')) return 'EDP';
    return config.gdtSenderId;
}

/**
 * Exam item code for field 8402 (not sent to MIR — its spec doesn't include it in the request).
 * EDAN ECG        → "ECG"
 * Oscilla Audio   → "AUDI" (per spec §1.3; anything that is not "TYMP" or "AUDI00" triggers audiogram)
 * Others          → examType uppercased
 */
function resolveExamItem(device: DeviceConfig): string {
    if (isEdanEcg(device)) return 'ECG';
    if (isOscillaAudiometer(device)) return 'AUDI';
    return device.examType.toUpperCase();
}

/**
 * Output filename for the GDT request file.
 * EDAN  — "EDP_EKG.GDT" per EDAN SE-1515 spec (Input File Name = EDP_EKG, Suffix = .GDT).
 * MIR   — "WPRO{sender4}.gdt" per MIR naming convention (WPRO + 4-char server abbreviation).
 *          Configure the same path in WinspiroPRO Settings › GDT › Input filename.
 * Oscilla — fixed name based on the GDT ID; must match AudioConsole › GDT › Input filename.
 */
function resolveGdtFilename(device: DeviceConfig, config: BridgeConfig, _sessionId: string): string {
    if (isEdanEcg(device)) return 'EDP_EKG.GDT';
    if (isMirSpirometer(device)) {
        const sender4 = config.gdtSenderId.replace(/[^A-Z0-9]/gi, '').substring(0, 4).toUpperCase();
        return `WPRO${sender4}.gdt`;
    }
    return `${device.gdtId}.gdt`;
}

// ────────────────────────── Public API ────────────────────────────

/**
 * Generate a GDT exam request file for the given device.
 *
 * EDAN ECG        → Satzart 6300 (standard examination request)
 * MIR WinspiroPRO → Satzart 6301 (per MIR GDT spec §3)
 * Oscilla         → Satzart 6302 (Oscilla-specific "New Test Request")
 */
export function generateExamRequest(
    patient: PatientData,
    device: DeviceConfig,
    config: BridgeConfig
): Buffer {
    const lines: string[] = [];
    const isOscilla = isOscillaAudiometer(device);
    const isMir = isMirSpirometer(device);

    // ── Record type ───────────────────────────────────────────────
    let recordType: string;
    if (isOscilla) recordType = RECORD_TYPES.OSCILLA_NEW_TEST;      // 6302
    else if (isMir) recordType = RECORD_TYPES.MIR_EXAM_REQUEST;     // 6301
    else            recordType = RECORD_TYPES.UNTERSUCHUNG_ANFORDERN; // 6300
    lines.push(gdtLine(GDT_FIELDS.SATZKENNUNG, recordType));

    // Placeholder for record length (8100) — filled in at the end
    const lengthPlaceholderIndex = lines.length;
    lines.push('');

    // ── GDT header ────────────────────────────────────────────────
    if (isOscilla) {
        // Oscilla §1.3: sender (8316) + version (9218); no receiver, no charset
        lines.push(gdtLine(GDT_FIELDS.GDT_SENDER, resolveSenderId(device, config)));
        lines.push(gdtLine(GDT_FIELDS.GDT_VERSION, resolveGdtVersion(device, config)));
    } else if (isMir) {
        // MIR spec §3: version only (9218); no receiver, no sender, no charset
        lines.push(gdtLine(GDT_FIELDS.GDT_VERSION, resolveGdtVersion(device, config)));
    } else {
        // Standard / EDAN: receiver + sender + charset (9206 before 9218 per spec) + version
        lines.push(gdtLine(GDT_FIELDS.GDT_EMPFAENGER, resolveReceiverId(device)));
        lines.push(gdtLine(GDT_FIELDS.GDT_SENDER, resolveSenderId(device, config)));
        lines.push(gdtLine(GDT_FIELDS.ZEICHENSATZ, String(config.gdtCharset)));
        lines.push(gdtLine(GDT_FIELDS.GDT_VERSION, resolveGdtVersion(device, config)));
    }

    // ── Patient data ──────────────────────────────────────────────
    // Oscilla: max 15 chars (spec §1.3); others: max 20 chars (GDT 2.1)
    const maxPatientIdLen = isOscilla ? 15 : 20;
    const shortPatientId = patient.patientId.replace(/-/g, '').substring(0, maxPatientIdLen);

    lines.push(gdtLine(GDT_FIELDS.PATIENT_ID, shortPatientId));
    // MIR spec example has no ANREDE (3100) — skip salutation to match spec exactly
    if (!isMir) {
        lines.push(gdtLine(GDT_FIELDS.ANREDE, patient.gender === 'MALE' ? 'Sig.' : patient.gender === 'FEMALE' ? 'Sig.ra' : ''));
    }
    lines.push(gdtLine(GDT_FIELDS.NACHNAME, patient.lastName));
    lines.push(gdtLine(GDT_FIELDS.VORNAME, patient.firstName));
    lines.push(gdtLine(GDT_FIELDS.GEBURTSDATUM, toGdtDate(patient.dateOfBirth)));
    lines.push(gdtLine(GDT_FIELDS.GESCHLECHT, mapGender(patient.gender)));

    // ── Optional patient data ─────────────────────────────────────
    if (!isOscilla) {
        // Tax code and ethnicity: only for EDAN/generic (not in MIR spec)
        if (!isMir && patient.taxCode)    lines.push(gdtLine(GDT_FIELDS.VERSICHERTENNR, patient.taxCode));
        // Height and weight: EDAN and MIR spec both include these
        if (patient.heightCm) lines.push(gdtLine(GDT_FIELDS.GROESSE, String(patient.heightCm)));
        if (patient.weightKg) lines.push(gdtLine(GDT_FIELDS.GEWICHT, String(Math.round(patient.weightKg))));
        if (!isMir && patient.ethnicity) lines.push(gdtLine(GDT_FIELDS.BEFUNDTEXT, `Etnia: ${patient.ethnicity}`));
    }

    // ── Exam type + trailing fields ───────────────────────────────
    if (isMir) {
        // MIR spec §3: no 8402 exam type; only exam date (6200), no time, no software, no accession
        lines.push(gdtLine(GDT_FIELDS.TAG_ERHEBUNG, currentGdtDate()));
    } else if (!isOscilla) {
        // EDAN / generic: exam type + software info + accession + date + time
        lines.push(gdtLine(GDT_FIELDS.UNTERSUCHUNGSGRUPPE, resolveExamItem(device)));
        lines.push(gdtLine(GDT_FIELDS.SOFTWARE_NAME, 'ElementMedica'));
        lines.push(gdtLine(GDT_FIELDS.SOFTWARE_VERSION, 'Desktop Bridge'));
        const accessionNum = `${shortPatientId}${currentGdtDate()}`.substring(0, 20);
        lines.push(gdtLine(GDT_FIELDS.AUFTRAGSNUMMER, accessionNum));
        lines.push(gdtLine(GDT_FIELDS.TAG_ERHEBUNG, currentGdtDate()));
        lines.push(gdtLine(GDT_FIELDS.UHRZEIT_ERHEBUNG, currentGdtTime()));
    } else {
        // Oscilla §1.3: exam type (8402) but no software/accession/date
        lines.push(gdtLine(GDT_FIELDS.UNTERSUCHUNGSGRUPPE, resolveExamItem(device)));
    }

    // ── Calculate and insert record length (8100) ────────────────
    const contentWithoutLength = lines.filter((_, i) => i !== lengthPlaceholderIndex).join('');
    const totalLength = contentWithoutLength.length;
    const lengthLine = gdtLine(GDT_FIELDS.SATZLAENGE, String(totalLength).padStart(5, '0'));
    const finalTotalLength = totalLength + lengthLine.length;
    lines[lengthPlaceholderIndex] = gdtLine(GDT_FIELDS.SATZLAENGE, String(finalTotalLength).padStart(5, '0'));

    const gdtContent = lines.join('');
    return iconv.encode(gdtContent, 'iso-8859-1');
}

/**
 * Write GDT file to the device's input directory.
 * Returns the full path of the written file.
 */
export async function writeGdtFile(
    content: Buffer,
    device: DeviceConfig,
    config: BridgeConfig,
    sessionId: string
): Promise<string> {
    if (!existsSync(device.gdtInputDir)) {
        await mkdir(device.gdtInputDir, { recursive: true });
    }

    const filename = resolveGdtFilename(device, config, sessionId);
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
