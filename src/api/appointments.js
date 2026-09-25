import api from './axios'

// Agendado sin cuenta (invitado): requiere nombre, apellido y teléfono; correo y motivo son opcionales.
export const bookGuestAppointment = (data) => api.post('/appointments/guest', data)

// Agendado por un paciente autenticado, para sí mismo.
export const bookOwnAppointment = (data) => api.post('/appointments', data)

// Citas propias del paciente autenticado.
export const listOwnAppointments = () => api.get('/appointments')

// Vista paginada/filtrable (fecha, especialidad, doctor) de "Mis citas".
export const searchOwnAppointments = (params) => api.get('/appointments/search', { params })

// Cancelar una cita propia (paciente autenticado).
export const cancelOwnAppointment = (id, reason) => api.post(`/appointments/${id}/cancel`, { reason })

// Cancelar por token (público, sin login) — usado por el link de invitado.
export const cancelByToken = (token, reason) => api.post(`/appointments/cancel/${token}`, { reason })

// Comprobante en PDF (patrones 09/11): paciente autenticado dueño de la cita, o público
// vía el mismo token de cancelación para invitados.
export const downloadOwnReceipt = (id) => api.get(`/appointments/${id}/receipt`, { responseType: 'blob' })
export const downloadGuestReceipt = (token) => api.get(`/appointments/guest-receipt/${token}`, { responseType: 'blob' })

// Invitado que perdió su código de cancelación: se le manda un correo con los enlaces de sus
// citas (a la dirección que dejó al agendar). Por privacidad la API NO devuelve las citas ni
// sus tokens al navegador, y responde igual exista o no la cita.
// Con fecha y hora exactas de la cita (opcionales) devuelve esa cita directo, para quien no dejó correo.
export const requestGuestAppointmentLinks = (phone, firstName, lastName, appointmentDate, startTime) =>
  api.post('/appointments/guest-lookup', { phone, firstName, lastName, appointmentDate: appointmentDate || undefined, startTime: startTime || undefined })

// Detalle de una cita por su token (público): qué cita es, antes de cancelarla o reprogramarla.
export const getAppointmentByToken = (token) => api.get(`/appointments/by-token/${token}`)

// El propio paciente (con cuenta) o el invitado (con su token) reprograma su cita, con el
// mismo doctor y con al menos N horas de anticipación (la regla la valida el backend).
export const rescheduleOwnAppointment = (id, data) => api.patch(`/appointments/${id}/reschedule`, data)
export const rescheduleByToken = (token, data) => api.post(`/appointments/reschedule/${token}`, data)
