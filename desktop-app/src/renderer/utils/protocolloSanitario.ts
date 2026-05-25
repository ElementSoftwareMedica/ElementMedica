export interface PrestazioneProtocollo {
  prestazioneId: string | null
  prestazioneNome: string
  periodicitaMesi: number | null
  obbligatoria: boolean
}

interface RawProtocolloPrestazione {
  prestazioneId?: string | null
  prestazioneNome?: string | null
  prestazioneName?: string | null
  nomePrestazione?: string | null
  nome?: string | null
  periodicitaMesi?: number | string | null
  scadenzaDefaultMesi?: number | string | null
  periodicitaCustomMesi?: number | string | null
  periodicita?: string | number | null
  obbligatoria?: boolean | number | null
  isObbligatoria?: boolean | number | null
  prestazione?: {
    id?: string | null
    nome?: string | null
    name?: string | null
    scadenzaDefaultMesi?: number | string | null
  } | null
}

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function periodicitaToMesi(periodicita: unknown, customMesi: unknown): number | null {
  const custom = toPositiveNumber(customMesi)
  if (custom !== null) return custom

  const numeric = toPositiveNumber(periodicita)
  if (numeric !== null) return numeric

  if (typeof periodicita !== 'string') return null
  const normalized = periodicita.toUpperCase().trim()
  const map: Record<string, number> = {
    MESI_6: 6,
    SEMESTRALE: 6,
    MESI_12: 12,
    ANNUALE: 12,
    MESI_24: 24,
    BIENNALE: 24,
    MESI_36: 36,
    TRIENNALE: 36,
    MESI_60: 60,
    QUINQUENNALE: 60,
  }
  return map[normalized] ?? null
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  return fallback
}

export function parseProtocolloPrestazioni(json: string | null | undefined): PrestazioneProtocollo[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return []

    return (parsed as RawProtocolloPrestazione[])
      .map((item) => {
        const periodicitaMesi =
          toPositiveNumber(item.periodicitaMesi) ??
          periodicitaToMesi(item.periodicita, item.periodicitaCustomMesi) ??
          toPositiveNumber(item.scadenzaDefaultMesi) ??
          toPositiveNumber(item.prestazione?.scadenzaDefaultMesi)

        return {
          prestazioneId: item.prestazioneId ?? item.prestazione?.id ?? null,
          prestazioneNome:
            item.prestazioneNome ||
            item.prestazioneName ||
            item.nomePrestazione ||
            item.prestazione?.nome ||
            item.prestazione?.name ||
            item.nome ||
            'Prestazione senza nome',
          periodicitaMesi,
          obbligatoria: toBoolean(item.obbligatoria ?? item.isObbligatoria, true),
        }
      })
      .filter(item => item.prestazioneNome.trim().length > 0)
  } catch {
    return []
  }
}

export function formatProtocolloPeriodicity(mesi: number | null | undefined): string {
  if (!mesi || mesi <= 0) return 'su indicazione'
  if (mesi >= 12 && mesi % 12 === 0) {
    const anni = mesi / 12
    return `ogni ${anni} ann${anni === 1 ? 'o' : 'i'}`
  }
  return `ogni ${mesi} mes${mesi === 1 ? 'e' : 'i'}`
}
