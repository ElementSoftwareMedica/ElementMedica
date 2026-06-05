import { execFileSync } from 'node:child_process'
import { isLocalPiiEncryptionAvailable, isPlaintextPiiFallbackActive } from './crypto'

type DiskEncryptionState = 'enabled' | 'disabled' | 'unknown' | 'unsupported'

interface DiskEncryptionStatus {
    status: DiskEncryptionState
    detail: string
    checkedAt: string
}

export interface LocalSecurityStatus {
    platform: NodeJS.Platform
    piiEncryptionAvailable: boolean
    plaintextPiiFallbackActive: boolean
    piiWritesFailClosed: boolean
    backupEncryptionAvailable: boolean
    diskEncryption: DiskEncryptionStatus
}

function checked(status: DiskEncryptionState, detail: string): DiskEncryptionStatus {
    return { status, detail, checkedAt: new Date().toISOString() }
}

function checkMacDiskEncryption(): DiskEncryptionStatus {
    try {
        const output = execFileSync('/usr/bin/fdesetup', ['status'], {
            encoding: 'utf8',
            timeout: 5000
        }).trim()
        if (/FileVault is On\./i.test(output)) return checked('enabled', output)
        if (/FileVault is Off\./i.test(output)) return checked('disabled', output)
        return checked('unknown', output || 'Stato FileVault non interpretabile')
    } catch {
        return checked('unknown', 'Impossibile verificare FileVault su questo dispositivo')
    }
}

function checkWindowsDiskEncryption(): DiskEncryptionStatus {
    try {
        const command = [
            '$v=Get-BitLockerVolume -MountPoint $env:SystemDrive;',
            '$v | Select-Object MountPoint,VolumeStatus,ProtectionStatus,EncryptionPercentage | ConvertTo-Json -Compress'
        ].join(' ')
        const output = execFileSync('powershell.exe', [
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            command
        ], {
            encoding: 'utf8',
            timeout: 7000,
            windowsHide: true
        }).trim()

        const parsed = JSON.parse(output || '{}') as {
            VolumeStatus?: string
            ProtectionStatus?: string
            EncryptionPercentage?: number
        }
        const volumeStatus = String(parsed.VolumeStatus || '')
        const protectionStatus = String(parsed.ProtectionStatus || '')
        const percentage = Number(parsed.EncryptionPercentage || 0)
        const enabled = /fullyencrypted/i.test(volumeStatus) && /on/i.test(protectionStatus) && percentage >= 100
        const disabled = /fullydecrypted/i.test(volumeStatus) || /off/i.test(protectionStatus)

        if (enabled) return checked('enabled', `BitLocker attivo (${percentage}%)`)
        if (disabled) return checked('disabled', `BitLocker non attivo (${volumeStatus}, ${protectionStatus}, ${percentage}%)`)
        return checked('unknown', `BitLocker non interpretabile (${volumeStatus}, ${protectionStatus}, ${percentage}%)`)
    } catch {
        return checked('unknown', 'Impossibile verificare BitLocker su questo dispositivo')
    }
}

function checkDiskEncryption(): DiskEncryptionStatus {
    if (process.platform === 'darwin') return checkMacDiskEncryption()
    if (process.platform === 'win32') return checkWindowsDiskEncryption()
    return checked('unsupported', 'Verifica cifratura disco non supportata per questa piattaforma')
}

export function getLocalSecurityStatus(): LocalSecurityStatus {
    const piiEncryptionAvailable = isLocalPiiEncryptionAvailable()
    const plaintextPiiFallbackActive = isPlaintextPiiFallbackActive()

    return {
        platform: process.platform,
        piiEncryptionAvailable,
        plaintextPiiFallbackActive,
        piiWritesFailClosed: !piiEncryptionAvailable && !plaintextPiiFallbackActive,
        backupEncryptionAvailable: piiEncryptionAvailable,
        diskEncryption: checkDiskEncryption()
    }
}
