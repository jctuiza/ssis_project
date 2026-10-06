import { api, enc } from './api'

// GET /api/reports/:kind?department_id=
export const getReport = (kind, { departmentId } = {}) => api.get(`/reports/${enc(kind)}`, { department_id: departmentId })
