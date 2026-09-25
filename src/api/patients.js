import api from './axios'

// Autoservicio del paciente autenticado sobre su propio registro (alergias/tipo de sangre).
export const getOwnPatient = () => api.get('/patients/me')
export const updateOwnMedicalInfo = (data) => api.put('/patients/me/medical-info', data)
