/**
 * Device Launcher
 * 
 * Launches medical device software executables with appropriate arguments.
 * Cross-platform support for Windows and macOS.
 * 
 * @module services/launcher
 */

import { execFile, spawn, execSync } from 'child_process';
import { existsSync } from 'fs';
import { platform } from 'os';
import { basename, dirname } from 'path';
import logger from '../utils/logger.js';
import type { DeviceConfig } from '../types/index.js';

const isWindows = platform() === 'win32';
const isMac = platform() === 'darwin';

/**
 * Resolve the CLI arguments to pass when spawning a device executable.
 * MIR WinspiroPRO must be launched with /GDT flag (spec §3); it reads the
 * GDT input file from the configured directory, not from the command line.
 * All other devices receive the GDT file path as the first argument.
 */
function resolveLaunchArgs(device: DeviceConfig, gdtFilePath: string): string[] {
    if (device.type === 'mir-spirometer') return ['/GDT'];
    return [gdtFilePath];
}

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

    const launchArgs = resolveLaunchArgs(device, gdtFilePath);

    logger.info('Launching device software', {
        device: device.type,
        executable: execPath,
        args: launchArgs,
    });

    try {
        if (isMac && execPath.endsWith('.app')) {
            // macOS: Use 'open' to launch .app bundles
            return await launchMacApp(execPath);
        } else if (isWindows) {
            // Windows: Use spawn for .exe files
            return await launchWindowsExe(execPath, launchArgs);
        } else {
            // Linux or other: Direct spawn
            return await launchDirect(execPath, launchArgs);
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
 * Launch macOS .app bundle — or bring to foreground if already running.
 * Uses `open` without `-n` so an existing instance is reused rather than
 * a second window being opened (which some apps reject with an error).
 * The GDT input file is already written to the device's input directory;
 * the app will detect it there, so no --args path is needed.
 */
async function launchMacApp(appPath: string): Promise<boolean> {
    return new Promise((resolvePromise) => {
        execFile('open', [appPath], (error) => {
            if (error) {
                logger.error('Failed to launch macOS app', { appPath, error: error.message });
                resolvePromise(false);
                return;
            }
            logger.info('macOS app launched (or brought to foreground)', { appPath });
            resolvePromise(true);
        });
    });
}

/**
 * Launch Windows .exe executable — skips spawn if the process is already running.
 * The GDT file has already been written to the device's input directory;
 * if the app is already open it will auto-detect the new file from there.
 *
 * Uses PowerShell Get-Process to find the running process by full exe path or
 * by process name, then activates it using the real window title — more reliable
 * than tasklist + AppActivate(basename) because device software window titles
 * (e.g. "EDAN SE-1515 ECG") rarely match the exe filename.
 */
async function launchWindowsExe(exePath: string, launchArgs: string[]): Promise<boolean> {
    const exeNameNoExt = basename(exePath, '.exe');
    // Escape single quotes for PowerShell string literals
    const escapedPath = exePath.replace(/'/g, "''");
    const escapedName = exeNameNoExt.replace(/'/g, "''");

    try {
        // PowerShell: find any process whose full path matches the configured exe OR
        // whose process name matches the exe basename (handles launcher → child cases).
        // Prefer processes with a visible main window; use the actual MainWindowTitle
        // for AppActivate so it works regardless of what the title says.
        const psCmd = [
            `$p = Get-Process -ErrorAction SilentlyContinue | Where-Object {`,
            `  ($_.Path -and ($_.Path -eq '${escapedPath}' -or $_.Path -like '*${escapedName}*')) -or`,
            `  ($_.ProcessName -like '${escapedName}')`,
            `} | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1;`,
            `if ($p) {`,
            `  $ws = New-Object -ComObject WScript.Shell;`,
            `  if ($p.MainWindowTitle) { $null = $ws.AppActivate($p.MainWindowTitle) }`,
            `  else { $null = $ws.AppActivate($p.ProcessName) };`,
            `  Write-Output 'RUNNING'`,
            `} else { Write-Output 'NOT_FOUND' }`,
        ].join(' ');

        const result = execSync(
            `powershell -NoProfile -NonInteractive -Command "${psCmd}"`,
            { encoding: 'utf8', timeout: 5000 }
        ).trim();

        if (result === 'RUNNING') {
            logger.info('Device software already running — brought to foreground', { exePath });
            return true;
        }
    } catch (err) {
        logger.warn('Process detection via PowerShell failed — will attempt launch', {
            exePath,
            error: err instanceof Error ? err.message : String(err),
        });
    }

    return new Promise((resolvePromise) => {
        try {
            const child = spawn(exePath, launchArgs, {
                detached: true,
                stdio: 'ignore',
                windowsHide: false,
                cwd: dirname(exePath),
            });

            child.unref();

            child.on('error', (error) => {
                logger.error('Windows exe spawn error', { exePath, error: error.message });
                resolvePromise(false);
            });

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
async function launchDirect(execPath: string, launchArgs: string[]): Promise<boolean> {
    return new Promise((resolvePromise) => {
        try {
            const child = spawn(execPath, launchArgs, {
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
