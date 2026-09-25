import api from './axios'

export const adminListSpecialties = (params) => api.get('/admin/specialties', { params })
export const adminCreateSpecialty = (data) => api.post('/admin/specialties', data)
export const adminUpdateSpecialty = (id, data) => api.put(`/admin/specialties/${id}`, data)
export const adminDeactivateSpecialty = (id) => api.delete(`/admin/specialties/${id}`)
