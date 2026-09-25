import api from './axios'

export const adminListReceptionists = (params) => api.get('/admin/receptionists', { params })
export const adminCreateReceptionist = (data) => api.post('/admin/receptionists', data)
export const adminUpdateReceptionist = (id, data) => api.put(`/admin/receptionists/${id}`, data)
export const adminDeactivateReceptionist = (id) => api.delete(`/admin/receptionists/${id}`)
