/// <reference types="vite/client" />
import type { DesktopApi } from '../preload/index'

declare global {
  interface Window {
    desktopApi: DesktopApi
    electron: {
      ipcRenderer: {
        invoke(channel: string, ...args: unknown[]): Promise<unknown>
        send(channel: string, ...args: unknown[]): void
        on(channel: string, func: (...args: unknown[]) => void): void
      }
    }
  }
}

export {}
