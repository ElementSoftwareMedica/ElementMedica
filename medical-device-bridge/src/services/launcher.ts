/**
 * Device Launcher
 * 
 * Launches medical device software executables with appropriate arguments.
 * Cross-platform support for Windows and macOS.
 * 
 * @module services/launcher
 */

import { execFile, spawn } from 'child_process';
import { existsSync } from 'fs';
import { platform } from 'os';
import { dirname } from 'path';
import logger from '../utils/logger.js';
import type { DeviceConfig } from '../types/index.js';

const isWindows = platform() === 'win32';
const isMac = platform() === 'darwin';

/**
 * Launch a device's executable software
 * 
 * @param device Device configuration
 * @param gdtFilePath Path to the GDT input file written for this exam
 * @returns true if launch was successful
 */
export async function launchDevice(
    device: DeviceConfig,
    gdtFilePath: string
): Promise<boolean> {
    const execPath = device.executable;

    if (!existsSync(execPath)) {
        logger.warn('Device executable not found — skipping launch', {
            device: device.type,
            path: execPath,
        });
        // Don't throw — the device might still be running, or user may launch manually
        return false;
    }

    logger.info('Launching device software', {
        device: device.type,
        executable: execPath,
        gdtFile: gdtFilePath,
    });

    try {
        if (isMac && execPath.endsWith('.app')) {
            // macOS: Use 'open' to launch .app bundles
            return await launchMacApp(execPath, gdtFilePath);
        } else if (isWindows) {
            // Windows: Use spawn for .exe files
            return await launchWindowsExe(execPath, gdtFilePath);
        } else {
            // Linux or other: Direct spawn
            return await launchDirect(execPath, gdtFilePath);
        }
    } catch (error) {
        logger.error('Failed to launch device software', {
            device: device.type,
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}

/**
 * Launch macOS .app bundle
 */
async function launchMacApp(appPath: string, gdtFilePath: string): Promise<boolean> {
    return new Promise((resolvePromise) => {
        // Use execFile with array args to prevent command injection
        execFile('open', ['-n', appPath, '--args', gdtFilePath], (error) => {
            if (error) {
                logger.error('Failed to launch macOS app', { appPath, error: error.message });
                resolvePromise(false);
                return;
            }
            logger.info('macOS app launched successfully', { appPath });
            resolvePromise(true);
        });
    });
}

/**
 * Launch Windows .exe executable
 */
async function launchWindowsExe(exePath: string, gdtFilePath: string): Promise<boolean> {
    return new Promise((resolvePromise) => {
        try {
            // Spawn detached so the device runs independently
            const child = spawn(exePath, [gdtFilePath], {
                detached: true,
                stdio: 'ignore',
                windowsHide: false,
                cwd: dirname(exePath),
            });

            child.unref(); // Don't keep the bridge process alive for the child

            child.on('error', (error) => {
                logger.error('Windows exe spawn error', { exePath, error: error.message });
                resolvePromise(false);
            });

            // Consider launch successful after a short delay
            setTimeout(() => {
                logger.info('Windows exe launched successfully', { exePath });
                resolvePromise(true);
            }, 1000);
        } catch (error) {
            logger.error('Failed to spawn Windows exe', { exePath, error: String(error) });
            resolvePromise(false);
        }
    });
}

/**
 * Launch executable directly (Linux/other)
 */
async function launchDirect(execPath: string, gdtFilePath: string): Promise<boolean> {
    return new Promise((resolvePromise) => {
        try {
            const child = spawn(execPath, [gdtFilePath], {
                detached: true,
                stdio: 'ignore',
                cwd: dirname(execPath),
            });

            child.unref();

            child.on('error', (error) => {
                logger.error('Direct spawn error', { execPath, error: error.message });
                resolvePromise(false);
            });

            setTimeout(() => {
                logger.info('Executable launched successfully', { execPath });
                resolvePromise(true);
            }, 1000);
        } catch (error) {
            logger.error('Failed to spawn executable', { execPath, error: String(error) });
            resolvePromise(false);
        }
    });
}

/**
 * Check if a device's executable exists on this system
 */
export function isDeviceAvailable(device: DeviceConfig): boolean {
    if (isMac && device.executable.endsWith('.app')) {
        return existsSync(device.executable);
    }
    return existsSync(device.executable);
}
