import { randomBytes, createHash } from 'crypto'
import { hostname, platform, cpus, networkInterfaces } from 'os'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

/**
 * Returns a stable, persistent machine ID for this installation.
 *
 * Strategy (in order of preference):
 * 1. Read from <userData>/machine-id (persisted on first run — never changes)
 * 2. Generate a new UUID-v4, store it, return it
 *
 * NOTE: We deliberately avoid MAC-address-based fingerprints because on macOS
 * the "first sorted MAC" changes whenever VPN/Thunderbolt/Docker interfaces
 * appear or disappear, causing a different machineId on every network change.
 */
export function getMachineId(): string {
  try {
    const idPath = join(app.getPath('userData'), 'machine-id')
    if (existsSync(idPath)) {
      const stored = readFileSync(idPath, 'utf8').trim()
      if (stored && /^[0-9a-f]{32}$/.test(stored)) {
        return stored
      }
    }
    // First run: generate a random 32-char hex ID and persist it
    const newId = randomBytes(16).toString('hex') // 32 hex chars
    mkdirSync(join(app.getPath('userData')), { recursive: true })
    writeFileSync(idPath, newId, 'utf8')
    return newId
  } catch {
    // Fallback: hardware fingerprint (hostname + CPU model) — less stable but better than nothing
    const parts: string[] = [
      hostname(),
      platform(),
      cpus()[0]?.model || 'unknown-cpu',
    ]
    // Try MAC addresses as last resort (may change) — only if userData is unavailable
    const nets = networkInterfaces()
    const macs: string[] = []
    for (const iface of Object.values(nets)) {
      if (!iface) continue
      for (const addr of iface) {
        if (!addr.internal && addr.mac && addr.mac !== '00:00:00:00:00:00') {
          macs.push(addr.mac)
        }
      }
    }
    if (macs.length > 0) {
      macs.sort()
      parts.push(macs[0])
    }
    return createHash('sha256').update(parts.join('|')).digest('hex').substring(0, 32)
  }
}

export function getMachineName(): string {
  return hostname()
}
