import { api } from '../../api/apiClient'

// GET /api/dashboard/department/:id
export const getDashboard = (departmentId) => api.get(`/dashboard/department/${departmentId}`)


