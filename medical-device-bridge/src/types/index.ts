/**
 * Device configuration types for Medical Device Bridge
 * Supports: Edan ECG, MIR Spirometer, Oscilla Audiometer
 * 
 * @module types/config
 */

/** Supported medical device types */
export type DeviceType = 'edan-ecg' | 'mir-spirometer' | 'oscilla-audiometer';

/** Supported exam types mapped to devices */
export type ExamType = 'ecg' | 'spirometry' | 'audiometry';

/** GDT record types (Satzarten) */
export type GdtRecordType = '6300' | '6301' | '6302' | '6310' | '6311';

/** GDT character set options */
export type GdtCharset = 1 | 2 | 3; // 1=7bit ASCII, 2=CP437, 3=ISO-8859-1

/** Gender codes for GDT */
export type GdtGender = '1' | '2'; // 1=male, 2=female

/** Device configuration */
export interface DeviceConfig {
    /** Unique device type identifier */
    type: DeviceType;
    /** Whether this device is enabled */
    enabled: boolean;
    /** GDT receiver ID (max 8 chars, used in field 8315) */
    gdtId: string;
    /** Directory where GDT input files are written (PVS → Device) */
    gdtInputDir: string;
    /** Directory where device writes GDT output files (Device → PVS) */
    gdtOutputDir: string;
    /** Directory where device writes PDF reports (optional; defaults to gdtOutputDir) */
    pdfOutputDir?: string;
    /** Full path to the device executable */
    executable: string;
    /** Associated exam type */
    examType: ExamType;
    /** Display name for the device */
    displayName: string;
}

/** Bridge server configuration */
export interface BridgeConfig {
    /** Server port (default: 3000) */
    port: number;
    /** Webapp callback URL for results */
    callbackUrl: string;
    /** API key for authenticating callbacks */
    apiKey: string;
    /** GDT protocol version */
    gdtVersion: string;
    /** GDT sender ID */
    gdtSenderId: string;
    /** GDT character set */
    gdtCharset: GdtCharset;
    /** Log level */
    logLevel: string;
    /** Log directory */
    logDir: string;
    /** Configured devices */
    devices: DeviceConfig[];
    /** License key (from activation) */
    licenseKey?: string;
    /** Tenant ID (from activation) */
    tenantId?: string;
    /** Tenant name (from activation) */
    tenantName?: string;
    /** Server URL used for activation */
    activationServerUrl?: string;
}

/** Patient data for exam request */
export interface PatientData {
    /** Patient ID in the webapp */
    patientId: string;
    /** Last name (cognome) */
    lastName: string;
    /** First name (nome) */
    firstName: string;
    /** Date of birth (ISO format: YYYY-MM-DD) */
    dateOfBirth: string;
    /** Gender: 'MALE' or 'FEMALE' */
    gender: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED';
    /** Tax code (codice fiscale) */
    taxCode?: string;
    /** Height in cm */
    heightCm?: number;
    /** Weight in kg */
    weightKg?: number;
}

/** Exam request payload from webapp */
export interface ExamRequest {
    /** Type of exam to perform */
    examType: ExamType;
    /** Patient data */
    patient: PatientData;
    /** Visit ID in the webapp */
    visitaId: string;
    /** Tenant ID */
    tenantId: string;
    /** Callback URL override (optional) */
    callbackUrl?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

/** GDT parsed field */
export interface GdtField {
    /** Line length */
    length: number;
    /** Field ID (Feldkennung) */
    fieldId: string;
    /** Field value */
    value: string;
}

/** GDT parsed record */
export interface GdtRecord {
    /** Record type (Satzart) */
    recordType: string;
    /** Record length */
    recordLength?: number;
    /** All parsed fields */
    fields: GdtField[];
    /** Raw file content */
    raw?: string;
}

/** Exam result from device */
export interface ExamResult {
    /** Unique result ID */
    resultId: string;
    /** Bridge session ID (links back to backend EsameStrumentale record) */
    bridgeSessionId?: string;
    /** Original exam request */
    examType: ExamType;
    /** Device that produced the result */
    deviceType: DeviceType;
    /** Patient ID */
    patientId: string;
    /** Visit ID */
    visitaId: string;
    /** Tenant ID */
    tenantId: string;
    /** Timestamp of the exam */
    examDate: string;
    /** Parsed GDT results */
    gdtData: GdtRecord;
    /** Individual test results */
    testResults: TestResult[];
    /** Free-text findings */
    findings: string[];
    /** PDF report as base64 (if available) */
    pdfBase64?: string;
    /** PDF filename */
    pdfFilename?: string;
    /** Status of the exam */
    status: 'completed' | 'partial' | 'error';
    /** Error message if status is 'error' */
    errorMessage?: string;
}

/** Individual test result from device */
export interface TestResult {
    /** Test identifier */
    testId: string;
    /** Test name/description */
    testName: string;
    /** Result value */
    value: string;
    /** Unit of measurement */
    unit?: string;
    /** Normal range lower limit */
    normalLow?: string;
    /** Normal range upper limit */
    normalHigh?: string;
    /** Status: E=final, T=partial, V=preliminary */
    status?: string;
    /** Test-specific note */
    note?: string;
}

/** Callback payload sent to webapp */
export interface CallbackPayload {
    /** Event type */
    event: 'exam_completed' | 'exam_error' | 'device_status';
    /** Exam result data */
    result?: ExamResult;
    /** Error details */
    error?: {
        code: string;
        message: string;
        deviceType?: DeviceType;
    };
    /** Bridge metadata */
    bridge: {
        version: string;
        hostname: string;
        timestamp: string;
    };
}

/** Active exam session tracking */
export interface ExamSession {
    /** Session ID (UUID) */
    id: string;
    /** Original request */
    request: ExamRequest;
    /** Device config used */
    device: DeviceConfig;
    /** GDT file path written */
    gdtFilePath: string;
    /** When the session started */
    startedAt: Date;
    /** Current status */
    status: 'pending' | 'device_launched' | 'waiting_results' | 'completed' | 'error' | 'timeout';
    /** Result if completed */
    result?: ExamResult;
    /** Timeout timer reference */
    timeoutTimer?: ReturnType<typeof setTimeout>;
}

/** Bridge status response */
export interface BridgeStatus {
    /** Bridge is running */
    running: boolean;
    /** Bridge version */
    version: string;
    /** Uptime in seconds */
    uptimeSeconds: number;
    /** Configured devices and their status */
    devices: Array<{
        type: DeviceType;
        displayName: string;
        enabled: boolean;
        gdtId: string;
        executableExists: boolean;
        inputDirExists: boolean;
        outputDirExists: boolean;
        pdfOutputDir: string;
        pdfDirExists: boolean;
    }>;
    /** Number of active exam sessions */
    activeSessions: number;
    /** Platform info */
    platform: string;
}
