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

export const tokenStore = {
  get: () => {
    try {
      return sessionStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set: (token) => {
    try {
      sessionStorage.setItem(KEY, token)
    } catch {
      // Storage unavailable: the user simply has to log in again after a refresh.
    }
  },
  clear: () => {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  },
}
