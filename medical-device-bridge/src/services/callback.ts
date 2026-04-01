/**
 * Callback Service
 * 
 * Sends exam results back to the ElementMedica webapp via HTTP POST.
 * Handles authentication, retries, and error reporting.
 * 
 * @module services/callback
 */

import logger from '../utils/logger.js';
import { hostname } from 'os';
import type { ExamResult, CallbackPayload, BridgeConfig } from '../types/index.js';

// Use native fetch (Node 18+)
const BRIDGE_VERSION = '1.0.0';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Send exam result back to the webapp
 */
export async function sendResult(
    config: BridgeConfig,
    result: ExamResult,
    pdfBuffer?: Buffer,
    pdfFilename?: string
): Promise<boolean> {
    const callbackUrl = config.callbackUrl;

    if (!callbackUrl) {
        logger.warn('No callback URL configured — result logged but not sent', {
            resultId: result.resultId,
            examType: result.examType,
        });
        return false;
    }

    const payload: CallbackPayload = {
        event: result.status === 'error' ? 'exam_error' : 'exam_completed',
        result: {
            ...result,
            // Add PDF as base64 if available and not already set
            pdfBase64: result.pdfBase64 || (pdfBuffer ? pdfBuffer.toString('base64') : undefined),
            pdfFilename: result.pdfFilename || pdfFilename,
        },
        bridge: {
            version: BRIDGE_VERSION,
            hostname: hostname(),
            timestamp: new Date().toISOString(),
        },
    };

    // Retry loop
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (config.apiKey) {
                headers['X-Bridge-Api-Key'] = config.apiKey;
            }

            const response = await fetch(callbackUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(30000), // 30s timeout
            });

            if (response.ok) {
                const responseData = await response.json().catch(() => ({}));
                logger.info('Result sent successfully to webapp', {
                    resultId: result.resultId,
                    examType: result.examType,
                    status: response.status,
                    attempt,
                    responseData,
                });
                return true;
            }

            logger.warn('Callback failed with HTTP error', {
                status: response.status,
                statusText: response.statusText,
                attempt,
                maxRetries: MAX_RETRIES,
                url: callbackUrl,
            });

        } catch (error) {
            logger.error('Callback request failed', {
                attempt,
                maxRetries: MAX_RETRIES,
                error: error instanceof Error ? error.message : String(error),
                url: callbackUrl,
            });
        }

        // Wait before retrying (exponential backoff)
        if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            logger.info(`Retrying in ${delay}ms...`, { attempt, maxRetries: MAX_RETRIES });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    logger.error('All callback attempts failed', {
        resultId: result.resultId,
        examType: result.examType,
        callbackUrl,
        attempts: MAX_RETRIES,
    });

    return false;
}

/**
 * Send device status update to webapp
 */
export async function sendDeviceStatus(
    config: BridgeConfig,
    deviceType: string,
    status: 'online' | 'offline' | 'error',
    message?: string
): Promise<void> {
    if (!config.callbackUrl) return;

    const payload: CallbackPayload = {
        event: 'device_status',
        error: status === 'error' ? {
            code: 'DEVICE_ERROR',
            message: message || 'Unknown device error',
        } : undefined,
        bridge: {
            version: BRIDGE_VERSION,
            hostname: hostname(),
            timestamp: new Date().toISOString(),
        },
    };

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (config.apiKey) {
            headers['X-Bridge-Api-Key'] = config.apiKey;
        }

        await fetch(config.callbackUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000),
        });
    } catch (error) {
        logger.debug('Device status callback failed (non-critical)', {
            deviceType,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
