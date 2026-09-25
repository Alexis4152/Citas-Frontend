import api from './axios'

export const searchAppointments = (params) => api.get('/reception/appointments', { params })
export const bookForPatient = (data) => api.post('/reception/appointments', data)
export const cancelAppointment = (id, reason) => api.post(`/reception/appointments/${id}/cancel`, { reason })
export const rescheduleAppointment = (id, data) => api.patch(`/reception/appointments/${id}/reschedule`, data)
export const releaseAppointmentSlot = (id) => api.patch(`/reception/appointments/${id}/release-slot`)
// Módulo de cobro: cita por QR (URL o código), folio (#123) o nombre/teléfono; sin texto, la cola de por cobrar.
export const lookupChargeAppointments = (q) => api.get('/reception/charge/lookup', { params: { q: q || undefined } })
export const markAppointmentArrived = (id) => api.patch(`/reception/appointments/${id}/arrived`)
export const markAppointmentCompleted = (id) => api.patch(`/reception/appointments/${id}/complete`)
export const markAppointmentNoShow = (id) => api.patch(`/reception/appointments/${id}/no-show`)

export const searchPatients = (params) => api.get('/reception/patients', { params })
export const getPatient = (id) => api.get(`/reception/patients/${id}`)
export const createPatient = (data) => api.post('/reception/patients', data)
// Disponibilidad con reglas de recepción: sin la anticipación mínima de 30 min, y marcando los
// espacios ocupados que aún se pueden empalmar como sobrecupo (slot.overbookable).
export const getStaffDoctorAvailability = (doctorId, date, days = 7) =>
  api.get(`/reception/doctors/${doctorId}/availability`, { params: { date, days } })

// Pacientes duplicados: sugerencias (mismo teléfono/correo) y fusión del origen en el destino.
export const listPatientDuplicates = (id) => api.get(`/reception/patients/${id}/duplicates`)
export const mergePatients = (sourceId, targetId) => api.post(`/reception/patients/${sourceId}/merge-into/${targetId}`)

export const updatePatientMedicalInfo = (id, data) => api.put(`/reception/patients/${id}/medical-info`, data)

// Solo lectura -- la receta la genera el doctor; recepción/admin solo consultan el historial.
export const listPatientPrescriptions = (patientId) => api.get(`/reception/patients/${patientId}/prescriptions`)
export const downloadPrescriptionPdfStaff = (id) => api.get(`/reception/prescriptions/${id}/pdf`, { responseType: 'blob' })

export const downloadAppointmentReceipt = (id) =>
  api.get(`/reception/appointments/${id}/receipt`, { responseType: 'blob' })

export const downloadPatientsTemplate = () =>
  api.get('/reception/patients/template.xlsx', { responseType: 'blob' })
export const exportPatients = () =>
  api.get('/reception/patients/export.xlsx', { responseType: 'blob' })
export const importPatients = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/reception/patients/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
