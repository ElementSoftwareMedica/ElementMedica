import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'

export interface ElegantOption {
  value: string
  label: string
  disabled?: boolean
}

interface ElegantSelectProps {
  value?: string
  onChange: (value: string) => void
  options: ElegantOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function ElegantSelect({
  value = '',
  onChange,
  options,
  placeholder = 'Seleziona...',
  className = '',
  disabled = false,
}: ElegantSelectProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find(option => option.value === value)

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 shadow-sm hover:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? 'truncate' : 'truncate text-gray-400'}>{selected?.label || placeholder}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-[9999] mt-1 max-h-72 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
          {options.map(option => (
            <button
              key={option.value || '__empty'}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-teal-50 disabled:cursor-not-allowed disabled:text-gray-300 ${option.value === value ? 'bg-teal-50 font-semibold text-teal-700' : 'text-gray-700'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface ElegantDateInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  clearable?: boolean
  disabled?: boolean
}

const pad2 = (value: number): string => String(value).padStart(2, '0')

const toIsoDate = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

const parseIsoDate = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

const formatItalianDate = (value: string): string => {
  const date = parseIsoDate(value)
  return date ? `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}` : value
}

const parseItalianDateInput = (value: string): string | null => {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return parseIsoDate(trimmed) ? trimmed : null
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (!match) return null
  const [, dayRaw, monthRaw, yearRaw] = match
  const day = Number(dayRaw)
  const month = Number(monthRaw)
  const year = Number(yearRaw)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return toIsoDate(date)
}

export function ElegantDateInput({ value, onChange, className = '', clearable = false, disabled = false }: ElegantDateInputProps): JSX.Element {
  const selectedDate = parseIsoDate(value)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(formatItalianDate(value))
  const [viewMonth, setViewMonth] = useState(() => selectedDate || new Date())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraft(formatItalianDate(value))
    const next = parseIsoDate(value)
    if (next) setViewMonth(next)
  }, [value])

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const firstWeekDay = (firstDay.getDay() + 6) % 7
  const monthDays = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((firstWeekDay + monthDays) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekDay + 1
    return day > 0 && day <= monthDays ? new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day) : null
  })

  const commitDraft = (): void => {
    if (!draft.trim()) {
      if (clearable) onChange('')
      return
    }
    const parsed = parseItalianDateInput(draft)
    if (parsed) onChange(parsed)
    else setDraft(formatItalianDate(value))
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-teal-500">
        <button type="button" disabled={disabled} onClick={() => setOpen(prev => !prev)} className="rounded-lg p-0.5 text-teal-600 hover:bg-teal-50 disabled:opacity-50">
          <Calendar className="h-4 w-4" />
        </button>
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onFocus={() => { if (!disabled) setOpen(true) }}
          onBlur={commitDraft}
          disabled={disabled}
          placeholder="gg/mm/aaaa"
          inputMode="numeric"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400"
        />
        {clearable && value && !disabled && (
          <button type="button" onClick={() => onChange('')} className="rounded-full p-0.5 text-gray-400 hover:bg-gray-100">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-[9999] mt-1 w-72 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold capitalize text-gray-900">
              {viewMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
            </p>
            <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((date, index) => {
              const iso = date ? toIsoDate(date) : ''
              const isSelected = iso && iso === value
              const isToday = iso === toIsoDate(new Date())
              return date ? (
                <button
                  key={iso}
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => {
                    onChange(iso)
                    setOpen(false)
                  }}
                  className={`h-8 rounded-lg text-xs font-medium ${isSelected ? 'bg-teal-600 text-white' : isToday ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {date.getDate()}
                </button>
              ) : <span key={`empty-${index}`} />
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface ElegantTimeInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ElegantTimeInput({ value, onChange, className = '' }: ElegantTimeInputProps): JSX.Element {
  const suggestions = useMemo(() => ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00'], [])
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-teal-500">
        <Clock className="h-4 w-4 text-teal-600" />
        <input
          value={value}
          onChange={event => onChange(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="hh:mm"
          inputMode="numeric"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400"
        />
      </div>
      {open && (
        <div className="absolute z-[9999] mt-1 grid max-h-48 w-full grid-cols-3 gap-1 overflow-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
          {suggestions.map(time => (
            <button
              key={time}
              type="button"
              onClick={() => {
                onChange(time)
                setOpen(false)
              }}
              className={`rounded-lg px-2 py-1.5 text-xs ${value === time ? 'bg-teal-600 text-white' : 'text-gray-700 hover:bg-teal-50'}`}
            >
              {time}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
