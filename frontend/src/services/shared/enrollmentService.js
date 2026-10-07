import { api, enc } from '../../api/apiClient'

// GET /api/enrollment/student/:id
export const getForStudent = (studentId) => api.get(`/enrollment/student/${enc(studentId)}`)

// GET /api/enrollment
export const getAll = () => api.get('/enrollment')

// POST /api/enrollment   (a student requests enrollment for the current term)
export const submit = () => api.post('/enrollment', { confirmed: true })

// PATCH /api/enrollment/:id   (the Registrar approves or rejects)
export const updateStatus = (id, status) => api.patch(`/enrollment/${id}`, { status })


