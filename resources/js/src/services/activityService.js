import { api } from './api'

// GET /api/notifications   (what the bell shows; the server decides who can see which notification)
export const getNotifications = () => api.get('/notifications')

// POST /api/notifications/read
export const markNotificationsRead = () => api.post('/notifications/read')
