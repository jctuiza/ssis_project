import { api } from '../../api/apiClient'
export const getPrograms = () => api.get('/academic/programs')
export const saveProgram = (id, values) => api.patch(`/academic/programs/${id}`, values)
export const previewPromotions = targetTerm => api.post('/academic/promotions/preview', { targetTerm })
export const activateYear = values => api.post('/academic/promotions/activate', values)
