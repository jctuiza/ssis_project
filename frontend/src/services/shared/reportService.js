import { api, enc } from '../../api/apiClient'

// GET /api/reports/:kind?department_id=
export const getReport = (kind, { departmentId } = {}) => api.get(`/reports/${enc(kind)}`, { department_id: departmentId })


