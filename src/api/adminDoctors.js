import api from './axios'

export const adminListDoctors = (params) => api.get('/admin/doctors', { params })
export const adminGetDoctor = (id) => api.get(`/admin/doctors/${id}`)
export const adminCreateDoctor = (data) => api.post('/admin/doctors', data)
export const adminUpdateDoctor = (id, data) => api.put(`/admin/doctors/${id}`, data)
export const adminDeactivateDoctor = (id) => api.delete(`/admin/doctors/${id}`)

export const adminUploadDoctorPhoto = (id, file) => {
  const form = new FormData()
  form.append('file', file)
  return api.put(`/admin/doctors/${id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export const adminGetDoctorSchedule = (id) => api.get(`/admin/doctors/${id}/schedule`)
export const adminGetDoctorScheduleExceptions = (id) => api.get(`/admin/doctors/${id}/schedule-exceptions`)
