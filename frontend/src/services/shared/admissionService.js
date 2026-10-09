import { api } from '../../api/apiClient'
export const getOptions = () => api.get('/admissions/options')
export const apply = values => api.post('/admissions', values, { auth: false })
export const getApplications = () => api.get('/admissions')
export const decide = (id, status, note) => api.patch(`/admissions/${id}`, { status, note })

export const getCredentials = id => api.post(`/admissions/${id}/registrar-credentials`, {})
export const emailCredentials = id => api.post(`/admissions/${id}/email-credentials`, {})

export const checkReadiness = id => api.get(`/admissions/${id}/readiness`, { check: Date.now() })
