import api from './axios'

export const getOwnProfile = () => api.get('/doctor/me')
export const updateOwnProfile = (data) => api.put('/doctor/me', data)

export const listOwnSchedule = () => api.get('/doctor/schedule')
export const createOwnSchedule = (data) => api.post('/doctor/schedule', data)
export const updateOwnSchedule = (id, data) => api.put(`/doctor/schedule/${id}`, data)
export const deleteOwnSchedule = (id) => api.delete(`/doctor/schedule/${id}`)

export const listOwnScheduleExceptions = () => api.get('/doctor/schedule-exceptions')
export const createOwnScheduleException = (data) => api.post('/doctor/schedule-exceptions', data)
export const deleteOwnScheduleException = (id) => api.delete(`/doctor/schedule-exceptions/${id}`)

export const listOwnAppointments = (from, to) => api.get('/doctor/appointments', { params: { from, to } })
export const searchOwnAppointments = (params) => api.get('/doctor/appointments/search', { params })
export const cancelOwnAppointment = (id, reason) => api.post(`/doctor/appointments/${id}/cancel`, { reason })
export const releaseSlot = (id) => api.patch(`/doctor/appointments/${id}/release-slot`)
export const rescheduleOwnAppointment = (id, data) => api.patch(`/doctor/appointments/${id}/reschedule`, data)
export const markAppointmentArrived = (id) => api.patch(`/doctor/appointments/${id}/arrived`)
export const markAppointmentCompleted = (id) => api.patch(`/doctor/appointments/${id}/complete`)
export const markAppointmentNoShow = (id) => api.patch(`/doctor/appointments/${id}/no-show`)
export const downloadAppointmentReceipt = (id) => api.get(`/doctor/appointments/${id}/receipt`, { responseType: 'blob' })
export const updatePatientMedicalInfo = (id, data) => api.put(`/doctor/patients/${id}/medical-info`, data)

export const createPrescription = (data) => api.post('/doctor/prescriptions', data)
export const downloadPrescriptionPdf = (id) => api.get(`/doctor/prescriptions/${id}/pdf`, { responseType: 'blob' })
export const searchOwnPrescriptions = (params) => api.get('/doctor/prescriptions', { params })
export const listAppointmentPrescriptions = (appointmentId) => api.get(`/doctor/appointments/${appointmentId}/prescriptions`)
export const sendPrescriptionEmail = (id) => api.post(`/doctor/prescriptions/${id}/send-email`)
export const voidPrescription = (id, reason) => api.post(`/doctor/prescriptions/${id}/void`, { reason })
