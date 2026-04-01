/**
 * @file getClientIp.js
 * @description Utility per ottenere l'IP del client dalla request
 */

/**
 * Ottiene l'IP del client dalla request Express
 * Considera header proxy come X-Forwarded-For
 * @param {import('express').Request} req - Request Express
 * @returns {string|null} - IP del client o null
 */
export function getClientIp(req) {
    // X-Forwarded-For può contenere lista di IP, il primo è il client originale
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        const ips = forwardedFor.split(',').map(ip => ip.trim());
        return ips[0] || null;
    }

    // X-Real-IP header (nginx)
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return realIp;
    }

    // Fallback a req.ip (Express)
    return req.ip || req.connection?.remoteAddress || '127.0.0.1';
}

export default getClientIp;
