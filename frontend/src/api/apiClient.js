import { cache } from './cache'
// Transport layer: every service talks to the Laravel API through these helpers.
// Set VITE_API_URL when the API lives on another domain (for example the Render URL when the front end is on Vercel).
import { ApiError, tokenStore } from './session'

export const API_BASE_URL = (import.meta.env?.VITE_API_URL ?? '/api').replace(/\/$/, '')

// ---- "something changed" signal: keeps open portals fresh -----------------------------------------------
const listeners = new Set()
let timer = null
const POLL_MS = 30000

const emit = () => listeners.forEach((fn) => fn())
const pendingGets = new Map()
const recentGets = new Map()
let generation = 0
function invalidateRequests() {
  generation++
  pendingGets.clear()
  recentGets.clear()
  cache.invalidate()
}
if (typeof window !== 'undefined') {
  window.addEventListener('ssis:session-changed', () => {
    invalidateRequests()
    cache.clear()
  })
  window.addEventListener('focus', () => { if (tokenStore.get()) emit() })
  window.addEventListener('online', emit)
}


// useService() subscribes here. A change made in this tab refreshes the screens immediately, and a light poll
// picks up changes made by other users (for example a request the Registrar just approved).
export function onDataChange(fn) {
  listeners.add(fn)
  if (!timer) {
    timer = setInterval(() => {
      if (document.visibilityState === 'visible' && tokenStore.get()) emit()
    }, POLL_MS)
  }
  return () => {
    listeners.delete(fn)
    if (!listeners.size && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

// ---- requests ---------------------------------------------------------------------------------------------
const queryString = (params) => {
  const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : ''
}

// Laravel validation errors look like { errors: { email: ['...'] } }; the forms want { email: '...' }.
const flatten = (errors) => (errors ? Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) : null)

async function request(method, path, { params, body, auth = true } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = tokenStore.get()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}${queryString(params)}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0)
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    // Empty or non-JSON body (for example a server crash page).
  }

  if (!response.ok) {
    if (response.status === 401 && auth && token && token === tokenStore.get()) {
      // The token expired or was revoked: send the user back to the login page.
      tokenStore.clear()
      window.dispatchEvent(new Event('ssis:unauthorized'))
    }
    const fields = flatten(payload?.errors)
    const message = payload?.message && !payload.message.startsWith('The given data') ? payload.message : Object.values(fields ?? {})[0] ?? 'Something went wrong. Please try again.'
    throw new ApiError(response.status === 401 && auth ? 'Your session has ended. Please log in again.' : message, response.status, fields)
  }

  if (method !== 'GET') { invalidateRequests(); emit() }
  return payload
}

export const api = {
  get: (path, params) => {
    const key = JSON.stringify([tokenStore.get(), path, Object.entries(params ?? {}).sort(([a], [b]) => a.localeCompare(b))])
    if (pendingGets.has(key)) return pendingGets.get(key)
    const recent = recentGets.get(key)
    if (recent && Date.now() - recent.time < 1000) return Promise.resolve(recent.data)
    const version = generation
    const pending = request('GET', path, { params }).then(data => {
      if (version === generation) {
        recentGets.set(key, { time: Date.now(), data })
        if (recentGets.size > 150) recentGets.delete(recentGets.keys().next().value)
      }
      return data
    }).finally(() => { if (pendingGets.get(key) === pending) pendingGets.delete(key) })
    pendingGets.set(key, pending)
    return pending
  },
  post: (path, body = {}, options) => request('POST', path, { body, ...options }),
  put: (path, body = {}) => request('PUT', path, { body }),
  patch: (path, body = {}) => request('PATCH', path, { body }),
  delete: (path) => request('DELETE', path),
}

export const enc = encodeURIComponent


