import api from './axios'

export const adminListBranches = (params) => api.get('/admin/branches', { params })
export const adminCreateBranch = (data) => api.post('/admin/branches', data)
export const adminUpdateBranch = (id, data) => api.put(`/admin/branches/${id}`, data)
export const adminDeactivateBranch = (id) => api.delete(`/admin/branches/${id}`)
