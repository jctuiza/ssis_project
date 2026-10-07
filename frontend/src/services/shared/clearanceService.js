import { api, enc } from '../../api/apiClient'

// GET /api/clearance/student/:id
export const getForStudent = (studentId) => api.get(`/clearance/student/${enc(studentId)}`)

// GET /api/clearance?office=&department_id=
export const getByOffice = (office, { departmentId } = {}) => api.get('/clearance', { office, department_id: departmentId })

// PATCH /api/clearance/:id   { status, remarks }
// A role may update only the offices its permissions allow. Cashier clearance is automatic (follows payments).
export const update = (id, { status, remarks }) => api.patch(`/clearance/${id}`, { status, remarks })


