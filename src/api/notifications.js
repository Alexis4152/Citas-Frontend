import api from './axios'

export const listNotifications = () => api.get('/notifications')
export const getUnreadNotificationCount = () => api.get('/notifications/unread-count')
export const markNotificationAsRead = (id) => api.post(`/notifications/${id}/read`)
export const markAllNotificationsAsRead = () => api.post('/notifications/read-all')
