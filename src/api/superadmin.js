import api from './axios'

// Panel de plataforma (SUPER_ADMIN): hospitales/consultorios clientes.
export const listHospitals = () => api.get('/superadmin/hospitals')
export const createHospital = (data) => api.post('/superadmin/hospitals', data)
export const updateHospital = (id, data) => api.put(`/superadmin/hospitals/${id}`, data)
export const addHospitalAdmin = (id, data) => api.post(`/superadmin/hospitals/${id}/admins`, data)
