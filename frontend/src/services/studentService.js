import { api, enc } from './api'

// GET /api/students?department_id=
export const getStudents = ({ departmentId } = {}) => api.get('/students', { department_id: departmentId })

// GET /api/students/:id/dashboard   (the Student Homepage)
export const getDashboard = (studentId) => api.get(`/students/${enc(studentId)}/dashboard`)

// GET /api/students/:id/id-card   (the photo is not included; it comes from the profile picture)
export const getIdCard = (studentId) => api.get(`/students/${enc(studentId)}/id-card`)

// POST /api/students   Registrar registers a newly enrolled student.
// The server generates the student number and a temporary password; the student must change it at first login.
// Validation failures come back as ApiError with `fields` ({ email: '...' }) so the form can show each message under its own input.
export const createStudent = (input) => api.post('/students', input)

// PATCH /api/students/:id   Registrar edits student information.
export const updateStudent = (id, input) => api.patch(`/students/${enc(id)}`, input)
