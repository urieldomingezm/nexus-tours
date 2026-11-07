import type { PersistStorage } from './types'

export function memoryStore(): PersistStorage {
  const m = new Map<string, string>()
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k) }
}

/** localStorage when it works (it throws in private mode or when blocked), otherwise memory. */
export function localStore(): PersistStorage {
  try {
    const k = '__nexus-tours__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return { get: (key) => localStorage.getItem(key), set: (key, v) => localStorage.setItem(key, v), remove: (key) => localStorage.removeItem(key) }
  } catch {
    return memoryStore()
  }
}
