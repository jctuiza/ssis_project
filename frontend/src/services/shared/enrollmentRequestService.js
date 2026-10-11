import { api } from '../../api/apiClient'

export const getAll = () => api.get('/enrollment-requests')
export const getRequest = id => api.get(`/enrollment-requests/${id}`)
export const submit = input => api.post('/enrollment-requests', input)
export const recommend = (id, input) => api.patch(`/enrollment-requests/${id}/recommend`, input)
export const decide = (id, input) => api.post(`/enrollment-requests/${id}/decision`, input)
