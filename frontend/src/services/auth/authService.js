import { api } from '../../api/apiClient'
import { tokenStore } from '../../api/session'

// GET /api/roles/public   (roles shown in the login form)
export const getLoginRoles = () => api.get('/roles/public')

// Restore only the account verified by the backend; never trust a stored profile.
export async function restoreSession() {
  const token = tokenStore.get()
  try {
    const result = await api.get('/me')
    if (tokenStore.get() !== token) return null
    if (!result?.user) throw new Error('The session API returned an invalid response. Please try again.')
    if (result.sessionKey) tokenStore.set(result.sessionKey)
    return result.user
  } catch (error) {
    if ([401, 403].includes(error.status)) {
      if (tokenStore.get() === token) tokenStore.clear()
      return null
    }
    throw error
  }
}

// POST /api/login  { role, identifier, password }  ->  { user, roles, token }

export async function login({ role, identifier, password }) {
  const signIn = async () => {
    if (tokenStore.get()) throw new Error('An account is already signed in in this browser. Log out before signing in to another account.')
    const result = await api.post(
      '/login',
      { role, identifier, password },
    )

    if (!result) {
      throw new Error(
        'The login API returned an empty or non-JSON response. Check the Network tab.'
      )
    }

    if (!result.sessionKey) {
      throw new Error(
        'The login response did not contain a session. Check the Network response body.'
      )
    }

    tokenStore.set(result.sessionKey)
    return result
  }
  if (globalThis.navigator?.locks) return navigator.locks.request('ssis-sign-in', signIn)
  return signIn()
}


// POST /api/logout
export async function logout() {
  const token = tokenStore.get()
  if (!token) return
  try {
    await api.post('/logout')
  } catch (error) {
    if (error.status !== 401) throw error
  }
  if (tokenStore.get() === token) tokenStore.clear()
}


