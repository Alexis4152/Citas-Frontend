import api from './axios'

// Llaves PÚBLICAS de OpenPay para tokenizar la tarjeta en el navegador (la privada nunca sale del backend).
export const getPaymentConfig = () => api.get('/public/payments/config')

// Pago anticipado: el invitado con el token de su cita; el paciente con cuenta sobre su propia cita.
// method: 'OPENPAY_CARD' (con sourceId + deviceSessionId) u 'OPENPAY_SPEI'.
export const prepayByToken = (token, data) => api.post(`/appointments/pay/${token}`, data)
export const prepayOwn = (appointmentId, data) => api.post(`/appointments/${appointmentId}/pay`, data)

// Recepción/admin: cobro de una cita ya atendida (exige un corte de caja abierto).
// method: 'CASH' | 'CARD_TERMINAL' | 'OPENPAY_CARD'
export const chargeAppointment = (appointmentId, data) => api.post(`/reception/appointments/${appointmentId}/charge`, data)
export const listAppointmentPayments = (appointmentId) => api.get(`/reception/appointments/${appointmentId}/payments`)
export const refreshPayment = (paymentId) => api.post(`/reception/payments/${paymentId}/refresh`)

// Corte de caja (recepción y admin)
export const getCurrentCashCut = () => api.get('/reception/cash-cut/current')
export const openCashCut = (data) => api.post('/reception/cash-cut/open', data)
export const closeCashCut = (id, data) => api.post(`/reception/cash-cut/${id}/close`, data)
export const getCashCut = (id) => api.get(`/reception/cash-cut/${id}`)
export const listCashCuts = (params) => api.get('/reception/cash-cut', { params })

// Reportes de ingresos
export const doctorPaymentsReport = (params) => api.get('/doctor/payments/report', { params })
export const adminPaymentsReport = (params) => api.get('/admin/payments/report', { params })
export const listRefundReview = () => api.get('/admin/payments/review')
export const adminRefund = (paymentId, data) => api.post(`/admin/payments/${paymentId}/refund`, data)

// Precio de la consulta (lo define el propio doctor)
export const updateOwnPrice = (price) => api.put('/doctor/me/price', { price })
