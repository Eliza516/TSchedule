import { contextBridge, ipcRenderer } from 'electron'
import {
  EVENT_CHANNELS,
  IPC_CHANNELS,
  type EventChannel,
  type EventContract,
  type IpcChannel,
  type IpcContract
} from '@shared/ipc'

/**
 * The only bridge between the renderer and the main process. Channels are
 * allow-listed so a compromised renderer cannot reach anything the contract
 * does not describe.
 */
const invokable = new Set<string>(IPC_CHANNELS)
const listenable = new Set<string>(EVENT_CHANNELS)

const api = {
  invoke<C extends IpcChannel>(
    channel: C,
    ...args: Parameters<IpcContract[C]>
  ): Promise<ReturnType<IpcContract[C]>> {
    if (!invokable.has(channel)) return Promise.reject(new Error(`Unknown channel: ${channel}`))
    return ipcRenderer.invoke(channel, ...args) as Promise<ReturnType<IpcContract[C]>>
  },

  /** Returns an unsubscribe function, so React effects can clean up. */
  on<C extends EventChannel>(channel: C, listener: (payload: EventContract[C]) => void): () => void {
    if (!listenable.has(channel)) return () => {}
    const wrapped = (_event: unknown, payload: EventContract[C]): void => listener(payload)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  },

  platform: process.platform
}

export type TScheduleApi = typeof api

contextBridge.exposeInMainWorld('api', api)
