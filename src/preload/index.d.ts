import type { EventChannel, EventContract, IpcChannel, IpcContract } from '../shared/ipc'

declare global {
  interface Window {
    api: {
      invoke<C extends IpcChannel>(
        channel: C,
        ...args: Parameters<IpcContract[C]>
      ): Promise<ReturnType<IpcContract[C]>>
      on<C extends EventChannel>(channel: C, listener: (payload: EventContract[C]) => void): () => void
      platform: string
    }
  }
}

export {}
