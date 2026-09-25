import api from './axios'

export const adminGetHospitalConfig = () => api.get('/admin/hospital-config')
export const adminUpdateHospitalConfig = (data) => api.put('/admin/hospital-config', data)

export const adminUploadHospitalLogo = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.put('/admin/hospital-config/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
