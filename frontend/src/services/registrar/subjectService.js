import { api, enc } from '../../api/apiClient'

// The subjects offered each term (Registrar). Students are enrolled in the subjects offered to their college.
// GET /api/subjects
export const getSubjects = () => api.get('/subjects')

// POST /api/subjects   { code, name, units, schedule, departmentId }
// Problems come back per field (ApiError.fields) so the form can show each message under its own input.
export const createSubject = (input) => api.post('/subjects', input)

// PATCH /api/subjects/:code   (the code itself cannot change)
export const updateSubject = (code, input) => api.patch(`/subjects/${enc(code)}`, input)

// DELETE /api/subjects/:code   (only a subject nobody enrolled in)
export const deleteSubject = (code) => api.delete(`/subjects/${enc(code)}`)
