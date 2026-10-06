// Document requests: Student -> Registrar -> Cashier -> Student.
//
//  Submitted -> Under Review -> (Registrar approves) -> Pending Payment -> (Cashier records payment) -> Payment Recorded
//  -> Processing -> Ready for Release -> Completed.      Rejected is possible before payment is recorded.
//
// The workflow rules are enforced by the Laravel DocumentController; these functions only call the API.
import { api, enc } from './api'

// GET /api/documents/types
export const getTypes = () => api.get('/documents/types')

// GET /api/documents/student/:id   (a student only gets their own requests)
export const getForStudent = (studentId) => api.get(`/documents/student/${enc(studentId)}`)

// GET /api/documents?department_id=   (staff only; department staff only see their own department)
export const getAll = ({ departmentId } = {}) => api.get('/documents', { department_id: departmentId })

// POST /api/documents   (the student is the signed-in user)
export const submit = ({ type, purpose }) => api.post('/documents', { type, purpose })

// PATCH /api/documents/:ref   { status, remarks, prepared? }
export const updateStatus = (ref, { status, remarks, prepared }) => api.patch(`/documents/${enc(ref)}`, { status, remarks, prepared })
