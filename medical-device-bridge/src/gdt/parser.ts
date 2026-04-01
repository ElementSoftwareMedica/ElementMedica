/**
 * GDT 2.1 File Parser
 * 
 * Parses GDT output files from medical devices back into structured data.
 * Handles: ECG results, spirometry values, audiometry measurements.
 * 
 * @module gdt/parser
 */

import { readFile } from 'fs/promises';
import * as iconv from 'iconv-lite';
import logger from '../utils/logger.js';
import type { GdtField, GdtRecord, TestResult, ExamResult, DeviceType, ExamType } from '../types/index.js';

/**
 * Parse a single GDT line into its components
 */
function parseLine(line: string): GdtField | null {
    // Match: 3-digit length + 4-digit field ID + content
    const match = line.match(/^(\d{3})(\d{4})(.*?)$/);
    if (!match) return null;

    return {
        length: parseInt(match[1], 10),
        fieldId: match[2],
        value: match[3],
    };
}

/**
 * Parse a complete GDT file into a record
 * 
 * @param filePath Path to the GDT file
 * @returns Parsed GDT record
 */
export async function parseGdtFile(filePath: string): Promise<GdtRecord> {
    // Read file as ISO-8859-1
    const rawBuffer = await readFile(filePath);
    const content = iconv.decode(rawBuffer, 'iso-8859-1');

    return parseGdtContent(content);
}

/**
 * Parse GDT content string into a record
 */
export function parseGdtContent(content: string): GdtRecord {
    const fields: GdtField[] = [];
    let recordType = '';
    let recordLength: number | undefined;

    // Split by CRLF or LF
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

    for (const line of lines) {
        const field = parseLine(line);
        if (!field) {
            logger.warn('Skipping unparseable GDT line', { line: line.substring(0, 50) });
            continue;
        }

        fields.push(field);

        // Extract record type and length
        if (field.fieldId === '8000') {
            recordType = field.value;
        }
        if (field.fieldId === '8100') {
            recordLength = parseInt(field.value, 10);
        }
    }

    return {
        recordType,
        recordLength,
        fields,
        raw: content,
    };
}

/**
 * Extract patient ID from a GDT record
 */
export function extractPatientId(record: GdtRecord): string | undefined {
    return record.fields.find(f => f.fieldId === '3000')?.value;
}

/**
 * Extract test results from a GDT record
 * Test results use fields 8410-8470 in groups
 */
export function extractTestResults(record: GdtRecord): TestResult[] {
    const results: TestResult[] = [];
    let currentTest: Partial<TestResult> | null = null;

    for (const field of record.fields) {
        switch (field.fieldId) {
            case '8410': // Test identifier — starts a new test result
                if (currentTest?.testId) {
                    results.push(currentTest as TestResult);
                }
                currentTest = {
                    testId: field.value,
                    testName: '',
                    value: '',
                };
                break;
            case '8411': // Test description
                if (currentTest) currentTest.testName = field.value;
                break;
            case '8418': // Test status
                if (currentTest) currentTest.status = field.value;
                break;
            case '8420': // Result value
                if (currentTest) currentTest.value = field.value;
                break;
            case '8421': // Unit
                if (currentTest) currentTest.unit = field.value;
                break;
            case '8431': // Normal range lower
                if (currentTest) currentTest.normalLow = field.value;
                break;
            case '8462': // Normal range upper
                if (currentTest) currentTest.normalHigh = field.value;
                break;
            case '8470': // Test-related note
                if (currentTest) currentTest.note = field.value;
                break;
        }
    }

    // Push last test
    if (currentTest?.testId) {
        results.push(currentTest as TestResult);
    }

    return results;
}

/**
 * Extract free-text findings from a GDT record
 * Findings can span multiple 6220 lines
 */
export function extractFindings(record: GdtRecord): string[] {
    return record.fields
        .filter(f => f.fieldId === '6220' || f.fieldId === '6228')
        .map(f => f.value);
}

/**
 * Extract examination date/time
 */
export function extractExamDateTime(record: GdtRecord): { date?: string; time?: string } {
    const dateField = record.fields.find(f => f.fieldId === '6200');
    const timeField = record.fields.find(f => f.fieldId === '6201');

    let date: string | undefined;
    let time: string | undefined;

    if (dateField?.value) {
        // Convert DDMMYYYY to ISO YYYY-MM-DD
        const d = dateField.value;
        if (d.length === 8) {
            date = `${d.substring(4, 8)}-${d.substring(2, 4)}-${d.substring(0, 2)}`;
        }
    }

    if (timeField?.value) {
        // Convert HHMMSS to HH:MM:SS
        const t = timeField.value;
        if (t.length >= 4) {
            time = `${t.substring(0, 2)}:${t.substring(2, 4)}${t.length >= 6 ? ':' + t.substring(4, 6) : ':00'}`;
        }
    }

    return { date, time };
}

/**
 * Build a complete ExamResult from a parsed GDT record
 */
export function buildExamResult(
    record: GdtRecord,
    deviceType: DeviceType,
    examType: ExamType,
    patientId: string,
    visitaId: string,
    tenantId: string,
    resultId: string
): ExamResult {
    const testResults = extractTestResults(record);
    const findings = extractFindings(record);
    const { date, time } = extractExamDateTime(record);

    const examDate = date
        ? `${date}${time ? 'T' + time : ''}`
        : new Date().toISOString();

    return {
        resultId,
        examType,
        deviceType,
        patientId,
        visitaId,
        tenantId,
        examDate,
        gdtData: record,
        testResults,
        findings,
        status: testResults.length > 0 || findings.length > 0 ? 'completed' : 'partial',
    };
}
