import api from './axios'

/**
 * Solicitudes de derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) sobre los datos
 * personales que guarda cada hospital. El formulario público no pide sesión, pero el correo debe
 * corresponder a una cuenta o a un paciente del hospital; el paciente con cuenta las levanta y
 * sigue desde "Mis solicitudes"; el ADMIN del hospital las atiende.
 */
export const createPublicArcoRequest = (data) => api.post('/public/arco-requests', data)
export const createOwnArcoRequest = (data) => api.post('/arco-requests', data)
export const getMyArcoRequests = () => api.get('/arco-requests/mine')

export const getArcoRequests = (status) => api.get('/admin/arco-requests', { params: { status: status || undefined } })
export const getArcoPendingCount = () => api.get('/admin/arco-requests/pending-count')
export const resolveArcoRequest = (id, data) => api.put(`/admin/arco-requests/${id}/resolve`, data)
export const exportArcoData = (id) => api.get(`/admin/arco-requests/${id}/export`, { responseType: 'blob' })

export const getPlatformArcoRequests = (status) => api.get('/superadmin/arco-requests', { params: { status: status || undefined } })

export const ARCO_TYPES = [
  { value: 'ACCESS', label: 'Acceso', hint: 'Quiero saber qué datos personales míos tienen y para qué los usan.' },
  { value: 'RECTIFICATION', label: 'Rectificación', hint: 'Algún dato mío está mal o incompleto y quiero corregirlo.' },
  { value: 'CANCELLATION', label: 'Cancelación', hint: 'Quiero que eliminen mis datos personales, cuando proceda.' },
  { value: 'OPPOSITION', label: 'Oposición', hint: 'No quiero que usen mis datos para algo en particular.' },
]

export const ARCO_STATUS = {
  PENDING: { label: 'Pendiente', tone: 'amber' },
  COMPLETED: { label: 'Completada', tone: 'green' },
  REJECTED: { label: 'Rechazada', tone: 'red' },
}
