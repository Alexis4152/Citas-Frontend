import api from './axios'

export const adminGetEmailConfig = () => api.get('/admin/email-config')
export const adminUpdateEmailConfig = (data) => api.put('/admin/email-config', data)
