import { Dispatch, SetStateAction, useEffect, useState } from 'react'

function todayKey(): string {
  return new Date().toISOString().split('T')[0]
}

export function usePersistentPageState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = `em-desktop-page-state:${key}`
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return initialValue
      const parsed = JSON.parse(raw) as { day?: string; value?: T }
      if (parsed.day !== todayKey()) {
        localStorage.removeItem(storageKey)
        return initialValue
      }
      return parsed.value ?? initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ day: todayKey(), value }))
    } catch {
      // best-effort UI state
    }
  }, [storageKey, value])

  return [value, setValue]
}
