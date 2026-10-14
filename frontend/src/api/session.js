export class ApiError extends Error {
  constructor(message, status = 422, fields = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

// Shared storage holds only a non-secret marker. Authentication lives in the
// encrypted HttpOnly API cookie; account data is verified by /me and kept in memory.
const KEY = 'ssis-session'
const LEGACY_KEY = 'ssis-token'
let memorySession = null
const changed = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('ssis:session-changed'))
}
const legacy = () => {
  try { return sessionStorage.getItem(LEGACY_KEY) ?? localStorage.getItem(LEGACY_KEY) } catch { return null }
}
export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(KEY) ?? legacy() } catch { return memorySession }
  },
  legacy,
  set: (session) => {
    const previous = tokenStore.get()
    memorySession = session
    try {
      localStorage.setItem(KEY, session)
      localStorage.removeItem(LEGACY_KEY)
      sessionStorage.removeItem(LEGACY_KEY)
    } catch { /* Blocked storage keeps the marker in memory. */ }
    if (previous !== session) changed()
  },
  clear: () => {
    memorySession = null
    try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); sessionStorage.removeItem(LEGACY_KEY) } catch { /* Storage may be blocked. */ }
    changed()
  },
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) {
      memorySession = null
      try { sessionStorage.removeItem(LEGACY_KEY) } catch { /* Storage may be blocked. */ }
      changed()
    }
  })
}
