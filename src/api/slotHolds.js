import api from './axios'
import { getHospitalSlug } from '../tenant'

// Apartado temporal de un horario mientras se termina de agendar (ver SlotHoldService en el
// backend). Público: lo usan invitados y pacientes con cuenta.
export const holdSlot = (data) => api.post('/public/slot-holds', data)
export const releaseSlot = (token) => api.delete(`/public/slot-holds/${token}`)

/** Para soltar el apartado al cerrar o salir de la página: `keepalive` deja que la petición
 * termine aunque la pestaña ya se esté cerrando (axios no lo permite). */
export function releaseSlotOnExit(token) {
  if (!token) return
  try {
    const headers = {}
    const slug = getHospitalSlug()
    if (slug) headers['X-Hospital'] = slug
    fetch(`${api.defaults.baseURL}/public/slot-holds/${token}`, { method: 'DELETE', headers, keepalive: true, credentials: 'include' })
  } catch {
    /* si no se pudo, el apartado vence solo en unos minutos */
  }
}

/** Identificador aleatorio de esta pestaña (no es un dato personal): con él la misma pestaña
 * puede cambiar de horario sin chocar consigo misma, y ve sus apartados como suyos. */
export function holderKey() {
  const KEY = 'citas-holder'
  try {
    let value = sessionStorage.getItem(KEY)
    if (!value) {
      value = `tab-${crypto.randomUUID()}`
      sessionStorage.setItem(KEY, value)
    }
    return value
  } catch {
    if (!window.__citasHolder) window.__citasHolder = `tab-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    return window.__citasHolder
  }
}
