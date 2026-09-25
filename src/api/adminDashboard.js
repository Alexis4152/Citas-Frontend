import api from './axios'

export const getAdminDashboard = () => api.get('/admin/dashboard')
