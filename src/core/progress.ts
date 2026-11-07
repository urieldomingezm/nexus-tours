// Progreso guardado del tour (persist): reanudar, completado, "no volver a mostrar".
import type { PersistOptions, PersistStorage, TourStatus } from '../types'
import { localStore, memoryStore } from '../storage'

export type SavedStatus = Exclude<TourStatus, 'new'>
export interface Saved {
  status: SavedStatus
  index: number
}

export class Progress {
  private store: PersistStorage | null
  /** Last known state (loaded at start, updated on every write). */
  saved: Saved | null = null

  constructor(private persist: PersistOptions | undefined) {
    this.store = persist ? (persist.storage ?? (persist.storage === null ? memoryStore() : localStore())) : null
  }

  get enabled() {
    return !!this.store
  }

  private key() {
    return `nexus-tours:tour:${this.persist!.id}`
  }

  private version() {
    return this.persist!.version ?? null
  }

  async load(): Promise<Saved | null> {
    if (!this.store) return null
    try {
      const raw = await this.store.get(this.key())
      if (!raw) return null
      const s = JSON.parse(raw) as Saved & { v?: unknown }
      return s.v === this.version() ? { status: s.status, index: s.index } : null
    } catch {
      return null
    }
  }

  write(status: SavedStatus, index: number, force = false) {
    if (!this.store) return
    // Replaying a finished tour must not turn it back into "in progress".
    if (!force && status === 'in-progress' && this.saved && this.saved.status !== 'in-progress') return
    this.saved = { status, index }
    try {
      void Promise.resolve(this.store.set(this.key(), JSON.stringify({ status, index, v: this.version() }))).catch(() => {})
    } catch {
      /* storage unavailable: progress just isn't saved */
    }
  }

  async reset() {
    this.saved = null
    if (!this.store) return
    try {
      await (this.store.remove ? this.store.remove(this.key()) : this.store.set(this.key(), ''))
    } catch {
      /* ignore */
    }
  }
}
