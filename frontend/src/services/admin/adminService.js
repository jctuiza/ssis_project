import { api, enc } from '../../api/apiClient'

// GET /api/dashboard/admin
export const getDashboard = () => api.get('/dashboard/admin')

// ---- users & passwords ----------------------------------------------------------------------------
// GET /api/users
export const getUsers = () => api.get('/users')

// POST /api/users   The Admin creates a staff account (Registrar, Cashier or Department).
// Students are registered by the Registrar and there is only one Admin, so neither can be created here.
// Problems come back per field ({ username: '...' }) so the form can show them under the matching input.
export const createUser = (input) => api.post('/users', input)

// PATCH /api/users/:id   { name?, email?, departmentId?, status?, role? }
export const updateUser = (id, patch) => api.patch(`/users/${enc(id)}`, patch)

// POST /api/users/:id/reset-password   { password? }   (without a password a temporary one is generated)
export const resetPassword = (id, { password } = {}) => api.post(`/users/${enc(id)}/reset-password`, password ? { password } : {})

// ---- roles (predefined by the system, read-only), departments, logs ------------------------------
export const getRoles = () => api.get('/roles')
export const getDepartments = () => api.get('/departments')
export const getLogs = () => api.get('/activity-logs')

// ---- settings --------------------------------------------------------------------------------------
export const getSettings = () => api.get('/settings')
export const saveSettings = (values) => api.put('/settings', values)

// ---- announcements (published ones appear on the Student Homepage) ----------------------------------
export const getAnnouncements = () => api.get('/announcements')
export const createAnnouncement = ({ title, body }) => api.post('/announcements', { title, body })
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`)


