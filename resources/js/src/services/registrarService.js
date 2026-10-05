import { api } from './api'

// GET /api/dashboard/registrar
export const getDashboard = () => api.get('/dashboard/registrar')

// GET /api/records?department_id=
// GWA is computed on the server from posted final grades (weighted by units); standing follows the latest graded term.
export const getRecords = ({ departmentId } = {}) => api.get('/records', { department_id: departmentId })
