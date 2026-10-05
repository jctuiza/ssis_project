import { api } from './api'

// GET /api/dashboard/department/:id
export const getDashboard = (departmentId) => api.get(`/dashboard/department/${departmentId}`)
