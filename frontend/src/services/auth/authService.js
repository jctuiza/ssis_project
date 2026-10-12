import { api } from '../../api/apiClient'
import { tokenStore } from '../../api/session'

// GET /api/roles/public   (roles shown in the login form)
export const getLoginRoles = () => api.get('/roles/public')

// POST /api/login  { role, identifier, password }  ->  { user, roles, token }

export async function login({ role, identifier, password }) {
  const result = await api.post(
    '/login',
    { role, identifier, password },
    { auth: false }
  )

  if (!result) {
    throw new Error(
      'The login API returned an empty or non-JSON response. Check the Network tab.'
    )
  }

  if (!result.token) {
    throw new Error(
      'The login response did not contain a token. Check the Network response body.'
    )
  }

  tokenStore.set(result.token)
  return result
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


