import api from './axios'

/**
 * Derechos ARCO y centro de privacidad. El formulario público no pide sesión: el correo debe ser
 * de una cuenta o paciente del hospital y se confirma con un enlace. Cada solicitud tiene un
 * portal de seguimiento (el enlace que llega por correo). El ADMIN del hospital las atiende.
 */
export const createPublicArcoRequest = (data) => api.post('/public/arco-requests', data)
export const createOwnArcoRequest = (data) => api.post('/arco-requests', data)
export const getMyArcoRequests = () => api.get('/arco-requests/mine')
export const getMyTrackingToken = (id) => api.get(`/arco-requests/${id}/tracking`)

// Portal del titular
export const trackArco = (token) => api.get(`/public/arco/track/${token}`)
export const confirmArco = (token) => api.post(`/public/arco/track/${token}/confirm`)
export const uploadArcoIdentity = (token, file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/public/arco/track/${token}/identity`, form)
}
export const answerArcoInfo = (token, message, file) => {
  const form = new FormData()
  if (message) form.append('message', message)
  if (file) form.append('file', file)
  return api.post(`/public/arco/track/${token}/info`, form)
}
export const downloadArcoTitularDoc = (token, docId) => api.get(`/public/arco/track/${token}/documents/${docId}`, { responseType: 'blob' })

// Administrador
export const getArcoRequests = (status) => api.get('/admin/arco-requests', { params: { status: status || undefined } })
export const getArcoPendingCount = () => api.get('/admin/arco-requests/pending-count')
export const getArcoDetail = (id) => api.get(`/admin/arco-requests/${id}`)
export const createInPersonArco = (data) => api.post('/admin/arco-requests/in-person', data)
export const verifyArcoIdentity = (id, data) => api.post(`/admin/arco-requests/${id}/verify-identity`, data)
export const requestArcoInfo = (id, data) => api.post(`/admin/arco-requests/${id}/request-info`, data)
export const extendArco = (id, data) => api.post(`/admin/arco-requests/${id}/extend`, data)
export const respondArco = (id, data) => api.post(`/admin/arco-requests/${id}/respond`, data)
export const executeArco = (id, data) => api.post(`/admin/arco-requests/${id}/execute`, data)
export const downloadArcoAdminDoc = (id, docId) => api.get(`/admin/arco-requests/${id}/documents/${docId}`, { responseType: 'blob' })
export const downloadArcoConstancia = (id) => api.get(`/admin/arco-requests/${id}/constancia`, { responseType: 'blob' })

export const getPlatformArcoRequests = (status) => api.get('/superadmin/arco-requests', { params: { status: status || undefined } })

// Centro de privacidad del paciente
export const getPrivacyCenter = () => api.get('/privacy/me')
export const savePrivacyPreferences = (data) => api.put('/privacy/me/preferences', data)
export const saveMyProfile = (data) => api.put('/privacy/me/profile', data)
export const exportMyData = (password) => api.post('/privacy/me/export', { password }, { responseType: 'blob' })
export const deleteMyAccount = (password, reason) => api.post('/privacy/me/delete-account', { password, reason })

// Privacidad de un paciente (admin)
export const getPatientPrivacy = (id) => api.get(`/admin/patients/${id}/privacy`)
export const openPatientVault = (id, reason) => api.post(`/admin/patients/${id}/vault`, { reason })
export const addPatientClarification = (id, note) => api.post(`/admin/patients/${id}/clarifications`, { note })
export const getPatientClarifications = (id) => api.get(`/reception/patients/${id}/clarifications`)

// Aviso de privacidad
export const getNoticeVersions = () => api.get('/public/privacy-notice/versions')
export const getNoticeVersion = (v) => api.get(`/public/privacy-notice/versions/${v}`)

export const ARCO_TYPES = [
  { value: 'ACCESS', label: 'Acceso', hint: 'Quiero saber qué datos personales míos tienen y para qué los usan.' },
  { value: 'RECTIFICATION', label: 'Rectificación', hint: 'Algún dato mío está mal o incompleto y quiero corregirlo.' },
  { value: 'CANCELLATION', label: 'Cancelación', hint: 'Quiero que eliminen mi cuenta y mis datos (lo que la ley obliga a guardar se bloquea).' },
  { value: 'OPPOSITION', label: 'Oposición', hint: 'No quiero que usen mis datos para algo en particular.' },
  { value: 'REVOCATION', label: 'Revocar consentimiento', hint: 'Retiro el permiso que di para que usen mis datos.' },
  { value: 'LIMITATION', label: 'Limitar uso', hint: 'Quiero dejar de recibir recordatorios, novedades o encuestas.' },
]

export const ARCO_STATUS = {
  PENDING_EMAIL: { label: 'Por confirmar correo', tone: 'slate' },
  PENDING: { label: 'Recibida', tone: 'amber' },
  INFO_REQUESTED: { label: 'Información solicitada', tone: 'blue' },
  APPROVED: { label: 'Procede, por ejecutar', tone: 'purple' },
  COMPLETED: { label: 'Atendida', tone: 'green' },
  REJECTED: { label: 'No procede', tone: 'red' },
  NOT_FILED: { label: 'No presentada', tone: 'slate' },
}

export const IDENTITY_METHODS = [
  { value: 'ID_ONLINE', label: 'Identificación oficial enviada en línea' },
  { value: 'ID_IN_PERSON', label: 'Identificación oficial revisada en mostrador' },
  { value: 'SESSION_PASSWORD', label: 'Sesión iniciada y contraseña confirmada' },
  { value: 'REPRESENTATIVE', label: 'Representante acreditado con documento' },
]

export const fmtDate = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—')
export const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—')
