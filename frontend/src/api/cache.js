// In-memory only: private academic/payment data never enters localStorage.
const entries = new Map()
let epoch = 0
export const cache = {
  entry(key) {
    if (!entries.has(key)) {
      // Bound retained entries; never evict a mounted query.
      if (entries.size >= 150) for (const [id, entry] of entries) {
        if (!entry.listeners.size && !entry.promise) { entries.delete(id); break }
      }
      entries.set(key, { snapshot: { data: null, loading: true, error: null, isValidating: false }, listeners: new Set(), promise: null, updated: 0 })
    }
    return entries.get(key)
  },
  subscribe(key, listener) {
    const entry = this.entry(key)
    entry.listeners.add(listener)
    return () => entry.listeners.delete(listener)
  },
  publish(entry, next) {
    if (Object.keys(next).every(k => Object.is(entry.snapshot[k], next[k]))) return
    entry.snapshot = next
    entry.listeners.forEach(fn => fn())
  },
  fetch(key, loader, force = false) {
    const entry = this.entry(key)
    if (entry.promise) return entry.promise
    if (!force && Date.now() - entry.updated < 1000) return Promise.resolve(entry.snapshot.data)
    const version = epoch
    this.publish(entry, { ...entry.snapshot, loading: entry.snapshot.data === null, isValidating: true })
    const pending = Promise.resolve().then(loader).then(data => {
      if (version !== epoch) return
      const same = JSON.stringify(data) === JSON.stringify(entry.snapshot.data)
      entry.updated = Date.now()
      this.publish(entry, { data: same ? entry.snapshot.data : data, loading: false, error: null, isValidating: false })
      return data
    }).catch(error => {
      if (version === epoch) this.publish(entry, { ...entry.snapshot, loading: false, error, isValidating: false })
    }).finally(() => { if (entry.promise === pending) entry.promise = null })
    entry.promise = pending
    return pending
  },
  invalidate() {
    epoch++
    entries.forEach(entry => { entry.updated = 0; entry.promise = null })
  },
  clear() {
    epoch++
    entries.forEach(entry => {
      entry.promise = null; entry.updated = 0
      this.publish(entry, { data: null, loading: true, error: null, isValidating: false })
    })
    // Keep subscriptions intact until components unmount.
    for (const [key, entry] of entries) if (!entry.listeners.size) entries.delete(key)
  },
}

