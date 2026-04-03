import { createHash } from 'crypto'
import { hostname, platform, cpus, networkInterfaces } from 'os'

/**
 * Generates a stable hardware fingerprint for this machine.
 * Uses hostname + platform + first CPU model + primary MAC address.
 * Returns the first 32 hex chars of a SHA256 hash.
 */
export function getMachineId(): string {
  const parts: string[] = [
    hostname(),
    platform(),
    cpus()[0]?.model || 'unknown-cpu',
  ]

  // Collect non-internal MAC addresses, sort for stability
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

export function getMachineName(): string {
  return hostname()
}
