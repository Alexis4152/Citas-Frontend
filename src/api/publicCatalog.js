import api from './axios'

export const getHospitalConfig = () => api.get('/public/hospital-config')
export const getSpecialties = () => api.get('/public/specialties')
export const getBranches = () => api.get('/public/branches')
export const searchDoctors = (params) => api.get('/public/doctors', { params })
export const getDoctorDetail = (id) => api.get(`/public/doctors/${id}`)
export const getDoctorAvailability = (id, date, days = 7) =>
  api.get(`/public/doctors/${id}/availability`, { params: { date, days } })
