import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    type ReactNode
} from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { useDesktopAuth } from './DesktopAuthContext'

const AUTO_LOCK_TIMEOUT_MS = 15 * 60 * 1000 // 15 minuti di inattività
const MAX_UNLOCK_ATTEMPTS = 5               // after this, enforce cooldown
const COOLDOWN_SECONDS = 30                 // seconds to wait after too many failures

interface AutoLockContextType {
    isLocked: boolean
}

const AutoLockContext = createContext<AutoLockContextType | null>(null)

export function useAutoLock(): AutoLockContextType {
    const ctx = useContext(AutoLockContext)
    if (!ctx) throw new Error('useAutoLock must be used within AutoLockProvider')
    return ctx
}

export function AutoLockProvider({ children }: { children: ReactNode }): JSX.Element {
    const { user, login, isAuthenticated } = useDesktopAuth()
    const [isLocked, setIsLocked] = useState(false)
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [unlockError, setUnlockError] = useState<string | null>(null)
    const [isUnlocking, setIsUnlocking] = useState(false)
    const [cooldownLeft, setCooldownLeft] = useState(0)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastActivityRef = useRef(Date.now())
    const failedAttemptsRef = useRef(0)
    const lockedUntilRef = useRef<number>(0)
    const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const resetTimer = useCallback(() => {
        if (!isAuthenticated) return
        lastActivityRef.current = Date.now()
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
            setIsLocked(true)
        }, AUTO_LOCK_TIMEOUT_MS)
    }, [isAuthenticated])

    const lockIfInactiveTooLong = useCallback(() => {
        if (!isAuthenticated || isLocked) return
        const elapsed = Date.now() - lastActivityRef.current
        if (elapsed >= AUTO_LOCK_TIMEOUT_MS) {
            if (timerRef.current) clearTimeout(timerRef.current)
            setIsLocked(true)
        } else {
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => {
                setIsLocked(true)
            }, AUTO_LOCK_TIMEOUT_MS - elapsed)
        }
    }, [isAuthenticated, isLocked])

    // Wire activity listeners
    useEffect(() => {
        if (!isAuthenticated) return

        resetTimer()

        const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const
        for (const evt of ACTIVITY_EVENTS) {
            window.addEventListener(evt, resetTimer, true)
        }
        const handleVisibilityOrResume = () => {
            if (document.visibilityState === 'visible') lockIfInactiveTooLong()
        }
        document.addEventListener('visibilitychange', handleVisibilityOrResume, true)
        window.addEventListener('focus', lockIfInactiveTooLong, true)
        window.addEventListener('pageshow', lockIfInactiveTooLong, true)

        return () => {
            for (const evt of ACTIVITY_EVENTS) {
                window.removeEventListener(evt, resetTimer, true)
            }
            document.removeEventListener('visibilitychange', handleVisibilityOrResume, true)
            window.removeEventListener('focus', lockIfInactiveTooLong, true)
            window.removeEventListener('pageshow', lockIfInactiveTooLong, true)
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [isAuthenticated, resetTimer, lockIfInactiveTooLong])

    // Reset lock on logout
    useEffect(() => {
        if (!isAuthenticated) {
            setIsLocked(false)
            failedAttemptsRef.current = 0
            lockedUntilRef.current = 0
            lastActivityRef.current = Date.now()
            if (timerRef.current) clearTimeout(timerRef.current)
            if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
        }
    }, [isAuthenticated])

    const startCooldown = useCallback((seconds: number) => {
        lockedUntilRef.current = Date.now() + seconds * 1000
        setCooldownLeft(seconds)
        if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
        cooldownTimerRef.current = setInterval(() => {
            const remaining = Math.ceil((lockedUntilRef.current - Date.now()) / 1000)
            if (remaining <= 0) {
                setCooldownLeft(0)
                if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
            } else {
                setCooldownLeft(remaining)
            }
        }, 500)
    }, [])

    const handleUnlock = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !password) return

        // Brute-force protection: enforce cooldown if active
        if (Date.now() < lockedUntilRef.current) return

        setIsUnlocking(true)
        setUnlockError(null)

        try {
            // Attempt online verification first; fall back to local hash when offline
            if (navigator.onLine) {
                await login(user.email, password)
            } else {
                // Offline: verify password against locally stored hash
                const result = window.desktopApi?.auth?.verifyPasswordHash
                    ? await window.desktopApi.auth.verifyPasswordHash(password)
                    : { ok: false, verified: false }

                if (!result.ok) {
                    // No hash stored yet (first offline lock), force re-login when online
                    throw new Error('offline-no-hash')
                }
                if (!result.verified) {
                    throw new Error('wrong-password')
                }
            }

            // Unlock successful
            failedAttemptsRef.current = 0
            lockedUntilRef.current = 0
            setIsLocked(false)
            setPassword('')
            resetTimer()
        } catch (err: unknown) {
            failedAttemptsRef.current += 1
            const attempts = failedAttemptsRef.current

            if (err instanceof Error && err.message === 'offline-no-hash') {
                setUnlockError('Nessuna connessione. Ricollegati a Internet per sbloccare la sessione.')
            } else if (attempts >= MAX_UNLOCK_ATTEMPTS) {
                const delay = COOLDOWN_SECONDS * Math.pow(2, attempts - MAX_UNLOCK_ATTEMPTS)
                startCooldown(Math.min(delay, 3600))
                setUnlockError(`Troppi tentativi falliti. Riprova tra ${Math.min(delay, 3600)} secondi.`)
            } else {
                setUnlockError('Password non corretta. Riprova.')
            }
        } finally {
            setIsUnlocking(false)
        }
    }, [user, password, login, resetTimer, startCooldown])

    return (
        <AutoLockContext.Provider value={{ isLocked }}>
            {children}
            {isLocked && (
                <div className="fixed inset-0 z-[9999] bg-gray-900/95 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-50 rounded-2xl border border-teal-200 mb-4">
                                <Lock className="w-7 h-7 text-teal-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 font-heading">Sessione bloccata</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                L'app è stata bloccata per inattività (GDPR).
                            </p>
                            {user && (
                                <p className="text-xs text-gray-400 mt-2 font-mono">{user.email}</p>
                            )}
                        </div>

                        <form onSubmit={handleUnlock} className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    autoFocus
                                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(p => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {unlockError && (
                                <p className="text-xs text-red-600 text-center">{unlockError}</p>
                            )}

                            <button
                                type="submit"
                                disabled={isUnlocking || !password || cooldownLeft > 0}
                                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
                            >
                                {isUnlocking ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Verifica...
                                    </span>
                                ) : cooldownLeft > 0 ? (
                                    `Riprova tra ${cooldownLeft}s`
                                ) : (
                                    'Sblocca'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </AutoLockContext.Provider>
    )
}
