import { Wifi, WifiOff } from 'lucide-react'
import { useConnectivity } from '../context/ConnectivityContext'

export function OfflineIndicator(): JSX.Element {
  const { isOnline, lastOnlineAt } = useConnectivity()

  if (isOnline) {
    return (
      <div className="flex items-center gap-1.5">
        <Wifi className="w-3.5 h-3.5 text-green-500" />
        <span className="text-xs text-green-600 font-medium">Online</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
      <WifiOff className="w-3.5 h-3.5 text-amber-500" />
      <span className="text-xs text-amber-700 font-medium">Offline</span>
      {lastOnlineAt && (
        <span className="text-[10px] text-amber-500">
          (ultimo: {new Date(lastOnlineAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })})
        </span>
      )}
    </div>
  )
}
