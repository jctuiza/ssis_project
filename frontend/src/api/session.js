// Shared by every service: the error type thrown for failed API calls and the sign-in token store.
// The login token lives in sessionStorage, so closing the tab signs the user out; permissions are enforced by Laravel.

// `fields` is an optional { fieldKey: 'message' } object (Laravel's 422 validation `errors`),
// so forms can show each message under the matching input.
export class ApiError extends Error {
  constructor(message, status = 422, fields = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

const KEY = 'ssis-token'
let memoryToken = null

export const tokenStore = {
  get: () => {
    try {
      return sessionStorage.getItem(KEY) ?? memoryToken
    } catch {
      return memoryToken
    }
  },
  set: (token) => {
    memoryToken = token
    try {
      sessionStorage.setItem(KEY, token)
    } catch {
      // The in-memory token lasts until this page is refreshed.
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('ssis:session-changed'))
  },
  clear: () => {
    memoryToken = null
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('ssis:session-changed'))
  },
}


