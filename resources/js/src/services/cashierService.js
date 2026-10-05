import { api } from './api'

// GET /api/dashboard/cashier
export const getDashboard = () => api.get('/dashboard/cashier')
