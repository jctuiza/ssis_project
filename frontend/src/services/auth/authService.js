import { api } from '../../api/apiClient'
import { tokenStore } from '../../api/session'

// GET /api/roles/public   (roles shown in the login form)
export const getLoginRoles = () => api.get('/roles/public')

// POST /api/login  { role, identifier, password }  ->  { user, roles, token }
export async function login({ role, identifier, password }) {
  const result = await api.post('/login', { role, identifier, password }, { auth: false })
  tokenStore.set(result.token)
  return result
}

// GET /api/me   (restores the session after a page refresh; null when there is no valid token)
export async function restoreSession() {
  if (!tokenStore.get()) return null
  try {
    return (await api.get('/me')).user
  } catch {
    tokenStore.clear()
    return null
  }
}

// POST /api/logout
export async function logout() {
  try {
    await api.post('/logout')
  } catch {
    // The token is dropped locally either way.
  }
  tokenStore.clear()
}


